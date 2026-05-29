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
import { getArmsTransfers } from '@/lib/geopolitica/sipri-arms-transfers'
import { getDefenseIndustry } from '@/lib/geopolitica/defense-industry-seed'
import { getCountrySystems } from '@/lib/geopolitica/military-systems-seed'
import { getCountryMilitaryAbroad } from '@/lib/geopolitica/military-missions-seed'

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
  // G22 fix · datos curados SIPRI Arms Transfers + Defense Industry
  const armsTransfers = getArmsTransfers(iso3)
  const defenseIndustry = getDefenseIndustry(iso3)
  // G23 fix · sistemas armas específicos + presencia militar exterior
  const systems = getCountrySystems(iso3)
  const militaryAbroad = getCountryMilitaryAbroad(iso3)

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
      breakdown: militaryAbroad ? {
        available: true,
        pending: false,
        total_usd_bn: militaryAbroad.budget_breakdown.total_usd_bn,
        fiscal_year: militaryAbroad.budget_breakdown.fiscal_year,
        personnel_pct: militaryAbroad.budget_breakdown.personnel_pct,
        operations_maintenance_pct: militaryAbroad.budget_breakdown.operations_maintenance_pct,
        procurement_pct: militaryAbroad.budget_breakdown.procurement_pct,
        rd_pct: militaryAbroad.budget_breakdown.rd_pct,
        infrastructure_pct: militaryAbroad.budget_breakdown.infrastructure_pct,
        other_pct: militaryAbroad.budget_breakdown.other_pct,
        notes: militaryAbroad.budget_breakdown.notes,
        source: 'NATO Defence Expenditures + IISS Military Balance 2024',
      } : { available: false, pending: true, note: 'Desglose presupuesto NATO + IISS pendiente · top 10 países cubiertos' },
    },
    // G23 · presencia militar exterior (misiones + bases)
    militar_exterior: militaryAbroad ? {
      available: true,
      total_personnel_abroad: militaryAbroad.total_personnel_abroad,
      permanent_bases_abroad: militaryAbroad.permanent_bases_abroad,
      missions: militaryAbroad.missions,
      source: 'NATO operations + UN DPKO + acuerdos bilaterales',
    } : { available: false, pending: true, note: 'Presencia militar exterior · top 10 países cubiertos en seed' },
    capacidades: iiss ? {
      ...iiss,
      capability_score: capScore,
    } : null,
    capacidades_pending: !iiss,
    transferencias: armsTransfers ? {
      available: true,
      pending: false,
      exports: armsTransfers.exports,
      imports: armsTransfers.imports,
      world_rank_exporter: armsTransfers.world_rank_exporter,
      world_rank_importer: armsTransfers.world_rank_importer,
      notes: armsTransfers.notes,
      // G23 · sistemas específicos exportados/importados (qué arma concretamente)
      systems_exported: systems?.top_exports ?? [],
      systems_imported: systems?.top_imports ?? [],
      source: 'SIPRI Arms Transfers Database 2024 · ventana 2019-2023 (TIV millones USD)',
    } : {
      available: false,
      pending: true,
      note: 'SIPRI Arms Transfers · disponible solo para top 25 exportadores/importadores · este país queda pendiente seed.',
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
    industria: defenseIndustry ? {
      available: true,
      pending: false,
      companies: defenseIndustry.companies,
      total_arms_sales_2022_usd_bn: defenseIndustry.total_arms_sales_2022_usd_bn,
      share_top100_global: defenseIndustry.share_top100_global,
      notes: defenseIndustry.notes,
      source: 'SIPRI Arms Industry Database (AIDB) 2023 · ventas armas 2022',
    } : {
      available: false,
      pending: true,
      note: 'SIPRI AIDB · disponible solo para top 14 industrias defensa · este país queda pendiente seed.',
    },
    fetched_at: startedAt,
    _meta: {
      sources: [
        'SIPRI MILEX 2024',
        'IISS Military Balance 2024',
        'Datasets curados alianzas',
        armsTransfers ? 'SIPRI Arms Transfers Database 2024' : null,
        defenseIndustry ? 'SIPRI Arms Industry Database (AIDB) 2023' : null,
      ].filter(Boolean) as string[],
      pending: [
        !armsTransfers ? 'SIPRI Arms Transfers (seed solo top 25)' : null,
        !defenseIndustry ? 'SIPRI AIDB empresas defensa (seed solo top 14)' : null,
        'NATO breakdown presupuesto',
      ].filter(Boolean) as string[],
      cache_ttl_seconds: 86400,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=259200' },
  })
}
