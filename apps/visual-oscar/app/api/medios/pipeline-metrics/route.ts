/**
 * GET /api/medios/pipeline-metrics · agregación de PipelineMetrics on-the-fly.
 *
 * Sprint 0.4: para cada artículo en la ventana, registra el outcome (success/
 * noise/duplicate/failed) en un accumulator y devuelve la agregación finalize().
 * Sprint 1.1+: leerá los counters directamente de tabla pipeline_runs.
 *
 * Query:
 *   - window: 24h | 48h | 72h | 7d (default 72h)
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  createAccumulator,
  finalize,
  recordOutcome,
} from '@/lib/medios/canonical/metrics'
import {
  readArticlesInWindow,
  windowToSinceISO,
} from '@/lib/medios/canonical/stores'
import type { WindowSpec } from '@/lib/medios/canonical/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const VALID_WINDOWS: WindowSpec[] = ['24h', '48h', '72h', '7d']

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const windowParam = url.searchParams.get('window') ?? '72h'
  if (!(VALID_WINDOWS as string[]).includes(windowParam)) {
    return NextResponse.json(
      { error: 'invalid_window', validWindows: VALID_WINDOWS },
      { status: 400 },
    )
  }
  const window = windowParam as WindowSpec
  const since = windowToSinceISO(window)
  const articles = await readArticlesInWindow(window, url.origin)

  const acc = createAccumulator()
  for (const a of articles) {
    const status: 'success' | 'noise' | 'duplicate' | 'failed' = a.isNoise
      ? 'noise'
      : a.isDuplicate
        ? 'duplicate'
        : a.processingStatus === 'success'
          ? 'success'
          : 'failed'
    recordOutcome(acc, {
      status,
      failedStep: a.isDuplicate ? 'dedupe_exact' : a.failedStep,
      method: a.topicTags[0]?.method,
      confidence: a.topicTags[0]?.confidence,
      topicId: a.topicTags[0]?.topicId,
      hasEntities: a.entities.length > 0,
    })
  }
  const metrics = finalize(acc, since, new Date().toISOString())
  return NextResponse.json(metrics, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
