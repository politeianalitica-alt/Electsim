/**
 * /api/ember/[...path] · Ember Energy · climate & electricity data.
 *
 * Fuente: api.ember-energy.org · think-tank energético independiente
 * con dataset abierto de generación eléctrica, demanda, intensidad
 * de carbono y mix renovable por país (~200 países, desde 2000,
 * granularidad anual y mensual).
 *
 * Auth: API key como query param `api_key=...` (free tier 1000/día).
 *
 * Rutas:
 *   GET /api/ember/spain-snapshot
 *     → Snapshot eléctrico España: mix actual (renovables vs fósiles),
 *       generación última mensualidad por fuente, intensidad de carbono,
 *       demanda, ranking EU.
 *
 *   GET /api/ember/eu-comparison?metric=share_renewable
 *     → Comparativa España vs UE-27 + top/bottom países por métrica.
 *
 *   GET /api/ember/generation?entity=Spain&granularity=monthly|yearly
 *     → Serie temporal de generación por fuente.
 *
 *   GET /api/ember/carbon-intensity?entity=Spain
 *     → Intensidad de carbono (gCO2/kWh) última mensualidad + serie.
 *
 *   GET /api/ember/health
 *     → Diagnóstico · ¿API key configurada?, ¿endpoint responde?
 *
 * Cache HTTP 12h · datos mensuales/anuales, no necesita ser realtime.
 */
import { NextResponse } from 'next/server'

export const revalidate = 43200 // 12h

const EMBER_API = 'https://api.ember-energy.org'

// Fuentes de generación que tracking · alineado con Ember taxonomy
const GENERATION_SERIES = [
  'coal', 'gas', 'oil', 'nuclear', 'hydro',
  'wind', 'solar', 'bioenergy', 'other_renewables', 'other_fossil',
] as const

// Países UE-27 para comparativas
const EU27 = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
  'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg',
  'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia',
  'Slovenia', 'Spain', 'Sweden',
]

function quality(t: 'live' | 'cache' | 'missing' | 'rate_limited', name: string, note?: string) {
  return { source_type: t, source_name: name, ...(note ? { note } : {}) }
}

async function emberFetch(path: string, params: Record<string, string> = {}): Promise<any> {
  const apiKey = process.env.EMBER_API_KEY
  if (!apiKey) {
    return { error: 'no_api_key' }
  }
  const qs = new URLSearchParams({ ...params, api_key: apiKey })
  try {
    const r = await fetch(`${EMBER_API}${path}?${qs}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 43200 },
    } as RequestInit)
    if (r.status === 429) return { error: 'rate_limited' }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

// Suma de fuentes renovables · alinea con Ember "clean" definition
function renewableShare(byFuel: Record<string, number>): number {
  const renew = (byFuel.wind || 0) + (byFuel.solar || 0) + (byFuel.hydro || 0) +
                (byFuel.bioenergy || 0) + (byFuel.other_renewables || 0)
  const total = Object.values(byFuel).reduce((a, b) => a + b, 0)
  return total > 0 ? (renew / total) * 100 : 0
}

function cleanShare(byFuel: Record<string, number>): number {
  // Clean = renewables + nuclear (definición Ember)
  const clean = (byFuel.wind || 0) + (byFuel.solar || 0) + (byFuel.hydro || 0) +
                (byFuel.bioenergy || 0) + (byFuel.other_renewables || 0) +
                (byFuel.nuclear || 0)
  const total = Object.values(byFuel).reduce((a, b) => a + b, 0)
  return total > 0 ? (clean / total) * 100 : 0
}

function fossilShare(byFuel: Record<string, number>): number {
  const fossil = (byFuel.coal || 0) + (byFuel.gas || 0) + (byFuel.oil || 0) +
                 (byFuel.other_fossil || 0)
  const total = Object.values(byFuel).reduce((a, b) => a + b, 0)
  return total > 0 ? (fossil / total) * 100 : 0
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/ember/health
  if (action === 'health') {
    const hasKey = !!process.env.EMBER_API_KEY
    if (!hasKey) {
      return NextResponse.json({
        ok: false,
        has_api_key: false,
        hint: 'Configura EMBER_API_KEY · ember-energy.org/data/api',
      })
    }
    // Test ping con un país pequeño
    const probe = await emberFetch('/v1/electricity-generation/yearly', {
      entity: 'Spain',
      start_date: '2023',
      end_date: '2023',
    })
    return NextResponse.json({
      ok: !probe.error,
      has_api_key: true,
      probe_status: probe.error ?? 'live',
      auth_method: 'api_key_query',
    })
  }

  // /api/ember/spain-snapshot
  if (action === 'spain-snapshot') {
    // Último año disponible + mensualidad más reciente
    const currentYear = new Date().getFullYear()
    const lastYear = currentYear - 1

    const [yearly, monthly, demand, carbon] = await Promise.all([
      emberFetch('/v1/electricity-generation/yearly', {
        entity: 'Spain',
        start_date: String(lastYear - 4),
        end_date: String(lastYear),
      }),
      emberFetch('/v1/electricity-generation/monthly', {
        entity: 'Spain',
        start_date: `${currentYear - 1}-01`,
      }),
      emberFetch('/v1/electricity-demand/yearly', {
        entity: 'Spain',
        start_date: String(lastYear - 4),
        end_date: String(lastYear),
      }),
      emberFetch('/v1/power-sector-emissions/monthly', {
        entity: 'Spain',
        start_date: `${currentYear - 1}-01`,
      }),
    ])

    const anyError = yearly.error || monthly.error
    if (anyError) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'Ember Energy', anyError),
        error: anyError,
      })
    }

    // Procesa última mensualidad: agrupa por fuel
    const monthlyData: any[] = monthly.data || []
    const latestMonth = monthlyData.length
      ? monthlyData.reduce((a, b) => (a.date > b.date ? a : b)).date
      : null
    const latestMonthRows = monthlyData.filter((r) => r.date === latestMonth)
    const byFuelLatest: Record<string, number> = {}
    for (const r of latestMonthRows) {
      const f = (r.series || r.fuel || '').toLowerCase()
      byFuelLatest[f] = (byFuelLatest[f] || 0) + (Number(r.generation_twh) || 0)
    }

    // Procesa último año anual
    const yearlyData: any[] = yearly.data || []
    const latestYear = yearlyData.length
      ? Math.max(...yearlyData.map((r) => Number(r.date) || 0))
      : null
    const latestYearRows = yearlyData.filter((r) => Number(r.date) === latestYear)
    const byFuelYear: Record<string, number> = {}
    for (const r of latestYearRows) {
      const f = (r.series || r.fuel || '').toLowerCase()
      byFuelYear[f] = (byFuelYear[f] || 0) + (Number(r.generation_twh) || 0)
    }

    // Serie histórica renovable %
    const yearsMap: Record<number, Record<string, number>> = {}
    for (const r of yearlyData) {
      const y = Number(r.date)
      const f = (r.series || r.fuel || '').toLowerCase()
      if (!yearsMap[y]) yearsMap[y] = {}
      yearsMap[y][f] = (yearsMap[y][f] || 0) + (Number(r.generation_twh) || 0)
    }
    const renewableTrend = Object.entries(yearsMap)
      .map(([y, fuels]) => ({
        year: Number(y),
        renewable_pct: Number(renewableShare(fuels).toFixed(1)),
        clean_pct: Number(cleanShare(fuels).toFixed(1)),
        fossil_pct: Number(fossilShare(fuels).toFixed(1)),
        total_twh: Number(Object.values(fuels).reduce((a, b) => a + b, 0).toFixed(1)),
      }))
      .sort((a, b) => a.year - b.year)

    // Carbon intensity última mensualidad
    const carbonData: any[] = carbon?.data || []
    const latestCarbonRow = carbonData.length
      ? carbonData.reduce((a, b) => (a.date > b.date ? a : b))
      : null

    // Demanda última año
    const demandData: any[] = demand?.data || []
    const latestDemand = demandData.length
      ? demandData.reduce((a, b) => (Number(a.date) > Number(b.date) ? a : b))
      : null

    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'Ember Energy'),
      latest_month: latestMonth,
      latest_year: latestYear,
      mix_latest_month: {
        period: latestMonth,
        by_fuel_twh: byFuelLatest,
        renewable_pct: Number(renewableShare(byFuelLatest).toFixed(1)),
        clean_pct: Number(cleanShare(byFuelLatest).toFixed(1)),
        fossil_pct: Number(fossilShare(byFuelLatest).toFixed(1)),
        total_twh: Number(Object.values(byFuelLatest).reduce((a, b) => a + b, 0).toFixed(2)),
      },
      mix_latest_year: {
        period: latestYear,
        by_fuel_twh: byFuelYear,
        renewable_pct: Number(renewableShare(byFuelYear).toFixed(1)),
        clean_pct: Number(cleanShare(byFuelYear).toFixed(1)),
        fossil_pct: Number(fossilShare(byFuelYear).toFixed(1)),
        total_twh: Number(Object.values(byFuelYear).reduce((a, b) => a + b, 0).toFixed(1)),
      },
      renewable_trend: renewableTrend,
      carbon_intensity: latestCarbonRow ? {
        period: latestCarbonRow.date,
        gco2_per_kwh: Number(latestCarbonRow.emissions_intensity_gco2_per_kwh || latestCarbonRow.value || 0),
      } : null,
      demand: latestDemand ? {
        period: latestDemand.date,
        twh: Number(latestDemand.demand_twh || latestDemand.value || 0),
      } : null,
    })
  }

  // /api/ember/eu-comparison?metric=share_renewable
  if (action === 'eu-comparison') {
    const metric = url.searchParams.get('metric') || 'share_renewable'
    const currentYear = new Date().getFullYear()
    const lastYear = currentYear - 1

    // Fetch último año todos los EU27 en una sola llamada (entity multi)
    const data = await emberFetch('/v1/electricity-generation/yearly', {
      entity: EU27.join(','),
      start_date: String(lastYear),
      end_date: String(lastYear),
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'Ember Energy', data.error),
        error: data.error,
      })
    }
    const rows: any[] = data.data || []
    const byCountry: Record<string, Record<string, number>> = {}
    for (const r of rows) {
      const c = r.entity || r.country
      const f = (r.series || r.fuel || '').toLowerCase()
      if (!byCountry[c]) byCountry[c] = {}
      byCountry[c][f] = (byCountry[c][f] || 0) + (Number(r.generation_twh) || 0)
    }
    const ranking = Object.entries(byCountry)
      .map(([country, fuels]) => ({
        country,
        renewable_pct: Number(renewableShare(fuels).toFixed(1)),
        clean_pct: Number(cleanShare(fuels).toFixed(1)),
        fossil_pct: Number(fossilShare(fuels).toFixed(1)),
        total_twh: Number(Object.values(fuels).reduce((a, b) => a + b, 0).toFixed(1)),
      }))
      .sort((a, b) => {
        if (metric === 'share_clean') return b.clean_pct - a.clean_pct
        if (metric === 'share_fossil') return a.fossil_pct - b.fossil_pct // menor = mejor
        return b.renewable_pct - a.renewable_pct
      })

    const spainPos = ranking.findIndex((r) => r.country === 'Spain') + 1
    const euAvg = {
      renewable_pct: Number(
        (ranking.reduce((a, b) => a + b.renewable_pct, 0) / ranking.length).toFixed(1),
      ),
      clean_pct: Number(
        (ranking.reduce((a, b) => a + b.clean_pct, 0) / ranking.length).toFixed(1),
      ),
      fossil_pct: Number(
        (ranking.reduce((a, b) => a + b.fossil_pct, 0) / ranking.length).toFixed(1),
      ),
    }

    return NextResponse.json({
      ok: true,
      year: lastYear,
      metric,
      data_quality: quality('live', 'Ember Energy'),
      eu_average: euAvg,
      spain_position: spainPos,
      spain_data: ranking.find((r) => r.country === 'Spain') || null,
      ranking,
    })
  }

  // /api/ember/generation?entity=Spain&granularity=monthly|yearly
  if (action === 'generation') {
    const entity = url.searchParams.get('entity') || 'Spain'
    const granularity = url.searchParams.get('granularity') || 'yearly'
    const startDate = url.searchParams.get('start_date') ||
      (granularity === 'monthly' ? '2023-01' : '2015')
    const data = await emberFetch(`/v1/electricity-generation/${granularity}`, {
      entity,
      start_date: startDate,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'Ember Energy', data.error),
        error: data.error,
      })
    }
    return NextResponse.json({
      ok: true,
      entity,
      granularity,
      data_quality: quality('live', 'Ember Energy'),
      n_rows: (data.data || []).length,
      items: data.data || [],
    })
  }

  // /api/ember/carbon-intensity?entity=Spain
  if (action === 'carbon-intensity') {
    const entity = url.searchParams.get('entity') || 'Spain'
    const data = await emberFetch('/v1/power-sector-emissions/monthly', {
      entity,
      start_date: `${new Date().getFullYear() - 2}-01`,
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'Ember Energy', data.error),
        error: data.error,
      })
    }
    return NextResponse.json({
      ok: true,
      entity,
      data_quality: quality('live', 'Ember Energy'),
      n_rows: (data.data || []).length,
      items: data.data || [],
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/ember/health',
        'GET /api/ember/spain-snapshot',
        'GET /api/ember/eu-comparison?metric=share_renewable|share_clean|share_fossil',
        'GET /api/ember/generation?entity=Spain&granularity=monthly|yearly',
        'GET /api/ember/carbon-intensity?entity=Spain',
      ],
    },
    { status: 404 },
  )
}
