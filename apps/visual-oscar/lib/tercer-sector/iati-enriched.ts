/**
 * IATI · Capa enriquecida (Full Access) · Sprint IATI-MAX.
 *
 * Aprovecha el nivel Full Access de IATI_API_KEY para construir vistas que con
 * el tier Exploratory (5 req/min, 100/sem) no eran viables:
 *
 *   1. fetchIatiActivitiesEnriched()  — paginación completa con `fl` rico
 *      (descripciones, fechas, valores totales, role/ref de participating org).
 *   2. fetchIatiYearlyDisbursements() — Solr facet pivot por año × país.
 *   3. fetchIatiTopFlows()            — top flujos donante→receptor por importe.
 *   4. fetchIatiOrgProfile()          — perfil completo de una ONGD ES (total
 *      actividades, top países, top sectores, evolución 5 años).
 *   5. fetchIatiSectorDeepDive()      — actividades ES por sector DAC + países
 *      + ONGD + importe.
 *   6. fetchIatiCountryDeepDive()     — actividades ES por país receptor +
 *      sectores + ONGD + importe.
 *
 * TODOS comparten:
 *   - El rate-limiter centralizado (`iati-rate-limit.ts`): NO bombardeamos.
 *   - Caché 6h en memoria (igual que `iati-datastore.ts`).
 *   - Degradación honesta: sin IATI_API_KEY → `{ ok:false, error:'no_key' }`.
 *   - Dedupe in-flight: dos requests idénticas → una sola llamada real.
 *   - Honestidad FX: solo se agregan importes en EUR (no convertimos divisas).
 *
 * Los TOS IATI prohíben: abuse, reventa, downloads masivos para spam, SaaS
 * público. Nuestro uso es analítico (dashboard interno), respetamos límites,
 * y la key SOLO vive server-side (env Vercel) — nunca llega al cliente.
 */
import {
  CURATED_REF_NAMES,
  CURATED_SPANISH_ORGS,
} from './iati-orgs-catalog'
import {
  acquireSlot,
  dedupeInFlight,
  noteCacheHit,
  noteError,
  noteRateLimited429,
  noteRequest,
  withRetry,
} from './iati-rate-limit'
import {
  fetchCodelists,
  resolveCountryName,
  resolveSectorName,
} from './iati-codelists'
import type { IatiEnvelope, FacetCount } from './iati-types'
import {
  buildTopFlows as _buildTopFlowsPure,
  buildYearlyHeatmap as _buildYearlyHeatmapPure,
  parseEnrichedDocs as _parseEnrichedDocsPure,
  spanishOrgsQueryFrom,
  type IatiActivityRich as _ActPure,
  type TopFlow as _TopFlowPure,
  type YearlyCountryPoint as _YearPointPure,
} from './iati-enriched-parsers'

// Re-export públicos para no romper otros callers
export const parseEnrichedDocs = _parseEnrichedDocsPure
export const buildYearlyHeatmap = (
  txs: Parameters<typeof _buildYearlyHeatmapPure>[0],
  cl: Parameters<typeof _buildYearlyHeatmapPure>[1],
  topN?: number,
) => _buildYearlyHeatmapPure(txs, cl, topN ?? 15)
export const buildTopFlows = (
  txs: Parameters<typeof _buildTopFlowsPure>[0],
  cl: Parameters<typeof _buildTopFlowsPure>[1],
  topN: number,
) => _buildTopFlowsPure(txs, cl, topN, CURATED_REF_NAMES)
export type IatiActivityRich = _ActPure
export type TopFlow = _TopFlowPure
export type YearlyCountryPoint = _YearPointPure

const BASE = 'https://api.iatistandard.org/datastore'
const PUBLIC_URL = 'https://iatistandard.org/en/using-data/iati-tools-and-resources/iati-datastore/'
const DEFAULT_TIMEOUT_MS = 25_000
const CACHE_TTL_MS = 6 * 3600_000 // 6h
const KEY_HELP =
  'IATI_API_KEY no configurada. Registro: https://developer.iatistandard.org/'

// ─────────────────────────────────────────────────────────────────────────
// Caché compartida (separada de la de iati-datastore.ts para no chocar)
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry {
  expires: number
  value: unknown
}
const _cache = new Map<string, CacheEntry>()

export function _clearEnrichedCache(): void {
  _cache.clear()
}

function getCached<T>(key: string): T | null {
  const hit = _cache.get(key)
  if (hit && Date.now() <= hit.expires) {
    noteCacheHit()
    return hit.value as T
  }
  return null
}
function setCached(key: string, value: unknown): void {
  _cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value })
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers locales (puros)
// ─────────────────────────────────────────────────────────────────────────

function parseNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (Array.isArray(v)) return parseNum(v[0])
  const n = Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}
function firstStr(v: unknown): string | null {
  if (v == null) return null
  if (Array.isArray(v)) {
    for (const x of v) {
      const s = x == null ? '' : String(x).trim()
      if (s) return s
    }
    return null
  }
  const s = String(v).trim()
  return s || null
}
function strArray(v: unknown): string[] {
  const out: string[] = []
  const push = (x: unknown) => {
    const s = x == null ? '' : String(x).trim()
    if (s && !out.includes(s)) out.push(s)
  }
  if (Array.isArray(v)) v.forEach(push)
  else push(v)
  return out
}

/** Clausula Solr para todas las ONGD ES curadas (idéntica a iati-datastore). */
export function spanishOrgsQuery(): string {
  return spanishOrgsQueryFrom(CURATED_SPANISH_ORGS.map((o) => o.iati_ref))
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch crudo Solr con todos los safeguards (idéntico patrón a datastore.ts)
// ─────────────────────────────────────────────────────────────────────────

interface SolrFetchResult {
  ok: boolean
  json?: unknown
  error?: string
  retryable?: boolean
}

async function _solrFetchRaw(
  core: 'activity' | 'transaction' | 'budget',
  params: URLSearchParams,
  apiKey: string,
  timeoutMs: number,
): Promise<SolrFetchResult> {
  const url = `${BASE}/${core}/select?${params.toString()}`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      next: { revalidate: 21600 },
    } as RequestInit)
    clearTimeout(t)
    if (r.status === 401 || r.status === 403) {
      noteError()
      return { ok: false, error: `unauthorized · HTTP ${r.status}` }
    }
    if (r.status === 429) {
      noteRateLimited429()
      return { ok: false, error: 'rate_limited', retryable: true }
    }
    if (r.status >= 500 && r.status < 600) {
      noteError()
      return { ok: false, error: `http_${r.status}`, retryable: true }
    }
    if (!r.ok) {
      noteError()
      return { ok: false, error: `http_${r.status}` }
    }
    const json: unknown = await r.json()
    return { ok: true, json }
  } catch (e: unknown) {
    noteError()
    const isAbort = (e as Error)?.name === 'AbortError'
    const msg = isAbort ? 'timeout' : String((e as Error)?.message ?? e).slice(0, 160)
    return { ok: false, error: msg, retryable: isAbort }
  }
}

async function solrFetch(
  core: 'activity' | 'transaction' | 'budget',
  params: URLSearchParams,
  apiKey: string,
  timeoutMs: number,
): Promise<SolrFetchResult> {
  noteRequest()
  const queryKey = `${core}?${params.toString()}`
  return dedupeInFlight<SolrFetchResult>(queryKey, () =>
    withRetry<SolrFetchResult>(
      async () => {
        await acquireSlot()
        return _solrFetchRaw(core, params, apiKey, timeoutMs)
      },
      { maxRetries: 3, baseMs: 1_000, factor: 2, jitter: 0.3 },
    ),
  )
}

function getApiKey(): string {
  return process.env.IATI_API_KEY || ''
}

function nowIso(): string {
  return new Date().toISOString()
}

// ─────────────────────────────────────────────────────────────────────────
// 1. fetchIatiActivitiesEnriched · paginación completa con `fl` rico
// ─────────────────────────────────────────────────────────────────────────

// IatiActivityRich re-exportado arriba desde iati-enriched-parsers.

export interface IatiActivitiesEnrichedData {
  activities: IatiActivityRich[]
  total_found: number
  fetched_pages: number
  filters: {
    recipient_country: string | null
    reporting_org: string | null
    sector: string | null
    date_from: string | null
    date_to: string | null
  }
}

export type IatiActivitiesEnrichedResponse = IatiEnvelope<IatiActivitiesEnrichedData>

export interface FetchEnrichedOpts {
  recipient_country?: string | null
  reporting_org?: string | null
  sector?: string | null
  /** Filtro de fecha (activity-date iso). */
  date_from?: string | null
  date_to?: string | null
  /** Tamaño de página Solr (1-1000, default 200). */
  pageSize?: number
  /** Nº de páginas a barrer máximo (default 5 → hasta 1000 actividades). */
  maxPages?: number
  noCache?: boolean
  timeoutMs?: number
}

// parseEnrichedDocs y RawEnrichedDoc viven en iati-enriched-parsers (re-export arriba).

/** Construye la cláusula Solr de fecha en activity_date_iso_date. */
function buildDateClause(date_from: string | null, date_to: string | null): string | null {
  if (!date_from && !date_to) return null
  const from = date_from ?? '*'
  const to = date_to ?? '*'
  return `activity_date_iso_date:[${from} TO ${to}]`
}

export async function fetchIatiActivitiesEnriched(
  opts: FetchEnrichedOpts = {},
): Promise<IatiActivitiesEnrichedResponse> {
  const fetched_at = nowIso()
  const apiKey = getApiKey()
  if (!apiKey) {
    return { ok: false, data: null, error: `no_key · ${KEY_HELP}`, fetched_at, source_url: PUBLIC_URL }
  }

  const recipient_country = opts.recipient_country?.trim() || null
  const reporting_org = opts.reporting_org?.trim() || null
  const sector = opts.sector?.trim() || null
  const date_from = opts.date_from?.trim() || null
  const date_to = opts.date_to?.trim() || null
  const pageSize = Math.max(1, Math.min(1000, Math.trunc(opts.pageSize ?? 200)))
  const maxPages = Math.max(1, Math.min(10, Math.trunc(opts.maxPages ?? 5)))

  const cacheKey = `enriched:${recipient_country}:${reporting_org}:${sector}:${date_from}:${date_to}:${pageSize}:${maxPages}`
  if (!opts.noCache) {
    const hit = getCached<IatiActivitiesEnrichedResponse>(cacheKey)
    if (hit) return hit
  }

  // Construir query.
  const clauses: string[] = []
  if (recipient_country) clauses.push(`recipient_country_code:${recipient_country.toUpperCase()}`)
  if (reporting_org) clauses.push(`reporting_org_ref:"${reporting_org}"`)
  if (sector) clauses.push(`sector_code:${sector}`)
  const dateClause = buildDateClause(date_from, date_to)
  if (dateClause) clauses.push(dateClause)
  if (clauses.length === 0) clauses.push(spanishOrgsQuery())
  const q = clauses.join(' AND ')

  const fl = [
    'iati_identifier',
    'title_narrative',
    'description_narrative',
    'reporting_org_ref',
    'reporting_org_narrative',
    'participating_org_ref',
    'recipient_country_code',
    'sector_code',
    'activity_status_code',
    'activity_date_iso_date',
    'activity_date_type',
    'default_aid_type_code',
    'default_flow_type_code',
    'total_disbursement_value_usd',
    'total_disbursement_value_currency',
    'total_commitment_value_usd',
    'total_commitment_value_currency',
  ].join(',')

  const all: IatiActivityRich[] = []
  let total_found = 0
  let fetched_pages = 0
  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      q,
      rows: String(pageSize),
      start: String(page * pageSize),
      wt: 'json',
      fl,
    })
    const res = await solrFetch('activity', params, apiKey, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    if (!res.ok) {
      // Si falla la primera página, no hay nada que devolver.
      if (page === 0) {
        return {
          ok: false,
          data: null,
          error: res.error ?? 'datastore_error',
          fetched_at,
          source_url: PUBLIC_URL,
        }
      }
      // Si fallamos a mitad → devolvemos lo recolectado con flag (raro).
      break
    }
    const j = (res.json ?? {}) as { response?: { numFound?: number; docs?: unknown } }
    total_found = Number(j?.response?.numFound ?? 0)
    const docs = parseEnrichedDocs(j?.response?.docs)
    all.push(...docs)
    fetched_pages = page + 1
    // Si ya hemos cubierto todos los matches, parar.
    if (all.length >= total_found || docs.length < pageSize) break
  }

  const data: IatiActivitiesEnrichedData = {
    activities: all,
    total_found,
    fetched_pages,
    filters: { recipient_country, reporting_org, sector, date_from, date_to },
  }
  const out: IatiActivitiesEnrichedResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
  setCached(cacheKey, out)
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// 2. fetchIatiYearlyDisbursements · heatmap-ready (años × países × EUR)
// ─────────────────────────────────────────────────────────────────────────

// YearlyCountryPoint re-exportado arriba desde iati-enriched-parsers.

export interface IatiYearlyDisbursementsData {
  /** Puntos sparse (solo combinaciones con datos). */
  points: YearlyCountryPoint[]
  /** Años cubiertos (ordenados). */
  years: number[]
  /** Top-N países por importe acumulado (orden desc). */
  top_countries: FacetCount[]
  /** Suma total EUR del rango. */
  total_value_eur: number
  /** Total de transacciones cubiertas. */
  total_count: number
  filters: {
    reporting_org: string | null
    date_from: string | null
    date_to: string | null
    top_n_countries: number
  }
}

export type IatiYearlyDisbursementsResponse = IatiEnvelope<IatiYearlyDisbursementsData>

export interface FetchYearlyOpts {
  reporting_org?: string | null
  /** Año mínimo (default 2015). */
  year_from?: number
  /** Año máximo (default año actual). */
  year_to?: number
  /** Cuántos top países devolver (default 15). */
  top_n_countries?: number
  /** Tamaño Solr (txs muestreadas; default 1000). */
  rows?: number
  noCache?: boolean
  timeoutMs?: number
}

// buildYearlyHeatmap re-exportado arriba desde iati-enriched-parsers.

export async function fetchIatiYearlyDisbursements(
  opts: FetchYearlyOpts = {},
): Promise<IatiYearlyDisbursementsResponse> {
  const fetched_at = nowIso()
  const apiKey = getApiKey()
  if (!apiKey) {
    return { ok: false, data: null, error: `no_key · ${KEY_HELP}`, fetched_at, source_url: PUBLIC_URL }
  }

  const reporting_org = opts.reporting_org?.trim() || null
  const currentYear = new Date().getUTCFullYear()
  const yearFrom = Math.max(2000, Math.min(currentYear, opts.year_from ?? 2015))
  const yearTo = Math.max(yearFrom, Math.min(currentYear, opts.year_to ?? currentYear))
  const topN = Math.max(3, Math.min(50, opts.top_n_countries ?? 15))
  const rows = Math.max(50, Math.min(1000, opts.rows ?? 1000))

  const cacheKey = `yearly:${reporting_org}:${yearFrom}:${yearTo}:${topN}:${rows}`
  if (!opts.noCache) {
    const hit = getCached<IatiYearlyDisbursementsResponse>(cacheKey)
    if (hit) return hit
  }

  const orgClause = reporting_org
    ? `reporting_org_ref:"${reporting_org}"`
    : spanishOrgsQuery()
  const dateFrom = `${yearFrom}-01-01`
  const dateTo = `${yearTo}-12-31`
  const q = [
    orgClause,
    'transaction_type_code:3',
    'transaction_value_currency:EUR',
    `transaction_date_iso_date:[${dateFrom} TO ${dateTo}]`,
  ].join(' AND ')

  const params = new URLSearchParams({
    q,
    rows: String(rows),
    wt: 'json',
    sort: 'transaction_date_iso_date desc',
    fl: 'transaction_date_iso_date,transaction_value,transaction_recipient_country_code',
  })

  const [clRes, res] = await Promise.all([
    fetchCodelists().catch(() => null),
    solrFetch('transaction', params, apiKey, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  ])
  if (!res.ok) {
    return {
      ok: false,
      data: null,
      error: res.error ?? 'datastore_error',
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }
  const j = (res.json ?? {}) as { response?: { docs?: unknown } }
  const docs = (j?.response?.docs ?? []) as Array<{
    transaction_date_iso_date?: unknown
    transaction_value?: unknown
    transaction_recipient_country_code?: unknown
  }>
  const txs = docs.map((d) => ({
    date: firstStr(d?.transaction_date_iso_date),
    value_eur: parseNum(d?.transaction_value),
    recipient_country: firstStr(d?.transaction_recipient_country_code),
  }))
  const codeCountries = clRes && clRes.ok ? clRes.data?.countries ?? null : null
  const heatmap = buildYearlyHeatmap(txs, codeCountries, topN)
  heatmap.filters = { reporting_org, date_from: dateFrom, date_to: dateTo, top_n_countries: topN }

  const out: IatiYearlyDisbursementsResponse = {
    ok: true,
    data: heatmap,
    fetched_at,
    source_url: PUBLIC_URL,
  }
  setCached(cacheKey, out)
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// 3. fetchIatiTopFlows · top flujos donante→receptor por importe
// ─────────────────────────────────────────────────────────────────────────

// TopFlow re-exportado arriba desde iati-enriched-parsers.

export interface IatiTopFlowsData {
  flows: TopFlow[]
  total_value_eur: number
  total_count: number
  filters: {
    year_from: number
    year_to: number
    top_n: number
  }
}

export type IatiTopFlowsResponse = IatiEnvelope<IatiTopFlowsData>

export interface FetchTopFlowsOpts {
  year_from?: number
  year_to?: number
  top_n?: number
  rows?: number
  noCache?: boolean
  timeoutMs?: number
}

// buildTopFlows re-exportado arriba desde iati-enriched-parsers.

export async function fetchIatiTopFlows(
  opts: FetchTopFlowsOpts = {},
): Promise<IatiTopFlowsResponse> {
  const fetched_at = nowIso()
  const apiKey = getApiKey()
  if (!apiKey) {
    return { ok: false, data: null, error: `no_key · ${KEY_HELP}`, fetched_at, source_url: PUBLIC_URL }
  }
  const currentYear = new Date().getUTCFullYear()
  const yearFrom = Math.max(2000, Math.min(currentYear, opts.year_from ?? currentYear - 3))
  const yearTo = Math.max(yearFrom, Math.min(currentYear, opts.year_to ?? currentYear))
  const topN = Math.max(5, Math.min(50, opts.top_n ?? 20))
  const rows = Math.max(50, Math.min(1000, opts.rows ?? 1000))

  const cacheKey = `flows:${yearFrom}:${yearTo}:${topN}:${rows}`
  if (!opts.noCache) {
    const hit = getCached<IatiTopFlowsResponse>(cacheKey)
    if (hit) return hit
  }

  const q = [
    spanishOrgsQuery(),
    'transaction_type_code:3',
    'transaction_value_currency:EUR',
    `transaction_date_iso_date:[${yearFrom}-01-01 TO ${yearTo}-12-31]`,
  ].join(' AND ')
  const params = new URLSearchParams({
    q,
    rows: String(rows),
    wt: 'json',
    sort: 'transaction_value desc',
    fl: 'reporting_org_ref,transaction_recipient_country_code,transaction_value',
  })

  const [clRes, res] = await Promise.all([
    fetchCodelists().catch(() => null),
    solrFetch('transaction', params, apiKey, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  ])
  if (!res.ok) {
    return {
      ok: false,
      data: null,
      error: res.error ?? 'datastore_error',
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }
  const j = (res.json ?? {}) as { response?: { docs?: unknown } }
  const docs = (j?.response?.docs ?? []) as Array<{
    reporting_org_ref?: unknown
    transaction_recipient_country_code?: unknown
    transaction_value?: unknown
  }>
  const txs = docs.map((d) => ({
    reporting_org_ref: firstStr(d?.reporting_org_ref),
    recipient_country: firstStr(d?.transaction_recipient_country_code),
    value_eur: parseNum(d?.transaction_value),
  }))
  const codeCountries = clRes && clRes.ok ? clRes.data?.countries ?? null : null
  const data = buildTopFlows(txs, codeCountries, topN)
  data.filters = { year_from: yearFrom, year_to: yearTo, top_n: topN }

  const out: IatiTopFlowsResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
  setCached(cacheKey, out)
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// 4. fetchIatiOrgProfile · perfil de una ONGD española
// ─────────────────────────────────────────────────────────────────────────

export interface OrgProfileYearPoint {
  year: number
  value_eur: number
  count: number
}

export interface IatiOrgProfileData {
  org_ref: string
  org_name: string
  total_activities: number
  total_disbursed_eur: number | null
  top_countries: FacetCount[]
  top_sectors: FacetCount[]
  /** Serie anual de desembolsos EUR (últimos 5 años por defecto). */
  yearly_disbursements: OrgProfileYearPoint[]
  fetched_at: string
}

export type IatiOrgProfileResponse = IatiEnvelope<IatiOrgProfileData>

export interface FetchOrgProfileOpts {
  /** Años hacia atrás para la serie anual (default 5). */
  yearsBack?: number
  noCache?: boolean
  timeoutMs?: number
}

export async function fetchIatiOrgProfile(
  orgRef: string,
  opts: FetchOrgProfileOpts = {},
): Promise<IatiOrgProfileResponse> {
  const fetched_at = nowIso()
  const apiKey = getApiKey()
  if (!apiKey) {
    return { ok: false, data: null, error: `no_key · ${KEY_HELP}`, fetched_at, source_url: PUBLIC_URL }
  }
  const ref = orgRef.trim()
  if (!ref) {
    return { ok: false, data: null, error: 'org_ref_required', fetched_at, source_url: PUBLIC_URL }
  }
  const yearsBack = Math.max(1, Math.min(20, opts.yearsBack ?? 5))
  const currentYear = new Date().getUTCFullYear()
  const yearFrom = currentYear - yearsBack + 1

  const cacheKey = `org-profile:${ref}:${yearsBack}`
  if (!opts.noCache) {
    const hit = getCached<IatiOrgProfileResponse>(cacheKey)
    if (hit) return hit
  }

  // Query base de la org.
  const orgClause = `reporting_org_ref:"${ref}"`

  // 1) Facetas país + sector + total activities.
  const fParams = new URLSearchParams({ q: orgClause, rows: '0', wt: 'json', facet: 'true' })
  fParams.append('facet.field', 'recipient_country_code')
  fParams.append('facet.field', 'sector_code')
  fParams.set('facet.limit', '15')
  fParams.set('facet.mincount', '1')

  // 2) Suma de desembolsos EUR (Solr stats).
  const sumParams = new URLSearchParams({
    q: `${orgClause} AND transaction_type_code:3 AND transaction_value_currency:EUR`,
    rows: '0',
    wt: 'json',
    stats: 'true',
  })
  sumParams.append('stats.field', 'transaction_value')

  // 3) Transacciones de los últimos N años (para serie anual).
  const txParams = new URLSearchParams({
    q: [
      orgClause,
      'transaction_type_code:3',
      'transaction_value_currency:EUR',
      `transaction_date_iso_date:[${yearFrom}-01-01 TO ${currentYear}-12-31]`,
    ].join(' AND '),
    rows: '500',
    wt: 'json',
    sort: 'transaction_date_iso_date desc',
    fl: 'transaction_date_iso_date,transaction_value',
  })

  const [clRes, facetRes, sumRes, txRes] = await Promise.all([
    fetchCodelists().catch(() => null),
    solrFetch('activity', fParams, apiKey, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    solrFetch('transaction', sumParams, apiKey, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    solrFetch('transaction', txParams, apiKey, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  ])

  if (!facetRes.ok) {
    return {
      ok: false,
      data: null,
      error: facetRes.error ?? 'datastore_error',
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }

  const codelists = clRes && clRes.ok ? clRes.data : null
  const codeCountries = codelists?.countries ?? null

  // Total actividades + facets.
  const fj = (facetRes.json ?? {}) as {
    response?: { numFound?: number }
    facet_counts?: { facet_fields?: Record<string, unknown> }
  }
  const facets = fj?.facet_counts?.facet_fields ?? {}
  const total_activities = Number(fj?.response?.numFound ?? 0)

  function parseFacet(arr: unknown): Array<{ code: string; count: number }> {
    const out: Array<{ code: string; count: number }> = []
    if (!Array.isArray(arr)) return out
    for (let i = 0; i < arr.length - 1; i += 2) {
      const code = String(arr[i]).trim()
      const count = Number(arr[i + 1])
      if (code && Number.isFinite(count)) out.push({ code, count })
    }
    return out
  }

  const top_countries: FacetCount[] = parseFacet(facets.recipient_country_code).map((x) => ({
    code: x.code.toUpperCase(),
    name: resolveCountryName(codelists, x.code),
    count: x.count,
  }))
  const top_sectors: FacetCount[] = parseFacet(facets.sector_code).map((x) => ({
    code: x.code,
    name: resolveSectorName(codelists, x.code),
    count: x.count,
  }))

  // Suma desembolsado.
  let total_disbursed_eur: number | null = null
  if (sumRes.ok) {
    const sum = (sumRes.json as {
      stats?: { stats_fields?: { transaction_value?: { sum?: unknown } } }
    })?.stats?.stats_fields?.transaction_value?.sum
    const n = parseNum(sum)
    if (n != null) total_disbursed_eur = Math.round(n)
  }

  // Serie anual.
  const yearly: Map<number, { v: number; c: number }> = new Map()
  if (txRes.ok) {
    const tdocs = ((txRes.json as { response?: { docs?: unknown } })?.response?.docs ?? []) as Array<{
      transaction_date_iso_date?: unknown
      transaction_value?: unknown
    }>
    for (const d of tdocs) {
      const dt = firstStr(d?.transaction_date_iso_date)
      const v = parseNum(d?.transaction_value)
      if (!dt || v == null) continue
      const yr = parseInt(dt.slice(0, 4), 10)
      if (!Number.isFinite(yr)) continue
      const cur = yearly.get(yr) ?? { v: 0, c: 0 }
      cur.v += v
      cur.c += 1
      yearly.set(yr, cur)
    }
  }
  const yearly_disbursements: OrgProfileYearPoint[] = [...yearly.entries()]
    .map(([year, p]) => ({ year, value_eur: Math.round(p.v), count: p.c }))
    .sort((a, b) => a.year - b.year)

  // Suprimir warning lint sobre codeCountries (uso reservado en futuras agregaciones).
  void codeCountries

  const data: IatiOrgProfileData = {
    org_ref: ref,
    org_name: CURATED_REF_NAMES[ref] ?? ref,
    total_activities,
    total_disbursed_eur,
    top_countries,
    top_sectors,
    yearly_disbursements,
    fetched_at,
  }
  const out: IatiOrgProfileResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
  setCached(cacheKey, out)
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// 5. fetchIatiSectorDeepDive · sector DAC en profundidad
// ─────────────────────────────────────────────────────────────────────────

export interface IatiSectorDeepDiveData {
  sector_code: string
  sector_name: string
  total_activities: number
  total_disbursed_eur: number | null
  top_countries: FacetCount[]
  top_orgs: FacetCount[]
  fetched_at: string
}

export type IatiSectorDeepDiveResponse = IatiEnvelope<IatiSectorDeepDiveData>

export async function fetchIatiSectorDeepDive(
  sectorCode: string,
  opts: { noCache?: boolean; timeoutMs?: number } = {},
): Promise<IatiSectorDeepDiveResponse> {
  const fetched_at = nowIso()
  const apiKey = getApiKey()
  if (!apiKey) {
    return { ok: false, data: null, error: `no_key · ${KEY_HELP}`, fetched_at, source_url: PUBLIC_URL }
  }
  const code = sectorCode.trim()
  if (!code) {
    return { ok: false, data: null, error: 'sector_code_required', fetched_at, source_url: PUBLIC_URL }
  }
  const cacheKey = `sector-dd:${code}`
  if (!opts.noCache) {
    const hit = getCached<IatiSectorDeepDiveResponse>(cacheKey)
    if (hit) return hit
  }

  const q = `${spanishOrgsQuery()} AND sector_code:${code}`
  const fParams = new URLSearchParams({ q, rows: '0', wt: 'json', facet: 'true' })
  fParams.append('facet.field', 'recipient_country_code')
  fParams.append('facet.field', 'reporting_org_ref')
  fParams.set('facet.limit', '15')
  fParams.set('facet.mincount', '1')
  const sumParams = new URLSearchParams({
    q: `${q.replace('sector_code', 'sector_code')} AND transaction_type_code:3 AND transaction_value_currency:EUR`,
    rows: '0',
    wt: 'json',
    stats: 'true',
  })
  sumParams.append('stats.field', 'transaction_value')
  // El stats Solr usa la query del core transaction (no activity), así que
  // ajustamos: filtramos por sector dentro del transaction core también.
  const sumParamsTx = new URLSearchParams({
    q: [
      spanishOrgsQuery(),
      `sector_code:${code}`,
      'transaction_type_code:3',
      'transaction_value_currency:EUR',
    ].join(' AND '),
    rows: '0',
    wt: 'json',
    stats: 'true',
  })
  sumParamsTx.append('stats.field', 'transaction_value')

  const [clRes, facetRes, sumRes] = await Promise.all([
    fetchCodelists().catch(() => null),
    solrFetch('activity', fParams, apiKey, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    solrFetch('transaction', sumParamsTx, apiKey, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  ])
  if (!facetRes.ok) {
    return {
      ok: false,
      data: null,
      error: facetRes.error ?? 'datastore_error',
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }
  const codelists = clRes && clRes.ok ? clRes.data : null
  const fj = (facetRes.json ?? {}) as {
    response?: { numFound?: number }
    facet_counts?: { facet_fields?: Record<string, unknown> }
  }
  const facets = fj?.facet_counts?.facet_fields ?? {}
  const total_activities = Number(fj?.response?.numFound ?? 0)

  function parseFacet(arr: unknown): Array<{ code: string; count: number }> {
    const out: Array<{ code: string; count: number }> = []
    if (!Array.isArray(arr)) return out
    for (let i = 0; i < arr.length - 1; i += 2) {
      const c = String(arr[i]).trim()
      const n = Number(arr[i + 1])
      if (c && Number.isFinite(n)) out.push({ code: c, count: n })
    }
    return out
  }

  const top_countries: FacetCount[] = parseFacet(facets.recipient_country_code).map((x) => ({
    code: x.code.toUpperCase(),
    name: resolveCountryName(codelists, x.code),
    count: x.count,
  }))
  const top_orgs: FacetCount[] = parseFacet(facets.reporting_org_ref).map((x) => ({
    code: x.code,
    name: CURATED_REF_NAMES[x.code] ?? x.code,
    count: x.count,
  }))

  let total_disbursed_eur: number | null = null
  if (sumRes.ok) {
    const sum = (sumRes.json as {
      stats?: { stats_fields?: { transaction_value?: { sum?: unknown } } }
    })?.stats?.stats_fields?.transaction_value?.sum
    const n = parseNum(sum)
    if (n != null) total_disbursed_eur = Math.round(n)
  }

  const data: IatiSectorDeepDiveData = {
    sector_code: code,
    sector_name: resolveSectorName(codelists, code),
    total_activities,
    total_disbursed_eur,
    top_countries,
    top_orgs,
    fetched_at,
  }
  const out: IatiSectorDeepDiveResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
  setCached(cacheKey, out)
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// 6. fetchIatiCountryDeepDive · país receptor en profundidad
// ─────────────────────────────────────────────────────────────────────────

export interface IatiCountryDeepDiveData {
  country_code: string
  country_name: string
  total_activities: number
  total_disbursed_eur: number | null
  top_sectors: FacetCount[]
  top_orgs: FacetCount[]
  fetched_at: string
}

export type IatiCountryDeepDiveResponse = IatiEnvelope<IatiCountryDeepDiveData>

export async function fetchIatiCountryDeepDive(
  iso2: string,
  opts: { noCache?: boolean; timeoutMs?: number } = {},
): Promise<IatiCountryDeepDiveResponse> {
  const fetched_at = nowIso()
  const apiKey = getApiKey()
  if (!apiKey) {
    return { ok: false, data: null, error: `no_key · ${KEY_HELP}`, fetched_at, source_url: PUBLIC_URL }
  }
  const cc = iso2.trim().toUpperCase()
  if (!cc) {
    return { ok: false, data: null, error: 'iso_required', fetched_at, source_url: PUBLIC_URL }
  }
  const cacheKey = `country-dd:${cc}`
  if (!opts.noCache) {
    const hit = getCached<IatiCountryDeepDiveResponse>(cacheKey)
    if (hit) return hit
  }

  const fParams = new URLSearchParams({
    q: `${spanishOrgsQuery()} AND recipient_country_code:${cc}`,
    rows: '0',
    wt: 'json',
    facet: 'true',
  })
  fParams.append('facet.field', 'sector_code')
  fParams.append('facet.field', 'reporting_org_ref')
  fParams.set('facet.limit', '15')
  fParams.set('facet.mincount', '1')

  const sumParams = new URLSearchParams({
    q: [
      spanishOrgsQuery(),
      `transaction_recipient_country_code:${cc}`,
      'transaction_type_code:3',
      'transaction_value_currency:EUR',
    ].join(' AND '),
    rows: '0',
    wt: 'json',
    stats: 'true',
  })
  sumParams.append('stats.field', 'transaction_value')

  const [clRes, facetRes, sumRes] = await Promise.all([
    fetchCodelists().catch(() => null),
    solrFetch('activity', fParams, apiKey, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    solrFetch('transaction', sumParams, apiKey, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  ])
  if (!facetRes.ok) {
    return {
      ok: false,
      data: null,
      error: facetRes.error ?? 'datastore_error',
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }
  const codelists = clRes && clRes.ok ? clRes.data : null
  const fj = (facetRes.json ?? {}) as {
    response?: { numFound?: number }
    facet_counts?: { facet_fields?: Record<string, unknown> }
  }
  const facets = fj?.facet_counts?.facet_fields ?? {}
  const total_activities = Number(fj?.response?.numFound ?? 0)

  function parseFacet(arr: unknown): Array<{ code: string; count: number }> {
    const out: Array<{ code: string; count: number }> = []
    if (!Array.isArray(arr)) return out
    for (let i = 0; i < arr.length - 1; i += 2) {
      const c = String(arr[i]).trim()
      const n = Number(arr[i + 1])
      if (c && Number.isFinite(n)) out.push({ code: c, count: n })
    }
    return out
  }

  const top_sectors: FacetCount[] = parseFacet(facets.sector_code).map((x) => ({
    code: x.code,
    name: resolveSectorName(codelists, x.code),
    count: x.count,
  }))
  const top_orgs: FacetCount[] = parseFacet(facets.reporting_org_ref).map((x) => ({
    code: x.code,
    name: CURATED_REF_NAMES[x.code] ?? x.code,
    count: x.count,
  }))

  let total_disbursed_eur: number | null = null
  if (sumRes.ok) {
    const sum = (sumRes.json as {
      stats?: { stats_fields?: { transaction_value?: { sum?: unknown } } }
    })?.stats?.stats_fields?.transaction_value?.sum
    const n = parseNum(sum)
    if (n != null) total_disbursed_eur = Math.round(n)
  }

  const data: IatiCountryDeepDiveData = {
    country_code: cc,
    country_name: resolveCountryName(codelists, cc),
    total_activities,
    total_disbursed_eur,
    top_sectors,
    top_orgs,
    fetched_at,
  }
  const out: IatiCountryDeepDiveResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
  setCached(cacheKey, out)
  return out
}
