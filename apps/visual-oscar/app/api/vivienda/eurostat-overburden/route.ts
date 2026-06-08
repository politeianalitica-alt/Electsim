/**
 * GET /api/vivienda/eurostat-overburden
 *
 * Housing cost overburden rate · % de hogares que dedican >40% de la renta
 * disponible al coste de la vivienda (incluye hipoteca o alquiler).
 *
 * Dataset Eurostat ilc_mdho06 · anual por país.
 *
 * Query params:
 *   ?geo=ES,EU27_2020,EA20,FR,DE,IT,PT,NL,AT (default si no se pasa)
 *
 * Respuesta:
 *   {
 *     ok: boolean,
 *     data: {
 *       series: Array<{ geo, points: Array<{time, value}> }>,
 *       latest_by_geo: Record<geo, {time, value}>,
 *     } | null,
 *     fuente: "Eurostat ilc_mdho06",
 *     fuentes_error: string[]
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchEurostatCostOverburden } from '@/lib/vivienda/sources/eurostat-vivienda'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_GEO = ['ES', 'EU27_2020', 'EA20', 'FR', 'DE', 'IT', 'PT', 'NL', 'AT']

export async function GET(req: NextRequest) {
  const geoParam = req.nextUrl.searchParams.get('geo')
  const geo = (geoParam ? geoParam.split(',') : DEFAULT_GEO)
    .map((g) => g.trim().toUpperCase())
    .filter(Boolean)

  const r = await fetchEurostatCostOverburden(geo)
  const fuentes_error: string[] = []
  if (!r.ok) fuentes_error.push(`eurostat ilc_mdho06 · ${r.error}`)

  const points = r.ok ? r.points : []
  const seriesMap = new Map<string, Array<{ time: string; value: number | null }>>()
  for (const p of points) {
    const arr = seriesMap.get(p.geo) || []
    arr.push({ time: p.time, value: p.value })
    seriesMap.set(p.geo, arr)
  }
  const series = Array.from(seriesMap.entries())
    .map(([geo, arr]) => ({ geo, points: arr.sort((a, b) => a.time.localeCompare(b.time)) }))
    .sort((a, b) => a.geo.localeCompare(b.geo))

  const latest_by_geo: Record<string, { time: string; value: number | null }> = {}
  for (const s of series) {
    const last = s.points[s.points.length - 1]
    if (last) latest_by_geo[s.geo] = last
  }

  return NextResponse.json(
    {
      ok: r.ok && series.length > 0,
      data: r.ok ? { series, latest_by_geo } : null,
      fuente: 'Eurostat · ilc_mdho06 · housing cost overburden rate (% hogares >40% renta en vivienda)',
      fuente_url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_mdho06',
      fuentes_error,
      generado_en: 'ISR · cache 6h',
    },
    { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' } }
  )
}
