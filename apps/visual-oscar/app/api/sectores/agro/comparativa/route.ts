/**
 * GET /api/sectores/agro/comparativa
 * Comparativa España vs principales productores europeos · Agro %PIB + Food Index.
 */
import { NextResponse } from 'next/server'
import { getCrossCountry } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAISES = [
  { iso3: 'ESP', label: 'España',       destacado: true },
  { iso3: 'FRA', label: 'Francia',      destacado: false },
  { iso3: 'DEU', label: 'Alemania',     destacado: false },
  { iso3: 'ITA', label: 'Italia',       destacado: false },
  { iso3: 'NLD', label: 'Países Bajos', destacado: false },
  { iso3: 'PRT', label: 'Portugal',     destacado: false },
  { iso3: 'GBR', label: 'Reino Unido',  destacado: false },
  { iso3: 'POL', label: 'Polonia',      destacado: false },
  { iso3: 'GRC', label: 'Grecia',       destacado: false },
  { iso3: 'ROU', label: 'Rumanía',      destacado: false },
]

export async function GET() {
  const t0 = Date.now()
  const year = new Date().getFullYear() - 2
  const [pib, food, livestock] = await Promise.all([
    getCrossCountry(PAISES.map(p => p.iso3), 'NV.AGR.TOTL.ZS', year),
    getCrossCountry(PAISES.map(p => p.iso3), 'AG.PRD.FOOD.XD', year),
    getCrossCountry(PAISES.map(p => p.iso3), 'AG.PRD.LVSK.XD', year),
  ])
  const items = PAISES.map(p => {
    const pp = pib.find(d => d.iso3 === p.iso3)
    const ff = food.find(d => d.iso3 === p.iso3)
    const ll = livestock.find(d => d.iso3 === p.iso3)
    return {
      iso3: p.iso3, pais: p.label, destacado: p.destacado,
      agro_pib_pct: pp?.value ?? null,
      food_index: ff?.value ?? null,
      livestock_index: ll?.value ?? null,
      year: pp?.year || year,
    }
  }).sort((a, b) => (b.agro_pib_pct ?? 0) - (a.agro_pib_pct ?? 0))
  return NextResponse.json({
    items, year,
    fetch_ms: Date.now() - t0,
    fuente: 'World Bank · cross-country NV.AGR.TOTL.ZS + AG.PRD.{FOOD,LVSK}.XD',
  }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } })
}
