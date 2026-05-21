/**
 * /api/commodities/snapshot-all · Snapshot live de todos los commodities.
 *
 * Modo BACKEND: si BACKEND_URL está configurado, proxy al FastAPI Python.
 * Modo STANDALONE (default Vercel): catálogo seed + Yahoo Finance directo
 *   ~33 contratos · energy/metals/grains/softs/meat/freight/rates.
 */
import type { SnapshotAllResponse, CommoditySnapshot } from '@/types/commodities'
import { COMMODITIES_SEED, fetchYahooQuotesBulk } from '@/lib/commodities-yahoo-seed'

const BACKEND = process.env.BACKEND_URL ?? ''
export const revalidate = 300 // 5 min

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') ?? '40', 10)

  // Modo BACKEND si disponible
  if (BACKEND) {
    const qs = new URLSearchParams()
    if (category) qs.set('category', category)
    qs.set('limit', String(limit))
    try {
      const res = await fetch(
        `${BACKEND}/api/v1/commodities/snapshot-all?${qs.toString()}`,
        {
          headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
          next: { revalidate: 300 },
        },
      )
      if (res.ok) return Response.json(await res.json())
    } catch {
      // fall through to standalone
    }
  }

  // Modo STANDALONE · Yahoo Finance directo
  let seed = COMMODITIES_SEED
  if (category) seed = seed.filter((c) => c.category === category)
  seed = seed.slice(0, limit)

  const tickers = seed.map((c) => c.yahoo_ticker).filter(Boolean)
  const quotes = await fetchYahooQuotesBulk(tickers)

  const items: CommoditySnapshot[] = seed.map((c) => {
    const q = quotes[c.yahoo_ticker]
    return {
      slug: c.slug,
      name: c.name,
      // Cast: el seed tiene 'rates' que no está en el backend type pero el
      // componente UI fallback gestiona categoría desconocida.
      category: c.category as CommoditySnapshot['category'],
      yahoo_ticker: c.yahoo_ticker,
      unit: c.unit,
      exchange: c.exchange,
      description: c.description,
      last_price: q?.price ?? null,
      change_pct: q?.change_pct ?? null,
      currency: q?.currency ?? c.currency,
      as_of: q?.fetched_at ?? null,
      available: !!q?.price,
    }
  })

  const payload: SnapshotAllResponse = {
    n_items: items.length,
    items,
    fetched_at: new Date().toISOString(),
  }
  return Response.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
