/**
 * Cliente Eurostat · datasets de vivienda · Politeia Vivienda v3
 *
 * Eurostat sirve JSON-stat estándar vía:
 *   https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}
 *
 * Sin autenticación, sin rate-limit declarado. Devolvemos serie temporal
 * normalizada `{geo, time, value}[]` para que la capa de UI no tenga que
 * desempaquetar el formato JSON-stat (dimensión, indices, valores).
 *
 * Datasets cubiertos en Vivienda v3:
 *   - prc_hpi_q       · House Price Index trimestral (base 2015 = 100)
 *   - ilc_mdho06      · Housing cost overburden rate
 *   - ilc_mdho06q     · Housing cost overburden rate by tenure
 *   - ilc_lvho07a     · Distribution of population by tenure status (housing tenure)
 *   - ilc_mdho03      · Overcrowding rate by income group
 *
 * Decisiones:
 *   - timeout 8s por dataset (Eurostat ocasionalmente tarda)
 *   - Si Eurostat falla → devolvemos points[] vacío y `fuente_error` para
 *     que el endpoint pueda agregar el motivo (CLAUDE.md §0.5 · no inventar)
 *   - revalidate 6h (datos publicados con frecuencia trimestral/anual)
 */

const BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

/** Una observación normalizada de un dataset Eurostat. */
export interface EurostatPoint {
  geo: string
  time: string
  value: number | null
}

interface EurostatJsonStat {
  value?: Record<string, number>
  dimension?: {
    geo?: {
      category?: { index?: Record<string, number>; label?: Record<string, string> }
    }
    time?: {
      category?: { index?: Record<string, number>; label?: Record<string, string> }
    }
  }
  size?: number[]
  id?: string[]
  extension?: { 'positions-with-no-data'?: { geo?: number[]; time?: number[] } }
}

interface FetchOpts {
  dataset: string
  /** Filtros adicionales (ej: `{tenure: 'RENT_GE_MED'}`). */
  filters?: Record<string, string | string[]>
  /** Países (códigos Eurostat: ES, EU27_2020, EA20, FR, DE, IT, PT, NL...). */
  geo?: string[]
  /** Periodos (años YYYY o trimestres YYYY-Q1...). */
  time?: string[]
  timeoutMs?: number
}

/**
 * Fetch genérico de un dataset Eurostat, devuelto en formato normalizado.
 * Compatible con datasets de cualquier estructura, siempre que tengan
 * dimensiones `geo` y `time` (que es el caso de todos los de vivienda).
 */
export async function fetchEurostatDataset(
  opts: FetchOpts
): Promise<{ ok: true; points: EurostatPoint[]; meta: { dataset: string; geos: string[]; times: string[] } } | { ok: false; error: string }> {
  const { dataset, filters = {}, geo = ['ES', 'EU27_2020'], time = [], timeoutMs = 8000 } = opts

  // Construir query Eurostat (JSON-stat 2.0 query syntax)
  const params = new URLSearchParams()
  params.set('format', 'JSON')
  params.set('lang', 'EN')
  geo.forEach((g) => params.append('geo', g))
  if (time.length === 0) {
    // Por defecto: últimos 8 años (mantenemos respuestas pequeñas)
    const currentYear = 2025 // hard-coded floor para no usar Date.now() (workflows lo prohíben en el script)
    for (let y = currentYear - 8; y <= currentYear; y++) params.append('time', String(y))
  } else {
    time.forEach((t) => params.append('time', t))
  }
  Object.entries(filters).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((vv) => params.append(k, vv))
    else params.append(k, v)
  })

  const url = `${BASE}/${dataset}?${params.toString()}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 21600 }, // 6h
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} eurostat ${dataset}` }
    const txt = await res.text()
    if (!txt || txt.length < 20) return { ok: false, error: `respuesta vacía eurostat ${dataset}` }
    const json = JSON.parse(txt) as EurostatJsonStat
    return { ok: true, points: parseJsonStat(json), meta: extractMeta(dataset, json) }
  } catch (e) {
    clearTimeout(timer)
    return { ok: false, error: e instanceof Error ? e.message : 'fetch failed' }
  }
}

/** Convierte JSON-stat 2.0 a array plano [{geo, time, value}]. */
function parseJsonStat(json: EurostatJsonStat): EurostatPoint[] {
  const value = json.value || {}
  const geoIdx = json.dimension?.geo?.category?.index || {}
  const timeIdx = json.dimension?.time?.category?.index || {}
  const size = json.size || []
  const id = json.id || []

  // Calcular strides (multiplicadores para descomponer índice plano)
  const strides: number[] = new Array(size.length).fill(1)
  for (let i = size.length - 2; i >= 0; i--) strides[i] = strides[i + 1] * size[i + 1]

  const geoPos = id.indexOf('geo')
  const timePos = id.indexOf('time')
  if (geoPos < 0 || timePos < 0) return []

  // Invertir los índices: index → label
  const geoLabels = Object.entries(geoIdx).sort((a, b) => a[1] - b[1]).map(([k]) => k)
  const timeLabels = Object.entries(timeIdx).sort((a, b) => a[1] - b[1]).map(([k]) => k)

  const points: EurostatPoint[] = []
  for (const [flatStr, v] of Object.entries(value)) {
    const flat = Number(flatStr)
    if (!Number.isFinite(flat)) continue
    // Descomponer índice plano en coordenadas multi-dimensión
    let remaining = flat
    const coords: number[] = new Array(size.length).fill(0)
    for (let i = 0; i < size.length; i++) {
      coords[i] = Math.floor(remaining / strides[i])
      remaining %= strides[i]
    }
    const geo = geoLabels[coords[geoPos]]
    const time = timeLabels[coords[timePos]]
    if (geo && time) points.push({ geo, time, value: v })
  }
  // Orden estable: por geo y luego por time ascendente
  points.sort((a, b) => (a.geo === b.geo ? a.time.localeCompare(b.time) : a.geo.localeCompare(b.geo)))
  return points
}

function extractMeta(dataset: string, json: EurostatJsonStat): { dataset: string; geos: string[]; times: string[] } {
  const geoIdx = json.dimension?.geo?.category?.index || {}
  const timeIdx = json.dimension?.time?.category?.index || {}
  return {
    dataset,
    geos: Object.keys(geoIdx),
    times: Object.keys(timeIdx),
  }
}

// ─── Wrappers para datasets concretos de vivienda ────────────────

/**
 * House Price Index trimestral.
 * Filtros por defecto: total housing, índice precios.
 * geo: ES + EU27_2020 + EA20.
 */
export async function fetchEurostatHPI(geo: string[] = ['ES', 'EU27_2020', 'EA20'], yearsBack = 6) {
  const currentYear = 2025
  const time = Array.from({ length: yearsBack + 1 }, (_, i) => String(currentYear - yearsBack + i))
  return fetchEurostatDataset({
    dataset: 'prc_hpi_a',
    geo,
    time,
    filters: { purchase: 'TOTAL', unit: 'I15_A_AVG' },
  })
}

/**
 * Cost overburden rate · % hogares que dedican >40% renta al alquiler.
 * ilc_mdho06: por estatus de tenencia.
 * Usamos OWN (propietarios) + RENT_GE_MED (alquilan a precio de mercado) + RENT_LE_MED (alquilan a precio reducido).
 */
export async function fetchEurostatCostOverburden(geo: string[] = ['ES', 'EU27_2020', 'EA20']) {
  return fetchEurostatDataset({
    dataset: 'ilc_mdho06',
    geo,
    filters: { incgrp: 'TOTAL', tenure: 'TOTAL' },
  })
}

/**
 * Tenencia · % hogares por régimen (propiedad, alquiler precio mercado, alquiler precio reducido).
 * Útil para mostrar la composición tenencial de España vs UE.
 */
export async function fetchEurostatTenure(geo: string[] = ['ES', 'EU27_2020', 'EA20', 'AT', 'NL', 'FR', 'DE', 'PT', 'IT']) {
  return fetchEurostatDataset({
    dataset: 'ilc_lvho02',
    geo,
    filters: { incgrp: 'TOTAL' },
  })
}
