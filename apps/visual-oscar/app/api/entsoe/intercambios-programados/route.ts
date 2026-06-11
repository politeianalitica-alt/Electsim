/**
 * GET /api/entsoe/intercambios-programados?from=ES&to=FR&days=2
 * Sprint Energía S3+
 *
 * Intercambios comerciales programados day-ahead (documentType A09 ·
 * contract_MarketAgreement.type A05) entre dos zonas de oferta UE, vía ENTSO-E
 * Transparency Platform. Envelope estándar Politeia:
 *   { ok, data, error, fetched_at, source_url }  (HTTP 200 siempre).
 *
 * Auth: ENTSOE_SECURITY_TOKEN (Web API Security Token). Si falta, `ok:false`
 * con mensaje claro. Caché HTTP s-maxage 1h (datos horarios).
 */
import { NextRequest, NextResponse } from 'next/server'
import { periodForDays } from '@/lib/entsoe/client'
import { fetchScheduledExchanges } from '@/lib/entsoe/extended'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CACHE = { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' }

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from') || 'ES'
  const to = req.nextUrl.searchParams.get('to') || 'FR'
  const days = clamp(Number(req.nextUrl.searchParams.get('days') || 2), 1, 7)
  const { periodStart, periodEnd } = periodForDays(days)

  const r = await fetchScheduledExchanges(from, to, periodStart, periodEnd)
  return NextResponse.json(
    { ok: r.ok, data: r.ok ? r.data : null, error: r.error, fetched_at: r.fetched_at, source_url: r.source_url },
    { headers: CACHE },
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo))
}
