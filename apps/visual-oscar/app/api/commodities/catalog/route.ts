/**
 * /api/commodities/catalog · Catálogo de commodities.
 *
 * Modo BACKEND: proxy al FastAPI Python si BACKEND_URL configurado.
 * Modo STANDALONE: catálogo seed con 33 contratos (Yahoo tickers).
 */
import type { Commodity } from '@/types/commodities'
import { COMMODITIES_SEED } from '@/lib/commodities-yahoo-seed'

const BACKEND = process.env.BACKEND_URL ?? ''
export const revalidate = 3600

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const qs = category ? `?category=${encodeURIComponent(category)}` : ''

  if (BACKEND) {
    try {
      const res = await fetch(`${BACKEND}/api/v1/commodities/catalog${qs}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 3600 },
      })
      if (res.ok) return Response.json(await res.json())
    } catch {
      // fall through to standalone
    }
  }

  // Modo STANDALONE
  let seed = COMMODITIES_SEED
  if (category) seed = seed.filter((c) => c.category === category)
  const items: Commodity[] = seed.map((c) => ({
    slug: c.slug,
    name: c.name,
    category: c.category as Commodity['category'],
    yahoo_ticker: c.yahoo_ticker,
    unit: c.unit,
    exchange: c.exchange,
    description: c.description,
  }))
  return Response.json({ n_items: items.length, items })
}
