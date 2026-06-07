/**
 * Cliente de commodities energía con SERIES · Sprint Energía S7.
 *
 * Extiende el patrón commodities existente (`lib/commodities-yahoo-seed.ts`,
 * `lib/nasdaq/data-link.ts`) para energía con series históricas (30-90 días),
 * no solo spot. Cubre: Brent, WTI, cesta OPEP (ORB), Henry Hub, TTF (si hay
 * fuente), gasolina y diésel/heating oil.
 *
 * Fuentes en CASCADA (se usa la primera que responda con datos):
 *   1. Alpha Vantage commodity functions (BRENT, WTI, NATURAL_GAS) → serie.
 *      Rate-limit DURO 25 req/día en el free tier → caché agresiva 1h +
 *      preferimos AV solo para los 3 símbolos que cubre.
 *   2. Nasdaq Data Link (OPEC/ORB) → cesta OPEP, serie diaria oficial.
 *   3. Yahoo Finance chart (BZ=F/CL=F/NG=F/RB=F/HO=F) → serie diaria larga.
 *
 * Funciones puras testeables: `computeChange()` y `brentWtiSpread()`.
 * Degradación honesta (CLAUDE.md): nunca lanza; ante fallo de todas las
 * fuentes devuelve `{ ok:false, error, fetched_at }`.
 *
 * NOTA · uso server-side. Las claves (ALPHA_VANTAGE_KEY, NASDAQ_DATA_LINK_KEY)
 * jamás se exponen al cliente; este módulo se importa solo desde route handlers.
 */
// NOTA · el cliente Nasdaq se importa de forma DINÁMICA dentro de `fetchNasdaq()`
// (no a nivel de módulo). Razón: el harness de tests Node
// (`--experimental-strip-types`) no resuelve el alias `@/` de tsconfig, y un
// import de VALOR a nivel de módulo rompería la carga del archivo en los tests
// de las funciones puras (computeChange/brentWtiSpread/buildSeries). El bundler
// de Next.js resuelve el import dinámico `@/` con normalidad.
import type {
  EnergyCommodityPoint,
  EnergyCommodityResponse,
  EnergyCommoditySeries,
  EnergyCommoditySource,
  EnergyCommoditySymbol,
} from './types'

// ─────────────────────────────────────────────────────────────────────────
// Funciones PURAS (testeables sin red)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Variación porcentual a N días naturales sobre una serie cronológica
 * ascendente (más antigua → más reciente).
 *
 * Busca el punto de referencia más cercano a `days` días antes del último
 * punto (tolerando huecos de fin de semana / festivos: se queda con el primer
 * punto cuya distancia en días sea >= `days`, contando desde el más reciente
 * hacia atrás). Devuelve `null` si no hay datos suficientes.
 *
 * - `days = 1` → variación intradía/24h (último vs punto inmediatamente
 *   anterior), comportamiento especial: usa el penúltimo punto.
 *
 * @param series serie cronológica ascendente de puntos {date, value}
 * @param days   ventana en días naturales (1, 7, 30, …)
 * @returns variación % (puede ser negativa), o null si no calculable
 */
export function computeChange(
  series: ReadonlyArray<EnergyCommodityPoint>,
  days: number,
): number | null {
  if (!Array.isArray(series) || series.length < 2) return null
  const last = series[series.length - 1]
  if (!last || !Number.isFinite(last.value)) return null

  // 24h / intradía: penúltimo punto válido.
  if (days <= 1) {
    for (let i = series.length - 2; i >= 0; i--) {
      const p = series[i]
      if (p && Number.isFinite(p.value)) return pctChange(p.value, last.value)
    }
    return null
  }

  const lastMs = Date.parse(last.date)
  if (!Number.isFinite(lastMs)) return null
  const targetMs = lastMs - days * 24 * 60 * 60 * 1000

  // Recorremos hacia atrás y nos quedamos con el primer punto cuya fecha sea
  // <= targetMs (el más reciente que está al menos `days` días atrás).
  for (let i = series.length - 2; i >= 0; i--) {
    const p = series[i]
    if (!p || !Number.isFinite(p.value)) continue
    const ms = Date.parse(p.date)
    if (Number.isFinite(ms) && ms <= targetMs) {
      return pctChange(p.value, last.value)
    }
  }
  // La serie no llega hasta `days` atrás: no hay base honesta → null.
  return null
}

/** Variación porcentual de `from` a `to` (null si base 0/no finita). */
function pctChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || from === 0 || !Number.isFinite(to)) return null
  return ((to - from) / Math.abs(from)) * 100
}

/**
 * Spread Brent-WTI (USD/bbl). Históricamente positivo (Brent > WTI). Pura.
 * @returns brent - wti, o null si falta alguno.
 */
export function brentWtiSpread(
  brent: number | null | undefined,
  wti: number | null | undefined,
): number | null {
  if (brent == null || wti == null) return null
  if (!Number.isFinite(brent) || !Number.isFinite(wti)) return null
  return brent - wti
}

/**
 * Ensambla un `EnergyCommoditySeries` a partir de una serie cronológica y la
 * metadata del símbolo, calculando spot + variaciones. Pura (sin red), por lo
 * que es testeable con fixtures.
 */
export function buildSeries(
  symbol: EnergyCommoditySymbol,
  meta: { name: string; unit: string; currency: string },
  points: ReadonlyArray<EnergyCommodityPoint>,
  source: EnergyCommoditySource,
  sourceLabel: string,
  sourceUrl: string,
): EnergyCommoditySeries {
  // Normalizamos: orden ascendente por fecha + sin valores no finitos.
  const clean = [...points]
    .filter((p) => p && typeof p.date === 'string' && Number.isFinite(p.value))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const last = clean.length ? clean[clean.length - 1] : null
  return {
    symbol,
    name: meta.name,
    unit: meta.unit,
    currency: meta.currency,
    latest: last?.value ?? null,
    latest_date: last?.date ?? null,
    change_24h: computeChange(clean, 1),
    change_7d: computeChange(clean, 7),
    change_30d: computeChange(clean, 30),
    series: clean,
    source,
    source_label: sourceLabel,
    source_url: sourceUrl,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Catálogo de símbolos energía → mapeo a cada fuente
// ─────────────────────────────────────────────────────────────────────────

interface SymbolDef {
  symbol: EnergyCommoditySymbol
  name: string
  unit: string
  currency: string
  /** Función Alpha Vantage commodity (BRENT/WTI/NATURAL_GAS) si aplica. */
  alphaFunction?: 'BRENT' | 'WTI' | 'NATURAL_GAS'
  /** Dataset Nasdaq Data Link {db, ds} si aplica (ej. OPEC/ORB). */
  nasdaq?: { db: string; ds: string; label: string }
  /** Ticker Yahoo para serie larga (chart), si aplica. */
  yahoo?: string
  /** Etiqueta de fuente Yahoo. */
  yahooLabel?: string
}

export const ENERGY_SYMBOLS: Record<EnergyCommoditySymbol, SymbolDef> = {
  brent: {
    symbol: 'brent',
    name: 'Brent',
    unit: 'USD/bbl',
    currency: 'USD',
    alphaFunction: 'BRENT',
    nasdaq: { db: 'OPEC', ds: 'ORB', label: 'OPEC Reference Basket (proxy cesta · ICE Brent no en Nasdaq free)' },
    yahoo: 'BZ=F',
    yahooLabel: 'Yahoo Finance · BZ=F (ICE Brent front-month)',
  },
  wti: {
    symbol: 'wti',
    name: 'WTI',
    unit: 'USD/bbl',
    currency: 'USD',
    alphaFunction: 'WTI',
    yahoo: 'CL=F',
    yahooLabel: 'Yahoo Finance · CL=F (NYMEX WTI front-month)',
  },
  opec: {
    symbol: 'opec',
    name: 'Cesta OPEP (ORB)',
    unit: 'USD/bbl',
    currency: 'USD',
    nasdaq: { db: 'OPEC', ds: 'ORB', label: 'OPEC Reference Basket (cesta oficial OPEP)' },
  },
  'henry-hub': {
    symbol: 'henry-hub',
    name: 'Gas natural · Henry Hub',
    unit: 'USD/MMBtu',
    currency: 'USD',
    alphaFunction: 'NATURAL_GAS',
    yahoo: 'NG=F',
    yahooLabel: 'Yahoo Finance · NG=F (NYMEX Henry Hub front-month)',
  },
  ttf: {
    // TTF (hub europeo de gas) NO tiene fuente gratuita fiable en las APIs
    // configuradas (Alpha no expone TTF; Nasdaq free no; Yahoo TTF=F es
    // inestable). Se deja sin fuente → degrada a empty-state honesto.
    symbol: 'ttf',
    name: 'Gas natural · TTF (hub UE)',
    unit: 'EUR/MWh',
    currency: 'EUR',
  },
  gasolina: {
    symbol: 'gasolina',
    name: 'Gasolina RBOB',
    unit: 'USD/gal',
    currency: 'USD',
    yahoo: 'RB=F',
    yahooLabel: 'Yahoo Finance · RB=F (NYMEX RBOB gasoline)',
  },
  diesel: {
    symbol: 'diesel',
    name: 'Diésel / Heating Oil',
    unit: 'USD/gal',
    currency: 'USD',
    yahoo: 'HO=F',
    yahooLabel: 'Yahoo Finance · HO=F (NYMEX ULSD/heating oil, proxy diésel)',
  },
}

const ALPHA_LABELS: Record<'BRENT' | 'WTI' | 'NATURAL_GAS', string> = {
  BRENT: 'Alpha Vantage · BRENT (Europe Brent spot, EIA)',
  WTI: 'Alpha Vantage · WTI (Cushing OK spot, EIA)',
  NATURAL_GAS: 'Alpha Vantage · NATURAL_GAS (Henry Hub spot, EIA)',
}
const ALPHA_URL = 'https://www.alphavantage.co/documentation/#commodities'
const NASDAQ_URL = 'https://data.nasdaq.com/data/OPEC/ORB'
const YAHOO_URL = 'https://finance.yahoo.com/commodities'

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (1h · agresiva por el rate-limit de Alpha Vantage)
// ─────────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000 // 1h
const _cache = new Map<string, { ts: number; data: EnergyCommodityResponse }>()

function cacheKey(symbol: EnergyCommoditySymbol, days: number): string {
  return `${symbol}:${days}`
}

// ─────────────────────────────────────────────────────────────────────────
// Fetchers por fuente (cada uno devuelve puntos cronológicos o [])
// ─────────────────────────────────────────────────────────────────────────

interface AlphaCommodityResponse {
  name?: string
  unit?: string
  data?: Array<{ date: string; value: string }>
  Information?: string // mensaje de rate-limit
  Note?: string
}

/**
 * Alpha Vantage commodity function (BRENT/WTI/NATURAL_GAS).
 * `interval=daily`. Devuelve puntos cronológicos ascendentes, o [] si falla.
 */
async function fetchAlpha(
  fn: 'BRENT' | 'WTI' | 'NATURAL_GAS',
  days: number,
): Promise<EnergyCommodityPoint[]> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY
  if (!apiKey) return []
  const url = `https://www.alphavantage.co/query?function=${fn}&interval=daily&apikey=${apiKey}`
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 9000)
  try {
    const r = await fetch(url, { signal: ctrl.signal, next: { revalidate: 3600 } })
    if (!r.ok) return []
    const j = (await r.json()) as AlphaCommodityResponse
    // Rate-limit / nota → tratamos como "sin datos" para caer a la siguiente fuente.
    if (j.Information || j.Note || !Array.isArray(j.data)) return []
    const cutoffMs = Date.now() - (days + 5) * 24 * 60 * 60 * 1000
    const pts: EnergyCommodityPoint[] = []
    for (const row of j.data) {
      const value = Number(row.value)
      // Alpha marca huecos con ".". Saltamos no-finitos.
      if (!row.date || !Number.isFinite(value)) continue
      const ms = Date.parse(row.date)
      if (Number.isFinite(ms) && ms < cutoffMs) continue
      pts.push({ date: row.date, value })
    }
    // Alpha devuelve desc (más reciente primero) → ascendente.
    pts.sort((a, b) => (a.date < b.date ? -1 : 1))
    return pts
  } catch {
    return []
  } finally {
    clearTimeout(to)
  }
}

/** Nasdaq Data Link (OPEC/ORB u otro). Puntos cronológicos ascendentes o []. */
async function fetchNasdaq(db: string, ds: string, days: number): Promise<EnergyCommodityPoint[]> {
  const rows = Math.max(40, Math.min(120, days + 10))
  // Import dinámico (alias `@/`) · ver nota en la cabecera del módulo.
  const { fetchNasdaqDataset } = await import('@/lib/nasdaq/data-link')
  const ndl = await fetchNasdaqDataset({ database: db, dataset: ds, rows, order: 'desc' })
  if (!ndl.ok || ndl.points.length === 0) return []
  return ndl.points
    .filter((p) => p.date && Number.isFinite(p.value))
    .map((p) => ({ date: p.date, value: p.value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** Yahoo Finance chart (serie diaria larga). Puntos cronológicos o []. */
async function fetchYahooSeries(ticker: string, days: number): Promise<EnergyCommodityPoint[]> {
  const range = days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 180 ? '6mo' : '1y'
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker,
  )}?interval=1d&range=${range}`
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 8000)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    } as RequestInit)
    if (!r.ok) return []
    const j = (await r.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[]
          indicators?: { quote?: Array<{ close?: (number | null)[] }> }
        }>
      }
    }
    const res = j?.chart?.result?.[0]
    const ts = res?.timestamp ?? []
    const close = res?.indicators?.quote?.[0]?.close ?? []
    if (!ts.length) return []
    const pts: EnergyCommodityPoint[] = []
    for (let i = 0; i < ts.length; i++) {
      const v = close[i]
      if (v == null || !Number.isFinite(v)) continue
      pts.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), value: v })
    }
    return pts.sort((a, b) => (a.date < b.date ? -1 : 1))
  } catch {
    return []
  } finally {
    clearTimeout(to)
  }
}

// ─────────────────────────────────────────────────────────────────────────
// API pública del cliente
// ─────────────────────────────────────────────────────────────────────────

export interface FetchEnergyCommodityOpts {
  /** Ventana de la serie en días (default 90). */
  days?: number
  /** Forzar refetch ignorando la caché (default false). */
  noCache?: boolean
}

/**
 * Descarga spot + serie histórica de un commodity energético, recorriendo la
 * cascada de fuentes hasta que una devuelva datos. Caché 1h en memoria.
 * Nunca lanza: ante fallo total devuelve `{ ok:false, error }`.
 */
export async function fetchEnergyCommodity(
  symbol: EnergyCommoditySymbol,
  opts: FetchEnergyCommodityOpts = {},
): Promise<EnergyCommodityResponse> {
  const days = opts.days ?? 90
  const key = cacheKey(symbol, days)
  if (!opts.noCache) {
    const hit = _cache.get(key)
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data
  }

  const def = ENERGY_SYMBOLS[symbol]
  const fetchedAt = new Date().toISOString()
  if (!def) {
    return { ok: false, error: `símbolo desconocido: ${symbol}`, fetched_at: fetchedAt }
  }

  const meta = { name: def.name, unit: def.unit, currency: def.currency }

  // ── Cascada de fuentes ──────────────────────────────────────────────
  // 1) Alpha Vantage (solo BRENT/WTI/NATURAL_GAS · serie spot EIA).
  if (def.alphaFunction) {
    const pts = await fetchAlpha(def.alphaFunction, days)
    if (pts.length >= 2) {
      return finalize(key, buildSeries(symbol, meta, pts, 'alpha_vantage', ALPHA_LABELS[def.alphaFunction], ALPHA_URL), fetchedAt)
    }
  }

  // 2) Nasdaq Data Link (cesta OPEP u otro dataset oficial).
  if (def.nasdaq) {
    const pts = await fetchNasdaq(def.nasdaq.db, def.nasdaq.ds, days)
    if (pts.length >= 2) {
      return finalize(key, buildSeries(symbol, meta, pts, 'nasdaq_data_link', def.nasdaq.label, NASDAQ_URL), fetchedAt)
    }
  }

  // 3) Yahoo Finance (serie diaria larga front-month).
  if (def.yahoo) {
    const pts = await fetchYahooSeries(def.yahoo, days)
    if (pts.length >= 2) {
      return finalize(key, buildSeries(symbol, meta, pts, 'yahoo_finance', def.yahooLabel ?? `Yahoo Finance · ${def.yahoo}`, YAHOO_URL), fetchedAt)
    }
  }

  // Sin fuente disponible (ej. TTF) o todas fallaron → degradación honesta.
  const noSource = !def.alphaFunction && !def.nasdaq && !def.yahoo
  const resp: EnergyCommodityResponse = {
    ok: false,
    error: noSource
      ? `sin fuente gratuita configurada para ${def.name}`
      : `sin datos en ninguna fuente (Alpha/Nasdaq/Yahoo) para ${def.name}`,
    fetched_at: fetchedAt,
  }
  // No cacheamos errores con TTL largo: permitimos reintento pronto.
  return resp
}

function finalize(
  key: string,
  data: EnergyCommoditySeries,
  fetchedAt: string,
): EnergyCommodityResponse {
  const resp: EnergyCommodityResponse = { ok: true, data, fetched_at: fetchedAt }
  _cache.set(key, { ts: Date.now(), data: resp })
  return resp
}

/** Símbolos por categoría para el endpoint `?category=`. */
export const ENERGY_CATEGORIES: Record<'oil' | 'gas' | 'all', EnergyCommoditySymbol[]> = {
  oil: ['brent', 'wti', 'opec', 'gasolina', 'diesel'],
  gas: ['henry-hub', 'ttf'],
  all: ['brent', 'wti', 'opec', 'henry-hub', 'ttf', 'gasolina', 'diesel'],
}

/**
 * Descarga en paralelo todos los commodities de una categoría.
 * Devuelve cada respuesta (ok o degradada) bajo su símbolo.
 */
export async function fetchEnergyCategory(
  category: 'oil' | 'gas' | 'all',
  opts: FetchEnergyCommodityOpts = {},
): Promise<Record<string, EnergyCommodityResponse>> {
  const symbols = ENERGY_CATEGORIES[category] ?? ENERGY_CATEGORIES.all
  const results = await Promise.all(symbols.map((s) => fetchEnergyCommodity(s, opts)))
  const out: Record<string, EnergyCommodityResponse> = {}
  symbols.forEach((s, i) => {
    out[s] = results[i]
  })
  return out
}
