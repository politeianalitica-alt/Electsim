/**
 * GET /api/defense/empresas — listado con cotizaciones en vivo.
 */
import { NextResponse } from 'next/server'
import { EMPRESAS_COTIZADAS, fetchAllQuotes } from '@/lib/defense/empresas-cotizadas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

export async function GET() {
  const tickers = EMPRESAS_COTIZADAS.map(e => e.ticker).filter(t => !t.includes('-NR'))
  const quotes = await fetchAllQuotes(tickers).catch(() => ({}))

  const empresas = EMPRESAS_COTIZADAS.map(e => ({
    ...e,
    cotizacion: quotes[e.ticker] ?? null,
  }))

  return NextResponse.json(
    { empresas, ts: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300' } },
  )
}
