/**
 * GET /api/sectores/defensa/gasto-militar?from=2000&to=2024
 * Serie histórica de gasto militar España (% PIB y absoluto USD).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSerie } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const from = Math.max(1990, Number(sp.get('from') || 2000))
  const to = Math.min(new Date().getFullYear(), Number(sp.get('to') || new Date().getFullYear()))

  const [pctPib, usdAbs] = await Promise.all([
    getSerie('ESP', 'MS.MIL.XPND.GD.ZS', from, to),
    getSerie('ESP', 'MS.MIL.XPND.CD', from, to),
  ])

  const points: Array<{ year: number; pct_pib: number | null; usd_b: number | null }> = []
  const years = new Set([...pctPib.map(p => p.year), ...usdAbs.map(p => p.year)])
  for (const y of Array.from(years).sort()) {
    points.push({
      year: y,
      pct_pib: pctPib.find(p => p.year === y)?.value ?? null,
      usd_b: (() => {
        const v = usdAbs.find(p => p.year === y)?.value
        return v != null ? Math.round(v / 1e8) / 10 : null
      })(),
    })
  }
  return NextResponse.json({
    points, from, to,
    fuente: 'World Bank · MS.MIL.XPND.GD.ZS + MS.MIL.XPND.CD',
  }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } })
}
