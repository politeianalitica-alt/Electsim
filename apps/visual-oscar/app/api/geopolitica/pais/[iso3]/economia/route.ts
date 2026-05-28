/**
 * /api/geopolitica/pais/[iso3]/economia · Sprint GEO-RP C3
 *
 * Sub-tab 3 Economía & Deuda · combina:
 *   - WorldBank API: 6 indicadores macro (PIB%, IPC%, paro%, CA%PIB, deuda%PIB, reservas meses)
 *   - SIPRI: gasto militar como % PIB (proxy "armarse a crédito")
 *   - Placeholders: JEDH perfil vencimientos · IMF Fiscal break-even commodities
 *
 * Cache: s-maxage=86400 (1 día · datos anuales WB).
 */
import { NextRequest, NextResponse } from 'next/server'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'
import { fetchCountryMacro, latestWBValue } from '@/lib/worldbank/client'
import { getSipriEntry } from '@/lib/geopolitica/sipri-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(_req: NextRequest, { params }: { params: { iso3: string } }) {
  const iso3 = params.iso3.toUpperCase()
  const coord = COUNTRY_COORDS[iso3]
  if (!coord) {
    return NextResponse.json({ ok: false, error: `iso3_unknown · ${iso3}` }, { status: 404 })
  }
  const startedAt = new Date().toISOString()

  // Wb macro · 1 fetch que devuelve 6 series anuales 2015-2025
  const macro = await fetchCountryMacro(iso3)
  const sipri = getSipriEntry(iso3)

  // KPIs · último valor disponible de cada serie
  const kpis = {
    gdp_growth_pct: latestWBValue(macro.indicators.gdp_growth_pct),
    inflation_pct: latestWBValue(macro.indicators.inflation_pct),
    unemployment_pct: latestWBValue(macro.indicators.unemployment_pct),
    current_account_pct_gdp: latestWBValue(macro.indicators.current_account_pct_gdp),
    debt_pct_gdp: latestWBValue(macro.indicators.debt_pct_gdp),
    reserves_months_imports: latestWBValue(macro.indicators.reserves_months_imports),
  }

  // Alertas derivadas
  const alerts: string[] = []
  if (kpis.inflation_pct !== null && kpis.inflation_pct > 15) alerts.push('inflación >15% · estrés monetario')
  if (kpis.debt_pct_gdp !== null && kpis.debt_pct_gdp > 100) alerts.push('deuda >100% PIB · sostenibilidad cuestionable')
  if (kpis.reserves_months_imports !== null && kpis.reserves_months_imports < 3) alerts.push('reservas <3 meses · umbral crítico FMI')
  if (kpis.current_account_pct_gdp !== null && kpis.current_account_pct_gdp < -5) alerts.push('CA% PIB <-5% · déficit externo elevado')
  if (sipri && sipri.milex_pct_gdp > 4) alerts.push(`gasto militar ${sipri.milex_pct_gdp}% PIB · alta militarización`)

  return NextResponse.json({
    ok: true,
    iso3,
    country_name: coord.name_es,
    kpis,
    series: macro.indicators,
    sipri_milex: sipri ? {
      pct_gdp: sipri.milex_pct_gdp,
      usd_bn: sipri.milex_usd_bn,
      change_pct_2022: sipri.change_vs_2022_pct ?? null,
      world_rank: sipri.world_rank ?? null,
    } : null,
    alerts,
    debt_profile: {
      available: false,
      pending: true,
      note: 'JEDH perfil vencimientos pendiente · ver datos en jedh.org filtrando por país',
    },
    commodities: {
      available: false,
      pending: true,
      note: 'Mapping país→commodity principal + precios Alpha Vantage pendiente C4',
    },
    fetched_at: startedAt,
    _meta: {
      sources: ['World Bank Open Data API', 'SIPRI Military Expenditure 2024'],
      pending: ['JEDH Joint External Debt', 'Alpha Vantage commodities', 'IMF Fiscal Monitor break-even'],
      cache_ttl_seconds: 86400,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=259200' },
  })
}
