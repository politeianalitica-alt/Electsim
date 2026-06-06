/**
 * GET /api/turismo/ccaa · Pernoctaciones / llegadas por CCAA · T2-ine.
 *
 * Distribución territorial del turismo por Comunidad Autónoma (NUTS2), apto
 * para choropleth: pernoctaciones + cuota nacional + YoY + llegadas por CCAA,
 * con código ISO 3166-2. Ver lib/turismo/ccaa.ts.
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: CcaaData, fetched_at, source_url, partial?, _meta }
 *   data.rows = [{ ccaa, ccaa_iso, nuts2, pernoctaciones, cuota_pct, yoy_pct,
 *                  llegadas, llegadas_cuota_pct }]
 *
 * Fuente: Eurostat · tour_occ_nin2 (pernoctaciones NUTS2) + tour_occ_arn2
 * (llegadas NUTS2). Pública, sin auth. Cache s-maxage 24h.
 */
import { NextResponse } from 'next/server'
import { fetchCcaa } from '@/lib/turismo/ccaa'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const META = {
  source: 'eurostat_tour_nuts2',
  source_label: 'Eurostat · tour_occ_nin2 (pernoctaciones NUTS2) + tour_occ_arn2 (llegadas NUTS2)',
  auth_required: false,
  cache_ttl_seconds: 86400,
  note: 'Distribución turística por CCAA (NUTS2) · pernoctaciones + cuota + YoY + llegadas. Apto para choropleth (ccaa_iso).',
}

export async function GET() {
  try {
    const res = await fetchCcaa()
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
        source_url: 'https://ec.europa.eu/eurostat',
        _meta: META,
      },
      { status: 200 },
    )
  }
}
