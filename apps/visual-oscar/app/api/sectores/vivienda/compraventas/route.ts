/**
 * GET /api/sectores/vivienda/compraventas?nult=12
 * Compraventas viviendas mensuales por segmento (libre, protegida, nueva, usada).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSerie, INE_SERIES_VIVIENDA } from '@/lib/sources/ine'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const nult = clamp(Number(req.nextUrl.searchParams.get('nult') || 12), 3, 36)
  const [libre, prot, nueva, usada] = await Promise.all([
    getSerie(INE_SERIES_VIVIENDA.COMPRA_LIBRE, nult),
    getSerie(INE_SERIES_VIVIENDA.COMPRA_PROTEGIDA, nult),
    getSerie(INE_SERIES_VIVIENDA.COMPRA_NUEVA, nult),
    getSerie(INE_SERIES_VIVIENDA.COMPRA_USADA, nult),
  ])

  // Combinar por periodo
  const periodos = Array.from(new Set([
    ...libre.points.map(p => p.periodo_label),
    ...prot.points.map(p => p.periodo_label),
  ])).sort()

  const points = periodos.map(t => ({
    t,
    libre:     libre.points.find(p => p.periodo_label === t)?.valor ?? 0,
    protegida: prot.points.find(p => p.periodo_label === t)?.valor ?? 0,
    nueva:     nueva.points.find(p => p.periodo_label === t)?.valor ?? 0,
    usada:     usada.points.find(p => p.periodo_label === t)?.valor ?? 0,
  }))

  // Totales acumulados del período
  const total_libre = points.reduce((a, p) => a + p.libre, 0)
  const total_protegida = points.reduce((a, p) => a + p.protegida, 0)
  const total_nueva = points.reduce((a, p) => a + p.nueva, 0)
  const total_usada = points.reduce((a, p) => a + p.usada, 0)

  return NextResponse.json({
    points,
    totales: {
      libre: total_libre,
      protegida: total_protegida,
      nueva: total_nueva,
      usada: total_usada,
      total: total_libre + total_protegida,
    },
    nult,
    fuente: 'INE TempUS · ETDP series',
  }, { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
