/**
 * lib/turismo/ccaa.ts · Pernoctaciones / llegadas por CCAA · Sprint T2-ine.
 *
 * Distribución territorial del turismo a nivel de Comunidad Autónoma (NUTS2),
 * apto para un mapa choropleth (presión turística) y tabla de ranking.
 *
 * Fuente PRIMARIA: Eurostat JSON-stat (armonizado, comparable):
 *   - tour_occ_nin2 · pernoctaciones en establecimientos turísticos por NUTS2
 *   - tour_occ_arn2 · llegadas (arrivals) por NUTS2
 *   (c_resid=TOTAL, unit=NR, nace_r2=I551-I553). Confirmados vivos 2026-06-07
 *   con las 19 regiones ES (17 CCAA + Ceuta + Melilla), datos anuales.
 *
 * Las llegadas degradan de forma independiente (si tour_occ_arn2 falla, la
 * tabla se devuelve solo con pernoctaciones).
 *
 * Por CCAA: pernoctaciones + cuota nacional (%) + YoY; llegadas + cuota; código
 * ISO 3166-2 para el choropleth.
 *
 * Patrón Politeia: `buildCcaa` puro y testeable; fetch con caché + degradación.
 */
import {
  type TurismoEnvelope,
  type EurostatPoint,
  EUROSTAT_PUBLIC,
  eurostatFetch,
  parseJsonStat,
  round,
  yoy,
  cacheGet,
  cacheSet,
  SPAIN_NUTS2,
  NUTS2_BY_CODE,
} from './shared.ts'

const DS_NIGHTS = 'tour_occ_nin2'
const DS_ARRIVALS = 'tour_occ_arn2'
const CACHE_TTL_MS = 24 * 3600_000 // 24h · dato anual
const SOURCE_URL = `${EUROSTAT_PUBLIC}/databrowser/view/${DS_NIGHTS}`

const COMMON_FILTERS = {
  c_resid: 'TOTAL',
  unit: 'NR',
  nace_r2: 'I551-I553',
  sinceTimePeriod: '2022',
}

// ─────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────

export interface CcaaRow {
  ccaa: string
  /** Código ISO 3166-2:ES sin prefijo (CT, MD, AN, …) para el choropleth. */
  ccaa_iso: string
  /** Código NUTS2 Eurostat (ES51, ES30, …). */
  nuts2: string
  /** Pernoctaciones del último año disponible. */
  pernoctaciones: number | null
  /** Cuota de pernoctaciones sobre el total nacional (%). */
  cuota_pct: number | null
  /** Variación interanual de pernoctaciones (%). */
  yoy_pct: number | null
  /** Llegadas del último año (null si el dataset de llegadas degradó). */
  llegadas: number | null
  /** Cuota de llegadas sobre el total nacional (%). */
  llegadas_cuota_pct: number | null
}

export interface CcaaData {
  rows: CcaaRow[]
  /** Año de referencia de pernoctaciones. */
  year: number | null
  /** Total nacional de pernoctaciones (suma CCAA). */
  total_pernoctaciones: number | null
  /** true si las llegadas no pudieron resolverse. */
  arrivals_degraded: boolean
}

export type CcaaResponse = TurismoEnvelope<CcaaData>

// ─────────────────────────────────────────────────────────────────────────
// Helpers de extracción JSON-stat → mapa NUTS2 → valor del último año
// ─────────────────────────────────────────────────────────────────────────

/** Para cada NUTS2 ES, el valor del año más reciente y del año previo. */
interface RegionTwo {
  latest: number | null
  prev: number | null
  year: number | null
}

/**
 * Reduce los puntos JSON-stat a {NUTS2 → {latest, prev, year}} restringido a
 * las regiones ES. Pura.
 */
export function reduceByRegion(points: EurostatPoint[]): Record<string, RegionTwo> {
  // Agrupar por geo y ordenar por time.
  const byGeo: Record<string, { time: string; value: number | null }[]> = {}
  for (const p of points) {
    const geo = String(p.geo ?? '')
    if (!geo.startsWith('ES') || geo.length !== 4) continue
    if (!NUTS2_BY_CODE[geo]) continue
    const time = String(p.time ?? '')
    if (!time) continue
    ;(byGeo[geo] ||= []).push({ time, value: typeof p.value === 'number' ? p.value : null })
  }
  const out: Record<string, RegionTwo> = {}
  for (const [geo, arr] of Object.entries(byGeo)) {
    arr.sort((a, b) => a.time.localeCompare(b.time))
    // último con valor no nulo + el inmediatamente anterior con valor.
    const withVal = arr.filter((x) => x.value != null)
    const latest = withVal.length ? withVal[withVal.length - 1] : null
    const prev = withVal.length > 1 ? withVal[withVal.length - 2] : null
    out[geo] = {
      latest: latest?.value ?? null,
      prev: prev?.value ?? null,
      year: latest ? Number(latest.time) : null,
    }
  }
  return out
}

/**
 * Ensambla `CcaaData` a partir de los puntos de pernoctaciones y (opcional) de
 * llegadas. Pura: no hace red.
 */
export function buildCcaa(
  nightsPoints: EurostatPoint[],
  arrivalsPoints: EurostatPoint[] | null,
): CcaaData {
  const nights = reduceByRegion(nightsPoints)
  const arrivals = arrivalsPoints ? reduceByRegion(arrivalsPoints) : {}

  // Año de referencia = máximo año visto en nights.
  let year: number | null = null
  for (const r of Object.values(nights)) {
    if (r.year != null && (year == null || r.year > year)) year = r.year
  }

  // Total nacional pernoctaciones (suma de regiones con dato).
  let total = 0
  let totalHas = false
  for (const r of Object.values(nights)) {
    if (r.latest != null) {
      total += r.latest
      totalHas = true
    }
  }
  const totalPernoct = totalHas ? total : null

  // Total llegadas.
  let totalArr = 0
  let totalArrHas = false
  for (const r of Object.values(arrivals)) {
    if (r.latest != null) {
      totalArr += r.latest
      totalArrHas = true
    }
  }

  const rows: CcaaRow[] = SPAIN_NUTS2.map((meta) => {
    const n = nights[meta.nuts2]
    const a = arrivals[meta.nuts2]
    return {
      ccaa: meta.name,
      ccaa_iso: meta.iso,
      nuts2: meta.nuts2,
      pernoctaciones: n?.latest ?? null,
      cuota_pct:
        n?.latest != null && totalPernoct ? round((n.latest / totalPernoct) * 100, 1) : null,
      yoy_pct: n ? yoy(n.latest, n.prev) : null,
      llegadas: a?.latest ?? null,
      llegadas_cuota_pct:
        a?.latest != null && totalArrHas ? round((a.latest / totalArr) * 100, 1) : null,
    }
  })

  // Orden descendente por pernoctaciones.
  rows.sort((x, y) => (y.pernoctaciones ?? -1) - (x.pernoctaciones ?? -1))

  return {
    rows,
    year,
    total_pernoctaciones: totalPernoct,
    arrivals_degraded: !arrivalsPoints || !totalArrHas,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────────────────

export interface FetchCcaaOpts {
  noCache?: boolean
  timeoutMs?: number
}

export async function fetchCcaa(opts: FetchCcaaOpts = {}): Promise<CcaaResponse> {
  const fetched_at = new Date().toISOString()

  const cacheKey = 'ccaa:v1'
  if (!opts.noCache) {
    const hit = cacheGet<CcaaResponse>(cacheKey)
    if (hit) return hit
  }

  const [nightsRes, arrivalsRes] = await Promise.all([
    eurostatFetch(DS_NIGHTS, COMMON_FILTERS, { revalidate: 86400, timeoutMs: opts.timeoutMs }),
    eurostatFetch(DS_ARRIVALS, COMMON_FILTERS, { revalidate: 86400, timeoutMs: opts.timeoutMs }),
  ])

  // Pernoctaciones son obligatorias; si fallan, degradamos del todo.
  if ('error' in nightsRes) {
    return { ok: false, data: null, error: nightsRes.error, fetched_at, source_url: SOURCE_URL }
  }
  const nightsPoints = parseJsonStat(nightsRes.json)
  const arrivalsPoints = 'error' in arrivalsRes ? null : parseJsonStat(arrivalsRes.json)

  const data = buildCcaa(nightsPoints, arrivalsPoints)
  const anyData = data.rows.some((r) => r.pernoctaciones != null)
  if (!anyData) {
    return { ok: false, data: null, error: 'sin_datos_validos', fetched_at, source_url: SOURCE_URL }
  }

  const out: CcaaResponse = {
    ok: true,
    data,
    fetched_at,
    source_url: SOURCE_URL,
    partial: data.arrivals_degraded,
  }
  cacheSet(cacheKey, out, CACHE_TTL_MS)
  return out
}
