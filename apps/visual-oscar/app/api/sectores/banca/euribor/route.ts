/**
 * GET /api/sectores/banca/euribor?nult=36
 * Serie EURIBOR 12M + 6M + Bono 10Y España.
 */
import { NextRequest, NextResponse } from 'next/server'
import { euribor12M, euribor6M, bondYield10YESP } from '@/lib/sources/ecb'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const nult = clamp(Number(req.nextUrl.searchParams.get('nult') || 36), 6, 120)
  const [e12, e6, b10] = await Promise.all([euribor12M(nult), euribor6M(nult), bondYield10YESP(nult)])

  const fechas = Array.from(new Set([...e12.points.map(p => p.t), ...e6.points.map(p => p.t)])).sort()
  const points = fechas.map(t => ({
    t,
    euribor_12m: e12.points.find(p => p.t === t)?.v ?? null,
    euribor_6m: e6.points.find(p => p.t === t)?.v ?? null,
    bond_10y: b10.points.find(p => p.t === t)?.v ?? null,
  }))

  return NextResponse.json({
    points, nult,
    fuente: 'ECB SDW · EURIBOR + Bond 10Y ES',
  }, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
