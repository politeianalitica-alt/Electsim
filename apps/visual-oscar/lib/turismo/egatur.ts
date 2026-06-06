/**
 * lib/turismo/egatur.ts · Gasto turístico (INE EGATUR) · Sprint T2-ine.
 *
 * EGATUR = Encuesta de Gasto Turístico. Mide el gasto de los turistas
 * internacionales (complementa FRONTUR, que cuenta llegadas).
 *
 * Métricas (las 4 que pidió el propietario):
 *   - gasto_total           · gasto agregado (millones €)
 *   - gasto_medio_persona   · € por turista (por viaje)
 *   - gasto_medio_diario    · € por turista y día
 *   - estancia_media        · duración media de los viajes (noches)
 *
 * Cada métrica con su serie + último valor + YoY.
 *
 * Fuente: INE WSTempus · DATOS_TABLA/23992 = EGATUR "Turista. Total. {métrica}.
 * Total Nacional. Dato base." (publicación ANUAL en esta tabla; INE también la
 * publica mensual pero la serie agregada nacional vive aquí de forma estable).
 * Confirmada viva 2026-06-07 (gasto total 2025 = 134.743 M€, gasto medio 1.392 €,
 * gasto medio diario 195 €, duración media 7,13 noches).
 *
 * El gasto total INE viene en MILLONES de euros (134743.32 = 134.743 M€); lo
 * dejamos tal cual (millones) y lo etiquetamos en `unit`.
 *
 * Patrón Politeia: `buildEgatur` puro y testeable; fetch con caché + degradación.
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
  cacheGet,
  cacheSet,
} from './shared.ts'

const TABLE_EGATUR = 23992
const CACHE_TTL_MS = 24 * 3600_000 // 24h · serie anual estable
const SOURCE_URL = `${INE_BASE}/DATOS_TABLA/${TABLE_EGATUR}`

// ─────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────

export interface EgaturMetric {
  /** Serie temporal ascendente. */
  serie: InePoint[]
  /** Último valor no nulo. */
  last: InePoint | null
  /** Variación interanual del último periodo (%). */
  yoy_pct: number | null
  /** Unidad legible. */
  unit: string
}

export interface EgaturData {
  gasto_total: EgaturMetric
  gasto_medio_persona: EgaturMetric
  gasto_medio_diario: EgaturMetric
  estancia_media: EgaturMetric
  /** Periodo del último dato común (p.ej. "2025"). */
  last_period: string | null
}

export type EgaturResponse = TurismoEnvelope<EgaturData>

// ─────────────────────────────────────────────────────────────────────────
// Construcción PURA
// ─────────────────────────────────────────────────────────────────────────

/** Extrae una métrica EGATUR (serie "Dato base", excluyendo tasas). */
function metric(
  series: IneRawSerie[],
  includes: string[],
  unit: string,
): EgaturMetric {
  const s = findSerie(series, [...includes, 'dato base'], ['tasa', 'acumulad'])
  const serie = ineMapPoints(s)
  const last = lastPoint(serie)
  return { serie, last, yoy_pct: yoyOf(serie, last), unit }
}

/** YoY del último punto vs el periodo anterior de la serie (anual). */
function yoyOf(serie: InePoint[], last: InePoint | null): number | null {
  if (!last || last.value == null) return null
  const idx = serie.findIndex((p) => p.period === last.period)
  if (idx <= 0) return null
  const prev = serie[idx - 1]
  if (!prev || prev.value == null || prev.value === 0) return null
  return +(((last.value - prev.value) / Math.abs(prev.value)) * 100).toFixed(2)
}

/**
 * Ensambla `EgaturData` a partir de las series crudas de la tabla 23992.
 * Pura: no hace red.
 */
export function buildEgatur(series: IneRawSerie[]): EgaturData {
  const gasto_total = metric(series, ['gasto total'], 'M€')
  const gasto_medio_persona = metric(series, ['gasto medio por persona'], '€/turista')
  const gasto_medio_diario = metric(series, ['gasto medio diario'], '€/día')
  const estancia_media = metric(series, ['duración media'], 'noches')

  // Periodo de referencia: el del gasto total (la métrica principal).
  const last_period = gasto_total.last?.period ?? null

  return {
    gasto_total,
    gasto_medio_persona,
    gasto_medio_diario,
    estancia_media,
    last_period,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────────────────

export interface FetchEgaturOpts {
  /** Nº de observaciones de cada serie (default 10, clamp 3-30). */
  n?: number
  noCache?: boolean
  timeoutMs?: number
}

export async function fetchEgatur(opts: FetchEgaturOpts = {}): Promise<EgaturResponse> {
  const fetched_at = new Date().toISOString()
  const n = Number.isFinite(opts.n as number)
    ? Math.max(3, Math.min(30, opts.n as number))
    : 10

  const cacheKey = `egatur:${n}`
  if (!opts.noCache) {
    const hit = cacheGet<EgaturResponse>(cacheKey)
    if (hit) return hit
  }

  const res = await ineTable(TABLE_EGATUR, n, { revalidate: 86400, timeoutMs: opts.timeoutMs })
  if ('error' in res) {
    return { ok: false, data: null, error: res.error, fetched_at, source_url: SOURCE_URL }
  }

  const data = buildEgatur(res.series)
  // Degradación honesta: si NINGUNA métrica trae dato, fallamos.
  const anyData =
    data.gasto_total.last?.value != null ||
    data.gasto_medio_persona.last?.value != null ||
    data.gasto_medio_diario.last?.value != null ||
    data.estancia_media.last?.value != null
  if (!anyData) {
    return { ok: false, data: null, error: 'sin_datos_validos', fetched_at, source_url: SOURCE_URL }
  }

  // partial si alguna de las 4 métricas falta.
  const partial =
    data.gasto_total.last?.value == null ||
    data.gasto_medio_persona.last?.value == null ||
    data.gasto_medio_diario.last?.value == null ||
    data.estancia_media.last?.value == null

  const out: EgaturResponse = { ok: true, data, fetched_at, source_url: INE_PUBLIC, partial }
  cacheSet(cacheKey, out, CACHE_TTL_MS)
  return out
}
