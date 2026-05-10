import type { Fuente } from '@/types/intelligence'
import { MOCK_FUENTES, nowIso } from '../../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const patch = (await req.json()) as Partial<Fuente>
    const base = MOCK_FUENTES.find(f => f.id === params.id) ?? MOCK_FUENTES[0]
    return Response.json({ ...base, ...patch, id: base.id, updated_at: nowIso() })
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}

export async function DELETE() {
  return Response.json({ ok: true })
}
