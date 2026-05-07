import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface TopPerson {
  name: string
  label: string
  mentions: number
  pos: number
  neg: number
  neu: number
  sent_polarity: number
  avg_relevance: number
  last_seen: string | null
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/persons/top-mentioned${params ? '?' + params : ''}`
  const real = await fromBackend<{ persons: TopPerson[]; total_unique: number }>(path)
  if (real && Array.isArray(real.persons)) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({ persons: [], total_unique: 0 }, 'mock'))
}
