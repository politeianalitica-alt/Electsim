import { NextRequest, NextResponse } from 'next/server'
import { getAggregatedNews } from '@/lib/news-aggregator'
import { extraerNarrativasV3 } from '@/lib/news/narrativas-v3'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const max = Math.min(15, Number(sp.get('max') || 10))
  const hours = Math.min(720, Number(sp.get('hours') || 168))
  const sources = Math.min(60, Number(sp.get('sources') || 50))

  const articles = await getAggregatedNews({ maxSources: sources, hoursBack: hours }).catch(() => [])
  const narrativas = extraerNarrativasV3(articles, max)

  return NextResponse.json(
    { narrativas, totalArticulos: articles.length, ventanaHoras: hours, ts: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' } },
  )
}
