/**
 * /api/diplomacia/screening · Sprint GEO-DIP C1
 *
 * Búsqueda fuzzy de entidades sancionadas · proxy OpenSanctions.
 *   GET /api/diplomacia/screening?q=Putin&limit=10
 *
 * Cache: s-maxage=3600 (1h).
 */
import { NextRequest, NextResponse } from 'next/server'
import { searchEntities } from '@/lib/opensanctions/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || ''
  const limit = Math.min(50, Number(req.nextUrl.searchParams.get('limit') || 10))
  if (!q || q.length < 2) {
    return NextResponse.json({ ok: false, error: 'query_too_short · usar q=name (>= 2 chars)' }, { status: 400 })
  }
  const result = await searchEntities(q, limit)
  return NextResponse.json({
    ok: result.ok,
    query: q,
    limit,
    results: result.data,
    error: result.error,
    fetched_at: result.fetched_at,
    _meta: {
      source: 'OpenSanctions API · 333+ fuentes consolidadas',
      cache_ttl_seconds: 3600,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  })
}
