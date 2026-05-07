import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface PersonProfile {
  name: string
  mentions: Array<{
    id: number; title: string; source: string; summary: string;
    sentiment: string; relevance: number; spain_impact: string;
    is_direct: boolean; scraped_at: string; url?: string; topics: string[];
  }>
  narratives_direct:   { topic: string; cnt: number }[]
  narratives_indirect: { topic: string; cnt: number }[]
  co_persons: { name: string; cnt: number }[]
  co_orgs:    { name: string; cnt: number }[]
  sentiment_timeline: { date: string; sentiment: string; relevance: number }[]
  stats: {
    total_mentions: number
    sentiment_breakdown: Record<string, number>
    sentiment_polarity: number
    hours_back: number
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params
  const decoded = decodeURIComponent(name)
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/persons/${encodeURIComponent(decoded)}/profile${params ? '?' + params : ''}`
  const real = await fromBackend<PersonProfile>(path)
  if (real && real.mentions) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({
    name: decoded, mentions: [], narratives_direct: [], narratives_indirect: [],
    co_persons: [], co_orgs: [], sentiment_timeline: [],
    stats: { total_mentions: 0, sentiment_breakdown: {}, sentiment_polarity: 0, hours_back: 0 }
  }, 'mock'))
}
