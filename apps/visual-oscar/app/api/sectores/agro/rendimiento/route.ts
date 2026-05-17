/**
 * GET /api/sectores/agro/rendimiento
 * Rendimiento cereales kg/ha + tierra regada + tierra arable.
 */
import { NextResponse } from 'next/server'
import { getSerie } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const [cereal, irrig, arable, agriland] = await Promise.all([
    getSerie('ESP', 'AG.YLD.CREL.KG', 2000),
    getSerie('ESP', 'AG.LND.IRIG.AG.ZS', 2005),
    getSerie('ESP', 'AG.LND.ARBL.HA.PC', 2000),
    getSerie('ESP', 'AG.LND.AGRI.ZS', 2000),
  ])
  return NextResponse.json({
    serie_cereal_yield: cereal.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    serie_tierra_regada: irrig.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    serie_arable_pc: arable.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    serie_tierra_agraria: agriland.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    fuente: 'World Bank · AG.YLD.CREL.KG + AG.LND.IRIG.AG.ZS + AG.LND.ARBL.HA.PC + AG.LND.AGRI.ZS',
  }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } })
}
