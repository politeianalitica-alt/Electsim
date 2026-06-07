/**
 * Conector AusTender — Australian Government procurement (OCDS) · país extranjero · TS-Global Gb
 *
 * AusTender (tenders.gov.au) publica la contratación del gobierno australiano en
 * OCDS de forma KEYLESS. El único endpoint OCDS fiable sin auth es el de
 * contratos publicados por rango de fechas (las variantes de notice/planning
 * devuelven HTTP 400). Por eso este conector lee `contractPublished`: son
 * adjudicaciones recientes (no convocatorias abiertas), útiles igualmente para
 * inteligencia de mercado / competidores. Nivel `pais_extranjero` (Australia),
 * moneda AUD.
 *
 * API JSON KEYLESS (verificado 2026-06-07):
 *   GET https://api.tenders.gov.au/ocds/findByDates/contractPublished/
 *       <fromISO>/<toISO>
 *   Respuesta OCDS: { releases: [ { ocid, id, date, language, parties:[{name,
 *     roles:["procuringEntity"|"supplier"], address:{countryName}}], awards,
 *     contracts:[{ id, title, value:{amount,currency}, period }] } ] }
 *
 * NOTA OCDS: a diferencia de UK FTS, AusTender expone el comprador como
 * `parties[role=procuringEntity]` (no `buyer`) y el valor en `contracts[].value`
 * / `awards[].value` (no `tender.value`). Por eso el parser es propio y no
 * reutiliza `parseOcdsRelease` de uk-ocds. `parseAustender()` es PURO.
 */
import type { LicitacionNormalizada, SourceResult } from './types.ts'
import { cacheGet, cacheSet, errResult, okResult, parseNum, safeFetch, toEur, toIso } from './shared.ts'

const BASE = 'https://api.tenders.gov.au/ocds/findByDates/contractPublished'
const PUBLIC_URL = 'https://www.tenders.gov.au'
const FUENTE = 'austender' as const

// ─────────────────────────────────────────────────────────────────────────
// Parsing OCDS (variante AusTender) PURO — testeable con fixture
// ─────────────────────────────────────────────────────────────────────────

interface AtValue {
  amount?: number | string
  currency?: string
}
interface AtParty {
  name?: string
  roles?: string[]
  address?: { countryName?: string; region?: string }
}
interface AtContract {
  id?: string
  title?: string
  description?: string
  value?: AtValue
  period?: { endDate?: string }
}
interface AtAward {
  id?: string
  title?: string
  value?: AtValue
  date?: string
  contractPeriod?: { endDate?: string }
}
interface AtRelease {
  ocid?: string
  id?: string
  date?: string
  language?: string
  parties?: AtParty[]
  awards?: AtAward[]
  contracts?: AtContract[]
  tender?: { title?: string; description?: string }
  buyer?: { name?: string }
}

/** Primer party con un rol dado. Pura. */
function partyByRole(parties: AtParty[] | undefined, role: string): AtParty | undefined {
  if (!Array.isArray(parties)) return undefined
  return parties.find((p) => Array.isArray(p.roles) && p.roles.includes(role))
}

/**
 * Normaliza un nombre de país a Capitalización por palabra cuando viene TODO en
 * mayúsculas (AusTender publica "AUSTRALIA"), para homogeneizar con el resto del
 * agregador ("España", "Reino Unido"). Si ya viene mixto, se respeta. Pura.
 */
export function titleCaseCountry(name: string): string {
  const s = (name || '').trim()
  if (!s) return ''
  if (s !== s.toUpperCase()) return s // ya tiene mayúsc/minúsc → respetar
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((w) => (/^[a-záéíóúñ]/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join('')
}

/** Mapea un release OCDS de AusTender al shape común. Pura. */
export function parseAustenderRelease(r: AtRelease): LicitacionNormalizada | null {
  if (!r || typeof r !== 'object') return null
  const ocid = r.ocid || r.id
  if (!ocid) return null

  const contract = Array.isArray(r.contracts) ? r.contracts[0] : undefined
  const award = Array.isArray(r.awards) ? r.awards[0] : undefined

  const titulo =
    contract?.title ||
    contract?.description ||
    award?.title ||
    r.tender?.title ||
    r.tender?.description ||
    'Contrato · AusTender'

  const procuring = partyByRole(r.parties, 'procuringEntity')
  const comprador =
    procuring?.name || r.buyer?.name || 'Australian Government (procuring entity)'

  // País / región del comprador (cae a Australia si no está).
  const region = procuring?.address?.region || null
  const paisRaw = procuring?.address?.countryName || 'Australia'
  const pais = titleCaseCountry(paisRaw) || 'Australia'

  // Valor: contrato → adjudicación. Moneda habitual AUD.
  const val = contract?.value || award?.value
  const amount = parseNum(val?.amount)
  const moneda = (val?.currency || 'AUD').toUpperCase()
  const valorEur = amount != null ? toEur(amount, moneda) : null

  const plazo = toIso(contract?.period?.endDate || award?.contractPeriod?.endDate)
  const fechaPub = toIso(r.date || award?.date)

  return {
    id: `${FUENTE}:${ocid}`,
    titulo: String(titulo).slice(0, 300),
    comprador: String(comprador).slice(0, 200),
    nivel: 'pais_extranjero',
    pais: pais.trim() || 'Australia',
    region,
    valor_eur: valorEur,
    moneda,
    cpv: null, // AusTender usa UNSPSC, no CPV.
    plazo,
    fecha_pub: fechaPub,
    url: PUBLIC_URL,
    fuente: FUENTE,
    documentos: [],
    idioma: (r.language || 'en').slice(0, 2).toLowerCase(),
  }
}

/** Parsea un OCDS release package `{releases:[...]}` de AusTender. Pura. */
export function parseAustender(json: unknown): { items: LicitacionNormalizada[]; total: number } {
  if (!json || typeof json !== 'object') return { items: [], total: 0 }
  const o = json as Record<string, unknown>
  const releases = Array.isArray(o.releases) ? o.releases : []
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const r of releases) {
    const item = parseAustenderRelease(r as AtRelease)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }
  return { items, total: items.length }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}
// ─────────────────────────────────────────────────────────────────────────

export interface FetchAustenderOpts {
  desde?: string
  hasta?: string
  timeoutMs?: number
  noCache?: boolean
}

/** Construye el rango de fechas ISO `T..Z` (default últimos 30 días). Puro. */
export function austenderRange(opts: FetchAustenderOpts): { from: string; to: string } {
  const to = opts.hasta
    ? `${opts.hasta}T23:59:59Z`
    : `${new Date().toISOString().slice(0, 19)}Z`
  const from = opts.desde
    ? `${opts.desde}T00:00:00Z`
    : `${new Date(Date.now() - 30 * 24 * 3600_000).toISOString().slice(0, 19)}Z`
  return { from, to }
}

export async function fetchAustender(opts: FetchAustenderOpts = {}): Promise<SourceResult> {
  const { from, to } = austenderRange(opts)
  const url = `${BASE}/${encodeURIComponent(from)}/${encodeURIComponent(to)}`
  const cacheKey = `austender:${from}:${to}`
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

  const { items, total } = parseAustender(res.json)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
