import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => ({}))
  const backendUrl = process.env.BACKEND_URL
  const apiKey = process.env.BACKEND_API_KEY
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/war-room/tareas/${params.id}`, {
        method: 'PATCH',
        headers: { 'X-API-Key': apiKey ?? '', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) return NextResponse.json(await res.json())
    } catch { /* fall through */ }
  }
  return NextResponse.json({ id: params.id, ...body })
}
