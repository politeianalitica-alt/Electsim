/**
 * Conector Prozorro — Public Procurement de Ucrania · país extranjero · TS-Global Gb
 *
 * Prozorro es el sistema nacional de contratación pública de Ucrania. Su API
 * pública 2.5 es KEYLESS. Relevante para tercer sector / cooperación dado el
 * volumen de reconstrucción y ayuda internacional canalizada vía contratación
 * ucraniana. Nivel `pais_extranjero` (Ucrania), moneda UAH.
 *
 * API JSON KEYLESS (verificado 2026-06-07):
 *   GET https://public-api.prozorro.gov.ua/api/2.5/tenders?descending=1
 *   Respuesta: { data: [ { id, dateModified } ], next_page }
 *
 * LIMITACIÓN DELIBERADA: el listado feed SOLO devuelve { id, dateModified } —
 * sin título, comprador, valor ni plazo. Obtener esos campos exige un GET por
 * cada tender (`/tenders/{id}`), lo que sería un N+1 masivo contra una API
 * pública. Para respetar el coste acotado del fan-out (timeout por fuente) y NO
 * abusar de la API, este conector NO hace ese N+1: si la primera página solo
 * trae IDs (lo habitual), degrada honestamente con una nota. Si en el futuro el
 * feed pasara a traer datos inline, `parseProzorro()` ya los mapearía.
 *
 * `parseProzorro()` es PURO y testeable con un fixture (sin red).
 */
import type { LicitacionNormalizada, SourceResult } from './types.ts'
import { cacheGet, cacheSet, errResult, okResult, parseNum, safeFetch, toIso } from './shared.ts'

const BASE = 'https://public-api.prozorro.gov.ua/api/2.5/tenders'
const PUBLIC_URL = 'https://prozorro.gov.ua'
const FUENTE = 'prozorro' as const

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixture)
// ─────────────────────────────────────────────────────────────────────────

interface ProzorroValue {
  amount?: number | string
  currency?: string
}
interface ProzorroTender {
  id?: string
  tenderID?: string
  dateModified?: string
  date?: string
  title?: string
  // Campos que SOLO aparecen al pedir el detalle (no en el feed de listado):
  value?: ProzorroValue
  procuringEntity?: { name?: string }
  tenderPeriod?: { endDate?: string }
}

/** ¿La entrada del feed trae datos útiles más allá del id? Pura. */
export function prozorroHasInlineDetail(t: ProzorroTender): boolean {
  if (!t || typeof t !== 'object') return false
  return Boolean(t.title || t.value || t.procuringEntity?.name || t.tenderPeriod?.endDate)
}

/** Mapea un tender Prozorro (con detalle inline) al shape común. Pura. */
export function parseProzorroTender(t: ProzorroTender): LicitacionNormalizada | null {
  if (!t || typeof t !== 'object') return null
  const ref = t.id || t.tenderID
  if (!ref) return null
  // Sin detalle inline no construimos una licitación pobre (solo id no es útil).
  if (!prozorroHasInlineDetail(t)) return null

  const amount = parseNum(t.value?.amount)
  const moneda = (t.value?.currency || 'UAH').toUpperCase()

  return {
    id: `${FUENTE}:${ref}`,
    titulo: String(t.title || 'Tender · Prozorro').slice(0, 300),
    comprador: String(t.procuringEntity?.name || 'Comprador público (Ucrania)').slice(0, 200),
    nivel: 'pais_extranjero',
    pais: 'Ucrania',
    region: null,
    valor_eur: null, // UAH muy volátil; se conserva moneda, no se fuerza FX en el feed.
    moneda,
    cpv: null,
    plazo: toIso(t.tenderPeriod?.endDate),
    fecha_pub: toIso(t.date || t.dateModified),
    url: `https://prozorro.gov.ua/tender/${encodeURIComponent(ref)}`,
    fuente: FUENTE,
    documentos: [],
    idioma: 'uk',
  }
}

/**
 * Parsea la respuesta `{data:[...]}`. Devuelve los items mapeables (con detalle
 * inline) y cuántas entradas eran solo-id (para decidir la degradación). Pura.
 */
export function parseProzorro(json: unknown): {
  items: LicitacionNormalizada[]
  idOnly: number
  total: number
} {
  if (!json || typeof json !== 'object') return { items: [], idOnly: 0, total: 0 }
  const o = json as Record<string, unknown>
  const arr = Array.isArray(o.data) ? o.data : []
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  let idOnly = 0
  for (const raw of arr) {
    const t = raw as ProzorroTender
    if (!prozorroHasInlineDetail(t)) {
      idOnly++
      continue
    }
    const item = parseProzorroTender(t)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }
  return { items, idOnly, total: arr.length }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}
// ─────────────────────────────────────────────────────────────────────────

export interface FetchProzorroOpts {
  timeoutMs?: number
  noCache?: boolean
}

export async function fetchProzorro(opts: FetchProzorroOpts = {}): Promise<SourceResult> {
  const url = `${BASE}?descending=1`
  const cacheKey = `prozorro:list`
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

  const { items, idOnly, total } = parseProzorro(res.json)
  if (items.length === 0) {
    // Degradación honesta: el feed solo da IDs; no hacemos N+1 contra la API.
    const reason = idOnly > 0 ? 'solo_ids_sin_detalle' : 'sin_datos'
    return errResult(FUENTE, reason, PUBLIC_URL)
  }

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
