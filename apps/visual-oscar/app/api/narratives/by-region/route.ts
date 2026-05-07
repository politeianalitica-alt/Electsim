import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface CCAARegion {
  n: number
  pos: number
  neg: number
  neu: number
  sent_score: number
  top_topics: string[]
}
export interface EuropeCountry {
  n: number
  pos: number
  neg: number
  spain_imp: number
  sample_titles: string[]
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/narratives/by-region${params ? '?' + params : ''}`
  const real = await fromBackend<{ spain_ccaa: Record<string, CCAARegion>; europe: Record<string, EuropeCountry> }>(path)
  if (real) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({ spain_ccaa: {}, europe: {} }, 'mock'))
}
