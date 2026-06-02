/**
 * Sprint 0+1 · Task 7 · Job cleanup-clusters.
 *
 * Cleanup de clusters obsoletos en `narrative_clusters` (migración 0058):
 *   - stale: sin nuevo artículo en 6h y con < 3 miembros (no fueron lo bastante
 *     relevantes para consolidar)
 *   - closed: sin nuevo artículo en 24h (vida útil agotada)
 *
 * Sprint 0+1: noop skeleton. Las tablas se crearon vacías en Task 6 y
 * todavía no hay UPDATE de `last_article_at` ni populate de `narrative_
 * clusters` desde el pipeline; ejecutar SQL aquí sería trabajar sobre
 * filas inexistentes.
 *
 * Sprint 1.1+ (cuando processArticle() ya escriba en narrative_clusters):
 *   UPDATE narrative_clusters
 *      SET status = 'stale'
 *    WHERE status = 'active'
 *      AND last_article_at < NOW() - INTERVAL '6 hours'
 *      AND article_count < 3;
 *   UPDATE narrative_clusters
 *      SET status = 'closed'
 *    WHERE status IN ('active', 'stale')
 *      AND last_article_at < NOW() - INTERVAL '24 hours';
 */
import type { JobResult } from './index.ts'

export async function cleanupClusters(): Promise<JobResult> {
  const t0 = Date.now()
  const errors: string[] = []
  const processed = 0
  try {
    // Sprint 0+1: noop (las tablas se crearon vacías en Task 6).
    // Sprint 1.1+: ejecutar UPDATE narrative_clusters SET status='stale'/'closed'
    //              vía el cliente DB que se introduzca con T9 / T10.
  } catch (e: unknown) {
    errors.push(String((e as Error)?.message ?? e))
  }
  return {
    job: 'cleanup-clusters',
    durationMs: Date.now() - t0,
    itemsProcessed: processed,
    errors,
  }
}
