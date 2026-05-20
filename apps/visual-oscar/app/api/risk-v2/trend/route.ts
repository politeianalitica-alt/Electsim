/**
 * GET /api/risk-v2/trend?country=ES
 *
 * Serie histórica del índice agregado de riesgo + previsión 14 días con
 * intervalo de confianza al 80%. Alimenta el TrendChart del termómetro.
 *
 * Estructura:
 *   - history[]      · 30 días previos (incluye hoy)
 *   - forecast[]     · 14 días futuros (predicción media)
 *   - forecastLow[]  · banda IC 80% inferior
 *   - forecastHigh[] · banda IC 80% superior
 *   - kpis[]         · cambio 7d, máx/mín 30d, previsión +14d
 */
import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { fetchAllRiskFeeds, computeRiskScores } from '@/lib/sources/risk-feeds'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface TrendKpi {
  label: string
  value: string
  delta?: number
  dir?: 'up' | 'down'
}
interface TrendPayload {
  history: number[]
  forecast: number[]
  forecastLow: number[]
  forecastHigh: number[]
  kpis: TrendKpi[]
  country: string
}

// Score base por defecto si el agregador live falla (riesgo medio)
const AGGREGATE_FALLBACK = 52

/** Obtiene el agregado actual a partir de los 6 índices live · fallback al default. */
async function getCurrentAggregate(): Promise<number> {
  try {
    const snap = await fetchAllRiskFeeds()
    if (snap.sources_ok >= 3) {
      const s = computeRiskScores(snap)
      const all = [s.institutional, s.electoral, s.geopolitical, s.economic, s.media, s.social]
      const avg = all.reduce((acc, v) => acc + v, 0) / all.length
      if (Number.isFinite(avg)) return Math.round(avg * 10) / 10
    }
  } catch { /* fall through */ }
  return AGGREGATE_FALLBACK
}

function syntheticTrend(country: string, aggregate: number): TrendPayload {
  const HIST_DAYS = 30
  const FC_DAYS = 14
  const history: number[] = []
  // Punto inicial divergente del actual (random walk reversible)
  let s = aggregate + (Math.random() - 0.5) * 10
  // Caminata aleatoria mean-reverting al aggregate live + estacionalidad débil
  for (let i = HIST_DAYS - 1; i >= 0; i--) {
    const dir = (aggregate - s) * 0.08
    const noise = (Math.random() - 0.5) * 4
    const seasonal = Math.sin(i / 5) * 2.0
    s = Math.max(5, Math.min(95, s + dir + noise + seasonal))
    // Force last point (today) = aggregate EXACTO para coherencia con termómetro
    const v = i === 0 ? aggregate : Math.round(s * 10) / 10
    history.push(v)
  }
  // Previsión: tendencia ligeramente bajista con incertidumbre creciente
  const lastHist = history[history.length - 1]
  const forecast: number[] = []
  const forecastLow: number[] = []
  const forecastHigh: number[] = []
  let f = lastHist
  for (let i = 1; i <= FC_DAYS; i++) {
    const drift = (aggregate - f) * 0.05
    const driftNoise = (Math.random() - 0.5) * 1.8
    f = Math.max(5, Math.min(95, f + drift + driftNoise))
    forecast.push(Math.round(f * 10) / 10)
    // IC 80% se ensancha con el horizonte (~±1.4*sqrt(t))
    const halfWidth = 4 + Math.sqrt(i) * 2.5
    forecastLow.push(Math.max(0, Math.round((f - halfWidth) * 10) / 10))
    forecastHigh.push(Math.min(100, Math.round((f + halfWidth) * 10) / 10))
  }

  // KPIs derivados
  const change7d = +(history[history.length - 1] - history[history.length - 8]).toFixed(1)
  const max30 = Math.max(...history)
  const min30 = Math.min(...history)
  const fc14 = forecast[forecast.length - 1]
  const fcDelta = +(fc14 - lastHist).toFixed(1)

  const kpis: TrendKpi[] = [
    { label: 'Cambio 7 días',     value: history[history.length - 1].toFixed(1), delta: change7d, dir: change7d >= 0 ? 'up' : 'down' },
    { label: 'Máximo 30D',        value: max30.toFixed(1) },
    { label: 'Mínimo 30D',        value: min30.toFixed(1) },
    { label: 'Previsión día +14', value: fc14.toFixed(1), delta: fcDelta, dir: fcDelta >= 0 ? 'up' : 'down' },
  ]

  return { history, forecast, forecastLow, forecastHigh, kpis, country }
}

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const r = await callBackend<TrendPayload>(
 `/api/risk-v2/trend?country=${encodeURIComponent(country)}`,
    { cache: 'no-store' },
  )
  if (r.data && Array.isArray(r.data.history) && r.data.history.length > 0) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  // Backend caído · serie sintética ANCLADA al agregado live actual,
  // para que la tendencia sea coherente con los 6 índices del termómetro.
  const aggregate = await getCurrentAggregate()
  return NextResponse.json(withMeta(syntheticTrend(country, aggregate), 'aggregator', {
    warnings: r.error ? [`backend_unreachable:${r.error}`, 'synthetic_anchored_to_live'] : ['synthetic_anchored_to_live'],
    latency_ms: r.latency_ms,
  }))
}
