/**
 * GET /api/licitaciones/adjudicatario/[nif]
 * Ficha de empresa adjudicataria: contratos, top órganos, top CPV.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  searchCatalunya, countCatalunya, topOrganos, topCPV, distribucionPorAnio,
  type NormalizedContrato,
} from '@/lib/socrata-catalunya'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(
  req: NextRequest,
  { params }: { params: { nif: string } },
) {
  const sp = req.nextUrl.searchParams
  const nif = params.nif.toUpperCase()
  const t0 = Date.now()
  const limit = Math.min(200, Number(sp.get('limit') || 100))

  const filters = { adjudicatario_nif: nif }

  const [contratos, total, organos, cpvs, evolucion] = await Promise.all([
    searchCatalunya(
      { ...filters, limit, offset: 0, order: 'data_publicacio_contracte DESC NULL LAST' },
      8000,
    ),
    countCatalunya(filters, 4000),
    topOrganos(filters, 10),
    topCPV(filters, 10),
    distribucionPorAnio(filters),
  ])

  // Resumen agregado
  const importes = contratos.items
    .map(c => c.importe_adjudicacion ?? c.importe_licitacion ?? 0)
    .filter(v => v > 0)

  const empresa = contratos.items[0]
  const ficha = {
    nif,
    nombre: empresa?.adjudicatario || '—',
    es_pyme: empresa?.es_pyme || false,
    n_contratos: total ?? contratos.items.length,
    importe_total: importes.reduce((s, v) => s + v, 0),
    importe_medio: importes.length ? importes.reduce((s, v) => s + v, 0) / importes.length : 0,
    importe_max: importes.length ? Math.max(...importes) : 0,
    primer_contrato: contratos.items.reduce<NormalizedContrato | null>((min, c) => {
      const f = c.fecha_publicacion || ''
      if (!min) return c
      return f && f < (min.fecha_publicacion || '') ? c : min
    }, null)?.fecha_publicacion,
    ultimo_contrato: contratos.items[0]?.fecha_publicacion,
  }

  return NextResponse.json({
    ficha,
    contratos: contratos.items,
    top_organos: organos,
    top_cpv: cpvs,
    evolucion_anio: evolucion,
    fetch_ms: Date.now() - t0,
  }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } })
}
