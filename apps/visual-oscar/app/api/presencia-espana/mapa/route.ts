/**
 * /api/presencia-espana/mapa · Sprint GEO-ES C4
 *
 * Mapa global de presencia española · 4 dimensiones togglables:
 *   - economica (FDI stock + exports 2024)
 *   - corporativa (IBEX companies count)
 *   - diplomatica (embajadas + consulados + ICEX + Cervantes + misiones militares)
 *   - aod (placeholder · pendiente IATI integration)
 *
 * Combina dataset SPAIN_PRESENCE + IBEX_COMPANIES.
 * Cache: s-maxage=604800 (7 días).
 */
import { NextResponse } from 'next/server'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'
import { SPAIN_PRESENCE, getSpainPresence, getPresenceScore, SPAIN_PRESENCE_COUNT } from '@/lib/geopolitica/spain-presence-data'
import { getCompaniesInCountry, IBEX_COMPANIES_COUNT } from '@/lib/geopolitica/ibex-presence'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

interface CountryPresence {
  iso3: string; name_es: string; iso2: string
  lat: number; lon: number; region: string
  presence: {
    economica_score: number | null         // 0-100 normalizado
    corporativa_count: number               // # empresas IBEX
    diplomatica: { embassy: boolean; consulates: number; cervantes: number; icex: boolean; military: boolean } | null
    fdi_stock_eur_bn: number | null
    exports_2024_eur_bn: number | null
    imports_2024_eur_bn: number | null
    overall_score: number | null            // ponderado global
  }
}

export async function GET() {
  const startedAt = new Date().toISOString()

  const countries: CountryPresence[] = []
  for (const [iso3, coord] of Object.entries(COUNTRY_COORDS)) {
    const sp = getSpainPresence(iso3)
    const ibex = getCompaniesInCountry(iso3)
    const overall = getPresenceScore(iso3)
    countries.push({
      iso3, name_es: coord.name_es, iso2: coord.iso2,
      lat: coord.lat, lon: coord.lon, region: coord.region,
      presence: {
        economica_score: sp?.fdi_stock_eur_bn !== null && sp ? Math.min(100, Math.round((sp.fdi_stock_eur_bn || 0) / 0.8)) : null,
        corporativa_count: ibex.length,
        diplomatica: sp ? {
          embassy: sp.embassy,
          consulates: sp.consulate_count,
          cervantes: sp.cervantes_centers,
          icex: sp.icex_office,
          military: sp.military_mission,
        } : null,
        fdi_stock_eur_bn: sp?.fdi_stock_eur_bn ?? null,
        exports_2024_eur_bn: sp?.exports_2024_eur_bn ?? null,
        imports_2024_eur_bn: sp?.imports_2024_eur_bn ?? null,
        overall_score: overall,
      },
    })
  }

  const summary = {
    countries_with_presence: countries.filter((c) => c.presence.overall_score !== null).length,
    countries_with_ibex: countries.filter((c) => c.presence.corporativa_count > 0).length,
    countries_with_embassy: countries.filter((c) => c.presence.diplomatica?.embassy).length,
    countries_with_cervantes: countries.filter((c) => (c.presence.diplomatica?.cervantes || 0) > 0).length,
    presence_catalog_size: SPAIN_PRESENCE_COUNT,
    ibex_catalog_size: IBEX_COMPANIES_COUNT,
  }

  return NextResponse.json({
    ok: true,
    countries,
    summary,
    fetched_at: startedAt,
    _meta: {
      sources: [
        { name: 'Dataset curado MAEC + ICEX + Cervantes + Defensa', role: 'presencia diplomática' },
        { name: 'Dataset curado DataInvex 2023', role: 'FDI stock' },
        { name: 'Dataset curado DataComex 2024', role: 'exports/imports' },
        { name: 'IBEX-35 curado', role: 'empresas españolas presencia' },
      ],
      cache_ttl_seconds: 604800,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000' },
  })
}
