import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: { expiresInDays?: number } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  try {
    const res = await fetch(`${BACKEND}/api/domo/dashboard/${params.id}/share/link`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    const token = Math.random().toString(36).slice(2, 14)
    return NextResponse.json({
      token,
      url: `/domo/dashboard/public/${token}`,
      role: 'viewer',
      viewCount: 0,
      expiresAt: body.expiresInDays
        ? new Date(Date.now() + body.expiresInDays * 86_400_000).toISOString()
        : undefined,
    })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/domo/dashboard/${params.id}/share/link`, { method: 'DELETE' })
    return new NextResponse(null, { status: res.status })
  } catch {
    return new NextResponse(null, { status: 200 })
  }
}
