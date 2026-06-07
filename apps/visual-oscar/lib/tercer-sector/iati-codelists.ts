/**
 * Cliente IATI Codelists · KEYLESS · TS2-iati.
 *
 * Los codelists IATI son los diccionarios oficiales que mapean los códigos que
 * aparecen en las actividades a nombres legibles. Sin ellos, el resto de la UI
 * mostraría "15110" en vez de "Política y gestión administrativa del sector
 * público" o "ET" en vez de "Etiopía".
 *
 * ── API REAL (keyless) ─────────────────────────────────────────────────────
 *   Base: https://iatistandard.org/codelists/downloads/clv3/json/{LANG}/<X>.json
 *   Sin auth. Devuelve `{ data: [ { code, name, category?, description? } ] }`.
 *   Listas usadas aquí: Sector (DAC 5 dígitos), Country (ISO-2).
 *   También existen OrganisationType y TransactionType (no se descargan aquí
 *   porque sus etiquetas se resuelven con mapas estáticos pequeños y estables).
 *
 * ── Diseño defensivo (patrón lib/energia/agsi.ts) ──────────────────────────
 *   - Degradación: si una lista falla, se sirve la otra; si ambas fallan →
 *     `{ ok:false }`. NUNCA lanza ni inventa.
 *   - Caché en memoria TTL 24h: los codelists cambian rarísimamente.
 *   - `parseCodelist()` y `buildCodelists()` son PURAS (sin red) y exportadas
 *     para testearlas con fixtures.
 *
 * Todo keyless → este módulo SIEMPRE puede funcionar (es la base de la
 * degradación honesta del resto de la capa IATI).
 */
import type {
  CodelistEntry,
  CodelistsData,
  IatiCodelistsResponse,
} from './iati-types'

// IATI sirve los codelists por idioma; "en" es el estable y completo.
// La URL "bonita" (iatistandard.org/codelists/...) hace 302 al CDN de producción;
// apuntamos directo al CDN para ahorrar el salto de redirección (verificado
// 2026-06-07). Shape confirmado: { data: [ {code, name, category?, description?} ] }.
const BASE =
  'https://cdn.iatistandard.org/prod-iati-website/reference_downloads/203/codelists/downloads/clv3/json/en'
const PUBLIC_URL = 'https://iatistandard.org/en/iati-standard/203/codelists/'
const DEFAULT_TIMEOUT_MS = 15_000
const CACHE_TTL_MS = 24 * 3600_000 // 24h · los codelists casi nunca cambian

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL 24h
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry {
  expires: number
  value: IatiCodelistsResponse
}
let _cache: CacheEntry | null = null

/** Limpia la caché. Solo para tests. */
export function _clearCodelistsCache(): void {
  _cache = null
}

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixtures) — sin red
// ─────────────────────────────────────────────────────────────────────────

/** Fila cruda de un codelist IATI (subset). */
interface RawCodelistRow {
  code?: unknown
  name?: unknown
  category?: unknown
  description?: unknown
}

/**
 * Normaliza la estructura cruda de un codelist (`{data:[...]}` o array directo)
 * a un mapa `code → CodelistEntry`. Tolera `data` ausente, filas sin code/name
 * y valores no-string. Pura: testeable con fixtures.
 */
export function parseCodelist(raw: unknown): Record<string, CodelistEntry> {
  const out: Record<string, CodelistEntry> = {}
  // La API envuelve en {data:[...]}, pero aceptamos también el array pelado.
  const rows: unknown = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown })?.data)
      ? (raw as { data: unknown[] }).data
      : []
  if (!Array.isArray(rows)) return out
  for (const r of rows as RawCodelistRow[]) {
    const code = r?.code == null ? '' : String(r.code).trim()
    if (!code) continue
    const name = r?.name == null ? '' : String(r.name).trim()
    const entry: CodelistEntry = { code, name: name || code }
    if (r?.category != null) {
      const cat = String(r.category).trim()
      if (cat) entry.category = cat
    }
    if (r?.description != null) {
      const d = String(r.description).trim()
      if (d) entry.description = d
    }
    out[code] = entry
  }
  return out
}

/**
 * Ensambla `CodelistsData` a partir de los crudos de Sector y Country. Pura:
 * testeable con fixtures sin red.
 */
export function buildCodelists(
  rawSector: unknown,
  rawCountry: unknown,
): CodelistsData {
  const sectors = parseCodelist(rawSector)
  const countries = parseCodelist(rawCountry)
  return {
    sectors,
    countries,
    counts: {
      sectors: Object.keys(sectors).length,
      countries: Object.keys(countries).length,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch crudo + degradación + caché
// ─────────────────────────────────────────────────────────────────────────

export interface FetchCodelistsOpts {
  /** Forzar refetch ignorando la caché. */
  noCache?: boolean
  /** Timeout por descarga en ms (default 15s). */
  timeoutMs?: number
}

/** Descarga una lista individual; devuelve null ante cualquier fallo. */
async function fetchOne(name: string, timeoutMs: number): Promise<unknown> {
  const url = `${BASE}/${name}.json`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      // Caché HTTP de Next además de la de proceso (24h).
      next: { revalidate: 86400 },
    } as RequestInit)
    clearTimeout(t)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

/**
 * Descarga y cachea los codelists Sector (DAC) y Country (ISO-2). Caché 24h en
 * memoria. Nunca lanza: si ambas listas fallan devuelve `{ ok:false }`; si solo
 * una falla, sirve la otra (degradación silenciosa, ambas son keyless).
 */
export async function fetchCodelists(
  opts: FetchCodelistsOpts = {},
): Promise<IatiCodelistsResponse> {
  const fetched_at = new Date().toISOString()

  if (!opts.noCache && _cache && Date.now() <= _cache.expires) {
    return _cache.value
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const [rawSector, rawCountry] = await Promise.all([
    fetchOne('Sector', timeoutMs),
    fetchOne('Country', timeoutMs),
  ])

  if (rawSector == null && rawCountry == null) {
    // No cacheamos el fallo total (puede ser un blip de red).
    return {
      ok: false,
      data: null,
      error: 'codelists_unreachable · no se pudo descargar Sector ni Country',
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }

  const data = buildCodelists(rawSector, rawCountry)
  const result: IatiCodelistsResponse = {
    ok: true,
    data,
    fetched_at,
    source_url: PUBLIC_URL,
  }
  _cache = { expires: Date.now() + CACHE_TTL_MS, value: result }
  return result
}

/**
 * Helper de conveniencia para resolver un código de sector a nombre. Devuelve el
 * propio código si no se encuentra (nunca undefined). Pura.
 */
export function resolveSectorName(
  codelists: CodelistsData | null,
  code: string,
): string {
  if (!code) return ''
  return codelists?.sectors[code]?.name ?? code
}

/**
 * Helper de conveniencia para resolver un país ISO-2 a nombre. Acepta mayúsculas
 * o minúsculas. Devuelve el código en mayúsculas si no se encuentra. Pura.
 */
export function resolveCountryName(
  codelists: CodelistsData | null,
  iso2: string,
): string {
  if (!iso2) return ''
  const up = iso2.toUpperCase()
  return codelists?.countries[up]?.name ?? up
}
