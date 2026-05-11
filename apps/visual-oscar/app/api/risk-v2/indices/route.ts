import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

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

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const r = await callBackend<RiskIndicesPayload>(
    `/api/risk-v2/indices?country=${encodeURIComponent(country)}`,
    { cache: 'no-store' },
  )
  if (r.data && Array.isArray(r.data.indices) && r.data.indices.length > 0) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  const empty: RiskIndicesPayload = { country, n_indices: 0, indices: [] }
  return NextResponse.json(withMeta(empty, 'mock', {
    warnings: r.error ? [`backend_unreachable:${r.error}`] : ['no_indices_configured'],
    latency_ms: r.latency_ms,
  }))
}
