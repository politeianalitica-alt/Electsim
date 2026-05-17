/**
 * GET /api/sectores/agro/resumen
 *
 * KPIs en vivo del sector agroalimentario:
 *   - agro_pib_pct        · Agricultura % PIB
 *   - food_index          · Índice producción alimentos (base 2014-16=100)
 *   - cereal_yield        · Rendimiento cereales kg/ha
 *   - tierra_regada_pct   · Tierra regada % superficie agraria
 *   - exportacion_agro    · Exportación agrícola % total exportaciones
 *
 * Cache CDN 24h.
 */
import { NextResponse } from 'next/server'
import { getSerie } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const t0 = Date.now()
  const [pibAgro, food, livestock, crop, cereal, irrig, arable, exportAgr] = await Promise.all([
    getSerie('ESP', 'NV.AGR.TOTL.ZS', 2010),
    getSerie('ESP', 'AG.PRD.FOOD.XD', 2010),
    getSerie('ESP', 'AG.PRD.LVSK.XD', 2010),
    getSerie('ESP', 'AG.PRD.CROP.XD', 2010),
    getSerie('ESP', 'AG.YLD.CREL.KG', 2010),
    getSerie('ESP', 'AG.LND.IRIG.AG.ZS', 2005),
    getSerie('ESP', 'AG.LND.ARBL.HA.PC', 2005),
    getSerie('ESP', 'TX.VAL.AGRI.ZS.UN', 2010),
  ])

  const last = (s: typeof pibAgro) => s.filter(p => p.value != null).pop()
  const lPib = last(pibAgro), lFood = last(food), lLstk = last(livestock), lCrop = last(crop)
  const lCer = last(cereal), lIrr = last(irrig), lArb = last(arable), lExp = last(exportAgr)

  return NextResponse.json({
    kpis: {
      agro_pib_pct: lPib?.value, agro_pib_year: lPib?.year,
      food_index: lFood?.value, food_index_year: lFood?.year,
      livestock_index: lLstk?.value, livestock_year: lLstk?.year,
      crop_index: lCrop?.value, crop_year: lCrop?.year,
      cereal_yield_kg: lCer?.value, cereal_yield_year: lCer?.year,
      tierra_regada_pct: lIrr?.value, tierra_regada_year: lIrr?.year,
      arable_per_capita: lArb?.value, arable_year: lArb?.year,
      exportacion_agr_pct: lExp?.value, exportacion_year: lExp?.year,
    },
    fetch_ms: Date.now() - t0,
    fuente: 'World Bank · agricultural indicators',
  }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } })
}
