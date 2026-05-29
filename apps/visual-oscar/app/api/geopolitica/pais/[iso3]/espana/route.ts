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
import { SPAIN_PRESENCE } from '@/lib/geopolitica/spain-presence-data'

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
    // G22 batch 4 · usa SPAIN_PRESENCE seed (cubre 35+ paises top destinos ES)
    trade: (() => {
      const sp = SPAIN_PRESENCE[iso3]
      if (sp && (sp.exports_2024_eur_bn !== null || sp.imports_2024_eur_bn !== null)) {
        const balance = (sp.exports_2024_eur_bn ?? 0) - (sp.imports_2024_eur_bn ?? 0)
        return {
          available: true,
          pending: false,
          exports_2024_eur_bn: sp.exports_2024_eur_bn,
          imports_2024_eur_bn: sp.imports_2024_eur_bn,
          balance_eur_bn: Math.round(balance * 10) / 10,
          source: 'DataComex/ICEX 2024 acumulado',
          note: 'Exports = España → país · Imports = España ← país · balance positivo = superávit ES',
        }
      }
      return {
        available: false,
        pending: true,
        note: 'Datos bilaterales DataComex/ICEX disponibles solo para top 35 destinos ES · este pais sin presencia material.',
      }
    })(),
    aod_iati: (() => {
      const sp = SPAIN_PRESENCE[iso3]
      // AOD es proxy via cooperation_intensity: cervantes_centers + embassy + military_mission
      if (sp && (sp.cervantes_centers > 0 || sp.embassy)) {
        return {
          available: true,
          pending: false,
          embassy: sp.embassy,
          consulate_count: sp.consulate_count,
          icex_office: sp.icex_office,
          cervantes_centers: sp.cervantes_centers,
          military_mission: sp.military_mission,
          cooperation_score: (sp.embassy ? 20 : 0) + (sp.cervantes_centers * 8) + sp.consulate_count * 5 + (sp.icex_office ? 10 : 0) + (sp.military_mission ? 15 : 0),
          source: 'MAEC oficial + Instituto Cervantes + Defensa.gob + ICEX',
          note: 'Score de cooperación derivado de presencia institucional (max 100)',
        }
      }
      return {
        available: false,
        pending: true,
        note: 'Sin presencia institucional España documentada para este pais.',
      }
    })(),
    fdi_datainvex: (() => {
      const sp = SPAIN_PRESENCE[iso3]
      if (sp && sp.fdi_stock_eur_bn !== null) {
        return {
          available: true,
          pending: false,
          fdi_stock_eur_bn: sp.fdi_stock_eur_bn,
          relevance: sp.fdi_stock_eur_bn > 20 ? 'top_destination' : sp.fdi_stock_eur_bn > 5 ? 'significativa' : 'limitada',
          source: 'DataInvex Mincotur · stock IED España 2023 (aprox)',
          note: 'Stock IED = inversión española directa acumulada en bn EUR',
        }
      }
      return {
        available: false,
        pending: true,
        note: 'Stock IED no documentado para este pais · top destinos cubre ~92% del stock total.',
      }
    })(),
    fetched_at: startedAt,
    _meta: {
      sources: [
        'IBEX-35 dataset curado (25 empresas)',
        'Finnhub cotizaciones live',
        'SPAIN_PRESENCE seed (MAEC + Cervantes + Defensa + ICEX + DataComex + DataInvex)',
      ],
      pending: ['UN Comtrade HS-detailed bilateral', 'IATI AECID proyectos específicos'],
      cache_ttl_seconds: 900,
      note: 'Empresas con bandera CRITICA · país representa >10% revenue o filial estructural',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' },
  })
}
