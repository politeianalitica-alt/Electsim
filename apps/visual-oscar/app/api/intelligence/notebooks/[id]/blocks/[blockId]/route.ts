import type { WorkspaceBlock } from '@/types/intelligence'
import { MOCK_NOTEBOOK_BLOCKS, nowIso } from '../../../../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(req: Request, { params }: { params: { id: string; blockId: string } }) {
  try {
    const patch = (await req.json()) as Partial<WorkspaceBlock>
    const base = MOCK_NOTEBOOK_BLOCKS.find(b => b.id === params.blockId)
      ?? { id: params.blockId, notebook_id: params.id, tipo: 'texto', contenido: '', orden: 0, created_at: nowIso(), updated_at: nowIso() } as WorkspaceBlock
    return Response.json({ ...base, ...patch, id: base.id, updated_at: nowIso() })
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}

export async function DELETE() {
  return Response.json({ ok: true })
}
