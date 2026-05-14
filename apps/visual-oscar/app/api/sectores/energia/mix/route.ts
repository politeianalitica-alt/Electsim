/**
 * GET /api/sectores/energia/mix?days=7
 * Mix de generación por tecnología (REE).
 */
import { NextRequest, NextResponse } from 'next/server'
import { mixGeneracion } from '@/lib/sources/ree'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const days = clamp(Number(req.nextUrl.searchParams.get('days') || 7), 1, 90)
  const r = await mixGeneracion(days)
  if (!r.ok) return NextResponse.json({ error: r.error, series: [] }, { status: 200 })

  // Agregar total por tecnología
  const items = r.series.map(s => ({
    tecnologia: s.title,
    color: s.color,
    total_mwh: Math.round(s.total || 0),
  })).filter(i => i.total_mwh > 0)
    .sort((a, b) => b.total_mwh - a.total_mwh)

  const total = items.reduce((acc, i) => acc + i.total_mwh, 0)
  return NextResponse.json({
    items: items.map(i => ({ ...i, pct: total ? Math.round((i.total_mwh / total) * 1000) / 10 : 0 })),
    total_mwh: total,
    days,
    fuente: 'Red Eléctrica de España · estructura-generacion',
  }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
