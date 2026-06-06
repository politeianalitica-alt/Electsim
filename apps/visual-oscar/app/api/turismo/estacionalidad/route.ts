/**
 * /api/turismo/estacionalidad · Turismo v3 · Sprint T2-cross
 *
 * Índice de estacionalidad turística: cruza la distribución mensual de la
 * demanda (FRONTUR/EOH · pico jul-ago, valle ene-feb) con la temperatura media
 * por CCAA costera (AEMET). Señala temporada alta/baja y la dependencia del
 * clima. Cruza Turismo con el módulo medio-rural/clima (AEMET).
 * Ver `lib/turismo/estacionalidad.ts`.
 *
 * Query:
 *   - ?ccaa=AND → CCAA costera para la señal climática (AND|CVA|CAT|BAL|CAN|MUR|GAL)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: EstacionalidadData | null, fetched_at, source_url, _meta }
 *
 * Auth: la señal climática requiere AEMET_API_KEY (gratis · registro en
 * opendata.aemet.es). Sin ella el índice de demanda se sirve igual con
 * temp_media:null y clima_source:'unavailable'.
 */
import { NextResponse } from 'next/server'
import { fetchEstacionalidad } from '@/lib/turismo/estacionalidad'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const ccaa = (searchParams.get('ccaa') || 'AND').toUpperCase()

  try {
    const res = await fetchEstacionalidad({ ccaa })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'ine_frontur_eoh+aemet',
          source_label: 'INE FRONTUR/EOH (demanda) + AEMET (clima)',
          env_hint: 'AEMET_API_KEY (opcional · señal climática)',
          register_url: 'https://opendata.aemet.es/centrodedescargas/altaUsuario',
          cache_ttl_seconds: 43200,
          note: 'Índice de demanda mensual (curado+datado) cruzado con temperatura media AEMET por CCAA costera. Degrada sin AEMET.',
        },
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400' },
      },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source_url: 'https://www.ine.es/',
      },
      { status: 200 },
    )
  }
}
