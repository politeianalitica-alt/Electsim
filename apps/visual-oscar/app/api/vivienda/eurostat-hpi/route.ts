/**
 * GET /api/vivienda/eurostat-hpi
 *
 * House Price Index trimestral · Eurostat prc_hpi_a.
 * Comparativa España vs UE27 + zona euro + países de referencia.
 *
 * Query params:
 *   ?geo=ES,EU27_2020,EA20,FR,DE,IT,PT,NL (default si no se pasa)
 *   ?years=6 (rango años hacia atrás, default 6)
 *
 * Respuesta:
 *   {
 *     ok: boolean,
 *     data: {
 *       series: Array<{ geo: string; points: Array<{time, value}> }>,
 *       latest_by_geo: Record<string, {time, value}>,
 *     } | null,
 *     fuente: "Eurostat prc_hpi_a",
 *     fuente_url: string,
 *     fuentes_error: string[],
 *   }
 *
 * Sin maxDuration (default 60s) para respetar el límite Vercel Hobby
 * (8 maxDuration configs + 4 crons = 12 functions cap).
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchEurostatHPI } from '@/lib/vivienda/sources/eurostat-vivienda'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_GEO = ['ES', 'EU27_2020', 'EA20', 'FR', 'DE', 'IT', 'PT', 'NL']

export async function GET(req: NextRequest) {
  const geoParam = req.nextUrl.searchParams.get('geo')
  const geo = (geoParam ? geoParam.split(',') : DEFAULT_GEO).map((g) => g.trim().toUpperCase()).filter(Boolean)
  const yearsParam = req.nextUrl.searchParams.get('years')
  const years = clamp(Number(yearsParam || 6), 2, 15)

  const r = await fetchEurostatHPI(geo, years)
  const fuentes_error: string[] = []
  if (!r.ok) fuentes_error.push(`eurostat prc_hpi_a · ${r.error}`)

  // Reagrupar por geo para que la UI no haga su propio bucketing
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
      fuente: 'Eurostat · prc_hpi_a · House Price Index (base 2015 = 100)',
      fuente_url: 'https://ec.europa.eu/eurostat/databrowser/view/prc_hpi_a',
      fuentes_error,
      generado_en: 'ISR · cache 6h',
    },
    { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' } }
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}
