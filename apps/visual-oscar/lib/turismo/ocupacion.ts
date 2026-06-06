/**
 * lib/turismo/ocupacion.ts · Ocupación por TIPO de alojamiento (INE) · T2-ine.
 *
 * Cuatro tipos de alojamiento colectivo, cada uno con sus encuestas INE:
 *   - hoteles      · EOH  (Encuesta de Ocupación Hotelera)
 *   - apartamentos · EOAP (Apartamentos Turísticos)
 *   - campings     · EOAC (Campings / acampamentos)
 *   - rural        · EOTR (Alojamientos de Turismo Rural)
 *
 * Por tipo: pernoctaciones (último mes + serie), grado de ocupación (%) y
 * estancia media (noches). Para hoteles, además ADR y RevPAR (€) de la
 * estadística de rentabilidad hotelera (IRSH). Cada métrica y cada tipo
 * DEGRADAN de forma independiente (null si la fuente falla), nunca lanza.
 *
 * Tablas INE confirmadas vivas (probe 2026-06-07, dato mensual):
 *   Pernoctaciones (Nacional · "Pernoctaciones. ... Total."):
 *     hotel 2074 · apt 1993 · camping 2016 · rural 1995
 *   Grado de ocupación (Nacional):
 *     hotel  2011 ("Nacional. Grado de ocupación por plazas." · agregado)
 *     apt    2021 ("Nacional. Grado de ocupación por plazas.")
 *     camping 2042 ("Nacional. Grado de ocupación por parcelas. Total acampamentos.")
 *     rural  2046 ("Nacional. Grado de ocupación por plazas.")
 *   Estancia media (noches):
 *     2024 (unificada por tipo: hoteleros / apartamentos / acampamentos)
 *     rural 2023 ("Nacional. Estancia media")
 *   Rentabilidad hotelera (IRSH):
 *     ADR 2058 ("ADR. Nacional. Dato.") · RevPAR 2056 ("RevPAR. Nacional. Dato.")
 *
 * Patrón Politeia: `buildOcupacion` puro y testeable; fetch en paralelo con
 * caché + degradación por bloque.
 */
import {
  type TurismoEnvelope,
  type IneRawSerie,
  type InePoint,
  INE_PUBLIC,
  ineTable,
  ineMapPoints,
  findSerie,
  lastPoint,
  cacheGet,
  cacheSet,
} from './shared.ts'

const CACHE_TTL_MS = 12 * 3600_000 // 12h · ocupación mensual
const SOURCE_URL = INE_PUBLIC

// ─────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────

export type AlojamientoTipo = 'hoteles' | 'apartamentos' | 'campings' | 'rural'

export interface OcupacionTipo {
  tipo: AlojamientoTipo
  label: string
  /** Pernoctaciones del último mes. */
  pernoctaciones: number | null
  /** Serie mensual de pernoctaciones (ascendente). */
  serie_pernoctaciones: InePoint[]
  /** Grado de ocupación por plazas (%) del último mes. */
  grado_ocupacion_pct: number | null
  /** Estancia media (noches). */
  estancia_media: number | null
  /** ADR · tarifa media diaria (€) · solo hoteles. */
  adr_eur: number | null
  /** RevPAR · ingreso por habitación disponible (€) · solo hoteles. */
  revpar_eur: number | null
  /** Periodo del último dato de pernoctaciones. */
  last_period: string | null
  /** true si alguna métrica esperada de este tipo no llegó. */
  degraded: boolean
}

export interface OcupacionData {
  tipos: OcupacionTipo[]
  last_period: string | null
}

export type OcupacionResponse = TurismoEnvelope<OcupacionData>

// ─────────────────────────────────────────────────────────────────────────
// Definición de cada tipo: tablas + cómo localizar cada serie por nombre
// ─────────────────────────────────────────────────────────────────────────

interface TipoDef {
  tipo: AlojamientoTipo
  label: string
  pernoctTable: number
  gradoTable: number
  gradoIncludes: string[]
  gradoExcludes: string[]
  /** Tabla de estancia + filtro de nombre. */
  estanciaTable: number
  estanciaIncludes: string[]
  /** Solo hoteles tienen ADR/RevPAR. */
  hasRentabilidad: boolean
}

export const TIPO_DEFS: TipoDef[] = [
  {
    tipo: 'hoteles',
    label: 'Hoteles',
    pernoctTable: 2074,
    gradoTable: 2011,
    gradoIncludes: ['nacional', 'grado de ocupación por plazas'],
    // Excluir desgloses por categoría de estrellas (queremos el agregado).
    gradoExcludes: ['estrella', 'semana', 'plata', 'oro'],
    estanciaTable: 2024,
    estanciaIncludes: ['hoteleros', 'estancia media'],
    hasRentabilidad: true,
  },
  {
    tipo: 'apartamentos',
    label: 'Apartamentos turísticos',
    pernoctTable: 1993,
    gradoTable: 2021,
    gradoIncludes: ['nacional', 'grado de ocupación por plazas'],
    gradoExcludes: ['semana', 'apartamentos'], // queremos "por plazas", no "por apartamentos"
    estanciaTable: 2024,
    estanciaIncludes: ['apartamentos', 'estancia media'],
    hasRentabilidad: false,
  },
  {
    tipo: 'campings',
    label: 'Campings',
    pernoctTable: 2016,
    gradoTable: 2042,
    gradoIncludes: ['nacional', 'grado de ocupación por parcelas', 'total acampamentos'],
    gradoExcludes: ['semana'],
    estanciaTable: 2024,
    estanciaIncludes: ['acampamentos', 'estancia media'],
    hasRentabilidad: false,
  },
  {
    tipo: 'rural',
    label: 'Turismo rural',
    pernoctTable: 1995,
    gradoTable: 2046,
    gradoIncludes: ['nacional', 'grado de ocupación por plazas'],
    gradoExcludes: ['semana', 'habitaciones'],
    estanciaTable: 2023,
    estanciaIncludes: ['nacional', 'estancia media'],
    hasRentabilidad: false,
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Construcción PURA · recibe las series crudas ya descargadas
// ─────────────────────────────────────────────────────────────────────────

/** Mapa de tablas crudas: tableId → series[] (o null si la descarga falló). */
export type RawTables = Record<number, IneRawSerie[] | null>

/** Pernoctaciones nacionales "Total" (residentes + extranjeros). */
function pernoctSerie(series: IneRawSerie[] | null): InePoint[] {
  if (!series) return []
  // "Nacional. Pernoctaciones. ... Total." — excluye residentes/extranjero y tasas.
  const s =
    findSerie(series, ['nacional', 'pernoctaciones', 'total'], ['residentes', 'extranjero', 'tasa', 'categorías']) ||
    findSerie(series, ['nacional', 'pernoctaciones'], ['residentes', 'extranjero', 'tasa'])
  return ineMapPoints(s)
}

/** Construye un OcupacionTipo desde las tablas crudas. Pura. */
export function buildTipo(def: TipoDef, raw: RawTables): OcupacionTipo {
  // Pernoctaciones
  const serie_pernoctaciones = pernoctSerie(raw[def.pernoctTable])
  const lastP = lastPoint(serie_pernoctaciones)

  // Grado de ocupación
  const gradoSeries = raw[def.gradoTable]
  const gradoSerie = gradoSeries
    ? findSerie(gradoSeries, def.gradoIncludes, [...def.gradoExcludes, 'tasa'])
    : null
  const grado_ocupacion_pct = gradoSerie ? lastPoint(ineMapPoints(gradoSerie))?.value ?? null : null

  // Estancia media
  const estSeries = raw[def.estanciaTable]
  const estSerie = estSeries
    ? findSerie(estSeries, def.estanciaIncludes, ['tasa'])
    : null
  const estancia_media = estSerie ? lastPoint(ineMapPoints(estSerie))?.value ?? null : null

  // ADR / RevPAR (solo hoteles · tablas 2058 / 2056)
  let adr_eur: number | null = null
  let revpar_eur: number | null = null
  if (def.hasRentabilidad) {
    const adrSeries = raw[2058]
    const adrSerie = adrSeries ? findSerie(adrSeries, ['adr', 'nacional', 'dato'], ['tasa', 'estrella', 'oro', 'plata']) : null
    adr_eur = adrSerie ? lastPoint(ineMapPoints(adrSerie))?.value ?? null : null

    const revSeries = raw[2056]
    const revSerie = revSeries ? findSerie(revSeries, ['revpar', 'nacional', 'dato'], ['tasa', 'estrella', 'oro', 'plata']) : null
    revpar_eur = revSerie ? lastPoint(ineMapPoints(revSerie))?.value ?? null : null
  }

  const expectedMetrics = def.hasRentabilidad ? 5 : 3
  const gotMetrics =
    (lastP?.value != null ? 1 : 0) +
    (grado_ocupacion_pct != null ? 1 : 0) +
    (estancia_media != null ? 1 : 0) +
    (def.hasRentabilidad ? (adr_eur != null ? 1 : 0) + (revpar_eur != null ? 1 : 0) : 0)

  return {
    tipo: def.tipo,
    label: def.label,
    pernoctaciones: lastP?.value ?? null,
    serie_pernoctaciones,
    grado_ocupacion_pct,
    estancia_media,
    adr_eur,
    revpar_eur,
    last_period: lastP?.period ?? null,
    degraded: gotMetrics < expectedMetrics,
  }
}

/** Ensambla todos los tipos. Pura. */
export function buildOcupacion(raw: RawTables): OcupacionData {
  const tipos = TIPO_DEFS.map((def) => buildTipo(def, raw))
  // Periodo de referencia: el más reciente entre los tipos con dato.
  let last_period: string | null = null
  for (const t of tipos) {
    if (t.last_period && (!last_period || t.last_period > last_period)) {
      last_period = t.last_period
    }
  }
  return { tipos, last_period }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch en paralelo + caché
// ─────────────────────────────────────────────────────────────────────────

/** IDs de todas las tablas necesarias (deduplicadas). */
const ALL_TABLES: number[] = (() => {
  const set = new Set<number>()
  for (const d of TIPO_DEFS) {
    set.add(d.pernoctTable)
    set.add(d.gradoTable)
    set.add(d.estanciaTable)
  }
  set.add(2058) // ADR hotel
  set.add(2056) // RevPAR hotel
  return [...set]
})()

export interface FetchOcupacionOpts {
  /** Nº de observaciones por serie (default 24, clamp 6-48). */
  months?: number
  noCache?: boolean
  timeoutMs?: number
}

export async function fetchOcupacion(
  opts: FetchOcupacionOpts = {},
): Promise<OcupacionResponse> {
  const fetched_at = new Date().toISOString()
  const months = Number.isFinite(opts.months as number)
    ? Math.max(6, Math.min(48, opts.months as number))
    : 24

  const cacheKey = `ocupacion:${months}`
  if (!opts.noCache) {
    const hit = cacheGet<OcupacionResponse>(cacheKey)
    if (hit) return hit
  }

  // Descarga todas las tablas en paralelo; cada una degrada a null si falla.
  const results = await Promise.all(
    ALL_TABLES.map(async (id) => {
      const r = await ineTable(id, months, { revalidate: 43200, timeoutMs: opts.timeoutMs })
      return [id, 'error' in r ? null : r.series] as const
    }),
  )
  const raw: RawTables = {}
  for (const [id, series] of results) raw[id] = series

  const data = buildOcupacion(raw)
  // Falla solo si NINGÚN tipo trae pernoctaciones (toda la fuente caída).
  const anyData = data.tipos.some((t) => t.pernoctaciones != null)
  if (!anyData) {
    return { ok: false, data: null, error: 'sin_datos_validos', fetched_at, source_url: SOURCE_URL }
  }

  const partial = data.tipos.some((t) => t.degraded)
  const out: OcupacionResponse = { ok: true, data, fetched_at, source_url: SOURCE_URL, partial }
  cacheSet(cacheKey, out, CACHE_TTL_MS)
  return out
}
