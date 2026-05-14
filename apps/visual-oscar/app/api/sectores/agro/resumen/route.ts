/**
 * GET /api/sectores/agro/resumen
 * Indicadores agroalimentarios España vía World Bank.
 */
import { NextResponse } from 'next/server'
import { getSerie } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const t0 = Date.now()
  // NV.AGR.TOTL.ZS = Agriculture, value added (% of GDP)
  // AG.LND.AGRI.ZS = Agricultural land (% of land area)
  // AG.PRD.FOOD.XD = Food production index (2014-2016 = 100)
  // AG.LND.IRIG.AG.ZS = Agricultural irrigated land (% of total agricultural land)
  const [pibAgro, tierra, foodIdx, irrigated] = await Promise.all([
    getSerie('ESP', 'NV.AGR.TOTL.ZS', 2005),
    getSerie('ESP', 'AG.LND.AGRI.ZS', 2005),
    getSerie('ESP', 'AG.PRD.FOOD.XD', 2010),
    getSerie('ESP', 'AG.LND.IRIG.AG.ZS', 2005),
  ])
  const lastPib = pibAgro.filter(p => p.value != null).pop()
  const lastTierra = tierra.filter(p => p.value != null).pop()
  const lastFood = foodIdx.filter(p => p.value != null).pop()
  const lastIrrig = irrigated.filter(p => p.value != null).pop()
  return NextResponse.json({
    kpis: {
      agro_pib_pct: lastPib?.value,
      agro_pib_year: lastPib?.year,
      tierra_agraria_pct: lastTierra?.value,
      tierra_agraria_year: lastTierra?.year,
      food_index: lastFood?.value,
      food_index_year: lastFood?.year,
      tierra_regada_pct: lastIrrig?.value,
      tierra_regada_year: lastIrrig?.year,
    },
    serie_pib_agro: pibAgro.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    serie_food_index: foodIdx.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    fetch_ms: Date.now() - t0,
    fuente: 'World Bank · Agricultural indicators',
  }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } })
}
