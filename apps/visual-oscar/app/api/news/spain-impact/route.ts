import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/news/spain-impact${params ? '?' + params : ''}`
  const real = await fromBackend<{ articles: unknown[]; count: number }>(path)
  if (real && Array.isArray(real.articles)) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({ articles: [], count: 0 }, 'mock'))
}
