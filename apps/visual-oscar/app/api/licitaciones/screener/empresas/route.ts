/**
 * GET /api/licitaciones/screener/empresas
 * Top adjudicatarios por número de contratos (Catalunya Open Data).
 *
 * Filtros:
 *   q, anio, cpv_div, tipo_contrato, procedimiento, organo, ccaa
 * Paginación:
 *   page (default 1), page_size (default 50, max 200)
 */
import { NextRequest, NextResponse } from 'next/server'
import { topEmpresas, type SocrataFilters } from '@/lib/socrata-catalunya'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const t0 = Date.now()
  const filters: SocrataFilters = {
    q: sp.get('q')?.trim() || undefined,
    anio: numOrUndef(sp.get('anio')),
    cpv_div: sp.get('cpv_div') || undefined,
    tipo_contrato: sp.get('tipo_contrato') || undefined,
    procedimiento: sp.get('procedimiento') || undefined,
    organo: sp.get('organo') || undefined,
  }
  const page = Math.max(1, numOrUndef(sp.get('page')) ?? 1)
  const pageSize = clamp(numOrUndef(sp.get('page_size')) ?? 50, 1, 200)
  const fetchLimit = page * pageSize
  const all = await topEmpresas(filters, fetchLimit)
  const slice = all.slice((page - 1) * pageSize, page * pageSize)

  return NextResponse.json({
    items: slice,
    pagination: { page, page_size: pageSize, returned: slice.length, has_more: all.length >= fetchLimit },
    filters,
    fetch_ms: Date.now() - t0,
  }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } })
}

function numOrUndef(s: string | null): number | undefined {
  if (s == null || s === '') return undefined
  const n = Number(s); return Number.isFinite(n) ? n : undefined
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
