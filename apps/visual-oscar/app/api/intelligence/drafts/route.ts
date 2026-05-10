import type { DraftDocument, DraftSnapshot, TipoProducto, ClasificacionDraft } from '@/types/intelligence'
import { MOCK_DRAFTS, nowIso } from '../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

const TEMPLATE: Record<TipoProducto, { titulo: string; orden: number }[]> = {
  memo: [
    { titulo: 'Resumen ejecutivo', orden: 0 },
    { titulo: 'Contexto', orden: 1 },
    { titulo: 'Hallazgos clave', orden: 2 },
    { titulo: 'Implicaciones', orden: 3 },
    { titulo: 'Recomendaciones', orden: 4 },
  ],
  informe: [
    { titulo: 'Resumen ejecutivo', orden: 0 },
    { titulo: 'Antecedentes', orden: 1 },
    { titulo: 'Analisis', orden: 2 },
    { titulo: 'Conclusiones', orden: 3 },
    { titulo: 'Anexos', orden: 4 },
  ],
  briefing: [
    { titulo: 'Titulares del dia', orden: 0 },
    { titulo: 'Politica', orden: 1 },
    { titulo: 'Regulatorio', orden: 2 },
    { titulo: 'Narrativa', orden: 3 },
  ],
  alerta: [
    { titulo: 'Hecho clave', orden: 0 },
    { titulo: 'Implicaciones', orden: 1 },
    { titulo: 'Recomendacion', orden: 2 },
  ],
  ejecutivo: [
    { titulo: 'Mensaje clave', orden: 0 },
    { titulo: 'Tres hallazgos', orden: 1 },
    { titulo: 'Decision requerida', orden: 2 },
  ],
}

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/drafts`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}
  const items = MOCK_DRAFTS
  const snap: DraftSnapshot = { items, total: items.length, generado_en: nowIso() }
  return Response.json(snap)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { titulo: string; tipo: TipoProducto; clasificacion?: ClasificacionDraft }
    const tpl = TEMPLATE[body.tipo] ?? TEMPLATE.memo
    const item: DraftDocument = {
      id: `drf-${Date.now()}`,
      titulo: body.titulo,
      tipo: body.tipo,
      estado: 'borrador',
      clasificacion: body.clasificacion ?? 'interna',
      secciones: tpl.map((s, i) => ({ id: `sec-${Date.now()}-${i}`, titulo: s.titulo, contenido: '', orden: s.orden })),
      autor: 'Analista',
      revisores: [],
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    return Response.json(item)
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
