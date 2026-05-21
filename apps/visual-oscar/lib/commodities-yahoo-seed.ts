/**
 * Catálogo standalone de commodities para modo serverless (sin backend
 * Python). 40 contratos futuros principales con tickers Yahoo Finance
 * directos. Fallback cuando BACKEND_URL no está configurado.
 *
 * Yahoo Finance endpoint público (no oficial pero estable):
 *   https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=5d
 */

export interface CommoditySeed {
  slug: string
  name: string
  yahoo_ticker: string
  category: 'energy' | 'metals' | 'grains' | 'softs' | 'meat' | 'freight' | 'rates'
  unit: string
  currency: string
  exchange: string
  description: string
  spain_relevance: 'high' | 'medium' | 'low'
}

export const COMMODITIES_SEED: CommoditySeed[] = [
  // ─── Energía ─────────────────────────────────────────────────────
  {
    slug: 'crude-oil-wti', name: 'WTI Crude Oil', yahoo_ticker: 'CL=F',
    category: 'energy', unit: 'USD/barrel', currency: 'USD', exchange: 'NYMEX',
    description: 'West Texas Intermediate · benchmark de petróleo USA.',
    spain_relevance: 'high',
  },
  {
    slug: 'crude-oil-brent', name: 'Brent Crude Oil', yahoo_ticker: 'BZ=F',
    category: 'energy', unit: 'USD/barrel', currency: 'USD', exchange: 'ICE',
    description: 'Brent · benchmark europeo, referencia para Repsol/Cepsa.',
    spain_relevance: 'high',
  },
  {
    slug: 'natural-gas-henryhub', name: 'Natural Gas (Henry Hub)', yahoo_ticker: 'NG=F',
    category: 'energy', unit: 'USD/MMBtu', currency: 'USD', exchange: 'NYMEX',
    description: 'Gas natural USA · benchmark global de gas.',
    spain_relevance: 'high',
  },
  {
    slug: 'heating-oil', name: 'Heating Oil', yahoo_ticker: 'HO=F',
    category: 'energy', unit: 'USD/gallon', currency: 'USD', exchange: 'NYMEX',
    description: 'Diesel + calefacción · proxy de gasoil España.',
    spain_relevance: 'high',
  },
  {
    slug: 'rbob-gasoline', name: 'RBOB Gasoline', yahoo_ticker: 'RB=F',
    category: 'energy', unit: 'USD/gallon', currency: 'USD', exchange: 'NYMEX',
    description: 'Gasolina sin plomo · referencia para precios surtidor.',
    spain_relevance: 'high',
  },
  {
    slug: 'eu-carbon', name: 'EU Carbon Allowances (CO₂)', yahoo_ticker: 'KRBN',
    category: 'energy', unit: 'EUR/tCO₂', currency: 'EUR', exchange: 'ICE EUA',
    description: 'EU ETS · derechos CO₂. Impacto sectores intensivos ES.',
    spain_relevance: 'high',
  },

  // ─── Metales ─────────────────────────────────────────────────────
  {
    slug: 'gold', name: 'Gold', yahoo_ticker: 'GC=F',
    category: 'metals', unit: 'USD/oz', currency: 'USD', exchange: 'COMEX',
    description: 'Oro · refugio en crisis + reservas BCE.',
    spain_relevance: 'high',
  },
  {
    slug: 'silver', name: 'Silver', yahoo_ticker: 'SI=F',
    category: 'metals', unit: 'USD/oz', currency: 'USD', exchange: 'COMEX',
    description: 'Plata · industrial + monetario.',
    spain_relevance: 'medium',
  },
  {
    slug: 'copper', name: 'Copper', yahoo_ticker: 'HG=F',
    category: 'metals', unit: 'USD/lb', currency: 'USD', exchange: 'COMEX',
    description: 'Cobre · "Dr. Copper" termómetro económico mundial.',
    spain_relevance: 'high',
  },
  {
    slug: 'platinum', name: 'Platinum', yahoo_ticker: 'PL=F',
    category: 'metals', unit: 'USD/oz', currency: 'USD', exchange: 'NYMEX',
    description: 'Platino · catalizadores diésel + joyería.',
    spain_relevance: 'medium',
  },
  {
    slug: 'palladium', name: 'Palladium', yahoo_ticker: 'PA=F',
    category: 'metals', unit: 'USD/oz', currency: 'USD', exchange: 'NYMEX',
    description: 'Paladio · catalizadores gasolina.',
    spain_relevance: 'low',
  },
  {
    slug: 'aluminum', name: 'Aluminum', yahoo_ticker: 'ALI=F',
    category: 'metals', unit: 'USD/MT', currency: 'USD', exchange: 'CME',
    description: 'Aluminio · LME proxy.',
    spain_relevance: 'medium',
  },

  // ─── Granos ──────────────────────────────────────────────────────
  {
    slug: 'wheat', name: 'Wheat', yahoo_ticker: 'ZW=F',
    category: 'grains', unit: 'cents/bushel', currency: 'USD', exchange: 'CBOT',
    description: 'Trigo · CBOT. Crítico tras invasión Ucrania.',
    spain_relevance: 'high',
  },
  {
    slug: 'corn', name: 'Corn', yahoo_ticker: 'ZC=F',
    category: 'grains', unit: 'cents/bushel', currency: 'USD', exchange: 'CBOT',
    description: 'Maíz · pienso ganadería + etanol.',
    spain_relevance: 'high',
  },
  {
    slug: 'soybeans', name: 'Soybeans', yahoo_ticker: 'ZS=F',
    category: 'grains', unit: 'cents/bushel', currency: 'USD', exchange: 'CBOT',
    description: 'Soja · piensos + biodiésel.',
    spain_relevance: 'high',
  },
  {
    slug: 'soybean-meal', name: 'Soybean Meal', yahoo_ticker: 'ZM=F',
    category: 'grains', unit: 'USD/short ton', currency: 'USD', exchange: 'CBOT',
    description: 'Harina soja · pienso porcino España.',
    spain_relevance: 'high',
  },
  {
    slug: 'soybean-oil', name: 'Soybean Oil', yahoo_ticker: 'ZL=F',
    category: 'grains', unit: 'cents/lb', currency: 'USD', exchange: 'CBOT',
    description: 'Aceite soja · biodiésel + alimentación.',
    spain_relevance: 'medium',
  },
  {
    slug: 'oats', name: 'Oats', yahoo_ticker: 'ZO=F',
    category: 'grains', unit: 'cents/bushel', currency: 'USD', exchange: 'CBOT',
    description: 'Avena · pienso secundario.',
    spain_relevance: 'low',
  },
  {
    slug: 'rough-rice', name: 'Rough Rice', yahoo_ticker: 'ZR=F',
    category: 'grains', unit: 'USD/cwt', currency: 'USD', exchange: 'CBOT',
    description: 'Arroz · staple global.',
    spain_relevance: 'medium',
  },

  // ─── Softs ───────────────────────────────────────────────────────
  {
    slug: 'coffee', name: 'Coffee (Arabica)', yahoo_ticker: 'KC=F',
    category: 'softs', unit: 'cents/lb', currency: 'USD', exchange: 'ICE',
    description: 'Café arábica · ICE NY.',
    spain_relevance: 'medium',
  },
  {
    slug: 'sugar', name: 'Sugar #11', yahoo_ticker: 'SB=F',
    category: 'softs', unit: 'cents/lb', currency: 'USD', exchange: 'ICE',
    description: 'Azúcar crudo · benchmark mundial.',
    spain_relevance: 'medium',
  },
  {
    slug: 'cocoa', name: 'Cocoa', yahoo_ticker: 'CC=F',
    category: 'softs', unit: 'USD/MT', currency: 'USD', exchange: 'ICE',
    description: 'Cacao · ICE NY. Volatil 2024+.',
    spain_relevance: 'medium',
  },
  {
    slug: 'cotton', name: 'Cotton #2', yahoo_ticker: 'CT=F',
    category: 'softs', unit: 'cents/lb', currency: 'USD', exchange: 'ICE',
    description: 'Algodón · textiles.',
    spain_relevance: 'low',
  },
  {
    slug: 'orange-juice', name: 'Orange Juice', yahoo_ticker: 'OJ=F',
    category: 'softs', unit: 'cents/lb', currency: 'USD', exchange: 'ICE',
    description: 'Zumo naranja · competencia Florida↔Valencia.',
    spain_relevance: 'medium',
  },
  {
    slug: 'lumber', name: 'Lumber', yahoo_ticker: 'LBR=F',
    category: 'softs', unit: 'USD/1000 board feet', currency: 'USD', exchange: 'CME',
    description: 'Madera · construcción.',
    spain_relevance: 'low',
  },

  // ─── Carne ───────────────────────────────────────────────────────
  {
    slug: 'live-cattle', name: 'Live Cattle', yahoo_ticker: 'LE=F',
    category: 'meat', unit: 'cents/lb', currency: 'USD', exchange: 'CME',
    description: 'Vacuno vivo · benchmark mundial.',
    spain_relevance: 'medium',
  },
  {
    slug: 'feeder-cattle', name: 'Feeder Cattle', yahoo_ticker: 'GF=F',
    category: 'meat', unit: 'cents/lb', currency: 'USD', exchange: 'CME',
    description: 'Vacuno engorde.',
    spain_relevance: 'low',
  },
  {
    slug: 'lean-hogs', name: 'Lean Hogs', yahoo_ticker: 'HE=F',
    category: 'meat', unit: 'cents/lb', currency: 'USD', exchange: 'CME',
    description: 'Porcino · España 2º exportador mundial.',
    spain_relevance: 'high',
  },

  // ─── Fletes ──────────────────────────────────────────────────────
  {
    slug: 'baltic-dry', name: 'Baltic Dry Index', yahoo_ticker: '^BDI',
    category: 'freight', unit: 'index', currency: 'USD', exchange: 'Baltic',
    description: 'BDI · coste flete granel sólido. Termómetro comercio mundial.',
    spain_relevance: 'high',
  },

  // ─── Tipos de interés y FX (proxies) ────────────────────────────
  {
    slug: 'us-10y', name: 'US 10Y Treasury Yield', yahoo_ticker: '^TNX',
    category: 'rates', unit: '%', currency: 'USD', exchange: 'CBOE',
    description: 'Tipo USA 10Y · referencia global.',
    spain_relevance: 'high',
  },
  {
    slug: 'eur-usd', name: 'EUR/USD', yahoo_ticker: 'EURUSD=X',
    category: 'rates', unit: 'rate', currency: 'USD', exchange: 'FX',
    description: 'Cambio EUR/USD · impacto exports España.',
    spain_relevance: 'high',
  },
  {
    slug: 'dxy', name: 'US Dollar Index (DXY)', yahoo_ticker: 'DX-Y.NYB',
    category: 'rates', unit: 'index', currency: 'USD', exchange: 'ICE',
    description: 'Índice dólar · proxy commodities.',
    spain_relevance: 'high',
  },
]

// ─── Yahoo Finance fetch ─────────────────────────────────────────
interface YahooMeta {
  regularMarketPrice?: number
  previousClose?: number
  chartPreviousClose?: number
  currency?: string
  symbol?: string
  marketState?: string
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
}

export interface YahooQuote {
  ticker: string
  price: number | null
  previous_close: number | null
  change_abs: number | null
  change_pct: number | null
  currency: string
  fifty_two_week_high?: number | null
  fifty_two_week_low?: number | null
  market_state: string | null
  fetched_at: string
}

const _quoteCache: Map<string, { ts: number; data: YahooQuote }> = new Map()
const TTL_MS = 5 * 60 * 1000 // 5 min

export async function fetchYahooQuote(ticker: string): Promise<YahooQuote | null> {
  const cached = _quoteCache.get(ticker)
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.data
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`
  const controller = new AbortController()
  const to = setTimeout(() => controller.abort(), 6000)
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 },
    } as RequestInit)
    if (!r.ok) return null
    const j = await r.json() as { chart?: { result?: Array<{ meta?: YahooMeta }> } }
    const meta = j?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice
    const abs = meta.regularMarketPrice - prev
    const pct = prev > 0 ? (abs / prev) * 100 : 0
    const q: YahooQuote = {
      ticker,
      price: meta.regularMarketPrice,
      previous_close: prev,
      change_abs: +abs.toFixed(4),
      change_pct: +pct.toFixed(2),
      currency: meta.currency ?? 'USD',
      fifty_two_week_high: meta.fiftyTwoWeekHigh ?? null,
      fifty_two_week_low: meta.fiftyTwoWeekLow ?? null,
      market_state: meta.marketState ?? null,
      fetched_at: new Date().toISOString(),
    }
    _quoteCache.set(ticker, { ts: Date.now(), data: q })
    return q
  } catch {
    return null
  } finally {
    clearTimeout(to)
  }
}

export async function fetchYahooQuotesBulk(tickers: string[]): Promise<Record<string, YahooQuote>> {
  const results = await Promise.allSettled(tickers.map((t) => fetchYahooQuote(t)))
  const out: Record<string, YahooQuote> = {}
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) out[tickers[i]] = r.value
  })
  return out
}
