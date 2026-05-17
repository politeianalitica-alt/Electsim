/**
 * GET /api/news/narrativas-v2
 * Narrativas multidimensionales · framework v2.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAggregatedNews } from '@/lib/news-aggregator'
import { extraerNarrativasV2 } from '@/lib/news/narrativas-v2'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 45

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const max = Math.min(15, Number(sp.get('max') || 8))
  const hoursBack = Math.min(720, Number(sp.get('hours') || 168))
  const maxSources = Math.min(60, Number(sp.get('sources') || 40))

  const articles = await getAggregatedNews({ maxSources, hoursBack }).catch(() => [])
  const narrativas = extraerNarrativasV2(articles, max)

  return NextResponse.json(
    { narrativas, totalArticulos: articles.length, ventanaHoras: hoursBack, ts: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' } },
  )
}
