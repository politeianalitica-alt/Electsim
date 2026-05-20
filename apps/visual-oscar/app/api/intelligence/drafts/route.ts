import type { DraftDocument, TipoProducto, ClasificacionDraft } from '@/types/intelligence'
import { listDomain, createInDomain, MOCK_DRAFTS, nowIso } from '../_proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TEMPLATE: Record<TipoProducto, { titulo: string; orden: number }[]> = {
  memo: [
    { titulo: 'Resumen ejecutivo', orden: 0 },
    { titulo: 'Contexto',          orden: 1 },
    { titulo: 'Hallazgos clave',   orden: 2 },
    { titulo: 'Implicaciones',     orden: 3 },
    { titulo: 'Recomendaciones',   orden: 4 },
  ],
  informe: [
    { titulo: 'Resumen ejecutivo', orden: 0 },
    { titulo: 'Antecedentes',      orden: 1 },
    { titulo: 'Analisis',          orden: 2 },
    { titulo: 'Conclusiones',      orden: 3 },
    { titulo: 'Anexos',            orden: 4 },
  ],
  briefing: [
    { titulo: 'Titulares del dia', orden: 0 },
    { titulo: 'Politica',          orden: 1 },
    { titulo: 'Regulatorio',       orden: 2 },
    { titulo: 'Narrativa',         orden: 3 },
  ],
  alerta: [
    { titulo: 'Hecho clave',     orden: 0 },
    { titulo: 'Implicaciones',   orden: 1 },
    { titulo: 'Recomendacion',   orden: 2 },
  ],
  ejecutivo: [
    { titulo: 'Mensaje clave',       orden: 0 },
    { titulo: 'Tres hallazgos',      orden: 1 },
    { titulo: 'Decision requerida',  orden: 2 },
  ],
}

export async function GET() {
  return listDomain<DraftDocument>('/api/intelligence/drafts', MOCK_DRAFTS)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      titulo: string; tipo: TipoProducto; clasificacion?: ClasificacionDraft
    }
    const tpl = TEMPLATE[body.tipo] ?? TEMPLATE.memo
    return createInDomain(
 '/api/intelligence/drafts',
      {
        title: body.titulo,
        kind: body.tipo,
        status: 'draft',
        body: '',
        data: { clasificacion: body.clasificacion ?? 'interna', secciones: tpl },
      },
      (): DraftDocument => ({
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
      }),
    )
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
