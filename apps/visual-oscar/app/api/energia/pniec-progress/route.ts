/**
 * /api/energia/pniec-progress · Energía v3 · E2-data
 *
 * Progreso real hacia los objetivos del PNIEC 2030, combinando fuentes VIVAS
 * (cuota renovable del mix REE + potencia instalada solar/eólica de REE) con los
 * objetivos curados de `PNIEC_2030`. Cada métrica indica si su `valor_actual`
 * viene de fuente viva o del catálogo. Ver `lib/energia/pniec-progress.ts`.
 *
 * Sin query params (devuelve todas las métricas del PNIEC).
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso degradado):
 *   { ok, data: PniecProgressData, fetched_at, source_url, _meta }
 *   `data.metricas[].source` = 'live' | 'catalog'.
 *
 * Cache: s-maxage=21600 (6h). Endpoints REE keyless: no requiere env vars.
 */
import { NextResponse } from 'next/server'
import { fetchPniecProgress } from '@/lib/energia/pniec-progress'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  try {
    const res = await fetchPniecProgress()
    return NextResponse.json(
      {
        ...res,
        _meta: {
          source: 'ree_apidatos+pniec',
          source_label: 'REE apidatos (mix + capacidad) vs PNIEC 2023-2030 (MITECO)',
          cache_ttl_seconds: 21600,
          note: 'Progreso vs objetivos PNIEC 2030. valor_actual desde fuente viva (REE) donde es posible; el resto del catálogo curado. Ver metricas[].source.',
        },
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200' },
      },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: String((e as Error)?.message ?? e),
        fetched_at: new Date().toISOString(),
        source_url: 'https://www.miteco.gob.es/es/energia/estrategia-normativa/pniec.html',
      },
      { status: 200 },
    )
  }
}
