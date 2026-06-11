/**
 * /api/portwatch/[...path] · IMF PortWatch · actividad portuaria y
 * disrupciones del comercio marítimo mundial.
 *
 * Fuente: portwatch.imf.org · datos del Fondo Monetario Internacional
 * con conteo de buques por puerto (container, dry bulk, tanker, RoRo,
 * general cargo), top industrias, share país importación/exportación
 * marítimo, chokepoints, disrupciones.
 *
 * Backend: ArcGIS FeatureServer en services9.arcgis.com (público, sin
 * autenticación). Dataset oficial IMF DataViz.
 *
 * Rutas:
 *   GET /api/portwatch/spain-ports
 *     → Lista de puertos españoles con conteo buques + industrias top.
 *
 *   GET /api/portwatch/port?portid=port31
 *   GET /api/portwatch/port?name=Algeciras
 *     → Ficha completa de un puerto.
 *
 *   GET /api/portwatch/ports?iso3=MAR&limit=20
 *     → Puertos de un país concreto. Útil para análisis geopolítico
 *       (Marruecos, Argelia, etc.).
 *
 *   GET /api/portwatch/top-global?metric=vessel_count_total&limit=20
 *     → Top puertos mundiales por métrica (vessel_count_total/
 *       vessel_count_container/dry_bulk/tanker).
 *
 *   GET /api/portwatch/chokepoints
 *     → Puntos críticos del comercio marítimo (Suez, Hormuz, Bab al-Mandeb,
 *       Malacca, Panamá, etc.).
 *
 *   GET /api/portwatch/disruptions
 *     → Disrupciones actuales del comercio marítimo (cierres, huelgas,
 *       conflicto, sequía Canal Panamá, etc.).
 *
 *   GET /api/portwatch/health
 *     → Diagnóstico.
 *
 * Cache HTTP 6h (datos diarios).
 */
import { NextResponse } from 'next/server'

export const revalidate = 21600 // 6h

// FeatureServer URLs confirmados vía búsqueda imf-dataviz.maps.arcgis.com
const FS_PORTS = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/PortWatch_ports_database/FeatureServer/0/query'
const FS_CHOKEPOINTS = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/PortWatch_chokepoints_database/FeatureServer/0/query'
const FS_DISRUPTIONS = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/portwatch_disruptions_database/FeatureServer/0/query'
// Daily datasets (port-watch updates Tuesdays 9am ET, ~90K vessels tracked)
const FS_DAILY_CHOKE = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query'
// Comercio diario por país + agregado mundial (fila ISO3='WLD').
// OJO: los datasets antiguos Daily_Trade_Data_WLD (última fila 2025-04-25) y
// Daily_Regional_Data (Spain acaba 2024-06-16) dejaron de actualizarse;
// Daily_Trade_Data_REG es el sustituto vivo (verificado por curl, campo
// `date` es esriFieldTypeDateOnly → llega como string 'YYYY-MM-DD').
const FS_DAILY_TRADE_REG = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Trade_Data_REG/FeatureServer/0/query'

// Top chokepoints maritimos (id PortWatch + label + región)
const TOP_CHOKEPOINTS = [
  { id: 'chokepoint1', name: 'Suez Canal',         region: 'Egypt · Red Sea / Mediterranean' },
  { id: 'chokepoint2', name: 'Panama Canal',       region: 'Panama · Atlantic / Pacific' },
  { id: 'chokepoint4', name: 'Bab el-Mandeb',      region: 'Djibouti / Yemen · Red Sea' },
  { id: 'chokepoint5', name: 'Strait of Malacca',  region: 'Singapore · Asia maritime' },
  { id: 'chokepoint6', name: 'Strait of Hormuz',   region: 'Iran / Oman · Persian Gulf' },
  { id: 'chokepoint7', name: 'Strait of Gibraltar',region: 'Spain / Morocco · Atlantic-Med' },
  { id: 'chokepoint8', name: 'Bosphorus Strait',   region: 'Turkey · Black Sea-Med' },
  { id: 'chokepoint9', name: 'Cape of Good Hope',  region: 'South Africa · alternative to Suez' },
]

function quality(t: 'live' | 'cache' | 'missing', name: string, note?: string) {
  return { source_type: t, source_name: name, ...(note ? { note } : {}) }
}

// Normaliza fechas ArcGIS: esriFieldTypeDateOnly llega como 'YYYY-MM-DD'
// (string) y esriFieldTypeDate como epoch ms (number).
function toDateStr(v: unknown): string | null {
  if (typeof v === 'string') return v.slice(0, 10)
  if (typeof v === 'number') return new Date(v).toISOString().slice(0, 10)
  return null
}

interface ArcGISQuery {
  where?: string
  outFields?: string
  resultRecordCount?: number
  orderByFields?: string
  resultOffset?: number
}

async function arcgisQuery(featureServerUrl: string, q: ArcGISQuery): Promise<any> {
  const params = new URLSearchParams({
    where: q.where ?? '1=1',
    outFields: q.outFields ?? '*',
    f: 'json',
    ...(q.resultRecordCount ? { resultRecordCount: String(q.resultRecordCount) } : {}),
    ...(q.orderByFields ? { orderByFields: q.orderByFields } : {}),
    ...(q.resultOffset ? { resultOffset: String(q.resultOffset) } : {}),
    returnGeometry: 'false',
  })
  try {
    const r = await fetch(`${featureServerUrl}?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 21600 },
    } as RequestInit)
    if (!r.ok) return { error: `HTTP ${r.status}` }
    const j = await r.json()
    if (j?.error) return { error: j.error.message || JSON.stringify(j.error) }
    return j
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/portwatch/health
  if (action === 'health') {
    const probe = await arcgisQuery(FS_PORTS, {
      where: "ISO3='ESP'",
      outFields: 'portname',
      resultRecordCount: 1,
    })
    return NextResponse.json({
      ok: !probe.error,
      auth_required: false,
      backend: 'ArcGIS FeatureServer (IMF DataViz)',
      probe_status: probe.error ?? 'live',
      probe_features: probe?.features?.length ?? null,
    })
  }

  // /api/portwatch/spain-ports
  if (action === 'spain-ports') {
    const data = await arcgisQuery(FS_PORTS, {
      where: "ISO3='ESP'",
      outFields: '*',
      orderByFields: 'vessel_count_total DESC',
      resultRecordCount: 50,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF PortWatch', data.error),
      })
    }
    const ports = (data?.features || []).map((f: any) => f.attributes)
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'IMF PortWatch'),
      n_ports: ports.length,
      total_vessel_count: ports.reduce((a: number, p: any) => a + (p.vessel_count_total || 0), 0),
      ports,
    })
  }

  // /api/portwatch/port?portid=...  o ?name=...
  if (action === 'port') {
    const portid = url.searchParams.get('portid')
    const name = url.searchParams.get('name')
    const where = portid
      ? `portid='${portid.replace(/'/g, "''")}'`
      : name
        ? `LOWER(portname) LIKE '%${name.toLowerCase().replace(/'/g, "''")}%'`
        : null
    if (!where) {
      return NextResponse.json({ ok: false, error: 'portid or name required' })
    }
    const data = await arcgisQuery(FS_PORTS, { where, outFields: '*', resultRecordCount: 5 })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF PortWatch', data.error),
      })
    }
    const ports = (data?.features || []).map((f: any) => f.attributes)
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'IMF PortWatch'),
      n_matches: ports.length,
      ports,
    })
  }

  // /api/portwatch/ports?iso3=MAR
  if (action === 'ports') {
    const iso3 = (url.searchParams.get('iso3') || 'ESP').toUpperCase()
    const limit = parseInt(url.searchParams.get('limit') || '30', 10)
    const data = await arcgisQuery(FS_PORTS, {
      where: `ISO3='${iso3}'`,
      outFields: '*',
      orderByFields: 'vessel_count_total DESC',
      resultRecordCount: limit,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF PortWatch', data.error),
      })
    }
    const ports = (data?.features || []).map((f: any) => f.attributes)
    return NextResponse.json({
      ok: true,
      iso3,
      data_quality: quality('live', 'IMF PortWatch'),
      n_ports: ports.length,
      ports,
    })
  }

  // /api/portwatch/top-global?metric=vessel_count_total
  if (action === 'top-global') {
    const metric = url.searchParams.get('metric') || 'vessel_count_total'
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const allowedMetrics = [
      'vessel_count_total', 'vessel_count_container', 'vessel_count_dry_bulk',
      'vessel_count_general_cargo', 'vessel_count_RoRo', 'vessel_count_tanker',
    ]
    if (!allowedMetrics.includes(metric)) {
      return NextResponse.json({ ok: false, error: `metric must be one of: ${allowedMetrics.join(', ')}` })
    }
    const data = await arcgisQuery(FS_PORTS, {
      where: `${metric} IS NOT NULL`,
      outFields: '*',
      orderByFields: `${metric} DESC`,
      resultRecordCount: limit,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF PortWatch', data.error),
      })
    }
    const ports = (data?.features || []).map((f: any) => f.attributes)
    return NextResponse.json({
      ok: true,
      metric,
      data_quality: quality('live', 'IMF PortWatch'),
      ports,
    })
  }

  // /api/portwatch/chokepoints
  if (action === 'chokepoints') {
    const data = await arcgisQuery(FS_CHOKEPOINTS, {
      outFields: '*',
      resultRecordCount: 50,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF PortWatch', data.error),
      })
    }
    const items = (data?.features || []).map((f: any) => f.attributes)
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'IMF PortWatch · Chokepoints'),
      n_items: items.length,
      items,
    })
  }

  // /api/portwatch/chokepoint-timeseries?portid=chokepoint1&days=37
  if (action === 'chokepoint-timeseries') {
    const portid = url.searchParams.get('portid') || 'chokepoint1'
    const days = parseInt(url.searchParams.get('days') || '37', 10)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const ds = cutoff.toISOString().slice(0, 10)
    const data = await arcgisQuery(FS_DAILY_CHOKE, {
      where: `portid='${portid.replace(/'/g, "''")}' AND date >= timestamp '${ds} 00:00:00'`,
      outFields: 'date,n_total,n_container,n_dry_bulk,n_tanker,n_roro,n_general_cargo,n_cargo,capacity_container,capacity_tanker,capacity_dry_bulk',
      orderByFields: 'date ASC',
      resultRecordCount: 2000,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF PortWatch · Daily_Chokepoints', data.error),
      })
    }
    const meta = TOP_CHOKEPOINTS.find((c) => c.id === portid)
    const points = (data?.features || []).map((f: any) => ({
      date: f.attributes.date ? new Date(f.attributes.date).toISOString().slice(0, 10) : null,
      n_total: f.attributes.n_total ?? 0,
      n_container: f.attributes.n_container ?? 0,
      n_dry_bulk: f.attributes.n_dry_bulk ?? 0,
      n_tanker: f.attributes.n_tanker ?? 0,
      n_roro: f.attributes.n_roro ?? 0,
      n_general_cargo: f.attributes.n_general_cargo ?? 0,
      n_cargo: f.attributes.n_cargo ?? 0,
      capacity_container: f.attributes.capacity_container ?? 0,
      capacity_tanker: f.attributes.capacity_tanker ?? 0,
      capacity_dry_bulk: f.attributes.capacity_dry_bulk ?? 0,
    }))
    // Stats
    const last7 = points.slice(-7)
    const prev7 = points.slice(-14, -7)
    const avg7 = last7.length ? last7.reduce((a: number, p: any) => a + p.n_total, 0) / last7.length : 0
    const avgPrev7 = prev7.length ? prev7.reduce((a: number, p: any) => a + p.n_total, 0) / prev7.length : 0
    const wow_pct = avgPrev7 > 0 ? ((avg7 - avgPrev7) / avgPrev7) * 100 : 0
    return NextResponse.json({
      ok: true,
      portid,
      name: meta?.name ?? portid,
      region: meta?.region ?? '',
      data_quality: quality('live', 'IMF PortWatch · Daily Chokepoints'),
      n_points: points.length,
      stats: {
        avg_7d: +avg7.toFixed(1),
        avg_prev_7d: +avgPrev7.toFixed(1),
        wow_pct: +wow_pct.toFixed(2),
      },
      points,
    })
  }

  // /api/portwatch/chokepoints-overview · todos los choke en una llamada (compact stats)
  if (action === 'chokepoints-overview') {
    const days = parseInt(url.searchParams.get('days') || '14', 10)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const ds = cutoff.toISOString().slice(0, 10)
    const ids = TOP_CHOKEPOINTS.map((c) => `'${c.id}'`).join(',')
    const data = await arcgisQuery(FS_DAILY_CHOKE, {
      where: `portid IN (${ids}) AND date >= timestamp '${ds} 00:00:00'`,
      outFields: 'date,portid,n_total,n_container,n_tanker',
      orderByFields: 'portid ASC, date ASC',
      resultRecordCount: 2000,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF PortWatch', data.error),
      })
    }
    // Agrupar por portid
    const byPort: Record<string, any[]> = {}
    for (const f of (data?.features || [])) {
      const p = f.attributes.portid
      if (!byPort[p]) byPort[p] = []
      byPort[p].push({
        date: f.attributes.date ? new Date(f.attributes.date).toISOString().slice(0, 10) : null,
        n_total: f.attributes.n_total ?? 0,
        n_container: f.attributes.n_container ?? 0,
        n_tanker: f.attributes.n_tanker ?? 0,
      })
    }
    const overview = TOP_CHOKEPOINTS.map((c) => {
      const pts = byPort[c.id] || []
      const total = pts.reduce((a, p) => a + p.n_total, 0)
      const avg = pts.length ? total / pts.length : 0
      const latest = pts[pts.length - 1]
      return {
        portid: c.id,
        name: c.name,
        region: c.region,
        n_days: pts.length,
        latest_date: latest?.date,
        latest_n_total: latest?.n_total ?? 0,
        avg_daily: +avg.toFixed(1),
        total_period: total,
      }
    })
    return NextResponse.json({
      ok: true,
      days,
      data_quality: quality('live', 'IMF PortWatch · Chokepoints Overview'),
      n_chokepoints: overview.length,
      chokepoints: overview,
    })
  }

  // /api/portwatch/spain-port-timeseries?portid=port31&days=37
  if (action === 'spain-port-timeseries') {
    const portid = url.searchParams.get('portid')
    const days = parseInt(url.searchParams.get('days') || '37', 10)
    if (!portid) {
      return NextResponse.json({ ok: false, error: 'portid required' })
    }
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const ds = cutoff.toISOString().slice(0, 10)
    const data = await arcgisQuery(FS_DAILY_CHOKE, {
      where: `portid='${portid.replace(/'/g, "''")}' AND date >= timestamp '${ds} 00:00:00'`,
      outFields: 'date,n_total,n_container,n_dry_bulk,n_tanker,n_roro,n_general_cargo',
      orderByFields: 'date ASC',
      resultRecordCount: 1000,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF PortWatch · Daily Port', data.error),
      })
    }
    const points = (data?.features || []).map((f: any) => ({
      date: f.attributes.date ? new Date(f.attributes.date).toISOString().slice(0, 10) : null,
      n_total: f.attributes.n_total ?? 0,
      n_container: f.attributes.n_container ?? 0,
      n_dry_bulk: f.attributes.n_dry_bulk ?? 0,
      n_tanker: f.attributes.n_tanker ?? 0,
      n_roro: f.attributes.n_roro ?? 0,
      n_general_cargo: f.attributes.n_general_cargo ?? 0,
    }))
    return NextResponse.json({
      ok: true,
      portid,
      data_quality: quality('live', 'IMF PortWatch · Daily Port'),
      n_points: points.length,
      points,
    })
  }

  // /api/portwatch/world-trade-daily?days=90
  if (action === 'world-trade-daily') {
    const days = parseInt(url.searchParams.get('days') || '90', 10)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const ds = cutoff.toISOString().slice(0, 10)
    // El agregado mundial vive en Daily_Trade_Data_REG como fila ISO3='WLD'
    // (el antiguo Daily_Trade_Data_WLD dejó de actualizarse en 2025-04).
    const data = await arcgisQuery(FS_DAILY_TRADE_REG, {
      where: `ISO3='WLD' AND date >= DATE '${ds}'`,
      outFields: 'date,portcalls,portcalls_container,portcalls_tanker,portcalls_dry_bulk,import,export',
      orderByFields: 'date ASC',
      resultRecordCount: 1000,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF PortWatch · Daily World Trade', data.error),
      })
    }
    const points = (data?.features || []).map((f: any) => ({
      date: toDateStr(f.attributes.date),
      portcalls: f.attributes.portcalls ?? 0,
      portcalls_container: f.attributes.portcalls_container ?? 0,
      portcalls_tanker: f.attributes.portcalls_tanker ?? 0,
      portcalls_dry_bulk: f.attributes.portcalls_dry_bulk ?? 0,
      import: f.attributes.import ?? 0,
      export: f.attributes.export ?? 0,
    }))
    if (points.length === 0) {
      // Degradación honesta: nunca devolver ok:true con array vacío silencioso.
      return NextResponse.json({
        ok: false,
        data_quality: quality(
          'missing',
          'IMF PortWatch · Daily World Trade',
          `El upstream no devolvió filas para los últimos ${days} días (dataset Daily_Trade_Data_REG, ISO3='WLD').`,
        ),
        n_points: 0,
        points: [],
      })
    }
    const last30 = points.slice(-30)
    const prev30 = points.slice(-60, -30)
    const avg30 = last30.length ? last30.reduce((a: number, p: any) => a + p.portcalls, 0) / last30.length : 0
    const avgPrev30 = prev30.length ? prev30.reduce((a: number, p: any) => a + p.portcalls, 0) / prev30.length : 0
    const trend_pct = avgPrev30 > 0 ? ((avg30 - avgPrev30) / avgPrev30) * 100 : 0
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'IMF PortWatch · Daily World Trade'),
      n_points: points.length,
      stats: {
        avg_portcalls_30d: +avg30.toFixed(0),
        avg_portcalls_prev_30d: +avgPrev30.toFixed(0),
        trend_pct: +trend_pct.toFixed(2),
      },
      points,
    })
  }

  // /api/portwatch/country-trade-daily?country=Spain&days=90
  // Acepta ISO3 ('ESP') o nombre completo ('Spain'): Daily_Trade_Data_REG
  // tiene ambos campos (el antiguo Daily_Regional_Data solo tenía nombre y
  // dejó de actualizarse en 2024-06).
  if (action === 'country-trade-daily') {
    const country = url.searchParams.get('country') || 'Spain'
    const days = parseInt(url.searchParams.get('days') || '90', 10)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const ds = cutoff.toISOString().slice(0, 10)
    const safe = country.replace(/'/g, "''")
    const countryClause = /^[A-Za-z]{3}$/.test(country)
      ? `ISO3='${safe.toUpperCase()}'`
      : `country='${safe}'`
    const data = await arcgisQuery(FS_DAILY_TRADE_REG, {
      where: `${countryClause} AND date >= DATE '${ds}'`,
      outFields: 'date,ISO3,country,portcalls,portcalls_container,portcalls_tanker,portcalls_dry_bulk,import,export',
      orderByFields: 'date ASC',
      resultRecordCount: 1000,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF PortWatch · Daily Country Trade', data.error),
      })
    }
    const features = data?.features || []
    const points = features.map((f: any) => ({
      date: toDateStr(f.attributes.date),
      portcalls: f.attributes.portcalls ?? 0,
      portcalls_container: f.attributes.portcalls_container ?? 0,
      portcalls_tanker: f.attributes.portcalls_tanker ?? 0,
      portcalls_dry_bulk: f.attributes.portcalls_dry_bulk ?? 0,
      import: f.attributes.import ?? 0,
      export: f.attributes.export ?? 0,
    }))
    if (points.length === 0) {
      // Degradación honesta: nunca devolver ok:true con array vacío silencioso.
      return NextResponse.json({
        ok: false,
        country,
        data_quality: quality(
          'missing',
          'IMF PortWatch · Daily Country Trade',
          `El upstream no devolvió filas para '${country}' en los últimos ${days} días. Usa ISO3 (p. ej. ESP) o nombre en inglés (p. ej. Spain).`,
        ),
        n_points: 0,
        points: [],
      })
    }
    return NextResponse.json({
      ok: true,
      country,
      iso3: features[0]?.attributes?.ISO3 ?? null,
      country_name: features[0]?.attributes?.country ?? null,
      data_quality: quality('live', 'IMF PortWatch · Daily Country Trade'),
      n_points: points.length,
      points,
    })
  }

  // /api/portwatch/disruptions
  if (action === 'disruptions') {
    const data = await arcgisQuery(FS_DISRUPTIONS, {
      outFields: '*',
      resultRecordCount: 50,
      orderByFields: 'OBJECTID DESC',
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF PortWatch', data.error),
      })
    }
    const items = (data?.features || []).map((f: any) => f.attributes)
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'IMF PortWatch · Disruptions'),
      n_items: items.length,
      items,
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/portwatch/health',
        'GET /api/portwatch/spain-ports',
        'GET /api/portwatch/port?portid=port31 | port?name=Algeciras',
        'GET /api/portwatch/ports?iso3=MAR&limit=30',
        'GET /api/portwatch/top-global?metric=vessel_count_total&limit=20',
        'GET /api/portwatch/chokepoints',
        'GET /api/portwatch/chokepoints-overview?days=14',
        'GET /api/portwatch/chokepoint-timeseries?portid=chokepoint1&days=37',
        'GET /api/portwatch/spain-port-timeseries?portid=port31&days=37',
        'GET /api/portwatch/world-trade-daily?days=90',
        'GET /api/portwatch/country-trade-daily?country=Spain&days=90 (acepta ISO3: country=ESP)',
        'GET /api/portwatch/disruptions',
      ],
      top_chokepoints: TOP_CHOKEPOINTS,
    },
    { status: 404 },
  )
}
