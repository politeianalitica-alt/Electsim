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

function quality(t: 'live' | 'cache' | 'missing', name: string, note?: string) {
  return { source_type: t, source_name: name, ...(note ? { note } : {}) }
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
        'GET /api/portwatch/port?portid=port31 (Algeciras) | port?name=Valencia',
        'GET /api/portwatch/ports?iso3=MAR&limit=30',
        'GET /api/portwatch/top-global?metric=vessel_count_total&limit=20',
        'GET /api/portwatch/chokepoints',
        'GET /api/portwatch/disruptions',
      ],
    },
    { status: 404 },
  )
}
