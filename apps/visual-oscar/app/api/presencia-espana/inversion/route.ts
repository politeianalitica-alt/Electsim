/**
 * /api/presencia-espana/inversion · Sprint GEO-ES C4
 *
 * Stock IED española en exterior · DataInvex 2023 aprox.
 * Análisis cartera: concentración HHI, exposición a países alerta.
 *
 * Cache: s-maxage=604800 (7 días).
 */
import { NextResponse } from 'next/server'
import { getTopFDI, SPAIN_PRESENCE } from '@/lib/geopolitica/spain-presence-data'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'
import { getVdemEntry } from '@/lib/geopolitica/vdem-data'
import { getCoberturaFormal } from '@/lib/geopolitica/cobertura-formal-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface FDIPosition {
  iso3: string
  name_es: string
  fdi_stock_eur_bn: number
  share_total_pct: number
  vdem_polyarchy: number | null
  risk_high: boolean
  /** G24 · Cobertura formal por posición (APPRI/ADT/ICO/CESCE) */
  cobertura?: {
    appri_in_force: boolean
    adt_in_force: boolean
    ico_available: boolean
    ico_max_eur_m: number | null
    cesce_rating: string
    cesce_open: boolean
    cesce_short_term: string
    cesce_medium_long_term: string
    notes: string
  } | null
}

export async function GET() {
  const startedAt = new Date().toISOString()

  // Top 15 FDI positions
  const top15 = getTopFDI(15)
  const totalFDI = Object.values(SPAIN_PRESENCE).reduce((s, p) => s + (p.fdi_stock_eur_bn || 0), 0)

  const positions: FDIPosition[] = top15.map((p) => {
    const vdem = getVdemEntry(p.iso3)
    const cobertura = getCoberturaFormal(p.iso3)
    return {
      iso3: p.iso3,
      name_es: COUNTRY_COORDS[p.iso3]?.name_es || p.iso3,
      fdi_stock_eur_bn: p.fdi_stock_eur_bn || 0,
      share_total_pct: totalFDI > 0 ? Math.round(((p.fdi_stock_eur_bn || 0) / totalFDI) * 1000) / 10 : 0,
      vdem_polyarchy: vdem?.v2x_polyarchy ?? null,
      risk_high: !vdem || vdem.v2x_polyarchy < 0.5 || vdem.trend_5y === 'regresion_severa',
      cobertura: cobertura ? {
        appri_in_force: cobertura.appri.in_force,
        adt_in_force: cobertura.adt.in_force,
        ico_available: cobertura.ico.available,
        ico_max_eur_m: cobertura.ico.max_amount_eur_m,
        cesce_rating: cobertura.cesce.rating,
        cesce_open: cobertura.cesce.open_for_coverage,
        cesce_short_term: cobertura.cesce.short_term,
        cesce_medium_long_term: cobertura.cesce.medium_long_term,
        notes: cobertura.cesce.notes,
      } : null,
    }
  })

  // Calcular HHI · concentración cartera
  const allShares = Object.values(SPAIN_PRESENCE)
    .filter((p) => p.fdi_stock_eur_bn !== null)
    .map((p) => totalFDI > 0 ? (p.fdi_stock_eur_bn || 0) / totalFDI : 0)
  const hhi = Math.round(allShares.reduce((s, x) => s + x * x, 0) * 10000) / 100   // escala 0-100

  // Exposición a países riesgo (V-Dem polyarchy <0.5 o regresión severa)
  let stockInHighRisk = 0
  for (const p of Object.values(SPAIN_PRESENCE)) {
    if (p.fdi_stock_eur_bn === null) continue
    const vdem = getVdemEntry(p.iso3)
    if (!vdem || vdem.v2x_polyarchy < 0.5 || vdem.trend_5y === 'regresion_severa') {
      stockInHighRisk += p.fdi_stock_eur_bn
    }
  }
  const exposureHighRiskPct = totalFDI > 0 ? Math.round((stockInHighRisk / totalFDI) * 1000) / 10 : 0

  return NextResponse.json({
    ok: true,
    summary: {
      total_fdi_stock_eur_bn: Math.round(totalFDI * 10) / 10,
      countries_in_catalog: Object.keys(SPAIN_PRESENCE).length,
      hhi_concentration: hhi,         // <15 diversificado, 15-25 moderado, >25 concentrado
      hhi_label: hhi < 15 ? 'diversificado' : hhi < 25 ? 'moderado' : 'concentrado',
      exposure_high_risk_pct: exposureHighRiskPct,
      exposure_high_risk_bn: Math.round(stockInHighRisk * 10) / 10,
    },
    top_positions: positions,
    fetched_at: startedAt,
    _meta: {
      sources: [
        'Dataset curado DataInvex 2023',
        'V-Dem v15 para risk flag',
        'G24 · Cobertura formal seed: APPRI (BITs ES) + ADT + ICO Internacional + CESCE rating OCDE',
      ],
      pending: ['DataInvex API live'],
      cache_ttl_seconds: 604800,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000' },
  })
}
