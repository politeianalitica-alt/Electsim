/**
 * Conector World Bank — Procurement Notices · org. internacional · TS2-lic-src
 *
 * El Banco Mundial publica sus avisos de contratación (proyectos de desarrollo)
 * de forma KEYLESS. Para una ONG de cooperación son licitaciones de primer
 * orden: proyectos en países receptores, consultorías, suministros, obras.
 * Nivel `org_internacional`.
 *
 * API JSON KEYLESS:
 *   GET https://search.worldbank.org/api/v2/procnotices?format=json&rows=N&
 *       os=0&apilang=en&fct=... (búsqueda por `qterm`, filtros por país, etc.)
 *   Respuesta: { procnotices: [ {...} ], total } (los nombres de campo varían;
 *   el parser es defensivo). Importes en USD normalmente.
 *
 * `parseWorldbankNotices()` es PURO y testeable con un fixture (sin red).
 */
import type { LicitacionNormalizada, SourceResult } from './types'
import {
  cacheGet,
  cacheSet,
  countryName,
  errResult,
  okResult,
  parseNum,
  safeFetch,
  toEur,
  toIso,
} from './shared'

const BASE = 'https://search.worldbank.org/api/v2/procnotices'
const PUBLIC_URL = 'https://projects.worldbank.org/en/projects-operations/procurement'
const FUENTE = 'worldbank' as const

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixture)
// ─────────────────────────────────────────────────────────────────────────

interface WbNotice {
  id?: string
  notice_id?: string
  bid_reference_no?: string
  noticetype?: string
  notice_type?: string
  project_name?: string
  project_title?: string
  title?: string
  notice_text?: string
  bid_description?: string
  country_name?: string
  countryname?: string
  project_ctry_name?: string
  noticedate?: string
  submission_date?: string
  notice_lang_name?: string
  url?: string
  contractvalue?: string | number
  procurement_method_name?: string
}

/** Parsea un procnotice del WB al shape común. Pura. */
export function parseWbNotice(n: WbNotice): LicitacionNormalizada | null {
  if (!n || typeof n !== 'object') return null
  const ref = n.id || n.notice_id || n.bid_reference_no
  if (!ref) return null
  const id = `worldbank:${ref}`

  const titulo =
    n.title ||
    n.project_title ||
    n.project_name ||
    n.bid_description ||
    n.notice_text ||
    'Aviso de contratación · Banco Mundial'

  const paisRaw = n.country_name || n.countryname || n.project_ctry_name || ''
  const pais = paisRaw ? countryName(paisRaw) || paisRaw : 'Internacional'

  // Importe (USD habitualmente).
  const valorUsd = parseNum(n.contractvalue)
  const valorEur = valorUsd != null ? toEur(valorUsd, 'USD') : null

  const fechaPub = toIso(n.noticedate)
  const plazo = toIso(n.submission_date)

  const url =
    n.url && /^https?:\/\//.test(n.url)
      ? n.url
      : `https://projects.worldbank.org/en/projects-operations/procurement-detail/${ref}`

  return {
    id,
    titulo: String(titulo).slice(0, 300),
    comprador: 'Banco Mundial (World Bank)',
    nivel: 'org_internacional',
    pais,
    region: paisRaw ? String(paisRaw) : null,
    valor_eur: valorEur,
    moneda: 'USD',
    cpv: null, // WB no usa CPV.
    plazo,
    fecha_pub: fechaPub,
    url,
    fuente: FUENTE,
    documentos: [],
    idioma: (n.notice_lang_name || 'en').toLowerCase().startsWith('span') ? 'es' : 'en',
  }
}

/** Parsea la respuesta del WB. Acepta `{procnotices:[...]}` o `{documents}`. Pura. */
export function parseWorldbankNotices(json: unknown): {
  items: LicitacionNormalizada[]
  total: number
} {
  if (!json || typeof json !== 'object') return { items: [], total: 0 }
  const o = json as Record<string, unknown>
  let arr: unknown[] = []
  if (Array.isArray(o.procnotices)) arr = o.procnotices
  else if (o.procnotices && typeof o.procnotices === 'object')
    arr = Object.values(o.procnotices as Record<string, unknown>)
  else if (Array.isArray(o.documents)) arr = o.documents
  else if (o.documents && typeof o.documents === 'object')
    arr = Object.values(o.documents as Record<string, unknown>)
  const total = typeof o.total === 'number' ? o.total : arr.length
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const n of arr) {
    const item = parseWbNotice(n as WbNotice)
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

export interface FetchWorldbankOpts {
  q?: string
  page?: number
  pageSize?: number
  timeoutMs?: number
  noCache?: boolean
}

export async function fetchWorldbank(opts: FetchWorldbankOpts = {}): Promise<SourceResult> {
  const pageSize = Math.max(1, Math.min(100, opts.pageSize ?? 30))
  const os = Math.max(0, ((opts.page ?? 1) - 1) * pageSize)

  const params = new URLSearchParams({
    format: 'json',
    rows: String(pageSize),
    os: String(os),
    apilang: 'en',
    srt: 'noticedate',
    order: 'desc',
  })
  if (opts.q) params.set('qterm', opts.q)

  const url = `${BASE}?${params.toString()}`
  const cacheKey = `worldbank:${params.toString()}`
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

  const { items, total } = parseWorldbankNotices(res.json)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
