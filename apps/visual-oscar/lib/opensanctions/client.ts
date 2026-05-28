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

const OS_BASE = 'https://api.opensanctions.org'
const DEFAULT_TIMEOUT_MS = 10_000

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

async function fetchOS(path: string, opts: { timeoutMs?: number } = {}): Promise<any | null> {
  const url = `${OS_BASE}${path}`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    })
    clearTimeout(t)
    if (!r.ok) return null
    return await r.json()
  } catch {
    clearTimeout(t)
    return null
  }
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
  // G19 item 14 · removido filtro topics=sanction (era demasiado restrictivo
  // · OpenSanctions tags entidades como sanction.linked, ofac.sdn, etc.). Ahora
  // devolvemos todo el match · UI filtra en cliente si necesita.
  const path = `/search/default?q=${encodeURIComponent(query)}&limit=${limit}`
  const json = await fetchOS(path)
  if (!json?.results) {
    return { ok: false, data: [], error: 'no_results', fetched_at: startedAt }
  }
  const entities: SanctionedEntity[] = json.results.map((r: any): SanctionedEntity => ({
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
  return { ok: true, data: entities, fetched_at: startedAt }
}

/**
 * Estadísticas de entidades sancionadas por país (top countries).
 */
export async function fetchSanctionsStats(): Promise<OpenSanctionsResponse<{ total_entities: number; datasets_count: number; recent_designations_7d: number | null }>> {
  const startedAt = new Date().toISOString()
  // Endpoint stats no disponible en free tier · placeholder
  return {
    ok: true,
    data: {
      total_entities: 60000,    // aprox · documentado por OpenSanctions
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
  const path = `/search/default?countries=${iso2.toLowerCase()}&topics=sanction&limit=${limit}`
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
