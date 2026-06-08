/**
 * GET /api/sectores/banca/credito
 * Serie histórica crédito al sector privado España + ratios bancarios.
 */
import { NextResponse } from 'next/server'
import { getSerie } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const [credito, npl, cap] = await Promise.all([
    getSerie('ESP', 'FS.AST.PRVT.GD.ZS', 2000),
    getSerie('ESP', 'FB.AST.NPER.ZS', 2010),
    getSerie('ESP', 'FB.BNK.CAPA.ZS', 2010),
  ])
  return NextResponse.json({
    serie_credito_pib: credito.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    serie_npl: npl.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    serie_capital: cap.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    fuente: 'World Bank · FS.AST.PRVT.GD.ZS + FB.AST.NPER.ZS + FB.BNK.CAPA.ZS',
  }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } })
}
