import type { Commodity } from '@/types/commodities'

const BACKEND = process.env.BACKEND_URL ?? ''
export const revalidate = 3600

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const qs = category ? `?category=${encodeURIComponent(category)}` : ''

  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/commodities/catalog${qs}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 3600 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch (e) {
    return Response.json({ error: String(e), n_items: 0, items: [] }, { status: 502 })
  }

  // Fallback vacío para que la UI no rompa
  const empty: { n_items: number; items: Commodity[] } = { n_items: 0, items: [] }
  return Response.json(empty)
}
