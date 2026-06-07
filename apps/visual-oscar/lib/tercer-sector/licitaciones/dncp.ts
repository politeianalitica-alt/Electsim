/**
 * Conector DNCP — Dirección Nacional de Contrataciones Públicas (Paraguay) · OCDS · TS-Global Gb
 *
 * La DNCP de Paraguay publica su contratación en OCDS. La API documentada
 * (`/datos/api/v3/doc/...`) expone búsquedas de procesos, pero su endpoint de
 * búsqueda exige al menos un filtro y, en la práctica (verificado 2026-06-07),
 * devuelve HTTP 400 ("Al menos un filtro es requerido") sin parámetros y HTTP
 * 404 con los filtros de fecha probados sin token. La DNCP requiere
 * habitualmente una API key (Bearer) para las búsquedas, que NO incluimos (cero
 * secretos). Por eso este conector hace un intento best-effort y DEGRADA
 * HONESTAMENTE (SourceResult ok:false) cuando la API rechaza la consulta. El
 * parser OCDS es PURO y quedaría correcto en cuanto se aporte un endpoint/token
 * válido vía variables de entorno.
 *
 * Endpoint best-effort:
 *   GET https://www.contrataciones.gov.py/datos/api/v3/doc/search/processes?
 *       fecha_desde=YYYY-MM-DD (degrada si la API responde 4xx)
 *   Override opcional (sin secreto): DNCP_SEARCH_URL puede fijar una URL ya
 *   formada (ej. un endpoint OCDS de releases público). Si se necesita token,
 *   DNCP_API_TOKEN se envía como Bearer (no se hardcodea ninguno).
 *
 * Nivel `pais_extranjero` (Paraguay), moneda PYG.
 */
import type { LicitacionNormalizada, SourceResult } from './types.ts'
import { cacheGet, cacheSet, errResult, okResult, parseNum, safeFetch, toIso } from './shared.ts'

const BASE = 'https://www.contrataciones.gov.py/datos/api/v3/doc/search/processes'
const PUBLIC_URL = 'https://www.contrataciones.gov.py'
const FUENTE = 'dncp' as const

// ─────────────────────────────────────────────────────────────────────────
// Parsing OCDS (DNCP) PURO — testeable con fixture
// ─────────────────────────────────────────────────────────────────────────

interface DncpValue {
  amount?: number | string
  currency?: string
}
interface DncpTender {
  title?: string
  description?: string
  value?: DncpValue
  tenderPeriod?: { endDate?: string }
}
interface DncpRelease {
  ocid?: string
  id?: string
  date?: string
  language?: string
  tender?: DncpTender
  buyer?: { name?: string }
  parties?: { name?: string; roles?: string[] }[]
}
/** El registro DNCP puede venir como release suelto o envuelto en `compiledRelease`. */
interface DncpRecord {
  ocid?: string
  compiledRelease?: DncpRelease
  releases?: DncpRelease[]
  tender?: DncpTender
  buyer?: { name?: string }
  date?: string
  language?: string
  parties?: { name?: string; roles?: string[] }[]
}

/** Aplana un registro DNCP a un release OCDS. Puro. */
export function dncpReleaseOf(rec: DncpRecord): DncpRelease {
  if (rec && typeof rec === 'object') {
    if (rec.compiledRelease && typeof rec.compiledRelease === 'object') return rec.compiledRelease
    if (Array.isArray(rec.releases) && rec.releases[0]) return rec.releases[0]
  }
  return rec as DncpRelease
}

/** Mapea un registro/release DNCP al shape común. Puro. */
export function parseDncpRecord(rec: DncpRecord): LicitacionNormalizada | null {
  if (!rec || typeof rec !== 'object') return null
  const rel = dncpReleaseOf(rec)
  const ocid = rel.ocid || rec.ocid || rel.id
  if (!ocid) return null
  const tender = rel.tender ?? {}

  const titulo = tender.title || tender.description || 'Proceso de contratación · DNCP'
  const comprador =
    rel.buyer?.name ||
    rel.parties?.find((p) => p.roles?.includes('buyer') || p.roles?.includes('procuringEntity'))
      ?.name ||
    'Entidad pública (Paraguay)'

  const amount = parseNum(tender.value?.amount)
  const moneda = (tender.value?.currency || 'PYG').toUpperCase()

  return {
    id: `${FUENTE}:${ocid}`,
    titulo: String(titulo).slice(0, 300),
    comprador: String(comprador).slice(0, 200),
    nivel: 'pais_extranjero',
    pais: 'Paraguay',
    region: null,
    valor_eur: null, // PYG con tasa muy pequeña; se conserva moneda, sin FX forzado.
    moneda,
    cpv: null,
    plazo: toIso(tender.tenderPeriod?.endDate),
    fecha_pub: toIso(rel.date),
    url: `${PUBLIC_URL}/buscador/contrataciones.html`,
    fuente: FUENTE,
    documentos: [],
    idioma: (rel.language || 'es').slice(0, 2).toLowerCase(),
  }
}

/**
 * Parsea la respuesta DNCP. Acepta `{records:[...]}`, `{releases:[...]}`,
 * `{list:[...]}`, `{data:[...]}` o un array pelado. Puro.
 */
export function parseDncp(json: unknown): { items: LicitacionNormalizada[]; total: number } {
  if (!json || typeof json !== 'object') return { items: [], total: 0 }
  const o = json as Record<string, unknown>
  let arr: unknown[] = []
  if (Array.isArray(json)) arr = json as unknown[]
  else if (Array.isArray(o.records)) arr = o.records
  else if (Array.isArray(o.releases)) arr = o.releases
  else if (Array.isArray(o.list)) arr = o.list
  else if (Array.isArray(o.data)) arr = o.data
  else if (Array.isArray(o.results)) arr = o.results

  const totalRaw = (o.pagination as { total_count?: number } | undefined)?.total_count
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const rec of arr) {
    const item = parseDncpRecord(rec as DncpRecord)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }
  return { items, total: typeof totalRaw === 'number' ? totalRaw : items.length }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}
// ─────────────────────────────────────────────────────────────────────────

export interface FetchDncpOpts {
  desde?: string
  timeoutMs?: number
  noCache?: boolean
}

export async function fetchDncp(opts: FetchDncpOpts = {}): Promise<SourceResult> {
  const desde =
    opts.desde || new Date(Date.now() - 30 * 24 * 3600_000).toISOString().slice(0, 10)
  // Override opcional sin secreto embebido (puede fijar una URL ya formada).
  const override = (process.env.DNCP_SEARCH_URL || '').trim()
  const url = override || `${BASE}?fecha_desde=${encodeURIComponent(desde)}`
  const token = (process.env.DNCP_API_TOKEN || '').trim()

  const cacheKey = `dncp:${url}`
  if (!opts.noCache) {
    const hit = cacheGet(cacheKey)
    if (hit) return hit
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await safeFetch(url, { as: 'json', timeoutMs: opts.timeoutMs, headers })

  if (res.error) return errResult(FUENTE, res.error, PUBLIC_URL)
  if (!res.ok) {
    // La API pública exige filtro/token; sin él responde 400/404. Degrada honesto.
    const reason =
      res.status === 400
        ? 'filtro_requerido'
        : res.status === 401 || res.status === 403
          ? 'requiere_token'
          : `http_${res.status}`
    return errResult(FUENTE, reason, PUBLIC_URL)
  }

  const { items, total } = parseDncp(res.json)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
