/**
 * GET /api/sectores/energia/demanda?days=2
 * Demanda peninsular en tiempo real + previsión (REE).
 */
import { NextRequest, NextResponse } from 'next/server'
import { demandaTiempoReal } from '@/lib/sources/ree'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const days = clamp(Number(req.nextUrl.searchParams.get('days') || 2), 1, 30)
  const r = await demandaTiempoReal(days)
  if (!r.ok) return NextResponse.json({ error: r.error, series: [] }, { status: 200 })

  const series = r.series.map(s => ({
    title: s.title,
    color: s.color,
    last_value: s.last_value,
    last_datetime: s.last_datetime,
    avg: s.values.length ? Math.round((s.values.reduce((a, v) => a + v.value, 0) / s.values.length)) : 0,
    max: s.values.length ? Math.max(...s.values.map(v => v.value)) : 0,
    points: s.values.map(v => ({ t: v.datetime.slice(0, 16), v: v.value })),
  }))
  return NextResponse.json({
    series, days,
    fuente: 'Red Eléctrica de España · demanda-tiempo-real',
  }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
