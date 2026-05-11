import type { Evidencia, EvidenciaDraft, TipoFuente, ClasificacionDraft } from '@/types/intelligence'
import { listDomain, createInDomain, MOCK_EVIDENCIAS, MOCK_FUENTES, nowIso } from '../_proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const fuente_tipo = url.searchParams.get('fuente_tipo') as TipoFuente | null
  const clasificacion = url.searchParams.get('clasificacion') as ClasificacionDraft | null
  const q = (url.searchParams.get('q') ?? '').toLowerCase().trim()

  let items: Evidencia[] = MOCK_EVIDENCIAS
  if (fuente_tipo) items = items.filter(e => e.fuente_tipo === fuente_tipo)
  if (clasificacion) items = items.filter(e => e.clasificacion === clasificacion)
  if (q) {
    items = items.filter(e =>
      e.titulo.toLowerCase().includes(q) ||
      e.resumen.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q)) ||
      e.entidades.some(t => t.toLowerCase().includes(q)),
    )
  }
  return listDomain<Evidencia>('/api/intelligence/evidencias', items)
}

export async function POST(req: Request) {
  try {
    const draft = (await req.json()) as EvidenciaDraft
    const fuente = MOCK_FUENTES.find(f => f.id === draft.fuente_id) ?? MOCK_FUENTES[0]
    return createInDomain(
      '/api/intelligence/evidencias',
      {
        title: draft.titulo,
        summary: draft.resumen,
        url: draft.url,
        source: fuente.nombre,
        evidence_type: fuente.tipo,
        relevance: 0.6,
        tags: draft.tags ?? [],
        data: {
          fuente_id: fuente.id,
          credibilidad: draft.credibilidad,
          confianza: draft.confianza,
          clasificacion: draft.clasificacion,
          entidades: draft.entidades ?? [],
        },
      },
      (): Evidencia => ({
        id: `ev-${Date.now()}`,
        titulo: draft.titulo,
        resumen: draft.resumen,
        contenido: draft.contenido,
        url: draft.url,
        fuente_id: fuente.id,
        fuente_nombre: fuente.nombre,
        fuente_tipo: fuente.tipo,
        credibilidad: draft.credibilidad,
        confianza: draft.confianza,
        clasificacion: draft.clasificacion,
        tags: draft.tags ?? [],
        entidades: draft.entidades ?? [],
        fecha_ingestion: nowIso(),
      }),
    )
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
