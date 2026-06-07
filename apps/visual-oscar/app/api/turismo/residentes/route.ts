/**
 * GET /api/turismo/residentes · Turismo de residentes (INE ETR/FAMILITUR) · T2-ine.
 *
 * Demanda doméstica: viajes + pernoctaciones de residentes en España, con
 * desglose destino interno vs emisor (extranjero) del último periodo + serie.
 * Ver lib/turismo/residentes.ts.
 *
 * Query:
 *   ?n=N → nº de observaciones (trimestres) de la serie (default 12, clamp 4-40)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: ResidentesData, fetched_at, source_url, partial?, _meta }
 *
 * Fuente: INE WSTempus · DATOS_TABLA/12422 (ETR · destino principal). Pública,
 * sin auth. Cache s-maxage 24h.
 */
import { NextResponse } from 'next/server'
import { fetchResidentes } from '@/lib/turismo/residentes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const META = {
  source: 'ine_etr',
  source_label: 'INE · ETR (Encuesta de Turismo de Residentes · ex-FAMILITUR)',
  table: 'DATOS_TABLA/12422 · por tipo de destino principal',
  auth_required: false,
  cache_ttl_seconds: 86400,
  note: 'Turismo doméstico · viajes + pernoctaciones de residentes; destino interno (dentro de España) vs emisor (extranjero).',
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const nRaw = parseInt(searchParams.get('n') || '12', 10)
  const n = Number.isFinite(nRaw) ? Math.max(4, Math.min(40, nRaw)) : 12

  try {
    const res = await fetchResidentes({ n })
    return NextResponse.json(
      { ...res, _meta: META },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800' } },
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
