/**
 * GET /api/sectores/telecom/resumen
 * Indicadores TIC España vía World Bank.
 */
import { NextResponse } from 'next/server'
import { getSerie } from '@/lib/sources/worldbank'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const t0 = Date.now()
  // IT.NET.BBND.P2 = Fixed broadband subscriptions (per 100 people)
  // IT.CEL.SETS.P2 = Mobile cellular subscriptions (per 100 people)
  // IT.NET.USER.ZS = Individuals using the Internet (% of population)
  const [bbnd, mobile, internet] = await Promise.all([
    getSerie('ESP', 'IT.NET.BBND.P2', 2005),
    getSerie('ESP', 'IT.CEL.SETS.P2', 2005),
    getSerie('ESP', 'IT.NET.USER.ZS', 2005),
  ])
  const lastBb = bbnd.filter(p => p.value != null).pop()
  const lastMob = mobile.filter(p => p.value != null).pop()
  const lastNet = internet.filter(p => p.value != null).pop()
  return NextResponse.json({
    kpis: {
      broadband_p100: lastBb?.value,
      broadband_year: lastBb?.year,
      mobile_p100: lastMob?.value,
      mobile_year: lastMob?.year,
      internet_users_pct: lastNet?.value,
      internet_users_year: lastNet?.year,
    },
    serie_broadband: bbnd.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    serie_mobile: mobile.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    serie_internet: internet.filter(p => p.value != null).map(p => ({ t: String(p.year), v: p.value })),
    fetch_ms: Date.now() - t0,
    fuente: 'World Bank · ICT indicators',
  }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800' } })
}
