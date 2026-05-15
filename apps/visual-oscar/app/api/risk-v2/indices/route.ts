import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { mockIndices } from '../_mocks'
import { fetchAllRiskFeeds, computeRiskScores, type ComponentScore } from '@/lib/sources/risk-feeds'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface RiskIndexCard {
  index_id: string
  display_name: string
  display_order: number
  icon: string
  description?: string
  score: number
  label: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO'
  delta_7d: number | null
  delta_30d: number | null
  colors: { low: string; medium: string; high: string; critical: string }
  source: string
  warnings: string[]
  n_components_used: number
  n_components_configured: number
  components?: Array<{
    source_id: string
    metric_name: string
    weight: number
    raw_value: number | null
    score_0_100: number
    contribution: number
  }>
}

export interface RiskIndicesPayload {
  country: string
  n_indices: number
  indices: RiskIndexCard[]
}

function labelFor(score: number): RiskIndexCard['label'] {
  return score < 30 ? 'BAJO' : score < 55 ? 'MEDIO' : score < 75 ? 'ALTO' : 'CRÍTICO'
}

export async function GET(req: NextRequest) {
  const t0 = Date.now()
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const r = await callBackend<RiskIndicesPayload>(
    `/api/risk-v2/indices?country=${encodeURIComponent(country)}`,
    { cache: 'no-store' },
  )
  if (r.data && Array.isArray(r.data.indices) && r.data.indices.length > 0) {
    return NextResponse.json(
      withMeta(r.data, 'backend', { latency_ms: r.latency_ms }),
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } },
    )
  }

  // ── Backend FastAPI no responde · usar AGREGADOR LIVE de fuentes públicas
  //    Banco Mundial · ECB · INE · GDELT (5/6 funcionan)
  try {
    const snap = await fetchAllRiskFeeds()
    if (snap.sources_ok >= 3) {
      // Empezamos del mock como base (estructura, deltas, colores)
      // y sobrescribimos los SCORES con los calculados de feeds reales
      const base = mockIndices(country)
      const scores = computeRiskScores(snap)
      const mapaScore: Record<string, number> = {
        institutional: scores.institutional,
        electoral: scores.electoral,
        geopolitical: scores.geopolitical,
        economic: scores.economic,
        media: scores.media,
        social: scores.social,
      }
      base.indices = base.indices.map(idx => {
        const score = mapaScore[idx.index_id] ?? idx.score
        const liveComponents: ComponentScore[] = scores.components[idx.index_id] || []
        const hasLive = liveComponents.length > 0
        return {
          ...idx,
          score: Math.round(score * 10) / 10,
          label: labelFor(score),
          source: hasLive ? 'live' : 'demo',
          warnings: hasLive ? [] : ['fallback_data'],
          n_components_used: hasLive ? liveComponents.length : idx.n_components_used,
          components: hasLive
            ? liveComponents.map(c => ({
                source_id: c.source_id,
                metric_name: c.metric_name,
                weight: c.weight,
                raw_value: c.raw_value,
                score_0_100: c.score_0_100,
                contribution: Math.round(c.score_0_100 * c.weight * 10) / 10,
              }))
            : idx.components,
        }
      })
      return NextResponse.json(
        withMeta(base, 'aggregator', {
          warnings: [`live_feeds_ok:${snap.sources_ok}/${snap.sources_total}`],
          latency_ms: Date.now() - t0,
        }),
        { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } },
      )
    }
  } catch (e) {
    console.warn('[risk-v2/indices] aggregator error:', e instanceof Error ? e.message : e)
  }

  // ── Último recurso · datos demo (mostrar dashboard operativo)
  return NextResponse.json(withMeta(mockIndices(country), 'mock', {
    warnings: r.error ? [`backend_unreachable:${r.error}`] : ['fallback_demo_data'],
    latency_ms: Date.now() - t0,
  }))
}
