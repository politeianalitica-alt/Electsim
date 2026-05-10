import type { Canvas, CanvasSnapshot, TipoCanvas } from '@/types/intelligence'
import { MOCK_CANVAS, nowIso } from '../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET(req: Request) {
  const url = new URL(req.url)
  const tipo = url.searchParams.get('tipo') as TipoCanvas | null
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/canvas${url.search}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}
  const items = tipo ? MOCK_CANVAS.filter(c => c.tipo === tipo) : MOCK_CANVAS
  const snap: CanvasSnapshot = { items, total: items.length, generado_en: nowIso() }
  return Response.json(snap)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { tipo: TipoCanvas; titulo: string; descripcion?: string; tags?: string[] }
    const newItem: Canvas = {
      id: `cnv-${Date.now()}`,
      tipo: body.tipo,
      titulo: body.titulo,
      descripcion: body.descripcion,
      tags: body.tags ?? [],
      autor: 'Analista',
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    return Response.json(newItem)
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
