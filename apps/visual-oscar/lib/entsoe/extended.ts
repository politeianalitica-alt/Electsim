/**
 * ENTSO-E Transparency Platform · documentos AVANZADOS · Sprint Energía S3+
 *
 * Este módulo EXPRIME la Web API de ENTSO-E con tipos de documento que el
 * cliente base (`lib/entsoe/client.ts`) no cubría: carga total (real y
 * previsión), previsiones eólica/solar y de generación, capacidad instalada
 * agregada, indisponibilidades de unidades de generación (outages), embalses
 * hidráulicos, intercambios comerciales programados y precios de desvío
 * (imbalance). NO toca ni reimplementa nada de `client.ts`: REUTILIZA su capa
 * S3 (auth con token, caché TTL 1h, manejo de Acknowledgement, degradación):
 *
 *   - `entsoeFetchRaw(query, timeoutMs)`  → fetch crudo XML, NUNCA lanza.
 *   - `parseTimeSeries(xml, 'quantity')`  → parser regex de TimeSeries/Period.
 *   - `periodForDays(days)`               → ventana UTC yyyyMMddHHmm.
 *   - `PSR_TYPE_LABELS`                    → etiquetas humanas de psrType.
 *   - `EntsoeRawQuery`                     → tipo de query (campos opcionales ya
 *                                            previstos: businessType, psrType,
 *                                            controlArea_Domain, etc.).
 *
 * ── Degradación limpia (CLAUDE.md) ────────────────────────────────────────
 *   Si falta ENTSOE_SECURITY_TOKEN, `entsoeFetchRaw` ya devuelve
 *   `{ ok:false, error:'token_missing · …' }`; cada función de aquí lo propaga
 *   como `{ ok:false, error, fetched_at, source_url }`. NUNCA lanza, NUNCA
 *   inventa datos: ante fallo de fuente → `ok:false` o arrays vacíos.
 *
 * ── Mapeo ENTSO-E autoritativo (de entsoe-py · documentado por función) ────
 *   A65 Total Load          · processType A16 (real) | A01 (day-ahead)
 *   A69 Wind & Solar fcst    · processType A01 · psrType B16/B18/B19
 *   A71 Generation forecast  · processType A01
 *   A68 Installed capacity   · processType A33 · periodo = año completo
 *   A80 Generation outages   · Unavailability_MarketDocument (parser dedicado)
 *   A72 Hydro reservoirs     · processType A16 · resolución P7D
 *   A09 Scheduled exchanges  · contract_MarketAgreement.type A05 (day-ahead)
 *   A85 Imbalance prices     · Balancing_MarketDocument (parser tolerante)
 *
 * El token es server-side (Vercel env). Estas funciones se llaman desde route
 * handlers (app/api/entsoe/*); NUNCA exponer el token al cliente.
 *
 * Docs: https://transparency.entsoe.eu · entsoe-py mappings/parsers.
 */
import type { EntsoePoint, EntsoeResponse } from '@/lib/energia/types'
import {
  entsoeFetchRaw,
  parseTimeSeries,
  PSR_TYPE_LABELS,
} from './client.ts'
import { resolveZone, type EntsoeZoneCode } from './zones.ts'

const PUBLIC_URL = 'https://transparency.entsoe.eu'

// ─────────────────────────────────────────────────────────────────────────
// Tipos de retorno (todos exportados)
// ─────────────────────────────────────────────────────────────────────────

/** Demanda total (A65): real (A16) o previsión (A01). Serie + estadísticos MW. */
export interface EntsoeTotalLoad {
  zone: string
  eic: string
  /** Resolución de la serie en minutos (típicamente 15 o 60). */
  resolution_min: number
  /** Puntos horarios de demanda (MW), ascendente por timestamp. */
  points: EntsoePoint[]
  /** Pico de demanda en el periodo (MW), null si vacío. */
  peak_mw: number | null
  /** Mínimo de demanda en el periodo (MW), null si vacío. */
  min_mw: number | null
  /** Demanda media en el periodo (MW), null si vacío. */
  avg_mw: number | null
}

/** Previsión por tecnología (A69 eólica/solar) en una zona. */
export interface EntsoeWindSolarTech {
  /** Código PSR type (B16 solar, B18 eólica offshore, B19 eólica onshore). */
  psr_type: string
  /** Etiqueta humana de la tecnología. */
  label: string
  /** Puntos horarios de previsión (MW), ascendente por timestamp. */
  points: EntsoePoint[]
  /** Previsión media en el periodo (MW), null si vacío. */
  avg_mw: number | null
  /** Pico de previsión en el periodo (MW), null si vacío. */
  peak_mw: number | null
}

/** Previsión eólica & solar day-ahead (A69) de una zona, por tecnología. */
export interface EntsoeWindSolarForecast {
  zone: string
  eic: string
  /** Una entrada por psrType solicitado (solar, eólica offshore, onshore). */
  by_tech: EntsoeWindSolarTech[]
}

/** Previsión de generación total day-ahead (A71) de una zona. */
export interface EntsoeGenerationForecast {
  zone: string
  eic: string
  /** Puntos horarios de previsión total (MW), ascendente por timestamp. */
  points: EntsoePoint[]
  /** Previsión media en el periodo (MW), null si vacío. */
  avg_mw: number | null
  /** Pico de previsión en el periodo (MW), null si vacío. */
  peak_mw: number | null
}

/** Capacidad instalada por tecnología (A68) en una zona, para un año. */
export interface EntsoeInstalledCapacityItem {
  /** Código PSR type (ej. "B16"). */
  psr_type: string
  /** Etiqueta humana de la tecnología. */
  label: string
  /** Capacidad instalada en MW. */
  mw: number
}

/** Capacidad instalada agregada (A68/A33) de una zona, para un año. */
export interface EntsoeInstalledCapacity {
  zone: string
  eic: string
  /** Año de referencia del dato. */
  year: number
  /** Desglose por tecnología, ordenado de mayor a menor MW. */
  by_type: EntsoeInstalledCapacityItem[]
  /** Capacidad total instalada (suma de tecnologías) en MW. */
  total_mw: number
}

/** Un registro de indisponibilidad de una unidad de generación (A80). */
export interface EntsoeOutageRecord {
  /** Identificador estable derivado de unidad+ventana (para keys de React). */
  id: string
  /** Nombre de la unidad/grupo de generación afectada. */
  unidad: string
  /** Código PSR type de la unidad (ej. "B14"), o '' si no se declara. */
  psr_type: string
  /** Etiqueta humana de la tecnología. */
  tecnologia: string
  /** Potencia nominal de la unidad (MW), null si no se declara. */
  nominal_mw: number | null
  /** Capacidad disponible durante la indisponibilidad (MW), null si no consta. */
  disponible_mw: number | null
  /** Capacidad indisponible (nominal - disponible) en MW, null si no calculable. */
  indisponible_mw: number | null
  /** Inicio de la ventana de indisponibilidad (string ISO-like crudo), null. */
  desde: string | null
  /** Fin de la ventana de indisponibilidad (string ISO-like crudo), null. */
  hasta: string | null
  /** Naturaleza de la indisponibilidad. */
  tipo: 'planned' | 'forced' | 'desconocido'
  /** Motivo declarado de la indisponibilidad, null si ausente. */
  razon: string | null
}

/** Indisponibilidades de unidades de generación (A80) de una zona. */
export interface EntsoeGenerationOutages {
  zone: string
  eic: string
  /** Registros de outage, ordenados por indisponible_mw descendente (máx 100). */
  outages: EntsoeOutageRecord[]
  /** Suma de capacidad indisponible de todos los registros (MW). */
  total_indisponible_mw: number
  /** Nº de registros devueltos. */
  n: number
}

/** Un punto de la serie de embalses/almacenamiento hidráulico (A72). */
export interface EntsoeHydroPoint {
  /** ISO timestamp del punto. */
  timestamp: string
  /** Energía almacenada en MWh. */
  mwh: number
}

/** Embalses y almacenamiento hidráulico (A72/A16, semanal) de una zona. */
export interface EntsoeHydroReservoirs {
  zone: string
  eic: string
  /** Serie semanal de almacenamiento (MWh), ascendente por timestamp. */
  points: EntsoeHydroPoint[]
  /** Último valor de almacenamiento disponible (MWh), null si vacío. */
  latest_mwh: number | null
  /** Fecha (ISO) del último valor disponible, null si vacío. */
  latest_date: string | null
}

/** Intercambios comerciales programados day-ahead (A09) entre dos zonas. */
export interface EntsoeScheduledExchanges {
  /** Zona origen (clave corta). */
  from: string
  /** Zona destino (clave corta). */
  to: string
  /** Puntos horarios de intercambio programado (MW), ascendente. */
  points: EntsoePoint[]
  /** Energía total programada en el periodo (MWh, suma de puntos). */
  total_mwh: number
}

/** Un punto de la serie de precios de desvío (A85). */
export interface EntsoeImbalancePoint {
  /** ISO timestamp del punto. */
  timestamp: string
  /** Precio de desvío en €/MWh. */
  eur_mwh: number
}

/** Precios de desvío / imbalance (A85) de una zona de control. */
export interface EntsoeImbalancePrices {
  zone: string
  eic: string
  /** Serie de precios de desvío (€/MWh), ascendente por timestamp. */
  points: EntsoeImbalancePoint[]
  /** Precio de desvío medio en el periodo (€/MWh), null si vacío. */
  avg_eur_mwh: number | null
  /** Precio de desvío máximo en el periodo (€/MWh), null si vacío. */
  max_eur_mwh: number | null
  /** Precio de desvío mínimo en el periodo (€/MWh), null si vacío. */
  min_eur_mwh: number | null
}

/** Opciones de filtrado para indisponibilidades de generación (A80). */
export interface EntsoeOutageOpts {
  /** businessType: A53 planificadas, A54 forzadas. Omitir = ambas. */
  businessType?: 'A53' | 'A54'
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers internos (no exportados)
// ─────────────────────────────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Fusiona puntos de varias series en una sola ordenada por timestamp (último gana). */
function mergePoints(
  series: Array<{ points: EntsoePoint[] }>,
): EntsoePoint[] {
  const byTs = new Map<string, number>()
  for (const s of series) {
    for (const p of s.points) byTs.set(p.timestamp, p.value)
  }
  return Array.from(byTs.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([timestamp, value], i) => ({ position: i + 1, value, timestamp }))
}

/** Estadísticos de una serie de puntos: { avg, peak, min }. Null si vacía. */
function stats(points: EntsoePoint[]): {
  avg: number | null
  peak: number | null
  min: number | null
} {
  if (points.length === 0) return { avg: null, peak: null, min: null }
  const v = points.map((p) => p.value)
  return {
    avg: round1(v.reduce((a, b) => a + b, 0) / v.length),
    peak: round1(Math.max(...v)),
    min: round1(Math.min(...v)),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 1. fetchTotalLoad — A65 / A16 (demanda REAL)
// ─────────────────────────────────────────────────────────────────────────

/** Núcleo compartido de A65 (cambia el processType: A16 real, A01 previsión). */
async function fetchLoadCore(
  zoneCode: EntsoeZoneCode | string,
  periodStart: string,
  periodEnd: string,
  processType: 'A16' | 'A01',
): Promise<EntsoeResponse<EntsoeTotalLoad>> {
  const fetched_at = new Date().toISOString()
  const zone = resolveZone(zoneCode)
  if (!zone) {
    return { ok: false, error: `zona_desconocida · ${zoneCode}`, fetched_at, source_url: PUBLIC_URL }
  }

  // A65 Total Load · outBiddingZone_Domain = EIC. GL_MarketDocument, valor 'quantity'.
  const raw = await entsoeFetchRaw({
    documentType: 'A65',
    processType,
    // outBiddingZone_Domain no es campo tipado en EntsoeRawQuery; usamos
    // biddingZone_Domain (cubre el dominio único de carga). ENTSO-E acepta
    // outBiddingZone_Domain para A65; reusamos el dominio de zona disponible.
    biddingZone_Domain: zone.eic,
    periodStart,
    periodEnd,
  })
  if (!raw.ok) return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }

  const series = parseTimeSeries(raw.xml || '', 'quantity')
  const points = mergePoints(series)
  if (points.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }
  const s = stats(points)
  return {
    ok: true,
    data: {
      zone: zone.code,
      eic: zone.eic,
      resolution_min: series[0]?.resolutionMin ?? 60,
      points,
      peak_mw: s.peak,
      min_mw: s.min,
      avg_mw: s.avg,
    },
    fetched_at,
    source_url: PUBLIC_URL,
  }
}

/**
 * Demanda total REAL · documentType A65 · processType A16 (realizado).
 * outBiddingZone_Domain = EIC de la zona. GL_MarketDocument, valor 'quantity'.
 */
export async function fetchTotalLoad(
  zone: EntsoeZoneCode | string,
  periodStart: string,
  periodEnd: string,
): Promise<EntsoeResponse<EntsoeTotalLoad>> {
  return fetchLoadCore(zone, periodStart, periodEnd, 'A16')
}

// ─────────────────────────────────────────────────────────────────────────
// 2. fetchLoadForecast — A65 / A01 (previsión day-ahead de demanda)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Previsión de demanda day-ahead · documentType A65 · processType A01.
 * Misma forma que `fetchTotalLoad` (la previsión usa la misma estructura).
 */
export async function fetchLoadForecast(
  zone: EntsoeZoneCode | string,
  periodStart: string,
  periodEnd: string,
): Promise<EntsoeResponse<EntsoeTotalLoad>> {
  return fetchLoadCore(zone, periodStart, periodEnd, 'A01')
}

// ─────────────────────────────────────────────────────────────────────────
// 3. fetchWindSolarForecast — A69 / A01 (previsión eólica & solar)
// ─────────────────────────────────────────────────────────────────────────

/** psrTypes solicitados en A69: B16 solar, B18 eólica offshore, B19 onshore. */
const WIND_SOLAR_PSR = ['B16', 'B18', 'B19'] as const

/**
 * Previsión eólica & solar day-ahead · documentType A69 · processType A01.
 * in_Domain = EIC. Devuelve una entrada por tecnología (B16/B18/B19). La API
 * trae varias TimeSeries (una por psrType); las agrupamos por psrType.
 */
export async function fetchWindSolarForecast(
  zoneCode: EntsoeZoneCode | string,
  periodStart: string,
  periodEnd: string,
): Promise<EntsoeResponse<EntsoeWindSolarForecast>> {
  const fetched_at = new Date().toISOString()
  const zone = resolveZone(zoneCode)
  if (!zone) {
    return { ok: false, error: `zona_desconocida · ${zoneCode}`, fetched_at, source_url: PUBLIC_URL }
  }

  // Una sola petición A69 trae todas las TimeSeries (con su psrType). El campo
  // psrType en la query es opcional; sin él, ENTSO-E devuelve B16/B18/B19 juntos.
  const raw = await entsoeFetchRaw({
    documentType: 'A69',
    processType: 'A01',
    in_Domain: zone.eic,
    periodStart,
    periodEnd,
  })
  if (!raw.ok) return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }

  const series = parseTimeSeries(raw.xml || '', 'quantity')
  if (series.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }

  // Agrupa las series por psrType y fusiona puntos dentro de cada tecnología.
  const byPsr = new Map<string, EntsoePoint[]>()
  for (const s of series) {
    const psr = s.psrType || 'B20'
    const merged = mergePoints([{ points: byPsr.get(psr) || [] }, { points: s.points }])
    byPsr.set(psr, merged)
  }

  // Orden estable: solar, offshore, onshore primero; luego cualquier extra.
  const order = (psr: string) => {
    const i = (WIND_SOLAR_PSR as readonly string[]).indexOf(psr)
    return i === -1 ? 99 : i
  }
  const by_tech: EntsoeWindSolarTech[] = Array.from(byPsr.entries())
    .map(([psr, points]) => {
      const s = stats(points)
      return {
        psr_type: psr,
        label: PSR_TYPE_LABELS[psr] || psr,
        points,
        avg_mw: s.avg,
        peak_mw: s.peak,
      }
    })
    .sort((a, b) => order(a.psr_type) - order(b.psr_type))

  return {
    ok: true,
    data: { zone: zone.code, eic: zone.eic, by_tech },
    fetched_at,
    source_url: PUBLIC_URL,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 4. fetchGenerationForecast — A71 / A01 (previsión de generación total)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Previsión de generación total day-ahead · documentType A71 · processType A01.
 * in_Domain = EIC. Valor 'quantity'. Serie agregada + estadísticos MW.
 */
export async function fetchGenerationForecast(
  zoneCode: EntsoeZoneCode | string,
  periodStart: string,
  periodEnd: string,
): Promise<EntsoeResponse<EntsoeGenerationForecast>> {
  const fetched_at = new Date().toISOString()
  const zone = resolveZone(zoneCode)
  if (!zone) {
    return { ok: false, error: `zona_desconocida · ${zoneCode}`, fetched_at, source_url: PUBLIC_URL }
  }

  const raw = await entsoeFetchRaw({
    documentType: 'A71',
    processType: 'A01',
    in_Domain: zone.eic,
    periodStart,
    periodEnd,
  })
  if (!raw.ok) return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }

  const series = parseTimeSeries(raw.xml || '', 'quantity')
  const points = mergePoints(series)
  if (points.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }
  const s = stats(points)
  return {
    ok: true,
    data: { zone: zone.code, eic: zone.eic, points, avg_mw: s.avg, peak_mw: s.peak },
    fetched_at,
    source_url: PUBLIC_URL,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 5. fetchInstalledCapacity — A68 / A33 (capacidad instalada agregada, anual)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Capacidad instalada agregada · documentType A68 · processType A33 (anual).
 * in_Domain = EIC. El periodo es el AÑO completo (yyyy01010000..yyyy12312300).
 * Un único valor 'quantity' por psrType. Agregamos por tecnología (igual que
 * `fetchGeneration` en client.ts: suma de los puntos de cada TimeSeries/psrType).
 */
export async function fetchInstalledCapacity(
  zoneCode: EntsoeZoneCode | string,
  year: number,
): Promise<EntsoeResponse<EntsoeInstalledCapacity>> {
  const fetched_at = new Date().toISOString()
  const zone = resolveZone(zoneCode)
  if (!zone) {
    return { ok: false, error: `zona_desconocida · ${zoneCode}`, fetched_at, source_url: PUBLIC_URL }
  }
  const yr = Math.trunc(year)
  if (!Number.isFinite(yr) || yr < 2000 || yr > 2100) {
    return { ok: false, error: `año_invalido · ${year}`, fetched_at, source_url: PUBLIC_URL }
  }

  // Periodo = el año entero en formato yyyyMMddHHmm (UTC).
  const periodStart = `${yr}01010000`
  const periodEnd = `${yr}12312300`

  const raw = await entsoeFetchRaw({
    documentType: 'A68',
    processType: 'A33',
    in_Domain: zone.eic,
    periodStart,
    periodEnd,
  })
  if (!raw.ok) return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }

  const series = parseTimeSeries(raw.xml || '', 'quantity')
  if (series.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }

  // Suma MW por psrType (la capacidad instalada es un valor por tecnología).
  const byPsr = new Map<string, number>()
  for (const s of series) {
    if (!s.psrType) continue
    const sum = s.points.reduce((a, p) => a + p.value, 0)
    byPsr.set(s.psrType, (byPsr.get(s.psrType) || 0) + sum)
  }

  const by_type: EntsoeInstalledCapacityItem[] = Array.from(byPsr.entries())
    .map(([psr, mw]) => ({ psr_type: psr, label: PSR_TYPE_LABELS[psr] || psr, mw: round1(mw) }))
    .sort((a, b) => b.mw - a.mw)

  if (by_type.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }

  return {
    ok: true,
    data: {
      zone: zone.code,
      eic: zone.eic,
      year: yr,
      by_type,
      total_mw: round1(by_type.reduce((a, b) => a + b.mw, 0)),
    },
    fetched_at,
    source_url: PUBLIC_URL,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 6. fetchGenerationOutages — A80 (indisponibilidades de unidades de generación)
//
// ⚠ ESTRUCTURA XML DISTINTA: Unavailability_MarketDocument. parseTimeSeries NO
// sirve. Cada <TimeSeries> contiene:
//   <businessType>A53|A54</businessType>                       (planned/forced)
//   <production_RegisteredResource.name>UNIDAD</…name>          (nombre unidad)
//   <production_RegisteredResource.pSRType.powerSystemResources.nominalP …>
//       NOMINAL_MW
//   </…nominalP>  (puede traer un atributo unit="MAW")
//   <production_RegisteredResource.pSRType.psrType>B14</…psrType>  (tecnología)
//   <start_DateAndOrTime.date>YYYY-MM-DD</…> / <end_DateAndOrTime.date>…</…>
//   <Available_Period>…<quantity>DISPONIBLE_MW</quantity>…</Available_Period>
//   <Reason><text>RAZÓN</text></Reason>  (motivo, opcional)
// indisponible_mw = nominal_mw - disponible_mw. Ordenamos por indisponible desc.
//
// Ventana máx recomendada ~1 año; ENTSO-E pagina y limita ~200 docs por
// consulta. Aquí limitamos la salida a 100 registros (los de mayor impacto).
// ─────────────────────────────────────────────────────────────────────────

/** Extrae el primer match de un tag dentro de un cuerpo (tolerante a atributos). */
function tagWithAttrs(body: string, name: string): string | undefined {
  const esc = name.replace(/[.]/g, '\\.')
  // Acepta atributos antes del cierre del tag de apertura: <tag attr="x">val</tag>.
  const m = new RegExp(`<${esc}\\b[^>]*>([^<]*)<\\/${esc}>`).exec(body)
  return m?.[1]?.trim()
}

function toNum(s: string | undefined): number | null {
  if (s == null) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

/**
 * Indisponibilidades de unidades de generación (OUTAGES) · documentType A80.
 * biddingZone_Domain = EIC. businessType opcional (A53 planificadas, A54
 * forzadas). Parser DEDICADO para Unavailability_MarketDocument (parseTimeSeries
 * no aplica). Devuelve registros { unidad, tecnología, nominal/disponible/
 * indisponible MW, ventana, tipo, razón }, ordenados por indisponible_mw desc,
 * limitados a 100.
 */
export async function fetchGenerationOutages(
  zoneCode: EntsoeZoneCode | string,
  periodStart: string,
  periodEnd: string,
  opts?: EntsoeOutageOpts,
): Promise<EntsoeResponse<EntsoeGenerationOutages>> {
  const fetched_at = new Date().toISOString()
  const zone = resolveZone(zoneCode)
  if (!zone) {
    return { ok: false, error: `zona_desconocida · ${zoneCode}`, fetched_at, source_url: PUBLIC_URL }
  }

  const raw = await entsoeFetchRaw({
    documentType: 'A80',
    biddingZone_Domain: zone.eic,
    periodStart,
    periodEnd,
    ...(opts?.businessType ? { businessType: opts.businessType } : {}),
  })
  if (!raw.ok) return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }

  const xml = raw.xml || ''
  const outages: EntsoeOutageRecord[] = []

  const tsRe = /<TimeSeries\b[^>]*>([\s\S]*?)<\/TimeSeries>/g
  let m: RegExpExecArray | null
  let idx = 0
  while ((m = tsRe.exec(xml)) !== null) {
    const body = m[1]

    const bt = tagWithAttrs(body, 'businessType')
    const tipo: EntsoeOutageRecord['tipo'] =
      bt === 'A53' ? 'planned' : bt === 'A54' ? 'forced' : 'desconocido'

    const unidad =
      tagWithAttrs(body, 'production_RegisteredResource.name') ||
      tagWithAttrs(body, 'production_RegisteredResource.mRID') ||
      'Unidad sin nombre'

    const psr =
      tagWithAttrs(body, 'production_RegisteredResource.pSRType.psrType') || ''
    const tecnologia = PSR_TYPE_LABELS[psr] || (psr || 'Desconocida')

    const nominal_mw = toNum(
      tagWithAttrs(
        body,
        'production_RegisteredResource.pSRType.powerSystemResources.nominalP',
      ),
    )

    // Capacidad DISPONIBLE: <Available_Period>…<quantity>…</quantity>. Si hay
    // varios Available_Period, tomamos el mínimo disponible (peor caso = mayor
    // indisponibilidad), que es lo relevante para el ranking de impacto.
    let disponible_mw: number | null = null
    const apRe = /<Available_Period\b[^>]*>([\s\S]*?)<\/Available_Period>/g
    let ap: RegExpExecArray | null
    while ((ap = apRe.exec(body)) !== null) {
      const q = toNum(tagWithAttrs(ap[1], 'quantity'))
      if (q != null) disponible_mw = disponible_mw == null ? q : Math.min(disponible_mw, q)
    }

    const indisponible_mw =
      nominal_mw != null && disponible_mw != null
        ? round1(Math.max(0, nominal_mw - disponible_mw))
        : null

    const desde =
      tagWithAttrs(body, 'start_DateAndOrTime.date') ||
      tagWithAttrs(body, 'start_DateAndOrTime.dateTime') ||
      null
    const hasta =
      tagWithAttrs(body, 'end_DateAndOrTime.date') ||
      tagWithAttrs(body, 'end_DateAndOrTime.dateTime') ||
      null

    // Razón: <Reason><text>…</text></Reason> (puede faltar).
    const reasonBlock = /<Reason\b[^>]*>([\s\S]*?)<\/Reason>/.exec(body)?.[1]
    const razon = reasonBlock ? tagWithAttrs(reasonBlock, 'text') || null : null

    outages.push({
      id: `${unidad}|${desde ?? ''}|${hasta ?? ''}|${idx}`,
      unidad,
      psr_type: psr,
      tecnologia,
      nominal_mw,
      disponible_mw,
      indisponible_mw,
      desde,
      hasta,
      tipo,
      razon: razon || null,
    })
    idx++
  }

  // Orden por capacidad indisponible descendente (mayor impacto primero);
  // nulls al final. Limitamos a 100 registros.
  outages.sort((a, b) => (b.indisponible_mw ?? -1) - (a.indisponible_mw ?? -1))
  const top = outages.slice(0, 100)
  const total_indisponible_mw = round1(
    top.reduce((acc, o) => acc + (o.indisponible_mw ?? 0), 0),
  )

  return {
    ok: true,
    data: {
      zone: zone.code,
      eic: zone.eic,
      outages: top,
      total_indisponible_mw,
      n: top.length,
    },
    fetched_at,
    source_url: PUBLIC_URL,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 7. fetchHydroReservoirs — A72 / A16 (embalses & almacenamiento hidro, semanal)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Embalses y almacenamiento hidráulico · documentType A72 · processType A16.
 * in_Domain = EIC. Resolución P7D (semanal). Valor 'quantity' = MWh almacenados.
 */
export async function fetchHydroReservoirs(
  zoneCode: EntsoeZoneCode | string,
  periodStart: string,
  periodEnd: string,
): Promise<EntsoeResponse<EntsoeHydroReservoirs>> {
  const fetched_at = new Date().toISOString()
  const zone = resolveZone(zoneCode)
  if (!zone) {
    return { ok: false, error: `zona_desconocida · ${zoneCode}`, fetched_at, source_url: PUBLIC_URL }
  }

  const raw = await entsoeFetchRaw({
    documentType: 'A72',
    processType: 'A16',
    in_Domain: zone.eic,
    periodStart,
    periodEnd,
  })
  if (!raw.ok) return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }

  const series = parseTimeSeries(raw.xml || '', 'quantity')
  const merged = mergePoints(series)
  if (merged.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }

  const points: EntsoeHydroPoint[] = merged.map((p) => ({
    timestamp: p.timestamp,
    mwh: round1(p.value),
  }))
  const last = points[points.length - 1]

  return {
    ok: true,
    data: {
      zone: zone.code,
      eic: zone.eic,
      points,
      latest_mwh: last.mwh,
      latest_date: last.timestamp,
    },
    fetched_at,
    source_url: PUBLIC_URL,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 8. fetchScheduledExchanges — A09 (intercambios comerciales programados)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Intercambios comerciales programados day-ahead · documentType A09.
 * in_Domain = EIC destino, out_Domain = EIC origen,
 * contract_MarketAgreement.type = A05 (day-ahead). Valor 'quantity'.
 */
export async function fetchScheduledExchanges(
  fromCode: EntsoeZoneCode | string,
  toCode: EntsoeZoneCode | string,
  periodStart: string,
  periodEnd: string,
): Promise<EntsoeResponse<EntsoeScheduledExchanges>> {
  const fetched_at = new Date().toISOString()
  const from = resolveZone(fromCode)
  const to = resolveZone(toCode)
  if (!from || !to) {
    return {
      ok: false,
      error: `zona_desconocida · ${fromCode}/${toCode}`,
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }

  const raw = await entsoeFetchRaw({
    documentType: 'A09',
    in_Domain: to.eic, // destino
    out_Domain: from.eic, // origen
    'contract_MarketAgreement.type': 'A05', // day-ahead
    periodStart,
    periodEnd,
  })
  if (!raw.ok) return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }

  const series = parseTimeSeries(raw.xml || '', 'quantity')
  const points = mergePoints(series)
  if (points.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }
  const total = points.reduce((a, p) => a + p.value, 0)

  return {
    ok: true,
    data: { from: from.code, to: to.code, points, total_mwh: round1(total) },
    fetched_at,
    source_url: PUBLIC_URL,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 9. fetchImbalancePrices — A85 (precios de desvío / imbalance)
//
// Balancing_MarketDocument. El precio por posición puede venir en
// <imbalance_Price.amount> dentro de cada <Point>; si la implementación del TSO
// no usa ese tag, caemos a <price.amount>. parseTimeSeries solo acepta esos dos
// tags de valor, así que probamos primero 'imbalance_Price.amount' (parser
// tolerante) y, si no hay puntos, reintentamos con 'price.amount'.
// ─────────────────────────────────────────────────────────────────────────

/** Parser tolerante de imbalance: intenta 'imbalance_Price.amount', cae a 'price.amount'. */
function parseImbalancePoints(xml: string): EntsoePoint[] {
  // parseTimeSeries está tipado para 'price.amount' | 'quantity'. El tag de
  // imbalance ('imbalance_Price.amount') no está en esa unión, así que hacemos
  // un parse dedicado del valor por posición y reusamos el armazón de mergePoints.
  const out: EntsoePoint[] = []
  const tsRe = /<TimeSeries\b[^>]*>([\s\S]*?)<\/TimeSeries>/g
  let tsM: RegExpExecArray | null
  while ((tsM = tsRe.exec(xml)) !== null) {
    const tsBody = tsM[1]
    const perRe = /<Period\b[^>]*>([\s\S]*?)<\/Period>/g
    let perM: RegExpExecArray | null
    while ((perM = perRe.exec(tsBody)) !== null) {
      const perBody = perM[1]
      const startIso = /<start>([^<]+)<\/start>/.exec(perBody)?.[1]
      const resStr = /<resolution>([^<]+)<\/resolution>/.exec(perBody)?.[1]
      const startMs = startIso ? Date.parse(startIso) : NaN
      const resMin = parseResolutionMin(resStr)
      if (!Number.isFinite(startMs) || !resMin) continue

      // Intentamos cada tag de precio admisible, en orden de preferencia.
      for (const valueTag of ['imbalance_Price.amount', 'price.amount'] as const) {
        const esc = valueTag.replace(/[.]/g, '\\.')
        const ptRe = new RegExp(
          `<Point>[\\s\\S]*?<position>(\\d+)<\\/position>[\\s\\S]*?<${esc}>([\\d.eE+-]+)<\\/${esc}>[\\s\\S]*?<\\/Point>`,
          'g',
        )
        const raw: Array<{ position: number; value: number }> = []
        let pm: RegExpExecArray | null
        while ((pm = ptRe.exec(perBody)) !== null) {
          const position = parseInt(pm[1], 10)
          const value = parseFloat(pm[2])
          if (Number.isFinite(position) && Number.isFinite(value)) {
            raw.push({ position, value })
          }
        }
        if (raw.length === 0) continue

        raw.sort((a, b) => a.position - b.position)
        const lastPos = raw[raw.length - 1].position
        const byPos = new Map(raw.map((p) => [p.position, p.value]))
        let lastValue = raw[0].value
        for (let pos = 1; pos <= lastPos; pos++) {
          if (byPos.has(pos)) lastValue = byPos.get(pos)!
          const ts = new Date(startMs + (pos - 1) * resMin * 60_000).toISOString()
          out.push({ position: pos, value: lastValue, timestamp: ts })
        }
        break // tag encontrado para este Period; no probamos el siguiente.
      }
    }
  }
  return out
}

/** Convierte "PT60M"/"PT15M"/"PT1H"/"P1D" a minutos (réplica local del helper de client.ts). */
function parseResolutionMin(res: string | undefined): number {
  if (!res) return 0
  const h = /PT(\d+)H/.exec(res)
  if (h) return parseInt(h[1], 10) * 60
  const m = /PT(\d+)M/.exec(res)
  if (m) return parseInt(m[1], 10)
  const d = /P(\d+)D/.exec(res)
  if (d) return parseInt(d[1], 10) * 24 * 60
  return 0
}

/**
 * Precios de desvío / imbalance · documentType A85.
 * controlArea_Domain = EIC. Balancing_MarketDocument. Parser tolerante: intenta
 * 'imbalance_Price.amount' por posición y cae a 'price.amount'.
 */
export async function fetchImbalancePrices(
  zoneCode: EntsoeZoneCode | string,
  periodStart: string,
  periodEnd: string,
): Promise<EntsoeResponse<EntsoeImbalancePrices>> {
  const fetched_at = new Date().toISOString()
  const zone = resolveZone(zoneCode)
  if (!zone) {
    return { ok: false, error: `zona_desconocida · ${zoneCode}`, fetched_at, source_url: PUBLIC_URL }
  }

  const raw = await entsoeFetchRaw({
    documentType: 'A85',
    controlArea_Domain: zone.eic,
    periodStart,
    periodEnd,
  })
  if (!raw.ok) return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }

  // Fusionamos puntos del parser dedicado en una serie única ordenada.
  const merged = mergePoints([{ points: parseImbalancePoints(raw.xml || '') }])
  if (merged.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }

  const points: EntsoeImbalancePoint[] = merged.map((p) => ({
    timestamp: p.timestamp,
    eur_mwh: round2(p.value),
  }))
  const values = points.map((p) => p.eur_mwh)
  const avg = values.reduce((a, b) => a + b, 0) / values.length

  return {
    ok: true,
    data: {
      zone: zone.code,
      eic: zone.eic,
      points,
      avg_eur_mwh: round2(avg),
      max_eur_mwh: round2(Math.max(...values)),
      min_eur_mwh: round2(Math.min(...values)),
    },
    fetched_at,
    source_url: PUBLIC_URL,
  }
}
