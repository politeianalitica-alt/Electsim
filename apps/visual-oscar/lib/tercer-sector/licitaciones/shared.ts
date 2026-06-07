/**
 * Primitivas compartidas del agregador de licitaciones · TS2-lic-src
 *
 * Helpers PUROS (sin red) reutilizados por todos los conectores + el fetch
 * resiliente con timeout corto y la caché en memoria. Separados de cada
 * conector para testearlos una vez y no duplicar el parser ATOM (patrón
 * heredado de `lib/placsp.ts`).
 *
 * Nada aquí lanza hacia arriba: la red degrada a `SourceResult{ok:false}`.
 */
import type { FuenteLicitacion, SourceResult } from './types'

export const DEFAULT_TIMEOUT_MS = 8_000
export const CACHE_TTL_MS = 30 * 60_000 // 30 min · licitaciones rotan despacio

// ─────────────────────────────────────────────────────────────────────────
// Parsing de texto / XML (regex, igual que lib/placsp.ts) — PURO
// ─────────────────────────────────────────────────────────────────────────

/** Decodifica entidades XML/HTML y elimina tags residuales. */
export function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Captura el contenido textual del primer `<name [attrs]>...</name>` (soporta namespaces). */
export function tag(block: string, name: string): string {
  const re = new RegExp(`<${escapeTag(name)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeTag(name)}>`, 'i')
  const m = block.match(re)
  return m ? decode(m[1]) : ''
}

/** Lee el valor de un atributo del primer `<name ... attr="valor">`. */
export function attr(block: string, name: string, attrName: string): string {
  const re = new RegExp(`<${escapeTag(name)}(?:\\s[^>]*)?\\s${attrName}=["']([^"']+)["']`, 'i')
  const m = block.match(re)
  return m ? m[1] : ''
}

/** Devuelve TODOS los contenidos de `<name>...</name>` (para listas de docs/CPVs). */
export function tagAll(block: string, name: string): string[] {
  const re = new RegExp(`<${escapeTag(name)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeTag(name)}>`, 'gi')
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(block)) !== null) out.push(decode(m[1]))
  return out
}

function escapeTag(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Trocea un XML ATOM/OCDS-XML en bloques `<entry>...</entry>`. */
export function splitEntries(xml: string, entryTag = 'entry'): string[] {
  const blocks = xml.split(new RegExp(`<${entryTag}[\\s>]`)).slice(1)
  return blocks.map((raw) => {
    const closeIdx = raw.search(new RegExp(`<\\/${entryTag}>`, 'i'))
    return closeIdx > 0 ? raw.slice(0, closeIdx) : raw
  })
}

// ─────────────────────────────────────────────────────────────────────────
// Números / fechas / formato de documento — PURO
// ─────────────────────────────────────────────────────────────────────────

/** Parsea número tolerando string, separadores y huecos ("-", "", "n/a"). */
export function parseNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v).trim()
  if (s === '' || s === '-' || s.toLowerCase() === 'n/a') return null
  // Si tiene coma y punto, asumimos coma=miles europeo cuando el punto va antes;
  // si no, quitamos separadores de miles de forma conservadora.
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    s = s.replace(/,/g, '')
  } else {
    s = s.replace(/,/g, '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Normaliza una fecha a ISO-8601 (o null). Acepta YYYYMMDD, YYYY-MM-DD, ISO. */
export function toIso(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  // YYYYMMDD compacto (TED)
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return d.toISOString()
  // Solo fecha YYYY-MM-DD ya válida
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s
  return null
}

/** Deriva el formato (extensión) normalizado de una URL o nombre de fichero. */
export function detectFormat(urlOrName: string, hint?: string): string {
  const fromHint = (hint || '').toLowerCase().trim()
  if (fromHint && /^[a-z0-9]{2,5}$/.test(fromHint)) return normalizeFmt(fromHint)
  const clean = (urlOrName || '').split('?')[0].split('#')[0]
  const m = clean.match(/\.([a-z0-9]{2,5})$/i)
  if (m) return normalizeFmt(m[1].toLowerCase())
  // Tipos MIME comunes que llegan como hint
  if (/pdf/.test(fromHint)) return 'pdf'
  if (/word|docx?/.test(fromHint)) return 'docx'
  if (/excel|sheet|xlsx?/.test(fromHint)) return 'xlsx'
  if (/html/.test(fromHint)) return 'html'
  return 'desconocido'
}

function normalizeFmt(ext: string): string {
  const map: Record<string, string> = {
    doc: 'doc',
    docx: 'docx',
    odt: 'odt',
    xls: 'xls',
    xlsx: 'xlsx',
    ods: 'ods',
    pdf: 'pdf',
    htm: 'html',
    html: 'html',
    xml: 'xml',
    zip: 'zip',
    rar: 'zip',
    '7z': 'zip',
    txt: 'txt',
    rtf: 'rtf',
  }
  return map[ext] ?? ext
}

// ─────────────────────────────────────────────────────────────────────────
// Conversión de moneda a EUR (tasas estáticas y datadas) — PURO
// ─────────────────────────────────────────────────────────────────────────

/**
 * Tasas indicativas FX → EUR, datadas (aprox. media 2024-2025). NO pretenden
 * ser de mercado: solo permiten ordenar/filtrar por valor de forma homogénea.
 * La moneda original SIEMPRE se conserva en `moneda`. Para EUR la tasa es 1.
 *
 * Fuente de referencia (orden de magnitud): ECB reference rates. Si una moneda
 * no está en la tabla, `toEur` devuelve null (no inventa una tasa).
 */
export const FX_TO_EUR: Record<string, number> = {
  EUR: 1,
  USD: 0.92,
  GBP: 1.17,
  CHF: 1.04,
  SEK: 0.088,
  NOK: 0.086,
  DKK: 0.134,
  PLN: 0.23,
  CZK: 0.04,
  RON: 0.2,
  HUF: 0.0025,
  BGN: 0.511,
  AUD: 0.6,
  CAD: 0.68,
  UAH: 0.022,
  MXN: 0.05,
  ARS: 0.001,
  COP: 0.00022,
  PYG: 0.00012,
  BRL: 0.17,
}

/** Convierte un importe a EUR usando `FX_TO_EUR`. null si moneda desconocida. */
export function toEur(amount: number | null, currency: string | null | undefined): number | null {
  if (amount == null || !Number.isFinite(amount)) return null
  const cur = (currency || 'EUR').toUpperCase().trim()
  const rate = FX_TO_EUR[cur]
  if (rate == null) return null
  return Math.round(amount * rate)
}

// ─────────────────────────────────────────────────────────────────────────
// Mapa ISO-2 → nombre de país (subset relevante a licitaciones del agregador)
// ─────────────────────────────────────────────────────────────────────────
export const COUNTRY_NAMES: Record<string, string> = {
  ES: 'España',
  GB: 'Reino Unido',
  UK: 'Reino Unido',
  FR: 'Francia',
  DE: 'Alemania',
  IT: 'Italia',
  PT: 'Portugal',
  NL: 'Países Bajos',
  BE: 'Bélgica',
  IE: 'Irlanda',
  PL: 'Polonia',
  RO: 'Rumanía',
  SE: 'Suecia',
  NO: 'Noruega',
  DK: 'Dinamarca',
  FI: 'Finlandia',
  AT: 'Austria',
  GR: 'Grecia',
  CZ: 'Chequia',
  HU: 'Hungría',
  BG: 'Bulgaria',
  UA: 'Ucrania',
  US: 'Estados Unidos',
  AU: 'Australia',
  MX: 'México',
  AR: 'Argentina',
  CO: 'Colombia',
  PY: 'Paraguay',
  BR: 'Brasil',
}

/** Nombre de país a partir de ISO-2/ISO-3 conocido (fallback: el código en mayúsculas). */
export function countryName(code: string | null | undefined): string {
  if (!code) return 'Desconocido'
  const c = code.toUpperCase().trim()
  if (COUNTRY_NAMES[c]) return COUNTRY_NAMES[c]
  // ISO-3 → ISO-2 frecuentes
  const iso3: Record<string, string> = {
    ESP: 'ES',
    GBR: 'GB',
    FRA: 'FR',
    DEU: 'DE',
    ITA: 'IT',
    PRT: 'PT',
    USA: 'US',
    UKR: 'UA',
    MEX: 'MX',
    ARG: 'AR',
    COL: 'CO',
    PRY: 'PY',
  }
  if (iso3[c]) return COUNTRY_NAMES[iso3[c]] ?? iso3[c]
  return c
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente con timeout corto — NUNCA lanza
// ─────────────────────────────────────────────────────────────────────────

export interface SafeFetchResult {
  ok: boolean
  status: number
  text: string
  json: unknown
  error?: string
}

/**
 * Fetch con AbortController + timeout. Devuelve `{ok,status,text,json}` y nunca
 * lanza: ante timeout/red error rellena `error`. Intenta parsear JSON solo si
 * el caller lo pide (`as: 'json'`); para ATOM/XML usa `as: 'text'`.
 */
export async function safeFetch(
  url: string,
  opts: {
    as?: 'json' | 'text'
    headers?: Record<string, string>
    method?: string
    body?: string
    timeoutMs?: number
    /** undici dispatcher (para endpoints con cert que no valida, ej. PLACE). */
    dispatcher?: unknown
  } = {},
): Promise<SafeFetchResult> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const init: Record<string, unknown> = {
      signal: ctrl.signal,
      method: opts.method ?? 'GET',
      headers: {
        'User-Agent': 'PoliteiaAnalitica/3.0 (+https://politeia-analitica.es)',
        ...(opts.headers ?? {}),
      },
    }
    if (opts.body != null) init.body = opts.body
    if (opts.dispatcher != null) init.dispatcher = opts.dispatcher

    const r = await fetch(url, init as RequestInit)
    clearTimeout(t)
    const text = await r.text()
    let json: unknown = null
    if (opts.as === 'json') {
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        json = null
      }
    }
    return { ok: r.ok, status: r.status, text, json }
  } catch (e: unknown) {
    clearTimeout(t)
    const err = e as { name?: string; message?: string }
    const msg = err?.name === 'AbortError' ? 'timeout' : String(err?.message ?? e).slice(0, 160)
    return { ok: false, status: 0, text: '', json: null, error: msg }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria por-fuente (clave SIN secretos)
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry {
  expires: number
  value: SourceResult
}
const _cache = new Map<string, CacheEntry>()

export function cacheGet(key: string): SourceResult | null {
  const hit = _cache.get(key)
  if (hit && Date.now() <= hit.expires) return hit.value
  return null
}

export function cacheSet(key: string, value: SourceResult, ttlMs = CACHE_TTL_MS): void {
  // Solo cacheamos resultados OK (los errores pueden ser transitorios / key).
  if (value.ok) _cache.set(key, { expires: Date.now() + ttlMs, value })
}

/** Limpia la caché. Solo para tests. */
export function _clearLicitacionesCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers de SourceResult
// ─────────────────────────────────────────────────────────────────────────

/** Crea un SourceResult de error (degradación honesta). */
export function errResult(
  fuente: FuenteLicitacion,
  error: string,
  source_url: string,
): SourceResult {
  return {
    fuente,
    ok: false,
    licitaciones: [],
    error,
    fetched_at: new Date().toISOString(),
    source_url,
  }
}

/** Crea un SourceResult OK. */
export function okResult(
  fuente: FuenteLicitacion,
  licitaciones: SourceResult['licitaciones'],
  source_url: string,
  total_reported?: number,
): SourceResult {
  return {
    fuente,
    ok: true,
    licitaciones,
    fetched_at: new Date().toISOString(),
    source_url,
    total_reported,
  }
}
