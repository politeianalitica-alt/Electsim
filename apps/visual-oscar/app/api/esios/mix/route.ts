/**
 * /api/esios/mix · Sprint ESIOS-DEEP S1
 *
 * Mix de generación completo + agregados renovables y emisiones:
 *   - 10 tecnologías: nuclear, eólica, solar FV, solar térmica, hidráulica,
 *     ciclo combinado, cogeneración, carbón, residuos, biomasa (frecuencia 10-min)
 *   - Agregados: renov_total, no_renov_total, % renovable, % libre CO2, gCO2/kWh
 *
 * Devuelve:
 *   - `now` · snapshot ahora mismo por tecnología (MW + % del total)
 *   - `series_24h` · matriz de series 24h sampleadas cada 1h
 *   - `agregados` · {renov_mw, no_renov_mw, pct_renovable, pct_libre_co2, emisiones_gco2_kwh}
 *
 * Cache: s-maxage=60 (frecuencia 10-min), stale-while-revalidate=600.
 * Si ESIOS_API_KEY no está → empty state honesto.
 */
import { NextResponse } from 'next/server'
import {
  fetchEsiosIndicator,
  latestValue,
  avgLastN,
  type EsiosResponse,
} from '@/lib/esios/client'
import {
  ESIOS_CATALOG,
  ESIOS_MIX_FULL_SLUGS,
  ESIOS_MIX_AGREGADO_SLUGS,
  ESIOS_TECH_COLORS,
  type EsiosSlug,
} from '@/lib/esios/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface TechSnapshot {
  slug: string
  ok: boolean
  label: string
  short: string
  unit: string
  color: string
  now_mw: number | null
  now_datetime: string | null
  pct_of_total: number | null
  avg_24h_mw: number | null
  serie_24h: Array<{ t: string; v: number }>   // sampleada cada 1h (10-min → /6)
  error?: string
}

interface AgregadoValor {
  slug: string
  ok: boolean
  label: string
  unit: string
  latest_value: number | null
  latest_datetime: string | null
  avg_24h: number | null
  error?: string
}

export async function GET() {
  const startedAt = new Date().toISOString()
  const apiKey = process.env.ESIOS_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'no_key',
      message: 'ESIOS_API_KEY no configurada · añadir a Vercel env vars (Production)',
      tech: {},
      agregados: {},
      fetched_at: startedAt,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    })
  }

  // 24h hacia atrás · time_trunc=hour para todos (agregamos a hora aunque sea 10min raw)
  const now = new Date()
  const start = new Date(now.getTime() - 24 * 3600_000).toISOString().slice(0, 16)
  const end = new Date(now.getTime() + 1 * 3600_000).toISOString().slice(0, 16)

  // 10 tecnologías en paralelo
  const techResults = await Promise.all(
    ESIOS_MIX_FULL_SLUGS.map(async (slug: EsiosSlug): Promise<TechSnapshot> => {
      const item = ESIOS_CATALOG[slug]
      const r: EsiosResponse = await fetchEsiosIndicator(item.id, {
        startDate: start,
        endDate: end,
        geoIds: [item.geo_default],
        timeTrunc: 'hour',
      })
      const ind = r.indicator
      const last = latestValue(ind)
      const values = ind?.values || []
      const avg24 = avgLastN(ind, 24)
      const serie_24h = values.slice(-24).map((p) => ({ t: p.datetime, v: p.value }))

      return {
        slug: item.slug,
        ok: r.ok,
        label: item.label,
        short: item.short,
        unit: item.unit,
        color: ESIOS_TECH_COLORS[item.slug] || '#94a3b8',
        now_mw: last ? Math.round(last.value) : null,
        now_datetime: last?.datetime || null,
        pct_of_total: null, // se rellena después
        avg_24h_mw: avg24 !== null ? Math.round(avg24) : null,
        serie_24h,
        error: r.error,
      }
    })
  )

  // Agregados en paralelo
  const aggResults = await Promise.all(
    ESIOS_MIX_AGREGADO_SLUGS.map(async (slug: EsiosSlug): Promise<AgregadoValor> => {
      const item = ESIOS_CATALOG[slug]
      const r: EsiosResponse = await fetchEsiosIndicator(item.id, {
        startDate: start,
        endDate: end,
        geoIds: [item.geo_default],
        timeTrunc: 'hour',
      })
      const ind = r.indicator
      const last = latestValue(ind)
      const avg24 = avgLastN(ind, 24)
      return {
        slug: item.slug,
        ok: r.ok,
        label: item.label,
        unit: item.unit,
        latest_value: last ? Math.round(last.value * 100) / 100 : null,
        latest_datetime: last?.datetime || null,
        avg_24h: avg24 !== null ? Math.round(avg24 * 100) / 100 : null,
        error: r.error,
      }
    })
  )

  // Calcular % del total para cada tecnología (snapshot now)
  const totalNow = techResults.reduce((s, t) => s + (t.now_mw || 0), 0)
  if (totalNow > 0) {
    for (const t of techResults) {
      if (t.now_mw !== null) {
        t.pct_of_total = Math.round((t.now_mw / totalNow) * 1000) / 10  // 1 decimal
      }
    }
  }

  const tech: Record<string, TechSnapshot> = {}
  for (const t of techResults) tech[t.slug] = t
  const agregados: Record<string, AgregadoValor> = {}
  for (const a of aggResults) agregados[a.slug] = a

  return NextResponse.json({
    ok: techResults.every((t) => t.ok) && aggResults.every((a) => a.ok),
    tech,
    agregados,
    total_now_mw: totalNow,
    indicators_ok: techResults.filter((t) => t.ok).length + aggResults.filter((a) => a.ok).length,
    indicators_count: techResults.length + aggResults.length,
    fetched_at: startedAt,
    _meta: {
      source: 'ESIOS · Red Eléctrica España',
      source_url: 'https://www.esios.ree.es/',
      cache_ttl_seconds: 60,
      note: 'Datos cada 10 minutos agregados a hora. % calculado sobre suma de 10 tecnologías peninsulares',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' },
  })
}
