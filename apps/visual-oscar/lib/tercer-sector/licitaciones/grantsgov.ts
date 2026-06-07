/**
 * Conector Grants.gov — US Federal Grants · país extranjero · TS-Global Gb
 *
 * Grants.gov es el portal único de subvenciones (grants) del gobierno federal de
 * Estados Unidos. Su API de búsqueda `search2` es KEYLESS (POST sin auth), lo que
 * la hace ideal para el agregador. Para una ONG/tercer sector son oportunidades
 * de primer orden (programas federales, fondos de cooperación, salud, educación).
 * Nivel `pais_extranjero` (Estados Unidos).
 *
 * API JSON KEYLESS (verificado 2026-06-07):
 *   POST https://api.grants.gov/v1/api/search2
 *   body: { "keyword": "", "oppStatuses": "posted", "rows": 50 }
 *   Respuesta: { errorcode, msg, data: { hitCount, oppHits: [ { id, number,
 *     title, agency, agencyCode, openDate, closeDate, oppStatus, docType,
 *     cfdaList } ] } }
 *   Fechas en formato MM/DD/YYYY. Importe NO viene en la búsqueda (los grants
 *   publican rangos de financiación solo en el detalle) → valor_eur=null.
 *
 * `parseGrantsGov()` es PURO y testeable con un fixture (sin red).
 */
import type { LicitacionNormalizada, SourceResult } from './types.ts'
import { cacheGet, cacheSet, errResult, okResult, safeFetch, toIso } from './shared.ts'

const BASE = 'https://api.grants.gov/v1/api/search2'
const PUBLIC_URL = 'https://grants.gov'
const FUENTE = 'grantsgov' as const

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixture)
// ─────────────────────────────────────────────────────────────────────────

interface GrantHit {
  id?: string | number
  number?: string
  title?: string
  agency?: string
  agencyName?: string
  agencyCode?: string
  openDate?: string
  closeDate?: string
  oppStatus?: string
  docType?: string
  cfdaList?: string[]
}

/**
 * Normaliza una fecha MM/DD/YYYY (formato grants.gov) a ISO-8601, con fallback al
 * parser genérico `toIso`. Devuelve null para huecos. Pura.
 */
export function grantsDate(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const mm = m[1].padStart(2, '0')
    const dd = m[2].padStart(2, '0')
    return `${m[3]}-${mm}-${dd}`
  }
  return toIso(s)
}

/** Mapea un grant del `oppHits` al shape común. Pura. */
export function parseGrantHit(h: GrantHit): LicitacionNormalizada | null {
  if (!h || typeof h !== 'object') return null
  const ref = h.id != null ? String(h.id) : h.number
  if (!ref) return null

  const titulo = h.title || h.number || 'Subvención federal · Grants.gov'
  // El campo del organismo es `agency` (la API también ha usado `agencyName`).
  const comprador = h.agency || h.agencyName || h.agencyCode || 'Gobierno federal de EE. UU.'

  return {
    id: `${FUENTE}:${ref}`,
    titulo: String(titulo).slice(0, 300),
    comprador: String(comprador).slice(0, 200),
    nivel: 'pais_extranjero',
    pais: 'Estados Unidos',
    region: null,
    valor_eur: null, // La búsqueda no expone importe; no se inventa FX.
    moneda: 'USD',
    cpv: null, // Grants.gov usa CFDA, no CPV.
    plazo: grantsDate(h.closeDate),
    fecha_pub: grantsDate(h.openDate),
    url: `https://grants.gov/search-results-detail/${encodeURIComponent(ref)}`,
    fuente: FUENTE,
    documentos: [],
    idioma: 'en',
  }
}

/** Parsea la respuesta de `search2`. Acepta `{data:{oppHits:[...]}}`. Pura. */
export function parseGrantsGov(json: unknown): { items: LicitacionNormalizada[]; total: number } {
  if (!json || typeof json !== 'object') return { items: [], total: 0 }
  const o = json as Record<string, unknown>
  const data = (o.data && typeof o.data === 'object' ? o.data : o) as Record<string, unknown>
  const hits = Array.isArray(data.oppHits) ? data.oppHits : []
  const total = typeof data.hitCount === 'number' ? data.hitCount : hits.length
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const h of hits) {
    const item = parseGrantHit(h as GrantHit)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }
  return { items, total }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}
// ─────────────────────────────────────────────────────────────────────────

export interface FetchGrantsGovOpts {
  keyword?: string
  rows?: number
  timeoutMs?: number
  noCache?: boolean
}

export async function fetchGrantsGov(opts: FetchGrantsGovOpts = {}): Promise<SourceResult> {
  const rows = Math.max(1, Math.min(100, opts.rows ?? 50))
  const keyword = (opts.keyword ?? '').trim()
  const payload = { keyword, oppStatuses: 'posted', rows }
  const body = JSON.stringify(payload)
  const cacheKey = `grantsgov:${body}`
  if (!opts.noCache) {
    const hit = cacheGet(cacheKey)
    if (hit) return hit
  }

  const res = await safeFetch(BASE, {
    as: 'json',
    method: 'POST',
    timeoutMs: opts.timeoutMs,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body,
  })

  if (res.error) return errResult(FUENTE, res.error, PUBLIC_URL)
  if (!res.ok) return errResult(FUENTE, `http_${res.status}`, PUBLIC_URL)

  const { items, total } = parseGrantsGov(res.json)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
