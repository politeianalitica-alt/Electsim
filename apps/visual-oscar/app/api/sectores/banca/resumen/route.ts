/**
 * GET /api/sectores/banca/resumen
 *
 * KPIs en vivo del sector banca y seguros:
 *   - euribor_12m   · EURIBOR 12M último valor mensual (%)
 *   - dfr_ecb       · Deposit Facility Rate ECB (%)
 *   - credito_pib   · Crédito al sector privado (% PIB)
 *   - npl           · Préstamos morosos (% sobre total)
 *
 * Cache CDN 6h (DFR/MRO actualización diaria, EURIBOR mensual, WB anual).
 */
import { NextResponse } from 'next/server'
import { depositFacilityRate, mroRate, euribor12M, bondYield10YESP } from '@/lib/sources/ecb'
import { getSerie } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const t0 = Date.now()
  const [dfr, mro, eur, bond, credito, npl, cap] = await Promise.all([
    depositFacilityRate(7),
    mroRate(7),
    euribor12M(2),
    bondYield10YESP(2),
    getSerie('ESP', 'FS.AST.PRVT.GD.ZS', 2020),
    getSerie('ESP', 'FB.AST.NPER.ZS', 2018),
    getSerie('ESP', 'FB.BNK.CAPA.ZS', 2018),
  ])

  const lastDfr = dfr.points.filter(p => p.v != null).pop()
  const lastMro = mro.points.filter(p => p.v != null).pop()
  const lastEur = eur.points.filter(p => p.v != null).pop()
  const lastBond = bond.points.filter(p => p.v != null).pop()
  const lastCredito = credito.filter(p => p.value != null).pop()
  const lastNpl = npl.filter(p => p.value != null).pop()
  const lastCap = cap.filter(p => p.value != null).pop()

  return NextResponse.json({
    kpis: {
      euribor_12m: lastEur?.v,
      euribor_12m_t: lastEur?.t,
      dfr_ecb: lastDfr?.v,
      dfr_ecb_t: lastDfr?.t,
      mro_ecb: lastMro?.v,
      bond_10y_esp: lastBond?.v,
      bond_10y_t: lastBond?.t,
      credito_pib_pct: lastCredito?.value,
      credito_pib_year: lastCredito?.year,
      npl_pct: lastNpl?.value,
      npl_year: lastNpl?.year,
      bank_capital_pct: lastCap?.value,
      bank_capital_year: lastCap?.year,
    },
    sources: {
      ecb: { ok: dfr.ok && eur.ok },
      worldbank: { ok: credito.length > 0 },
    },
    fetch_ms: Date.now() - t0,
    fuente: 'ECB SDW · World Bank',
  }, { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' } })
}
