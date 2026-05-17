/**
 * GET /api/sectores/agro/produccion
 * Series históricas índices de producción Food + Livestock + Crop.
 */
import { NextResponse } from 'next/server'
import { getSerie } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const [food, livestock, crop, pib] = await Promise.all([
    getSerie('ESP', 'AG.PRD.FOOD.XD', 2000),
    getSerie('ESP', 'AG.PRD.LVSK.XD', 2000),
    getSerie('ESP', 'AG.PRD.CROP.XD', 2000),
    getSerie('ESP', 'NV.AGR.TOTL.ZS', 2000),
  ])
  const fechas = Array.from(new Set([
    ...food.map(p => p.year), ...livestock.map(p => p.year), ...crop.map(p => p.year),
  ])).sort()
  const points = fechas.map(y => ({
    t: String(y),
    food: food.find(p => p.year === y)?.value ?? null,
    livestock: livestock.find(p => p.year === y)?.value ?? null,
    crop: crop.find(p => p.year === y)?.value ?? null,
    pib: pib.find(p => p.year === y)?.value ?? null,
  }))
  return NextResponse.json({
    points, fuente: 'World Bank · AG.PRD.{FOOD,LVSK,CROP}.XD + NV.AGR.TOTL.ZS',
  }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } })
}
