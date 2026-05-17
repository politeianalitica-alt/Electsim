/**
 * GET /api/sectores/defensa/waterfall?year=2023
 * Variación YoY del gasto militar (absoluto USD) para 12 países.
 * Devuelve delta absoluto (MM USD) y delta relativo (%) respecto al año anterior.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSerie } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAISES = [
  { iso3: 'USA', label: 'EE.UU.' },
  { iso3: 'CHN', label: 'China' },
  { iso3: 'RUS', label: 'Rusia' },
  { iso3: 'GBR', label: 'Reino Unido' },
  { iso3: 'DEU', label: 'Alemania' },
  { iso3: 'FRA', label: 'Francia' },
  { iso3: 'JPN', label: 'Japón' },
  { iso3: 'KOR', label: 'Corea del Sur' },
  { iso3: 'POL', label: 'Polonia' },
  { iso3: 'ITA', label: 'Italia' },
  { iso3: 'ESP', label: 'España' },
  { iso3: 'PRT', label: 'Portugal' },
]

export async function GET(req: NextRequest) {
  const sp   = req.nextUrl.searchParams
  const year = Number(sp.get('year') || new Date().getFullYear() - 1)
  const prev = year - 1

  const results = await Promise.all(
    PAISES.map(async (p) => {
      const pts = await getSerie(p.iso3, 'MS.MIL.XPND.CD', prev, year)
      const vPrev = pts.find(pt => pt.year === prev)?.value ?? null
      const vCurr = pts.find(pt => pt.year === year)?.value ?? null
      const delta_usd_m  = vPrev != null && vCurr != null ? Math.round((vCurr - vPrev) / 1e6) : null
      const delta_pct    = vPrev != null && vCurr != null && vPrev > 0 ? Math.round(((vCurr - vPrev) / vPrev) * 1000) / 10 : null
      const value_usd_b  = vCurr != null ? Math.round(vCurr / 1e9 * 10) / 10 : null
      return { iso3: p.iso3, label: p.label, value_usd_b, delta_usd_m, delta_pct, highlighted: p.iso3 === 'ESP' }
    })
  )

  const items = results
    .filter(r => r.delta_pct != null)
    .sort((a, b) => (b.delta_pct ?? 0) - (a.delta_pct ?? 0))

  return NextResponse.json(
    { items, year, prev_year: prev, fuente: 'World Bank · MS.MIL.XPND.CD' },
    { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } },
  )
}
