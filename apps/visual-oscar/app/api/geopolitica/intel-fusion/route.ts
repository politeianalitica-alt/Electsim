/**
 * /api/geopolitica/intel-fusion · Sprint G24
 *
 * Endpoint unificado que combina TODAS las fuentes nuevas:
 *   - UCDP (Uppsala Conflict Data Program)
 *   - GCRI (Global Conflict Risk Index · JRC/EU)
 *   - Freedom House + V-Dem detallado
 *   - CFR Global Conflict Tracker
 *   - Intel Briefings (Janes/Oxford Analytica/IISS/CSIS/Atlantic Council)
 *
 * Query params:
 *   ?iso3=USA     · perfil país completo
 *   ?region=Asia  · filter por región
 *   ?topic=defense · filter por tema
 *
 * Cache: s-maxage=7200 (2h).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCountrySecuritySummary } from '@/lib/ucdp/client'
import { getGcriEntry, getTopRiskCountries } from '@/lib/geopolitica/gcri-seed'
import { getFreedomHouse, getVdemDetailed } from '@/lib/geopolitica/freedom-house-seed'
import { getConflictsByCountry, getCriticalConflicts, CFR_CONFLICTS } from '@/lib/geopolitica/cfr-conflicts-seed'
import { getBriefingsByCountry, getRecentBriefings, INTEL_BRIEFINGS } from '@/lib/geopolitica/intel-briefings-seed'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const iso3 = req.nextUrl.searchParams.get('iso3')?.toUpperCase()
  const region = req.nextUrl.searchParams.get('region')
  const startedAt = new Date().toISOString()

  // Modo país específico
  if (iso3) {
    const coord = COUNTRY_COORDS[iso3]
    if (!coord) {
      return NextResponse.json({ ok: false, error: `iso3_unknown · ${iso3}` }, { status: 404 })
    }

    // UCDP tarda (live API) · mejor en parallel con fallbacks
    const [ucdpSummary, gcri, freedom, vdem, cfrConflicts, briefings] = await Promise.all([
      getCountrySecuritySummary(coord.name_en).catch(() => null),
      Promise.resolve(getGcriEntry(iso3)),
      Promise.resolve(getFreedomHouse(iso3)),
      Promise.resolve(getVdemDetailed(iso3)),
      Promise.resolve(getConflictsByCountry(iso3)),
      Promise.resolve(getBriefingsByCountry(iso3)),
    ])

    return NextResponse.json({
      ok: true,
      iso3,
      country_name: coord.name_es,
      ucdp: ucdpSummary ?? { ok: false, source: 'UCDP API timeout/error · ver ucdpapi.pcr.uu.se' },
      gcri,
      freedom_house: freedom,
      vdem_detailed: vdem,
      cfr_conflicts: cfrConflicts,
      intel_briefings: briefings,
      fetched_at: startedAt,
      _meta: {
        sources: [
          'UCDP REST API · ucdpapi.pcr.uu.se',
          'GCRI · JRC/EU Joint Research Centre 2025',
          'Freedom in the World 2024 · Freedom House',
          'V-Dem Liberal Democracy Index v15',
          'CFR Global Conflict Tracker · cfr.org',
          'Janes Defence + Oxford Analytica + IISS + CSIS + Atlantic Council briefings',
        ],
        cache_ttl_seconds: 7200,
      },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=21600' },
    })
  }

  // Modo global · todos los riesgos
  return NextResponse.json({
    ok: true,
    top_risk_countries_gcri: getTopRiskCountries(15),
    critical_conflicts: getCriticalConflicts(),
    all_conflicts: CFR_CONFLICTS,
    recent_briefings: getRecentBriefings(10),
    total_briefings_count: INTEL_BRIEFINGS.length,
    fetched_at: startedAt,
    _meta: {
      sources: [
        'GCRI · JRC/EU 22 indicadores',
        'CFR Global Conflict Tracker · 14 conflictos críticos',
        'Intel briefings curados: Janes/Oxford Analytica/IISS/CSIS/Atlantic Council/RUSI/CFR Foreign Affairs',
      ],
      cache_ttl_seconds: 7200,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=21600' },
  })
}
