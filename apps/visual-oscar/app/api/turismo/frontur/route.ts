/**
 * GET /api/turismo/frontur · Turistas internacionales (INE FRONTUR) · T2-ine.
 *
 * Serie mensual de turistas totales + desglose por mercado emisor (país de
 * residencia) del último mes, con cuota y variación interanual por país.
 * Ver lib/turismo/frontur.ts.
 *
 * Query:
 *   ?months=N → ventana de la serie total (default 24, clamp 6-60)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: FronturData, fetched_at, source_url, _meta }
 *   o { ok:false, data:null, error, fetched_at, source_url, _meta }
 *
 * Fuente: INE WSTempus · DATOS_TABLA/10822 (turistas por país de residencia,
 * mensual). Pública, sin auth. Cache s-maxage 12h.
 */
import { NextResponse } from 'next/server'
import { fetchFrontur } from '@/lib/turismo/frontur'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const META = {
  source: 'ine_frontur',
  source_label: 'INE · FRONTUR (Encuesta de Movimientos Turísticos en Frontera)',
  table: 'DATOS_TABLA/10822 · turistas por país de residencia',
  auth_required: false,
  cache_ttl_seconds: 43200,
  note: 'Llegadas de turistas internacionales · serie mensual total + desglose por mercado emisor (cuota + YoY).',
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const monthsRaw = parseInt(searchParams.get('months') || '24', 10)
  const months = Number.isFinite(monthsRaw) ? Math.max(6, Math.min(60, monthsRaw)) : 24

  try {
    const res = await fetchFrontur({ months })
    return NextResponse.json(
      { ...res, _meta: META },
      { headers: { 'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e).slice(0, 200),
        fetched_at: new Date().toISOString(),
        source_url: 'https://www.ine.es',
        _meta: META,
      },
      { status: 200 },
    )
  }
}
