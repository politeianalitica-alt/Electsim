/**
 * GET /api/farma/eurostat-gasto
 *
 * Gasto sanitario corriente en % del PIB · Eurostat hlth_sha11_hf.
 * Comparativa España vs UE + países de referencia.
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchEurostatGastoSanitario } from '@/lib/farma/sources/eurostat-farma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_GEO = ['ES', 'EU27_2020', 'EA20', 'FR', 'DE', 'IT', 'PT', 'NL']

export async function GET(req: NextRequest) {
  const geoParam = req.nextUrl.searchParams.get('geo')
  const geo = (geoParam ? geoParam.split(',') : DEFAULT_GEO).map((g) => g.trim().toUpperCase()).filter(Boolean)
  const years = clamp(Number(req.nextUrl.searchParams.get('years') || 6), 2, 15)

  const r = await fetchEurostatGastoSanitario(geo, years)
  const fuentes_error: string[] = []
  if (!r.ok) fuentes_error.push(`eurostat hlth_sha11_hf · ${r.error}`)

  const points = r.ok ? r.points : []
  const seriesMap = new Map<string, Array<{ time: string; value: number | null }>>()
  for (const p of points) {
    const arr = seriesMap.get(p.geo) || []
    arr.push({ time: p.time, value: p.value })
    seriesMap.set(p.geo, arr)
  }
  const series = Array.from(seriesMap.entries())
    .map(([g, arr]) => ({ geo: g, points: arr.sort((a, b) => a.time.localeCompare(b.time)) }))
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
      fuente: 'Eurostat · hlth_sha11_hf · gasto sanitario corriente en % PIB',
      fuente_url: 'https://ec.europa.eu/eurostat/databrowser/view/hlth_sha11_hf',
      fuentes_error,
      generado_en: 'ISR · cache 6h',
    },
    { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' } }
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}
