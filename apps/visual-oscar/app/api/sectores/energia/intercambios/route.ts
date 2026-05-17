/**
 * GET /api/sectores/energia/intercambios?days=7
 * Intercambios internacionales programados (Francia, Portugal, Marruecos, Andorra).
 */
import { NextRequest, NextResponse } from 'next/server'
import { intercambiosInternacionales } from '@/lib/sources/ree'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const days = clamp(Number(req.nextUrl.searchParams.get('days') || 7), 1, 90)
  const r = await intercambiosInternacionales(days)
  if (!r.ok) return NextResponse.json({ error: r.error, series: [] }, { status: 200 })

  const series = r.series.map(s => ({
    title: s.title,
    color: s.color,
    saldo_total_mwh: Math.round(s.total || 0),
    last_value: s.last_value,
  }))
  return NextResponse.json({
    series, days,
    fuente: 'Red Eléctrica de España · intercambios programados',
  }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
