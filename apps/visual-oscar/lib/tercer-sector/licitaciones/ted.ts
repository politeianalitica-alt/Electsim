/**
 * Conector TED — Tenders Electronic Daily (UE) · TS2-lic-src
 *
 * TED es el portal oficial de licitaciones públicas de la UE: todas las que
 * superan umbrales UE en 30+ países desde 1993. Para el tercer sector da las
 * grandes licitaciones europeas de servicios sociales/salud/cooperación.
 *
 * API v3 (Search): POST https://api.ted.europa.eu/v3/notices/search
 *   Body JSON: { query: "<expert query>", fields: [...], page, limit, scope }
 *   La API key (`TED_API_KEY`) es GRATUITA y mejora límites; el endpoint de
 *   búsqueda admite consultas anónimas con límites más bajos. Si no hay key, lo
 *   intentamos igualmente y, si responde 401, degradamos honestamente.
 *   La cabecera de auth aceptada es `Authorization: <key>` (sin Bearer en v3) o
 *   `?apiKey=`; enviamos la key por header cuando existe.
 *
 * Expert query (lenguaje TED): combinamos `place-of-performance`, rango de
 * `publication-date` y CPV (`classification-cpv`). Campos pedidos: notice id,
 * título, comprador, fechas, valor, CPV, links a documentos.
 *
 * `parseTedNotices()` es PURO y testeable con un fixture pequeño (sin red).
 */
import type { DocumentoLicitacion, LicitacionNormalizada, SourceResult } from './types'
import {
  cacheGet,
  cacheSet,
  countryName,
  detectFormat,
  errResult,
  okResult,
  parseNum,
  safeFetch,
  toEur,
  toIso,
} from './shared'
import { normalizeCpv } from './cpv'

const SEARCH_URL = 'https://api.ted.europa.eu/v3/notices/search'
const PUBLIC_URL = 'https://ted.europa.eu'
const FUENTE = 'ted' as const

// Campos que pedimos a la API v3 (nombres eForms / legacy tolerados por el parser).
const FIELDS = [
  'publication-number',
  'notice-title',
  'buyer-name',
  'publication-date',
  'deadline-receipt-tender-date-lot',
  'place-of-performance',
  'total-value',
  'classification-cpv',
  'links',
]

// ─────────────────────────────────────────────────────────────────────────
// Helpers de extracción tolerantes (la API mezcla strings, arrays y objetos
// multilingües {eng:[...], spa:[...]}). PUROS.
// ─────────────────────────────────────────────────────────────────────────

/** Primer valor "plano" de un campo que puede ser string|array|obj multiidioma. */
export function tedFirst(v: unknown, langPref = ['spa', 'es', 'eng', 'en']): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = tedFirst(x, langPref)
      if (r) return r
    }
    return null
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    for (const lang of langPref) {
      if (o[lang] != null) {
        const r = tedFirst(o[lang], langPref)
        if (r) return r
      }
    }
    // Primer valor cualquiera.
    for (const k of Object.keys(o)) {
      const r = tedFirst(o[k], langPref)
      if (r) return r
    }
  }
  return null
}

/** Extrae documentos del campo `links` (pdf/html/xml de la notice). Puro. */
export function extractTedDocs(notice: Record<string, unknown>): DocumentoLicitacion[] {
  const docs: DocumentoLicitacion[] = []
  const seen = new Set<string>()
  const links = notice.links as Record<string, unknown> | undefined
  if (!links || typeof links !== 'object') return docs
  // links suele ser { pdf: {ENG: url, SPA: url}, xml: {...}, html: {...} }
  for (const fmt of Object.keys(links)) {
    const byLang = links[fmt]
    const url = tedFirst(byLang)
    if (!url || !/^https?:\/\//.test(url)) continue
    if (seen.has(url)) continue
    seen.add(url)
    docs.push({
      nombre: `Anuncio TED (${fmt.toUpperCase()})`,
      url,
      formato: detectFormat(url, fmt),
      tipo: 'anuncio',
    })
  }
  return docs
}

/** Parsea una notice individual de TED al shape común. Pura. */
export function parseTedNotice(notice: Record<string, unknown>): LicitacionNormalizada | null {
  if (!notice || typeof notice !== 'object') return null
  const pubNum =
    tedFirst(notice['publication-number']) ??
    tedFirst(notice['ND']) ??
    tedFirst(notice['id'])
  if (!pubNum) return null
  const id = `ted:${pubNum}`

  const titulo =
    tedFirst(notice['notice-title']) ??
    tedFirst(notice['TI']) ??
    tedFirst(notice['title']) ??
    'Anuncio TED'

  const comprador =
    tedFirst(notice['buyer-name']) ?? tedFirst(notice['AA']) ?? 'Organismo UE'

  // País / lugar de ejecución (ISO-3 normalmente).
  const placeRaw =
    tedFirst(notice['place-of-performance']) ??
    tedFirst(notice['country']) ??
    tedFirst(notice['CY'])
  const pais = placeRaw ? countryName(placeRaw) : 'Unión Europea'

  // Valor + moneda.
  const valorRaw = notice['total-value']
  let valor: number | null = null
  let moneda = 'EUR'
  if (valorRaw && typeof valorRaw === 'object') {
    const vo = valorRaw as Record<string, unknown>
    valor = parseNum(vo.amount ?? vo.value ?? tedFirst(valorRaw))
    moneda = (tedFirst(vo.currency) ?? 'EUR').toUpperCase()
  } else {
    valor = parseNum(tedFirst(valorRaw))
  }
  const valorEur = moneda === 'EUR' ? valor : toEur(valor, moneda)

  // CPV principal.
  const cpvRaw =
    tedFirst(notice['classification-cpv']) ?? tedFirst(notice['PC']) ?? tedFirst(notice['cpv'])
  const cpv = normalizeCpv(cpvRaw)

  const fechaPub = toIso(tedFirst(notice['publication-date']) ?? tedFirst(notice['PD']))
  const plazo = toIso(
    tedFirst(notice['deadline-receipt-tender-date-lot']) ?? tedFirst(notice['DT']),
  )

  const documentos = extractTedDocs(notice)
  const url =
    documentos.find((d) => d.formato === 'html')?.url ||
    `${PUBLIC_URL}/udl?uri=TED:NOTICE:${pubNum}:TEXT:EN:HTML`

  return {
    id,
    titulo: String(titulo).slice(0, 300),
    comprador: String(comprador).slice(0, 200),
    nivel: 'ue',
    pais,
    region: null,
    valor_eur: valorEur,
    moneda,
    cpv,
    plazo,
    fecha_pub: fechaPub,
    url,
    fuente: FUENTE,
    documentos,
    idioma: 'en',
  }
}

/** Parsea la respuesta de búsqueda de TED. Acepta `{notices:[...]}` o `{results}`. Pura. */
export function parseTedNotices(json: unknown): { items: LicitacionNormalizada[]; total: number } {
  if (!json || typeof json !== 'object') return { items: [], total: 0 }
  const o = json as Record<string, unknown>
  let arr: unknown[] = []
  if (Array.isArray(o.notices)) arr = o.notices
  else if (Array.isArray(o.results)) arr = o.results
  else if (Array.isArray((o.response as Record<string, unknown>)?.docs))
    arr = (o.response as Record<string, unknown>).docs as unknown[]
  const total =
    (typeof o.totalNoticeCount === 'number' && o.totalNoticeCount) ||
    (typeof o.total === 'number' && o.total) ||
    arr.length
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const n of arr) {
    const item = parseTedNotice(n as Record<string, unknown>)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }
  return { items, total }
}

// ─────────────────────────────────────────────────────────────────────────
// Construcción de la expert query (PURA)
// ─────────────────────────────────────────────────────────────────────────

/** Construye la consulta TED expert search a partir de filtros. Pura. */
export function buildTedQuery(opts: {
  countryIso3?: string
  desde?: string
  hasta?: string
  cpv?: string
  q?: string
}): string {
  const clauses: string[] = []
  if (opts.countryIso3) clauses.push(`place-of-performance=${opts.countryIso3.toUpperCase()}`)
  const df = (opts.desde || '').replace(/-/g, '')
  const dt = (opts.hasta || '').replace(/-/g, '')
  if (df && dt) clauses.push(`publication-date>=${df} AND publication-date<=${dt}`)
  else if (df) clauses.push(`publication-date>=${df}`)
  if (opts.cpv) {
    const c = normalizeCpv(opts.cpv)
    if (c) clauses.push(`classification-cpv=${c}*`)
  }
  if (opts.q) {
    const safe = opts.q.replace(/["\\]/g, ' ').trim()
    if (safe) clauses.push(`FT~"${safe}"`)
  }
  return clauses.length ? clauses.join(' AND ') : 'publication-date>=20240101'
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}
// ─────────────────────────────────────────────────────────────────────────

export interface FetchTedOpts {
  countryIso3?: string
  desde?: string
  hasta?: string
  cpv?: string
  q?: string
  page?: number
  limit?: number
  timeoutMs?: number
  noCache?: boolean
}

export async function fetchTed(opts: FetchTedOpts = {}): Promise<SourceResult> {
  const query = buildTedQuery(opts)
  const page = Math.max(1, opts.page ?? 1)
  const limit = Math.max(1, Math.min(100, opts.limit ?? 30))

  const body = JSON.stringify({
    query,
    fields: FIELDS,
    page,
    limit,
    scope: 'ALL',
    paginationMode: 'PAGE_NUMBER',
  })

  const cacheKey = `ted:${query}:${page}:${limit}`
  if (!opts.noCache) {
    const hit = cacheGet(cacheKey)
    if (hit) return hit
  }

  const apiKey = process.env.TED_API_KEY || ''
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (apiKey) headers['Authorization'] = apiKey

  const res = await safeFetch(SEARCH_URL, {
    as: 'json',
    method: 'POST',
    body,
    headers,
    timeoutMs: opts.timeoutMs,
  })

  if (res.error) return errResult(FUENTE, res.error, PUBLIC_URL)
  if (res.status === 401 || res.status === 403) {
    return errResult(
      FUENTE,
      `unauthorized · TED v3 requiere ${apiKey ? 'una key válida' : 'TED_API_KEY (gratuita)'} para esta consulta. Configúrala en Vercel env vars.`,
      PUBLIC_URL,
    )
  }
  if (res.status === 429) return errResult(FUENTE, 'rate_limited · TED', PUBLIC_URL)
  if (!res.ok) return errResult(FUENTE, `http_${res.status}`, PUBLIC_URL)

  const { items, total } = parseTedNotices(res.json)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
