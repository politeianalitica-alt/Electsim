/**
 * GET /api/medios/health · Sprint 1.5 · Observabilidad pipeline canónica.
 *
 * Agrega:
 *   - Catálogos counts (entities, topics, rss mappings, sources)
 *   - Pipeline metrics actuales (consume /api/medios/pipeline-metrics?window=24h)
 *   - Pulso confidence score (consume /api/medios/pulso?window=24h)
 *   - Status semáforo derivado de pulso.confidence.score:
 *       >=0.7 → ok
 *       >=0.5 → degraded
 *       <0.5  → critical
 *
 * Equivalente Prensa al /api/health/macro-freshness del Sprint W de macro.
 *
 * Cache: s-maxage=300, stale-while-revalidate=600.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  loadEntityCatalog,
  loadRssTagMap,
  loadSourceCatalog,
  loadTopicRules,
} from '@/lib/medios/canonical/catalogs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type HealthStatus = 'ok' | 'degraded' | 'critical'

export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin
  const t0 = Date.now()

  const [entities, topicRules, rssTagMap, sources] = await Promise.all([
    loadEntityCatalog(),
    loadTopicRules(),
    loadRssTagMap(),
    loadSourceCatalog(),
  ])

  let pipeline: unknown = null
  let pulso: unknown = null
  await Promise.all([
    (async () => {
      try {
        const r = await fetch(`${base}/api/medios/pipeline-metrics?window=24h`, {
          cache: 'no-store',
        })
        if (r.ok) pipeline = await r.json()
      } catch {
        pipeline = null
      }
    })(),
    (async () => {
      try {
        const r = await fetch(`${base}/api/medios/pulso?window=24h`, {
          cache: 'no-store',
        })
        if (r.ok) pulso = await r.json()
      } catch {
        pulso = null
      }
    })(),
  ])

  const score = (pulso as { confidence?: { score?: number } } | null)?.confidence?.score ?? 0
  const status: HealthStatus = score >= 0.7 ? 'ok' : score >= 0.5 ? 'degraded' : 'critical'

  return NextResponse.json(
    {
      ok: status !== 'critical',
      status,
      ts: new Date().toISOString(),
      elapsed_ms: Date.now() - t0,
      pipeline,
      pulso_confidence: score,
      catalogs: {
        entities: entities.length,
        topics: (topicRules.topics as unknown[]).length,
        rss_mappings: (rssTagMap.mappings as unknown[]).length,
        sources: sources.length,
      },
    },
    {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    },
  )
}
