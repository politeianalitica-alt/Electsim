/**
 * Conector Castilla y León — Datos Abiertos JCyL (Opendatasoft) · ES · TS6
 *
 * La Junta de Castilla y León publica su contratación pública en su portal
 * Opendatasoft (Explore API v2.1), KEYLESS. El dataset `contratos-ordinarios`
 * recoge los contratos formalizados (obras, suministros, servicios) con órgano
 * convocante, presupuesto de licitación/adjudicación, fecha de formalización y
 * enlace a la Plataforma de Contratación del Sector Público.
 *
 * Endpoint (verificado, sin clave):
 *   https://analisis.datosabiertos.jcyl.es/api/explore/v2.1/catalog/datasets/
 *     contratos-ordinarios/records?limit=50&order_by=fecha_formalizacion%20desc
 *   Respuesta: { total_count, results: [ {record...} ] }
 *
 * Shape REAL de cada record (verificado vía API):
 *   codigo_contrato, fecha_formalizacion, titulo, organo,
 *   procedimiento_de_adjudicacion, tipo_de_contrato,
 *   presupuesto_de_licitacion_iva_incluido, no_ofertas_presentadas,
 *   presupuesto_de_adjudicacion_iva_incluido, identidad_del_adjudicatario,
 *   nif_adjudicatario, plazo_de_ejecucion_meses, plazo_de_ejecucion_dias,
 *   enlace_de_publicacion
 *
 * `parseCastillaLeonItems()` es PURO y testeable con un fixture JSON pequeño.
 * El dataset no expone CPV → `cpv` siempre null (NUNCA inventamos).
 */
import type { LicitacionNormalizada, SourceResult } from './types'
import {
  cacheGet,
  cacheSet,
  errResult,
  okResult,
  parseNum,
  safeFetch,
  toEur,
  toIso,
} from './shared'

const DATASET = 'contratos-ordinarios'
const BASE = `https://analisis.datosabiertos.jcyl.es/api/explore/v2.1/catalog/datasets/${DATASET}/records`
const PUBLIC_URL = `https://analisis.datosabiertos.jcyl.es/explore/dataset/${DATASET}/`
const FUENTE = 'castillaleon' as const

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixture JSON)
// ─────────────────────────────────────────────────────────────────────────

interface CastillaLeonRaw {
  codigo_contrato?: string
  fecha_formalizacion?: string
  titulo?: string
  organo?: string
  procedimiento_de_adjudicacion?: string
  tipo_de_contrato?: string
  presupuesto_de_licitacion_iva_incluido?: number | string
  presupuesto_de_adjudicacion_iva_incluido?: number | string
  enlace_de_publicacion?: string
}

/** Parsea un record de contratación JCyL al shape común. Pura. */
export function parseCastillaLeonItem(raw: CastillaLeonRaw): LicitacionNormalizada | null {
  if (!raw || typeof raw !== 'object') return null
  const code = raw.codigo_contrato
  if (code == null || String(code).trim() === '') return null
  const remoteId = String(code).trim()

  const titulo = String(raw.titulo || raw.tipo_de_contrato || 'Contrato (JCyL)').slice(0, 300)

  // Preferimos el presupuesto de licitación; si no, el de adjudicación.
  const importe =
    parseNum(raw.presupuesto_de_licitacion_iva_incluido) ??
    parseNum(raw.presupuesto_de_adjudicacion_iva_incluido) ??
    null
  const valor_eur = toEur(importe, 'EUR')

  const fecha_pub = toIso(raw.fecha_formalizacion)

  // El enlace apunta a la ficha en la Plataforma de Contratación del Sector
  // Público; si no lo da, caemos al portal del dataset.
  const url =
    typeof raw.enlace_de_publicacion === 'string' && raw.enlace_de_publicacion.startsWith('http')
      ? raw.enlace_de_publicacion
      : PUBLIC_URL

  return {
    id: `${FUENTE}:${remoteId}`,
    titulo,
    comprador: String(raw.organo || 'Junta de Castilla y León').slice(0, 200),
    nivel: 'ccaa',
    pais: 'España',
    region: 'Castilla y León',
    valor_eur,
    moneda: 'EUR',
    cpv: null, // el dataset no expone CPV
    plazo: null, // el dataset no expone plazo de presentación (son contratos formalizados)
    fecha_pub,
    url,
    fuente: FUENTE,
    documentos: [],
    idioma: 'es',
  }
}

/**
 * Parsea la respuesta del Explore API. Acepta `{results:[...]}` o un array
 * directo. Pura.
 */
export function parseCastillaLeonItems(json: unknown): {
  items: LicitacionNormalizada[]
  total: number
} {
  if (!json) return { items: [], total: 0 }
  let arr: unknown[] = []
  let total = 0
  if (Array.isArray(json)) {
    arr = json
    total = json.length
  } else if (typeof json === 'object') {
    const o = json as Record<string, unknown>
    if (Array.isArray(o.results)) {
      arr = o.results
      total = typeof o.total_count === 'number' ? o.total_count : o.results.length
    }
  }
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const raw of arr) {
    const item = parseCastillaLeonItem(raw as CastillaLeonRaw)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }
  return { items, total: total || items.length }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}
// ─────────────────────────────────────────────────────────────────────────

/**
 * Trae los últimos contratos formalizados de la Junta de Castilla y León.
 * KEYLESS. Caché 30 min. Degrada a `{ok:false}` ante fallo (nunca lanza).
 */
export async function fetchCastillaLeon(
  opts: { timeoutMs?: number; noCache?: boolean } = {},
): Promise<SourceResult> {
  const params = new URLSearchParams({
    limit: '50',
    order_by: 'fecha_formalizacion desc',
  })
  const url = `${BASE}?${params.toString()}`
  const cacheKey = `castillaleon:${DATASET}:${params.toString()}`

  if (!opts.noCache) {
    const hit = cacheGet(cacheKey)
    if (hit) return hit
  }

  const res = await safeFetch(url, {
    as: 'json',
    timeoutMs: opts.timeoutMs,
    headers: { Accept: 'application/json' },
  })

  if (res.error) return errResult(FUENTE, res.error, PUBLIC_URL)
  if (!res.ok) return errResult(FUENTE, `http_${res.status}`, PUBLIC_URL)

  const { items, total } = parseCastillaLeonItems(res.json)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
