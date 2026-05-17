/**
 * GET /api/sectores/defensa/sipri-multipais?from=2005&to=2024
 * Gasto militar % PIB · serie multi-país desde World Bank.
 * Reutiliza getCrossCountry para cada año del rango.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSerie } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAISES: Array<{ iso3: string; label: string; color: string }> = [
  { iso3: 'ESP', label: 'España',          color: '#DC2626' },
  { iso3: 'USA', label: 'EE.UU.',           color: '#1F4E8C' },
  { iso3: 'DEU', label: 'Alemania',         color: '#F59E0B' },
  { iso3: 'FRA', label: 'Francia',          color: '#3B82F6' },
  { iso3: 'GBR', label: 'Reino Unido',      color: '#6D28D9' },
  { iso3: 'POL', label: 'Polonia',          color: '#059669' },
  { iso3: 'ITA', label: 'Italia',           color: '#0EA5E9' },
  { iso3: 'NOR', label: 'Noruega',          color: '#8B5CF6' },
]

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const from = Number(sp.get('from') || 2005)
  const to   = Number(sp.get('to')   || new Date().getFullYear() - 1)

  const series = await Promise.all(
    PAISES.map(async (p) => {
      const pts = await getSerie(p.iso3, 'MS.MIL.XPND.GD.ZS', from, to)
      return {
        iso3: p.iso3,
        label: p.label,
        color: p.color,
        data: pts.map(pt => ({ year: pt.year, value: pt.value })),
      }
    })
  )

  return NextResponse.json(
    { series, from, to, fuente: 'World Bank · MS.MIL.XPND.GD.ZS' },
    { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } },
  )
}
