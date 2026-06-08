/**
 * GET /api/sectores/defensa/resumen
 *
 * KPIs en vivo del sector defensa para el hero del dashboard:
 *   - gasto_pct_pib       · gasto militar último año disponible (% PIB)
 *   - gasto_usd_b         · gasto absoluto en miles de millones USD
 *   - gap_otan            · diferencia hasta el compromiso 2 % OTAN
 *   - contratos_defensa_n · contratos CPV 35 publicados últimos 90 días
 *
 * Cache CDN 24h (datos anuales).
 */
import { NextResponse } from 'next/server'
import { getSerie } from '@/lib/sources/worldbank'
import { searchTed } from '@/lib/sources/ted'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const COMPROMISO_OTAN_PCT = 2.0

export async function GET() {
  const t0 = Date.now()

  const [pctPib, usdAbs, contratos] = await Promise.all([
    getSerie('ESP', 'MS.MIL.XPND.GD.ZS', 2020),
    getSerie('ESP', 'MS.MIL.XPND.CD',    2020),
    searchTed({
      cpv_div: '35',
      desde: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      limit: 200,
    }, 6000),
  ])

  const lastPctPib = pctPib.filter(p => p.value != null).pop()
  const lastUsdAbs = usdAbs.filter(p => p.value != null).pop()

  return NextResponse.json({
    kpis: {
      gasto_pct_pib: lastPctPib?.value ?? null,
      gasto_pct_pib_year: lastPctPib?.year,
      gasto_usd_b: lastUsdAbs?.value != null ? Math.round(lastUsdAbs.value / 1e8) / 10 : null,
      gasto_usd_b_year: lastUsdAbs?.year,
      gap_otan_pp: lastPctPib?.value != null ? Math.round((COMPROMISO_OTAN_PCT - lastPctPib.value) * 100) / 100 : null,
      compromiso_otan_pct: COMPROMISO_OTAN_PCT,
      contratos_defensa_90d: contratos.items.length > 0 ? contratos.items.length : 0,
    },
    sources: {
      worldbank: { ok: pctPib.length > 0 },
      ted: { ok: contratos.ok, ms: contratos.ms },
    },
    fetch_ms: Date.now() - t0,
    fuente: 'World Bank · MS.MIL.XPND series + TED CPV 35',
  }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } })
}
