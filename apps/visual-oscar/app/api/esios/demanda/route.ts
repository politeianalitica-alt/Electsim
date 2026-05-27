/**
 * /api/esios/demanda · Sprint ESIOS-DEEP S3
 *
 * Dos paneles de demanda en una llamada:
 *   - `forecast` · demanda real peninsular + prevista + programada con error MAPE
 *   - `sistemas` · demanda real en los 5 sistemas (Pen/Can/Bal/Ceu/Mel)
 *
 * Cache: s-maxage=300 (5 min · datos 10-min peninsula y horarios forecast).
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
  ESIOS_DEMANDA_SISTEMAS_SLUGS,
  ESIOS_DEMANDA_FORECAST_SLUGS,
  type EsiosSlug,
} from '@/lib/esios/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface SerieValor { t: string; v: number }
interface Serie {
  slug: string
  ok: boolean
  label: string
  short: string
  unit: string
  latest_mw: number | null
  latest_datetime: string | null
  avg_24h_mw: number | null
  serie_24h: SerieValor[]
  error?: string
}

/** Calcula MAPE entre dos series alineadas (ambas con misma longitud N). */
function calcMAPE(real: SerieValor[], pred: SerieValor[]): number | null {
  const n = Math.min(real.length, pred.length)
  if (n < 2) return null
  let sum = 0, count = 0
  for (let i = 0; i < n; i++) {
    if (real[i].v === 0) continue
    sum += Math.abs((real[i].v - pred[i].v) / real[i].v)
    count++
  }
  return count > 0 ? Math.round((sum / count) * 10000) / 100 : null  // %
}

export async function GET() {
  const startedAt = new Date().toISOString()
  const apiKey = process.env.ESIOS_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'no_key',
      message: 'ESIOS_API_KEY no configurada · añadir a Vercel env vars (Production)',
      forecast: {},
      sistemas: {},
      fetched_at: startedAt,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    })
  }

  const now = new Date()
  const start = new Date(now.getTime() - 24 * 3600_000).toISOString().slice(0, 16)
  const end = new Date(now.getTime() + 24 * 3600_000).toISOString().slice(0, 16)

  // Forecast peninsular (3 series)
  const forecastResults = await Promise.all(
    ESIOS_DEMANDA_FORECAST_SLUGS.map(async (slug: EsiosSlug): Promise<Serie> => {
      const item = ESIOS_CATALOG[slug]
      const r: EsiosResponse = await fetchEsiosIndicator(item.id, {
        startDate: start, endDate: end,
        geoIds: [item.geo_default],
        timeTrunc: 'hour',
      })
      const ind = r.indicator
      const last = latestValue(ind)
      const avg24 = avgLastN(ind, 24)
      const serie_24h = (ind?.values || []).slice(-48).map((p) => ({ t: p.datetime, v: p.value }))
      return {
        slug: item.slug, ok: r.ok,
        label: item.label, short: item.short, unit: item.unit,
        latest_mw: last ? Math.round(last.value) : null,
        latest_datetime: last?.datetime || null,
        avg_24h_mw: avg24 !== null ? Math.round(avg24) : null,
        serie_24h,
        error: r.error,
      }
    })
  )

  // Sistemas 5 zonas (geo_id distinto por slug)
  const sistemasResults = await Promise.all(
    ESIOS_DEMANDA_SISTEMAS_SLUGS.map(async (slug: EsiosSlug): Promise<Serie> => {
      const item = ESIOS_CATALOG[slug]
      const r: EsiosResponse = await fetchEsiosIndicator(item.id, {
        startDate: start, endDate: end,
        geoIds: [item.geo_default],
        timeTrunc: 'hour',
      })
      const ind = r.indicator
      const last = latestValue(ind)
      const avg24 = avgLastN(ind, 24)
      const serie_24h = (ind?.values || []).slice(-24).map((p) => ({ t: p.datetime, v: p.value }))
      return {
        slug: item.slug, ok: r.ok,
        label: item.label, short: item.short, unit: item.unit,
        latest_mw: last ? Math.round(last.value) : null,
        latest_datetime: last?.datetime || null,
        avg_24h_mw: avg24 !== null ? Math.round(avg24) : null,
        serie_24h,
        error: r.error,
      }
    })
  )

  // MAPE entre real y prevista
  const real = forecastResults.find((s) => s.slug === 'demanda_real')
  const prev = forecastResults.find((s) => s.slug === 'demanda_prevista')
  const mape = real && prev ? calcMAPE(real.serie_24h, prev.serie_24h) : null

  const forecast: Record<string, Serie> = {}
  for (const s of forecastResults) forecast[s.slug] = s
  const sistemas: Record<string, Serie> = {}
  for (const s of sistemasResults) sistemas[s.slug] = s

  return NextResponse.json({
    ok: forecastResults.every((s) => s.ok),
    forecast,
    sistemas,
    mape_24h_pct: mape,
    fetched_at: startedAt,
    _meta: {
      source: 'ESIOS · Red Eléctrica España',
      source_url: 'https://www.esios.ree.es/',
      cache_ttl_seconds: 300,
      note: 'MAPE = Mean Absolute Percentage Error real vs prevista · indicador calidad forecast',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' },
  })
}
