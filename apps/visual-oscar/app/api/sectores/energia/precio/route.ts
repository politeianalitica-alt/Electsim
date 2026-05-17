/**
 * GET /api/sectores/energia/precio?days=2
 * Precio del mercado spot + PVPC (REE).
 */
import { NextRequest, NextResponse } from 'next/server'
import { preciosMercado } from '@/lib/sources/ree'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const days = clamp(Number(req.nextUrl.searchParams.get('days') || 2), 1, 30)
  const r = await preciosMercado(days)
  if (!r.ok) return NextResponse.json({ error: r.error, series: [] }, { status: 200 })

  // Devolver pares (datetime, value) por serie
  const series = r.series.map(s => ({
    title: s.title,
    color: s.color,
    last_value: s.last_value,
    last_datetime: s.last_datetime,
    avg: s.values.length ? Math.round((s.values.reduce((a, v) => a + v.value, 0) / s.values.length) * 100) / 100 : 0,
    max: s.values.length ? Math.max(...s.values.map(v => v.value)) : 0,
    min: s.values.length ? Math.min(...s.values.map(v => v.value)) : 0,
    points: s.values.map(v => ({ t: v.datetime.slice(0, 16), v: v.value })),
  }))
  return NextResponse.json({
    series, days,
    fuente: 'Red Eléctrica de España · precios-mercados-tiempo-real',
  }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
