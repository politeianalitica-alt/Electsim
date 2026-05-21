/**
 * /api/wto/[...path] · Proxy WTO Timeseries API (multilateral trade stats).
 *
 * Server-side fetch · WTO_API_KEY nunca llega al cliente. UNA sola
 * serverless function que expone los endpoints útiles para /puertos/comercio
 * y /macro.
 *
 * Rutas:
 *   GET /api/wto/spain-overview?periods=2018-2024
 *     → exports/imports total/agri/manuf, services, aranceles MFN
 *
 *   GET /api/wto/country/{iso3}?periods=2020-2024
 *     → Snapshot completo de cualquier país (ESP, FRA, DEU, USA, CHN, …)
 *
 *   GET /api/wto/tariff/{iso3}
 *     → Aranceles MFN aplicados último año (all/agri/non-agri)
 *
 *   GET /api/wto/indicator?indicator=ITS_MTV_AX&reporter=724&periods=2020-2024
 *     → Endpoint genérico para cualquier indicador WTO
 *
 *   GET /api/wto/indicators
 *     → Lista 58 indicadores disponibles + categoría
 *
 * Encoding: WTO devuelve latin-1 a pesar de header UTF-8 · forzamos decode robusto.
 * Cache HTTP 12h.
 */
import { NextResponse } from 'next/server'

export const revalidate = 43200 // 12h

const WTO_BASE = 'https://api.wto.org/timeseries/v1'

const WTO_REPORTERS: Record<string, number> = {
  ESP: 724, FRA: 251, DEU: 276, ITA: 381, PRT: 620,
  GBR: 826, USA: 840, CHN: 156, JPN: 392, CAN: 124,
  MEX: 484, BRA: 76, MAR: 504, TUR: 792, IND: 699,
  RUS: 643, EU: 918,
}

const KEY_INDICATORS = {
  exports_total: 'ITS_MTV_AX',
  imports_total: 'ITS_MTV_AM',
  exports_agri: 'ITS_MTV_AGR_AX',
  imports_agri: 'ITS_MTV_AGR_AM',
  exports_manuf: 'ITS_MTV_MNF_AX',
  imports_manuf: 'ITS_MTV_MNF_AM',
  exports_fuels_mining: 'ITS_MTV_FME_AX',
  services_exports: 'ITS_CS_AX5',
  services_imports: 'ITS_CS_AM5',
  tariff_simple_all: 'TP_A_0010',
  tariff_simple_agri: 'TP_A_0160',
  tariff_simple_nonagri: 'TP_A_0430',
  tariff_weighted_all: 'TP_A_0030',
  tariff_weighted_agri: 'TP_A_0170',
}

function quality(t: 'live' | 'cache' | 'missing', name: string, note?: string) {
  return { source_type: t, source_name: name, ...(note ? { note } : {}) }
}

async function fetchWto(path: string, params: URLSearchParams): Promise<any> {
  const key = process.env.WTO_API_KEY
  if (!key) return { error: 'missing_key' }
  try {
    const r = await fetch(`${WTO_BASE}${path}?${params}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key, Accept: 'application/json' },
      next: { revalidate: 43200 },
    })
    if (!r.ok) return { error: `HTTP ${r.status}` }
    // WTO a veces sirve latin-1 con header utf-8 · decode robusto
    const buf = await r.arrayBuffer()
    let text: string
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
    } catch {
      text = new TextDecoder('latin1').decode(buf)
    }
    return JSON.parse(text)
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

async function spainOverview(periods: string): Promise<any> {
  // 14 indicadores · 14 calls en paralelo
  const series: Record<string, any[]> = {}
  await Promise.all(
    Object.entries(KEY_INDICATORS).map(async ([name, code]) => {
      const params = new URLSearchParams({
        i: code, r: '724', ps: periods, fmt: 'json', lang: '1', max: '5000',
      })
      const data = await fetchWto('/data', params)
      const ds = (data?.Dataset || []) as any[]
      series[name] = ds
        .filter((d) => d.Value !== null && d.Value !== undefined)
        .map((d) => ({
          year: d.Year,
          value: d.Value,
          unit: d.Unit,
          partner: d.PartnerEconomyCode,
          product: d.ProductOrSectorCode,
        }))
    }),
  )
  return {
    reporter_code: 724,
    reporter: 'ESP · Spain',
    periods,
    series,
    data_quality: quality('live', 'WTO Timeseries', 'Cache 12h · 14 indicadores en paralelo.'),
  }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  if (!process.env.WTO_API_KEY) {
    return NextResponse.json({
      error: 'WTO_API_KEY no configurada',
      data_quality: quality('missing', 'WTO'),
    })
  }

  // /api/wto/spain-overview
  if (action === 'spain-overview') {
    const periods = url.searchParams.get('periods') || '2018-2024'
    const overview = await spainOverview(periods)
    return NextResponse.json(overview)
  }

  // /api/wto/country/{iso3}
  if (action === 'country' && segs[1]) {
    const iso3 = segs[1].toUpperCase()
    const code = WTO_REPORTERS[iso3]
    if (!code) {
      return NextResponse.json({
        error: `Reporter ${iso3} no mapeado`,
        available: Object.keys(WTO_REPORTERS),
      })
    }
    const periods = url.searchParams.get('periods') || '2020-2024'
    const series: Record<string, any[]> = {}
    await Promise.all(
      Object.entries(KEY_INDICATORS).map(async ([name, ind]) => {
        const p = new URLSearchParams({
          i: ind, r: String(code), ps: periods, fmt: 'json', lang: '1', max: '5000',
        })
        const data = await fetchWto('/data', p)
        series[name] = ((data?.Dataset || []) as any[])
          .filter((d) => d.Value != null)
          .map((d) => ({ year: d.Year, value: d.Value, unit: d.Unit }))
      }),
    )
    return NextResponse.json({
      iso3, reporter_code: code, periods, series,
      data_quality: quality('live', 'WTO Timeseries'),
    })
  }

  // /api/wto/tariff/{iso3}
  if (action === 'tariff' && segs[1]) {
    const iso3 = segs[1].toUpperCase()
    const code = WTO_REPORTERS[iso3]
    if (!code) return NextResponse.json({ error: `Reporter ${iso3} no mapeado` })
    const tariffs: Record<string, any> = {}
    const tariffKeys = ['tariff_simple_all', 'tariff_simple_agri',
                        'tariff_simple_nonagri', 'tariff_weighted_all',
                        'tariff_weighted_agri']
    await Promise.all(
      tariffKeys.map(async (key) => {
        const ind = (KEY_INDICATORS as any)[key]
        const p = new URLSearchParams({
          i: ind, r: String(code), ps: '2018-2024', fmt: 'json', lang: '1',
        })
        const data = await fetchWto('/data', p)
        const ds = (data?.Dataset || []) as any[]
        const latest = ds.length
          ? ds.reduce((max, d) => (d.Year > (max?.Year || 0) ? d : max), null)
          : null
        if (latest) {
          tariffs[key] = {
            year: latest.Year, value: latest.Value, unit: latest.Unit,
          }
        }
      }),
    )
    return NextResponse.json({
      reporter: iso3, reporter_code: code, tariffs,
      data_quality: quality('live', 'WTO Tariffs'),
    })
  }

  // /api/wto/indicator?indicator=...&reporter=...&periods=...
  if (action === 'indicator') {
    const indicator = url.searchParams.get('indicator')
    const reporter = url.searchParams.get('reporter') || '724'
    const periods = url.searchParams.get('periods') || '2020-2024'
    if (!indicator) {
      return NextResponse.json({
        error: 'param ?indicator requerido',
        available: KEY_INDICATORS,
      })
    }
    const p = new URLSearchParams({
      i: indicator, r: reporter, ps: periods, fmt: 'json', lang: '1', max: '5000',
    })
    const data = await fetchWto('/data', p)
    return NextResponse.json({
      indicator, reporter, periods,
      n_items: (data?.Dataset || []).length,
      items: data?.Dataset || [],
      data_quality: quality('live', 'WTO Timeseries'),
    })
  }

  // /api/wto/indicators
  if (action === 'indicators') {
    const data = await fetchWto('/indicators', new URLSearchParams())
    return NextResponse.json({
      n_items: Array.isArray(data) ? data.length : 0,
      items: Array.isArray(data) ? data : [],
      data_quality: quality('live', 'WTO Indicators catalog'),
    })
  }

  return NextResponse.json({
    available_endpoints: [
      'GET /api/wto/spain-overview?periods=2018-2024',
      'GET /api/wto/country/{iso3}?periods=2020-2024',
      'GET /api/wto/tariff/{iso3}',
      'GET /api/wto/indicator?indicator=ITS_MTV_AX&reporter=724',
      'GET /api/wto/indicators',
    ],
    iso3_codes: Object.keys(WTO_REPORTERS),
  }, { status: 404 })
}
