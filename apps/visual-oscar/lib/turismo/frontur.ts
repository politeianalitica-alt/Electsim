/**
 * lib/turismo/frontur.ts · Turistas internacionales (INE FRONTUR) · Sprint T2-ine.
 *
 * FRONTUR = Encuesta de Movimientos Turísticos en Frontera. Cuenta LLEGADAS de
 * turistas internacionales (no pernoctaciones, no excursionistas day-trip).
 *
 * Dos vistas, ambas de la misma fuente viva:
 *   - serie_total: serie mensual de turistas totales (últimos `months` meses).
 *   - por_pais   : desglose por mercado emisor (país de residencia) del último
 *     mes disponible, con cuota y variación interanual (YoY) por país.
 *
 * Fuente: INE WSTempus · DATOS_TABLA/10822 = "Turistas según país de
 * residencia. Total Nacional" (mensual). Confirmada viva 2026-06-07 con las
 * series por país: Alemania, Bélgica, Francia, Irlanda, Italia, Países Bajos,
 * Países Nórdicos, Portugal, Reino Unido, Rusia, Suiza, Resto de Europa,
 * Estados Unidos de América, Resto América, Resto del Mundo.
 *
 * El nombre de cada serie INE empieza por el país: "Alemania. Turista. Dato
 * base. Total Nacional." → filtramos por subcadena (patrón del repo).
 *
 * Patrón Politeia: helpers puros (`buildFrontur`) testables con fixtures;
 * fetch con caché 12h y degradación honesta (ok:false sin lanzar).
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
  yoy,
  round,
  cacheGet,
  cacheSet,
} from './shared.ts'

const TABLE_FRONTUR_PAISES = 10822
const CACHE_TTL_MS = 12 * 3600_000 // 12h · FRONTUR es mensual (T+25 días)
const SOURCE_URL = `${INE_BASE}/DATOS_TABLA/${TABLE_FRONTUR_PAISES}`

// ─────────────────────────────────────────────────────────────────────────
// Tipos públicos del cliente
// ─────────────────────────────────────────────────────────────────────────

export interface FronturPais {
  /** Etiqueta legible del mercado emisor. */
  pais: string
  /** Turistas en el último mes (puede ser null si la serie está hueca). */
  turistas: number | null
  /** Cuota sobre el total de ese mes (%). */
  cuota_pct: number | null
  /** Variación interanual vs el mismo mes del año previo (%). */
  yoy_pct: number | null
}

export interface FronturData {
  /** Serie mensual de turistas totales (ascendente). */
  serie_total: InePoint[]
  /** Desglose por mercado emisor del último mes. */
  por_pais: FronturPais[]
  /** Último punto de la serie total. */
  last: InePoint | null
  /** YoY del total (último mes vs mismo mes año previo). */
  yoy_pct: number | null
  /** Etiqueta del último periodo, p.ej. "2026-04". */
  last_period: string | null
}

export type FronturResponse = TurismoEnvelope<FronturData>

// ─────────────────────────────────────────────────────────────────────────
// Mercados emisores curados (orden + etiqueta de presentación).
// La cadena `match` localiza la serie por país en el `Nombre` INE.
// El propietario pidió: Reino Unido, Alemania, Francia, Países nórdicos,
// Italia, Países Bajos, EEUU, resto. Añadimos los demás emisores europeos
// disponibles para enriquecer (Portugal, Suiza, Bélgica, Irlanda) y
// agregamos el residuo en "Resto".
// ─────────────────────────────────────────────────────────────────────────

interface MarketDef {
  label: string
  /** Subcadenas que identifican la serie de ese mercado en el Nombre INE. */
  match: string[]
}

export const FRONTUR_MARKETS: MarketDef[] = [
  { label: 'Reino Unido', match: ['Reino Unido'] },
  { label: 'Alemania', match: ['Alemania'] },
  { label: 'Francia', match: ['Francia'] },
  { label: 'Países nórdicos', match: ['Países Nórdicos'] },
  { label: 'Italia', match: ['Italia'] },
  { label: 'Países Bajos', match: ['Países Bajos'] },
  { label: 'Estados Unidos', match: ['Estados Unidos'] },
  { label: 'Portugal', match: ['Portugal'] },
  { label: 'Suiza', match: ['Suiza'] },
  { label: 'Bélgica', match: ['Bélgica'] },
  { label: 'Irlanda', match: ['Irlanda'] },
]

// Series que NO son países individuales (totales/residuos) → se excluyen del
// match de mercados, y los residuos se suman aparte en "Resto".
const RESIDUAL_MATCHES = [
  'Resto de Europa',
  'Resto América',
  'Resto del Mundo',
  'Rusia',
]

/** Localiza la serie "Dato base" (no tasa, no acumulado) de un país. */
function paisDatoBase(series: IneRawSerie[], match: string[]): IneRawSerie | null {
  return findSerie(series, [...match, 'dato base'], ['tasa', 'acumulad'])
}

// ─────────────────────────────────────────────────────────────────────────
// Construcción PURA (testeable con fixtures)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Ensambla `FronturData` a partir de las series crudas de la tabla 10822.
 * - serie_total: de la serie "Total. ... Dato base".
 * - por_pais: para cada mercado curado toma su último valor, calcula cuota
 *   sobre el total del mes y YoY vs el mismo mes del año anterior. Añade
 *   "Resto" como total − sumatorio de mercados explícitos (>= 0).
 * Pura: no hace red.
 */
export function buildFrontur(series: IneRawSerie[]): FronturData {
  const totalSerie =
    findSerie(series, ['total', 'dato base'], ['tasa', 'acumulad']) ||
    series[0] ||
    null
  const serie_total = ineMapPoints(totalSerie)
  const last = lastPoint(serie_total)
  const lastPeriod = last?.period ?? null

  // YoY del total: busca el punto 12 meses antes del último periodo.
  const totalPrevYoY = yoyForPeriod(serie_total, lastPeriod)

  const totalLastVal = last?.value ?? null

  const por_pais: FronturPais[] = []
  let sumExplicit = 0
  for (const m of FRONTUR_MARKETS) {
    const s = paisDatoBase(series, m.match)
    if (!s) continue
    const pts = ineMapPoints(s)
    const lp = lastPeriodValue(pts, lastPeriod)
    const turistas = lp
    if (turistas != null) sumExplicit += turistas
    por_pais.push({
      pais: m.label,
      turistas,
      cuota_pct:
        turistas != null && totalLastVal ? round((turistas / totalLastVal) * 100, 1) : null,
      yoy_pct: yoyForPeriod(pts, lastPeriod),
    })
  }

  // "Resto": total − suma de mercados explícitos (incluye Rusia y los residuos
  // de la tabla). Solo si el total es conocido y queda residuo positivo.
  if (totalLastVal != null) {
    const resto = totalLastVal - sumExplicit
    if (resto > 0) {
      por_pais.push({
        pais: 'Resto',
        turistas: Math.round(resto),
        cuota_pct: round((resto / totalLastVal) * 100, 1),
        yoy_pct: null, // residuo agregado: el YoY por país no es significativo
      })
    }
  }

  // Orden descendente por turistas (los mercados líderes arriba).
  por_pais.sort((a, b) => (b.turistas ?? -1) - (a.turistas ?? -1))

  return {
    serie_total,
    por_pais,
    last,
    yoy_pct: totalPrevYoY,
    last_period: lastPeriod,
  }
}

/** Valor de una serie en un periodo concreto (o null). */
function lastPeriodValue(points: InePoint[], period: string | null): number | null {
  if (!period) return lastPoint(points)?.value ?? null
  const p = points.find((x) => x.period === period)
  return p ? p.value : lastPoint(points)?.value ?? null
}

/** YoY de una serie para `period` vs el mismo mes del año anterior. */
function yoyForPeriod(points: InePoint[], period: string | null): number | null {
  if (!period) return null
  const curr = points.find((x) => x.period === period)
  if (!curr || curr.value == null) return null
  // period "YYYY-MM" → un año antes "YYYY-1-MM"
  const m = period.match(/^(\d{4})(-.+)$/)
  if (!m) return null
  const prevPeriod = `${Number(m[1]) - 1}${m[2]}`
  const prev = points.find((x) => x.period === prevPeriod)
  if (!prev || prev.value == null) return null
  return yoy(curr.value, prev.value)
}

// Re-export para el residuo (usado en tests).
export { RESIDUAL_MATCHES }

// ─────────────────────────────────────────────────────────────────────────
// Fetch con caché + degradación
// ─────────────────────────────────────────────────────────────────────────

export interface FetchFronturOpts {
  /** Ventana de la serie total en meses (default 24, clamp 6-60). */
  months?: number
  noCache?: boolean
  timeoutMs?: number
}

export async function fetchFrontur(
  opts: FetchFronturOpts = {},
): Promise<FronturResponse> {
  const fetched_at = new Date().toISOString()
  const months = Number.isFinite(opts.months as number)
    ? Math.max(6, Math.min(60, opts.months as number))
    : 24

  const cacheKey = `frontur:${months}`
  if (!opts.noCache) {
    const hit = cacheGet<FronturResponse>(cacheKey)
    if (hit) return hit
  }

  const res = await ineTable(TABLE_FRONTUR_PAISES, months, {
    revalidate: 43200,
    timeoutMs: opts.timeoutMs,
  })
  if ('error' in res) {
    return { ok: false, data: null, error: res.error, fetched_at, source_url: SOURCE_URL }
  }

  const data = buildFrontur(res.series)
  if (!data.last || data.last.value == null) {
    return { ok: false, data: null, error: 'sin_datos_validos', fetched_at, source_url: SOURCE_URL }
  }

  const out: FronturResponse = {
    ok: true,
    data,
    fetched_at,
    source_url: INE_PUBLIC,
    partial: data.por_pais.length === 0,
  }
  cacheSet(cacheKey, out, CACHE_TTL_MS)
  return out
}
