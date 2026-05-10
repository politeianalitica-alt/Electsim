import type { WorkspaceBlock, TipoBlock } from '@/types/intelligence'
import { MOCK_NOTEBOOK_BLOCKS, nowIso } from '../../../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const items = MOCK_NOTEBOOK_BLOCKS.filter(b => b.notebook_id === params.id)
  return Response.json({ items, total: items.length })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as { tipo: TipoBlock; contenido: string; orden?: number }
    const newBlock: WorkspaceBlock = {
      id: `blk-${Date.now()}`,
      notebook_id: params.id,
      tipo: body.tipo,
      contenido: body.contenido,
      orden: body.orden ?? MOCK_NOTEBOOK_BLOCKS.filter(b => b.notebook_id === params.id).length,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    return Response.json(newBlock)
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
