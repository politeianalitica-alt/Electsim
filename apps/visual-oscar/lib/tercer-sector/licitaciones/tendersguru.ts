/**
 * Conector Tenders.guru — agregador multi-país (UE) · TS2-lic-src
 *
 * Tenders.guru ofrece una API JSON KEYLESS con licitaciones de varios países
 * europeos (ES, FR, DE, PL, RO, UK, etc.) en un formato homogéneo y, lo más
 * valioso para esta vista, con un endpoint de DOCUMENTOS por licitación. Permite
 * cubrir niveles `pais_extranjero` (y `ccaa`/`nacional_es` para ES, aunque ahí
 * preferimos PLACE).
 *
 * API:
 *   GET https://tenders.guru/api/<cc>/tenders?page=N      (cc = es, fr, de, pl…)
 *   GET https://tenders.guru/api/<cc>/tenders/{id}/docs   (documentos de pliego)
 *   Respuesta lista: { count, data: [ { id, title, awarded_value, awarded_currency,
 *     deadline_date, publication_date, awarding_authority:{...}, cpvs:[...], ... } ] }
 *
 * `parseTendersGuru()` y `parseTendersGuruDocs()` son PUROS y testeables.
 * El enriquecimiento de documentos es OPCIONAL (una llamada por licitación), se
 * limita a las primeras N para no abusar y degrada en silencio si falla.
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

const BASE = 'https://tenders.guru/api'
const PUBLIC_URL = 'https://tenders.guru'
const FUENTE = 'tendersguru' as const

/** Países soportados por Tenders.guru (los más relevantes). */
export const TG_COUNTRIES = ['es', 'fr', 'de', 'pl', 'ro', 'uk', 'gb'] as const

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixture)
// ─────────────────────────────────────────────────────────────────────────

interface TgAuthority {
  name?: string
  city?: string
  county?: string
}
interface TgCpv {
  code?: string
  name?: string
}
interface TgTender {
  id?: string | number
  title?: string
  description?: string
  status?: string
  awarded_value?: string | number
  awarded_currency?: string
  value?: string | number
  currency?: string
  deadline_date?: string
  publication_date?: string
  date?: string
  awarding_authority?: TgAuthority | string
  authority?: TgAuthority | string
  cpvs?: TgCpv[]
  cpv_codes?: string[]
  sid?: string
  src?: string
}

function authorityName(a: TgAuthority | string | undefined): string {
  if (!a) return 'Comprador público'
  if (typeof a === 'string') return a
  return a.name || 'Comprador público'
}
function authorityRegion(a: TgAuthority | string | undefined): string | null {
  if (!a || typeof a === 'string') return null
  return a.county || a.city || null
}

/** Nivel a partir del país: España → ccaa/nacional según región; resto → extranjero. */
function nivelForCountry(cc: string, region: string | null): LicitacionNormalizada['nivel'] {
  const c = cc.toLowerCase()
  if (c === 'es') return region ? 'ccaa' : 'nacional_es'
  return 'pais_extranjero'
}

/** Parsea un tender de Tenders.guru al shape común. Pura. `cc` = país del feed. */
export function parseTgTender(t: TgTender, cc: string): LicitacionNormalizada | null {
  if (!t || typeof t !== 'object') return null
  const rawId = t.id ?? t.sid
  if (rawId == null) return null
  const id = `tendersguru:${cc}:${rawId}`

  const titulo = t.title || t.description || 'Licitación'
  const auth = t.awarding_authority ?? t.authority
  const comprador = authorityName(auth)
  const region = authorityRegion(auth)

  // Valor + moneda (preferimos awarded; si no, value).
  const rawVal = t.awarded_value ?? t.value
  const moneda = (t.awarded_currency || t.currency || 'EUR').toUpperCase()
  const amount = parseNum(rawVal)
  const valorEur = moneda === 'EUR' ? amount : toEur(amount, moneda)

  // CPV principal.
  let cpv: string | null = null
  if (Array.isArray(t.cpvs) && t.cpvs.length) cpv = normalizeCpv(t.cpvs[0]?.code)
  else if (Array.isArray(t.cpv_codes) && t.cpv_codes.length) cpv = normalizeCpv(t.cpv_codes[0])

  const fechaPub = toIso(t.publication_date || t.date)
  const plazo = toIso(t.deadline_date)
  const ccUp = cc === 'uk' ? 'GB' : cc.toUpperCase()

  return {
    id,
    titulo: String(titulo).slice(0, 300),
    comprador: comprador.slice(0, 200),
    nivel: nivelForCountry(cc, region),
    pais: countryName(ccUp),
    region,
    valor_eur: valorEur,
    moneda,
    cpv,
    plazo,
    fecha_pub: fechaPub,
    url: t.src && /^https?:\/\//.test(t.src) ? t.src : `${PUBLIC_URL}/${cc}/tenders/${rawId}`,
    fuente: FUENTE,
    documentos: [],
    idioma: cc === 'es' ? 'es' : 'en',
  }
}

/** Parsea la lista de tenders. Acepta `{data:[...]}`. Pura. */
export function parseTendersGuru(
  json: unknown,
  cc: string,
): { items: LicitacionNormalizada[]; total: number } {
  if (!json || typeof json !== 'object') return { items: [], total: 0 }
  const o = json as Record<string, unknown>
  const arr = Array.isArray(o.data) ? o.data : Array.isArray(json) ? (json as unknown[]) : []
  const total = typeof o.count === 'number' ? o.count : arr.length
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const t of arr) {
    const item = parseTgTender(t as TgTender, cc)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }
  return { items, total }
}

/** Parsea el endpoint de documentos `/tenders/{id}/docs`. Pura. */
export function parseTendersGuruDocs(json: unknown): DocumentoLicitacion[] {
  if (!json) return []
  let arr: unknown[] = []
  if (Array.isArray(json)) arr = json
  else if (typeof json === 'object') {
    const o = json as Record<string, unknown>
    if (Array.isArray(o.data)) arr = o.data
    else if (Array.isArray(o.documents)) arr = o.documents
  }
  const docs: DocumentoLicitacion[] = []
  const seen = new Set<string>()
  for (const d of arr) {
    const doc = d as Record<string, unknown>
    const url = typeof doc.url === 'string' ? doc.url : typeof doc.link === 'string' ? doc.link : ''
    if (!url || !/^https?:\/\//.test(url)) continue
    if (seen.has(url)) continue
    seen.add(url)
    const nombre = (doc.name || doc.title || doc.type || 'Documento') as string
    docs.push({
      nombre: String(nombre).slice(0, 200),
      url,
      formato: detectFormat(url, typeof doc.type === 'string' ? doc.type : undefined),
      tipo: 'pliego',
    })
  }
  return docs
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}
// ─────────────────────────────────────────────────────────────────────────

export interface FetchTendersGuruOpts {
  /** País ISO-2 del feed (default 'es'). */
  cc?: string
  q?: string
  page?: number
  /** Enriquecer con documentos las primeras N licitaciones (default 0 · off). */
  withDocsLimit?: number
  timeoutMs?: number
  noCache?: boolean
}

/** Filtra por texto en cliente (la API no siempre soporta q). Pura. */
export function filterByText(items: LicitacionNormalizada[], q: string | undefined): LicitacionNormalizada[] {
  if (!q) return items
  const needle = q.toLowerCase()
  return items.filter(
    (i) => i.titulo.toLowerCase().includes(needle) || i.comprador.toLowerCase().includes(needle),
  )
}

export async function fetchTendersGuru(opts: FetchTendersGuruOpts = {}): Promise<SourceResult> {
  const cc = (opts.cc || 'es').toLowerCase()
  const page = Math.max(1, opts.page ?? 1)
  const url = `${BASE}/${cc}/tenders?page=${page}`
  const cacheKey = `tendersguru:${cc}:${page}:${opts.q ?? ''}:${opts.withDocsLimit ?? 0}`
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

  let { items } = parseTendersGuru(res.json, cc)
  const { total } = parseTendersGuru(res.json, cc)
  items = filterByText(items, opts.q)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  // Enriquecimiento OPCIONAL de documentos (limitado). Degrada en silencio.
  const docsLimit = Math.max(0, Math.min(10, opts.withDocsLimit ?? 0))
  if (docsLimit > 0) {
    const targets = items.slice(0, docsLimit)
    await Promise.all(
      targets.map(async (it) => {
        const rawId = it.id.split(':').pop()
        if (!rawId) return
        const dres = await safeFetch(`${BASE}/${cc}/tenders/${rawId}/docs`, {
          as: 'json',
          timeoutMs: Math.min(4000, opts.timeoutMs ?? 4000),
          headers: { Accept: 'application/json' },
        })
        if (dres.ok && dres.json) {
          it.documentos = parseTendersGuruDocs(dres.json)
        }
      }),
    )
  }

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
