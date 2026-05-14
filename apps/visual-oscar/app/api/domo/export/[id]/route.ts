import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/domo/export/${params.id}`, { next: { revalidate: 0 } })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/domo/export/${params.id}`, { method: 'DELETE' })
    return new NextResponse(null, { status: res.status })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
