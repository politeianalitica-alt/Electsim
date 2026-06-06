/**
 * GET /api/turismo/egatur · Gasto turístico (INE EGATUR) · T2-ine.
 *
 * Gasto total + gasto medio por turista + gasto medio diario + estancia media
 * (duración media de los viajes), cada uno con serie + último valor + YoY.
 * Ver lib/turismo/egatur.ts.
 *
 * Query:
 *   ?n=N → nº de observaciones por serie (default 10, clamp 3-30)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: EgaturData, fetched_at, source_url, _meta }
 *
 * Fuente: INE WSTempus · DATOS_TABLA/23992 (EGATUR · serie anual nacional).
 * Pública, sin auth. Cache s-maxage 24h.
 */
import { NextResponse } from 'next/server'
import { fetchEgatur } from '@/lib/turismo/egatur'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const META = {
  source: 'ine_egatur',
  source_label: 'INE · EGATUR (Encuesta de Gasto Turístico)',
  table: 'DATOS_TABLA/23992',
  auth_required: false,
  cache_ttl_seconds: 86400,
  note: 'Gasto turístico internacional · gasto total (M€), gasto medio/turista, gasto medio diario, estancia media (noches).',
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const nRaw = parseInt(searchParams.get('n') || '10', 10)
  const n = Number.isFinite(nRaw) ? Math.max(3, Math.min(30, nRaw)) : 10

  try {
    const res = await fetchEgatur({ n })
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
