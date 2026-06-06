/**
 * /api/energia/petroleo-origenes · Energía v3 · E2-data
 *
 * Orígenes del crudo importado por España (catálogo CORES/MITECO) estructurado
 * con `fuente`, `fuente_url`, `fecha_ref` y una métrica de `freshness` (días
 * desde la fecha de referencia + nivel). CORES publica mensual sin API JSON, así
 * que el dato es curado pero HONESTO (datado). Ver `lib/energia/petroleo-origenes.ts`.
 *
 * Sin query params.
 *
 * Respuesta (patrón Politeia · HTTP 200):
 *   { ok, data: PetroleoOrigenesData, fetched_at, source_url, _meta }
 *   `data.source` = 'catalog'; `data.freshness` lleva dias_desde_ref + nivel.
 *
 * Cache: s-maxage=43200 (12h). Sin red, sin env vars.
 */
import { NextResponse } from 'next/server'
import { fetchPetroleoOrigenes } from '@/lib/energia/petroleo-origenes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  try {
    const res = await fetchPetroleoOrigenes()
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'cores_catalog',
          source_label: 'CORES · estadística de aprovisionamiento de crudo (MITECO · curado + datado)',
          cache_ttl_seconds: 43200,
          note: 'Orígenes del crudo: curado de CORES (publica mensual, sin API JSON). Estructurado con fuente, fecha_ref y freshness explícitos para ser honesto sobre la antigüedad.',
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
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source_url: 'https://www.cores.es/es/estadisticas',
      },
      { status: 200 },
    )
  }
}
