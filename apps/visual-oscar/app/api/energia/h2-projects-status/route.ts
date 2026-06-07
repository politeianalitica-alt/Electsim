/**
 * /api/energia/h2-projects-status · Energía v3 · E2-data
 *
 * Proyectos de hidrógeno renovable de España (catálogo PERTE ERHA · MITECO)
 * enriquecidos con fase canónica, `ultima_revision` (fecha), `fuente_url` por
 * proyecto y coordenadas, estructurados para un MAPA + TIMELINE. No hay API live
 * de proyectos H2 → curado pero datado. Ver `lib/energia/h2-projects-status.ts`.
 *
 * Sin query params.
 *
 * Respuesta (patrón Politeia · HTTP 200):
 *   { ok, data: H2StatusData, fetched_at, source_url, _meta }
 *   `data.proyectos[]` con fase/fase_label/ultima_revision/fuente_url/lat/lon;
 *   `data.por_fase` para la leyenda.
 *
 * Cache: s-maxage=43200 (12h). Sin red, sin env vars.
 */
import { NextResponse } from 'next/server'
import { fetchH2Status } from '@/lib/energia/h2-projects-status'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  try {
    const res = await fetchH2Status()
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'perte_erha_catalog',
          source_label: 'PERTE ERHA (MITECO) + promotores · proyectos H2 curados + datados',
          cache_ttl_seconds: 43200,
          note: 'Proyectos H2 enriquecidos para mapa/timeline (fase, ultima_revision, fuente_url, coords). Curado: no hay API pública en vivo. Capacidades/horizontes son objetivos de proyecto.',
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
        source_url: 'https://www.miteco.gob.es/es/energia/estrategia-normativa/hoja-de-ruta-hidrogeno.html',
      },
      { status: 200 },
    )
  }
}
