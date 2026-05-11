import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const real = await fromBackend<Record<string, unknown>>('/api/news/stats')
  if (real) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({
    total_articles: 1247,
    last_24h: 87,
    sources_active: 98,
    catalog: {
      total_sources: 219,
      by_region: { nacional: 83, autonomico: 82, provincial: 45, local: 9 },
    },
  }, 'mock'))
}
