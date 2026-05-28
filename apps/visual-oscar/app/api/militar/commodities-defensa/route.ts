/**
 * /api/militar/commodities-defensa · Sprint GEO-MIL C4
 *
 * 6 commodities críticos para defensa con cotización (placeholder) y
 * proveedores dominantes. Para los que tengan alpha_vantage_symbol,
 * podríamos fetch live · por simplicidad sólo paladio (XPD).
 *
 * Cache: s-maxage=3600 (1h · precios commodities).
 */
import { NextResponse } from 'next/server'
import { DEFENSE_COMMODITIES } from '@/lib/geopolitica/defense-commodities'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

interface CommodityWithPrice {
  id: string
  name_es: string
  hs_code: string
  use_military: string
  dominant_suppliers: string[]
  alpha_vantage_symbol: string | null
  eu_strategic_reserve: boolean
  severity_eu: number
  notes: string
  spot_price_usd: number | null
  spot_currency: string | null
  spot_unit: string | null
  source: string
}

async function fetchPalladiumSpot(): Promise<{ price: number; unit: string } | null> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY
  if (!apiKey) return null
  try {
    const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XPD&to_currency=USD&apikey=${apiKey}`
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const r = await fetch(url, { signal: ctrl.signal, next: { revalidate: 3600 } })
    clearTimeout(t)
    if (!r.ok) return null
    const json: any = await r.json()
    const rate = Number(json['Realtime Currency Exchange Rate']?.['5. Exchange Rate'])
    if (!isFinite(rate)) return null
    return { price: rate, unit: 'USD/oz' }
  } catch {
    return null
  }
}

export async function GET() {
  const startedAt = new Date().toISOString()

  // Solo paladio tiene Alpha Vantage symbol · fetch en paralelo
  const palladium = await fetchPalladiumSpot().catch(() => null)

  const commodities: CommodityWithPrice[] = DEFENSE_COMMODITIES.map((c) => {
    let price: number | null = null
    let unit: string | null = null
    let source = 'sin cotización · pendiente Nasdaq Data Link (premium)'
    if (c.alpha_vantage_symbol === 'XPD' && palladium) {
      price = palladium.price
      unit = palladium.unit
      source = 'Alpha Vantage Currency XPD/USD live'
    }
    return {
      ...c,
      spot_price_usd: price,
      spot_currency: price !== null ? 'USD' : null,
      spot_unit: unit,
      source,
    }
  })

  return NextResponse.json({
    ok: true,
    commodities,
    summary: {
      total: commodities.length,
      with_live_price: commodities.filter((c) => c.spot_price_usd !== null).length,
      high_severity_eu: commodities.filter((c) => c.severity_eu === 3).length,
    },
    fetched_at: startedAt,
    _meta: {
      sources: ['Dataset curado USGS Mineral Commodity Summaries 2024', 'Alpha Vantage spot XPD/USD'],
      pending: ['Nasdaq Data Link · titanio/cobalto/wolframio/REE/germanio (premium)'],
      cache_ttl_seconds: 3600,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=10800' },
  })
}
