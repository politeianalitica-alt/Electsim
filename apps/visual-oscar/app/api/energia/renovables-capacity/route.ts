/**
 * /api/energia/renovables-capacity · Energía v3 · E2-data
 *
 * Potencia instalada por tecnología del sistema eléctrico español, en VIVO desde
 * REE apidatos (`generacion/potencia-instalada`), con degradación honesta al
 * catálogo curado `CAPACIDAD_RENOVABLE_ES` si la API falla. Ver
 * `lib/energia/renovables-capacity.ts`.
 *
 * Query:
 *   - ?year=YYYY        → año de referencia (default: año actual)
 *   - ?geo=peninsular   → ámbito REE (peninsular|canarias|baleares|ceuta|melilla|ccaa)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso degradado):
 *   { ok, data: RenovablesCapacityData, fetched_at, source_url, _meta }
 *   `data.source` = 'live' (REE) | 'catalog' (fallback curado).
 *
 * Cache: s-maxage=43200 (12h · la potencia instalada cambia mensual/anual).
 * Endpoint REE keyless: no requiere env vars.
 */
import { NextResponse } from 'next/server'
import { fetchRenovablesCapacity } from '@/lib/energia/renovables-capacity'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const yearRaw = parseInt(searchParams.get('year') || '', 10)
  const year = Number.isFinite(yearRaw) ? yearRaw : undefined
  const geo = (searchParams.get('geo') || 'peninsular').toLowerCase() as
    | 'peninsular' | 'canarias' | 'baleares' | 'ceuta' | 'melilla' | 'ccaa'

  try {
    const res = await fetchRenovablesCapacity({ year, geoLimit: geo })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'ree_apidatos',
          source_label: 'REE · apidatos · potencia instalada (con fallback catálogo)',
          cache_ttl_seconds: 43200,
          note: 'Potencia instalada por tecnología (MW). Live desde REE; degrada al catálogo curado si la API falla. data.source indica la procedencia.',
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
        source_url: 'https://www.ree.es/es/apidatos',
      },
      { status: 200 },
    )
  }
}
