/**
 * GET /api/medios/clusters/[id] · stub Sprint 0.4.
 *
 * Devuelve un shape canónico estable (NewsCluster) con valores vacíos.
 * Sprint 1.1+ leerá `narrative_clusters` con members ArticleUnit completos.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } },
) {
  const id = decodeURIComponent(ctx.params.id || '').trim()
  const now = new Date().toISOString()
  return NextResponse.json(
    {
      id,
      title: '',
      leaderArticleId: '',
      memberIds: [],
      topic: {
        topicId: 'OTRO',
        subtopicId: null,
        level: 1,
        confidence: 0,
        method: 'FALLBACK',
        assignedAt: now,
      },
      entities: [],
      firstSeen: now,
      lastSeen: now,
      velocity: 0,
      sourceCount: 0,
      tierDistribution: {},
      territoryDistribution: {},
      ideologyDistribution: {},
      sentimentBalance: { positive: 0, neutral: 1, negative: 0, mixed: 0 },
      framingDistribution: {},
      prominence: 0,
      _note:
        'Sprint 1.1+ lee narrative_clusters tabla con members ArticleUnit completos',
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  )
}
