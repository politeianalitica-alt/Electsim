/**
 * /api/eurostat/[...path] · Eurostat Statistics API · JSON-stat 2.0.
 *
 * Fuente: ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/
 * Pública sin auth. Devuelve JSON-stat con value + dimension + size.
 *
 * Rutas:
 *   GET /api/eurostat/health
 *   GET /api/eurostat/spain-gdp?year=2023
 *     → PIB nominal España + delta YoY
 *   GET /api/eurostat/spain-employment?year=2024
 *     → Tasa empleo + paro por género (LFS)
 *   GET /api/eurostat/spain-industry?year=2024
 *     → Producción industrial NACE C
 *   GET /api/eurostat/regions-nuts2?metric=gdp_per_capita
 *     → Ranking 17 CCAA por PIB per cápita
 *   GET /api/eurostat/eu-comparison?metric=gdp_pc&year=2023
 *     → Ranking UE-27
 *   GET /api/eurostat/dataset?code=...&filters=...
 *     → Query libre
 *
 * Cache HTTP 6h.
 */
import { NextResponse } from 'next/server'
import { quality, parseJsonStat, fmtPct, fmtEur, EU27_ISO2, SPAIN_NUTS2 } from '@/lib/macro-utils'

export const revalidate = 21600

const EUROSTAT_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'

async function eurostatFetch(code: string, filters: Record<string, string | string[]>): Promise<any> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (Array.isArray(v)) {
      v.forEach((vv) => qs.append(k, vv))
    } else {
      qs.append(k, v)
    }
  }
  try {
    const r = await fetch(`${EUROSTAT_BASE}/${code}?${qs}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 21600 },
    } as RequestInit)
    if (r.status === 429) return { error: 'rate_limited' }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
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

  // /api/eurostat/health
  if (action === 'health') {
    const probe = await eurostatFetch('nama_10_gdp', {
      geo: 'ES', unit: 'CP_MEUR', na_item: 'B1GQ', time: '2023',
    })
    return NextResponse.json({
      ok: !probe.error,
      auth_required: false,
      probe_status: probe.error ?? 'live',
      probe_value: probe?.value?.['0'] ?? null,
    })
  }

  // /api/eurostat/spain-gdp
  if (action === 'spain-gdp') {
    const year = url.searchParams.get('year') || String(new Date().getFullYear() - 1)
    const data = await eurostatFetch('nama_10_gdp', {
      geo: 'ES', unit: 'CP_MEUR', na_item: 'B1GQ', time: [String(parseInt(year) - 5), year],
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'Eurostat', data.error),
      })
    }
    const points = parseJsonStat(data).filter((p) => p.value != null)
    const sorted = points.sort((a, b) => String(a.time).localeCompare(String(b.time)))
    const latest = sorted[sorted.length - 1]
    const prev = sorted[sorted.length - 2]
    const yoy = latest && prev && prev.value != null && latest.value != null
      ? ((latest.value - prev.value) / prev.value) * 100
      : null
    return NextResponse.json({
      ok: true,
      country: 'ES',
      year: parseInt(year),
      data_quality: quality('live', 'Eurostat · nama_10_gdp'),
      latest_period: latest?.time,
      latest_value_meur: latest?.value,
      latest_fmt: latest?.value ? fmtEur(latest.value * 1e6) : '—',
      yoy_pct: yoy ? +yoy.toFixed(2) : null,
      yoy_fmt: fmtPct(yoy),
      history: sorted,
    })
  }

  // /api/eurostat/spain-employment
  if (action === 'spain-employment') {
    const year = url.searchParams.get('year') || String(new Date().getFullYear() - 1)
    // Tasa de paro (une_rt_a) por edad+sexo · totales y desglose
    const data = await eurostatFetch('une_rt_a', {
      geo: 'ES', age: 'TOTAL', sex: ['T', 'M', 'F'], unit: 'PC_ACT', time: year,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'Eurostat', data.error),
      })
    }
    const points = parseJsonStat(data).filter((p) => p.value != null)
    const bySex: Record<string, number> = {}
    for (const p of points) {
      if (p.sex === 'T') bySex.total = p.value as number
      if (p.sex === 'M') bySex.male = p.value as number
      if (p.sex === 'F') bySex.female = p.value as number
    }
    return NextResponse.json({
      ok: true,
      country: 'ES',
      year: parseInt(year),
      data_quality: quality('live', 'Eurostat · une_rt_a'),
      unemployment_rate: bySex,
      gender_gap_pp: bySex.female && bySex.male ? +(bySex.female - bySex.male).toFixed(2) : null,
    })
  }

  // /api/eurostat/spain-industry
  if (action === 'spain-industry') {
    const year = url.searchParams.get('year') || String(new Date().getFullYear() - 1)
    // sts_inpr_a · producción industrial NACE C (manufactura), índice 2021=100
    const data = await eurostatFetch('sts_inpr_a', {
      geo: 'ES', nace_r2: 'C', s_adj: 'CA', unit: 'I21',
      time: [String(parseInt(year) - 3), year],
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'Eurostat', data.error),
      })
    }
    const points = parseJsonStat(data).filter((p) => p.value != null)
    return NextResponse.json({
      ok: true,
      country: 'ES',
      year: parseInt(year),
      data_quality: quality('live', 'Eurostat · sts_inpr_a · NACE C'),
      series: points.sort((a, b) => String(a.time).localeCompare(String(b.time))),
    })
  }

  // /api/eurostat/regions-nuts2?metric=gdp_per_capita
  if (action === 'regions-nuts2') {
    const metric = url.searchParams.get('metric') || 'gdp_per_capita'
    const year = url.searchParams.get('year') || String(new Date().getFullYear() - 2)

    let datasetCode = 'nama_10r_2gdp'
    let filters: Record<string, string | string[]> = {
      unit: 'EUR_HAB', time: year,
      geo: Object.keys(SPAIN_NUTS2),
    }
    if (metric === 'unemployment') {
      datasetCode = 'lfst_r_lfu3rt'
      filters = {
        age: 'Y15-74', sex: 'T', unit: 'PC', time: year,
        geo: Object.keys(SPAIN_NUTS2),
      }
    }
    const data = await eurostatFetch(datasetCode, filters)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'Eurostat', data.error),
      })
    }
    const points = parseJsonStat(data).filter((p) => p.value != null)
    const items = points
      .map((p) => ({
        nuts2: p.geo as string,
        nuts2_name: SPAIN_NUTS2[p.geo as string] || p.geo,
        value: p.value,
        period: p.time,
      }))
      .sort((a, b) => (b.value || 0) - (a.value || 0))
    return NextResponse.json({
      ok: true,
      metric,
      year: parseInt(year),
      data_quality: quality('live', `Eurostat · ${datasetCode}`),
      n_regions: items.length,
      regions: items,
    })
  }

  // /api/eurostat/eu-comparison?metric=gdp_pc&year=2023
  if (action === 'eu-comparison') {
    const metric = url.searchParams.get('metric') || 'gdp_pc'
    const year = url.searchParams.get('year') || String(new Date().getFullYear() - 2)
    let datasetCode = 'nama_10_pc'
    let filters: Record<string, string | string[]> = {
      unit: 'CP_EUR_HAB', na_item: 'B1GQ', time: year,
      geo: [...EU27_ISO2],
    }
    if (metric === 'unemployment') {
      datasetCode = 'une_rt_a'
      filters = {
        age: 'TOTAL', sex: 'T', unit: 'PC_ACT', time: year,
        geo: [...EU27_ISO2],
      }
    } else if (metric === 'inflation') {
      datasetCode = 'prc_hicp_aind'
      filters = {
        unit: 'RCH_A_AVG', coicop: 'CP00', time: year,
        geo: [...EU27_ISO2],
      }
    }
    const data = await eurostatFetch(datasetCode, filters)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'Eurostat', data.error),
      })
    }
    const points = parseJsonStat(data).filter((p) => p.value != null)
    const items = points
      .map((p) => ({ geo: p.geo as string, value: p.value, period: p.time }))
      .sort((a, b) => (b.value || 0) - (a.value || 0))
    const spainPos = items.findIndex((x) => x.geo === 'ES') + 1
    return NextResponse.json({
      ok: true,
      metric,
      year: parseInt(year),
      data_quality: quality('live', `Eurostat · ${datasetCode}`),
      n_countries: items.length,
      spain_position: spainPos,
      spain_value: items.find((x) => x.geo === 'ES')?.value || null,
      eu_avg: items.length
        ? +(items.reduce((a, b) => a + (b.value || 0), 0) / items.length).toFixed(2)
        : null,
      items,
    })
  }

  // /api/eurostat/dataset?code=...
  if (action === 'dataset') {
    const code = url.searchParams.get('code')
    if (!code) {
      return NextResponse.json({ ok: false, error: 'code parameter required' })
    }
    const filtersParam = url.searchParams.get('filters') || ''
    const filters: Record<string, string> = {}
    if (filtersParam) {
      filtersParam.split(';').forEach((kv) => {
        const [k, v] = kv.split('=')
        if (k && v) filters[k] = v
      })
    }
    const data = await eurostatFetch(code, filters)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'Eurostat', data.error),
      })
    }
    const points = parseJsonStat(data).filter((p) => p.value != null)
    return NextResponse.json({
      ok: true,
      dataset_code: code,
      data_quality: quality('live', `Eurostat · ${code}`),
      n_points: points.length,
      points: points.slice(0, 500),
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/eurostat/health',
        'GET /api/eurostat/spain-gdp?year=2023',
        'GET /api/eurostat/spain-employment?year=2024',
        'GET /api/eurostat/spain-industry?year=2024',
        'GET /api/eurostat/regions-nuts2?metric=gdp_per_capita|unemployment&year=2022',
        'GET /api/eurostat/eu-comparison?metric=gdp_pc|unemployment|inflation&year=2023',
        'GET /api/eurostat/dataset?code=nama_10_gdp&filters=geo=ES;na_item=B1GQ;time=2023',
      ],
    },
    { status: 404 },
  )
}
