/**
 * Cliente Yahoo Finance · precios commodities agrícolas · Politeia Agro v3
 *
 * Yahoo Finance expone una API pública no documentada formalmente
 * (`https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`) que
 * devuelve OHLC + último precio + variación. No requiere auth y es la
 * fuente que ya usan los Vesper sprints internos.
 *
 * Pedimos sólo lo mínimo (rango 5d, intervalo 1d) por velocidad. Si Yahoo
 * devuelve error o el ticker no existe, marcamos el producto como sin
 * cotización · NUNCA inventamos valores.
 */

const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'
const BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

export interface YahooQuoteSnapshot {
  /** Símbolo Yahoo (ej "ZW=F"). */
  symbol: string
  /** Último precio. */
  price: number | null
  /** Cierre del día anterior. */
  previous_close: number | null
  /** Cambio absoluto. */
  change: number | null
  /** Cambio porcentual (%). */
  change_pct: number | null
  /** Moneda devuelta por Yahoo (USD, EUR, GBp …). */
  currency: string | null
  /** Timestamp del último precio (epoch ms). */
  ts: number | null
  /** Mini-serie de cierres recientes (para sparkline). */
  spark: number[]
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number
        previousClose?: number
        chartPreviousClose?: number
        currency?: string
        regularMarketTime?: number
      }
      timestamp?: number[]
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>
      }
    }>
    error?: { code?: string; description?: string } | null
  }
}

/**
 * Captura snapshot de un ticker Yahoo. Devuelve `null` si no se puede
 * resolver (timeout, 4xx, payload vacío). El caller debe decidir si
 * muestra el producto sin precio o lo oculta.
 */
export async function fetchYahooSnapshot(
  symbol: string,
  timeoutMs = 6000
): Promise<YahooQuoteSnapshot | null> {
  const params = new URLSearchParams({ range: '5d', interval: '1d' })
  const url = `${BASE}/${encodeURIComponent(symbol)}?${params.toString()}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 600 }, // 10 min
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const txt = await res.text()
    if (!txt || txt.length < 20) return null
    const data = JSON.parse(txt) as YahooChartResponse
    if (data.chart?.error) return null
    const r = data.chart?.result?.[0]
    if (!r) return null
    const meta = r.meta || {}
    const closes = (r.indicators?.quote?.[0]?.close || []).filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v)
    )
    const price = meta.regularMarketPrice ?? closes[closes.length - 1] ?? null
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? closes[closes.length - 2] ?? null
    const change = price != null && prev != null ? Number((price - prev).toFixed(4)) : null
    const change_pct = price != null && prev != null && prev !== 0
      ? Number((((price - prev) / prev) * 100).toFixed(2))
      : null
    return {
      symbol,
      price,
      previous_close: prev,
      change,
      change_pct,
      currency: meta.currency ?? null,
      ts: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
      spark: closes.slice(-5),
    }
  } catch {
    clearTimeout(timer)
    return null
  }
}

/**
 * Captura un grupo de snapshots en paralelo.
 * Mantiene el orden de los símbolos solicitados; los fallos quedan como
 * `null` para que la UI los marque como "sin cotización".
 */
export async function fetchYahooSnapshots(
  symbols: string[],
  timeoutMs = 6000
): Promise<Array<{ symbol: string; snapshot: YahooQuoteSnapshot | null }>> {
  const uniq = Array.from(new Set(symbols.filter(Boolean)))
  const results = await Promise.all(
    uniq.map(async (s) => ({ symbol: s, snapshot: await fetchYahooSnapshot(s, timeoutMs) }))
  )
  return results
}

// ─── OHLC histórico (para drill-down candlestick) ────────────────────────

/** Punto OHLC compatible con components/commodities/OHLCChart.tsx (types/commodities OHLCPoint). */
export interface OHLCBar {
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
}

interface YahooOHLCResponse {
  chart?: {
    result?: Array<{
      meta?: { currency?: string }
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>
          high?: Array<number | null>
          low?: Array<number | null>
          close?: Array<number | null>
          volume?: Array<number | null>
        }>
      }
    }>
    error?: { code?: string; description?: string } | null
  }
}

/**
 * Serie OHLC histórica completa de un ticker Yahoo. range/interval siguen la
 * convención Yahoo (range: 1mo|3mo|6mo|1y|2y|5y · interval: 1d|1wk|1mo).
 * Devuelve `null` si falla; el caller degrada honestamente (sin candlestick).
 */
export async function fetchYahooOHLC(
  symbol: string,
  range = '1y',
  interval = '1d',
  timeoutMs = 8000
): Promise<{ bars: OHLCBar[]; currency: string | null } | null> {
  const params = new URLSearchParams({ range, interval })
  const url = `${BASE}/${encodeURIComponent(symbol)}?${params.toString()}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 1800 }, // 30 min
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const txt = await res.text()
    if (!txt || txt.length < 20) return null
    const data = JSON.parse(txt) as YahooOHLCResponse
    if (data.chart?.error) return null
    const r = data.chart?.result?.[0]
    if (!r || !r.timestamp) return null
    const ts = r.timestamp
    const q = r.indicators?.quote?.[0]
    if (!q) return null
    const bars: OHLCBar[] = ts.map((t, i) => ({
      date: new Date(t * 1000).toISOString().slice(0, 10),
      open: numOrNull(q.open?.[i]),
      high: numOrNull(q.high?.[i]),
      low: numOrNull(q.low?.[i]),
      close: numOrNull(q.close?.[i]),
      volume: numOrNull(q.volume?.[i]),
    })).filter((b) => b.close != null)
    return { bars, currency: r.meta?.currency ?? null }
  } catch {
    clearTimeout(timer)
    return null
  }
}

function numOrNull(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
