/**
 * Sprint 0+1 · Task 7 · Job recompute-source-scores.
 *
 * Recalcula el `qualityScore` (∈ [0,1]) de cada Source del catálogo
 * `source-catalog.json` con los componentes definidos en la spec §2.5:
 *
 *   - Tasa noise en las últimas 1000 piezas      → peso 0.30
 *   - Tasa duplicados                            → peso 0.25
 *   - Proporción sin entidades resueltas         → peso 0.20
 *   - Proporción clasificadas correctamente      → peso 0.25
 *
 * Sprint 0+1: noop skeleton. El cálculo real requiere:
 *   1. Leer pipeline_runs (migración 0058) en las últimas N horas
 *      → conteo por sourceId × (success | noise | duplicate | failed).
 *   2. UPDATE source_quality_history SET score = <calc>
 *      WHERE source_id = $1 AND date_utc = CURRENT_DATE.
 *   3. Persistir el último score en sources.quality_score.
 *
 * Sprint 1.1+ lo implementa con SQL real. Aquí dejamos el shape
 * `JobResult` y la estructura observable para que el cron lo trate
 * como un job más sin cambios.
 */
import type { JobResult } from './index.ts'

export async function recomputeSourceScores(): Promise<JobResult> {
  const t0 = Date.now()
  const errors: string[] = []
  const processed = 0
  try {
    // Sprint 0+1: noop
  } catch (e: unknown) {
    errors.push(String((e as Error)?.message ?? e))
  }
  return {
    job: 'recompute-source-scores',
    durationMs: Date.now() - t0,
    itemsProcessed: processed,
    errors,
  }
}
