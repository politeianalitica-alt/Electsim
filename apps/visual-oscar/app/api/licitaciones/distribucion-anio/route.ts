/**
 * GET /api/licitaciones/distribucion-anio
 * Cuántos contratos hay por año (para gráfico evolución temporal).
 *
 * Acepta los mismos filtros que /buscar para contextualizar.
 */
import { NextRequest, NextResponse } from 'next/server'
import { distribucionPorAnio, type SocrataFilters } from '@/lib/socrata-catalunya'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const t0 = Date.now()
  const filters: SocrataFilters = {
    q: sp.get('q')?.trim() || undefined,
    cpv_div: sp.get('cpv_div') || undefined,
    tipo_contrato: sp.get('tipo_contrato') || undefined,
    procedimiento: sp.get('procedimiento') || undefined,
    organo: sp.get('organo') || undefined,
    adjudicatario_nif: sp.get('adjudicatario_nif') || undefined,
  }
  const data = await distribucionPorAnio(filters)
  return NextResponse.json({
    serie: data,
    total: data.reduce((s, r) => s + r.n, 0),
    fetch_ms: Date.now() - t0,
  }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } })
}
