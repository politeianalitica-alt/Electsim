import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!BACKEND) {
    return NextResponse.json({ started: false, error: 'BACKEND_URL no configurada' }, { status: 502 })
  }
  let body: unknown = {}
  try { body = await req.json() } catch { /* ignore */ }
  try {
    const res = await fetch(`${BACKEND}/api/news/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body || {}),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ started: false, error: String(e) }, { status: 502 })
  }
}
