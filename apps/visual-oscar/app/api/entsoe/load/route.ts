/**
 * GET /api/entsoe/load?zone=ES&days=2&forecast=0|1 · Sprint Energía S3+
 *
 * Demanda total (documentType A65) de una zona de oferta UE, vía ENTSO-E
 * Transparency Platform. Con forecast=1 devuelve la previsión day-ahead
 * (processType A01, fetchLoadForecast); por defecto la demanda real
 * (processType A16, fetchTotalLoad). Envelope estándar Politeia:
 *   { ok, data, error, fetched_at, source_url }  (HTTP 200 siempre).
 *
 * Auth: ENTSOE_SECURITY_TOKEN (Web API Security Token). Si falta, `ok:false`
 * con mensaje claro. Caché HTTP s-maxage 1h (datos horarios).
 */
import { NextRequest, NextResponse } from 'next/server'
import { periodForDays } from '@/lib/entsoe/client'
import { fetchTotalLoad, fetchLoadForecast } from '@/lib/entsoe/extended'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CACHE = { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' }

export async function GET(req: NextRequest) {
  const zone = req.nextUrl.searchParams.get('zone') || 'ES'
  const days = clamp(Number(req.nextUrl.searchParams.get('days') || 2), 1, 7)
  const forecast = req.nextUrl.searchParams.get('forecast') === '1'
  const { periodStart, periodEnd } = periodForDays(days)

  const r = forecast
    ? await fetchLoadForecast(zone, periodStart, periodEnd)
    : await fetchTotalLoad(zone, periodStart, periodEnd)

  return NextResponse.json(
    { ok: r.ok, data: r.ok ? r.data : null, error: r.error, fetched_at: r.fetched_at, source_url: r.source_url },
    { headers: CACHE },
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo))
}
