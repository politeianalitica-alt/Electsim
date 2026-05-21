/**
 * /api/imf/[...path] · IMF DataMapper · macro forecasts & series.
 *
 * Fuente: www.imf.org/external/datamapper/api/v1/
 * Sin auth · datos World Economic Outlook (WEO), Fiscal Monitor (FM),
 * Global Financial Stability Report (GFSR). Forecasts 5-7 años.
 *
 * Estructura respuesta IMF:
 *   { values: { INDICATOR: { ISO3: { YEAR: value } } } }
 * Devuelve TODOS los países en cada query → filtramos client-side.
 *
 * Rutas:
 *   GET /api/imf/health
 *   GET /api/imf/spain-overview?year=2024
 *     → 6 indicadores macro clave España año actual + forecast +5y
 *   GET /api/imf/weo-forecast?indicator=NGDP_RPCH&countries=ESP,DEU,FRA,USA,CHN
 *     → Forecast comparado WEO
 *   GET /api/imf/country?iso=ESP&indicator=NGDP_RPCH
 *     → Serie histórica completa 1980-now+5
 *   GET /api/imf/indicators
 *     → Catálogo indicadores con labels
 *
 * Cache HTTP 24h (WEO actualiza 2x/año).
 */
import { NextResponse } from 'next/server'
import { quality, fmtPct, fmtUsd, fmtNum } from '@/lib/macro-utils'

export const revalidate = 86400 // 24h

const IMF_API = 'https://www.imf.org/external/datamapper/api/v1'

// Indicadores WEO clave para snapshot España
const SPAIN_KEY_INDICATORS = [
  { code: 'NGDP_RPCH', label: 'PIB real (% var anual)', unit: '%', kind: 'pct' as const },
  { code: 'NGDPD',     label: 'PIB nominal (USD)',       unit: 'USD bn', kind: 'usd_bn' as const },
  { code: 'NGDPDPC',   label: 'PIB per cápita (USD)',    unit: 'USD',    kind: 'usd' as const },
  { code: 'PCPIPCH',   label: 'Inflación IPC (%)',       unit: '%',      kind: 'pct' as const },
  { code: 'LUR',       label: 'Tasa de paro (%)',         unit: '%',      kind: 'pct' as const },
  { code: 'GGXWDG_NGDP', label: 'Deuda pública (% PIB)',  unit: '%',      kind: 'pct' as const },
  { code: 'BCA_NGDPD', label: 'Cta. corriente (% PIB)',   unit: '%',      kind: 'pct' as const },
  { code: 'GGXCNL_NGDP', label: 'Saldo fiscal (% PIB)',   unit: '%',      kind: 'pct' as const },
]

async function imfFetch(path: string): Promise<any> {
  try {
    const r = await fetch(`${IMF_API}${path}`, {
      headers: {
        Accept: 'application/json',
        // IMF bloquea User-Agent default de fetch en Vercel functions (HTTP 403).
        // Browser UA es aceptado.
        'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0; +https://politeia-visual-oscar.vercel.app)',
      },
      next: { revalidate: 86400 },
    } as RequestInit)
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

function fmt(value: number | null, kind: 'pct' | 'usd' | 'usd_bn'): string {
  if (value == null || isNaN(value)) return '—'
  if (kind === 'pct') return fmtPct(value)
  if (kind === 'usd_bn') return fmtUsd(value * 1e9)
  return fmtUsd(value)
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/imf/health
  if (action === 'health') {
    const probe = await imfFetch('/indicators')
    return NextResponse.json({
      ok: !probe.error,
      auth_required: false,
      probe_status: probe.error ?? 'live',
      n_indicators: probe?.indicators ? Object.keys(probe.indicators).length : null,
    })
  }

  // /api/imf/indicators
  if (action === 'indicators') {
    const data = await imfFetch('/indicators')
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF DataMapper', data.error),
      })
    }
    const items = Object.entries(data.indicators || {}).map(([code, meta]: [string, any]) => ({
      code,
      label: meta?.label,
      description: meta?.description?.slice(0, 200),
      source: meta?.source,
      unit: meta?.unit,
      dataset: meta?.dataset,
      last_modified: meta?.['last-modified'],
    }))
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'IMF DataMapper'),
      n_items: items.length,
      items,
    })
  }

  // /api/imf/spain-overview
  if (action === 'spain-overview') {
    const year = url.searchParams.get('year') || String(new Date().getFullYear())
    const yearNum = parseInt(year, 10)
    // Fetch en paralelo los 8 indicadores clave
    const promises = SPAIN_KEY_INDICATORS.map((ind) => imfFetch(`/${ind.code}/ESP`))
    const responses = await Promise.all(promises)

    const indicators = SPAIN_KEY_INDICATORS.map((meta, i) => {
      const r = responses[i]
      if (r.error) {
        return {
          code: meta.code,
          label: meta.label,
          unit: meta.unit,
          error: r.error,
        }
      }
      const spainData = r?.values?.[meta.code]?.ESP || {}
      const currentValue = spainData[String(yearNum)] ?? null
      // Forecast +5 años
      const forecast: { year: number; value: number | null }[] = []
      for (let y = yearNum + 1; y <= yearNum + 5; y++) {
        forecast.push({ year: y, value: spainData[String(y)] ?? null })
      }
      // Historia últimos 5 años
      const history: { year: number; value: number | null }[] = []
      for (let y = yearNum - 5; y < yearNum; y++) {
        history.push({ year: y, value: spainData[String(y)] ?? null })
      }
      return {
        code: meta.code,
        label: meta.label,
        unit: meta.unit,
        current_value: currentValue,
        current_fmt: fmt(currentValue, meta.kind),
        history,
        forecast,
      }
    })

    return NextResponse.json({
      ok: true,
      country: 'ESP',
      year: yearNum,
      data_quality: quality('live', 'IMF DataMapper · WEO'),
      indicators,
    })
  }

  // /api/imf/weo-forecast
  if (action === 'weo-forecast') {
    const indicator = url.searchParams.get('indicator') || 'NGDP_RPCH'
    const countries = (url.searchParams.get('countries') || 'ESP,DEU,FRA,ITA,USA,CHN').split(',')
    const data = await imfFetch(`/${indicator}`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF DataMapper', data.error),
      })
    }
    const indicatorData = data?.values?.[indicator] || {}
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 7 }, (_, i) => currentYear - 1 + i)
    const series = countries.map((iso) => {
      const countryData = indicatorData[iso] || {}
      return {
        iso,
        values: years.map((y) => ({ year: y, value: countryData[String(y)] ?? null })),
      }
    })
    return NextResponse.json({
      ok: true,
      indicator,
      countries,
      years,
      data_quality: quality('live', 'IMF DataMapper · WEO Forecast'),
      series,
    })
  }

  // /api/imf/country
  if (action === 'country') {
    const iso = url.searchParams.get('iso') || 'ESP'
    const indicator = url.searchParams.get('indicator') || 'NGDP_RPCH'
    const data = await imfFetch(`/${indicator}/${iso}`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'IMF DataMapper', data.error),
      })
    }
    const countryData = data?.values?.[indicator]?.[iso] || {}
    const series = Object.entries(countryData)
      .map(([y, v]) => ({ year: Number(y), value: v as number | null }))
      .sort((a, b) => a.year - b.year)
    return NextResponse.json({
      ok: true,
      iso,
      indicator,
      data_quality: quality('live', 'IMF DataMapper'),
      n_points: series.length,
      series,
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/imf/health',
        'GET /api/imf/spain-overview?year=2024',
        'GET /api/imf/weo-forecast?indicator=NGDP_RPCH&countries=ESP,DEU,FRA,USA,CHN',
        'GET /api/imf/country?iso=ESP&indicator=NGDP_RPCH',
        'GET /api/imf/indicators',
      ],
    },
    { status: 404 },
  )
}
