import type { SnapshotAllResponse } from '@/types/commodities'

const BACKEND = process.env.BACKEND_URL ?? ''
// Snapshot live · ISR 30 min para no machacar Yahoo Finance
export const revalidate = 1800

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const limit = searchParams.get('limit') ?? '40'
  const qs = new URLSearchParams()
  if (category) qs.set('category', category)
  qs.set('limit', limit)

  try {
    if (BACKEND) {
      const res = await fetch(
        `${BACKEND}/api/v1/commodities/snapshot-all?${qs.toString()}`,
        {
          headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
          next: { revalidate: 1800 },
        },
      )
      if (res.ok) return Response.json(await res.json())
    }
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 })
  }

  const empty: SnapshotAllResponse = {
    n_items: 0,
    items: [],
    fetched_at: new Date().toISOString(),
  }
  return Response.json(empty)
}
