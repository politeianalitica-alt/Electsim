import type { Evidencia } from '@/types/intelligence'
import { MOCK_EVIDENCIAS } from '../../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

function find(id: string): Evidencia | undefined {
  return MOCK_EVIDENCIAS.find(e => e.id === id)
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/evidencias/${params.id}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}
  const item = find(params.id) ?? MOCK_EVIDENCIAS[0]
  return Response.json(item)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const patch = (await req.json()) as Partial<Evidencia>
    const base = find(params.id) ?? MOCK_EVIDENCIAS[0]
    const updated: Evidencia = { ...base, ...patch, id: base.id }
    return Response.json(updated)
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, _ctx: { params: { id: string } }) {
  return Response.json({ ok: true })
}
