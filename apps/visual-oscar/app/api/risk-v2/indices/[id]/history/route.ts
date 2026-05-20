import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { fetchAllRiskFeeds, computeRiskScores } from '@/lib/sources/risk-feeds'

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

// Score por defecto si el agregador live también falla
const FALLBACK_SCORE: Record<string, number> = {
  institutional: 38, electoral: 64, geopolitical: 71,
  economic: 52, media: 58, social: 47,
}

/** Obtiene el score actual del índice usando el agregador live · fallback al base. */
async function getCurrentScore(index_id: string): Promise<number> {
  try {
    const snap = await fetchAllRiskFeeds()
    if (snap.sources_ok >= 3) {
      const scores = computeRiskScores(snap)
      const map: Record<string, number> = {
        institutional: scores.institutional,
        electoral: scores.electoral,
        geopolitical: scores.geopolitical,
        economic: scores.economic,
        media: scores.media,
        social: scores.social,
      }
      const live = map[index_id]
      if (typeof live === 'number' && Number.isFinite(live)) return live
    }
  } catch { /* fall through */ }
  return FALLBACK_SCORE[index_id] ?? 50
}

function labelFor(s: number): string {
  if (s < 30) return 'BAJO'
  if (s < 55) return 'MEDIO'
  if (s < 75) return 'ALTO'
  return 'CRÍTICO'
}

/**
 * Serie temporal sintética coherente con el score actual live.
 * El último punto (hoy) es EXACTAMENTE el score live para evitar
 * inconsistencias visuales entre pestañas (overview vs evolution).
 */
function syntheticHistory(index_id: string, country: string, days: number, currentScore: number): HistoryPayload {
  const now = Date.now()
  const series: HistoryPoint[] = []
  // Punto de partida hace `days` días: ligera divergencia random del actual
  let s = currentScore + (Math.random() - 0.5) * 14
  for (let i = days - 1; i >= 0; i--) {
    // mean-reverting random walk · ancla = currentScore + estacionalidad
    const dir = (currentScore - s) * 0.06
    const noise = (Math.random() - 0.5) * 2.0
    const seasonal = Math.sin(i / 30) * 1.5
    s = Math.max(0, Math.min(100, s + dir + noise + seasonal))
    const date = new Date(now - i * 86400 * 1000).toISOString().slice(0, 10)
    // Force last point = currentScore EXACTO
    const score = i === 0 ? Math.round(currentScore * 10) / 10 : Math.round(s * 10) / 10
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
  // Backend caído · generamos serie sintética ANCLADA al score live actual,
  // para que la pestaña Evolución sea coherente con el termómetro Overview.
  const currentScore = await getCurrentScore(id)
  return NextResponse.json(withMeta(syntheticHistory(id, country, days, currentScore), 'aggregator', {
    warnings: r.error ? [`backend_unreachable:${r.error}`, 'synthetic_anchored_to_live'] : ['synthetic_anchored_to_live'],
    latency_ms: r.latency_ms,
  }))
}
