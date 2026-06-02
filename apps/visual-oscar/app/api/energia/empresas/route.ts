/**
 * /api/energia/empresas · Sprint Energía S9
 *
 * Grid de empresas energéticas (catálogo `EMPRESAS_ENERGIA`) enriquecido con
 * cotización Finnhub. Para `/sector-energia/empresas`.
 *
 * Query:
 *   - ?energia=hidrogeno|petroleo|gas|electrico|renovables|nuclear  (filtro tipo)
 *   - ?pais=España  (filtro país exacto)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si Finnhub degrada):
 *   { ok, data: EnergyCompanyListItem[], count, fetched_at }
 *
 * Las cotizaciones que fallen degradan a quote.available=false (CLAUDE.md:
 * nunca datos sintéticos sin marcar). Cache HTTP 5 min.
 */
import { NextResponse } from 'next/server'
import { listEnergyCompanies } from '@/lib/energia/companies'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const energia = searchParams.get('energia') || undefined
  const pais = searchParams.get('pais') || undefined

  const fetched_at = new Date().toISOString()
  try {
    const data = await listEnergyCompanies({ energia, pais })
    const withQuote = data.filter((c) => c.quote?.available).length
    return NextResponse.json(
      {
        ok: true,
        data,
        count: data.length,
        with_quote: withQuote,
        fetched_at,
        _meta: {
          quote_source: 'finnhub',
          note: 'Catálogo curado EMPRESAS_ENERGIA + cotización Finnhub (tiempo real). Privadas (sin ticker) y rate-limited degradan a quote=null/available:false.',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: [],
        count: 0,
        error: e instanceof Error ? e.message : String(e),
        fetched_at,
      },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=60' } },
    )
  }
}
