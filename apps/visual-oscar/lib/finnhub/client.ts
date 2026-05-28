/**
 * Cliente Finnhub · cotizaciones bursátiles + datos macro
 *
 * https://finnhub.io/docs/api
 * Auth: header `X-Finnhub-Token: $FINNHUB_API_KEY`
 *
 * Endpoints útiles para Tab 3/4:
 *   GET /quote?symbol=XXX         · cotización + variación diaria
 *   GET /stock/profile2?symbol=X  · perfil empresa (industry, marketCap)
 *   GET /stock/peers?symbol=XXX   · empresas comparables
 *   GET /forex/rates?base=USD     · tipos de cambio
 *   GET /bond/yield-curve?country=USA · curva tipos soberanos (premium · skip)
 *
 * Si FINNHUB_API_KEY no está → empty state honesto.
 * Cache: 5 min cotizaciones, 1h perfiles.
 */

const FINNHUB_BASE = 'https://finnhub.io/api/v1'
const DEFAULT_TIMEOUT_MS = 8000

export interface FinnhubQuote {
  symbol: string
  current_price: number
  change: number
  percent_change: number
  high_day: number
  low_day: number
  open: number
  prev_close: number
  timestamp: number
}

export interface FinnhubResponse<T> {
  ok: boolean
  data?: T
  error?: string
  fetched_at: string
}

async function fetchFinnhub<T>(path: string, apiKey: string): Promise<T | null> {
  const url = `${FINNHUB_BASE}${path}${path.includes('?') ? '&' : '?'}token=${apiKey}`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'X-Finnhub-Token': apiKey },
      next: { revalidate: 300 },
    })
    clearTimeout(t)
    if (!r.ok) return null
    return await r.json() as T
  } catch {
    clearTimeout(t)
    return null
  }
}

/** Cotización spot de un símbolo (acción, ETF, FX). */
export async function getQuote(symbol: string): Promise<FinnhubResponse<FinnhubQuote>> {
  const startedAt = new Date().toISOString()
  const apiKey = process.env.FINNHUB_API_KEY || ''
  if (!apiKey) {
    return { ok: false, error: 'no_key', fetched_at: startedAt }
  }
  const raw = await fetchFinnhub<any>(`/quote?symbol=${encodeURIComponent(symbol)}`, apiKey)
  if (!raw || typeof raw.c !== 'number') {
    return { ok: false, error: 'no_quote', fetched_at: startedAt }
  }
  return {
    ok: true,
    data: {
      symbol,
      current_price: raw.c,
      change: raw.d || 0,
      percent_change: raw.dp || 0,
      high_day: raw.h || 0,
      low_day: raw.l || 0,
      open: raw.o || 0,
      prev_close: raw.pc || 0,
      timestamp: raw.t || 0,
    },
    fetched_at: startedAt,
  }
}

/**
 * Batch de cotizaciones · serie de N símbolos en paralelo.
 * Finnhub free tier: 60 req/min, suficiente para batches de 30-40.
 */
export async function getQuotesBatch(symbols: string[]): Promise<Record<string, FinnhubQuote | null>> {
  const apiKey = process.env.FINNHUB_API_KEY || ''
  if (!apiKey) {
    const result: Record<string, FinnhubQuote | null> = {}
    for (const s of symbols) result[s] = null
    return result
  }
  const results = await Promise.all(symbols.map(async (s) => {
    const r = await getQuote(s)
    return [s, r.ok ? r.data! : null] as const
  }))
  return Object.fromEntries(results)
}

/** Componente del IRPC: estrés soberano · placeholder hasta tener CDS reales. */
export function sovereignStressFromQuote(_quote: FinnhubQuote | null): number {
  // Sin CDS bonds endpoint (premium Finnhub), devolvemos 50 neutral.
  // Cuando se contrate, calcular: CDS_5Y > 400pb → 80, >800pb → 100
  return 50
}
