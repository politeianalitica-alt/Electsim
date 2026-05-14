/**
 * GET /api/sectores/energia/emisiones?days=14
 * Emisiones CO2 medias por tecnología no renovable.
 */
import { NextRequest, NextResponse } from 'next/server'
import { emisionesCO2 } from '@/lib/sources/ree'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const days = clamp(Number(req.nextUrl.searchParams.get('days') || 14), 1, 90)
  const r = await emisionesCO2(days)
  if (!r.ok) return NextResponse.json({ error: r.error, series: [] }, { status: 200 })

  const series = r.series.map(s => ({
    title: s.title,
    color: s.color,
    last_value: s.last_value,
    avg: s.values.length ? Math.round((s.values.reduce((a, v) => a + v.value, 0) / s.values.length) * 10) / 10 : 0,
    points: s.values.map(v => ({ t: v.datetime.slice(0, 10), v: v.value })),
  }))
  return NextResponse.json({
    series, days,
    fuente: 'Red Eléctrica de España · emisiones-CO2',
  }, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
