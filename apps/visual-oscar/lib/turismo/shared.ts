/**
 * lib/turismo/shared.ts · Primitivas compartidas del data layer de Turismo v3
 * (Sprint T2-ine).
 *
 * Centraliza el acceso a las DOS fuentes vivas del sprint —INE WSTempus y
 * Eurostat JSON-stat— con el patrón Politeia (`{ ok, data|null, error?,
 * fetched_at, source_url }`), caché TTL en memoria y degradación honesta
 * (HTTP nunca lanza; ante fallo devuelve ok:false con el motivo).
 *
 * NO depende de tipos compartidos del repo (sectorial-data.ts, etc.). Cada
 * cliente de turismo define sus propios tipos sobre estas primitivas.
 *
 * ── INE WSTempus ────────────────────────────────────────────────────────────
 *   Base: https://servicios.ine.es/wstempus/js/ES · público, sin auth.
 *   - DATOS_TABLA/{id}?nult=N → array de series, cada una con Data[] de
 *     observaciones {Anyo, FK_Periodo, Valor, Fecha, T3_Periodo, Tasas[]}.
 *   - DATOS_SERIE/{cod}?nult=N → una serie.
 *   La estructura es heterogénea: el "tipo" (de alojamiento, métrica…) viene
 *   en el campo `Nombre` de la serie como texto separado por puntos, así que
 *   los clientes filtran por subcadenas del nombre (patrón del repo, ver
 *   app/api/ine/[...path]/route.ts).
 *
 *   Tablas turismo confirmadas vivas (probe 2026-06-07):
 *     10822 · FRONTUR turistas por país de residencia (mensual)
 *     23988 · FRONTUR turistas por CCAA destino
 *     23992 · EGATUR gasto (gasto total / medio persona / medio diario /
 *             duración media) · ANUAL
 *     2074  · EOH hoteles · viajeros + pernoctaciones (Nacional, mensual)
 *     2076  · EOH hoteles · establecimientos/plazas/grado de ocupación
 *     2077  · EOH hoteles · estancia media
 *     2058  · IRSH · ADR hotelero Nacional
 *     2056  · IRSH · RevPAR hotelero Nacional
 *     1993  · EOAP apartamentos · viajeros + pernoctaciones (Nacional)
 *     2021  · EOAP apartamentos · plazas + grado de ocupación
 *     2016  · EOAC campings · viajeros + pernoctaciones (Nacional)
 *     2042  · EOAC campings · plazas + grado de ocupación
 *     1995  · EOTR rural · viajeros + pernoctaciones (Nacional)
 *     2046  · EOTR rural · plazas + grado de ocupación
 *     12422 · ETR residentes · viajes/pernoct/gasto por tipo destino
 *             (Total / Interior / Extranjera) · ANUAL
 *
 * ── Eurostat JSON-stat 2.0 ──────────────────────────────────────────────────
 *   Base: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data
 *   Público, sin auth. Devuelve { value, dimension, id, size }.
 *   Datasets turismo confirmados vivos (probe 2026-06-07):
 *     tour_occ_nim  · pernoctaciones mensuales (c_resid, unit, nace_r2)
 *     tour_occ_arm  · llegadas mensuales
 *     tour_occ_nin2 · pernoctaciones NUTS2 anual (CCAA)
 *     tour_occ_arn2 · llegadas NUTS2 anual
 *     tour_cap_nat  · capacidad (accomunit ESTBL/BEDRM/BEDPL)
 *     bop_its6_det  · balanza · viajes (bop_item=SC) → %PIB turístico
 *     nama_10_gdp   · PIB nominal (denominador del %PIB)
 *   (tour_occ_nin / tour_occ_arn / tour_occ_ni ya NO se diseminan → 404.)
 */

// ─────────────────────────────────────────────────────────────────────────
// Envelope común (patrón Politeia)
// ─────────────────────────────────────────────────────────────────────────

export interface TurismoEnvelope<T> {
  ok: boolean
  data: T | null
  error?: string
  fetched_at: string
  source_url: string
  /** Marca por-bloque cuando una parte degrada pero otras viven. */
  partial?: boolean
}

export const INE_BASE = 'https://servicios.ine.es/wstempus/js/ES'
export const INE_PUBLIC = 'https://www.ine.es'
export const EUROSTAT_BASE =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'
export const EUROSTAT_PUBLIC = 'https://ec.europa.eu/eurostat'

const UA =
  'Mozilla/5.0 (compatible; Politeia/1.0; +https://politeia-visual-oscar.vercel.app)'
const DEFAULT_TIMEOUT_MS = 15_000

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL configurable por cliente
// ─────────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  expires: number
  value: T
}
const _cache = new Map<string, CacheEntry<unknown>>()

/** Lee de caché si no ha expirado. */
export function cacheGet<T>(key: string): T | null {
  const hit = _cache.get(key) as CacheEntry<T> | undefined
  if (hit && Date.now() <= hit.expires) return hit.value
  return null
}

/** Escribe en caché con TTL en ms. */
export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  _cache.set(key, { expires: Date.now() + ttlMs, value })
}

/** Limpia toda la caché de turismo. Solo para tests. */
export function _clearTurismoCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Parsing numérico null-safe (INE/Eurostat dan number o null)
// ─────────────────────────────────────────────────────────────────────────

/** Convierte a número finito o null (tolera string/"-"/""/null). */
export function num(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (s === '' || s === '-' || s.toLowerCase() === 'n/a') return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Variación porcentual entre dos valores. null si no computable. */
export function yoy(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null
  return +(((curr - prev) / Math.abs(prev)) * 100).toFixed(2)
}

/** Redondea a `d` decimales o null. */
export function round(v: number | null, d = 2): number | null {
  if (v == null || !Number.isFinite(v)) return null
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

// ─────────────────────────────────────────────────────────────────────────
// INE WSTempus · tipos crudos + fetch + mapper de puntos
// ─────────────────────────────────────────────────────────────────────────

export interface IneRawObs {
  Anyo?: number
  FK_Periodo?: number
  T3_Periodo?: string
  Fecha?: number
  Valor?: number | null
  Tasas?: Array<{ Valor?: number; Tipo?: number }>
}

export interface IneRawSerie {
  COD?: string
  Nombre?: string
  Data?: IneRawObs[]
}

/** Punto temporal normalizado de una serie INE. */
export interface InePoint {
  /** "YYYY-MM" (mensual), "YYYY-Qn" (trimestral) o "YYYY" (anual). */
  period: string
  year: number
  value: number | null
}

/**
 * Deriva la etiqueta de periodo de una observación INE.
 *
 * El `FK_Periodo` de INE codifica la FRECUENCIA de forma inequívoca y es la
 * fuente preferida (a diferencia del proxy del repo, que deriva del timestamp
 * `Fecha` y por eso confunde meses divisibles por 3 —mar/jun/sep/dic— con
 * trimestres, rompiendo el YoY de series mensuales como FRONTUR):
 *   1-12  → mes      → "YYYY-MM"
 *   21-24 → trimestre→ "YYYY-Qn"
 *   28    → anual    → "YYYY"
 * Si `FK_Periodo` falta, caemos al timestamp (con la heurística del repo) y, en
 * último término, al Anyo.
 */
export function inePeriodLabel(o: IneRawObs): string {
  const p = o.FK_Periodo
  const y =
    o.Anyo ??
    (o.Fecha && Number.isFinite(o.Fecha) ? new Date(o.Fecha).getUTCFullYear() : 0)
  if (p != null) {
    if (p >= 1 && p <= 12) return `${y}-${String(p).padStart(2, '0')}`
    if (p >= 21 && p <= 24) return `${y}-Q${p - 20}`
    if (p === 28) return `${y}`
  }
  // Sin FK_Periodo: derivar del timestamp (heurística mensual/trimestral).
  const ts = o.Fecha
  if (ts && Number.isFinite(ts)) {
    const d = new Date(ts)
    const m = d.getUTCMonth() + 1
    const yy = d.getUTCFullYear()
    if (m % 3 === 0) return `${yy}-Q${Math.ceil(m / 3)}`
    return `${yy}-${String(m).padStart(2, '0')}`
  }
  return `${y}`
}

/** Convierte Data[] de INE en puntos ascendentes por periodo. */
export function ineMapPoints(serie: IneRawSerie | null | undefined): InePoint[] {
  if (!serie?.Data || !Array.isArray(serie.Data)) return []
  const pts = serie.Data.map((o) => ({
    period: inePeriodLabel(o),
    year:
      (o.Fecha ? new Date(o.Fecha).getUTCFullYear() : 0) || o.Anyo || 0,
    value: num(o.Valor),
  }))
  pts.sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0))
  return pts
}

/** Último valor no nulo de una lista de puntos. */
export function lastPoint(points: InePoint[]): InePoint | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].value != null) return points[i]
  }
  return points.length ? points[points.length - 1] : null
}

/**
 * Descarga una tabla INE (`DATOS_TABLA/{id}`) como array de series crudas.
 * Nunca lanza: ante fallo devuelve `{ error }`. `nult` = nº de observaciones
 * por serie.
 */
export async function ineTable(
  tableId: number | string,
  nult: number,
  opts: { revalidate?: number; timeoutMs?: number } = {},
): Promise<{ series: IneRawSerie[] } | { error: string }> {
  const url = `${INE_BASE}/DATOS_TABLA/${tableId}?nult=${nult}`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const r = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': UA },
      signal: ctrl.signal,
      next: { revalidate: opts.revalidate ?? 21600 },
    } as RequestInit)
    clearTimeout(t)
    if (r.status === 429) return { error: 'rate_limited' }
    if (!r.ok) return { error: `http_${r.status}` }
    const text = await r.text()
    if (!text || text.trim().length < 2) return { error: 'empty_body' }
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return { error: 'invalid_json' }
    }
    if (!Array.isArray(json)) return { error: 'unexpected_shape' }
    return { series: json as IneRawSerie[] }
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string }
    return {
      error: err?.name === 'AbortError' ? 'timeout' : String(err?.message ?? e).slice(0, 160),
    }
  }
}

/**
 * Localiza en una tabla la primera serie cuyo `Nombre` contiene TODAS las
 * subcadenas dadas y NINGUNA de las excluidas (case-insensitive). null si no
 * hay match.
 */
export function findSerie(
  series: IneRawSerie[],
  includes: string[],
  excludes: string[] = [],
): IneRawSerie | null {
  for (const s of series) {
    const nm = (s.Nombre || '').toLowerCase()
    if (includes.every((inc) => nm.includes(inc.toLowerCase())) &&
      excludes.every((exc) => !nm.includes(exc.toLowerCase()))) {
      return s
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────
// Eurostat JSON-stat · fetch + parser (decodifica índice plano → puntos)
// ─────────────────────────────────────────────────────────────────────────

export interface EurostatPoint {
  value: number | null
  [dimName: string]: unknown
}

/**
 * Descarga un dataset Eurostat. `filters` es un mapa dim→valor (un valor por
 * dimensión) o dim→array (varios geo, etc.). Nunca lanza.
 */
export async function eurostatFetch(
  code: string,
  filters: Record<string, string | string[]>,
  opts: { revalidate?: number; timeoutMs?: number } = {},
): Promise<{ json: any } | { error: string }> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (Array.isArray(v)) v.forEach((vv) => qs.append(k, vv))
    else qs.append(k, v)
  }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const r = await fetch(`${EUROSTAT_BASE}/${code}?${qs.toString()}`, {
      headers: { Accept: 'application/json', 'User-Agent': UA },
      signal: ctrl.signal,
      next: { revalidate: opts.revalidate ?? 21600 },
    } as RequestInit)
    clearTimeout(t)
    if (r.status === 429) return { error: 'rate_limited' }
    if (!r.ok) return { error: `http_${r.status}` }
    const json: any = await r.json()
    // Eurostat responde 200 con { error:[...] } cuando el dataset no existe.
    if (json?.error && !json?.id) {
      const lbl = Array.isArray(json.error) ? json.error[0]?.label : String(json.error)
      return { error: `eurostat_${String(lbl).slice(0, 80)}` }
    }
    return { json }
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string }
    return {
      error: err?.name === 'AbortError' ? 'timeout' : String(err?.message ?? e).slice(0, 160),
    }
  }
}

/**
 * Parsea un payload JSON-stat 2.0 en puntos tipados. Equivalente al
 * `parseJsonStat` de lib/macro-utils pero embebido aquí para no depender de
 * código compartido (regla del sprint). Cada punto lleva value + los códigos
 * de cada dimensión + `<dim>_label`.
 */
export function parseJsonStat(json: any): EurostatPoint[] {
  if (!json?.value || !json?.dimension || !json?.id) return []
  const dimIds: string[] = json.id
  const sizes: number[] = json.size
  const dims = dimIds.map((id) => {
    const cat = json.dimension[id]?.category
    const labels = cat?.label || {}
    const index = cat?.index || {}
    const entries = Array.isArray(index)
      ? index.map((code: string, i: number) => ({ code, label: labels[code] ?? code, pos: i }))
      : Object.entries(index)
          .map(([code, pos]) => ({ code, label: (labels as any)[code] ?? code, pos: pos as number }))
          .sort((a, b) => a.pos - b.pos)
    return { id, entries }
  })

  const out: EurostatPoint[] = []
  const valueMap = json.value as Record<string, number | null>
  const total = sizes.reduce((a, b) => a * b, 1)
  for (let i = 0; i < total; i++) {
    const v = valueMap[String(i)]
    if (v === undefined || v === null) continue
    const point: EurostatPoint = { value: typeof v === 'number' ? v : null }
    let rem = i
    for (let d = dims.length - 1; d >= 0; d--) {
      const size = sizes[d]
      const idx = rem % size
      rem = Math.floor(rem / size)
      const cat = dims[d].entries[idx]
      if (cat) {
        point[dims[d].id] = cat.code
        point[`${dims[d].id}_label`] = cat.label
      }
    }
    out.push(point)
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// España: NUTS2 (17 CCAA + Ceuta/Melilla) · código Eurostat → nombre + ISO
// ─────────────────────────────────────────────────────────────────────────

export interface CcaaMeta {
  nuts2: string
  /** Código ISO 3166-2:ES (sin el prefijo ES-). */
  iso: string
  name: string
}

export const SPAIN_NUTS2: CcaaMeta[] = [
  { nuts2: 'ES11', iso: 'GA', name: 'Galicia' },
  { nuts2: 'ES12', iso: 'AS', name: 'Principado de Asturias' },
  { nuts2: 'ES13', iso: 'CB', name: 'Cantabria' },
  { nuts2: 'ES21', iso: 'PV', name: 'País Vasco' },
  { nuts2: 'ES22', iso: 'NC', name: 'Comunidad Foral de Navarra' },
  { nuts2: 'ES23', iso: 'RI', name: 'La Rioja' },
  { nuts2: 'ES24', iso: 'AR', name: 'Aragón' },
  { nuts2: 'ES30', iso: 'MD', name: 'Comunidad de Madrid' },
  { nuts2: 'ES41', iso: 'CL', name: 'Castilla y León' },
  { nuts2: 'ES42', iso: 'CM', name: 'Castilla-La Mancha' },
  { nuts2: 'ES43', iso: 'EX', name: 'Extremadura' },
  { nuts2: 'ES51', iso: 'CT', name: 'Cataluña' },
  { nuts2: 'ES52', iso: 'VC', name: 'Comunitat Valenciana' },
  { nuts2: 'ES53', iso: 'IB', name: 'Illes Balears' },
  { nuts2: 'ES61', iso: 'AN', name: 'Andalucía' },
  { nuts2: 'ES62', iso: 'MC', name: 'Región de Murcia' },
  { nuts2: 'ES63', iso: 'CE', name: 'Ciudad Autónoma de Ceuta' },
  { nuts2: 'ES64', iso: 'ML', name: 'Ciudad Autónoma de Melilla' },
  { nuts2: 'ES70', iso: 'CN', name: 'Canarias' },
]

export const NUTS2_BY_CODE: Record<string, CcaaMeta> = Object.fromEntries(
  SPAIN_NUTS2.map((c) => [c.nuts2, c]),
)
