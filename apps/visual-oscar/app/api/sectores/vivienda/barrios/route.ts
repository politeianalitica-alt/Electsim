/**
 * GET /api/sectores/vivienda/barrios?q=&ciudad=&sort=&page=&page_size=
 *
 * Buscador de barrios con precio €/m² medio (compra y alquiler).
 * Catálogo de 1000+ barrios de las principales ciudades españolas
 * (capitales de provincia + grandes municipios). Calibrado con
 * Idealista / Tinsa / Catastro Q4 2025.
 *
 * Filtros:
 *   - q (string)        · texto libre · busca en barrio + ciudad + distrito
 *   - ciudad (string)   · filtra por ciudad exacta (madrid, barcelona, …)
 *   - sort (string)     · 'precio_desc' | 'precio_asc' | 'var_desc'
 *                         | 'alfabetico' (def: precio_desc)
 *   - page (number)     · página · default 1
 *   - page_size (number) · tamaño de página (def: 30, max: 100)
 *
 * Respuesta:
 *   - items[]    · barrios de la página actual
 *   - total      · total de coincidencias
 *   - page       · página actual
 *   - page_size  · tamaño de página
 *   - n_pages    · total de páginas
 *   - n_total_catalogo · catálogo completo
 *   - ciudades[] · lista de ciudades disponibles (para dropdown)
 */
import { NextRequest, NextResponse } from 'next/server'
import { TODOS_LOS_BARRIOS, CIUDADES_DISPONIBLES, type Barrio } from '@/lib/sources/barrios-espana'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || ''
  const ciudad = req.nextUrl.searchParams.get('ciudad') || ''
  const sort = (req.nextUrl.searchParams.get('sort') || 'precio_desc') as
 'precio_desc' | 'precio_asc' | 'var_desc' | 'alfabetico'
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || 1))
  const page_size = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('page_size') || 30)))

  const qNorm = norm(q.trim())
  const ciudadNorm = norm(ciudad.trim())

  let filtered: Barrio[] = TODOS_LOS_BARRIOS.filter(b => {
    const okQ = !qNorm
      || norm(b.barrio).includes(qNorm)
      || norm(b.ciudad).includes(qNorm)
      || (b.distrito && norm(b.distrito).includes(qNorm))
    const okC = !ciudadNorm || norm(b.ciudad) === ciudadNorm
    return okQ && okC
  })

  if (sort === 'precio_asc')      filtered.sort((a, b) => a.precio_m2_compra - b.precio_m2_compra)
  else if (sort === 'var_desc')   filtered.sort((a, b) => b.var_anual_compra - a.var_anual_compra)
  else if (sort === 'alfabetico') filtered.sort((a, b) => a.barrio.localeCompare(b.barrio, 'es'))
  else                            filtered.sort((a, b) => b.precio_m2_compra - a.precio_m2_compra)

  const total = filtered.length
  const n_pages = Math.max(1, Math.ceil(total / page_size))
  const start = (page - 1) * page_size
  const items = filtered.slice(start, start + page_size)

  return NextResponse.json({
    items,
    total,
    page,
    page_size,
    n_pages,
    n_total_catalogo: TODOS_LOS_BARRIOS.length,
    ciudades: CIUDADES_DISPONIBLES,
    fuente: 'Idealista · Tinsa · Catastro Q4 2025',
    fuente_note: `Catálogo curado · ${TODOS_LOS_BARRIOS.length} barrios de ${CIUDADES_DISPONIBLES.length} ciudades`,
  }, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } })
}
