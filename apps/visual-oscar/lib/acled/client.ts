/**
 * Cliente ACLED · Armed Conflict Location & Event Data Project.
 *
 * Sprint G24 · usuario pidió integrar ACLED via api.acleddata.com/acled/read
 * (en lugar de wrappers PyPI / R cran).
 *
 * Auth: requires ACLED_API_KEY + ACLED_EMAIL en env vars (registro gratuito
 * en acleddata.com/api). Si faltan, devuelve null gracefully.
 *
 * Endpoints clave:
 *   GET /acled/read?country={Spain}&year={2024}&limit=200 · eventos detallados
 *   GET /actor/read?actor_name=PKK · actores específicos
 *   GET /actortype/read?actor_type_id=1 · tipos actores
 */

const ACLED_BASE = 'https://api.acleddata.com'
const DEFAULT_TIMEOUT_MS = 12_000

export interface AcledEvent {
  data_id: string
  event_id_cnty: string
  event_date: string                // YYYY-MM-DD
  year: number
  /** Battles, Protests, Riots, Violence against civilians, Strategic developments, Explosions/Remote violence */
  event_type: string
  sub_event_type: string
  actor1: string
  inter1: number                    // ACLED actor type
  actor2: string | null
  inter2: number | null
  /** Coordenadas */
  latitude: number
  longitude: number
  country: string
  admin1: string                    // provincia/estado
  admin2: string
  location: string                  // ciudad/pueblo
  fatalities: number
  notes: string
  source: string
  source_scale: string              // 'Local partner', 'International', etc.
  geo_precision: 1 | 2 | 3
}

interface AcledResponse {
  status: number
  success: boolean
  last_update: number
  count: number
  filename: string
  data: AcledEvent[]
}

function getCredentials(): { apiKey: string; email: string } | null {
  const apiKey = process.env.ACLED_API_KEY
  const email = process.env.ACLED_EMAIL
  if (!apiKey || !email) return null
  return { apiKey, email }
}

export async function fetchAcledEvents(opts: {
  country?: string
  yearMin?: number
  yearMax?: number
  eventType?: string                // 'Battles' | 'Protests' | ...
  limit?: number
}): Promise<AcledEvent[]> {
  const creds = getCredentials()
  if (!creds) return []

  const params = new URLSearchParams({
    key: creds.apiKey,
    email: creds.email,
    limit: String(opts.limit ?? 500),
  })
  if (opts.country) params.set('country', opts.country)
  if (opts.yearMin) params.set('year', `${opts.yearMin}|${opts.yearMax ?? new Date().getFullYear()}`)
  if (opts.eventType) params.set('event_type', opts.eventType)

  const url = `${ACLED_BASE}/acled/read?${params.toString()}`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 },
    })
    clearTimeout(t)
    if (!r.ok) return []
    const json = (await r.json()) as AcledResponse
    if (!json.success) return []
    return json.data ?? []
  } catch {
    clearTimeout(t)
    return []
  }
}

/**
 * Resumen ACLED por país en ventana reciente.
 */
export async function getCountryAcledSummary(country: string): Promise<{
  ok: boolean
  events_count: number
  fatalities_total: number
  by_type: Record<string, number>
  top_admin1: Array<{ name: string; events: number; fatalities: number }>
  recent_events: AcledEvent[]
  has_credentials: boolean
  source: string
}> {
  const credsAvailable = !!getCredentials()
  if (!credsAvailable) {
    return {
      ok: false,
      events_count: 0,
      fatalities_total: 0,
      by_type: {},
      top_admin1: [],
      recent_events: [],
      has_credentials: false,
      source: 'ACLED API · requiere ACLED_API_KEY + ACLED_EMAIL en env (registro gratuito acleddata.com)',
    }
  }

  const events = await fetchAcledEvents({
    country,
    yearMin: new Date().getFullYear() - 1,
    limit: 500,
  })

  const byType: Record<string, number> = {}
  const byAdmin1: Map<string, { events: number; fatalities: number }> = new Map()
  for (const e of events) {
    byType[e.event_type] = (byType[e.event_type] || 0) + 1
    const cur = byAdmin1.get(e.admin1) || { events: 0, fatalities: 0 }
    cur.events++
    cur.fatalities += e.fatalities || 0
    byAdmin1.set(e.admin1, cur)
  }

  const topAdmin1 = Array.from(byAdmin1.entries())
    .map(([name, stats]) => ({ name, events: stats.events, fatalities: stats.fatalities }))
    .sort((a, b) => b.fatalities - a.fatalities)
    .slice(0, 8)

  return {
    ok: true,
    events_count: events.length,
    fatalities_total: events.reduce((s, e) => s + (e.fatalities || 0), 0),
    by_type: byType,
    top_admin1: topAdmin1,
    recent_events: events.slice(0, 20),
    has_credentials: true,
    source: 'ACLED Realtime · api.acleddata.com',
  }
}
