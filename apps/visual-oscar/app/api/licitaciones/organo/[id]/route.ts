/**
 * GET /api/licitaciones/organo/[id]
 * Ficha de órgano contratante: contratos, top adjudicatarios, top CPV.
 *
 * El [id] es el código DIR3 (ej. 'A09006169') o el nombre URL-encoded.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  searchCatalunya, countCatalunya, topEmpresas, topCPV, distribucionPorAnio,
} from '@/lib/socrata-catalunya'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sp = req.nextUrl.searchParams
  const id = decodeURIComponent(params.id)
  const t0 = Date.now()
  const limit = Math.min(200, Number(sp.get('limit') || 100))

  // Buscamos como contiene en nom_organ (LIKE)
  const filters = { organo: id }

  const [contratos, total, empresas, cpvs, evolucion] = await Promise.all([
    searchCatalunya(
      { ...filters, limit, offset: 0, order: 'data_publicacio_contracte DESC NULL LAST' },
      8000,
    ),
    countCatalunya(filters, 4000),
    topEmpresas(filters, 10),
    topCPV(filters, 10),
    distribucionPorAnio(filters),
  ])

  const importes = contratos.items
    .map(c => c.importe_adjudicacion ?? c.importe_licitacion ?? 0)
    .filter(v => v > 0)

  const muestra = contratos.items[0]
  const ficha = {
    id,
    dir3: muestra?.organo_dir3,
    nombre: muestra?.organo || id,
    ambito: muestra?.ambito,
    n_contratos: total ?? contratos.items.length,
    importe_total: importes.reduce((s, v) => s + v, 0),
    importe_medio: importes.length ? importes.reduce((s, v) => s + v, 0) / importes.length : 0,
    importe_max: importes.length ? Math.max(...importes) : 0,
  }

  return NextResponse.json({
    ficha,
    contratos: contratos.items,
    top_empresas: empresas,
    top_cpv: cpvs,
    evolucion_anio: evolucion,
    fetch_ms: Date.now() - t0,
  }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } })
}
