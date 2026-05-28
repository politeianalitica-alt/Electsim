/**
 * Cliente PortWatch · IMF Port Monitor
 *
 * API pública sin key del Fondo Monetario Internacional que monitoriza
 * actividad portuaria mundial vía AIS satelital:
 *   https://portwatch.imf.org
 *
 * Datasets clave:
 *   - Port Activity: tráfico semanal por puerto (escalas)
 *   - Chokepoints Daily: tráfico en estrechos críticos (Ormuz, Suez, etc.)
 *   - Spillover Simulation: impacto de cierres portuarios en terceros países
 *
 * Backend: ArcGIS REST. Cada dataset es una feature service pública.
 * Empty state honesto si API falla · cache agresivo (12h).
 */

const PORTWATCH_BASE = 'https://services3.arcgis.com/wWNMhf7TLAJjQp51/arcgis/rest/services'
const DEFAULT_TIMEOUT_MS = 12_000

export interface PortActivity {
  port_name: string
  country_iso3: string
  port_id: string
  lat: number
  lon: number
  port_type: string                       // container, dry_bulk, tanker, mixed
  vessel_count_current: number
  vessel_count_avg_12m: number
  deviation_pct: number                   // negativo = caída actividad
  last_updated: string
}

export interface ChokepointStatus {
  chokepoint_name: string
  daily_count_current: number
  avg_90d: number
  deviation_pct: number
  disruption: boolean
  last_updated: string
}

export interface PortWatchResponse<T> {
  ok: boolean
  data: T
  error?: string
  fetched_at: string
}

async function fetchJson(url: string, opts: { timeoutMs?: number } = {}): Promise<any | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      next: { revalidate: 12 * 3600 },
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
 * Top puertos de un país (ISO3). Devuelve hasta 10 ordenados por tráfico
 * actual descendente con su desviación vs media 12m.
 */
export async function fetchPortActivityByCountry(iso3: string): Promise<PortWatchResponse<PortActivity[]>> {
  const startedAt = new Date().toISOString()
  const url = `${PORTWATCH_BASE}/PortMonitor_GTV/FeatureServer/0/query?where=ISO3_HOST='${iso3.toUpperCase()}'&outFields=*&f=json&resultRecordCount=10`
  const json = await fetchJson(url)
  if (!json?.features) {
    return { ok: false, data: [], error: 'portwatch_no_features', fetched_at: startedAt }
  }
  const ports: PortActivity[] = json.features.map((f: any): PortActivity => {
    const a = f.attributes || {}
    const current = Number(a.portcalls || a.vessel_count_current || 0)
    const avg = Number(a.portcalls_avg || a.historical_avg || 0)
    return {
      port_name: a.portname || a.PORT_NAME || 'sin nombre',
      country_iso3: a.iso3_host || iso3,
      port_id: String(a.objectid || a.portid || ''),
      lat: f.geometry?.y || 0,
      lon: f.geometry?.x || 0,
      port_type: a.port_type || 'mixed',
      vessel_count_current: current,
      vessel_count_avg_12m: avg,
      deviation_pct: avg > 0 ? Math.round(((current - avg) / avg) * 1000) / 10 : 0,
      last_updated: a.last_updated || startedAt,
    }
  })
  return { ok: true, data: ports.sort((a, b) => b.vessel_count_current - a.vessel_count_current), fetched_at: startedAt }
}

/**
 * Estado de los 11 chokepoints críticos del comercio marítimo mundial.
 */
export async function fetchChokepoints(): Promise<PortWatchResponse<ChokepointStatus[]>> {
  const startedAt = new Date().toISOString()
  const url = `${PORTWATCH_BASE}/Chokepoints_Daily/FeatureServer/0/query?where=1=1&outFields=*&f=json&resultRecordCount=20`
  const json = await fetchJson(url)
  if (!json?.features) {
    return { ok: false, data: [], error: 'portwatch_chokepoints_unavailable', fetched_at: startedAt }
  }
  const points: ChokepointStatus[] = json.features.map((f: any): ChokepointStatus => {
    const a = f.attributes || {}
    const current = Number(a.daily_count || 0)
    const avg = Number(a.avg_90d || 0)
    return {
      chokepoint_name: a.chokepoint_name || a.NAME || 'sin nombre',
      daily_count_current: current,
      avg_90d: avg,
      deviation_pct: avg > 0 ? Math.round(((current - avg) / avg) * 1000) / 10 : 0,
      disruption: a.disruption_flag === 1 || a.disruption === true,
      last_updated: a.last_updated || startedAt,
    }
  })
  return { ok: true, data: points, fetched_at: startedAt }
}

/**
 * Score anomalía portuaria de un país para el IRPC (0-100, mayor=peor).
 * 100 = colapso (caída >30% en top 5 puertos).
 */
export async function getPortAnomalyScore(iso3: string): Promise<number | null> {
  const r = await fetchPortActivityByCountry(iso3)
  if (!r.ok || r.data.length === 0) return null
  const top = r.data.slice(0, 5)
  const avgDeviation = top.reduce((s, p) => s + p.deviation_pct, 0) / top.length
  if (avgDeviation >= 0) return 0
  if (avgDeviation > -10) return 25
  if (avgDeviation > -20) return 50
  if (avgDeviation > -30) return 75
  return 100
}
