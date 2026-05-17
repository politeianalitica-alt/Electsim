/**
 * GET /api/sectores/farma/resumen
 *
 * KPIs en vivo del sector farmacéutico para el hero del dashboard:
 *   - medicamentos_total       · total registrados en CIMA
 *   - medicamentos_comerc      · % comercializados
 *   - desabastecimientos_act   · problemas suministro activos
 *   - desabastecimientos_30d   · nuevos en últimos 30 días
 *
 * Cache CDN 30 min.
 */
import { NextResponse } from 'next/server'
import { searchMedicamentos, searchDesabastecimientos } from '@/lib/sources/aemps'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const t0 = Date.now()
  const [todos, comerc, des30, des90] = await Promise.all([
    searchMedicamentos({ tamanioPagina: 1 }),
    searchMedicamentos({ comerc: 1, tamanioPagina: 1 }),
    searchDesabastecimientos(30, 1, 1),
    searchDesabastecimientos(90, 1, 1),
  ])

  return NextResponse.json({
    kpis: {
      medicamentos_total: todos.total,
      medicamentos_comerc: comerc.total,
      medicamentos_comerc_pct: todos.total > 0 ? Math.round((comerc.total / todos.total) * 1000) / 10 : null,
      desabastecimientos_30d: des30.total,
      desabastecimientos_90d: des90.total,
    },
    sources: {
      medicamentos: { ok: todos.ok, ms: todos.ms },
      comercializados: { ok: comerc.ok, ms: comerc.ms },
      desabastecimientos: { ok: des30.ok, ms: des30.ms },
    },
    fetch_ms: Date.now() - t0,
    fuente: 'AEMPS · CIMA · cima.aemps.es',
  }, { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } })
}
