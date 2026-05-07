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
    total_articles: 0,
    last_24h: 0,
    sources_active: 0,
    catalog: { total_sources: 414, by_region: {} },
  }, 'mock'))
}
