/**
 * /api/turismo/cruceros · Turismo v3 · Sprint T2-cross
 *
 * Tráfico de pasajeros de crucero por puerto español (Barcelona, Palma, Málaga,
 * Valencia, Canarias, Cádiz…). Cruza Turismo con el módulo Puertos: las cifras
 * son curadas+datadas (Puertos del Estado no expone API REST de pasajeros) y se
 * enriquecen con el slug del puerto en el módulo Puertos para deep-link SIN
 * duplicar datos. Ver `lib/turismo/cruceros.ts`.
 *
 * Query:
 *   - ?limit=N → nº de puertos top (default 14, clamp 1-30)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: CrucerosData | null, fetched_at, source_url, _meta }
 */
import { NextResponse } from 'next/server'
import { fetchCruceros } from '@/lib/turismo/cruceros'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limitRaw = parseInt(searchParams.get('limit') || '14', 10)
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(30, limitRaw)) : 14

  try {
    const res = await fetchCruceros({ limit })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'puertos_estado',
          source_label: 'Puertos del Estado · tráfico de pasajeros de crucero',
          cross_module: 'puertos',
          cache_ttl_seconds: 43200,
          note: 'Cifras de pasajeros de crucero por puerto español (curadas+datadas, año 2024), cruzadas con el módulo Puertos para deep-link.',
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
        source_url: 'https://www.puertos.es/es-es/estadisticas',
      },
      { status: 200 },
    )
  }
}
