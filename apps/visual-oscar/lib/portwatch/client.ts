/**
 * Cliente PortWatch · IMF Port Monitor
 *
 * API pública sin key del Fondo Monetario Internacional que monitoriza
 * actividad portuaria mundial vía AIS satelital:
 *   https://portwatch.imf.org
 *
 * Backend REAL (verificado con curl, jun 2026): ArcGIS FeatureServer en
 * services9.arcgis.com/weJ1QsnbMYJlCHdG (org "IMF DataViz"). El servidor
 * antiguo services3.arcgis.com/wWNMhf7TLAJjQp51 (PortMonitor_GTV,
 * Chokepoints_Daily) NO existe — devuelve "Invalid URL" para cualquier ruta.
 *
 * Datasets usados:
 *   - PortWatch_ports_database: BD estática de ~2.065 puertos
 *     (portid, portname, ISO3, lat, lon, vessel_count_* anuales).
 *   - Daily_Ports_Data: escalas DIARIAS por puerto (date, portid, portcalls,
 *     import, export). Sin lat/lon → se cruza con la BD estática por portid.
 *   - Daily_Chokepoints_Data: tráfico diario en chokepoints (portid
 *     'chokepointN', n_total).
 *   - PortWatch_chokepoints_database: BD estática de chokepoints.
 *
 * La actividad "actual vs media histórica" se calcula con queries agregadas
 * de ArcGIS (outStatistics avg(portcalls) agrupada por portid) en dos
 * ventanas: 14 días (actual) y 365 días (media), expresada en escalas/semana.
 * maxRecordCount = 1000 → paginación con resultOffset (soportada también en
 * queries agregadas; verificado).
 *
 * Empty state honesto si la API falla · cache agresivo (12h vía
 * next.revalidate; el cutoff de fecha en la URL rota la clave una vez al día).
 */

const PORTWATCH_BASE = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services'
const FS_PORTS_DB = `${PORTWATCH_BASE}/PortWatch_ports_database/FeatureServer/0/query`
const FS_DAILY_PORTS = `${PORTWATCH_BASE}/Daily_Ports_Data/FeatureServer/0/query`
const FS_CHOKEPOINTS_DB = `${PORTWATCH_BASE}/PortWatch_chokepoints_database/FeatureServer/0/query`
const FS_DAILY_CHOKEPOINTS = `${PORTWATCH_BASE}/Daily_Chokepoints_Data/FeatureServer/0/query`

const DEFAULT_TIMEOUT_MS = 20_000 // la agregada de 365d tarda ~7s en frío
const PAGE_SIZE = 1000            // maxRecordCount del FeatureServer
const MAX_PAGES = 5               // tope de seguridad (~2.065 puertos hoy)
const CURRENT_WINDOW_DAYS = 14    // los datos llegan con ~6 días de retraso
const HISTORY_WINDOW_DAYS = 365

export interface PortActivity {
  port_name: string
  country_iso3: string
  port_id: string
  lat: number
  lon: number
  port_type: string                       // container, dry_bulk, tanker, general_cargo, roro, mixed
  vessel_count_current: number            // escalas/semana ventana actual (14d)
  vessel_count_avg_12m: number            // escalas/semana media 12 meses
  deviation_pct: number                   // negativo = caída actividad
  last_updated: string
}

export interface ChokepointStatus {
  chokepoint_name: string
  daily_count_current: number             // tránsitos/día media 7d
  avg_90d: number                         // tránsitos/día media 90d
  deviation_pct: number
  disruption: boolean                     // caída ≥20% vs media 90d
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

/** Fecha 'YYYY-MM-DD' de hace N días (UTC). */
function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
}

/** Solo letras A-Z para interpolar ISO3 en el where sin inyección. */
function sanitizeIso3(iso3: string): string {
  return iso3.toUpperCase().replace(/[^A-Z]/g, '')
}

interface ActivityStat {
  avgDaily: number      // media diaria de la métrica en la ventana
  lastDate: string      // último día con dato ('YYYY-MM-DD')
}

/**
 * Query agregada ArcGIS: media diaria de `field` por portid en los últimos
 * `sinceDays` días. Paginada (el server limita a 1000 grupos por página).
 * Devuelve Map vacío si el upstream falla (degradación, no excepción).
 */
async function fetchDailyAvgByPort(
  queryUrl: string,
  field: string,
  sinceDays: number,
  extraWhere?: string,
): Promise<Map<string, ActivityStat>> {
  const since = isoDaysAgo(sinceDays)
  const where = `date >= timestamp '${since} 00:00:00'` + (extraWhere ? ` AND ${extraWhere}` : '')
  const stats = JSON.stringify([
    { statisticType: 'avg', onStatisticField: field, outStatisticFieldName: 'avg_daily' },
    { statisticType: 'max', onStatisticField: 'date', outStatisticFieldName: 'last_date' },
  ])
  const out = new Map<string, ActivityStat>()
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      where,
      outStatistics: stats,
      groupByFieldsForStatistics: 'portid',
      orderByFields: 'portid ASC',
      resultOffset: String(page * PAGE_SIZE),
      resultRecordCount: String(PAGE_SIZE),
      f: 'json',
    })
    const json = await fetchJson(`${queryUrl}?${params}`)
    const feats = json?.features
    if (!Array.isArray(feats)) break
    for (const f of feats) {
      const a = f?.attributes || {}
      if (!a.portid) continue
      out.set(String(a.portid), {
        avgDaily: Number(a.avg_daily) || 0,
        // ArcGIS devuelve los máximos de fecha agregados como 'YYYY-MM-DD'
        lastDate: typeof a.last_date === 'string' ? a.last_date : '',
      })
    }
    if (feats.length < PAGE_SIZE) break
  }
  return out
}

interface PortMeta {
  portid: string
  portname: string
  iso3: string
  lat: number
  lon: number
  port_type: string
}

/** Tipo dominante del puerto según el mix anual de buques de la BD estática. */
function dominantType(a: any): string {
  const cats: Array<[string, number]> = [
    ['container', Number(a.vessel_count_container) || 0],
    ['dry_bulk', Number(a.vessel_count_dry_bulk) || 0],
    ['tanker', Number(a.vessel_count_tanker) || 0],
    ['general_cargo', Number(a.vessel_count_general_cargo) || 0],
    ['roro', Number(a.vessel_count_RoRo) || 0],
  ]
  const total = cats.reduce((s, [, v]) => s + v, 0)
  if (total <= 0) return 'mixed'
  const top = cats.reduce((m, c) => (c[1] > m[1] ? c : m))
  return top[1] / total >= 0.5 ? top[0] : 'mixed'
}

/**
 * Metadatos (nombre, ISO3, lat/lon) de la BD estática de puertos/chokepoints.
 * Paginado; devuelve [] si el upstream falla.
 */
async function fetchPortsMeta(queryUrl: string, where: string): Promise<PortMeta[]> {
  const out: PortMeta[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      where,
      outFields: 'portid,portname,ISO3,lat,lon,vessel_count_container,vessel_count_dry_bulk,vessel_count_tanker,vessel_count_general_cargo,vessel_count_RoRo',
      returnGeometry: 'false',
      orderByFields: 'portid ASC',
      resultOffset: String(page * PAGE_SIZE),
      resultRecordCount: String(PAGE_SIZE),
      f: 'json',
    })
    const json = await fetchJson(`${queryUrl}?${params}`)
    const feats = json?.features
    if (!Array.isArray(feats)) break
    for (const f of feats) {
      const a = f?.attributes || {}
      if (!a.portid) continue
      out.push({
        portid: String(a.portid),
        portname: a.portname || 'sin nombre',
        iso3: a.ISO3 || '',
        lat: Number(a.lat) || 0,
        lon: Number(a.lon) || 0,
        port_type: dominantType(a),
      })
    }
    if (feats.length < PAGE_SIZE) break
  }
  return out
}

/** Cruza metadatos con las dos ventanas de actividad → PortActivity[]. */
function buildPortActivity(
  meta: PortMeta[],
  recent: Map<string, ActivityStat>,
  hist: Map<string, ActivityStat>,
  fallbackDate: string,
): PortActivity[] {
  const ports: PortActivity[] = []
  for (const m of meta) {
    const rec = recent.get(m.portid)
    const his = hist.get(m.portid)
    if (!rec && !his) continue
    // Escalas/semana = media diaria × 7 (los datos diarios son ruidosos)
    const current = Math.round((rec?.avgDaily ?? 0) * 7 * 10) / 10
    const avg = Math.round((his?.avgDaily ?? 0) * 7 * 10) / 10
    if (current <= 0 && avg <= 0) continue // puerto sin actividad real
    ports.push({
      port_name: m.portname,
      country_iso3: m.iso3,
      port_id: m.portid,
      lat: m.lat,
      lon: m.lon,
      port_type: m.port_type,
      vessel_count_current: current,
      vessel_count_avg_12m: avg,
      deviation_pct: avg > 0 ? Math.round(((current - avg) / avg) * 1000) / 10 : 0,
      last_updated: rec?.lastDate || his?.lastDate || fallbackDate,
    })
  }
  return ports.sort((a, b) => b.vessel_count_current - a.vessel_count_current)
}

/**
 * TODOS los puertos del mundo con actividad (escalas/semana actual vs media
 * 12m) en una sola recogida (~6-9 requests paginadas, cacheadas 12h).
 * Pensada para mapas globales: evita 1 query por país.
 */
export async function fetchPortActivityWorld(): Promise<PortWatchResponse<PortActivity[]>> {
  const startedAt = new Date().toISOString()
  const [meta, recent, hist] = await Promise.all([
    fetchPortsMeta(FS_PORTS_DB, '1=1'),
    fetchDailyAvgByPort(FS_DAILY_PORTS, 'portcalls', CURRENT_WINDOW_DAYS),
    fetchDailyAvgByPort(FS_DAILY_PORTS, 'portcalls', HISTORY_WINDOW_DAYS),
  ])
  if (meta.length === 0 || (recent.size === 0 && hist.size === 0)) {
    return { ok: false, data: [], error: 'portwatch_no_features', fetched_at: startedAt }
  }
  return { ok: true, data: buildPortActivity(meta, recent, hist, startedAt), fetched_at: startedAt }
}

/**
 * Top puertos de un país (ISO3). Devuelve hasta 10 ordenados por tráfico
 * actual descendente con su desviación vs media 12m.
 */
export async function fetchPortActivityByCountry(iso3: string): Promise<PortWatchResponse<PortActivity[]>> {
  const startedAt = new Date().toISOString()
  const safe = sanitizeIso3(iso3)
  if (!safe) {
    return { ok: false, data: [], error: 'portwatch_invalid_iso3', fetched_at: startedAt }
  }
  const whereIso = `ISO3='${safe}'`
  const [meta, recent, hist] = await Promise.all([
    fetchPortsMeta(FS_PORTS_DB, whereIso),
    fetchDailyAvgByPort(FS_DAILY_PORTS, 'portcalls', CURRENT_WINDOW_DAYS, whereIso),
    fetchDailyAvgByPort(FS_DAILY_PORTS, 'portcalls', HISTORY_WINDOW_DAYS, whereIso),
  ])
  if (meta.length === 0 || (recent.size === 0 && hist.size === 0)) {
    return { ok: false, data: [], error: 'portwatch_no_features', fetched_at: startedAt }
  }
  return {
    ok: true,
    data: buildPortActivity(meta, recent, hist, startedAt).slice(0, 10),
    fetched_at: startedAt,
  }
}

/**
 * Estado de los chokepoints críticos del comercio marítimo mundial
 * (tránsitos/día media 7d vs media 90d, desde Daily_Chokepoints_Data).
 */
export async function fetchChokepoints(): Promise<PortWatchResponse<ChokepointStatus[]>> {
  const startedAt = new Date().toISOString()
  // Daily_Chokepoints_Data también contiene series de puertos normales →
  // filtramos a portid 'chokepointN'.
  const onlyChoke = "portid LIKE 'chokepoint%'"
  const [meta, recent, hist] = await Promise.all([
    fetchPortsMeta(FS_CHOKEPOINTS_DB, '1=1'),
    fetchDailyAvgByPort(FS_DAILY_CHOKEPOINTS, 'n_total', 7, onlyChoke),
    fetchDailyAvgByPort(FS_DAILY_CHOKEPOINTS, 'n_total', 90, onlyChoke),
  ])
  if (meta.length === 0 || (recent.size === 0 && hist.size === 0)) {
    return { ok: false, data: [], error: 'portwatch_chokepoints_unavailable', fetched_at: startedAt }
  }
  const points: ChokepointStatus[] = []
  for (const m of meta) {
    const rec = recent.get(m.portid)
    const his = hist.get(m.portid)
    if (!rec && !his) continue
    const current = Math.round((rec?.avgDaily ?? 0) * 10) / 10
    const avg = Math.round((his?.avgDaily ?? 0) * 10) / 10
    const dev = avg > 0 ? Math.round(((current - avg) / avg) * 1000) / 10 : 0
    points.push({
      chokepoint_name: m.portname,
      daily_count_current: current,
      avg_90d: avg,
      deviation_pct: dev,
      disruption: dev <= -20,
      last_updated: rec?.lastDate || his?.lastDate || startedAt,
    })
  }
  return { ok: true, data: points.sort((a, b) => b.daily_count_current - a.daily_count_current), fetched_at: startedAt }
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
