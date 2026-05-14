import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/domo/alert/${params.id}/toggle`, { method: 'POST' })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ id: params.id, status: 'paused' })
  }
}
