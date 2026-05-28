/**
 * /api/geopolitica/pais/[iso3]/espana · Sprint GEO-RP C3
 *
 * Sub-tab 5 Exposición España · qué se juega España con este país:
 *   - Empresas IBEX con presencia (dataset curado IBEX_COMPANIES)
 *   - Cotizaciones en tiempo real Finnhub (batch · top 10 empresas)
 *   - Empresas con presencia CRÍTICA flagged
 *   - Comtrade bilateral · placeholder (requiere API más compleja con HS codes)
 *   - IATI AECID · placeholder (proyectos cooperación)
 *
 * Cache: s-maxage=900 (15 min · cotizaciones cambian).
 */
import { NextRequest, NextResponse } from 'next/server'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'
import { getCompaniesInCountry, getCompanySymbols, IBEX_COMPANIES_COUNT } from '@/lib/geopolitica/ibex-presence'
import { getQuotesBatch } from '@/lib/finnhub/client'

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

  // Empresas IBEX con presencia
  const allCompanies = getCompaniesInCountry(iso3)
  const criticalCompanies = getCompaniesInCountry(iso3, true)

  // Cotizaciones para top 10 (no saturar Finnhub)
  const topSymbols = getCompanySymbols(allCompanies.slice(0, 10))
  const quotes = topSymbols.length > 0
    ? await getQuotesBatch(topSymbols).catch(() => ({} as Record<string, any>))
    : {}

  // Construir respuesta empresa por empresa
  const companiesWithQuotes = allCompanies.map((c) => {
    const q = quotes[c.symbol] || null
    return {
      symbol: c.symbol,
      name: c.name,
      sector: c.sector,
      countries_count: c.countries.length,
      is_critical: c.critical_countries.includes(iso3),
      quote: q ? {
        current_price: q.current_price,
        percent_change: q.percent_change,
        change: q.change,
        prev_close: q.prev_close,
      } : null,
    }
  })

  return NextResponse.json({
    ok: true,
    iso3,
    country_name: coord.name_es,
    companies: {
      total: allCompanies.length,
      critical: criticalCompanies.length,
      data: companiesWithQuotes,
      catalog_size: IBEX_COMPANIES_COUNT,
    },
    trade: {
      available: false,
      pending: true,
      note: 'UN Comtrade bilateral España↔país requiere endpoint dedicado con cache · pendiente sprint posterior',
    },
    aod_iati: {
      available: false,
      pending: true,
      note: 'IATI AECID · proyectos cooperación España pendiente',
    },
    fdi_datainvex: {
      available: false,
      pending: true,
      note: 'DataInvex Ministerio Comercio · inversión directa España pendiente · web scraping',
    },
    fetched_at: startedAt,
    _meta: {
      sources: ['IBEX-35 dataset curado (25 empresas)', 'Finnhub cotizaciones live'],
      pending: ['UN Comtrade bilateral', 'IATI AECID', 'DataInvex FDI'],
      cache_ttl_seconds: 900,
      note: 'Empresas con bandera CRITICA · país representa >10% revenue o filial estructural',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' },
  })
}
