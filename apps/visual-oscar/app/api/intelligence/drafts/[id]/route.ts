import type { DraftDocument, EstadoDraft, SeccionDraft } from '@/types/intelligence'
import { MOCK_DRAFTS, MOCK_DRAFT_SECCIONES, nowIso } from '../../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function findDraft(id: string): DraftDocument {
  const found = MOCK_DRAFTS.find(d => d.id === id)
  if (found) {
    if (!found.secciones || found.secciones.length === 0) {
      return { ...found, secciones: MOCK_DRAFT_SECCIONES }
    }
    return found
  }
  return { ...MOCK_DRAFTS[0], secciones: MOCK_DRAFT_SECCIONES }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return Response.json(findDraft(params.id))
}

interface SectionPatch {
  kind: 'section'
  seccion_id: string
  contenido?: string
  titulo?: string
}
interface EstadoPatch {
  kind: 'estado'
  estado: EstadoDraft
}
type DraftPatch = SectionPatch | EstadoPatch

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as DraftPatch
    const base = findDraft(params.id)
    if (body.kind === 'section') {
      const sec = base.secciones.find(s => s.id === body.seccion_id)
      const updated: SeccionDraft = sec
        ? { ...sec, contenido: body.contenido ?? sec.contenido, titulo: body.titulo ?? sec.titulo }
        : { id: body.seccion_id, titulo: body.titulo ?? 'Nueva seccion', contenido: body.contenido ?? '', orden: base.secciones.length }
      return Response.json(updated)
    }
    if (body.kind === 'estado') {
      const updated: DraftDocument = { ...base, estado: body.estado, updated_at: nowIso() }
      return Response.json(updated)
    }
    return Response.json({ error: 'unknown_kind' }, { status: 400 })
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}

export async function DELETE() {
  return Response.json({ ok: true })
}
