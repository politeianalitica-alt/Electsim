/**
 * Cliente IATI Registry (CKAN) · KEYLESS · TS2-iati.
 *
 * El Registry de IATI es el directorio de "publishers" (organizaciones que
 * reportan datos). Lo usamos para construir el DIRECTORIO DINÁMICO de ONGD
 * españolas reportantes, con su identificador IATI y su nº de datasets — sin
 * hardcodear el listado (solo curamos las refs/slugs de las grandes para
 * marcarlas y resolver su query en el Datastore).
 *
 * ── API REAL (keyless, CKAN action API) ────────────────────────────────────
 *   Base: https://iatiregistry.org/api/action/
 *   - organization_list?all_fields=true → { success, result: [ {org...} ] }
 *   - organization_show?id=<slug>       → { success, result: {org...} }
 *   Shape de cada org (verificado 2026-06-07): name (slug), title (display),
 *   package_count (nº datasets), publisher_iati_id (ref IATI), state ('active'),
 *   publisher_organization_type (código OrganisationType), publisher_country
 *   (ISO-2). Sin auth.
 *
 * ── Diseño defensivo (patrón lib/energia/agsi.ts) ──────────────────────────
 *   - Degradación: si la red falla → `{ ok:false }`. NUNCA lanza ni inventa.
 *     (Pero al ser keyless, esta es la pieza que SIEMPRE debería funcionar.)
 *   - Caché en memoria TTL 12h: el padrón de publishers cambia muy poco.
 *   - `parseOrgRow()` y `buildOrgsDirectory()` son PURAS (sin red) y exportadas
 *     para testearlas con fixtures de la respuesta real.
 *
 * Filtro España: una org cuenta como española si (a) su `publisher_country` es
 * "ES", o (b) su `publisher_iati_id` empieza por "ES-", o (c) su slug/ref casa
 * con el catálogo curado (`CURATED_BY_SLUG`/`CURATED_REFS`). El catálogo curado
 * solo aporta marca + nombre canónico; los datos (datasets, tipo) vienen vivos.
 */
import type { IatiOrg, IatiOrgsData, IatiOrgsResponse } from './iati-types'
import {
  CURATED_BY_SLUG,
  CURATED_REFS,
  CURATED_SPANISH_ORGS,
} from './iati-orgs-catalog'

const BASE = 'https://iatiregistry.org/api/action'
const PUBLIC_URL = 'https://iatiregistry.org/'
const DEFAULT_TIMEOUT_MS = 20_000
const CACHE_TTL_MS = 12 * 3600_000 // 12h · el padrón de publishers cambia poco

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL 12h
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry {
  expires: number
  value: IatiOrgsResponse
}
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearOrgsCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixtures) — sin red
// ─────────────────────────────────────────────────────────────────────────

/** Fila cruda de org del Registry CKAN (subset usado). */
interface RawOrgRow {
  name?: unknown
  title?: unknown
  publisher_iati_id?: unknown
  publisher_organization_type?: unknown
  publisher_country?: unknown
  package_count?: unknown
  state?: unknown
}

/** Convierte package_count (puede venir string/number/null) a entero ≥0. */
function toCount(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0
  const n = Number(String(v ?? '').trim())
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0
}

/**
 * Determina si una org (ya parseada) es española según país/ref/curado.
 * Pura. Exportada para test directo.
 */
export function isSpanishOrg(org: {
  iati_ref: string | null
  country: string | null
  slug: string
}): boolean {
  if (org.country && org.country.toUpperCase() === 'ES') return true
  if (org.iati_ref && /^ES-/i.test(org.iati_ref)) return true
  if (org.iati_ref && CURATED_REFS.has(org.iati_ref)) return true
  if (org.slug && CURATED_BY_SLUG[org.slug.toLowerCase()]) return true
  return false
}

/**
 * Normaliza una fila cruda del Registry a `IatiOrg`. Devuelve null si la fila no
 * tiene slug (no es usable). Marca `curated_spanish` cruzando slug y ref con el
 * catálogo curado. Pura: testeable con fixtures.
 */
export function parseOrgRow(raw: unknown): IatiOrg | null {
  const r = (raw ?? {}) as RawOrgRow
  const slug = r?.name == null ? '' : String(r.name).trim()
  if (!slug) return null
  // Solo publishers activos (CKAN marca 'deleted' los retirados).
  if (r?.state != null && String(r.state).trim().toLowerCase() === 'deleted') {
    return null
  }
  const iati_ref =
    r?.publisher_iati_id == null || String(r.publisher_iati_id).trim() === ''
      ? null
      : String(r.publisher_iati_id).trim()
  const country =
    r?.publisher_country == null || String(r.publisher_country).trim() === ''
      ? null
      : String(r.publisher_country).trim().toUpperCase()
  const org_type =
    r?.publisher_organization_type == null ||
    String(r.publisher_organization_type).trim() === ''
      ? null
      : String(r.publisher_organization_type).trim()

  const curatedBySlug = CURATED_BY_SLUG[slug.toLowerCase()]
  const curatedByRef = iati_ref ? CURATED_REFS.has(iati_ref) : false
  const curated_spanish = Boolean(curatedBySlug) || curatedByRef

  // Nombre: preferimos el curado canónico si lo hay, si no el title del Registry.
  const title = r?.title == null ? '' : String(r.title).trim()
  const name = curatedBySlug?.name ?? title ?? slug

  return {
    slug,
    name: name || slug,
    iati_ref,
    org_type,
    country,
    dataset_count: toCount(r?.package_count),
    curated_spanish,
  }
}

/**
 * Ensambla el directorio de ONGD españolas a partir de las filas crudas del
 * Registry. Filtra a España, ordena (curadas primero, luego por nº de datasets
 * desc), y cuenta cuántas curadas se resolvieron. Pura: testeable con fixtures.
 */
export function buildOrgsDirectory(rawRows: unknown): IatiOrgsData {
  const rows: unknown[] = Array.isArray(rawRows) ? rawRows : []
  const spanish: IatiOrg[] = []
  for (const raw of rows) {
    const org = parseOrgRow(raw)
    if (!org) continue
    if (!isSpanishOrg(org)) continue
    spanish.push(org)
  }

  // Dedup por slug (el Registry no repite, pero somos defensivos).
  const seen = new Set<string>()
  const deduped = spanish.filter((o) => {
    if (seen.has(o.slug)) return false
    seen.add(o.slug)
    return true
  })

  // Orden: curadas primero, luego por nº de datasets desc, luego nombre.
  deduped.sort((a, b) => {
    if (a.curated_spanish !== b.curated_spanish) return a.curated_spanish ? -1 : 1
    if (b.dataset_count !== a.dataset_count) return b.dataset_count - a.dataset_count
    return a.name.localeCompare(b.name, 'es')
  })

  // Cuántas refs curadas quedaron representadas en el resultado.
  const refsPresent = new Set(
    deduped.map((o) => o.iati_ref).filter((x): x is string => Boolean(x)),
  )
  const slugsPresent = new Set(deduped.map((o) => o.slug.toLowerCase()))
  const matched_curated = CURATED_SPANISH_ORGS.filter(
    (c) =>
      refsPresent.has(c.iati_ref) ||
      c.registry_slugs.some((s) => slugsPresent.has(s.toLowerCase())),
  ).length

  return {
    orgs: deduped,
    total: deduped.length,
    matched_curated,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch crudo + degradación + caché
// ─────────────────────────────────────────────────────────────────────────

export interface FetchOrgsOpts {
  /** Forzar refetch ignorando la caché. */
  noCache?: boolean
  /** Timeout en ms (default 20s · el listado completo es grande). */
  timeoutMs?: number
}

/**
 * Descarga el directorio de ONGD españolas reportantes en IATI (keyless).
 * Caché 12h en memoria. Nunca lanza: ante fallo de red devuelve
 * `{ ok:false, data:null }`.
 */
export async function fetchIatiOrgs(
  opts: FetchOrgsOpts = {},
): Promise<IatiOrgsResponse> {
  const fetched_at = new Date().toISOString()
  const cacheKey = 'orgs:es'

  if (!opts.noCache) {
    const hit = _cache.get(cacheKey)
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  const url = `${BASE}/organization_list?all_fields=true`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      // Caché HTTP de Next además de la de proceso (12h).
      next: { revalidate: 43200 },
    } as RequestInit)
    clearTimeout(t)

    if (r.status === 429) {
      return {
        ok: false,
        data: null,
        error: 'rate_limited · IATI Registry CKAN',
        fetched_at,
        source_url: PUBLIC_URL,
      }
    }
    if (!r.ok) {
      return {
        ok: false,
        data: null,
        error: `http_${r.status}`,
        fetched_at,
        source_url: PUBLIC_URL,
      }
    }

    const json: unknown = await r.json()
    // CKAN: { success:true, result:[...] }
    const result = (json as { result?: unknown })?.result
    if (!Array.isArray(result)) {
      return {
        ok: false,
        data: null,
        error: 'ckan_unexpected_shape · falta result[]',
        fetched_at,
        source_url: PUBLIC_URL,
      }
    }

    const data = buildOrgsDirectory(result)
    const out: IatiOrgsResponse = {
      ok: true,
      data,
      fetched_at,
      source_url: PUBLIC_URL,
    }
    _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: out })
    return out
  } catch (e: unknown) {
    const msg =
      (e as Error)?.name === 'AbortError'
        ? 'timeout'
        : String((e as Error)?.message ?? e).slice(0, 160)
    return { ok: false, data: null, error: msg, fetched_at, source_url: PUBLIC_URL }
  }
}
