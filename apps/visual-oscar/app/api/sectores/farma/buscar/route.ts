/**
 * GET /api/sectores/farma/buscar?q=&laboratorio=&atc=&page=1&page_size=25
 * Buscador de medicamentos · CIMA AEMPS.
 */
import { NextRequest, NextResponse } from 'next/server'
import { searchMedicamentos } from '@/lib/sources/aemps'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const t0 = Date.now()
  const r = await searchMedicamentos({
    nombre: sp.get('q') || undefined,
    laboratorio: sp.get('laboratorio') || undefined,
    atc: sp.get('atc') || undefined,
    practiv1: sp.get('practiv1') || undefined,
    comerc: parseBool(sp.get('comerc')),
    receta: parseBool(sp.get('receta')),
    huerfano: parseBool(sp.get('huerfano')),
    biosimilar: parseBool(sp.get('biosimilar')),
    generico: parseBool(sp.get('generico')),
    triangulo: parseBool(sp.get('triangulo')),
    pagina: Math.max(1, Number(sp.get('page') || 1)),
    tamanioPagina: clamp(Number(sp.get('page_size') || 25), 1, 100),
  })

  const items = r.items.map(m => ({
    nregistro: m.nregistro,
    cn: m.cn,
    nombre: m.nombre,
    laboratorio: m.labtitular,
    laboratorio_comerc: m.labcomercializador,
    forma: m.formaFarmaceutica?.nombre,
    vias: (m.viasAdministracion || []).map(v => v.nombre).filter(Boolean),
    atc: m.atcs?.[0]?.codigo,
    atc_label: m.atcs?.[0]?.nombre,
    principios_activos: (m.principiosActivos || []).map(p => p.nombre).filter(Boolean),
    flags: {
      comercializado: m.comerc === true,
      requiere_receta: m.receta === true,
      huerfano: m.huerfano === true,
      biosimilar: m.biosimilar === true,
      generico: m.generico === true,
      triangulo_seguimiento: m.triangulo === true,
    },
    aut_date: m.estado?.aut ? new Date(m.estado.aut).toISOString().slice(0, 10) : null,
  }))

  return NextResponse.json({
    items,
    total: r.total,
    pagination: { page: r.pagina, returned: items.length },
    fetch_ms: Date.now() - t0,
    fuente: 'AEMPS · CIMA · medicamentos',
  }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } })
}

function parseBool(s: string | null): 1 | 0 | undefined {
  if (s === '1' || s === 'true') return 1
  if (s === '0' || s === 'false') return 0
  return undefined
}
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
