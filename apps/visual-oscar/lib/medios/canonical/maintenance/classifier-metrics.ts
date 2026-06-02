/**
 * Sprint 2 C9 · Job classifier-metrics (cron schedule 'daily').
 *
 * Agrega métricas pipeline últimas 24h sobre `article` (Railway Postgres) y
 * persiste un snapshot en `pipeline_metrics` (migración 0058). Sirve para:
 *   - Detectar regresiones del clasificador semántico (Layer 3 Groq) tras
 *     cambios de prompt / modelo (Sprint 1.3+).
 *   - Trackear evolución de `otro_percentage` en serie temporal — UI Estudio
 *     consume `/api/medios/maintenance/metrics?window=30d`.
 *   - Forensics post-incidente: si un day tuvo errores LLM masivos, este
 *     snapshot lo registra en `failed_in_pipeline.semantic_llm`.
 *
 * Agregación SQL (último 24h, ventana relativa NOW() - 24h):
 *   - fetched_total              ← COUNT(*)
 *   - duplicates_exact           ← COUNT(*) FILTER (is_duplicate = TRUE)
 *   - noise_filtered             ← COUNT(*) FILTER (is_noise = TRUE)
 *   - processed_successfully     ← COUNT(*) FILTER (processing_status = 'completed')
 *   - classified_with_taxonomy   ← COUNT(*) FILTER (categoria IS NOT NULL AND ≠ 'OTRO')
 *   - otro_count                 ← COUNT(*) FILTER (categoria = 'OTRO')
 *
 * Limitaciones Sprint 2:
 *   - `classification_by_method` no está separado a nivel de tabla `article`
 *     (no hay columna `classification_method`). Heurística temporal:
 *       · classified_with_taxonomy → bucket RSS_TAG_OR_HEURISTIC
 *       · otro_count               → bucket NONE
 *       · SEMANTIC_LLM             → 0 (TODO: añadir columna en Sprint 3)
 *     C10+ refinará con agregación desde logs estructurados.
 *   - `duplicates_titular`, `with_entities`, `clustered_*` quedan en 0 —
 *     no rastreados aún por Sprint 0+1; placeholders para Sprint 3+.
 *
 * Test injection:
 *   - El parámetro opcional `injectedAggregator` corta la consulta DB y
 *     devuelve un `AggregatedMetrics` precanned. Patrón análogo a
 *     `__withTestRawTags` de unmapped-tags.ts pero como argument explícito
 *     (no mutable module-level state) — más limpio y thread-safe.
 *
 * Failure mode:
 *   - DB no disponible → withDb cae al fallback (emptyAggregate()), el
 *     INSERT también es noop. El job retorna con counts=0 sin lanzar.
 *   - Query SQL falla → withDb captura, el job logguea via JobResult.errors.
 */
import { withDb } from '../../../db/client.ts'
import { getRawSql } from '../../../db/sql.ts'
import {
  insertPipelineMetric,
  type PipelineMetricRow,
} from '../stores/pipeline-metrics-store.ts'
import type { JobResult } from './index.ts'

const T24H = 24 * 3600_000

export interface AggregatedMetrics {
  fetched_total: number
  duplicates_exact: number
  noise_filtered: number
  processed_successfully: number
  classified_with_taxonomy: number
  classification_by_method: Record<string, number>
  otro_count: number
  semantic_errors: number
}

function emptyAggregate(): AggregatedMetrics {
  return {
    fetched_total: 0,
    duplicates_exact: 0,
    noise_filtered: 0,
    processed_successfully: 0,
    classified_with_taxonomy: 0,
    classification_by_method: {
      RSS_TAG_OR_HEURISTIC: 0,
      SEMANTIC_LLM: 0,
      NONE: 0,
    },
    otro_count: 0,
    semantic_errors: 0,
  }
}

/**
 * Lee y agrega métricas pipeline en la ventana NOW() - 24h hasta NOW().
 *
 * Si `injectedAggregator` está presente, lo invoca directamente y salta DB.
 * Esto permite probar la lógica de `jobClassifierMetrics` sin tocar Postgres.
 */
export async function aggregateLastWindow(
  injectedAggregator?: () => Promise<AggregatedMetrics>,
): Promise<AggregatedMetrics> {
  if (injectedAggregator) return injectedAggregator()
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return emptyAggregate()
      const windowFrom = new Date(Date.now() - T24H)
      const rows = (await sql`
        SELECT
          COUNT(*)::int AS fetched_total,
          COUNT(*) FILTER (WHERE is_duplicate = TRUE)::int AS duplicates_exact,
          COUNT(*) FILTER (WHERE is_noise = TRUE)::int AS noise_filtered,
          COUNT(*) FILTER (WHERE processing_status = 'completed')::int AS processed_successfully,
          COUNT(*) FILTER (WHERE categoria IS NOT NULL AND categoria <> 'OTRO')::int AS classified_with_taxonomy,
          COUNT(*) FILTER (WHERE categoria = 'OTRO')::int AS otro_count
        FROM article
        WHERE ingested_at >= ${windowFrom.toISOString()}
      `) as Array<{
        fetched_total: number
        duplicates_exact: number
        noise_filtered: number
        processed_successfully: number
        classified_with_taxonomy: number
        otro_count: number
      }>
      const agg = rows[0]
      if (!agg) return emptyAggregate()
      const classifiedCount = Number(agg.classified_with_taxonomy) || 0
      const otroCount = Number(agg.otro_count) || 0
      // Heurística Sprint 2: separamos classified vs OTRO. SEMANTIC_LLM se
      // queda en 0 hasta que añadamos columna classification_method (Sprint 3).
      const methods: Record<string, number> = {
        RSS_TAG_OR_HEURISTIC: classifiedCount,
        SEMANTIC_LLM: 0,
        NONE: otroCount,
      }
      return {
        fetched_total: Number(agg.fetched_total) || 0,
        duplicates_exact: Number(agg.duplicates_exact) || 0,
        noise_filtered: Number(agg.noise_filtered) || 0,
        processed_successfully: Number(agg.processed_successfully) || 0,
        classified_with_taxonomy: classifiedCount,
        classification_by_method: methods,
        otro_count: otroCount,
        // TODO Sprint 3: agregar desde logs estructurados o columna nueva.
        semantic_errors: 0,
      }
    },
    () => emptyAggregate(),
  )
}

/**
 * Computa la fila `pipeline_metrics` desde un `AggregatedMetrics` y la
 * persiste. Retorna la fila persistida (también si DB es noop) para que el
 * caller pueda loggear/inspeccionar el snapshot.
 *
 * `otro_percentage` = (otro_count / fetched_total) * 100, redondeado a
 * 2 decimales. Ventana vacía → 0 (sin divide-by-zero).
 */
export async function jobClassifierMetrics(
  injectedAggregator?: () => Promise<AggregatedMetrics>,
): Promise<PipelineMetricRow> {
  const agg = await aggregateLastWindow(injectedAggregator)
  const otroPercentage =
    agg.fetched_total > 0
      ? Math.round((agg.otro_count / agg.fetched_total) * 10000) / 100
      : 0

  const now = new Date()
  const windowFrom = new Date(now.getTime() - T24H)
  const row: PipelineMetricRow = {
    window_from: windowFrom,
    window_to: now,
    fetched_total: agg.fetched_total,
    duplicates_exact: agg.duplicates_exact,
    // Sprint 0+1 sólo trackea exact duplicates; titular dedup vendrá Sprint 3+.
    duplicates_titular: 0,
    noise_filtered: agg.noise_filtered,
    processed_successfully: agg.processed_successfully,
    classified_with_taxonomy: agg.classified_with_taxonomy,
    // TODO Sprint 3: COUNT(*) FILTER (jsonb_array_length(entities) > 0)
    with_entities: 0,
    clustered_existing: 0,
    clustered_new: 0,
    failed_in_pipeline:
      agg.semantic_errors > 0 ? { semantic_llm: agg.semantic_errors } : {},
    classification_by_method: agg.classification_by_method,
    classification_confidence: {},
    otro_percentage: otroPercentage,
  }

  await insertPipelineMetric(row)
  return row
}

/**
 * Wrapper `JobResult` para registrar el job en `maintenance/index.ts`.
 * Emite log estructurado con métricas clave para visibilidad inmediata en
 * el output del cron Vercel.
 */
export async function classifierMetricsJob(): Promise<JobResult> {
  const t0 = Date.now()
  const errors: string[] = []
  let processed = 0
  try {
    const row = await jobClassifierMetrics()
    processed = row.fetched_total
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        event: 'maintenance.classifier_metrics',
        otro_pct: row.otro_percentage,
        by_method: row.classification_by_method,
        fetched_total: row.fetched_total,
      }),
    )
  } catch (e: unknown) {
    errors.push(String((e as Error)?.message ?? e))
  }
  return {
    job: 'classifier-metrics',
    durationMs: Date.now() - t0,
    itemsProcessed: processed,
    errors,
  }
}
