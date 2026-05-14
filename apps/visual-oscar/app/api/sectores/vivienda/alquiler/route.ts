/**
 * GET /api/sectores/vivienda/alquiler?nult=10
 * Índice precios alquiler nacional (IPVA) anual.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSerie, INE_SERIES_VIVIENDA } from '@/lib/sources/ine'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const nult = clamp(Number(req.nextUrl.searchParams.get('nult') || 10), 3, 30)
  const [indice, varAnual] = await Promise.all([
    getSerie(INE_SERIES_VIVIENDA.ALQUILER_INDICE, nult),
    getSerie(INE_SERIES_VIVIENDA.ALQUILER_VAR, nult),
  ])
  const periodos = Array.from(new Set([
    ...indice.points.map(p => p.periodo_label),
    ...varAnual.points.map(p => p.periodo_label),
  ])).sort()
  const points = periodos.map(t => ({
    t,
    indice: indice.points.find(p => p.periodo_label === t)?.valor ?? null,
    var_anual: varAnual.points.find(p => p.periodo_label === t)?.valor ?? null,
  }))
  return NextResponse.json({
    points, nult,
    fuente: `INE TempUS · ${INE_SERIES_VIVIENDA.ALQUILER_INDICE} + ${INE_SERIES_VIVIENDA.ALQUILER_VAR}`,
  }, { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
