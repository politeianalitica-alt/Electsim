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
import { getCountryMacro } from '@/lib/geopolitica/country-macro-seed'

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
  // G22 batch 4 · enriquecimiento con seed Q1 2026 para top 50
  const macroSeed = getCountryMacro(iso3)

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
    debt_profile: macroSeed ? {
      available: true,
      pending: false,
      bond_10y_yield_pct: macroSeed.bond_10y_yield_pct,
      cds_5y_bps: macroSeed.cds_5y_bps,
      fx_per_usd: macroSeed.fx_per_usd,
      fx_currency: macroSeed.fx_currency,
      reserves_usd_bn: macroSeed.reserves_usd_bn,
      reserves_months_imports: macroSeed.reserves_months_imports,
      // Clasificación de riesgo crediticio derivada
      risk_level: classifyDebtRisk(macroSeed.cds_5y_bps, macroSeed.bond_10y_yield_pct, macroSeed.reserves_months_imports),
      note: 'Indicadores de riesgo soberano · OECD Bond Yields + ECB Reference + IMF SDDS Q1 2026',
    } : {
      available: false,
      pending: true,
      note: 'Perfil deuda disponible solo para top 50 economías · este país pendiente seed.',
    },
    commodities: macroSeed ? {
      available: true,
      pending: false,
      top_exports_hs: macroSeed.top_exports_hs,
      export_hhi: macroSeed.export_hhi,
      dual_use_share_pct: macroSeed.dual_use_share_pct,
      concentration_risk: macroSeed.export_hhi !== null && macroSeed.export_hhi > 2500 ? 'alta' : macroSeed.export_hhi !== null && macroSeed.export_hhi > 1500 ? 'media' : 'baja',
      note: 'Top productos HS2 · UN Comtrade 2023 · HHI Herfindahl-Hirschman · share doble uso HS 93',
    } : {
      available: false,
      pending: true,
      note: 'Mapping país→commodity principal disponible solo para top 50 economías.',
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

/**
 * G22 batch 4 · clasificación de riesgo crediticio soberano.
 * Niveles según matriz CDS + bono 10y + reservas:
 *   - investment_grade: CDS < 100bps + bono < 5% + reservas > 3m
 *   - speculative: CDS 100-300bps · bono 5-10% · reservas 1.5-3m
 *   - distressed: CDS > 300bps · bono > 10% · reservas < 1.5m
 *   - default_risk: CDS > 800bps (Ucrania, Argentina, Pakistán típicos)
 */
function classifyDebtRisk(
  cds: number | null,
  bond: number | null,
  reservesMonths: number | null,
): 'investment_grade' | 'speculative' | 'distressed' | 'default_risk' | 'unknown' {
  if (cds === null && bond === null && reservesMonths === null) return 'unknown'
  if (cds !== null && cds > 800) return 'default_risk'
  if (cds !== null && cds > 300) return 'distressed'
  if (bond !== null && bond > 12) return 'distressed'
  if (reservesMonths !== null && reservesMonths < 1.5) return 'distressed'
  if (cds !== null && cds > 100) return 'speculative'
  if (bond !== null && bond > 6) return 'speculative'
  return 'investment_grade'
}
