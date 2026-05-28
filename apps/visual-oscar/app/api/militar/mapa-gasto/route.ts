/**
 * /api/militar/mapa-gasto · Sprint GEO-MIL C4
 *
 * Mapa mundial de gasto militar por país combinando:
 *   - SIPRI 2024 (60 países)
 *   - V-Dem + COUNTRY_COORDS para complementar metadatos
 *
 * Cache: s-maxage=604800 (7 días · datos anuales).
 */
import { NextResponse } from 'next/server'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'
import { getSipriEntry } from '@/lib/geopolitica/sipri-data'
import { getCapabilityScore } from '@/lib/geopolitica/iiss-capabilities'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

interface CountryMilex {
  iso3: string
  name_es: string
  iso2: string
  lat: number
  lon: number
  region: string
  milex_usd_bn: number | null
  milex_pct_gdp: number | null
  change_pct_2022: number | null
  world_rank: number | null
  capability_score: number | null
}

export async function GET() {
  const startedAt = new Date().toISOString()

  const countries: CountryMilex[] = []
  for (const [iso3, coord] of Object.entries(COUNTRY_COORDS)) {
    const sipri = getSipriEntry(iso3)
    const cap = getCapabilityScore(iso3)
    countries.push({
      iso3,
      name_es: coord.name_es,
      iso2: coord.iso2,
      lat: coord.lat,
      lon: coord.lon,
      region: coord.region,
      milex_usd_bn: sipri?.milex_usd_bn ?? null,
      milex_pct_gdp: sipri?.milex_pct_gdp ?? null,
      change_pct_2022: sipri?.change_vs_2022_pct ?? null,
      world_rank: sipri?.world_rank ?? null,
      capability_score: cap,
    })
  }

  // Filtrar solo países con SIPRI data para el mapa
  const withMilex = countries.filter((c) => c.milex_usd_bn !== null)

  // Summary
  const totalUsdBn = withMilex.reduce((s, c) => s + (c.milex_usd_bn || 0), 0)
  const above2pct = withMilex.filter((c) => (c.milex_pct_gdp || 0) >= 2.0).length

  return NextResponse.json({
    ok: true,
    countries: withMilex,
    countries_all: countries,
    summary: {
      countries_with_data: withMilex.length,
      total_milex_usd_bn: Math.round(totalUsdBn),
      countries_above_2pct_gdp: above2pct,
    },
    fetched_at: startedAt,
    _meta: {
      sources: [
        { name: 'SIPRI Military Expenditure 2024', role: 'gasto USD/PIB' },
        { name: 'IISS Military Balance 2024', role: 'capability_score (top 50)' },
      ],
      cache_ttl_seconds: 604800,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000' },
  })
}
