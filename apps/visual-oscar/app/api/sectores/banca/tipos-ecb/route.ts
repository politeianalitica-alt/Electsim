/**
 * GET /api/sectores/banca/tipos-ecb?days=180
 * Serie histórica DFR + MRO BCE.
 */
import { NextRequest, NextResponse } from 'next/server'
import { depositFacilityRate, mroRate } from '@/lib/sources/ecb'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const days = clamp(Number(req.nextUrl.searchParams.get('days') || 365), 30, 1500)
  const [dfr, mro] = await Promise.all([depositFacilityRate(days), mroRate(days)])

  // Combinar por fecha
  const fechas = Array.from(new Set([...dfr.points.map(p => p.t), ...mro.points.map(p => p.t)])).sort()
  const points = fechas.map(t => ({
    t,
    dfr: dfr.points.find(p => p.t === t)?.v ?? null,
    mro: mro.points.find(p => p.t === t)?.v ?? null,
  }))
  // Sub-muestrear · 1 punto cada 7 días para no saturar
  const sampled = points.filter((_, i) => i % 7 === 0 || i === points.length - 1)

  return NextResponse.json({
    points: sampled, days,
    last: { dfr: dfr.points.filter(p => p.v != null).pop()?.v, mro: mro.points.filter(p => p.v != null).pop()?.v },
    fuente: 'ECB SDW · DFR + MRO',
  }, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
