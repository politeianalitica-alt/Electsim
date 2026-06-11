/**
 * GET /api/entsoe/indisponibilidades?zone=ES&days=14&tipo=planned|forced|all
 * Sprint Energía S3+
 *
 * Indisponibilidades de unidades de generación / OUTAGES (documentType A80) de
 * una zona de oferta UE, vía ENTSO-E Transparency Platform. El filtro `tipo`
 * acota a planificadas (businessType A53) o forzadas (A54); `all` (por defecto)
 * no filtra. Ventana `days` por defecto 14, acotada al rango 1..90.
 * Envelope estándar Politeia: { ok, data, error, fetched_at, source_url }
 * (HTTP 200 siempre, degradación en `ok:false`).
 *
 * Auth: ENTSOE_SECURITY_TOKEN (Web API Security Token). Si falta, `ok:false`
 * con mensaje claro. Caché HTTP s-maxage 1h.
 */
import { NextRequest, NextResponse } from 'next/server'
import { periodForDays } from '@/lib/entsoe/client'
import { fetchGenerationOutages, type EntsoeOutageOpts } from '@/lib/entsoe/extended'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CACHE = { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' }

export async function GET(req: NextRequest) {
  const zone = req.nextUrl.searchParams.get('zone') || 'ES'
  const days = clamp(Number(req.nextUrl.searchParams.get('days') || 14), 1, 90)
  const tipo = (req.nextUrl.searchParams.get('tipo') || 'all').toLowerCase()
  const { periodStart, periodEnd } = periodForDays(days)

  // tipo=planned → A53, tipo=forced → A54, tipo=all → sin filtro.
  const opts: EntsoeOutageOpts | undefined =
    tipo === 'planned'
      ? { businessType: 'A53' }
      : tipo === 'forced'
        ? { businessType: 'A54' }
        : undefined

  const r = await fetchGenerationOutages(zone, periodStart, periodEnd, opts)
  return NextResponse.json(
    { ok: r.ok, data: r.ok ? r.data : null, error: r.error, fetched_at: r.fetched_at, source_url: r.source_url },
    { headers: CACHE },
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo))
}
