/**
 * /api/turismo/aena · Turismo v3 · Sprint T2-cross
 *
 * Pasajeros por aeropuerto de la red AENA (MAD, BCN, PMI, AGP, ALC, TFS, IBZ…).
 * El turismo internacional entra a España fundamentalmente por avión → este
 * endpoint cruza Turismo con conectividad aérea (módulo Infraestructuras).
 *
 * Query:
 *   - ?limit=N   → nº de aeropuertos top a devolver (default 20, clamp 1-50)
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data: AenaData | null, fetched_at, source_url, _meta }
 *
 * Fuente: AENA · Estadísticas de tráfico aéreo (aena.es) · datos.gob.es.
 * Sin API REST estable: si AENA_TRAFFIC_CSV_URL apunta a un CSV abierto, se
 * parsea en vivo; si no, sirve catálogo curado+datado (datos 2024). Ver
 * `lib/turismo/aena.ts`.
 */
import { NextResponse } from 'next/server'
import { fetchAena } from '@/lib/turismo/aena'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limitRaw = parseInt(searchParams.get('limit') || '20', 10)
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 20

  try {
    const res = await fetchAena({ limit })
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'aena',
          source_label: 'AENA · Estadísticas de tráfico aéreo',
          env_hint: 'AENA_TRAFFIC_CSV_URL (opcional · CSV abierto datos.gob.es)',
          cache_ttl_seconds: 43200,
          note: 'Pasajeros por aeropuerto español. Live si hay CSV abierto configurado; si no, catálogo curado+datado (datos 2024).',
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
        source_url: 'https://www.aena.es/es/estadisticas/inicio.html',
      },
      { status: 200 },
    )
  }
}
