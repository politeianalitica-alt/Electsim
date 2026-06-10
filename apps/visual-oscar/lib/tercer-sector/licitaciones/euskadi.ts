/**
 * Conector Open Data Euskadi — contratación del Gobierno Vasco · CCAA · TS6
 *
 * Open Data Euskadi publica la API REST de Contrataciones Públicas (KEYLESS) del
 * Registro de Contratos del Sector Público de Euskadi. Cubre Gobierno Vasco,
 * sus organismos y entidades locales integradas en su plataforma de
 * contratación (KPE). Modelamos los ANUNCIOS de licitación (`contracting-notices`)
 * porque traen el comprador, el presupuesto, el plazo y la URL en línea, que es
 * lo relevante para la vista de licitaciones (a diferencia de `/contracts`, que
 * son adjudicaciones cerradas y dejan el comprador tras un `_links`).
 *
 * API JSON KEYLESS (verificado 2026-06-09):
 *   GET https://api.euskadi.eus/procurements/contracting-notices?currentPage=N&_elements=10
 *   Respuesta: { totalItems, totalPages, currentPage, itemsOfPage, items: [...] }
 *   El servidor limita `_elements` a 10 y pagina con `currentPage` (NO con `_page`,
 *   que es ignorado). Paginamos para llegar a ~50. La página 1 trae los anuncios
 *   con `id` más alto (registro más reciente primero).
 *   Campos por item (entre otros):
 *     id (number), code, object (título), firstPublicationDate, lastPublicationDate,
 *     deadlineDate (plazo), budgetWithoutVAT (presupuesto base, EUR), entity{name},
 *     contractingAuthority{ name, scope (BIZKAIA/ARABA/GIPUZKOA…), codNUTS },
 *     contractType{name}, mainEntityOfPage (URL ficha). NO expone CPV → null.
 *
 * `parseEuskadiNotice()` / `parseEuskadiNotices()` son PUROS y testeables con un
 * fixture JSON pequeño (sin red).
 */
import type { LicitacionNormalizada, SourceResult } from './types'
import { cacheGet, cacheSet, errResult, okResult, parseNum, safeFetch, toEur, toIso } from './shared'

const BASE = 'https://api.euskadi.eus/procurements/contracting-notices'
const PUBLIC_URL =
  'https://opendata.euskadi.eus/catalogo/-/registro-de-contratos-del-sector-publico-de-euskadi/'
const FUENTE = 'euskadi' as const

// El servidor limita `_elements` a 10; paginamos para acercarnos al objetivo.
const PAGE_SIZE = 10

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixture)
// ─────────────────────────────────────────────────────────────────────────

interface EuskadiEntity {
  id?: number | string
  name?: string
}

interface EuskadiAuthority {
  id?: number | string
  identificationNumber?: string
  name?: string
  /** Territorio histórico: BIZKAIA / ARABA / GIPUZKOA o ámbito autonómico. */
  scope?: string
  codNUTS?: string
}

interface EuskadiNoticeRaw {
  id?: number | string
  code?: string
  object?: string
  firstPublicationDate?: string
  lastPublicationDate?: string
  deadlineDate?: string
  budgetWithoutVAT?: number | string
  entity?: EuskadiEntity
  contractingAuthority?: EuskadiAuthority
  contractType?: { name?: string }
  mainEntityOfPage?: string
}

interface EuskadiResponse {
  totalItems?: number
  totalPages?: number
  currentPage?: number
  itemsOfPage?: number
  items?: EuskadiNoticeRaw[]
}

/** Mapea `scope`/codNUTS al nombre de la CCAA. Siempre País Vasco aquí. */
function resolveRegion(auth: EuskadiAuthority | undefined): string {
  // Todas las autoridades del registro son del País Vasco; el `scope` distingue
  // el territorio histórico, pero la CCAA es siempre la misma.
  return 'País Vasco'
}

/** Resuelve el nombre del comprador tolerando varias formas. */
function resolveComprador(raw: EuskadiNoticeRaw): string {
  const auth = raw.contractingAuthority?.name?.trim()
  if (auth) return auth
  const ent = raw.entity?.name?.trim()
  if (ent) return ent
  return 'Administración (País Vasco)'
}

/** Mapea un anuncio de licitación de Euskadi al shape común. Pura. */
export function parseEuskadiNotice(raw: EuskadiNoticeRaw): LicitacionNormalizada | null {
  if (!raw || typeof raw !== 'object') return null
  const code = raw.id ?? raw.code
  if (code == null) return null

  const titulo = raw.object || raw.code || 'Anuncio de licitación · País Vasco'

  // Presupuesto base de licitación (sin IVA), en EUR. Nunca inventamos.
  const importe = parseNum(raw.budgetWithoutVAT)
  const valor_eur = toEur(importe, 'EUR')

  const url =
    raw.mainEntityOfPage && /^https?:\/\//.test(raw.mainEntityOfPage)
      ? raw.mainEntityOfPage
      : `${BASE}/${String(code)}`

  return {
    id: `${FUENTE}:${String(code)}`,
    titulo: String(titulo).slice(0, 300),
    comprador: resolveComprador(raw).slice(0, 200),
    nivel: 'ccaa',
    pais: 'España',
    region: resolveRegion(raw.contractingAuthority),
    valor_eur,
    moneda: 'EUR',
    cpv: null, // El endpoint de anuncios no expone CPV; no lo inventamos.
    plazo: toIso(raw.deadlineDate),
    fecha_pub: toIso(raw.firstPublicationDate || raw.lastPublicationDate),
    url,
    fuente: FUENTE,
    documentos: [],
    idioma: 'es',
  }
}

/** Parsea una respuesta de la API (objeto `{ items: [...] }`). Pura. */
export function parseEuskadiNotices(json: unknown): {
  items: LicitacionNormalizada[]
  total: number
} {
  if (!json || typeof json !== 'object') return { items: [], total: 0 }
  const o = json as EuskadiResponse
  const arr = Array.isArray(o.items) ? o.items : []
  const total = typeof o.totalItems === 'number' ? o.totalItems : arr.length
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const raw of arr) {
    const item = parseEuskadiNotice(raw)
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

export interface FetchEuskadiOpts {
  /** Máximo de items a devolver (clamp 1-50). Default 50. */
  limit?: number
  timeoutMs?: number
  noCache?: boolean
}

/**
 * Anuncios de licitación recientes del Registro de Contratos del Sector Público
 * de Euskadi. KEYLESS. Caché 30 min. Degrada a `{ok:false}` ante fallo (nunca
 * lanza). El servidor limita la página a 10 items, así que paginamos hasta
 * alcanzar `limit` (~50) o agotar páginas.
 */
export async function fetchEuskadi(
  opts: { timeoutMs?: number; noCache?: boolean } & FetchEuskadiOpts = {},
): Promise<SourceResult> {
  const limit = Math.max(1, Math.min(50, opts.limit ?? 50))
  const maxPages = Math.ceil(limit / PAGE_SIZE)

  const cacheKey = `euskadi:notices:limit=${limit}`
  if (!opts.noCache) {
    const hit = cacheGet(cacheKey)
    if (hit) return hit
  }

  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  let total = 0
  let firstError: string | null = null

  for (let page = 1; page <= maxPages; page++) {
    const params = new URLSearchParams({
      currentPage: String(page),
      _elements: String(PAGE_SIZE),
    })
    const url = `${BASE}?${params.toString()}`

    const res = await safeFetch(url, {
      as: 'json',
      timeoutMs: opts.timeoutMs,
      headers: { Accept: 'application/json' },
    })

    if (res.error || !res.ok) {
      // La primera página fallando es fatal; en páginas posteriores degradamos
      // a lo que ya tengamos (parcial pero honesto).
      if (page === 1) {
        return errResult(FUENTE, res.error || `http_${res.status}`, PUBLIC_URL)
      }
      firstError = res.error || `http_${res.status}`
      break
    }

    const parsed = parseEuskadiNotices(res.json)
    if (parsed.total) total = parsed.total
    for (const it of parsed.items) {
      if (!seen.has(it.id)) {
        seen.add(it.id)
        items.push(it)
      }
    }
    // Si la página vino vacía, no hay más que paginar.
    if (parsed.items.length === 0) break
    if (items.length >= limit) break
  }

  const sliced = items.slice(0, limit)
  if (sliced.length === 0) {
    return errResult(FUENTE, firstError || 'sin_datos', PUBLIC_URL)
  }

  const result = okResult(FUENTE, sliced, PUBLIC_URL, total || sliced.length)
  cacheSet(cacheKey, result)
  return result
}
