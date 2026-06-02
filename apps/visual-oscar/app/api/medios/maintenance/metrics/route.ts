/**
 * GET /api/medios/maintenance/metrics · Sprint 2 C9.
 *
 * Devuelve la serie temporal de snapshots `pipeline_metrics` (escritos cada
 * 24h por el cron `classifier-metrics` registrado en
 * `lib/medios/canonical/maintenance/index.ts`) en la ventana solicitada:
 *
 *   ?window=24h | 7d | 30d   (default 24h)
 *
 * Consumidores:
 *   - UI futura: dashboard de salud del pipeline en /estudio con gráfico
 *     temporal de `otro_percentage`, `fetched_total`, etc.
 *   - Diagnóstico operacional: detectar el día en que cambió el modelo del
 *     clasificador y comparar `classification_by_method` antes/después.
 *
 * Cache: 5 min (s-maxage=300, stale-while-revalidate=600). El cron sólo
 * escribe una vez al día, así que un TTL de 5 min es seguro y reduce
 * carga DB en /estudio.
 */
import { NextResponse } from 'next/server'
import { readPipelineMetrics } from '@/lib/medios/canonical/stores/pipeline-metrics-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_WINDOWS = ['24h', '7d', '30d'] as const
type Window = (typeof VALID_WINDOWS)[number]

export async function GET(req: Request) {
  const url = new URL(req.url)
  const windowParam = url.searchParams.get('window') ?? '24h'
  if (!(VALID_WINDOWS as readonly string[]).includes(windowParam)) {
    return NextResponse.json(
      { error: `Invalid window: ${windowParam}`, validWindows: VALID_WINDOWS },
      { status: 400 },
    )
  }
  const window = windowParam as Window
  const series = await readPipelineMetrics(window)
  return NextResponse.json(
    { window, series },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  )
}
