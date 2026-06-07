/**
 * Cliente IATI Datastore (Solr) · REQUIERE IATI_API_KEY · TS2-iati.
 *
 * El Datastore es la API de consulta masiva de IATI: un índice Solr sobre todas
 * las actividades, transacciones y presupuestos publicados. Es la pieza que
 * permite "exprimir" IATI: facetas (overview), búsqueda filtrada de actividades,
 * y series de desembolsos. Es la ÚNICA de las tres APIs IATI que necesita key.
 *
 * ── API REAL (Solr) ────────────────────────────────────────────────────────
 *   Base    : https://api.iatistandard.org/datastore/{core}/select
 *             core ∈ { activity, transaction, budget }
 *   Auth    : header `Ocp-Apim-Subscription-Key: <IATI_API_KEY>`. Sin key → 401
 *             (verificado 2026-06-07). Tier Exploratory gratis (5/min, 100/sem);
 *             se puede pedir Full Access.
 *   Query   : `q` (Solr query), `fl` (campos), `rows` (≤1000), `start`,
 *             `wt=json`, `facet`/`facet.field`/`facet.limit`/`facet.mincount`.
 *   Campos clave (activity core): iati_identifier, title_narrative[],
 *             reporting_org_ref, reporting_org_narrative[], recipient_country_code[],
 *             sector_code[], activity_status_code.
 *   Campos clave (transaction core): iati_identifier, reporting_org_ref,
 *             transaction_type_code, transaction_date_iso_date,
 *             transaction_value, transaction_value_currency,
 *             transaction_recipient_country_code.
 *   Filtros usados: recipient_country_code, reporting_org_ref, sector_code (DAC),
 *             transaction_type_code (3 = desembolso).
 *
 * ── Honestidad sobre divisas ───────────────────────────────────────────────
 *   IATI reporta valores en múltiples monedas. NO inventamos FX: sumamos solo
 *   los valores ya denominados en EUR para los agregados "_eur"; el resto se
 *   conserva como valor reportado con su `currency`. Por eso los totales EUR son
 *   un MÍNIMO comparable, no el total absoluto (se documenta en el endpoint).
 *
 * ── Diseño defensivo (patrón lib/energia/agsi.ts) ──────────────────────────
 *   - Degradación: sin IATI_API_KEY → `{ ok:false, error:'no_key' }` con mensaje
 *     explícito. 401/403 → unauthorized. 429 → rate_limited. NUNCA lanza.
 *   - Caché en memoria TTL 6h: los datos IATI cambian ~mensualmente.
 *   - Parsers PUROS exportados (parseFacetField, parseActivityDocs,
 *     parseTransactionDocs, buildTimeline) testeables con fixtures Solr.
 *
 * IATI_API_KEY es server-side (Vercel env). NUNCA exponer al cliente: estas
 * funciones se llaman desde route handlers (app/api/tercer-sector/iati/*).
 */
import type {
  CodelistsData,
  DisbursementBucket,
  FacetCount,
  IatiActivitiesData,
  IatiActivitiesResponse,
  IatiActivity,
  IatiOverviewData,
  IatiOverviewResponse,
  IatiTransaction,
  IatiTransactionsData,
  IatiTransactionsResponse,
} from './iati-types'
import { CURATED_REF_NAMES, CURATED_SPANISH_ORGS } from './iati-orgs-catalog'
import {
  fetchCodelists,
  resolveCountryName,
  resolveSectorName,
} from './iati-codelists'

const BASE = 'https://api.iatistandard.org/datastore'
const PUBLIC_URL = 'https://iatistandard.org/en/using-data/iati-tools-and-resources/iati-datastore/'
const DEFAULT_TIMEOUT_MS = 20_000
const CACHE_TTL_MS = 6 * 3600_000 // 6h · datos IATI ~mensuales
const KEY_HELP =
  'IATI_API_KEY no configurada · regístrate gratis en https://developer.iatistandard.org/ ' +
  '(tier Exploratory) y añade IATI_API_KEY a Vercel env vars. El Datastore responde 401 sin ella.'

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL 6h · clave SIN la key
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry {
  expires: number
  value: unknown
}
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearDatastoreCache(): void {
  _cache.clear()
}

function getCached<T>(key: string): T | null {
  const hit = _cache.get(key)
  if (hit && Date.now() <= hit.expires) return hit.value as T
  return null
}
function setCached(key: string, value: unknown): void {
  _cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value })
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers numéricos / texto (puros)
// ─────────────────────────────────────────────────────────────────────────

/** Parsea un valor numérico tolerando string/number/null. Null si no finito. */
export function parseNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (Array.isArray(v)) return parseNum(v[0])
  const n = Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}

/** Primer string no vacío de un valor que puede ser string|string[]|null. */
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

/** Array de strings normalizado (dedup, sin vacíos) de string|string[]|null. */
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

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO de Solr (testeable con fixtures)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Parsea un facet_field de Solr (`['k1', n1, 'k2', n2, ...]`) a `{code,count}[]`.
 * Pura.
 */
export function parseFacetField(arr: unknown): Array<{ code: string; count: number }> {
  const out: Array<{ code: string; count: number }> = []
  if (!Array.isArray(arr)) return out
  for (let i = 0; i < arr.length - 1; i += 2) {
    const code = String(arr[i]).trim()
    const count = Number(arr[i + 1])
    if (code && Number.isFinite(count)) out.push({ code, count })
  }
  return out
}

/** Construye la clausula Solr `q` para todas las ONGD españolas curadas. */
export function spanishOrgsQuery(): string {
  const clause = CURATED_SPANISH_ORGS.map((o) => `"${o.iati_ref}"`).join(' OR ')
  return `reporting_org_ref:(${clause})`
}

/**
 * Ensambla el overview a partir de la respuesta Solr de facets + codelists para
 * resolver nombres. `disbursed` se pasa aparte (otra query al core transaction).
 * Pura: testeable con fixtures.
 */
export function buildOverview(
  solrJson: unknown,
  codelists: CodelistsData | null,
  disbursedEur: number | null,
): IatiOverviewData {
  const j = (solrJson ?? {}) as {
    response?: { numFound?: number }
    facet_counts?: { facet_fields?: Record<string, unknown> }
  }
  const facets = j?.facet_counts?.facet_fields ?? {}

  const countries: FacetCount[] = parseFacetField(facets.recipient_country_code).map(
    (x) => ({
      code: x.code.toUpperCase(),
      name: resolveCountryName(codelists, x.code),
      count: x.count,
    }),
  )
  const sectors: FacetCount[] = parseFacetField(facets.sector_code).map((x) => ({
    code: x.code,
    name: resolveSectorName(codelists, x.code),
    count: x.count,
  }))
  const orgs: FacetCount[] = parseFacetField(facets.reporting_org_ref).map((x) => ({
    code: x.code,
    name: CURATED_REF_NAMES[x.code] ?? x.code,
    count: x.count,
  }))

  return {
    total_activities: Number(j?.response?.numFound ?? 0),
    total_disbursed_eur: disbursedEur,
    top_recipient_countries: countries,
    top_sectors: sectors,
    top_reporting_orgs: orgs,
    mode: 'datastore',
  }
}

/** Doc crudo del core activity (subset). */
interface RawActivityDoc {
  iati_identifier?: unknown
  title_narrative?: unknown
  reporting_org_ref?: unknown
  reporting_org_narrative?: unknown
  recipient_country_code?: unknown
  sector_code?: unknown
  activity_status_code?: unknown
  budget_value?: unknown
  budget_value_currency?: unknown
}

/**
 * Normaliza los docs del core activity a `IatiActivity[]`. `amount_eur` se rellena
 * solo si el presupuesto viene en EUR (no inventamos FX). Pura.
 */
export function parseActivityDocs(docs: unknown): IatiActivity[] {
  if (!Array.isArray(docs)) return []
  const out: IatiActivity[] = []
  for (const raw of docs as RawActivityDoc[]) {
    const id = firstStr(raw?.iati_identifier)
    if (!id) continue
    const budgetCur = firstStr(raw?.budget_value_currency)
    const budgetVal = parseNum(raw?.budget_value)
    const amount_eur =
      budgetCur && budgetCur.toUpperCase() === 'EUR' ? budgetVal : null
    out.push({
      id,
      title: firstStr(raw?.title_narrative) ?? id,
      reporting_org_ref: firstStr(raw?.reporting_org_ref),
      reporting_org_name: firstStr(raw?.reporting_org_narrative),
      recipient_countries: strArray(raw?.recipient_country_code).map((c) =>
        c.toUpperCase(),
      ),
      sectors: strArray(raw?.sector_code),
      amount_eur,
      status: firstStr(raw?.activity_status_code),
    })
  }
  return out
}

/** Doc crudo del core transaction (subset). */
interface RawTransactionDoc {
  iati_identifier?: unknown
  reporting_org_ref?: unknown
  transaction_type_code?: unknown
  transaction_date_iso_date?: unknown
  transaction_value?: unknown
  transaction_value_currency?: unknown
  transaction_recipient_country_code?: unknown
}

/**
 * Normaliza los docs del core transaction a `IatiTransaction[]`. `value_eur` solo
 * se rellena para transacciones en EUR (honestidad FX). Pura.
 */
export function parseTransactionDocs(docs: unknown): IatiTransaction[] {
  if (!Array.isArray(docs)) return []
  const out: IatiTransaction[] = []
  for (const raw of docs as RawTransactionDoc[]) {
    const activity_id = firstStr(raw?.iati_identifier)
    if (!activity_id) continue
    const cur = firstStr(raw?.transaction_value_currency)
    const val = parseNum(raw?.transaction_value)
    const value_eur = cur && cur.toUpperCase() === 'EUR' ? val : null
    out.push({
      activity_id,
      reporting_org_ref: firstStr(raw?.reporting_org_ref),
      type_code: firstStr(raw?.transaction_type_code),
      date: firstStr(raw?.transaction_date_iso_date),
      value_eur,
      recipient_country: firstStr(raw?.transaction_recipient_country_code)?.toUpperCase() ?? null,
    })
  }
  return out
}

/**
 * Agrega transacciones en una serie temporal de desembolsos por periodo
 * (granularidad 'year' | 'month'). Solo cuenta valores EUR comparables. Devuelve
 * la serie en orden cronológico ascendente. Pura.
 */
export function buildTimeline(
  txs: IatiTransaction[],
  granularity: 'year' | 'month' = 'year',
): DisbursementBucket[] {
  const buckets = new Map<string, { value: number; count: number }>()
  for (const t of txs) {
    if (!t.date) continue
    if (t.value_eur == null) continue // solo agregamos EUR comparable
    const period = granularity === 'month' ? t.date.slice(0, 7) : t.date.slice(0, 4)
    if (!/^\d{4}/.test(period)) continue
    const b = buckets.get(period) ?? { value: 0, count: 0 }
    b.value += t.value_eur
    b.count += 1
    buckets.set(period, b)
  }
  return [...buckets.entries()]
    .map(([period, b]) => ({
      period,
      value_eur: Math.round(b.value),
      count: b.count,
    }))
    .sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0))
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch crudo a Solr + degradación
// ─────────────────────────────────────────────────────────────────────────

interface SolrFetchResult {
  ok: boolean
  json?: unknown
  /** Código de error normalizado para la degradación honesta. */
  error?: string
}

/** Una llamada Solr cruda con auth + manejo de 401/403/429. Nunca lanza. */
async function solrFetch(
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
      return { ok: false, error: `unauthorized · HTTP ${r.status} · IATI_API_KEY inválida o sin permisos` }
    }
    if (r.status === 429) return { ok: false, error: 'rate_limited · IATI Datastore (tier Exploratory 5/min)' }
    if (!r.ok) return { ok: false, error: `http_${r.status}` }
    const json: unknown = await r.json()
    return { ok: true, json }
  } catch (e: unknown) {
    const msg =
      (e as Error)?.name === 'AbortError'
        ? 'timeout'
        : String((e as Error)?.message ?? e).slice(0, 160)
    return { ok: false, error: msg }
  }
}

/** Clampa rows al rango Solr [1,1000]. */
function clampRows(n: number | undefined, def: number): number {
  const v = Number.isFinite(n as number) ? (n as number) : def
  return Math.max(1, Math.min(1000, Math.trunc(v)))
}

// ─────────────────────────────────────────────────────────────────────────
// 1) OVERVIEW · facetas país/sector/org + total desembolsado
// ─────────────────────────────────────────────────────────────────────────

export interface FetchOverviewOpts {
  noCache?: boolean
  timeoutMs?: number
}

/**
 * Visión España de la cooperación IATI vía Datastore (facetas) + un sumatorio de
 * desembolsos EUR (core transaction). Requiere IATI_API_KEY; sin ella devuelve
 * `{ ok:false, error:'no_key' }` (el route degrada a Registry+Codelists).
 */
export async function fetchIatiOverview(
  opts: FetchOverviewOpts = {},
): Promise<IatiOverviewResponse> {
  const fetched_at = new Date().toISOString()
  const apiKey = process.env.IATI_API_KEY || ''
  if (!apiKey) {
    return { ok: false, data: null, error: `no_key · ${KEY_HELP}`, fetched_at, source_url: PUBLIC_URL }
  }

  const cacheKey = 'overview'
  if (!opts.noCache) {
    const hit = getCached<IatiOverviewResponse>(cacheKey)
    if (hit) return hit
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const q = spanishOrgsQuery()

  // Query de facetas (rows=0).
  const fParams = new URLSearchParams({ q, rows: '0', wt: 'json', facet: 'true' })
  fParams.append('facet.field', 'recipient_country_code')
  fParams.append('facet.field', 'sector_code')
  fParams.append('facet.field', 'reporting_org_ref')
  fParams.set('facet.limit', '15')
  fParams.set('facet.mincount', '1')

  // En paralelo: codelists (keyless) + facetas + suma de desembolsos EUR.
  // Para la suma usamos Solr stats sobre transaction_value filtrando EUR + tipo 3.
  const txParams = new URLSearchParams({
    q: `${q} AND transaction_type_code:3 AND transaction_value_currency:EUR`,
    rows: '0',
    wt: 'json',
    stats: 'true',
  })
  txParams.append('stats.field', 'transaction_value')

  const [clRes, facetRes, txRes] = await Promise.all([
    fetchCodelists().catch(() => null),
    solrFetch('activity', fParams, apiKey, timeoutMs),
    solrFetch('transaction', txParams, apiKey, timeoutMs),
  ])

  if (!facetRes.ok) {
    return { ok: false, data: null, error: facetRes.error ?? 'datastore_error', fetched_at, source_url: PUBLIC_URL }
  }

  // Suma de desembolsos EUR vía Solr stats (sum).
  let disbursedEur: number | null = null
  if (txRes.ok) {
    const sum = (txRes.json as {
      stats?: { stats_fields?: { transaction_value?: { sum?: unknown } } }
    })?.stats?.stats_fields?.transaction_value?.sum
    const n = parseNum(sum)
    if (n != null) disbursedEur = Math.round(n)
  }

  const codelists = clRes && clRes.ok ? clRes.data : null
  const data = buildOverview(facetRes.json, codelists, disbursedEur)
  const out: IatiOverviewResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
  setCached(cacheKey, out)
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// 2) ACTIVIDADES · búsqueda filtrada
// ─────────────────────────────────────────────────────────────────────────

export interface FetchActivitiesOpts {
  recipient_country?: string | null
  reporting_org?: string | null
  sector?: string | null
  rows?: number
  start?: number
  noCache?: boolean
  timeoutMs?: number
}

/** Construye la query Solr `q` a partir de los filtros (AND de los presentes). */
export function buildActivitiesQuery(opts: {
  recipient_country?: string | null
  reporting_org?: string | null
  sector?: string | null
}): string {
  const clauses: string[] = []
  if (opts.recipient_country) {
    clauses.push(`recipient_country_code:${opts.recipient_country.trim().toUpperCase()}`)
  }
  if (opts.reporting_org) {
    clauses.push(`reporting_org_ref:"${opts.reporting_org.trim()}"`)
  }
  if (opts.sector) {
    clauses.push(`sector_code:${opts.sector.trim()}`)
  }
  // Sin filtros → acotamos a las ONGD españolas curadas (no devolver el mundo).
  if (clauses.length === 0) return spanishOrgsQuery()
  return clauses.join(' AND ')
}

/**
 * Busca actividades filtradas por país receptor / org reportante / sector DAC.
 * Requiere IATI_API_KEY. Caché 6h por combinación de filtros+paginación.
 */
export async function fetchIatiActivities(
  opts: FetchActivitiesOpts = {},
): Promise<IatiActivitiesResponse> {
  const fetched_at = new Date().toISOString()
  const apiKey = process.env.IATI_API_KEY || ''
  if (!apiKey) {
    return { ok: false, data: null, error: `no_key · ${KEY_HELP}`, fetched_at, source_url: PUBLIC_URL }
  }

  const recipient_country = opts.recipient_country?.trim() || null
  const reporting_org = opts.reporting_org?.trim() || null
  const sector = opts.sector?.trim() || null
  const rows = clampRows(opts.rows, 50)
  const start = Math.max(0, Math.trunc(opts.start ?? 0))

  const cacheKey = `acts:${recipient_country}:${reporting_org}:${sector}:${rows}:${start}`
  if (!opts.noCache) {
    const hit = getCached<IatiActivitiesResponse>(cacheKey)
    if (hit) return hit
  }

  const q = buildActivitiesQuery({ recipient_country, reporting_org, sector })
  const params = new URLSearchParams({
    q,
    rows: String(rows),
    start: String(start),
    wt: 'json',
    fl: [
      'iati_identifier',
      'title_narrative',
      'reporting_org_ref',
      'reporting_org_narrative',
      'recipient_country_code',
      'sector_code',
      'activity_status_code',
      'budget_value',
      'budget_value_currency',
    ].join(','),
  })

  const res = await solrFetch('activity', params, apiKey, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  if (!res.ok) {
    return { ok: false, data: null, error: res.error ?? 'datastore_error', fetched_at, source_url: PUBLIC_URL }
  }

  const j = (res.json ?? {}) as { response?: { numFound?: number; docs?: unknown } }
  const data: IatiActivitiesData = {
    activities: parseActivityDocs(j?.response?.docs),
    total_found: Number(j?.response?.numFound ?? 0),
    filters: { recipient_country, reporting_org, sector },
    page: { start, rows },
  }
  const out: IatiActivitiesResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
  setCached(cacheKey, out)
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// 3) TRANSACCIONES · desembolsos por org/país + timeline
// ─────────────────────────────────────────────────────────────────────────

export interface FetchTransactionsOpts {
  reporting_org?: string | null
  recipient_country?: string | null
  /** Tipo de transacción (default '3' = desembolso). */
  type_code?: string | null
  granularity?: 'year' | 'month'
  rows?: number
  noCache?: boolean
  timeoutMs?: number
}

/** Construye la query Solr `q` del core transaction. */
export function buildTransactionsQuery(opts: {
  reporting_org?: string | null
  recipient_country?: string | null
  type_code?: string | null
}): string {
  const clauses: string[] = []
  if (opts.reporting_org) clauses.push(`reporting_org_ref:"${opts.reporting_org.trim()}"`)
  else clauses.push(spanishOrgsQuery())
  if (opts.recipient_country) {
    clauses.push(`transaction_recipient_country_code:${opts.recipient_country.trim().toUpperCase()}`)
  }
  const type = (opts.type_code ?? '3').trim()
  if (type) clauses.push(`transaction_type_code:${type}`)
  return clauses.join(' AND ')
}

/**
 * Desembolsos (transacciones) por org/país, con detalle acotado + serie temporal
 * agregada. Requiere IATI_API_KEY. Caché 6h.
 */
export async function fetchIatiTransactions(
  opts: FetchTransactionsOpts = {},
): Promise<IatiTransactionsResponse> {
  const fetched_at = new Date().toISOString()
  const apiKey = process.env.IATI_API_KEY || ''
  if (!apiKey) {
    return { ok: false, data: null, error: `no_key · ${KEY_HELP}`, fetched_at, source_url: PUBLIC_URL }
  }

  const reporting_org = opts.reporting_org?.trim() || null
  const recipient_country = opts.recipient_country?.trim() || null
  const type_code = (opts.type_code ?? '3').trim() || '3'
  const granularity = opts.granularity === 'month' ? 'month' : 'year'
  const rows = clampRows(opts.rows, 500)

  const cacheKey = `txs:${reporting_org}:${recipient_country}:${type_code}:${granularity}:${rows}`
  if (!opts.noCache) {
    const hit = getCached<IatiTransactionsResponse>(cacheKey)
    if (hit) return hit
  }

  const q = buildTransactionsQuery({ reporting_org, recipient_country, type_code })
  const params = new URLSearchParams({
    q,
    rows: String(rows),
    wt: 'json',
    sort: 'transaction_date_iso_date desc',
    fl: [
      'iati_identifier',
      'reporting_org_ref',
      'transaction_type_code',
      'transaction_date_iso_date',
      'transaction_value',
      'transaction_value_currency',
      'transaction_recipient_country_code',
    ].join(','),
  })

  const res = await solrFetch('transaction', params, apiKey, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  if (!res.ok) {
    return { ok: false, data: null, error: res.error ?? 'datastore_error', fetched_at, source_url: PUBLIC_URL }
  }

  const j = (res.json ?? {}) as { response?: { numFound?: number; docs?: unknown } }
  const transactions = parseTransactionDocs(j?.response?.docs)
  const timeline = buildTimeline(transactions, granularity)
  const total_value_eur = timeline.reduce((a, b) => a + b.value_eur, 0)

  const data: IatiTransactionsData = {
    transactions,
    timeline,
    total_value_eur,
    total_found: Number(j?.response?.numFound ?? 0),
    filters: { reporting_org, recipient_country, type_code },
  }
  const out: IatiTransactionsResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
  setCached(cacheKey, out)
  return out
}
