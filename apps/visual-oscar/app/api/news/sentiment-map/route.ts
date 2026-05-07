import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/news/sentiment-map${params ? '?' + params : ''}`
  const real = await fromBackend<{ points: SentimentMapPoint[] }>(path)
  if (real && Array.isArray(real.points)) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({ points: [] }, 'mock'))
}
