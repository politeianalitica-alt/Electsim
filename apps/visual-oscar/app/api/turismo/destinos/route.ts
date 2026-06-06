/**
 * /api/turismo/destinos · Turismo v3 · Sprint T2-cross
 *
 * Catálogo de destinos turísticos de España (DE-HARDCODE del antiguo
 * data/tourism/destinations_seed.json · ahora lib/turismo/destinos-catalog.ts)
 * ENRIQUECIDO con pernoctaciones por CCAA en vivo (Eurostat tour_occ_nin2c
 * NUTS2, o el lib hermano lib/turismo/ccaa si existe). Cada destino marca
 * `live` (true/false). Ver `lib/turismo/destinos.ts`.
 *
 * Query:
 *   - ?tipo=costa  → filtra por tipo de turismo
 *     (ciudad|costa|isla|rural|interior|cultural|esqui|naturaleza|gastronomico|religioso)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: DestinosData | null, fetched_at, source_url, _meta }
 */
import { NextResponse } from 'next/server'
import { fetchDestinos } from '@/lib/turismo/destinos'
import type { DestinoTipo } from '@/lib/turismo/destinos-catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const VALID_TIPOS: DestinoTipo[] = [
  'ciudad', 'costa', 'isla', 'rural', 'interior',
  'cultural', 'esqui', 'naturaleza', 'gastronomico', 'religioso',
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tipoRaw = (searchParams.get('tipo') || '').trim().toLowerCase()
  const tipo = (VALID_TIPOS as string[]).includes(tipoRaw) ? (tipoRaw as DestinoTipo) : undefined

  try {
    const res = await fetchDestinos({ tipo })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'catalogo+eurostat',
          source_label: 'Catálogo destinos Politeia + Eurostat pernoctaciones NUTS2',
          cache_ttl_seconds: 43200,
          note: 'Catálogo de destinos (de-hardcode) enriquecido con pernoctaciones por CCAA en vivo. Cada destino marca live vs catálogo.',
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
        source_url: 'https://ec.europa.eu/eurostat',
      },
      { status: 200 },
    )
  }
}
