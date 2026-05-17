/**
 * GET /api/sectores/turismo/resumen
 * Indicadores turismo España vía INE FRONTUR + EOH.
 */
import { NextResponse } from 'next/server'
import { getSerie, INE_SERIES_TURISMO } from '@/lib/sources/ine'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const t0 = Date.now()
  const [turistas, turistasVar, pernoctaciones, viajeros] = await Promise.all([
    getSerie(INE_SERIES_TURISMO.TURISTAS_TOTAL, 24),
    getSerie(INE_SERIES_TURISMO.TURISTAS_VAR, 6),
    getSerie(INE_SERIES_TURISMO.PERNOCTACIONES, 24),
    getSerie(INE_SERIES_TURISMO.VIAJEROS_HOTEL, 24),
  ])
  return NextResponse.json({
    kpis: {
      turistas_mes: turistas.last?.valor,
      turistas_periodo: turistas.last?.periodo_label,
      turistas_var_anual: turistasVar.last?.valor,
      pernoctaciones_mes: pernoctaciones.last?.valor,
      pernoctaciones_periodo: pernoctaciones.last?.periodo_label,
      viajeros_mes: viajeros.last?.valor,
      viajeros_periodo: viajeros.last?.periodo_label,
    },
    serie_turistas: turistas.points.map(p => ({ t: p.periodo_label, v: p.valor })),
    serie_pernoctaciones: pernoctaciones.points.map(p => ({ t: p.periodo_label, v: p.valor })),
    serie_viajeros: viajeros.points.map(p => ({ t: p.periodo_label, v: p.valor })),
    fetch_ms: Date.now() - t0,
    fuente: 'INE TempUS · FRONTUR + EOH',
  }, { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' } })
}
