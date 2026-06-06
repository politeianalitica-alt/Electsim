/**
 * lib/turismo/residentes.ts · Turismo de residentes (INE ETR/FAMILITUR) · T2-ine.
 *
 * ETR = Encuesta de Turismo de Residentes (antes FAMILITUR). Captura la demanda
 * turística DOMÉSTICA: viajes que hacen los residentes en España, tanto con
 * destino interno (dentro de España) como emisor (al extranjero). Complementa
 * FRONTUR/EGATUR (que miden a los turistas internacionales que llegan).
 *
 * Devuelve:
 *   - serie_viajes        · serie temporal de viajes totales (trimestral)
 *   - serie_pernoctaciones· serie temporal de pernoctaciones totales
 *   - destino: { interno, emisor } del último periodo, cada uno con
 *     viajes / pernoctaciones / gasto_total / duración media + cuota %.
 *
 * Fuente: INE WSTempus · DATOS_TABLA/12422 = ETR "Viajes, pernoctaciones,
 * duración media y gasto por tipo de destino principal" (Total / Extranjera /
 * desgloses internos). Confirmada viva 2026-06-07 (serie trimestral; último
 * trimestre 2025: 14,5M viajes totales, de los que 2,1M extranjero).
 *
 * "Interno" se deriva como Total − Extranjera (los desgloses internos de la
 * tabla —Dentro de la CCAA, De otra CCAA, Dentro de la provincia— suman el
 * interior; restar Extranjera del Total es robusto y no depende de su
 * etiquetado exacto).
 *
 * Patrón Politeia: `buildResidentes` puro y testeable; fetch con caché +
 * degradación honesta.
 */
import {
  type TurismoEnvelope,
  type IneRawSerie,
  type InePoint,
  INE_BASE,
  INE_PUBLIC,
  ineTable,
  ineMapPoints,
  findSerie,
  lastPoint,
  round,
  cacheGet,
  cacheSet,
} from './shared.ts'

const TABLE_ETR_DESTINO = 12422
const CACHE_TTL_MS = 24 * 3600_000 // 24h · ETR trimestral
const SOURCE_URL = `${INE_BASE}/DATOS_TABLA/${TABLE_ETR_DESTINO}`

// ─────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────

export interface ResidentesDestino {
  /** Viajes en el último periodo. */
  viajes: number | null
  /** Pernoctaciones en el último periodo. */
  pernoctaciones: number | null
  /** Gasto total (miles €, como lo da INE). */
  gasto_total: number | null
  /** Duración media de los viajes (noches). */
  duracion_media: number | null
  /** Cuota de viajes sobre el total (%). */
  cuota_pct: number | null
}

export interface ResidentesData {
  /** Serie trimestral de viajes totales (ascendente). */
  serie_viajes: InePoint[]
  /** Serie trimestral de pernoctaciones totales. */
  serie_pernoctaciones: InePoint[]
  /** Último periodo, p.ej. "2025-Q4". */
  last_period: string | null
  /** Totales del último periodo. */
  total: { viajes: number | null; pernoctaciones: number | null; gasto_total: number | null }
  /** Desglose destino interno vs emisor del último periodo. */
  destino: {
    interno: ResidentesDestino
    emisor: ResidentesDestino
  }
}

export type ResidentesResponse = TurismoEnvelope<ResidentesData>

// ─────────────────────────────────────────────────────────────────────────
// Construcción PURA
// ─────────────────────────────────────────────────────────────────────────

/** Serie de una métrica para un grupo de destino (Total/Extranjera). */
function serieFor(series: IneRawSerie[], destino: string, metric: string): InePoint[] {
  const s = findSerie(
    series,
    [destino, metric, 'dato base'],
    ['porcentaje', 'tasa', 'acumulad'],
  )
  return ineMapPoints(s)
}

/** Valor de una métrica para un destino en un periodo concreto. */
function valueAt(series: IneRawSerie[], destino: string, metric: string, period: string | null): number | null {
  const pts = serieFor(series, destino, metric)
  if (!period) return lastPoint(pts)?.value ?? null
  const p = pts.find((x) => x.period === period)
  return p ? p.value : lastPoint(pts)?.value ?? null
}

/**
 * Ensambla `ResidentesData` de la tabla 12422. Pura: no hace red.
 * Interno = Total − Extranjera (cuando ambos disponibles).
 */
export function buildResidentes(series: IneRawSerie[]): ResidentesData {
  // Serie del Total (la métrica "Total. Viajes." es el primer destino).
  const serie_viajes = serieFor(series, 'total', 'viajes')
  const serie_pernoctaciones = serieFor(series, 'total', 'pernoctaciones')
  const last = lastPoint(serie_viajes) || lastPoint(serie_pernoctaciones)
  const period = last?.period ?? null

  const totViajes = valueAt(series, 'total', 'viajes', period)
  const totPernoct = valueAt(series, 'total', 'pernoctaciones', period)
  const totGasto = valueAt(series, 'total', 'gasto total', period)

  const extViajes = valueAt(series, 'extranjera', 'viajes', period)
  const extPernoct = valueAt(series, 'extranjera', 'pernoctaciones', period)
  const extGasto = valueAt(series, 'extranjera', 'gasto total', period)
  const extDur = valueAt(series, 'extranjera', 'duración media', period)

  // Interno = Total − Extranjera (null-safe).
  const intViajes = totViajes != null && extViajes != null ? totViajes - extViajes : null
  const intPernoct = totPernoct != null && extPernoct != null ? totPernoct - extPernoct : null
  const intGasto = totGasto != null && extGasto != null ? round(totGasto - extGasto, 2) : null
  // Duración media interna: pernoct interno / viajes interno (derivada).
  const intDur =
    intPernoct != null && intViajes != null && intViajes !== 0
      ? round(intPernoct / intViajes, 2)
      : null

  const emisor: ResidentesDestino = {
    viajes: extViajes,
    pernoctaciones: extPernoct,
    gasto_total: extGasto,
    duracion_media: extDur,
    cuota_pct: extViajes != null && totViajes ? round((extViajes / totViajes) * 100, 1) : null,
  }
  const interno: ResidentesDestino = {
    viajes: intViajes,
    pernoctaciones: intPernoct,
    gasto_total: intGasto,
    duracion_media: intDur,
    cuota_pct: intViajes != null && totViajes ? round((intViajes / totViajes) * 100, 1) : null,
  }

  return {
    serie_viajes,
    serie_pernoctaciones,
    last_period: period,
    total: { viajes: totViajes, pernoctaciones: totPernoct, gasto_total: totGasto },
    destino: { interno, emisor },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────────────────

export interface FetchResidentesOpts {
  /** Nº de observaciones de cada serie (default 12, clamp 4-40). */
  n?: number
  noCache?: boolean
  timeoutMs?: number
}

export async function fetchResidentes(
  opts: FetchResidentesOpts = {},
): Promise<ResidentesResponse> {
  const fetched_at = new Date().toISOString()
  const n = Number.isFinite(opts.n as number)
    ? Math.max(4, Math.min(40, opts.n as number))
    : 12

  const cacheKey = `residentes:${n}`
  if (!opts.noCache) {
    const hit = cacheGet<ResidentesResponse>(cacheKey)
    if (hit) return hit
  }

  const res = await ineTable(TABLE_ETR_DESTINO, n, { revalidate: 86400, timeoutMs: opts.timeoutMs })
  if ('error' in res) {
    return { ok: false, data: null, error: res.error, fetched_at, source_url: SOURCE_URL }
  }

  const data = buildResidentes(res.series)
  if (data.total.viajes == null && data.total.pernoctaciones == null) {
    return { ok: false, data: null, error: 'sin_datos_validos', fetched_at, source_url: SOURCE_URL }
  }

  const partial = data.destino.emisor.viajes == null || data.destino.interno.viajes == null
  const out: ResidentesResponse = { ok: true, data, fetched_at, source_url: INE_PUBLIC, partial }
  cacheSet(cacheKey, out, CACHE_TTL_MS)
  return out
}
