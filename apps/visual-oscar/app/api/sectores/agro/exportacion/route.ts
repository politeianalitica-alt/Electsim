/**
 * GET /api/sectores/agro/exportacion
 * Exportaciones agrícolas como % del total + comparativa europea.
 */
import { NextResponse } from 'next/server'
import { getSerie, getCrossCountry } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAISES = ['ESP', 'FRA', 'DEU', 'ITA', 'NLD', 'PRT', 'GBR', 'POL', 'GRC', 'ROU']

export async function GET() {
  const year = new Date().getFullYear() - 1
  const [serie, comparativa] = await Promise.all([
    getSerie('ESP', 'TX.VAL.AGRI.ZS.UN', 2000),
    getCrossCountry(PAISES, 'TX.VAL.AGRI.ZS.UN', year),
  ])
  return NextResponse.json({
    serie_exp_esp: serie.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    comparativa: comparativa.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    fuente: 'World Bank · TX.VAL.AGRI.ZS.UN agricultural exports',
  }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } })
}
