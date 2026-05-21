/**
 * /api/commodities/[slug] · Detalle individual con OHLC.
 *
 * Modo BACKEND: proxy. Modo STANDALONE: Yahoo Finance directo
 * (OHLC últimos 90 días + last_price + change_pct).
 */
import { COMMODITIES_SEED, fetchYahooQuote } from '@/lib/commodities-yahoo-seed'

const BACKEND = process.env.BACKEND_URL ?? ''
export const revalidate = 600

interface YahooChartRow {
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
}

async function fetchYahooOhlc(ticker: string, days = 90): Promise<YahooChartRow[]> {
  const range = days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 180 ? '6mo' : '1y'
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}`
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 7000)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 600 },
    } as RequestInit)
    if (!r.ok) return []
    const j = await r.json() as {
      chart?: {
        result?: Array<{
          timestamp?: number[]
          indicators?: {
            quote?: Array<{
              open?: (number | null)[]
              high?: (number | null)[]
              low?: (number | null)[]
              close?: (number | null)[]
              volume?: (number | null)[]
            }>
          }
        }>
      }
    }
    const res = j?.chart?.result?.[0]
    const ts = res?.timestamp ?? []
    const q = res?.indicators?.quote?.[0]
    if (!ts.length || !q) return []
    const rows: YahooChartRow[] = []
    for (let i = 0; i < ts.length; i++) {
      const date = new Date(ts[i] * 1000).toISOString().slice(0, 10)
      rows.push({
        date,
        open: q.open?.[i] ?? null,
        high: q.high?.[i] ?? null,
        low: q.low?.[i] ?? null,
        close: q.close?.[i] ?? null,
        volume: q.volume?.[i] ?? null,
      })
    }
    return rows
  } catch {
    return []
  } finally {
    clearTimeout(to)
  }
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  // Modo BACKEND
  if (BACKEND) {
    try {
      const res = await fetch(
        `${BACKEND}/api/v1/commodities/${encodeURIComponent(params.slug)}`,
        {
          headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
          next: { revalidate: 600 },
        },
      )
      if (res.ok) return Response.json(await res.json())
      if (res.status === 404) {
        return Response.json({ error: 'no encontrada', slug: params.slug }, { status: 404 })
      }
    } catch {
      // fall through to standalone
    }
  }

  // Modo STANDALONE
  const seed = COMMODITIES_SEED.find((c) => c.slug === params.slug)
  if (!seed) {
    return Response.json({ error: 'no encontrada', slug: params.slug, available: false }, { status: 404 })
  }
  const [quote, ohlc] = await Promise.all([
    fetchYahooQuote(seed.yahoo_ticker),
    fetchYahooOhlc(seed.yahoo_ticker, 90),
  ])
  return Response.json({
    slug: seed.slug,
    name: seed.name,
    unit: seed.unit,
    exchange: seed.exchange,
    ticker: seed.yahoo_ticker,
    currency: quote?.currency ?? seed.currency,
    last_price: quote?.price ?? null,
    prev_close: quote?.previous_close ?? null,
    change_pct: quote?.change_pct ?? null,
    n_obs: ohlc.length,
    ohlc,
    available: !!quote?.price,
  })
}
