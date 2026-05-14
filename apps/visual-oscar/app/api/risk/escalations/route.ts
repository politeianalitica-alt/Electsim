import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews, burstTopics, amplification, dualPolarization, type BurstTopic, type AmplificationTopic, type DualPolarizationTopic } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export type { BurstTopic, AmplificationTopic, DualPolarizationTopic }

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
  if (real && (real.burst_topics?.length || real.amplification?.length || real.dual_polarization?.length)) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  const hours = Math.min(168, Number(req.nextUrl.searchParams.get('hours_back') || 72))
  try {
    const articles = await getAggregatedNews({ maxSources: 50, hoursBack: hours })
    return NextResponse.json(withMeta({
      burst_topics:      burstTopics(articles),
      amplification:     amplification(articles),
      dual_polarization: dualPolarization(articles),
      fetched_at: new Date().toISOString(),
    }, 'mock'))
  } catch {
    return NextResponse.json(withMeta({
      burst_topics: [], amplification: [], dual_polarization: [],
      fetched_at: new Date().toISOString(),
    }, 'mock'))
  }
}
