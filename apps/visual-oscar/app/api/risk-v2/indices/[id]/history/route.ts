import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface HistoryPoint {
  date: string
  score: number | null
  delta_7d: number | null
  label?: string
}
interface HistoryPayload {
  index_id: string
  country: string
  days: number
  n: number
  series: HistoryPoint[]
}

// Score base por índice (debe coincidir con el de _mocks.ts)
const BASE_SCORE: Record<string, number> = {
  institutional: 38, electoral: 64, geopolitical: 71,
  economic: 52, media: 58, social: 47,
}

function labelFor(s: number): string {
  if (s < 30) return 'BAJO'
  if (s < 55) return 'MEDIO'
  if (s < 75) return 'ALTO'
  return 'CRÍTICO'
}

/** Serie temporal mock · caminata aleatoria suave alrededor del score base */
function mockHistory(index_id: string, country: string, days: number): HistoryPayload {
  const base = BASE_SCORE[index_id] ?? 50
  const now = Date.now()
  const series: HistoryPoint[] = []
  let s = base + (Math.random() - 0.5) * 10
  for (let i = days - 1; i >= 0; i--) {
    // mean-reverting random walk + componente estacional suave
    const dir = (base - s) * 0.04
    const noise = (Math.random() - 0.5) * 2.0
    const seasonal = Math.sin(i / 30) * 1.5
    s = Math.max(0, Math.min(100, s + dir + noise + seasonal))
    const date = new Date(now - i * 86400 * 1000).toISOString().slice(0, 10)
    const score = Math.round(s * 10) / 10
    const prev7 = series.length >= 7 ? series[series.length - 7].score : null
    const delta7 = (prev7 != null && score != null) ? Math.round((score - prev7) * 10) / 10 : null
    series.push({ date, score, delta_7d: delta7, label: labelFor(score) })
  }
  return { index_id, country, days, n: series.length, series }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const daysStr = req.nextUrl.searchParams.get('days') || '365'
  const days = Math.max(7, Math.min(730, Number(daysStr) || 365))
  const id = decodeURIComponent(params.id)
  const r = await callBackend<HistoryPayload>(
    `/api/risk-v2/indices/${encodeURIComponent(id)}/history?country=${encodeURIComponent(country)}&days=${days}`,
    { cache: 'no-store' },
  )
  if (r.data && Array.isArray(r.data.series) && r.data.series.length > 0) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  // Fallback DEMO · serie temporal sintética coherente con el score base.
  return NextResponse.json(withMeta(mockHistory(id, country, days), 'mock', {
    warnings: r.error ? [`backend_unreachable:${r.error}`] : ['demo_data'],
    latency_ms: r.latency_ms,
  }))
}
