/**
 * Cliente UCDP (Uppsala Conflict Data Program) · datasets violencia organizada.
 *
 * Sprint G24 · usuario pidió integrar UCDP REST API gratuita
 * (https://ucdpapi.pcr.uu.se). Cubre violencia organizada desde 1946 con
 * series temporales largas, muy útil para análisis histórico comparado.
 *
 * Endpoints clave:
 *   GET /gedevents/24.1.1?Country={iso}&pagesize=300 · eventos geo-localizados
 *   GET /ucdpprioconflict/24.1?Year={year} · conflictos UCDP/PRIO
 *   GET /onesided/24.1?Year={year} · violencia unilateral (vs civiles)
 *   GET /nonstate/24.1?Year={year} · violencia entre actores no-estatales
 *
 * Sin API key · rate-limit ~30 req/min · datos JSON.
 */

const UCDP_BASE = 'https://ucdpapi.pcr.uu.se/api'
const DEFAULT_TIMEOUT_MS = 12_000

export interface UcdpEvent {
  id: number
  year: number
  conflict_name: string
  side_a: string                    // actor A (estado/grupo)
  side_b: string                    // actor B
  country: string
  region: string
  /** Coordenadas precisas */
  latitude: number
  longitude: number
  date_start: string                // YYYY-MM-DD
  date_end: string
  /** Fatalidades · best/low/high estimadas */
  best_est: number
  low_est: number
  high_est: number
  type_of_violence: 1 | 2 | 3       // 1=state-based, 2=non-state, 3=one-sided
  event_clarity: 1 | 2              // 1=clear single event, 2=aggregate
  source_article: string
}

export interface UcdpConflict {
  conflict_id: number
  location: string
  side_a: string                    // gobierno/coalición primaria
  side_b: string                    // oposición/grupo armado
  /** Tipo: state-based, non-state, one-sided */
  type_of_conflict: 1 | 2 | 3 | 4    // 1=extrasistemico, 2=interestatal, 3=intraestatal, 4=internacionalizado
  intensity_level: 1 | 2             // 1=menor 25-999 muertos · 2=guerra ≥1000
  cumulative_intensity: 0 | 1
  /** Episodios */
  start_date: string                 // YYYY-MM-DD
  start_date2: string | null         // re-emergencia
  ep_end_date: string | null
  year: number
  region: string
}

interface UcdpResponse<T> {
  TotalCount: number
  TotalPages: number
  PageNumber: number
  NextPageUrl: string | null
  PreviousPageUrl: string | null
  Result: T[]
}

async function fetchUcdp<T>(path: string, opts: { timeoutMs?: number } = {}): Promise<UcdpResponse<T> | null> {
  const url = `${UCDP_BASE}${path}`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'Politeia/1.0 (analyst)' },
      next: { revalidate: 86400 },
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
 * Eventos geo-localizados (GED) por país.
 * Usa el campo Country (iso3 numeric o name) y limita a top N por year.
 */
export async function fetchUcdpEvents(country: string, opts: { yearMin?: number; pageSize?: number } = {}): Promise<UcdpEvent[]> {
  const yearMin = opts.yearMin ?? 2022
  const pageSize = opts.pageSize ?? 200
  const path = `/gedevents/24.1.1?Country=${encodeURIComponent(country)}&pagesize=${pageSize}&StartDate=${yearMin}-01-01`
  const json = await fetchUcdp<UcdpEvent>(path)
  return json?.Result ?? []
}

/**
 * Conflictos UCDP/PRIO activos en un año dado.
 */
export async function fetchUcdpConflicts(year: number = new Date().getFullYear() - 1): Promise<UcdpConflict[]> {
  const path = `/ucdpprioconflict/24.1?Year=${year}&pagesize=600`
  const json = await fetchUcdp<UcdpConflict>(path)
  return json?.Result ?? []
}

/**
 * Conteo agregado de eventos+fatalidades por país en ventana 365d.
 */
export async function getCountrySecuritySummary(country: string): Promise<{
  ok: boolean
  events_count: number
  fatalities_total: number
  fatalities_high: number
  conflicts_active: number
  types_breakdown: Record<string, number>
  recent_events: UcdpEvent[]
  source: string
}> {
  const events = await fetchUcdpEvents(country, { yearMin: new Date().getFullYear() - 1, pageSize: 300 })
  const types: Record<string, number> = {}
  for (const e of events) {
    const key = e.type_of_violence === 1 ? 'state-based' : e.type_of_violence === 2 ? 'non-state' : 'one-sided'
    types[key] = (types[key] || 0) + 1
  }
  return {
    ok: true,
    events_count: events.length,
    fatalities_total: events.reduce((s, e) => s + (e.best_est || 0), 0),
    fatalities_high: events.reduce((s, e) => s + (e.high_est || 0), 0),
    conflicts_active: new Set(events.map((e) => e.conflict_name)).size,
    types_breakdown: types,
    recent_events: events.slice(0, 15),
    source: 'UCDP GED 24.1 · ucdpapi.pcr.uu.se',
  }
}
