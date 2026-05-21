import type { Canvas, TipoCanvas } from '@/types/intelligence'
import { listDomain, createInDomain, MOCK_CANVAS, nowIso } from '../_proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const tipo = url.searchParams.get('tipo') as TipoCanvas | null
  const items = tipo ? MOCK_CANVAS.filter(c => c.tipo === tipo) : MOCK_CANVAS
  return listDomain<Canvas>('/api/intelligence/canvas', items)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { tipo: TipoCanvas; titulo: string; descripcion?: string; tags?: string[] }
    return createInDomain(
 '/api/intelligence/canvas',
      { title: body.titulo, description: body.descripcion, data: { tipo: body.tipo, tags: body.tags ?? [] } },
      (): Canvas => ({
        id: `cnv-${Date.now()}`,
        tipo: body.tipo,
        titulo: body.titulo,
        descripcion: body.descripcion,
        tags: body.tags ?? [],
        autor: 'Analista',
        created_at: nowIso(),
        updated_at: nowIso(),
      }),
    )
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
