import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/news/topics${params ? '?' + params : ''}`
  const real = await fromBackend<{ topics: { topic: string; cnt: number }[] }>(path)
  if (real && Array.isArray(real.topics)) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({ topics: [] }, 'mock'))
}
