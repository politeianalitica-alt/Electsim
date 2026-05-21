/**
 * /api/oecd/[...path] · OECD Data API · SDMX-JSON.
 *
 * Fuente: sdmx.oecd.org/public/rest/data/ · OCDE oficial.
 * Sin auth. Datos macro nacional, productividad, fiscalidad, empleo,
 * sociedad, industria.
 *
 * Estrategia: como OECD SDMX necesita conocer el dataset code exacto y
 * cambian con versiones, exponemos:
 *  - Health check con probe a dataset estable
 *  - Endpoints de alto nivel (spain-macro, eu-comparison) que llaman a
 *    dataset codes hardcoded más estables. Si fallan, degradan a
 *    estado missing con instructions.
 *  - Query libre `/api/oecd/dataset?id={DSD_CODE}&filter={KEY}` para
 *    cliente avanzado.
 *
 * Cache HTTP 12h.
 */
import { NextResponse } from 'next/server'
import { quality, parseSdmxJson, fmtPct } from '@/lib/macro-utils'

export const revalidate = 43200

const OECD_BASE = 'https://sdmx.oecd.org/public/rest/data'

// Mapeo de "métricas amigables" → SDMX dataset path + key pattern
// Cada métrica se prueba; si una falla devolvemos null en lugar de crash.
const METRIC_DATASETS = {
  gdp_growth: {
    // OECD Quarterly National Accounts · GDP volume YoY
    path: 'OECD.SDD.NAD,DSD_NAMAIN10@DF_QNA,1.1',
    key_template: 'Q.{country}.S1..B1GQ.GYSA.....',
    label: 'Real GDP growth (% YoY)',
  },
  unemployment: {
    // OECD Short-Term Labour Statistics · Harmonised unemployment rate
    path: 'OECD.SDD.STES,DSD_STES@DF_STLABOUR,1.0',
    key_template: 'M.{country}.UNE..PA..STSA.M',
    label: 'Unemployment rate (%)',
  },
  inflation: {
    // OECD Consumer Prices · CPI YoY
    path: 'OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0',
    key_template: 'M.{country}.CPI.PA._T.N.GY',
    label: 'CPI inflation (% YoY)',
  },
  gov_debt: {
    // OECD Government Finance · General gov gross debt %GDP
    path: 'OECD.ECO.MAD,DSD_EO@DF_EO,1.4',
    key_template: 'A.{country}.GGFLM.....',
    label: 'Gov gross debt (% GDP)',
  },
}

async function oecdFetch(path: string, params: Record<string, string> = {}): Promise<any> {
  const qs = new URLSearchParams({
    format: 'jsondata',
    dimensionAtObservation: 'AllDimensions',
    ...params,
  })
  try {
    const r = await fetch(`${OECD_BASE}/${path}?${qs}`, {
      headers: { Accept: 'application/vnd.sdmx.data+json;version=1.0' },
      next: { revalidate: 43200 },
    } as RequestInit)
    if (r.status === 404) return { error: 'dataset_not_found' }
    if (r.status === 429) return { error: 'rate_limited' }
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

async function fetchMetric(country: string, metric: keyof typeof METRIC_DATASETS) {
  const cfg = METRIC_DATASETS[metric]
  const key = cfg.key_template.replace('{country}', country)
  const url = `${cfg.path}/${key}`
  return await oecdFetch(url)
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/oecd/health
  if (action === 'health') {
    const probe = await fetchMetric('ESP', 'gdp_growth')
    return NextResponse.json({
      ok: !probe.error,
      auth_required: false,
      probe_status: probe.error ?? 'live',
      note: 'OECD SDMX puede requerir dataset codes actualizados periódicamente · GitHub OECD SDMX docs',
    })
  }

  // /api/oecd/spain-macro
  if (action === 'spain-macro') {
    const metrics = Object.keys(METRIC_DATASETS) as Array<keyof typeof METRIC_DATASETS>
    const results = await Promise.all(metrics.map((m) => fetchMetric('ESP', m)))
    const indicators = metrics.map((m, i) => {
      const r = results[i]
      const cfg = METRIC_DATASETS[m]
      if (r.error) {
        return { code: m, label: cfg.label, error: r.error, data_points: 0 }
      }
      const points = parseSdmxJson(r).filter((p) => p.value != null)
      // último punto (más reciente)
      const sorted = points.sort((a, b) => {
        const ta = a.TIME_PERIOD || a.time || ''
        const tb = b.TIME_PERIOD || b.time || ''
        return tb.localeCompare(ta)
      })
      const latest = sorted[0]
      const latestPeriod = latest?.TIME_PERIOD ?? latest?.time ?? null
      const latestValue = latest?.value ?? null
      return {
        code: m,
        label: cfg.label,
        latest_period: latestPeriod,
        latest_value: latestValue,
        latest_fmt: fmtPct(latestValue),
        n_points: points.length,
      }
    })
    return NextResponse.json({
      ok: true,
      country: 'ESP',
      data_quality: quality('live', 'OECD SDMX'),
      indicators,
    })
  }

  // /api/oecd/dataset?id=...&key=...
  if (action === 'dataset') {
    const id = url.searchParams.get('id')
    const key = url.searchParams.get('key') || 'all'
    if (!id) {
      return NextResponse.json({ ok: false, error: 'id parameter required' })
    }
    const data = await oecdFetch(`${id}/${key}`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'OECD SDMX', data.error),
      })
    }
    const points = parseSdmxJson(data).filter((p) => p.value != null)
    return NextResponse.json({
      ok: true,
      dataset_id: id,
      key,
      data_quality: quality('live', 'OECD SDMX'),
      n_points: points.length,
      points: points.slice(0, 500),
    })
  }

  // /api/oecd/metric?name=gdp_growth&country=ESP
  if (action === 'metric') {
    const metricName = (url.searchParams.get('name') || 'gdp_growth') as keyof typeof METRIC_DATASETS
    const country = (url.searchParams.get('country') || 'ESP').toUpperCase()
    if (!METRIC_DATASETS[metricName]) {
      return NextResponse.json({
        ok: false,
        error: `Unknown metric: ${metricName}`,
        available: Object.keys(METRIC_DATASETS),
      })
    }
    const data = await fetchMetric(country, metricName)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'OECD SDMX', data.error),
      })
    }
    const points = parseSdmxJson(data).filter((p) => p.value != null)
    return NextResponse.json({
      ok: true,
      country,
      metric: metricName,
      label: METRIC_DATASETS[metricName].label,
      data_quality: quality('live', 'OECD SDMX'),
      n_points: points.length,
      points,
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/oecd/health',
        'GET /api/oecd/spain-macro',
        'GET /api/oecd/metric?name=gdp_growth|unemployment|inflation|gov_debt&country=ESP',
        'GET /api/oecd/dataset?id={DSD_CODE}&key={SDMX_KEY}',
      ],
      available_metrics: Object.keys(METRIC_DATASETS),
    },
    { status: 404 },
  )
}
