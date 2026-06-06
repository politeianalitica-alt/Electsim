/**
 * Cliente energy-charts.info (Fraunhofer ISE) · contexto eléctrico europeo
 *
 * energy-charts.info es el portal de datos eléctricos del Fraunhofer Institute
 * for Solar Energy Systems (ISE). Su API REST es GRATUITA, SIN API key, y los
 * datos se publican bajo licencia CC-BY. Es la fuente PRIMARIA del "Contexto
 * europeo" del sistema eléctrico en Politeia:
 *
 *   - Precios day-ahead por bidding zone (ES/FR/DE-LU/PT/IT-North/BE/NL).
 *   - Generación por fuente (mix EU-style) de cada país.
 *   - Flujos físicos cross-border netos por país vecino.
 *
 * Sustituye al panel ENTSO-E, que requiere un "Web API Security Token" aún no
 * disponible. El cliente ENTSO-E (`lib/entsoe/client.ts`) se conserva como
 * fuente ADICIONAL opcional cuando se configure ENTSOE_SECURITY_TOKEN.
 *
 * ── API REAL (verificada en vivo · 2026-06-06 · sin key) ──────────────────
 *   Base: https://api.energy-charts.info
 *   - GET /price?bzn=ES         → { license_info, unix_seconds, price, unit }
 *   - GET /public_power?country=es → { unix_seconds, production_types:[{name,data}] }
 *   - GET /cbpf?country=es       → { unix_seconds, countries:[{name,data}] }  (GW)
 *
 *   OJO · RATE LIMIT: la API devuelve HTTP 429 si se piden muchas zonas a la
 *   vez. Por eso `fetchEuPrices` hace fetches SECUENCIALES (no Promise.all
 *   masivo) con una pequeña espera entre zonas, y todo se cachea 1h en memoria.
 *
 *   Unidades:
 *     - /price  → €/MWh (campo `unit` = "EUR / MWh").
 *     - /public_power → MW por fuente. Incluye series especiales: "Load",
 *         "Renewable share of load", "Renewable share of generation" (%), y
 *         series de consumo con valores NEGATIVOS (bombeo, baterías, trading).
 *     - /cbpf  → GW de flujo NETO por país vecino (el cliente lo convierte a
 *         MW ×1000 para homogeneizar con el resto del módulo). Incluye una
 *         entrada agregada name="sum". Signo observado: POSITIVO = importación
 *         neta hacia el país consultado; NEGATIVO = exportación neta.
 *
 * ── Diseño defensivo (CLAUDE.md) ──────────────────────────────────────────
 *   - Degradación: ante fallo/timeout/429 → `{ ok:false, error, fetched_at }`.
 *     NUNCA lanza ni inventa datos.
 *   - Caché en memoria con TTL 1h: Map<key,{expires,value}>. Solo cachea OK.
 *   - Helpers puros testeables: `latestFromSeries`, `avgSeries`.
 *
 * Estas funciones se llaman desde route handlers (app/api/energia/eu-power).
 *
 * Docs: https://api.energy-charts.info · Portal: https://energy-charts.info
 */
import type {
  EuPrice,
  EuGeneration,
  EuGenerationSource,
  EuCrossBorder,
  EuCrossBorderFlow,
  EuPowerResponse,
} from '@/lib/energia/types'

const BASE = 'https://api.energy-charts.info'
const PUBLIC_URL = 'https://energy-charts.info'
const DEFAULT_TIMEOUT_MS = 12_000
const CACHE_TTL_MS = 60 * 60_000 // 1h
const SEQUENTIAL_GAP_MS = 120 // pequeña espera entre zonas (anti-429)

// ─────────────────────────────────────────────────────────────────────────
// Catálogo de bidding zones (energy-charts usa claves propias, ej. "DE-LU").
// ─────────────────────────────────────────────────────────────────────────
const ZONE_LABELS: Record<string, string> = {
  ES: 'España',
  FR: 'Francia',
  'DE-LU': 'Alemania-Luxemburgo',
  PT: 'Portugal',
  'IT-North': 'Italia (Norte)',
  BE: 'Bélgica',
  NL: 'Países Bajos',
}

const COUNTRY_LABELS: Record<string, string> = {
  es: 'España',
  fr: 'Francia',
  de: 'Alemania',
  pt: 'Portugal',
  it: 'Italia',
  be: 'Bélgica',
  nl: 'Países Bajos',
}

function zoneLabel(zone: string): string {
  return ZONE_LABELS[zone] ?? zone
}
function countryLabel(country: string): string {
  return COUNTRY_LABELS[country] ?? country.toUpperCase()
}

/**
 * Series de `production_types` que NO son fuentes de generación primaria y por
 * tanto se excluyen del desglose del mix (% / total):
 *   - "Load" / "Residual load" → demanda, no generación.
 *   - "Renewable share of *"   → porcentajes, no MW.
 *   - "Cross border electricity trading" → saldo de intercambios (puede ser ±).
 *   - "* Consumption"          → consumo (bombeo, baterías) · valores negativos.
 */
const NON_GENERATION_SERIES = new Set([
  'load',
  'residual load',
  'renewable share of load',
  'renewable share of generation',
  'cross border electricity trading',
])

function isConsumptionSeries(name: string): boolean {
  return /consumption/i.test(name)
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL 1h
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry { expires: number; value: unknown }
const _cache = new Map<string, CacheEntry>()

function cacheGet<T>(key: string): T | undefined {
  const hit = _cache.get(key)
  if (!hit) return undefined
  if (Date.now() > hit.expires) {
    _cache.delete(key)
    return undefined
  }
  return hit.value as T
}

function cacheSet(key: string, value: unknown): void {
  _cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value })
}

/** Limpia la caché. Solo para tests. */
export function _clearEnergyChartsCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS (testeables sin red)
// ─────────────────────────────────────────────────────────────────────────

/** Pequeña espera (no bloquea el event loop). */
function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}

function round1(n: number): number { return Math.round(n * 10) / 10 }
function round2(n: number): number { return Math.round(n * 100) / 100 }

/**
 * Último valor NO nulo de una serie `values`, junto con su timestamp ISO
 * derivado del array paralelo `unix` (segundos epoch).
 *
 * Devuelve `{ value: null, ts: null }` si no hay ningún valor utilizable.
 * Recorre desde el final para tolerar huecos (null) al cierre de la serie.
 */
export function latestFromSeries(
  unix: number[] | undefined,
  values: Array<number | null> | undefined,
): { value: number | null; ts: string | null } {
  if (!Array.isArray(values) || values.length === 0) return { value: null, ts: null }
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i]
    if (v === null || v === undefined || !Number.isFinite(v)) continue
    const sec = Array.isArray(unix) ? unix[i] : undefined
    const ts = Number.isFinite(sec) ? new Date((sec as number) * 1000).toISOString() : null
    return { value: v, ts }
  }
  return { value: null, ts: null }
}

/**
 * Media aritmética de los valores finitos de `values` (ignora null/NaN).
 * Devuelve null si no hay ningún valor utilizable.
 */
export function avgSeries(values: Array<number | null> | undefined): number | null {
  if (!Array.isArray(values) || values.length === 0) return null
  let sum = 0
  let n = 0
  for (const v of values) {
    if (v === null || v === undefined || !Number.isFinite(v)) continue
    sum += v
    n += 1
  }
  return n > 0 ? sum / n : null
}

/**
 * Media de los puntos del ÚLTIMO día natural cubierto por la serie.
 *
 * Toma el timestamp del último punto, retrocede 24h y promedia los puntos cuyo
 * unix_seconds cae en esa ventana. Si no se puede acotar (sin unix), cae a la
 * media de toda la serie. Útil para el "precio medio del día" day-ahead.
 */
export function avgLastDay(
  unix: number[] | undefined,
  values: Array<number | null> | undefined,
): number | null {
  if (!Array.isArray(values) || values.length === 0) return null
  if (!Array.isArray(unix) || unix.length !== values.length) {
    return avgSeries(values)
  }
  // Último timestamp finito.
  let lastSec: number | null = null
  for (let i = unix.length - 1; i >= 0; i--) {
    if (Number.isFinite(unix[i])) { lastSec = unix[i]; break }
  }
  if (lastSec === null) return avgSeries(values)
  const windowStart = lastSec - 24 * 3600
  let sum = 0
  let n = 0
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v === null || v === undefined || !Number.isFinite(v)) continue
    if (!Number.isFinite(unix[i]) || unix[i] < windowStart) continue
    sum += v
    n += 1
  }
  return n > 0 ? sum / n : avgSeries(values)
}

/** Mínimo finito de una serie (null si vacía). */
function minSeries(values: Array<number | null> | undefined): number | null {
  if (!Array.isArray(values)) return null
  let m: number | null = null
  for (const v of values) {
    if (v === null || v === undefined || !Number.isFinite(v)) continue
    if (m === null || v < m) m = v
  }
  return m
}

/** Máximo finito de una serie (null si vacía). */
function maxSeries(values: Array<number | null> | undefined): number | null {
  if (!Array.isArray(values)) return null
  let m: number | null = null
  for (const v of values) {
    if (v === null || v === undefined || !Number.isFinite(v)) continue
    if (m === null || v > m) m = v
  }
  return m
}

// ─────────────────────────────────────────────────────────────────────────
// Parsers PUROS (payload crudo → tipo de dominio)
// ─────────────────────────────────────────────────────────────────────────

interface RawPrice { unix_seconds?: number[]; price?: Array<number | null>; unit?: string }
interface RawSeriesItem { name?: string; data?: Array<number | null> }
interface RawPublicPower { unix_seconds?: number[]; production_types?: RawSeriesItem[] }
interface RawCbpf { unix_seconds?: number[]; countries?: RawSeriesItem[] }

/** Construye un `EuPrice` a partir del payload crudo de /price para una zona. */
export function parsePrice(zone: string, raw: RawPrice): EuPrice {
  const unix = Array.isArray(raw?.unix_seconds) ? raw.unix_seconds : []
  const price = Array.isArray(raw?.price) ? raw.price : []
  const { value: latest, ts } = latestFromSeries(unix, price)
  const avgDay = avgLastDay(unix, price)
  const series: Array<{ ts: string; value: number }> = []
  for (let i = 0; i < price.length; i++) {
    const v = price[i]
    if (v === null || v === undefined || !Number.isFinite(v)) continue
    const sec = unix[i]
    if (!Number.isFinite(sec)) continue
    series.push({ ts: new Date((sec as number) * 1000).toISOString(), value: v })
  }
  return {
    zone,
    label: zoneLabel(zone),
    latest_eur_mwh: latest === null ? null : round2(latest),
    avg_today: avgDay === null ? null : round2(avgDay),
    min_eur_mwh: (() => { const m = minSeries(price); return m === null ? null : round2(m) })(),
    max_eur_mwh: (() => { const m = maxSeries(price); return m === null ? null : round2(m) })(),
    latest_ts: ts,
    series,
  }
}

/** Construye un `EuGeneration` a partir del payload crudo de /public_power. */
export function parseGeneration(country: string, raw: RawPublicPower): EuGeneration {
  const unix = Array.isArray(raw?.unix_seconds) ? raw.unix_seconds : []
  const types = Array.isArray(raw?.production_types) ? raw.production_types : []

  let latest_ts: string | null = null
  let load_mw: number | null = null
  let renewable_share_pct: number | null = null
  let renewable_share_of_load_pct: number | null = null

  const rawSources: EuGenerationSource[] = []

  for (const t of types) {
    const name = String(t?.name ?? '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    const { value, ts } = latestFromSeries(unix, t?.data)
    if (ts && !latest_ts) latest_ts = ts

    if (key === 'load') {
      if (value !== null) load_mw = Math.round(value)
      continue
    }
    if (key === 'renewable share of generation') {
      if (value !== null) renewable_share_pct = round1(value)
      continue
    }
    if (key === 'renewable share of load') {
      if (value !== null) renewable_share_of_load_pct = round1(value)
      continue
    }
    // Excluir demanda residual, trading y consumos del desglose de generación.
    if (NON_GENERATION_SERIES.has(key) || isConsumptionSeries(name) || key === 'residual load') {
      continue
    }
    // Solo fuentes con producción positiva en el último instante.
    if (value === null || value <= 0) continue
    rawSources.push({ name, mw: Math.round(value), share_pct: 0 })
  }

  const total = rawSources.reduce((s, r) => s + r.mw, 0)
  const sources = rawSources
    .map((r) => ({ ...r, share_pct: total > 0 ? round1((r.mw / total) * 100) : 0 }))
    .sort((a, b) => b.mw - a.mw)

  return {
    country,
    label: countryLabel(country),
    latest_ts,
    load_mw,
    total_generation_mw: total,
    renewable_share_pct,
    renewable_share_of_load_pct,
    sources,
  }
}

/**
 * Construye un `EuCrossBorder` a partir del payload crudo de /cbpf.
 * Convierte GW → MW (×1000). Excluye la entrada agregada name="sum" del listado
 * de vecinos, pero la usa para `net_balance_mw`.
 */
export function parseCrossBorder(country: string, raw: RawCbpf): EuCrossBorder {
  const unix = Array.isArray(raw?.unix_seconds) ? raw.unix_seconds : []
  const countries = Array.isArray(raw?.countries) ? raw.countries : []
  const selfLabel = countryLabel(country)
  const selfTag = country.toUpperCase()

  let latest_ts: string | null = null
  let net_balance_mw: number | null = null
  const neighbours: EuCrossBorderFlow[] = []

  for (const c of countries) {
    const name = String(c?.name ?? '').trim()
    if (!name) continue
    const { value: lastGw, ts } = latestFromSeries(unix, c?.data)
    if (ts && !latest_ts) latest_ts = ts
    const avgGw = avgSeries(c?.data)

    if (name.toLowerCase() === 'sum') {
      net_balance_mw = lastGw === null ? null : Math.round(lastGw * 1000)
      continue
    }
    if (lastGw === null) continue
    const net_mw = Math.round(lastGw * 1000)
    // Signo observado: positivo = importación neta hacia el país consultado.
    const direction = net_mw >= 0 ? `${name} → ${selfTag}` : `${selfTag} → ${name}`
    neighbours.push({
      neighbour: name,
      net_mw,
      avg_mw: avgGw === null ? 0 : Math.round(avgGw * 1000),
      direction,
    })
  }

  // Orden por magnitud de flujo (más relevante primero).
  neighbours.sort((a, b) => Math.abs(b.net_mw) - Math.abs(a.net_mw))

  return {
    country,
    label: selfLabel,
    latest_ts,
    neighbours,
    net_balance_mw,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch crudo con timeout + caché + degradación (sin auth)
// ─────────────────────────────────────────────────────────────────────────
interface RawFetchResult<T> { ok: boolean; error?: string; json?: T }

async function fetchJson<T>(path: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<RawFetchResult<T>> {
  const cacheKey = path
  const cached = cacheGet<RawFetchResult<T>>(cacheKey)
  if (cached !== undefined) return cached

  const url = `${BASE}${path}`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      // Caché HTTP de Next además de la caché de proceso (1h).
      next: { revalidate: 3600 },
    } as RequestInit)
    clearTimeout(t)

    if (r.status === 429) {
      // No cacheamos errores transitorios de rate-limit.
      return { ok: false, error: 'rate_limited · energy-charts 429 (demasiadas peticiones)' }
    }
    if (!r.ok) {
      return { ok: false, error: `http_${r.status} · ${r.statusText}` }
    }
    const json = (await r.json()) as T
    const result: RawFetchResult<T> = { ok: true, json }
    cacheSet(cacheKey, result)
    return result
  } catch (e: unknown) {
    const name = (e as { name?: string })?.name
    const msg = name === 'AbortError' ? 'timeout' : String((e as Error)?.message ?? e).slice(0, 160)
    return { ok: false, error: msg }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// API pública del cliente
// ─────────────────────────────────────────────────────────────────────────

/** Bidding zones por defecto del contexto europeo (España resaltada en la UI). */
export const DEFAULT_EU_ZONES = ['ES', 'FR', 'DE-LU', 'PT', 'IT-North'] as const

/**
 * Precios day-ahead de varias bidding zones, en SECUENCIAL (anti-429).
 *
 * Para cada zona devuelve último precio, media del día y serie. Las zonas que
 * fallan se omiten del resultado (degradación parcial); `ok` es true si al
 * menos una zona respondió. Si TODAS fallan → `{ ok:false, error }`.
 */
export async function fetchEuPrices(
  zones: string[] = [...DEFAULT_EU_ZONES],
): Promise<EuPowerResponse<EuPrice[]>> {
  const fetched_at = new Date().toISOString()
  const out: EuPrice[] = []
  const errors: string[] = []

  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i]
    const res = await fetchJson<RawPrice>(`/price?bzn=${encodeURIComponent(zone)}`)
    if (res.ok && res.json) {
      out.push(parsePrice(zone, res.json))
    } else {
      errors.push(`${zone}:${res.error ?? 'error'}`)
    }
    // Pequeña espera entre zonas (no tras la última) para no disparar el 429.
    if (i < zones.length - 1) await sleep(SEQUENTIAL_GAP_MS)
  }

  if (out.length === 0) {
    return {
      ok: false,
      error: errors.length ? errors.join(' · ') : 'sin_datos',
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }
  return { ok: true, data: out, fetched_at, source_url: PUBLIC_URL }
}

/**
 * Generación por fuente de un país (mix EU-style · MW + % renovable).
 * `country` en minúsculas ISO-2 (es, fr, de, pt, it…).
 */
export async function fetchEuGeneration(
  country = 'es',
): Promise<EuPowerResponse<EuGeneration>> {
  const fetched_at = new Date().toISOString()
  const c = (country || 'es').toLowerCase()
  const res = await fetchJson<RawPublicPower>(`/public_power?country=${encodeURIComponent(c)}`)
  if (!res.ok || !res.json) {
    return { ok: false, error: res.error ?? 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }
  const data = parseGeneration(c, res.json)
  if (data.sources.length === 0 && data.total_generation_mw === 0) {
    return { ok: false, error: 'sin_datos_generacion', fetched_at, source_url: PUBLIC_URL }
  }
  return { ok: true, data, fetched_at, source_url: PUBLIC_URL }
}

/**
 * Flujos físicos netos cross-border de un país por país vecino + saldo neto.
 * `country` en minúsculas ISO-2 (es, fr, de, pt, it…).
 */
export async function fetchCrossBorderFlows(
  country = 'es',
): Promise<EuPowerResponse<EuCrossBorder>> {
  const fetched_at = new Date().toISOString()
  const c = (country || 'es').toLowerCase()
  const res = await fetchJson<RawCbpf>(`/cbpf?country=${encodeURIComponent(c)}`)
  if (!res.ok || !res.json) {
    return { ok: false, error: res.error ?? 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }
  const data = parseCrossBorder(c, res.json)
  if (data.neighbours.length === 0) {
    return { ok: false, error: 'sin_datos_flujos', fetched_at, source_url: PUBLIC_URL }
  }
  return { ok: true, data, fetched_at, source_url: PUBLIC_URL }
}
