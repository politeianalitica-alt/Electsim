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

// Aggregate score base coherente con _mocks.ts (~55 medio)
const AGGREGATE_BASE = 28  // riesgo bajo · zona "Verde + Amarillo"

function mockTrend(country: string): TrendPayload {
  const HIST_DAYS = 30
  const FC_DAYS = 14
  const history: number[] = []
  let s = AGGREGATE_BASE + (Math.random() - 0.5) * 6
  // Caminata aleatoria mean-reverting + estacionalidad débil
  for (let i = HIST_DAYS - 1; i >= 0; i--) {
    const dir = (AGGREGATE_BASE - s) * 0.06
    const noise = (Math.random() - 0.5) * 6
    const seasonal = Math.sin(i / 5) * 2.5
    s = Math.max(5, Math.min(95, s + dir + noise + seasonal))
    history.push(Math.round(s * 10) / 10)
  }
  // Previsión: tendencia ligeramente bajista con incertidumbre creciente
  const lastHist = history[history.length - 1]
  const forecast: number[] = []
  const forecastLow: number[] = []
  const forecastHigh: number[] = []
  let f = lastHist
  for (let i = 1; i <= FC_DAYS; i++) {
    const drift = (AGGREGATE_BASE - f) * 0.04
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
  return NextResponse.json(withMeta(mockTrend(country), 'mock', {
    warnings: r.error ? [`backend_unreachable:${r.error}`] : ['demo_data'],
    latency_ms: r.latency_ms,
  }))
}
