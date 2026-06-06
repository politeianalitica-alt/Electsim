/**
 * Cliente DSA Transparency Database · Research API · Comisión Europea
 *
 * La DSA Transparency Database es la base de datos pública de "statements of
 * reasons" (declaraciones de motivos) del Digital Services Act: CADA acción de
 * moderación de contenido (retirada, restricción de visibilidad, suspensión de
 * cuenta, desmonetización…) que las plataformas online reportan a la Comisión,
 * desglosable por plataforma, categoría de infracción, ámbito territorial y
 * fecha. ~2.100M de registros acumulados, ~23M nuevos cada día.
 *
 * Para inteligencia política española es muy relevante: permite ver cuánto
 * contenido moderan las plataformas por "efectos negativos sobre el discurso
 * cívico o elecciones" (la categoría DSA más cercana a desinformación electoral)
 * o por "discurso ilegal o dañino" (odio), y cuánto de eso afecta a España.
 *
 * ── API REAL (confirmada vía docs oficiales · 2026-06-06) ──────────────────
 *   Base : https://transparency.dsa.ec.europa.eu/api/v1/research
 *   Auth : header HTTP `Authorization: Bearer <DSA_TRANSPARENCY_API_KEY>`.
 *          La key se genera en el perfil de usuario de la plataforma. Sin auth
 *          la API responde 302 → /login (NO JSON).
 *   Endpoints usados:
 *     GET  /platforms                       → lista de plataformas
 *          [{ platform_id, platform_name, vlop }]  (VLOP = Very Large Online Platform)
 *     GET  /aggregates/{date}               → total de statements de ese día
 *          { aggregates:[{received_date, permutation, total}], total,
 *            total_aggregates, date, attributes, ... }
 *     GET  /aggregates/{date}/{fields}      → agregados agrupados por {fields}
 *          Cada item: { <campo>:valor, permutation:"<campo>:<valor>", total }.
 *          Al agrupar por `platform_id` la API ENRIQUECE cada item con
 *          `platform_name` directamente → no hace falta join manual.
 *     POST /count   { query:{...} }         → cuenta documentos que matchean
 *          → { status:"success", data:{ count, _shards } }  (count en data.count)
 *
 *   ── CAMPOS DE AGRUPACIÓN VÁLIDOS (confirmados en docs) ────────────────────
 *     automated_decision · automated_detection · category ·
 *     content_type_single · decision_account · decision_ground ·
 *     decision_monetary · decision_provision · decision_visibility_single ·
 *     platform_id · received_date · source_type
 *     IMPORTANTE: el campo de plataforma es `platform_id`, NO `platform_name`.
 *     Pedir un campo inexistente hace que la API caiga silenciosamente a
 *     `received_date` (de ahí el bug del enunciado con `platform_name`).
 *
 *   ── CATEGORÍAS DSA (enum `category`, confirmado en docs oficiales) ────────
 *     STATEMENT_CATEGORY_ANIMAL_WELFARE
 *     STATEMENT_CATEGORY_CONSUMER_INFORMATION
 *     STATEMENT_CATEGORY_CYBER_VIOLENCE
 *     STATEMENT_CATEGORY_CYBER_VIOLENCE_AGAINST_WOMEN
 *     STATEMENT_CATEGORY_DATA_PROTECTION_AND_PRIVACY_VIOLATIONS
 *     STATEMENT_CATEGORY_ILLEGAL_OR_HARMFUL_SPEECH          ← discurso de odio/ilegal
 *     STATEMENT_CATEGORY_INTELLECTUAL_PROPERTY_INFRINGEMENTS
 *     STATEMENT_CATEGORY_NEGATIVE_EFFECTS_ON_CIVIC_DISCOURSE_OR_ELECTIONS ← desinfo/elecciones
 *     STATEMENT_CATEGORY_NOT_SPECIFIED_NOTICE
 *     STATEMENT_CATEGORY_OTHER_VIOLATION_TC
 *     STATEMENT_CATEGORY_PROTECTION_OF_MINORS
 *     STATEMENT_CATEGORY_RISK_FOR_PUBLIC_SECURITY
 *     STATEMENT_CATEGORY_SCAMS_AND_FRAUD
 *     STATEMENT_CATEGORY_SELF_HARM
 *     STATEMENT_CATEGORY_UNSAFE_AND_PROHIBITED_PRODUCTS
 *     STATEMENT_CATEGORY_VIOLENCE
 *     (NO existe una categoría literal "disinformation"; el proxy correcto es
 *      NEGATIVE_EFFECTS_ON_CIVIC_DISCOURSE_OR_ELECTIONS.)
 *
 *   ── TERRITORIAL_SCOPE ─────────────────────────────────────────────────────
 *     Array de códigos país ISO 3166-1 alpha-2 (DE, FR, ES…). Para aislar
 *     España: POST /count { query:{ term:{ territorial_scope:"ES" }}}.
 *
 * ── Diseño defensivo (patrón Ember/AGSI/ESIOS) ─────────────────────────────
 *   - Degradación: si falta DSA_TRANSPARENCY_API_KEY o la API falla → devuelve
 *     `{ ok:false, error, fetched_at }`. NUNCA lanza ni inventa datos.
 *   - Caché en memoria TTL 12h: el dato es diario; la BD se consolida un par de
 *     días después, así que pedimos por defecto un día ya consolidado (hoy-2).
 *   - Funciones puras de parsing (parseDsa*) exportadas para tests con fixtures.
 *
 * IMPORTANTE: DSA_TRANSPARENCY_API_KEY es server-side (Vercel env). NUNCA
 * exponer al cliente; estas funciones se llaman desde route handlers
 * (app/api/medios/dsa-transparency/route.ts).
 *
 * Docs: https://transparency.dsa.ec.europa.eu/page/research-api
 */

const BASE = 'https://transparency.dsa.ec.europa.eu/api/v1/research'
const PUBLIC_URL = 'https://transparency.dsa.ec.europa.eu'
const DEFAULT_TIMEOUT_MS = 20_000
const CACHE_TTL_MS = 12 * 3600_000 // 12h · dato diario

// ─────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────

/** Envelope estándar de degradación de todas las funciones públicas. */
export interface DsaResponse<T> {
  ok: boolean
  data?: T
  error?: string
  fetched_at: string
  source_url: string
}

export interface DsaPlatform {
  platform_id: number | null
  platform_name: string
  vlop: boolean
}

export interface DsaPlatformVolume {
  platform_id: number | null
  platform_name: string
  total: number
}

export interface DsaCategoryVolume {
  /** Código DSA crudo (STATEMENT_CATEGORY_*). */
  category: string
  /** Etiqueta legible en español. */
  label: string
  total: number
  /** true si es una categoría de interés político (desinfo/odio/seguridad). */
  political: boolean
}

export interface DsaDailyTotal {
  date: string
  total: number
}

// ─────────────────────────────────────────────────────────────────────────
// Taxonomía de categorías · etiquetas ES + foco político
// ─────────────────────────────────────────────────────────────────────────

/** Etiquetas legibles (ES) para los códigos STATEMENT_CATEGORY_*. */
export const DSA_CATEGORY_LABELS: Record<string, string> = {
  STATEMENT_CATEGORY_ANIMAL_WELFARE: 'Bienestar animal',
  STATEMENT_CATEGORY_CONSUMER_INFORMATION: 'Información al consumidor',
  STATEMENT_CATEGORY_CYBER_VIOLENCE: 'Ciberviolencia',
  STATEMENT_CATEGORY_CYBER_VIOLENCE_AGAINST_WOMEN: 'Ciberviolencia contra mujeres',
  STATEMENT_CATEGORY_DATA_PROTECTION_AND_PRIVACY_VIOLATIONS: 'Protección de datos y privacidad',
  STATEMENT_CATEGORY_ILLEGAL_OR_HARMFUL_SPEECH: 'Discurso ilegal o dañino',
  STATEMENT_CATEGORY_INTELLECTUAL_PROPERTY_INFRINGEMENTS: 'Propiedad intelectual',
  STATEMENT_CATEGORY_NEGATIVE_EFFECTS_ON_CIVIC_DISCOURSE_OR_ELECTIONS: 'Discurso cívico y elecciones',
  STATEMENT_CATEGORY_NOT_SPECIFIED_NOTICE: 'Sin especificar (aviso)',
  STATEMENT_CATEGORY_OTHER_VIOLATION_TC: 'Otra infracción de condiciones',
  STATEMENT_CATEGORY_PROTECTION_OF_MINORS: 'Protección de menores',
  STATEMENT_CATEGORY_RISK_FOR_PUBLIC_SECURITY: 'Riesgo para la seguridad pública',
  STATEMENT_CATEGORY_SCAMS_AND_FRAUD: 'Estafas y fraude',
  STATEMENT_CATEGORY_SELF_HARM: 'Autolesiones',
  STATEMENT_CATEGORY_UNSAFE_AND_PROHIBITED_PRODUCTS: 'Productos inseguros o prohibidos',
  STATEMENT_CATEGORY_VIOLENCE: 'Violencia',
}

/**
 * Categorías de especial interés para inteligencia política: el equivalente DSA
 * a desinformación electoral, discurso de odio y seguridad pública. No existe
 * una categoría literal "desinformación"; NEGATIVE_EFFECTS_ON_CIVIC_DISCOURSE_
 * OR_ELECTIONS es el proxy oficial.
 */
export const DSA_POLITICAL_CATEGORIES = new Set<string>([
  'STATEMENT_CATEGORY_NEGATIVE_EFFECTS_ON_CIVIC_DISCOURSE_OR_ELECTIONS',
  'STATEMENT_CATEGORY_ILLEGAL_OR_HARMFUL_SPEECH',
  'STATEMENT_CATEGORY_RISK_FOR_PUBLIC_SECURITY',
])

/** Etiqueta legible de un código de categoría (fallback: limpia el prefijo). */
export function dsaCategoryLabel(code: string): string {
  if (DSA_CATEGORY_LABELS[code]) return DSA_CATEGORY_LABELS[code]
  return String(code || '')
    .replace(/^STATEMENT_CATEGORY_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}

// ─────────────────────────────────────────────────────────────────────────
// Fechas
// ─────────────────────────────────────────────────────────────────────────

/** Formatea una fecha a 'YYYY-MM-DD' (UTC). */
export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Fecha por defecto a consultar: hoy - 2 días (UTC). La BD se consolida con un
 * par de días de retraso, así que un día reciente puede venir incompleto o
 * vacío; hoy-2 es un compromiso seguro entre frescura y completitud.
 */
export function defaultDate(): string {
  return ymd(new Date(Date.now() - 2 * 24 * 3600_000))
}

/** Valida 'YYYY-MM-DD'. Devuelve la fecha saneada o la por defecto. */
export function safeDate(date: string | null | undefined): string {
  const d = (date || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  return defaultDate()
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL 12h
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry { expires: number; value: any }
const _cache = new Map<string, CacheEntry>()

function cacheGet(key: string): any | undefined {
  const hit = _cache.get(key)
  if (!hit) return undefined
  if (Date.now() > hit.expires) {
    _cache.delete(key)
    return undefined
  }
  return hit.value
}

function cacheSet(key: string, value: any): void {
  _cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value })
}

/** Limpia la caché. Solo para tests. */
export function _clearDsaCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixtures) — sin red
// ─────────────────────────────────────────────────────────────────────────

/** Convierte un valor a entero no negativo o null. */
export function parseCount(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}

/**
 * Parsea la respuesta de GET /platforms → lista tipada de plataformas.
 * Tolera tanto un array directo como `{ data:[...] }` o `{ platforms:[...] }`.
 */
export function parseDsaPlatforms(json: unknown): DsaPlatform[] {
  const arr = extractArray(json, ['platforms', 'data'])
  const out: DsaPlatform[] = []
  for (const raw of arr) {
    const r = raw as Record<string, unknown>
    const name = String(r?.platform_name ?? r?.name ?? '').trim()
    if (!name) continue
    out.push({
      platform_id: parseCount(r?.platform_id ?? r?.id),
      platform_name: name,
      vlop: r?.vlop === true || r?.vlop === 'true' || r?.is_vlop === true,
    })
  }
  // VLOPs primero, luego alfabético.
  out.sort((a, b) => {
    if (a.vlop !== b.vlop) return a.vlop ? -1 : 1
    return a.platform_name.localeCompare(b.platform_name)
  })
  return out
}

/**
 * Extrae el total del día de la respuesta de GET /aggregates/{date}. El total
 * agregado del día vive en el campo `total` del envelope.
 */
export function parseDsaDailyTotal(json: unknown, date: string): DsaDailyTotal | null {
  const j = (json ?? {}) as Record<string, unknown>
  const total = parseCount(j?.total)
  if (total == null) return null
  return { date: String(j?.date ?? date), total }
}

/**
 * Parsea GET /aggregates/{date}/platform_id → top plataformas por volumen.
 * Cada item del array `aggregates` trae `platform_id`, `platform_name` (la API
 * lo enriquece al agrupar por platform_id) y `total`. Ordena desc por volumen
 * y recorta a `topN`. `platformNames` permite mapear ids→nombre si la API no
 * incluyera el nombre (fallback robusto).
 */
export function parseDsaByPlatform(
  json: unknown,
  topN = 12,
  platformNames?: Map<number, string>,
): DsaPlatformVolume[] {
  const arr = extractArray(json, ['aggregates', 'data'])
  const out: DsaPlatformVolume[] = []
  for (const raw of arr) {
    const r = raw as Record<string, unknown>
    const total = parseCount(r?.total)
    if (total == null) continue
    const pid = parseCount(r?.platform_id)
    let name = String(r?.platform_name ?? '').trim()
    if (!name && pid != null && platformNames) name = platformNames.get(pid) ?? ''
    if (!name) name = pid != null ? `Plataforma ${pid}` : 'Desconocida'
    out.push({ platform_id: pid, platform_name: name, total })
  }
  out.sort((a, b) => b.total - a.total)
  return out.slice(0, Math.max(1, topN))
}

/**
 * Parsea GET /aggregates/{date}/category → desglose por categoría DSA.
 * Cada item trae `category` y `total`. Ordena desc por volumen y anota la
 * etiqueta ES + si es categoría de interés político.
 */
export function parseDsaByCategory(json: unknown): DsaCategoryVolume[] {
  const arr = extractArray(json, ['aggregates', 'data'])
  const out: DsaCategoryVolume[] = []
  for (const raw of arr) {
    const r = raw as Record<string, unknown>
    const code = String(r?.category ?? '').trim()
    const total = parseCount(r?.total)
    if (!code || total == null) continue
    out.push({
      category: code,
      label: dsaCategoryLabel(code),
      total,
      political: DSA_POLITICAL_CATEGORIES.has(code),
    })
  }
  out.sort((a, b) => b.total - a.total)
  return out
}

/**
 * Extrae el `count` de la respuesta de POST /count. La forma confirmada es
 * `{ status:"success", data:{ count, _shards } }` → count en `data.count`.
 * Tolera también un `{ count }` plano por robustez.
 */
export function parseDsaCount(json: unknown): number | null {
  const j = (json ?? {}) as Record<string, any>
  if (j?.data && j.data.count != null) return parseCount(j.data.count)
  if (j?.count != null) return parseCount(j.count)
  return null
}

/** Helper: extrae un array de un json que puede ser array directo o {key:[...]}. */
function extractArray(json: unknown, keys: string[]): unknown[] {
  if (Array.isArray(json)) return json
  const j = (json ?? {}) as Record<string, unknown>
  for (const k of keys) {
    if (Array.isArray(j[k])) return j[k] as unknown[]
  }
  return []
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch crudo con auth + degradación + caché
// ─────────────────────────────────────────────────────────────────────────

interface RawResult {
  ok: boolean
  error?: string
  json?: any
}

/** GET genérico contra la Research API. Nunca lanza. */
async function dsaGet(path: string, timeoutMs?: number): Promise<RawResult> {
  const apiKey = process.env.DSA_TRANSPARENCY_API_KEY || ''
  if (!apiKey) {
    return { ok: false, error: 'no_key · configurar DSA_TRANSPARENCY_API_KEY en Vercel env vars' }
  }
  const url = `${BASE}${path}`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` },
      // Caché HTTP de Next además de la caché de proceso (12h).
      next: { revalidate: 43200 },
    } as RequestInit)
    clearTimeout(t)
    return await interpretResponse(r)
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'timeout' : String(e?.message ?? e).slice(0, 160)
    return { ok: false, error: msg }
  }
}

/** POST genérico (cuerpo OpenSearch DSL) contra la Research API. Nunca lanza. */
async function dsaPost(path: string, body: unknown, timeoutMs?: number): Promise<RawResult> {
  const apiKey = process.env.DSA_TRANSPARENCY_API_KEY || ''
  if (!apiKey) {
    return { ok: false, error: 'no_key · configurar DSA_TRANSPARENCY_API_KEY en Vercel env vars' }
  }
  const url = `${BASE}${path}`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const r = await fetch(url, {
      signal: ctrl.signal,
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body ?? {}),
      next: { revalidate: 43200 },
    } as RequestInit)
    clearTimeout(t)
    return await interpretResponse(r)
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'timeout' : String(e?.message ?? e).slice(0, 160)
    return { ok: false, error: msg }
  }
}

/** Interpreta una Response: status, redirect a login (auth fallida), JSON. */
async function interpretResponse(r: Response): Promise<RawResult> {
  // Sin auth la API redirige a /login (302) o devuelve HTML, no JSON.
  if (r.status === 302 || r.status === 401 || r.status === 403) {
    return { ok: false, error: `unauthorized · HTTP ${r.status} · revisa DSA_TRANSPARENCY_API_KEY` }
  }
  if (r.status === 429) {
    return { ok: false, error: 'rate_limited · DSA Transparency API' }
  }
  if (!r.ok) {
    return { ok: false, error: `http_${r.status}` }
  }
  // Defensa extra: si vino HTML (login) con 200, no es JSON.
  const ct = r.headers?.get?.('content-type') || ''
  if (ct && !/json/i.test(ct)) {
    return { ok: false, error: 'respuesta_no_json · posible sesión/login' }
  }
  try {
    const json = await r.json()
    return { ok: true, json }
  } catch {
    return { ok: false, error: 'json_invalido' }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// API pública del cliente
// ─────────────────────────────────────────────────────────────────────────

/** Cuántos resultados de plataformas devolver/mostrar por defecto. */
const DEFAULT_TOP_PLATFORMS = 12

/**
 * Lista de plataformas que reportan a la base DSA. Caché 12h (cambia poco).
 */
export async function fetchDsaPlatforms(): Promise<DsaResponse<DsaPlatform[]>> {
  const fetched_at = new Date().toISOString()
  const cacheKey = 'platforms'
  const cached = cacheGet(cacheKey)
  if (cached !== undefined) return cached

  const raw = await dsaGet('/platforms')
  if (!raw.ok) {
    return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }
  }
  const platforms = parseDsaPlatforms(raw.json)
  if (platforms.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }
  const result: DsaResponse<DsaPlatform[]> = {
    ok: true, data: platforms, fetched_at, source_url: PUBLIC_URL,
  }
  cacheSet(cacheKey, result)
  return result
}

/**
 * Total de statements of reasons reportados en un día (toda la UE, todas las
 * plataformas). Usa GET /aggregates/{date}. Caché 12h.
 */
export async function fetchDsaDailyTotal(date?: string): Promise<DsaResponse<DsaDailyTotal>> {
  const fetched_at = new Date().toISOString()
  const d = safeDate(date)
  const cacheKey = `daily:${d}`
  const cached = cacheGet(cacheKey)
  if (cached !== undefined) return cached

  const raw = await dsaGet(`/aggregates/${d}`)
  if (!raw.ok) {
    return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }
  }
  const parsed = parseDsaDailyTotal(raw.json, d)
  if (!parsed) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }
  const result: DsaResponse<DsaDailyTotal> = {
    ok: true, data: parsed, fetched_at, source_url: PUBLIC_URL,
  }
  cacheSet(cacheKey, result)
  return result
}

/**
 * Total histórico acumulado de statements (toda la base). POST /count con query
 * vacío (match_all implícito). Caché 12h.
 */
export async function fetchDsaTotalHistoric(): Promise<DsaResponse<number>> {
  const fetched_at = new Date().toISOString()
  const cacheKey = 'total_historic'
  const cached = cacheGet(cacheKey)
  if (cached !== undefined) return cached

  const raw = await dsaPost('/count', {})
  if (!raw.ok) {
    return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }
  }
  const count = parseDsaCount(raw.json)
  if (count == null) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }
  const result: DsaResponse<number> = { ok: true, data: count, fetched_at, source_url: PUBLIC_URL }
  cacheSet(cacheKey, result)
  return result
}

/**
 * Top plataformas por volumen de moderación en un día. Agrupa por `platform_id`
 * (la API enriquece con `platform_name`). Caché 12h.
 */
export async function fetchDsaByPlatform(
  date?: string,
  topN: number = DEFAULT_TOP_PLATFORMS,
): Promise<DsaResponse<DsaPlatformVolume[]>> {
  const fetched_at = new Date().toISOString()
  const d = safeDate(date)
  const cacheKey = `by_platform:${d}:${topN}`
  const cached = cacheGet(cacheKey)
  if (cached !== undefined) return cached

  const raw = await dsaGet(`/aggregates/${d}/platform_id`)
  if (!raw.ok) {
    return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }
  }
  const rows = parseDsaByPlatform(raw.json, topN)
  if (rows.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }
  const result: DsaResponse<DsaPlatformVolume[]> = {
    ok: true, data: rows, fetched_at, source_url: PUBLIC_URL,
  }
  cacheSet(cacheKey, result)
  return result
}

/**
 * Desglose por categoría DSA en un día (foco en discurso cívico/elecciones,
 * discurso ilegal/odio y seguridad pública). Agrupa por `category`. Caché 12h.
 */
export async function fetchDsaByCategory(date?: string): Promise<DsaResponse<DsaCategoryVolume[]>> {
  const fetched_at = new Date().toISOString()
  const d = safeDate(date)
  const cacheKey = `by_category:${d}`
  const cached = cacheGet(cacheKey)
  if (cached !== undefined) return cached

  const raw = await dsaGet(`/aggregates/${d}/category`)
  if (!raw.ok) {
    return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }
  }
  const rows = parseDsaByCategory(raw.json)
  if (rows.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }
  const result: DsaResponse<DsaCategoryVolume[]> = {
    ok: true, data: rows, fetched_at, source_url: PUBLIC_URL,
  }
  cacheSet(cacheKey, result)
  return result
}

/**
 * Statements con `territorial_scope` que incluye España (ES). POST /count con
 * filtro `term`. Por defecto cuenta TODO el histórico con ámbito ES (no por un
 * solo día), que es la cifra de inteligencia más útil; si se pasa `date` se
 * acota a ese día con un filtro `received_date`. Caché 12h.
 */
export async function fetchDsaSpain(date?: string): Promise<DsaResponse<number>> {
  const fetched_at = new Date().toISOString()
  const scoped = !!date
  const d = scoped ? safeDate(date) : ''
  const cacheKey = `spain:${scoped ? d : 'all'}`
  const cached = cacheGet(cacheKey)
  if (cached !== undefined) return cached

  // territorial_scope es un array de códigos país; `term` matchea si ES está.
  const filters: unknown[] = [{ term: { territorial_scope: 'ES' } }]
  if (scoped) {
    filters.push({ term: { received_date: d } })
  }
  const body = { query: { bool: { filter: filters } } }

  const raw = await dsaPost('/count', body)
  if (!raw.ok) {
    return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }
  }
  const count = parseDsaCount(raw.json)
  if (count == null) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }
  const result: DsaResponse<number> = { ok: true, data: count, fetched_at, source_url: PUBLIC_URL }
  cacheSet(cacheKey, result)
  return result
}
