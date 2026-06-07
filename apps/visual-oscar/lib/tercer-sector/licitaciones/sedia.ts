/**
 * Conector SEDIA — EU Funding & Tenders Portal (grants) · UE · TS2-lic-src
 *
 * El portal Funding & Tenders de la Comisión Europea publica las convocatorias
 * de subvenciones (grants / calls for proposals) de programas clave para ONGs:
 * CERV (ciudadanía/valores), ESF+ (social), Horizon (investigación social),
 * AMIF, etc. Es una pieza central de financiación del tercer sector a nivel UE.
 *
 * API de búsqueda (search-api): el portal expone un endpoint público con un
 * apiKey FIJO y PÚBLICO ("SEDIA") — NO es un secreto, es el identificador del
 * cliente web del propio portal:
 *   POST https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA
 *   multipart/form-data con `query` (JSON), `text`, `pageSize`, `pageNumber`.
 *
 * Como el contrato multipart varía, hacemos una llamada GET simple primero con
 * query params (algunas variantes la aceptan) y degradamos honestamente si la
 * respuesta no trae resultados. `parseSediaResults()` es PURO y testeable.
 */
import type { LicitacionNormalizada, SourceResult } from './types'
import { cacheGet, cacheSet, errResult, okResult, parseNum, safeFetch, toIso } from './shared'
import { normalizeCpv } from './cpv'

const SEARCH_URL = 'https://api.tech.ec.europa.eu/search-api/prod/rest/search'
// apiKey PÚBLICO del cliente web del portal F&T (no es un secreto del usuario).
const PUBLIC_API_KEY = 'SEDIA'
const PUBLIC_URL = 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities'
const FUENTE = 'sedia' as const

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixture)
// ─────────────────────────────────────────────────────────────────────────

interface SediaMetadata {
  // El search-api devuelve metadata como arrays de strings.
  identifier?: string[]
  title?: string[]
  callTitle?: string[]
  frameworkProgramme?: string[]
  programmePeriod?: string[]
  deadlineDate?: string[]
  startDate?: string[]
  publicationDate?: string[]
  cpv?: string[]
  budgetOverview?: string[]
  url?: string[]
  status?: string[]
}

interface SediaResult {
  reference?: string
  url?: string
  title?: string
  metadata?: SediaMetadata
  content?: string
}

function firstStr(a: string[] | undefined): string | null {
  if (!a || !a.length) return null
  const v = a.find((x) => x != null && String(x).trim() !== '')
  return v != null ? String(v) : null
}

/** Parsea un result del search-api SEDIA al shape común. Pura. */
export function parseSediaResult(r: SediaResult): LicitacionNormalizada | null {
  if (!r || typeof r !== 'object') return null
  const md = r.metadata ?? {}
  const ref = r.reference || firstStr(md.identifier)
  if (!ref) return null
  const id = `sedia:${ref}`

  const titulo =
    r.title || firstStr(md.title) || firstStr(md.callTitle) || 'Convocatoria de financiación UE'
  const programa = firstStr(md.frameworkProgramme) || 'Comisión Europea'

  // Budget: el campo es texto libre (ej. "EUR 30 000 000"); extraemos número.
  const budgetTxt = firstStr(md.budgetOverview)
  let valor: number | null = null
  if (budgetTxt) {
    const m = budgetTxt.replace(/\s/g, '').match(/([\d.,]{4,})/)
    if (m) valor = parseNum(m[1])
  }

  const cpv = normalizeCpv(firstStr(md.cpv))
  const fechaPub = toIso(firstStr(md.publicationDate) || firstStr(md.startDate))
  const plazo = toIso(firstStr(md.deadlineDate))
  const url = r.url || firstStr(md.url) || PUBLIC_URL

  return {
    id,
    titulo: String(titulo).slice(0, 300),
    comprador: `Comisión Europea · ${programa}`.slice(0, 200),
    nivel: 'ue',
    pais: 'Unión Europea',
    region: null,
    valor_eur: valor,
    moneda: 'EUR',
    cpv,
    plazo,
    fecha_pub: fechaPub,
    url,
    fuente: FUENTE,
    documentos: [], // los docs de la call viven en su ficha (topic page).
    idioma: 'en',
  }
}

/** Parsea la respuesta del search-api. Acepta `{results:[...]}`. Pura. */
export function parseSediaResults(json: unknown): { items: LicitacionNormalizada[]; total: number } {
  if (!json || typeof json !== 'object') return { items: [], total: 0 }
  const o = json as Record<string, unknown>
  const arr = Array.isArray(o.results) ? o.results : []
  const total = typeof o.totalResults === 'number' ? o.totalResults : arr.length
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const r of arr) {
    const item = parseSediaResult(r as SediaResult)
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

export interface FetchSediaOpts {
  q?: string
  page?: number
  pageSize?: number
  timeoutMs?: number
  noCache?: boolean
}

export async function fetchSedia(opts: FetchSediaOpts = {}): Promise<SourceResult> {
  const pageNumber = Math.max(1, opts.page ?? 1)
  const pageSize = Math.max(1, Math.min(100, opts.pageSize ?? 30))
  // Buscamos grants (type=1) abiertos; el texto prioriza relevancia social si no hay q.
  const text = opts.q && opts.q.trim() ? opts.q.trim() : 'social OR health OR development OR cooperation'

  const url = `${SEARCH_URL}?apiKey=${PUBLIC_API_KEY}&text=${encodeURIComponent(text)}&pageSize=${pageSize}&pageNumber=${pageNumber}`
  const cacheKey = `sedia:${text}:${pageNumber}:${pageSize}`
  if (!opts.noCache) {
    const hit = cacheGet(cacheKey)
    if (hit) return hit
  }

  // El portal espera la query como form field; mandamos un body mínimo que el
  // search-api tolera (query vacía → usa text). Si falla, degrada.
  const queryJson = JSON.stringify({
    bool: {
      must: [{ terms: { type: ['1', '2'] } }],
    },
  })
  const form = `query=${encodeURIComponent(queryJson)}&text=${encodeURIComponent(text)}&pageSize=${pageSize}&pageNumber=${pageNumber}`

  const res = await safeFetch(url, {
    as: 'json',
    method: 'POST',
    body: form,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    timeoutMs: opts.timeoutMs,
  })

  if (res.error) return errResult(FUENTE, res.error, PUBLIC_URL)
  if (!res.ok) return errResult(FUENTE, `http_${res.status}`, PUBLIC_URL)

  const { items, total } = parseSediaResults(res.json)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
