/**
 * GET /api/agro/regional?crop=C1110[&year=2023]
 *
 * Producción de un cultivo por Comunidad Autónoma (NUTS2) desde Eurostat
 * apro_cpshr (Crop production by NUTS 2 region). Alimenta la coropleta de
 * CCAA en «Producción» y la dimensión regional de «Demanda y Mercados».
 *
 * Cultivos válidos en CULTIVOS_EUROSTAT (lib/agro/sources/eurostat-agro).
 * Devuelve también ese catálogo para que la UI ofrezca el selector.
 *
 * Degradación honesta: si Eurostat no responde, ok:false con motivo.
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchProduccionRegional, CULTIVOS_EUROSTAT } from '@/lib/agro/sources/eurostat-agro'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const crop = req.nextUrl.searchParams.get('crop') || CULTIVOS_EUROSTAT[0].code
  const year = req.nextUrl.searchParams.get('year') || undefined
  const cultivoMeta = CULTIVOS_EUROSTAT.find((c) => c.code === crop)

  const r = await fetchProduccionRegional(crop, year)
  if (!r.ok) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        crop,
        cultivos: CULTIVOS_EUROSTAT,
        fuente: 'Eurostat · apro_cpshr',
        fuente_url: 'https://ec.europa.eu/eurostat/databrowser/view/apro_cpshr/default/table',
        fuentes_error: [r.error],
      },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=21600' } }
    )
  }

  const total = r.values.reduce((acc, v) => acc + (v.value ?? 0), 0)
  const ranked = [...r.values]
    .filter((v) => v.value != null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .map((v) => ({
      ...v,
      share_pct: total > 0 ? Number((((v.value ?? 0) / total) * 100).toFixed(1)) : null,
    }))

  return NextResponse.json(
    {
      ok: true,
      data: {
        crop,
        cultivo_nombre: cultivoMeta?.nombre ?? crop,
        cultivo_color: cultivoMeta?.color ?? '#16A34A',
        year: r.year,
        unidad: 'toneladas',
        total_es: Number(total.toFixed(0)),
        values: ranked,
        cultivos: CULTIVOS_EUROSTAT,
      },
      fuente: `Eurostat · apro_cpshr · año ${r.year}`,
      fuente_url: 'https://ec.europa.eu/eurostat/databrowser/view/apro_cpshr/default/table',
      generado_en: 'ISR · cache 1h',
    },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=21600' } }
  )
}
