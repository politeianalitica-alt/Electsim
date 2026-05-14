/**
 * GET /api/sectores/defensa/comparativa-otan
 * Comparativa de gasto militar % PIB · España vs principales aliados OTAN.
 */
import { NextResponse } from 'next/server'
import { getCrossCountry } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAISES = [
  { iso3: 'POL', label: 'Polonia',          tag: 'OTAN' },
  { iso3: 'USA', label: 'Estados Unidos',   tag: 'OTAN' },
  { iso3: 'GBR', label: 'Reino Unido',      tag: 'OTAN' },
  { iso3: 'FRA', label: 'Francia',          tag: 'OTAN' },
  { iso3: 'DEU', label: 'Alemania',         tag: 'OTAN' },
  { iso3: 'ITA', label: 'Italia',           tag: 'OTAN' },
  { iso3: 'NLD', label: 'Países Bajos',     tag: 'OTAN' },
  { iso3: 'PRT', label: 'Portugal',         tag: 'OTAN' },
  { iso3: 'ESP', label: 'España',           tag: 'OTAN' },
  { iso3: 'NOR', label: 'Noruega',          tag: 'OTAN' },
  { iso3: 'SWE', label: 'Suecia',           tag: 'OTAN' },
  { iso3: 'TUR', label: 'Turquía',          tag: 'OTAN' },
]

export async function GET() {
  const t0 = Date.now()
  const year = new Date().getFullYear() - 1
  const data = await getCrossCountry(
    PAISES.map(p => p.iso3),
    'MS.MIL.XPND.GD.ZS',
    year,
  )
  const items = PAISES.map(p => {
    const r = data.find(d => d.iso3 === p.iso3)
    return {
      iso3: p.iso3,
      pais: p.label,
      pct_pib: r?.value ?? null,
      year: r?.year ?? null,
      cumple_otan: r?.value != null ? r.value >= 2.0 : null,
      tag: p.tag,
      destacado: p.iso3 === 'ESP',
    }
  }).sort((a, b) => (b.pct_pib ?? 0) - (a.pct_pib ?? 0))

  return NextResponse.json({
    items, year,
    media_otan: items.filter(i => i.pct_pib != null).reduce((a, i) => a + (i.pct_pib || 0), 0) / items.filter(i => i.pct_pib != null).length,
    cumplen_pct: items.filter(i => i.cumple_otan).length,
    no_cumplen_pct: items.filter(i => i.cumple_otan === false).length,
    fetch_ms: Date.now() - t0,
    fuente: 'World Bank · MS.MIL.XPND.GD.ZS comparativa OTAN',
  }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } })
}
