/**
 * GET /api/sectores/banca/resumen + serie histórica crédito sector privado.
 */
import { NextResponse } from 'next/server'
import { getSerie } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const t0 = Date.now()
  // FS.AST.PRVT.GD.ZS = Domestic credit to private sector (% of GDP)
  // FB.AST.NPER.ZS = Bank nonperforming loans to total gross loans (%)
  const [credito, npl, banca5] = await Promise.all([
    getSerie('ESP', 'FS.AST.PRVT.GD.ZS', 2010),
    getSerie('ESP', 'FB.AST.NPER.ZS', 2015),
    getSerie('ESP', 'FB.BNK.CAPA.ZS', 2015),  // Bank capital to assets (%)
  ])
  const lastCredito = credito.filter(p => p.value != null).pop()
  const lastNpl = npl.filter(p => p.value != null).pop()
  const lastBanca = banca5.filter(p => p.value != null).pop()
  return NextResponse.json({
    kpis: {
      credito_pib_pct: lastCredito?.value,
      credito_pib_year: lastCredito?.year,
      npl_pct: lastNpl?.value,
      npl_year: lastNpl?.year,
      bank_capital_pct: lastBanca?.value,
      bank_capital_year: lastBanca?.year,
    },
    serie_credito: credito.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    serie_npl: npl.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    fetch_ms: Date.now() - t0,
    fuente: 'World Bank · Indicadores financieros',
  }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } })
}
