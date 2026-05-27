/**
 * /api/esios/precios · Sprint ESIOS-DEEP S1
 *
 * Datos completos de precios mayoristas y minoristas en una llamada:
 *   - PVPC (€/MWh hora actual + serie 48h con D+1 cuando esté publicado)
 *   - Mercado spot OMIE
 *   - Intradiarios MI1, MI2, MI3, MI4 (sesiones intradiario continuo)
 *
 * Para PVPC además:
 *   - Stats diarias (min, max, avg, hora más barata, hora más cara)
 *   - Heatmap 7×24 (semana × hora) si hay datos suficientes
 *   - Series 48h con timestamp para line chart
 *
 * Política de cache: 600s (datos horarios), stale-while-revalidate 3600s.
 * Si ESIOS_API_KEY no está configurada → `ok: false, error: 'no_key'` + 200.
 */
import { NextResponse } from 'next/server'
import {
  fetchEsiosIndicator,
  latestValue,
  changePct,
  avgLastN,
  type EsiosResponse,
  type EsiosIndicator,
} from '@/lib/esios/client'
import { ESIOS_CATALOG, ESIOS_PRECIOS_FULL_SLUGS, type EsiosSlug } from '@/lib/esios/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface SerieValor { t: string; v: number }
interface DailyStats {
  date: string
  avg: number
  min: number
  max: number
  hora_min: string
  hora_max: string
  count: number
}
interface PrecioSerie {
  slug: string
  ok: boolean
  label: string
  short: string
  unit: string
  latest: { value: number; datetime: string } | null
  prev_24h: { value: number; datetime: string } | null
  change_pct: number | null
  avg_24h: number | null
  serie_48h: SerieValor[]
  daily_stats: DailyStats[]
  source_url: string
  error?: string
}

/** Calcula min/max/avg por día calendario de una serie horaria. */
function calcDailyStats(values: { value: number; datetime: string }[]): DailyStats[] {
  const byDay = new Map<string, { value: number; datetime: string }[]>()
  for (const v of values) {
    const day = v.datetime.slice(0, 10) // YYYY-MM-DD
    const arr = byDay.get(day) || []
    arr.push(v)
    byDay.set(day, arr)
  }
  const result: DailyStats[] = []
  for (const [day, arr] of byDay) {
    if (arr.length === 0) continue
    const sum = arr.reduce((s, x) => s + x.value, 0)
    const min = arr.reduce((m, x) => (x.value < m.value ? x : m), arr[0])
    const max = arr.reduce((m, x) => (x.value > m.value ? x : m), arr[0])
    result.push({
      date: day,
      avg: Math.round((sum / arr.length) * 100) / 100,
      min: Math.round(min.value * 100) / 100,
      max: Math.round(max.value * 100) / 100,
      hora_min: min.datetime.slice(11, 16),
      hora_max: max.datetime.slice(11, 16),
      count: arr.length,
    })
  }
  return result.sort((a, b) => a.date.localeCompare(b.date))
}

/** Heatmap 7x24 · semana × hora. Solo se calcula si tenemos ≥7 días de datos. */
function calcHeatmap(values: { value: number; datetime: string }[]): {
  cells: Array<{ dow: number; hour: number; value: number; date: string }>
  min: number
  max: number
  p25: number
  p75: number
} | null {
  if (values.length < 24 * 7) return null
  // Tomamos los últimos 7×24=168 puntos
  const last = values.slice(-168)
  const cells: Array<{ dow: number; hour: number; value: number; date: string }> = []
  for (const v of last) {
    const d = new Date(v.datetime)
    const dow = d.getDay() // 0=domingo
    const hour = d.getHours()
    cells.push({ dow, hour, value: v.value, date: v.datetime.slice(0, 10) })
  }
  const sorted = [...cells].map((c) => c.value).sort((a, b) => a - b)
  return {
    cells,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p25: sorted[Math.floor(sorted.length * 0.25)],
    p75: sorted[Math.floor(sorted.length * 0.75)],
  }
}

export async function GET() {
  const startedAt = new Date().toISOString()
  const apiKey = process.env.ESIOS_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'no_key',
      message: 'ESIOS_API_KEY no configurada · añadir a Vercel env vars (Production)',
      precios: {},
      fetched_at: startedAt,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    })
  }

  // Pedimos 48h hacia atrás + 24h hacia delante (PVPC D+1 publica a las 20:15 cada día).
  // Para heatmap 7×24 necesitamos histórico de 7 días, lo pediremos solo para PVPC.
  const now = new Date()
  const start48h = new Date(now.getTime() - 48 * 3600_000).toISOString().slice(0, 16)
  const end48h = new Date(now.getTime() + 24 * 3600_000).toISOString().slice(0, 16)
  const start7d = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString().slice(0, 16)

  const results = await Promise.all(
    ESIOS_PRECIOS_FULL_SLUGS.map(async (slug: EsiosSlug): Promise<PrecioSerie> => {
      const item = ESIOS_CATALOG[slug]
      // Para PVPC pedimos 7d para heatmap; resto solo 48h (intradiarios no necesitan tanto)
      const startDate = slug === 'pvpc' ? start7d : start48h
      const r: EsiosResponse = await fetchEsiosIndicator(item.id, {
        startDate,
        endDate: end48h,
        geoIds: [item.geo_default],
        timeTrunc: 'hour',
      })
      const ind = r.indicator
      const latest = latestValue(ind)
      const values = ind?.values || []
      // Prev = 24h antes (1 día) para change_pct
      const prevIdx = values.length - 1 - 24
      const prev = prevIdx >= 0 ? values[prevIdx] : null
      const change = changePct(ind, 24)
      const avg24 = avgLastN(ind, 24)

      // Serie ya cortada a últimos 72h para no inflar payload (PVPC trae 7d para heatmap)
      const serie_48h = values.slice(-72).map((p) => ({ t: p.datetime, v: p.value }))
      const daily_stats = calcDailyStats(values)

      return {
        slug: item.slug,
        ok: r.ok,
        label: item.label,
        short: item.short,
        unit: item.unit,
        latest: latest ? { value: latest.value, datetime: latest.datetime } : null,
        prev_24h: prev ? { value: prev.value, datetime: prev.datetime } : null,
        change_pct: change !== null ? Math.round(change * 100) / 100 : null,
        avg_24h: avg24 !== null ? Math.round(avg24 * 100) / 100 : null,
        serie_48h,
        daily_stats,
        source_url: r.source_url || `https://www.esios.ree.es/es/analisis/${item.id}`,
        error: r.error,
      }
    })
  )

  // Heatmap solo para PVPC (necesita 7d que pedimos arriba)
  const pvpcRes = results.find((r) => r.slug === 'pvpc')
  const pvpcInd = pvpcRes?.ok && pvpcRes.daily_stats.length >= 7
    ? await fetchEsiosIndicator(ESIOS_CATALOG.pvpc.id, {
        startDate: start7d,
        endDate: new Date(now.getTime() - 1 * 3600_000).toISOString().slice(0, 16),
        geoIds: [8741],
        timeTrunc: 'hour',
      })
    : null
  const heatmap = pvpcInd?.ok && pvpcInd.indicator ? calcHeatmap(pvpcInd.indicator.values) : null

  const precios: Record<string, PrecioSerie> = {}
  for (const r of results) precios[r.slug] = r

  return NextResponse.json({
    ok: results.every((r) => r.ok),
    precios,
    heatmap_pvpc: heatmap,
    indicators_count: results.length,
    indicators_ok: results.filter((r) => r.ok).length,
    fetched_at: startedAt,
    _meta: {
      source: 'ESIOS · Red Eléctrica España',
      source_url: 'https://www.esios.ree.es/',
      api_docs: 'https://api.esios.ree.es/doc',
      cache_ttl_seconds: 600,
      note: 'PVPC D+1 se publica diariamente a las 20:15 hora peninsular',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
  })
}
