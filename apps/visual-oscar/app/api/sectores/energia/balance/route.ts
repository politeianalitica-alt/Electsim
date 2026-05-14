/**
 * GET /api/sectores/energia/balance?months=12
 * Balance eléctrico mensual (renovable / no renovable).
 */
import { NextRequest, NextResponse } from 'next/server'
import { balanceElectrico, demandaEvolucion } from '@/lib/sources/ree'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const months = clamp(Number(req.nextUrl.searchParams.get('months') || 12), 1, 36)
  const [bal, dem] = await Promise.all([
    balanceElectrico(months),
    demandaEvolucion(months),
  ])

  const balance = bal.series.map(s => ({
    title: s.title,
    color: s.color,
    total_gwh: Math.round((s.total || 0) / 1000),
    points: s.values.map(v => ({ t: v.datetime.slice(0, 7), v: Math.round(v.value / 1000) })),
  }))
  const demanda = dem.series.map(s => ({
    title: s.title,
    color: s.color,
    points: s.values.map(v => ({ t: v.datetime.slice(0, 7), v: Math.round(v.value / 1000) })),
  }))
  return NextResponse.json({
    balance, demanda, months,
    fuente: 'Red Eléctrica de España · balance-electrico + evolucion',
  }, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
