/**
 * GET /api/medios/clusters · adapter sobre /api/medios/intel narrative_clusters.
 *
 * Sprint 0.4: devuelve listado mapeado al shape canónico NewsCluster.
 * Sprint 1.1+: lee tabla narrative_clusters directamente.
 *
 * Query:
 *   - window: 24h | 48h | 72h | 7d (default 72h)
 *   - topic: filtra por topicId
 *   - minSources: mínimo de fuentes (default 2)
 *   - sortBy: prominence | velocity | recency | sourceCount
 *   - page, pageSize
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface LegacyCluster {
  id?: string
  title?: string
  label?: string
  topic_id?: string
  topic?: string
  first_seen?: string
  last_seen?: string
  source_count?: number
  prominence?: number
  velocity?: number
  supporting_news?: Array<{ id?: string } | string>
  member_ids?: Array<{ id?: string } | string>
}

interface MappedCluster {
  id: string
  title: string
  leaderArticleId: string
  memberIds: string[]
  topic: {
    topicId: string
    subtopicId: string | null
    level: 1
    confidence: number
    method: 'HEURISTIC'
    assignedAt: string
  }
  entities: unknown[]
  firstSeen: string
  lastSeen: string
  velocity: number
  sourceCount: number
  tierDistribution: Record<string, number>
  territoryDistribution: Record<string, number>
  ideologyDistribution: Record<string, number>
  sentimentBalance: { positive: number; neutral: number; negative: number; mixed: number }
  framingDistribution: Record<string, number>
  prominence: number
}

function windowToHours(w: string): number {
  if (w === '24h') return 24
  if (w === '48h') return 48
  if (w === '72h') return 72
  if (w === '7d') return 168
  return 72
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const window = url.searchParams.get('window') ?? '72h'
  const topic = url.searchParams.get('topic')
  const minSources = Math.max(1, Number(url.searchParams.get('minSources') ?? '2'))
  const sortBy = url.searchParams.get('sortBy') ?? 'prominence'
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const pageSize = Math.max(1, Math.min(100, Number(url.searchParams.get('pageSize') ?? '20')))

  const hours = windowToHours(window)
  try {
    const resp = await fetch(
      `${url.origin}/api/medios/intel?hours=${hours}&include=narrative_clusters,clusters`,
      { next: { revalidate: 300 } } as RequestInit,
    )
    if (!resp.ok) {
      return NextResponse.json(
        { clusters: [], page, pageSize, total: 0 },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
      )
    }
    const data = (await resp.json()) as {
      narrative_clusters?: LegacyCluster[]
      clusters?: LegacyCluster[]
    }
    const raw = data.narrative_clusters ?? data.clusters ?? []
    let clusters: MappedCluster[] = raw.map((c, i) => {
      const members = (c.supporting_news ?? c.member_ids ?? []) as Array<{ id?: string } | string>
      const memberIds = members
        .map((m) => (typeof m === 'string' ? m : m?.id ?? ''))
        .filter((s): s is string => Boolean(s))
      return {
        id: c.id ?? `cluster-${i}`,
        title: c.title ?? c.label ?? 'Sin título',
        leaderArticleId: '',
        memberIds,
        topic: {
          topicId: c.topic_id ?? c.topic ?? 'OTRO',
          subtopicId: null,
          level: 1,
          confidence: 0.7,
          method: 'HEURISTIC',
          assignedAt: new Date().toISOString(),
        },
        entities: [],
        firstSeen: c.first_seen ?? new Date().toISOString(),
        lastSeen: c.last_seen ?? new Date().toISOString(),
        velocity: Number(c.velocity ?? 0),
        sourceCount: Number(c.source_count ?? 0),
        tierDistribution: {},
        territoryDistribution: {},
        ideologyDistribution: {},
        sentimentBalance: { positive: 0, neutral: 1, negative: 0, mixed: 0 },
        framingDistribution: {},
        prominence: Number(c.prominence ?? 0),
      }
    })

    if (topic) clusters = clusters.filter((c) => c.topic.topicId === topic)
    if (minSources > 0) clusters = clusters.filter((c) => c.sourceCount >= minSources)

    if (sortBy === 'prominence') {
      clusters.sort((a, b) => b.prominence - a.prominence)
    } else if (sortBy === 'recency') {
      clusters.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
    } else if (sortBy === 'sourceCount') {
      clusters.sort((a, b) => b.sourceCount - a.sourceCount)
    } else if (sortBy === 'velocity') {
      clusters.sort((a, b) => b.velocity - a.velocity)
    }

    const total = clusters.length
    const start = (page - 1) * pageSize
    const slice = clusters.slice(start, start + pageSize)

    return NextResponse.json(
      { clusters: slice, page, pageSize, total },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    )
  } catch (e) {
    const err = e as { message?: string }
    return NextResponse.json(
      { error: 'upstream_failed', message: String(err?.message ?? e).slice(0, 200) },
      { status: 503 },
    )
  }
}
