/**
 * /api/bis/[...path] · BIS Statistics · banking, FX, derivatives.
 *
 * Fuente: stats.bis.org/api/v2/data/ · Bank for International Settlements.
 * Sin auth, SDMX-JSON 2.0.
 *
 * Series clave para Politeia:
 *  - CBS (Consolidated Banking Statistics) · claims externos por país banco
 *  - LBS (Locational Banking Statistics) · activos/pasivos transfronterizos
 *  - EER (Effective Exchange Rates) · BIS broad+narrow
 *  - OTC derivatives · totales globales
 *  - Debt securities · stocks y emisiones
 *
 * Rutas:
 *   GET /api/bis/health
 *   GET /api/bis/banking-spain?series=CBS
 *     → Claims externos bancos ES (proveedor) vs total
 *   GET /api/bis/fx-effective?country=ESP&rate=broad
 *     → Tipo de cambio efectivo BIS últimos 24m
 *   GET /api/bis/dataset?id=...&key=...
 *
 * Cache HTTP 24h.
 */
import { NextResponse } from 'next/server'
import { quality, parseSdmxJson, fmtNum } from '@/lib/macro-utils'

export const revalidate = 86400

const BIS_BASE = 'https://stats.bis.org/api/v2/data'

async function bisFetch(dataflow: string, key: string, extraParams: Record<string, string> = {}): Promise<any> {
  const qs = new URLSearchParams({
    format: 'jsondata',
    dimensionAtObservation: 'AllDimensions',
    ...extraParams,
  })
  const url = `${BIS_BASE}/dataflow/BIS/${dataflow}/+/${key}?${qs}`
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/vnd.sdmx.data+json;version=2.0' },
      next: { revalidate: 86400 },
    } as RequestInit)
    if (r.status === 429) return { error: 'rate_limited' }
    if (r.status === 404) return { error: 'dataset_not_found' }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    const text = await r.text()
    try {
      return JSON.parse(text)
    } catch {
      return { error: 'invalid_json' }
    }
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

  // /api/bis/health
  if (action === 'health') {
    // Probe simple: BIS effective exchange rates (EER) para ESP
    const probe = await bisFetch('WS_EER', 'M.N.B.ES')
    return NextResponse.json({
      ok: !probe.error,
      auth_required: false,
      backend: 'BIS SDMX 2.0',
      probe_status: probe.error ?? 'live',
    })
  }

  // /api/bis/banking-spain
  if (action === 'banking-spain') {
    // Consolidated Banking Statistics · claims externos bancos ES
    // Dataflow: WS_CBS_PUB | Key pattern: FREQ.MEASURE.CREDIT_INSTRUMENT.REPORTING_COUNTRY.SECTOR.COUNTERPARTY.RISK
    const data = await bisFetch('WS_CBS_PUB', 'Q.S.5J.A.5J.A.5J.5A.A.ES.A.A.TO1')
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'BIS Statistics', data.error),
        note: 'BIS WS_CBS_PUB key requiere ajuste · ver stats.bis.org SDMX docs',
      })
    }
    const points = parseSdmxJson(data).filter((p) => p.value != null)
    return NextResponse.json({
      ok: true,
      country: 'ES',
      series: 'CBS · Consolidated Banking Statistics',
      data_quality: quality('live', 'BIS Statistics · WS_CBS_PUB'),
      n_points: points.length,
      points: points.slice(0, 100),
    })
  }

  // /api/bis/fx-effective?country=ESP&rate=broad|narrow
  if (action === 'fx-effective') {
    const country = url.searchParams.get('country') || 'ES'
    const rateType = url.searchParams.get('rate') === 'narrow' ? 'N' : 'B' // Narrow/Broad
    // WS_EER · Effective Exchange Rates · M.{type}.{N=narrow B=broad}.{ISO2}
    const data = await bisFetch('WS_EER', `M.N.${rateType}.${country.slice(0, 2)}`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'BIS Statistics', data.error),
      })
    }
    const points = parseSdmxJson(data).filter((p) => p.value != null)
    const sorted = points.sort((a, b) => String(a.TIME_PERIOD || a.time).localeCompare(String(b.TIME_PERIOD || b.time)))
    const last24 = sorted.slice(-24)
    return NextResponse.json({
      ok: true,
      country,
      rate_type: rateType === 'B' ? 'broad' : 'narrow',
      data_quality: quality('live', 'BIS Statistics · WS_EER'),
      latest_value: last24[last24.length - 1]?.value ?? null,
      latest_period: last24[last24.length - 1]?.TIME_PERIOD ?? last24[last24.length - 1]?.time ?? null,
      points: last24,
    })
  }

  // /api/bis/dataset?id=...&key=...
  if (action === 'dataset') {
    const id = url.searchParams.get('id')
    const key = url.searchParams.get('key') || '+'
    if (!id) {
      return NextResponse.json({ ok: false, error: 'id parameter required' })
    }
    const data = await bisFetch(id, key)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'BIS Statistics', data.error),
      })
    }
    const points = parseSdmxJson(data).filter((p) => p.value != null)
    return NextResponse.json({
      ok: true,
      dataset_id: id,
      key,
      data_quality: quality('live', 'BIS Statistics'),
      n_points: points.length,
      points: points.slice(0, 500),
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/bis/health',
        'GET /api/bis/banking-spain',
        'GET /api/bis/fx-effective?country=ES&rate=broad|narrow',
        'GET /api/bis/dataset?id=WS_EER&key=M.N.B.ES',
      ],
      docs: 'https://www.bis.org/statistics/sdmx_api.htm',
    },
    { status: 404 },
  )
}
