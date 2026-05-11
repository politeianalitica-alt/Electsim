import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews, sentimentMap } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export interface SentimentMapPoint {
  source_country: string
  source_region: string
  lat: number
  lon: number
  volume: number
  avg_relevance: number
  pos: number
  neg: number
  neu: number
  spain_high: number
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const path = `/api/news/sentiment-map${params.toString() ? '?' + params.toString() : ''}`
  const real = await fromBackend<{ points: SentimentMapPoint[] }>(path)
  if (real && Array.isArray(real.points) && real.points.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  const hours = Math.min(168, Number(params.get('hours_back') || 72))
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: hours })
    const points = sentimentMap(articles)
    return NextResponse.json(withMeta({ points }, 'mock'))
  } catch {
    return NextResponse.json(withMeta({ points: [] }, 'mock'))
  }
}
