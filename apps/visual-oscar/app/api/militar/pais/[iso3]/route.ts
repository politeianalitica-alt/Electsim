/**
 * /api/militar/pais/[iso3] · Sprint GEO-MIL C6
 *
 * Detalle militar completo por país · 5 sub-tabs en una sola respuesta:
 *   A · Presupuesto · SIPRI serie histórica + IISS funding mix (placeholder)
 *   B · Capacidades · IISS Military Balance 2024 (50 países top)
 *   C · Transferencias · placeholder (SIPRI Arms Transfers Database)
 *   D · Alianzas · alliances con status + spain_role
 *   E · Industria · placeholder (SIPRI AIDB + Finnhub para empresas defensa)
 *
 * Cache: s-maxage=86400 (1 día).
 */
import { NextRequest, NextResponse } from 'next/server'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'
import { getSipriEntry } from '@/lib/geopolitica/sipri-data'
import { getIissCapability, getCapabilityScore } from '@/lib/geopolitica/iiss-capabilities'
import { getAlliancesForCountry } from '@/lib/geopolitica/alliances'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

export async function GET(_req: NextRequest, { params }: { params: { iso3: string } }) {
  const iso3 = params.iso3.toUpperCase()
  const coord = COUNTRY_COORDS[iso3]
  if (!coord) {
    return NextResponse.json({ ok: false, error: `iso3_unknown · ${iso3}` }, { status: 404 })
  }
  const startedAt = new Date().toISOString()

  const sipri = getSipriEntry(iso3)
  const iiss = getIissCapability(iso3)
  const capScore = getCapabilityScore(iso3)
  const alliances = getAlliancesForCountry(iso3)

  // Posicion OTAN 2% PIB (si miembro)
  const isNato = alliances.some((a) => a.alliance.id === 'nato' && a.status === 'member')
  const meets2pct = sipri && sipri.milex_pct_gdp >= 2.0

  return NextResponse.json({
    ok: true,
    iso3,
    country_name: coord.name_es,
    presupuesto: {
      sipri: sipri ? {
        milex_usd_bn: sipri.milex_usd_bn,
        milex_pct_gdp: sipri.milex_pct_gdp,
        change_vs_2022_pct: sipri.change_vs_2022_pct ?? null,
        world_rank: sipri.world_rank ?? null,
      } : null,
      nato_target_2pct: isNato ? {
        is_member: true,
        meets_target: meets2pct,
        delta_pct: sipri ? Math.round((sipri.milex_pct_gdp - 2.0) * 100) / 100 : null,
      } : null,
      breakdown: { available: false, pending: true, note: 'Desglose presupuesto NATO + IISS funding mix pendiente · datos disponibles solo para top 32' },
    },
    capacidades: iiss ? {
      ...iiss,
      capability_score: capScore,
    } : null,
    capacidades_pending: !iiss,
    transferencias: {
      available: false,
      pending: true,
      note: 'SIPRI Arms Transfers Database · imports/exports últimos 10 años · pendiente · datos manuales en sipri.org/databases/armstransfers',
    },
    alianzas: {
      memberships: alliances.map((a) => ({
        id: a.alliance.id,
        name: a.alliance.name,
        short_name: a.alliance.short_name,
        category: a.alliance.category,
        color: a.alliance.color,
        founded_year: a.alliance.founded_year,
        status: a.status,
        members_count: a.alliance.members.length,
        affiliates_count: a.alliance.affiliates?.length || 0,
        description: a.alliance.description,
      })),
      count: alliances.length,
    },
    industria: {
      available: false,
      pending: true,
      note: 'Empresas defensa domésticas (SIPRI AIDB) + cotización Finnhub si cotizan · pendiente · ver Sub-tab Exposición España (Tab 3) para ver empresas españolas con contratos defensa',
    },
    fetched_at: startedAt,
    _meta: {
      sources: ['SIPRI MILEX 2024', 'IISS Military Balance 2024', 'Datasets curados alianzas'],
      pending: ['SIPRI Arms Transfers', 'SIPRI AIDB empresas defensa', 'NATO breakdown presupuesto'],
      cache_ttl_seconds: 86400,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=259200' },
  })
}
