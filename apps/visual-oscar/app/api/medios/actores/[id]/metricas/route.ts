/**
 * GET /api/medios/actores/[id]/metricas · stub Sprint 0+1.
 *
 * Devuelve un EntityMetrics shape estable con valores en 0.
 * Sprint 3 lo llenará con cálculo real desde la tabla entity_metrics.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } },
) {
  const entityId = decodeURIComponent(ctx.params.id || '').trim()
  return NextResponse.json(
    {
      entityId,
      window: '72h',
      prominenceScore: 0,
      articleCount: 0,
      sourceCount: 0,
      topicDistribution: {},
      sentimentProfile: {
        overall: { positive: 0, neutral: 1, negative: 0, mixed: 0 },
        byTopic: {},
        byIdeology: {},
      },
      coOccurrences: [],
      mediaDistribution: {},
      computedAt: new Date().toISOString(),
      _note: 'Sprint 3 llena con cálculo real desde entity_metrics tabla.',
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  )
}
