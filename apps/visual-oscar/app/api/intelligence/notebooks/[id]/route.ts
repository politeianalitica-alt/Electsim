import type { Notebook } from '@/types/intelligence'
import { MOCK_NOTEBOOKS, MOCK_NOTEBOOK_BLOCKS } from '../../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/notebooks/${params.id}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}
  const found = MOCK_NOTEBOOKS.find(n => n.id === params.id) ?? MOCK_NOTEBOOKS[0]
  const blocks = MOCK_NOTEBOOK_BLOCKS.filter(b => b.notebook_id === found.id)
  const item: Notebook = { ...found, blocks }
  return Response.json(item)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const patch = (await req.json()) as Partial<Notebook>
    const base = MOCK_NOTEBOOKS.find(n => n.id === params.id) ?? MOCK_NOTEBOOKS[0]
    return Response.json({ ...base, ...patch, id: base.id })
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
