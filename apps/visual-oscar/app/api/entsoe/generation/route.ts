/**
 * GET /api/entsoe/generation?zone=ES&days=1 · Sprint Energía S3
 *
 * Generación por tecnología (documentType A75, processType A16 realised) de una
 * zona de oferta UE, vía ENTSO-E Transparency Platform. Envelope estándar
 * Politeia: { ok, data, fetched_at } (HTTP 200, degradación en `ok`).
 *
 * Auth: ENTSOE_SECURITY_TOKEN. Caché HTTP s-maxage 1h.
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchGeneration, periodForDays } from '@/lib/entsoe/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CACHE = { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' }

export async function GET(req: NextRequest) {
  const zone = req.nextUrl.searchParams.get('zone') || 'ES'
  const days = clamp(Number(req.nextUrl.searchParams.get('days') || 1), 1, 7)
  const { periodStart, periodEnd } = periodForDays(days)

  const r = await fetchGeneration(zone, periodStart, periodEnd)
  return NextResponse.json(
    { ok: r.ok, data: r.ok ? r.data : null, error: r.error, fetched_at: r.fetched_at, source_url: r.source_url },
    { headers: CACHE },
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo))
}
