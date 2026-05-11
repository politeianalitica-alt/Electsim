import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews, topTopics } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const path = `/api/news/topics${params.toString() ? '?' + params.toString() : ''}`
  const real = await fromBackend<{ topics: { topic: string; cnt: number }[] }>(path)
  if (real && Array.isArray(real.topics) && real.topics.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  const hours = Math.min(168, Number(params.get('hours_back') || 48))
  const limit = Math.min(30, Number(params.get('limit') || 12))
  try {
    const articles = await getAggregatedNews({ maxSources: 35, hoursBack: hours })
    const topics = topTopics(articles, limit)
    return NextResponse.json(withMeta({ topics }, 'mock'))
  } catch {
    return NextResponse.json(withMeta({ topics: [] }, 'mock'))
  }
}
