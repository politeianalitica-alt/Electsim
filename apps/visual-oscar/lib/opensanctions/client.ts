/**
 * Cliente OpenSanctions · sanciones globales consolidadas.
 *
 * https://api.opensanctions.org/
 * 333+ fuentes consolidadas (OFAC SDN, EU FSF, UNSC, UK OFSI, otros).
 *
 * Endpoints clave:
 *   GET /search/default?q=NAME&schema=Person|Organization&topics=sanction
 *   GET /search/sanctions?countries=ru&limit=20  (por país sancionado)
 *   GET /entities/{id}                            (detalle entidad)
 *   GET /datasets                                 (delta = nuevas designaciones)
 *
 * Sin API key para queries básicas · rate-limit ~10 req/min free tier.
 * Cache: agresivo · 1h búsquedas, 24h listas país.
 */

/**
 * Sprint OS-FIX (2026-05-30): fixes para que OpenSanctions funcione sin API
 * key paid en producción.
 *  1. Removido filtro `topics=sanction` over-restrictive en fetchEntitiesByCountry
 *     (era inconsistente con searchEntities que ya lo había removido)
 *  2. Cache TTL subido de 1h → 24h (las listas de sanciones cambian semanal)
 *  3. Retry x1 con backoff de 800ms en 429/timeout
 *  4. User-Agent identificable para que OpenSanctions no nos rate-limite por defecto
 *
 * Sprint OS-BULK (2026-05-30): primary source ahora es el bulk download (CSV de
 * 65MB de data.opensanctions.org, gratis y sin auth, el mismo que distribuye el
 * repo opensanctions/opensanctions en GitHub). Cache 24h en memoria por
 * instancia Vercel. El API público queda como fallback si el bulk falla.
 *
 * No requiere OPENSANCTIONS_API_KEY.
 */
import {
  getBulkByCountry as bulkByCountry,
  searchBulkByName as bulkByName,
  getBulkStats as bulkStats,
} from './bulk-loader'

const OS_BASE = 'https://api.opensanctions.org'
const DEFAULT_TIMEOUT_MS = 10_000
const CACHE_TTL_SECONDS = 86_400 // 24h
const USER_AGENT = 'Politeia-Analitica/2.0 (+https://politeia-visual-oscar.vercel.app)'
const OS_API_KEY = process.env.OPENSANCTIONS_API_KEY || ''

export interface SanctionedEntity {
  id: string
  caption: string                         // nombre canónico
  schema: 'Person' | 'Organization' | 'Vessel' | 'Aircraft' | string
  /** Países asociados (origen, nacionalidad o registro) */
  countries: string[]
  /** Topics OpenSanctions: sanction, sanction.linked, role.pep, etc. */
  topics: string[]
  /** Datasets que designan (ofac_sdn, eu_fsf, un_sc_sanctions, etc.) */
  datasets: string[]
  /** Aliases conocidos */
  aliases: string[]
  /** Programa específico (Russia-EO13662, etc.) */
  sanctions_programs: string[]
  first_seen?: string                     // primera fecha designación
  last_seen?: string                      // última actualización
  notes?: string
}

export interface OpenSanctionsResponse<T> {
  ok: boolean
  data: T
  error?: string
  fetched_at: string
}

async function fetchOSOnce(path: string, opts: { timeoutMs?: number } = {}): Promise<any | null | { __retry: true }> {
  const url = `${OS_BASE}${path}`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    }
    if (OS_API_KEY) headers.Authorization = `ApiKey ${OS_API_KEY}`
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers,
      next: { revalidate: CACHE_TTL_SECONDS },
    })
    clearTimeout(t)
    if (r.status === 429) return { __retry: true }
    if (!r.ok) return null
    return await r.json()
  } catch {
    clearTimeout(t)
    return { __retry: true }
  }
}

async function fetchOS(path: string, opts: { timeoutMs?: number } = {}): Promise<any | null> {
  // OS-FIX · 1 retry con backoff 800ms en 429/timeout
  const first = await fetchOSOnce(path, opts)
  if (first && typeof first === 'object' && '__retry' in first) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    const second = await fetchOSOnce(path, opts)
    if (second && typeof second === 'object' && '__retry' in second) return null
    return second
  }
  return first
}

/**
 * Búsqueda fuzzy por nombre (Person + Organization + Vessel).
 * Devuelve top N coincidencias con score de similitud.
 */
export async function searchEntities(query: string, limit = 10): Promise<OpenSanctionsResponse<SanctionedEntity[]>> {
  const startedAt = new Date().toISOString()
  if (!query || query.length < 2) {
    return { ok: false, data: [], error: 'query_too_short', fetched_at: startedAt }
  }
  // OS-BULK · primero el bulk snapshot (siempre · sin rate limit · 24h cache)
  try {
    const bulk = await bulkByName(query, limit)
    if (bulk.length > 0) {
      const entities: SanctionedEntity[] = bulk.map((e) => ({
        id: e.id,
        caption: e.caption,
        schema: e.schema as SanctionedEntity['schema'],
        countries: e.countries,
        topics: e.topics,
        datasets: e.datasets,
        aliases: e.aliases,
        sanctions_programs: e.programs,
        first_seen: e.first_seen,
        last_seen: e.last_seen,
      }))
      return { ok: true, data: entities, fetched_at: startedAt }
    }
  } catch {
    // Cae al fallback API
  }

  // Fallback · API público (rate limited pero útil para entidades nuevas
  // que aún no están en el bulk daily snapshot)
  // G19 item 14 · removido filtro topics=sanction (era demasiado restrictivo
  // · OpenSanctions tags entidades como sanction.linked, ofac.sdn, etc.). Ahora
  // devolvemos todo el match · UI filtra en cliente si necesita.
  const path = `/search/default?q=${encodeURIComponent(query)}&limit=${limit}`
  const json = await fetchOS(path)
  // G22 fix · distinguir entre "API no respondió" (error real) vs "0 matches"
  // (caso válido: la entidad no está en listas de sanciones, lo cual es BUENO
  // y debería mostrarse como "Sin coincidencias en 333+ fuentes", no como error)
  if (json === null) {
    return { ok: false, data: [], error: 'api_unreachable', fetched_at: startedAt }
  }
  const results = Array.isArray(json?.results) ? json.results : []
  const entities: SanctionedEntity[] = results.map((r: any): SanctionedEntity => ({
    id: r.id || '',
    caption: r.caption || r.properties?.name?.[0] || 'sin nombre',
    schema: r.schema || 'Person',
    countries: (r.properties?.country || r.properties?.nationality || []) as string[],
    topics: r.properties?.topics || [],
    datasets: r.datasets || [],
    aliases: r.properties?.alias || [],
    sanctions_programs: r.properties?.program || [],
    first_seen: r.first_seen,
    last_seen: r.last_seen,
    notes: (r.properties?.notes || [])[0],
  }))
  // Resultado válido aunque esté vacío · ok=true, data=[]
  return { ok: true, data: entities, fetched_at: startedAt }
}

/**
 * Estadísticas de entidades sancionadas por país (top countries).
 */
export async function fetchSanctionsStats(): Promise<OpenSanctionsResponse<{ total_entities: number; datasets_count: number; recent_designations_7d: number | null }>> {
  const startedAt = new Date().toISOString()
  // OS-BULK · stats reales del snapshot bulk en lugar de placeholder
  try {
    const stats = await bulkStats()
    if (!stats.has_error && stats.total > 0) {
      return {
        ok: true,
        data: {
          total_entities: stats.total,
          datasets_count: stats.datasets_count,
          recent_designations_7d: null, // requiere comparar snapshots, no calculable single-shot
        },
        fetched_at: stats.fetched_at,
      }
    }
  } catch {
    // Fallback al placeholder
  }
  return {
    ok: true,
    data: {
      total_entities: 100_000,  // estimación · bulk típicamente 100k+
      datasets_count: 333,
      recent_designations_7d: null,
    },
    fetched_at: startedAt,
  }
}

/**
 * Cuenta entidades sancionadas asociadas a un país (ISO 3166 alpha-2 lowercase).
 * Score para mapa: número de entidades total.
 */
export async function fetchEntitiesByCountry(iso2: string, limit = 20): Promise<OpenSanctionsResponse<{ total: number; entities: SanctionedEntity[] }>> {
  const startedAt = new Date().toISOString()
  // OS-BULK · primero bulk snapshot (memoria, sin rate limit, conoce TOTAL exacto)
  try {
    const bulk = await bulkByCountry(iso2, limit)
    const allByCountry = await import('./bulk-loader').then((m) =>
      m.getBulkCountByCountry(iso2),
    )
    if (bulk.length > 0) {
      const entities: SanctionedEntity[] = bulk.map((e) => ({
        id: e.id,
        caption: e.caption,
        schema: e.schema as SanctionedEntity['schema'],
        countries: e.countries,
        topics: e.topics,
        datasets: e.datasets,
        aliases: e.aliases,
        sanctions_programs: e.programs,
        first_seen: e.first_seen,
        last_seen: e.last_seen,
      }))
      return {
        ok: true,
        data: { total: allByCountry, entities },
        fetched_at: startedAt,
      }
    }
  } catch {
    // Cae al fallback API
  }

  // Fallback API
  // OS-FIX bug · removido `topics=sanction` que era too restrictive y devolvía 0
  // en la mayoría de queries. searchEntities ya lo había arreglado (línea 76)
  // pero esta función mantenía el filtro inconsistente. Ahora alineado.
  const path = `/search/default?countries=${iso2.toLowerCase()}&limit=${limit}`
  const json = await fetchOS(path)
  if (!json) {
    return { ok: false, data: { total: 0, entities: [] }, error: 'no_response', fetched_at: startedAt }
  }
  const entities: SanctionedEntity[] = (json.results || []).map((r: any): SanctionedEntity => ({
    id: r.id || '',
    caption: r.caption || 'sin nombre',
    schema: r.schema || 'Person',
    countries: (r.properties?.country || []) as string[],
    topics: r.properties?.topics || [],
    datasets: r.datasets || [],
    aliases: r.properties?.alias || [],
    sanctions_programs: r.properties?.program || [],
    first_seen: r.first_seen,
    last_seen: r.last_seen,
  }))
  return {
    ok: true,
    data: { total: json.total?.value || entities.length, entities },
    fetched_at: startedAt,
  }
}
