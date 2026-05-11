import type { Notebook } from '@/types/intelligence'
import { listDomain, createInDomain, MOCK_NOTEBOOKS, nowIso } from '../_proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return listDomain<Notebook>(
    '/api/intelligence/notebooks',
    MOCK_NOTEBOOKS.map(n => ({ ...n, blocks: undefined } as Notebook)),
  )
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { titulo: string; tags?: string[] }
    return createInDomain(
      '/api/intelligence/notebooks',
      { title: body.titulo, tags: body.tags ?? [] },
      (): Notebook => ({
        id: `nb-${Date.now()}`,
        titulo: body.titulo,
        estado: 'borrador',
        version: 1,
        tags: body.tags ?? [],
        autor: 'Analista',
        blocks: [],
        created_at: nowIso(),
        updated_at: nowIso(),
      }),
    )
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
