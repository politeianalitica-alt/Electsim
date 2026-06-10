/**
 * GET /api/entsoe/capacidad?zone=ES&year=YYYY · Sprint Energía S3+
 *
 * Capacidad instalada agregada por tecnología (documentType A68 · processType
 * A33, anual) de una zona de oferta UE, vía ENTSO-E Transparency Platform.
 * El año por defecto es el actual; se acota al rango 2015..año actual.
 * Envelope estándar Politeia: { ok, data, error, fetched_at, source_url }
 * (HTTP 200 siempre, degradación en `ok:false`).
 *
 * Auth: ENTSOE_SECURITY_TOKEN (Web API Security Token). Si falta, `ok:false`
 * con mensaje claro. Caché HTTP s-maxage 1h (datos anuales muy estables).
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchInstalledCapacity } from '@/lib/entsoe/extended'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CACHE = { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' }

export async function GET(req: NextRequest) {
  const zone = req.nextUrl.searchParams.get('zone') || 'ES'
  const currentYear = new Date().getUTCFullYear()
  const year = clamp(
    Number(req.nextUrl.searchParams.get('year') || currentYear),
    2015,
    currentYear,
  )

  const r = await fetchInstalledCapacity(zone, year)
  return NextResponse.json(
    { ok: r.ok, data: r.ok ? r.data : null, error: r.error, fetched_at: r.fetched_at, source_url: r.source_url },
    { headers: CACHE },
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? Math.trunc(n) : hi))
}
