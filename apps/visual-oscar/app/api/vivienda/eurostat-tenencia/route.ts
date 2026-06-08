/**
 * GET /api/vivienda/eurostat-tenencia
 *
 * Régimen de tenencia de la vivienda · % población por estatus.
 * Permite ver cuánto pesa el alquiler vs propiedad en España vs UE.
 *
 * Dataset Eurostat ilc_lvho02 · anual.
 *
 * Respuesta misma forma que /eurostat-hpi y /eurostat-overburden:
 *   { ok, data: { series, latest_by_geo }, fuente, fuente_url, fuentes_error }
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchEurostatTenure } from '@/lib/vivienda/sources/eurostat-vivienda'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_GEO = ['ES', 'EU27_2020', 'EA20', 'AT', 'NL', 'FR', 'DE', 'PT', 'IT']

export async function GET(req: NextRequest) {
  const geoParam = req.nextUrl.searchParams.get('geo')
  const geo = (geoParam ? geoParam.split(',') : DEFAULT_GEO)
    .map((g) => g.trim().toUpperCase())
    .filter(Boolean)

  const r = await fetchEurostatTenure(geo)
  const fuentes_error: string[] = []
  if (!r.ok) fuentes_error.push(`eurostat ilc_lvho02 · ${r.error}`)

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
      fuente: 'Eurostat · ilc_lvho02 · distribución de la población por régimen de tenencia',
      fuente_url: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_lvho02',
      fuentes_error,
      generado_en: 'ISR · cache 6h',
    },
    { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' } }
  )
}
