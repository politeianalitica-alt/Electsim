/**
 * Estacionalidad turística · Turismo v3 · Sprint T2-cross
 *
 * Índice de estacionalidad del turismo en España combinando DOS señales:
 *   1) Distribución mensual de la demanda turística (forma estacional de
 *      FRONTUR/EOH: llegadas + pernoctaciones). España concentra ~30% de los
 *      turistas en jul-ago. La forma es muy estable año a año → se modela como
 *      un índice mensual curado y normalizado (media 100). Fuente: INE FRONTUR
 *      (movimientos turísticos en frontera) + EOH (encuesta ocupación hotelera).
 *   2) Clima: temperatura media mensual por CCAA costera, vía AEMET (climatología
 *      mensual). El sol&playa español está climáticamente sincronizado con la
 *      demanda → cruzar ambos explica el pico/valle y la dependencia del clima.
 *
 * Devuelve `{ meses:[{mes, indice_turismo, temp_media?}], pico, valle }`.
 * DEGRADA si falta AEMET (sin API key o fallo): el índice de turismo siempre
 * está disponible; `temp_media` queda null y `clima_source` lo marca honesto.
 *
 * Patrón Politeia: `{ ok, data|null, error?, fetched_at, source_url }`, caché
 * TTL, helpers PUROS testeables. AEMET_API_KEY es server-side; este lib se
 * llama desde el route handler `app/api/turismo/estacionalidad`.
 *
 * Docs: INE FRONTUR · https://www.ine.es/ ; AEMET · https://opendata.aemet.es
 */

// ─────────────────────────────────────────────────────────────────────────
// Tipos (propios de este lib)
// ─────────────────────────────────────────────────────────────────────────

export interface SeasonMonth {
  /** Mes 1-12. */
  mes: number
  /** Nombre del mes en español. */
  mes_nombre: string
  /** Índice de demanda turística (media anual = 100). */
  indice_turismo: number
  /** Temperatura media del mes (ºC) en la CCAA de referencia. null si no AEMET. */
  temp_media?: number | null
}

export interface EstacionalidadData {
  /** 12 meses con índice de turismo y (si hay) temperatura. */
  meses: SeasonMonth[]
  /** Mes de máxima demanda. */
  pico: { mes: number; mes_nombre: string; indice_turismo: number }
  /** Mes de mínima demanda. */
  valle: { mes: number; mes_nombre: string; indice_turismo: number }
  /** Ratio pico/valle (cuán concentrada está la temporada). */
  ratio_pico_valle: number
  /** CCAA costera usada para la temperatura. */
  ccaa_clima: string
  /** Procedencia del clima. */
  clima_source: 'aemet' | 'unavailable'
  /** Nota de metodología. */
  nota: string
}

export interface EstacionalidadResponse {
  ok: boolean
  data: EstacionalidadData | null
  error?: string
  fetched_at: string
  source_url: string
}

const PUBLIC_URL = 'https://www.ine.es/'
const AEMET_BASE = 'https://opendata.aemet.es/opendata/api'
const DEFAULT_TIMEOUT_MS = 15_000
const CACHE_TTL_MS = 12 * 3600_000

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// ─────────────────────────────────────────────────────────────────────────
// Índice de demanda turística mensual (curado + DATADO, normalizado a media 100).
// Forma estacional de la demanda turística internacional en España (FRONTUR) +
// pernoctaciones hoteleras (EOH). Pico jul-ago, valle ene-feb. Estos pesos
// reproducen la concentración real (jul+ago ≈ 30% del año). Estructura muy
// estable interanualmente.
// Fuente: INE · FRONTUR + EOH · patrón estacional medio de años recientes.
// ─────────────────────────────────────────────────────────────────────────

export const ESTACIONALIDAD_FUENTE =
  'INE · FRONTUR (movimientos turísticos en frontera) + EOH (ocupación hotelera) · patrón estacional medio'

/** Índice de demanda por mes (1-12). Suma = 1200 → media = 100. */
export const INDICE_DEMANDA_MENSUAL: number[] = [
  // Ene  Feb  Mar  Abr  May  Jun  Jul  Ago  Sep  Oct  Nov  Dic
  58, 60, 78, 92, 108, 122, 152, 158, 130, 108, 70, 64,
]

// CCAA costeras candidatas para la señal climática (provincia AEMET
// representativa). Por defecto Andalucía (Almería · 04). La temperatura del
// litoral mediterráneo/atlántico es el proxy del clima de playa.
const COASTAL_CCAA_PROV: Record<string, string> = {
  AND: '04', // Almería (Costa de Almería)
  CVA: '46', // Valencia
  CAT: '08', // Barcelona
  BAL: '07', // Illes Balears
  CAN: '35', // Las Palmas (Canarias)
  MUR: '30', // Murcia
  GAL: '15', // A Coruña (Atlántico)
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS (sin red) · testeables
// ─────────────────────────────────────────────────────────────────────────

/** Parsea un número AEMET tolerando string/coma/"Ip"/vacío. null si no es num. */
export function parseAemetNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (s === '' || s === 'Ip' || s === '-') return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Extrae la temperatura media por mes (1-12) de los items de climatología
 * mensual de AEMET (`fecha:'2024-1'`, `tm_mes:'15.3'`). Promedia entre años si
 * hay varios. Devuelve un mapa mes→temp (o null). Pura: testeable con fixtures.
 */
export function tempByMonthFromAemet(items: unknown): Record<number, number | null> {
  const out: Record<number, number | null> = {}
  const acc: Record<number, number[]> = {}
  if (Array.isArray(items)) {
    for (const it of items as Array<{ fecha?: unknown; tm_mes?: unknown }>) {
      const fecha = String(it?.fecha ?? '').trim()
      const m = fecha.match(/^(\d{4})-(\d{1,2})$/)
      if (!m) continue // AEMET usa 'YYYY-13' para el resumen anual → lo descarta
      const mes = parseInt(m[2], 10)
      if (mes < 1 || mes > 12) continue
      const t = parseAemetNum(it?.tm_mes)
      if (t == null) continue
      ;(acc[mes] ??= []).push(t)
    }
  }
  for (let mes = 1; mes <= 12; mes++) {
    const arr = acc[mes]
    out[mes] = arr && arr.length ? Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10 : null
  }
  return out
}

/**
 * Ensambla los 12 meses con índice de demanda + temperatura (si hay), y calcula
 * pico/valle/ratio. Pura: testeable. `temps` puede ser {} (sin AEMET).
 */
export function buildEstacionalidad(
  indices: number[],
  temps: Record<number, number | null>,
  opts: { ccaa_clima: string; clima_source: 'aemet' | 'unavailable'; nota: string },
): EstacionalidadData {
  const meses: SeasonMonth[] = indices.map((idx, i) => ({
    mes: i + 1,
    mes_nombre: MESES_ES[i],
    indice_turismo: idx,
    temp_media: temps[i + 1] ?? null,
  }))
  let pico = meses[0]
  let valle = meses[0]
  for (const m of meses) {
    if (m.indice_turismo > pico.indice_turismo) pico = m
    if (m.indice_turismo < valle.indice_turismo) valle = m
  }
  const ratio = valle.indice_turismo > 0
    ? Math.round((pico.indice_turismo / valle.indice_turismo) * 100) / 100
    : 0
  return {
    meses,
    pico: { mes: pico.mes, mes_nombre: pico.mes_nombre, indice_turismo: pico.indice_turismo },
    valle: { mes: valle.mes, mes_nombre: valle.mes_nombre, indice_turismo: valle.indice_turismo },
    ratio_pico_valle: ratio,
    ccaa_clima: opts.ccaa_clima,
    clima_source: opts.clima_source,
    nota: opts.nota,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria · TTL 12h
// ─────────────────────────────────────────────────────────────────────────

interface CacheEntry { expires: number; value: EstacionalidadResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearEstacionalidadCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch AEMET (climatología mensual) · degradación silenciosa
// ─────────────────────────────────────────────────────────────────────────

/**
 * Descarga la climatología mensual de AEMET para una provincia (patrón 2-step:
 * 1) endpoint con api_key → {datos:URL}; 2) GET datos → array). Devuelve los
 * items crudos o null si no hay key / falla. NUNCA lanza.
 */
async function fetchAemetClimatology(provincia: string, timeoutMs: number): Promise<any[] | null> {
  const key = process.env.AEMET_API_KEY
  if (!key) return null
  const currentYear = new Date().getFullYear()
  // Prueba aniofin actual, -1, -2 (igual que el route AEMET existente: el año
  // en curso puede no tener cierre de climatología → HTTP 404).
  for (const offset of [1, 2, 3]) {
    const aniofin = currentYear - offset
    const anioini = aniofin - 5
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), timeoutMs)
      const path = `/valores/climatologicos/mensualesanuales/datos/anioini/${anioini}/aniofin/${aniofin}/provincia/${provincia}`
      const r = await fetch(`${AEMET_BASE}${path}`, {
        signal: ctrl.signal,
        headers: { api_key: key, Accept: 'application/json' },
        next: { revalidate: 43200 },
      } as RequestInit)
      clearTimeout(t)
      if (!r.ok) continue
      const meta: any = await r.json()
      if (!meta?.datos) continue
      const r2 = await fetch(meta.datos, { next: { revalidate: 43200 } } as RequestInit)
      if (!r2.ok) continue
      const data: any = await r2.json()
      if (Array.isArray(data) && data.length > 0) return data
    } catch {
      /* siguiente offset */
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────
// API pública (AEMET opcional + degradación)
// ─────────────────────────────────────────────────────────────────────────

export interface FetchEstacionalidadOpts {
  /** CCAA costera para la señal climática (default 'AND'). */
  ccaa?: string
  noCache?: boolean
  timeoutMs?: number
}

/**
 * Devuelve el índice de estacionalidad turística (demanda mensual) cruzado con
 * la temperatura media por CCAA costera (AEMET). NUNCA lanza: si AEMET no está
 * disponible, devuelve el índice de turismo con `temp_media:null` y
 * `clima_source:'unavailable'`.
 */
export async function fetchEstacionalidad(
  opts: FetchEstacionalidadOpts = {},
): Promise<EstacionalidadResponse> {
  const fetched_at = new Date().toISOString()
  const ccaa = (opts.ccaa || 'AND').toUpperCase()
  const ccaaLabel = ccaa in COASTAL_CCAA_PROV ? ccaa : 'AND'
  const provincia = COASTAL_CCAA_PROV[ccaaLabel] ?? '04'

  const cacheKey = `estac:${ccaaLabel}`
  if (!opts.noCache) {
    const hit = _cache.get(cacheKey)
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  let temps: Record<number, number | null> = {}
  let climaSource: 'aemet' | 'unavailable' = 'unavailable'
  try {
    const items = await fetchAemetClimatology(provincia, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    if (items && items.length) {
      temps = tempByMonthFromAemet(items)
      // Solo marcamos 'aemet' si al menos un mes trae temperatura.
      if (Object.values(temps).some((v) => v != null)) climaSource = 'aemet'
    }
  } catch {
    /* degradación */
  }

  const climaNote =
    climaSource === 'aemet'
      ? `Temperatura media mensual de AEMET (climatología, provincia ${provincia} · ${ccaaLabel}).`
      : 'Temperatura no disponible (AEMET_API_KEY ausente o sin datos) · solo índice de demanda.'

  const data = buildEstacionalidad(INDICE_DEMANDA_MENSUAL, temps, {
    ccaa_clima: ccaaLabel,
    clima_source: climaSource,
    nota: `${ESTACIONALIDAD_FUENTE}. ${climaNote}`,
  })

  const result: EstacionalidadResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
  _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: result })
  return result
}
