/**
 * /api/diplomacia/sanciones-mapa · Sprint GEO-DIP C1
 *
 * Mapa global con scoring por país de:
 *   - Intensidad bilateral con España · tono GDELT 90d (placeholder: usa /irc)
 *   - Régimen sanciones · número entidades sancionadas por país (OpenSanctions)
 *   - Polarización AGNU · alignment con bloque occidental
 *
 * Cache: s-maxage=3600 (1h).
 */
import { NextResponse } from 'next/server'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'
import { getAlignmentWest, AGNU_COUNTRIES_COUNT } from '@/lib/geopolitica/agnu-voting'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

interface CountryDiplo {
  iso3: string; name_es: string; iso2: string
  lat: number; lon: number; region: string
  alignment_west: number | null         // -100..+100 AGNU
  sanctions_count_estimate: 'none' | 'low' | 'medium' | 'high' | 'pariah' | null
  has_sanctions: boolean
}

// Países con régimenes de sanciones conocidos (manual · refinar con OpenSanctions fetch on-demand)
const SANCTIONS_PROFILE: Record<string, CountryDiplo['sanctions_count_estimate']> = {
  RUS: 'pariah', PRK: 'pariah', IRN: 'pariah', SYR: 'pariah',
  BLR: 'high', VEN: 'high', MMR: 'high', CUB: 'high', AFG: 'high',
  SDN: 'high', NIC: 'medium', ZWE: 'medium', LBY: 'medium', YEM: 'medium',
  CHN: 'medium', SAU: 'low', PAK: 'low', ETH: 'low', MLI: 'low', BFA: 'low', NER: 'low',
}

export async function GET() {
  const startedAt = new Date().toISOString()

  const countries: CountryDiplo[] = []
  for (const [iso3, coord] of Object.entries(COUNTRY_COORDS)) {
    const sanctions = SANCTIONS_PROFILE[iso3] ?? 'none'
    countries.push({
      iso3, name_es: coord.name_es, iso2: coord.iso2,
      lat: coord.lat, lon: coord.lon, region: coord.region,
      alignment_west: getAlignmentWest(iso3),
      sanctions_count_estimate: sanctions,
      has_sanctions: sanctions !== 'none' && sanctions !== null,
    })
  }

  const summary = {
    total: countries.length,
    with_sanctions: countries.filter((c) => c.has_sanctions).length,
    pariah_states: countries.filter((c) => c.sanctions_count_estimate === 'pariah').length,
    western_aligned: countries.filter((c) => (c.alignment_west ?? 0) > 50).length,
    eastern_aligned: countries.filter((c) => (c.alignment_west ?? 0) < -30).length,
    non_aligned: countries.filter((c) => c.alignment_west !== null && Math.abs(c.alignment_west) <= 30).length,
    agnu_coverage: AGNU_COUNTRIES_COUNT,
  }

  return NextResponse.json({
    ok: true,
    countries,
    summary,
    fetched_at: startedAt,
    _meta: {
      sources: [
        { name: 'AGNU Voting Records · Harvard Dataverse', role: 'alignment_west · 10 resoluciones 2022-2024' },
        { name: 'OpenSanctions · estimación cualitativa', role: 'sanctions_count_estimate · detalle on-demand por país' },
      ],
      cache_ttl_seconds: 3600,
      note: 'Mapa con dataset estático seed · OpenSanctions full counts vía /pais/[iso3]/sanciones (TODO)',
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=10800' },
  })
}
