import type { Evidencia, EvidenciaSnapshot, EvidenciaDraft, TipoFuente, ClasificacionDraft } from '@/types/intelligence'
import { MOCK_EVIDENCIAS, MOCK_FUENTES, nowIso } from '../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET(req: Request) {
  const url = new URL(req.url)
  const fuente_tipo = url.searchParams.get('fuente_tipo') as TipoFuente | null
  const clasificacion = url.searchParams.get('clasificacion') as ClasificacionDraft | null
  const q = (url.searchParams.get('q') ?? '').toLowerCase().trim()

  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/evidencias${url.search}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {
    // fall through to mock
  }

  let items: Evidencia[] = MOCK_EVIDENCIAS
  if (fuente_tipo) items = items.filter(e => e.fuente_tipo === fuente_tipo)
  if (clasificacion) items = items.filter(e => e.clasificacion === clasificacion)
  if (q) {
    items = items.filter(e =>
      e.titulo.toLowerCase().includes(q) ||
      e.resumen.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q)) ||
      e.entidades.some(t => t.toLowerCase().includes(q))
    )
  }

  const snap: EvidenciaSnapshot = { items, total: items.length, generado_en: nowIso() }
  return Response.json(snap)
}

export async function POST(req: Request) {
  try {
    const draft = (await req.json()) as EvidenciaDraft
    const fuente = MOCK_FUENTES.find(f => f.id === draft.fuente_id) ?? MOCK_FUENTES[0]
    const newItem: Evidencia = {
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
    }
    return Response.json(newItem)
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
