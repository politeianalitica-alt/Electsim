/**
 * lib/tercer-sector/shared.ts · Primitivas compartidas del data layer de
 * Tercer Sector v3 · Sprint TS2-orgs.
 *
 * Centraliza el patrón Politeia (`{ ok, data|null, error?, fetched_at,
 * source_url }`), caché TTL en memoria y degradación honesta (el fetch nunca
 * lanza; ante fallo devuelve `{ ok:false, error }`) para las fuentes vivas de
 * (a) directorio dinámico de ONGs y (b) financiación al tercer sector:
 *
 *   - BDNS · Base de Datos Nacional de Subvenciones (keyless · JSON).
 *   - EU Funding & Tenders SEDIA search-api (keyless · apiKey=SEDIA · POST).
 *   - EIB · Banco Europeo de Inversiones (RSS · degrada si el feed no responde).
 *   - IRPF 0,7% Fines Sociales (dato curado + datado, sin API estable).
 *   - EU Transparency Register (registro de transparencia UE · opcional).
 *
 * NO depende de tipos compartidos del repo (sectorial-data.ts, etc.). Cada
 * cliente de tercer sector define sus propios tipos sobre estas primitivas.
 * Patrón calcado de `lib/turismo/shared.ts` y `lib/energia/agsi.ts`.
 *
 * Se mantiene plano (sin dependencias) para usarse tanto en route handlers
 * Next.js como en tests Node (--experimental-strip-types).
 */

// ─────────────────────────────────────────────────────────────────────────
// Envelope común (patrón Politeia)
// ─────────────────────────────────────────────────────────────────────────

export interface TercerSectorEnvelope<T> {
  ok: boolean
  data: T | null
  error?: string
  /** ISO timestamp del momento de la petición (o cache hit). */
  fetched_at: string
  /** URL pública de la fuente para citar en la UI. */
  source_url: string
  /** Marca por-bloque cuando una parte degrada pero otras viven. */
  partial?: boolean
}

const UA =
  'Mozilla/5.0 (compatible; Politeia/1.0; +https://politeia-visual-oscar.vercel.app)'
const DEFAULT_TIMEOUT_MS = 15_000

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL configurable por cliente
// ─────────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  expires: number
  value: T
}
const _cache = new Map<string, CacheEntry<unknown>>()

/** Lee de caché si no ha expirado. */
export function cacheGet<T>(key: string): T | null {
  const hit = _cache.get(key) as CacheEntry<T> | undefined
  if (hit && Date.now() <= hit.expires) return hit.value
  return null
}

/** Escribe en caché con TTL en ms. */
export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  _cache.set(key, { expires: Date.now() + ttlMs, value })
}

/** Limpia toda la caché de tercer sector. Solo para tests. */
export function _clearTercerSectorCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Parsing numérico null-safe + helpers de formato
// ─────────────────────────────────────────────────────────────────────────

/** Convierte a número finito o null (tolera string/"-"/""/null + coma decimal). */
export function num(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (s === '' || s === '-' || s.toLowerCase() === 'n/a') return null
  // Tolera separadores de miles "1.234.567,89" → 1234567.89.
  const cleaned =
    s.includes(',') && s.includes('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Redondea a `d` decimales o null. */
export function round(v: number | null, d = 2): number | null {
  if (v == null || !Number.isFinite(v)) return null
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}

/** Normaliza un string para búsquedas: minúsculas + sin acentos + trim. */
export function normText(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Slugifica un nombre (para ids estables de entidades vivas). */
export function slugify(s: string): string {
  return normText(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch JSON robusto (GET) · nunca lanza
// ─────────────────────────────────────────────────────────────────────────

export interface FetchOpts {
  /** Revalidación HTTP de Next (segundos). */
  revalidate?: number
  timeoutMs?: number
  /** Cabeceras extra (ej. Accept específico). */
  headers?: Record<string, string>
}

/**
 * GET JSON con timeout + degradación honesta. Devuelve `{ json }` o
 * `{ error }`. NUNCA lanza.
 */
export async function fetchJson(
  url: string,
  opts: FetchOpts = {},
): Promise<{ json: any } | { error: string; status?: number }> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const r = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': UA, ...(opts.headers ?? {}) },
      signal: ctrl.signal,
      next: { revalidate: opts.revalidate ?? 21600 },
    } as RequestInit)
    clearTimeout(t)
    if (r.status === 429) return { error: 'rate_limited', status: 429 }
    if (!r.ok) return { error: `http_${r.status}`, status: r.status }
    const text = await r.text()
    if (!text || text.trim().length < 2) return { error: 'empty_body' }
    try {
      return { json: JSON.parse(text) }
    } catch {
      return { error: 'invalid_json' }
    }
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string }
    return {
      error: err?.name === 'AbortError' ? 'timeout' : String(err?.message ?? e).slice(0, 160),
    }
  }
}

/**
 * POST con timeout + degradación honesta. `body` se envía tal cual (string).
 * Devuelve `{ json }` o `{ error }`. NUNCA lanza. Usado por SEDIA, cuyo
 * search-api solo responde a POST (GET → 405).
 */
export async function postJson(
  url: string,
  body: string,
  opts: FetchOpts = {},
): Promise<{ json: any } | { error: string; status?: number }> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        ...(opts.headers ?? {}),
      },
      body,
      signal: ctrl.signal,
      next: { revalidate: opts.revalidate ?? 21600 },
    } as RequestInit)
    clearTimeout(t)
    if (r.status === 429) return { error: 'rate_limited', status: 429 }
    if (!r.ok) return { error: `http_${r.status}`, status: r.status }
    const text = await r.text()
    if (!text || text.trim().length < 2) return { error: 'empty_body' }
    try {
      return { json: JSON.parse(text) }
    } catch {
      return { error: 'invalid_json' }
    }
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string }
    return {
      error: err?.name === 'AbortError' ? 'timeout' : String(err?.message ?? e).slice(0, 160),
    }
  }
}

/**
 * GET texto crudo (para feeds RSS/XML). Devuelve `{ text }` o `{ error }`.
 * NUNCA lanza.
 */
export async function fetchText(
  url: string,
  opts: FetchOpts = {},
): Promise<{ text: string } | { error: string; status?: number }> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const r = await fetch(url, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': UA,
        ...(opts.headers ?? {}),
      },
      signal: ctrl.signal,
      next: { revalidate: opts.revalidate ?? 21600 },
    } as RequestInit)
    clearTimeout(t)
    if (r.status === 429) return { error: 'rate_limited', status: 429 }
    if (!r.ok) return { error: `http_${r.status}`, status: r.status }
    const text = await r.text()
    if (!text || text.trim().length < 10) return { error: 'empty_body' }
    return { text }
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string }
    return {
      error: err?.name === 'AbortError' ? 'timeout' : String(err?.message ?? e).slice(0, 160),
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Taxonomías compartidas (tipo de entidad, sector, ámbito, CCAA)
// ─────────────────────────────────────────────────────────────────────────

/** Tipo legal/organizativo de una entidad del tercer sector. */
export type OrgTipo =
  | 'fundacion'
  | 'asociacion'
  | 'asociacion_dup' // declarada de utilidad pública
  | 'ongd' // ONG de desarrollo (cooperación internacional)
  | 'cooperativa'
  | 'sociedad_laboral'
  | 'federacion' // entidad cumbre / de 2º o 3er grado
  | 'plataforma'

/** Ámbito geográfico principal de actuación. */
export type OrgAmbito = 'local' | 'autonomico' | 'estatal' | 'internacional'

export const ORG_TIPO_LABEL: Record<OrgTipo, string> = {
  fundacion: 'Fundación',
  asociacion: 'Asociación',
  asociacion_dup: 'Asoc. utilidad pública',
  ongd: 'ONGD',
  cooperativa: 'Cooperativa',
  sociedad_laboral: 'Sociedad laboral',
  federacion: 'Federación',
  plataforma: 'Plataforma cumbre',
}

export const ORG_AMBITO_LABEL: Record<OrgAmbito, string> = {
  local: 'Local / provincial',
  autonomico: 'Autonómico',
  estatal: 'Estatal',
  internacional: 'Internacional',
}

/** Sectores de actividad del tercer sector (clave estable → etiqueta). */
export const SECTOR_LABEL: Record<string, string> = {
  asistencia_social: 'Asistencia social',
  humanitario: 'Acción humanitaria',
  cooperacion_internacional: 'Cooperación internacional',
  sanitario: 'Salud',
  infancia: 'Infancia',
  juventud: 'Juventud',
  mayores: 'Personas mayores',
  refugiados: 'Refugio y migraciones',
  derechos_humanos: 'Derechos humanos',
  medio_ambiente: 'Medio ambiente',
  educacion: 'Educación',
  cultura: 'Cultura',
  discapacidad: 'Discapacidad',
  salud_mental: 'Salud mental',
  adicciones: 'Adicciones',
  inclusion_social: 'Inclusión social',
  pobreza: 'Lucha contra la pobreza',
  vivienda: 'Vivienda y sinhogarismo',
  igualdad: 'Igualdad de género',
  lgtbi: 'LGTBI+',
  empleo: 'Empleo e inserción',
  economia_social: 'Economía social',
  voluntariado: 'Voluntariado',
  obra_social_bancaria: 'Obra social (fundación bancaria)',
  investigacion: 'Investigación y ciencia',
  consumo: 'Consumo',
  representacion_cumbre: 'Representación (entidad cumbre)',
}

/** Devuelve la etiqueta humana de un sector (fallback: sustituye _ por espacio). */
export function sectorLabel(code: string): string {
  return SECTOR_LABEL[code] ?? code.replace(/_/g, ' ')
}

// ─────────────────────────────────────────────────────────────────────────
// CCAA · clave estable → nombre (para filtros del directorio)
// ─────────────────────────────────────────────────────────────────────────

export interface CcaaMeta {
  /** Clave estable en minúsculas con guiones (ej. "comunidad-valenciana"). */
  key: string
  name: string
}

export const CCAA: CcaaMeta[] = [
  { key: 'andalucia', name: 'Andalucía' },
  { key: 'aragon', name: 'Aragón' },
  { key: 'asturias', name: 'Principado de Asturias' },
  { key: 'baleares', name: 'Illes Balears' },
  { key: 'canarias', name: 'Canarias' },
  { key: 'cantabria', name: 'Cantabria' },
  { key: 'castilla-la-mancha', name: 'Castilla-La Mancha' },
  { key: 'castilla-leon', name: 'Castilla y León' },
  { key: 'cataluna', name: 'Cataluña' },
  { key: 'ceuta', name: 'Ceuta' },
  { key: 'comunidad-valenciana', name: 'Comunitat Valenciana' },
  { key: 'extremadura', name: 'Extremadura' },
  { key: 'galicia', name: 'Galicia' },
  { key: 'la-rioja', name: 'La Rioja' },
  { key: 'madrid', name: 'Comunidad de Madrid' },
  { key: 'melilla', name: 'Melilla' },
  { key: 'murcia', name: 'Región de Murcia' },
  { key: 'navarra', name: 'Comunidad Foral de Navarra' },
  { key: 'pais-vasco', name: 'País Vasco' },
]

export const CCAA_BY_KEY: Record<string, CcaaMeta> = Object.fromEntries(
  CCAA.map((c) => [c.key, c]),
)

/** Normaliza un nombre/clave de CCAA a su clave estable (o null). */
export function ccaaKey(input: string | null | undefined): string | null {
  if (!input) return null
  const n = normText(input).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  if (CCAA_BY_KEY[n]) return n
  // Match laxo por nombre normalizado.
  for (const c of CCAA) {
    if (normText(c.name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') === n) return c.key
    if (normText(c.name).includes(normText(input))) return c.key
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────
// Paginación pura (compartida por todos los endpoints)
// ─────────────────────────────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/** Pagina un array ya filtrado. Pura: testeable. `page` es 0-based. */
export function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const ps = Math.max(1, Math.min(200, Math.floor(pageSize) || 24))
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / ps))
  const p = Math.max(0, Math.min(totalPages - 1, Math.floor(page) || 0))
  const start = p * ps
  return {
    items: items.slice(start, start + ps),
    total,
    page: p,
    page_size: ps,
    total_pages: totalPages,
  }
}
