import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface BurstTopic {
  topic: string
  recent_n: number
  baseline_n: number
  ratio: number
  is_new: boolean
}

export interface AmplificationTopic {
  topic: string
  n_sources: number
  n_countries: number
  n_articles: number
  examples: string[]
}

export interface DualPolarizationTopic {
  topic: string
  total: number
  pos_pct: number
  neg_pct: number
  neu_pct: number
}

export interface EscalationsResponse {
  burst_topics: BurstTopic[]
  amplification: AmplificationTopic[]
  dual_polarization: DualPolarizationTopic[]
  fetched_at: string
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/risk/escalations${params ? '?' + params : ''}`
  const real = await fromBackend<EscalationsResponse>(path)
  if (real) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({
    burst_topics: [], amplification: [], dual_polarization: [],
    fetched_at: new Date().toISOString(),
  }, 'mock'))
}
