/**
 * lib/turismo/comparativa-ue.ts · España vs Francia/Italia/Portugal/UE · T2-ine.
 *
 * Benchmark europeo del turismo para barras comparativas. Por país:
 *   - pernoctaciones · anuales en establecimientos turísticos (tour_occ_ninat)
 *   - llegadas       · anuales (tour_occ_arnat)
 *   - pib_turistico_pct · ingresos por viajes (balanza de pagos, "Travel"
 *     créditos) como % del PIB nominal · derivado server-side de
 *     bop_its6_det (bop_item=SC, stk_flow=CRE) ÷ nama_10_gdp (B1GQ, CP_MEUR).
 *
 * Países: España (ES), Francia (FR), Italia (IT), Portugal (PT) y la UE-27
 * (EU27_2020) como referencia. Cada métrica degrada de forma independiente.
 *
 * Fuente: Eurostat JSON-stat (4 datasets, todos confirmados vivos 2026-06-07).
 *
 * Patrón Politeia: `buildComparativaUe` puro y testeable; fetch en paralelo
 * con caché + degradación honesta.
 */
import {
  type TurismoEnvelope,
  type EurostatPoint,
  EUROSTAT_PUBLIC,
  eurostatFetch,
  parseJsonStat,
  round,
  cacheGet,
  cacheSet,
} from './shared.ts'

const DS_NIGHTS = 'tour_occ_ninat'
const DS_ARRIVALS = 'tour_occ_arnat'
const DS_BOP = 'bop_its6_det'
const DS_GDP = 'nama_10_gdp'
const CACHE_TTL_MS = 24 * 3600_000 // 24h · datos anuales
const SOURCE_URL = `${EUROSTAT_PUBLIC}/databrowser/view/${DS_NIGHTS}`

// Países comparados (código Eurostat → etiqueta). EU27 al final como referencia.
export const COMPARE_GEOS: { geo: string; label: string; isEu: boolean }[] = [
  { geo: 'ES', label: 'España', isEu: false },
  { geo: 'FR', label: 'Francia', isEu: false },
  { geo: 'IT', label: 'Italia', isEu: false },
  { geo: 'PT', label: 'Portugal', isEu: false },
  { geo: 'EU27_2020', label: 'UE-27', isEu: true },
]

const GEO_LIST = COMPARE_GEOS.map((g) => g.geo)

// ─────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────

export interface ComparativaPais {
  geo: string
  pais: string
  /** true si es el agregado UE-27 (referencia, no país). */
  es_ue: boolean
  /** Pernoctaciones anuales (último año común). */
  pernoctaciones: number | null
  /** Llegadas anuales (último año común). */
  llegadas: number | null
  /** Ingresos por turismo (Travel, balanza de pagos) como % del PIB. */
  pib_turistico_pct: number | null
}

export interface ComparativaUeData {
  paises: ComparativaPais[]
  /** Año de referencia de pernoctaciones. */
  year_pernoctaciones: number | null
  /** Año de referencia del %PIB turístico. */
  year_pib: number | null
}

export type ComparativaUeResponse = TurismoEnvelope<ComparativaUeData>

// ─────────────────────────────────────────────────────────────────────────
// Helpers de extracción JSON-stat → {geo → último valor}
// ─────────────────────────────────────────────────────────────────────────

interface GeoVal {
  value: number | null
  year: number | null
}

/** Último valor no nulo por geo (entre los geos pedidos). Pura. */
export function latestByGeo(points: EurostatPoint[]): Record<string, GeoVal> {
  const byGeo: Record<string, { time: string; value: number | null }[]> = {}
  for (const p of points) {
    const geo = String(p.geo ?? '')
    if (!GEO_LIST.includes(geo)) continue
    const time = String(p.time ?? '')
    if (!time) continue
    ;(byGeo[geo] ||= []).push({ time, value: typeof p.value === 'number' ? p.value : null })
  }
  const out: Record<string, GeoVal> = {}
  for (const [geo, arr] of Object.entries(byGeo)) {
    arr.sort((a, b) => a.time.localeCompare(b.time))
    const withVal = arr.filter((x) => x.value != null)
    const last = withVal.length ? withVal[withVal.length - 1] : null
    out[geo] = { value: last?.value ?? null, year: last ? Number(last.time) : null }
  }
  return out
}

/**
 * Para %PIB necesitamos travel y gdp del MISMO año por geo. Devuelve, por geo,
 * el % usando el año más reciente en que ambos existen. Pura.
 */
export function pctGdpByGeo(
  travelPoints: EurostatPoint[],
  gdpPoints: EurostatPoint[],
): { byGeo: Record<string, number | null>; year: number | null } {
  const travel = bucketByGeoYear(travelPoints)
  const gdp = bucketByGeoYear(gdpPoints)
  const out: Record<string, number | null> = {}
  let refYear: number | null = null
  for (const geo of GEO_LIST) {
    const t = travel[geo] || {}
    const g = gdp[geo] || {}
    // años comunes con ambos valores, desc.
    const years = Object.keys(t)
      .filter((y) => t[y] != null && g[y] != null)
      .map(Number)
      .sort((a, b) => b - a)
    if (years.length === 0) {
      out[geo] = null
      continue
    }
    const y = years[0]
    const gv = g[String(y)]!
    const tv = t[String(y)]!
    out[geo] = gv !== 0 ? round((tv / gv) * 100, 2) : null
    if (refYear == null || y > refYear) refYear = y
  }
  return { byGeo: out, year: refYear }
}

/** {geo → {year → value}}. */
function bucketByGeoYear(points: EurostatPoint[]): Record<string, Record<string, number | null>> {
  const out: Record<string, Record<string, number | null>> = {}
  for (const p of points) {
    const geo = String(p.geo ?? '')
    if (!GEO_LIST.includes(geo)) continue
    const time = String(p.time ?? '')
    if (!time) continue
    ;(out[geo] ||= {})[time] = typeof p.value === 'number' ? p.value : null
  }
  return out
}

/**
 * Ensambla `ComparativaUeData`. Pura: recibe los 4 sets de puntos ya parseados
 * (arrivals/bop/gdp pueden ser null si degradaron).
 */
export function buildComparativaUe(
  nightsPoints: EurostatPoint[],
  arrivalsPoints: EurostatPoint[] | null,
  travelPoints: EurostatPoint[] | null,
  gdpPoints: EurostatPoint[] | null,
): ComparativaUeData {
  const nights = latestByGeo(nightsPoints)
  const arrivals = arrivalsPoints ? latestByGeo(arrivalsPoints) : {}
  const pib =
    travelPoints && gdpPoints
      ? pctGdpByGeo(travelPoints, gdpPoints)
      : { byGeo: {} as Record<string, number | null>, year: null }

  let yearNights: number | null = null
  for (const v of Object.values(nights)) {
    if (v.year != null && (yearNights == null || v.year > yearNights)) yearNights = v.year
  }

  const paises: ComparativaPais[] = COMPARE_GEOS.map((g) => ({
    geo: g.geo,
    pais: g.label,
    es_ue: g.isEu,
    pernoctaciones: nights[g.geo]?.value ?? null,
    llegadas: arrivals[g.geo]?.value ?? null,
    pib_turistico_pct: pib.byGeo[g.geo] ?? null,
  }))

  return { paises, year_pernoctaciones: yearNights, year_pib: pib.year }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────────────────

export interface FetchComparativaUeOpts {
  noCache?: boolean
  timeoutMs?: number
}

export async function fetchComparativaUe(
  opts: FetchComparativaUeOpts = {},
): Promise<ComparativaUeResponse> {
  const fetched_at = new Date().toISOString()

  const cacheKey = 'comparativa-ue:v1'
  if (!opts.noCache) {
    const hit = cacheGet<ComparativaUeResponse>(cacheKey)
    if (hit) return hit
  }

  const since = { sinceTimePeriod: '2022' }
  const reval = { revalidate: 86400, timeoutMs: opts.timeoutMs }

  const [nightsRes, arrivalsRes, bopRes, gdpRes] = await Promise.all([
    eurostatFetch(DS_NIGHTS, { c_resid: 'TOTAL', unit: 'NR', nace_r2: 'I551-I553', geo: GEO_LIST, ...since }, reval),
    eurostatFetch(DS_ARRIVALS, { c_resid: 'TOTAL', unit: 'NR', nace_r2: 'I551-I553', geo: GEO_LIST, ...since }, reval),
    eurostatFetch(DS_BOP, { bop_item: 'SC', stk_flow: 'CRE', partner: 'WRL_REST', currency: 'MIO_EUR', geo: GEO_LIST, ...since }, reval),
    eurostatFetch(DS_GDP, { na_item: 'B1GQ', unit: 'CP_MEUR', geo: GEO_LIST, ...since }, reval),
  ])

  // Pernoctaciones obligatorias; el resto degrada a null.
  if ('error' in nightsRes) {
    return { ok: false, data: null, error: nightsRes.error, fetched_at, source_url: SOURCE_URL }
  }
  const nightsPoints = parseJsonStat(nightsRes.json)
  const arrivalsPoints = 'error' in arrivalsRes ? null : parseJsonStat(arrivalsRes.json)
  const travelPoints = 'error' in bopRes ? null : parseJsonStat(bopRes.json)
  const gdpPoints = 'error' in gdpRes ? null : parseJsonStat(gdpRes.json)

  const data = buildComparativaUe(nightsPoints, arrivalsPoints, travelPoints, gdpPoints)
  const anyData = data.paises.some((p) => p.pernoctaciones != null)
  if (!anyData) {
    return { ok: false, data: null, error: 'sin_datos_validos', fetched_at, source_url: SOURCE_URL }
  }

  const partial =
    !arrivalsPoints ||
    !travelPoints ||
    !gdpPoints ||
    data.paises.some((p) => p.llegadas == null || p.pib_turistico_pct == null)

  const out: ComparativaUeResponse = { ok: true, data, fetched_at, source_url: SOURCE_URL, partial }
  cacheSet(cacheKey, out, CACHE_TTL_MS)
  return out
}
