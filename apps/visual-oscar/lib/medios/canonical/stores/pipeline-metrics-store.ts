/**
 * Sprint 2 C9 · Acceso a `pipeline_metrics` (Railway Postgres).
 *
 * Tabla creada por migración 0058 (ya aplicada en Railway prod):
 *
 *   pipeline_metrics (
 *     id BIGSERIAL PRIMARY KEY,
 *     window_from TIMESTAMPTZ NOT NULL,
 *     window_to TIMESTAMPTZ NOT NULL,
 *     fetched_total INTEGER NOT NULL DEFAULT 0,
 *     duplicates_exact INTEGER NOT NULL DEFAULT 0,
 *     duplicates_titular INTEGER NOT NULL DEFAULT 0,
 *     noise_filtered INTEGER NOT NULL DEFAULT 0,
 *     processed_successfully INTEGER NOT NULL DEFAULT 0,
 *     classified_with_taxonomy INTEGER NOT NULL DEFAULT 0,
 *     with_entities INTEGER NOT NULL DEFAULT 0,
 *     clustered_existing INTEGER NOT NULL DEFAULT 0,
 *     clustered_new INTEGER NOT NULL DEFAULT 0,
 *     failed_in_pipeline JSONB NOT NULL DEFAULT '{}',
 *     classification_by_method JSONB NOT NULL DEFAULT '{}',
 *     classification_confidence JSONB NOT NULL DEFAULT '{}',
 *     otro_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
 *     recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   )
 *
 * Función pública:
 *   - insertPipelineMetric(row)         → INSERT idempotente (no UPSERT,
 *                                          cada cron run produce un nuevo
 *                                          snapshot del último 24h).
 *   - readPipelineMetrics(window)       → series DESC por recorded_at,
 *                                          filtrada por interval.
 *
 * Si Postgres NO está disponible (dev sin DATABASE_URL, o sin paquetes pg
 * instalados), las funciones degradan a noop / array vacío. Esto asegura
 * que ni el cron ni el endpoint aborten en entornos donde la DB no está
 * lista.
 */
import { withDb } from '../../../db/client.ts'
import { getRawSql } from '../../../db/sql.ts'

export interface PipelineMetricRow {
  window_from: Date
  window_to: Date
  fetched_total: number
  duplicates_exact: number
  duplicates_titular: number
  noise_filtered: number
  processed_successfully: number
  classified_with_taxonomy: number
  with_entities: number
  clustered_existing: number
  clustered_new: number
  failed_in_pipeline: Record<string, number>
  classification_by_method: Record<string, number>
  classification_confidence: Record<string, number>
  otro_percentage: number
}

/**
 * Persiste una fila de métricas pipeline. JSONB columns se serializan con
 * `JSON.stringify()` y cast `::jsonb` explícito (postgres-js no infiere el
 * tipo desde Record<string, number>).
 *
 * Failure mode: si DB no disponible, withDb cae al fallback noop. Si la
 * query falla en runtime (p.ej. schema migration drift), withDb captura y
 * el error queda en consola pero el job no aborta.
 */
export async function insertPipelineMetric(row: PipelineMetricRow): Promise<void> {
  await withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return
      await sql`
        INSERT INTO pipeline_metrics (
          window_from, window_to, fetched_total, duplicates_exact, duplicates_titular,
          noise_filtered, processed_successfully, classified_with_taxonomy, with_entities,
          clustered_existing, clustered_new, failed_in_pipeline, classification_by_method,
          classification_confidence, otro_percentage
        ) VALUES (
          ${row.window_from.toISOString()}, ${row.window_to.toISOString()}, ${row.fetched_total},
          ${row.duplicates_exact}, ${row.duplicates_titular}, ${row.noise_filtered},
          ${row.processed_successfully}, ${row.classified_with_taxonomy}, ${row.with_entities},
          ${row.clustered_existing}, ${row.clustered_new},
          ${JSON.stringify(row.failed_in_pipeline)}::jsonb,
          ${JSON.stringify(row.classification_by_method)}::jsonb,
          ${JSON.stringify(row.classification_confidence)}::jsonb,
          ${row.otro_percentage}
        )
      `
    },
    () => undefined,
  )
}

/**
 * Lee snapshots `pipeline_metrics` en la ventana solicitada, ordenados por
 * `recorded_at` DESC (más reciente primero).
 *
 * Window → INTERVAL Postgres:
 *   - '24h' → '1 day'
 *   - '7d'  → '7 days'
 *   - '30d' → '30 days'
 *
 * Devuelve `[]` si DB no disponible.
 */
export async function readPipelineMetrics(
  window: '24h' | '7d' | '30d',
): Promise<PipelineMetricRow[]> {
  // intervalDays es una constante del módulo (no input de usuario), por lo
  // que es seguro interpolarla en el tagged-template como bind numérico.
  const intervalDays = window === '24h' ? 1 : window === '7d' ? 7 : 30
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return [] as PipelineMetricRow[]
      const rows = (await sql`
        SELECT
          window_from, window_to, fetched_total, duplicates_exact, duplicates_titular,
          noise_filtered, processed_successfully, classified_with_taxonomy, with_entities,
          clustered_existing, clustered_new, failed_in_pipeline, classification_by_method,
          classification_confidence, otro_percentage::float AS otro_percentage
        FROM pipeline_metrics
        WHERE recorded_at >= NOW() - (${intervalDays} * INTERVAL '1 day')
        ORDER BY recorded_at DESC
      `) as Array<{
        window_from: string | Date
        window_to: string | Date
        fetched_total: number
        duplicates_exact: number
        duplicates_titular: number
        noise_filtered: number
        processed_successfully: number
        classified_with_taxonomy: number
        with_entities: number
        clustered_existing: number
        clustered_new: number
        failed_in_pipeline: Record<string, number> | null
        classification_by_method: Record<string, number> | null
        classification_confidence: Record<string, number> | null
        otro_percentage: number
      }>
      return rows.map((r) => ({
        window_from: r.window_from instanceof Date ? r.window_from : new Date(r.window_from),
        window_to: r.window_to instanceof Date ? r.window_to : new Date(r.window_to),
        fetched_total: Number(r.fetched_total) || 0,
        duplicates_exact: Number(r.duplicates_exact) || 0,
        duplicates_titular: Number(r.duplicates_titular) || 0,
        noise_filtered: Number(r.noise_filtered) || 0,
        processed_successfully: Number(r.processed_successfully) || 0,
        classified_with_taxonomy: Number(r.classified_with_taxonomy) || 0,
        with_entities: Number(r.with_entities) || 0,
        clustered_existing: Number(r.clustered_existing) || 0,
        clustered_new: Number(r.clustered_new) || 0,
        failed_in_pipeline: r.failed_in_pipeline ?? {},
        classification_by_method: r.classification_by_method ?? {},
        classification_confidence: r.classification_confidence ?? {},
        otro_percentage: Number(r.otro_percentage) || 0,
      }))
    },
    () => [],
  )
}
