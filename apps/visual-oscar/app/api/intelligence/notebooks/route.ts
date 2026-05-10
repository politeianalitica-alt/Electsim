import type { Notebook, NotebookSnapshot } from '@/types/intelligence'
import { MOCK_NOTEBOOKS, nowIso } from '../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/notebooks`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}
  const items = MOCK_NOTEBOOKS.map(n => ({ ...n, blocks: undefined }))
  const snap: NotebookSnapshot = { items, total: items.length, generado_en: nowIso() }
  return Response.json(snap)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { titulo: string; tags?: string[] }
    const item: Notebook = {
      id: `nb-${Date.now()}`,
      titulo: body.titulo,
      estado: 'borrador',
      version: 1,
      tags: body.tags ?? [],
      autor: 'Analista',
      blocks: [],
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    return Response.json(item)
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
