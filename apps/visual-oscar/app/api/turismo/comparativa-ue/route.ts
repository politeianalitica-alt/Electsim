/**
 * GET /api/turismo/comparativa-ue · España vs Francia/Italia/Portugal/UE · T2-ine.
 *
 * Benchmark europeo para barras comparativas: por país, pernoctaciones +
 * llegadas anuales + %PIB turístico (ingresos por viajes / PIB nominal).
 * Ver lib/turismo/comparativa-ue.ts.
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: ComparativaUeData, fetched_at, source_url, partial?, _meta }
 *   data.paises = [{ geo, pais, es_ue, pernoctaciones, llegadas, pib_turistico_pct }]
 *
 * Fuente: Eurostat · tour_occ_ninat (pernoct) + tour_occ_arnat (llegadas) +
 * bop_its6_det (Travel) ÷ nama_10_gdp (PIB). Pública, sin auth. Cache 24h.
 */
import { NextResponse } from 'next/server'
import { fetchComparativaUe } from '@/lib/turismo/comparativa-ue'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const META = {
  source: 'eurostat_tourism_compare',
  source_label:
    'Eurostat · tour_occ_ninat + tour_occ_arnat + bop_its6_det (Travel) / nama_10_gdp',
  auth_required: false,
  cache_ttl_seconds: 86400,
  note: 'Benchmark UE · ES/FR/IT/PT vs UE-27 · pernoctaciones + llegadas + %PIB turístico (ingresos viajes balanza pagos ÷ PIB).',
}

export async function GET() {
  try {
    const res = await fetchComparativaUe()
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
