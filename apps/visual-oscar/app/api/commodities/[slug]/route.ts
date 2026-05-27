/**
 * /api/commodities/[slug] · Detalle individual con OHLC.
 *
 * Modo BACKEND: proxy. Modo STANDALONE: Yahoo Finance directo
 * (OHLC últimos 90 días + last_price + change_pct).
 *
 * Sprint Nasdaq-Wire · para los slugs con fixing oficial disponible
 * (gold, silver, crude-oil-brent), intentamos primero Nasdaq Data Link
 * (LBMA/GOLD, LBMA/SILVER, OPEC/ORB) que son precios DE REFERENCIA
 * oficiales del mercado. Si Nasdaq falla (sin key, sin datos), caemos
 * a Yahoo Finance como fallback. El response incluye `source` para que
 * la UI pueda mostrar la trazabilidad.
 */
import { COMMODITIES_SEED, fetchYahooQuote } from '@/lib/commodities-yahoo-seed'
import { fetchNasdaqDataset } from '@/lib/nasdaq/data-link'

// Sprint Nasdaq-Wire · slug → dataset Nasdaq oficial (cuando existe)
const NASDAQ_OVERRIDES: Record<string, { db: string; ds: string; label: string }> = {
  'gold': {
    db: 'LBMA', ds: 'GOLD',
    label: 'LBMA Gold Fixing London AM (oficial)',
  },
  'silver': {
    db: 'LBMA', ds: 'SILVER',
    label: 'LBMA Silver Fixing London (oficial)',
  },
  'crude-oil-brent': {
    db: 'OPEC', ds: 'ORB',
    label: 'OPEC Reference Basket (cesta oficial OPEP, mejor proxy de Brent que Yahoo BZ=F)',
  },
}

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

  // ── Sprint Nasdaq-Wire · intentar fixing oficial Nasdaq primero
  // (solo para slugs con override · si falla cae a Yahoo abajo).
  const override = NASDAQ_OVERRIDES[seed.slug]
  if (override) {
    const ndl = await fetchNasdaqDataset({
      database: override.db,
      dataset: override.ds,
      rows: 90,
      order: 'desc',
    })
    if (ndl.ok && ndl.points.length > 0) {
      const latest = ndl.points[0]
      const prev = ndl.points[1]
      const change_pct = (latest && prev && prev.value !== 0)
        ? ((latest.value - prev.value) / Math.abs(prev.value)) * 100
        : null
      // Mapear puntos Nasdaq a shape OHLC compatible con el cliente actual
      // (Nasdaq da serie close-only · open/high/low/volume vienen null).
      const ohlc = ndl.points.map((p) => ({
        date: p.date,
        open: null,
        high: null,
        low: null,
        close: p.value,
        volume: null,
      })).reverse()   // cronológico ascendente para gráficos
      return Response.json({
        slug: seed.slug,
        name: seed.name,
        unit: seed.unit,
        exchange: seed.exchange,
        ticker: `${override.db}/${override.ds}`,
        currency: seed.currency,
        last_price: latest?.value ?? null,
        prev_close: prev?.value ?? null,
        change_pct: change_pct !== null ? Math.round(change_pct * 100) / 100 : null,
        n_obs: ohlc.length,
        ohlc,
        available: true,
        source: 'nasdaq_data_link',
        source_label: override.label,
        source_url: ndl.source_url,
        nasdaq_fallback_from: 'yahoo_finance',
      })
    }
    // ndl falló (no_key o sin datos) · seguimos a Yahoo
  }

  // ── Fallback Yahoo Finance (comportamiento original)
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
    source: 'yahoo_finance',
    source_label: `Yahoo Finance · ${seed.yahoo_ticker} (${seed.exchange})`,
    // Si hay override pero no entró, indicamos por qué (debugging)
    nasdaq_attempted: override ? `${override.db}/${override.ds}` : undefined,
    nasdaq_skipped_reason: override ? 'sin_key_o_sin_datos' : undefined,
  })
}
