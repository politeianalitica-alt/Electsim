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
import { readPipelineMetrics } from '@/lib/medios/canonical/stores/pipeline-metrics-store'
import { withDb } from '@/lib/db/client'
import { getRawSql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type HealthStatus = 'ok' | 'degraded' | 'critical'

type TopicStateCounts = {
  STRUCTURAL: number
  EMERGENT: number
  STABLE: number
}

/**
 * Cuenta el último snapshot por topic (window_spec='24h') agrupado por
 * `state`. Refleja "topics actuales por estado", no toda la historia.
 *
 * Degradación graceful: si la DB no está disponible (sin DATABASE_URL o sin
 * drizzle/postgres), `withDb` cae al fallback y devolvemos ceros — el
 * endpoint nunca aborta por esto (mismo patrón que los stores canónicos).
 */
async function countTopicStates(): Promise<TopicStateCounts> {
  const zero: TopicStateCounts = { STRUCTURAL: 0, EMERGENT: 0, STABLE: 0 }
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return zero
      const rows = (await sql`
        SELECT state, COUNT(*)::int AS n
        FROM topic_prominence_history tph
        WHERE window_spec = '24h'
          AND computed_at = (
            SELECT MAX(computed_at)
            FROM topic_prominence_history tph2
            WHERE tph2.window_spec = '24h'
              AND tph2.topic_id = tph.topic_id
          )
        GROUP BY state
      `) as Array<{ state: string; n: number | string }>
      const out: TopicStateCounts = { STRUCTURAL: 0, EMERGENT: 0, STABLE: 0 }
      for (const r of rows) {
        const key = String(r.state).toUpperCase()
        if (key === 'STRUCTURAL' || key === 'EMERGENT' || key === 'STABLE') {
          out[key] = Number(r.n) || 0
        }
      }
      return out
    },
    () => zero,
  )
}

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

  // Sprint 2 · métricas agregadas: último snapshot pipeline_metrics + conteo
  // de topics por estado. Ambos degradan a vacío/ceros sin DB (stores guard).
  const [pipelineSnapshots, topicStates] = await Promise.all([
    readPipelineMetrics('24h'),
    countTopicStates(),
  ])
  const latestSnapshot = pipelineSnapshots[0] ?? null

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
      sprint2: {
        // Último snapshot diario del cron classifier-metrics (C9). null si
        // aún no hay snapshots o la DB no está disponible.
        latest_pipeline_metrics: latestSnapshot
          ? {
              window_from: latestSnapshot.window_from,
              window_to: latestSnapshot.window_to,
              fetched_total: latestSnapshot.fetched_total,
              otro_percentage: latestSnapshot.otro_percentage,
              classified_with_taxonomy: latestSnapshot.classified_with_taxonomy,
              classification_by_method: latestSnapshot.classification_by_method,
            }
          : null,
        // Conteo de topics por estado en el último snapshot 24h (C5).
        topic_states: topicStates,
        snapshots_24h: pipelineSnapshots.length,
      },
    },
    {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    },
  )
}
