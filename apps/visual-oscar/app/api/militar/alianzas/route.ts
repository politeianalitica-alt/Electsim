/**
 * /api/militar/alianzas · Sprint GEO-MIL C4
 *
 * Dataset estático de alianzas militares + arcos para el mapa.
 * Cache: s-maxage=2592000 (30 días · cambia lentamente).
 */
import { NextResponse } from 'next/server'
import { ALLIANCES, getAlliancePairs, ALLIANCES_COUNT } from '@/lib/geopolitica/alliances'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const pairs = getAlliancePairs()
  return NextResponse.json({
    ok: true,
    alliances: ALLIANCES,
    pairs,
    summary: {
      alliances_count: ALLIANCES_COUNT,
      total_pairs: pairs.length,
    },
    fetched_at: new Date().toISOString(),
    _meta: {
      source: 'Dataset curado · NATO/CSTO/SCO/AUKUS/PESCO/QUAD/BRICS+ oficiales',
      cache_ttl_seconds: 2592000,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=7776000' },
  })
}
