/**
 * GET /api/sectores/banca/comparativa-europa
 * Comparativa España vs principales economías europeas: crédito %PIB y NPL.
 */
import { NextResponse } from 'next/server'
import { getCrossCountry } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAISES = [
  { iso3: 'ESP', label: 'España',       destacado: true },
  { iso3: 'DEU', label: 'Alemania',     destacado: false },
  { iso3: 'FRA', label: 'Francia',      destacado: false },
  { iso3: 'ITA', label: 'Italia',       destacado: false },
  { iso3: 'NLD', label: 'Países Bajos', destacado: false },
  { iso3: 'PRT', label: 'Portugal',     destacado: false },
  { iso3: 'GBR', label: 'Reino Unido',  destacado: false },
  { iso3: 'BEL', label: 'Bélgica',      destacado: false },
  { iso3: 'AUT', label: 'Austria',      destacado: false },
  { iso3: 'GRC', label: 'Grecia',       destacado: false },
]

export async function GET() {
  const t0 = Date.now()
  const year = new Date().getFullYear() - 1
  const [credito, npl] = await Promise.all([
    getCrossCountry(PAISES.map(p => p.iso3), 'FS.AST.PRVT.GD.ZS', year),
    getCrossCountry(PAISES.map(p => p.iso3), 'FB.AST.NPER.ZS', year),
  ])

  const items = PAISES.map(p => {
    const c = credito.find(d => d.iso3 === p.iso3)
    const n = npl.find(d => d.iso3 === p.iso3)
    return {
      iso3: p.iso3, pais: p.label, destacado: p.destacado,
      credito_pib: c?.value ?? null, credito_year: c?.year,
      npl_pct: n?.value ?? null, npl_year: n?.year,
    }
  }).sort((a, b) => (b.credito_pib ?? 0) - (a.credito_pib ?? 0))

  return NextResponse.json({
    items, year,
    fetch_ms: Date.now() - t0,
    fuente: 'World Bank · cross-country FS.AST.PRVT.GD.ZS + FB.AST.NPER.ZS',
  }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } })
}
