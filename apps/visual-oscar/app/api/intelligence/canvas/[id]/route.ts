import type { Canvas } from '@/types/intelligence'
import { MOCK_CANVAS } from '../../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/canvas/${params.id}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}
  const item = MOCK_CANVAS.find(c => c.id === params.id) ?? MOCK_CANVAS[0]
  return Response.json(item)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const patch = (await req.json()) as Partial<Canvas>
    const base = MOCK_CANVAS.find(c => c.id === params.id) ?? MOCK_CANVAS[0]
    return Response.json({ ...base, ...patch, id: base.id })
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}

export async function DELETE() {
  return Response.json({ ok: true })
}
