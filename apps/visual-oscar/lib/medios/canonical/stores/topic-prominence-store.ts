/**
 * Sprint 2 C3 · Acceso a `topic_prominence_history` (Railway Postgres).
 *
 * Tabla creada por migración 0058 (ya aplicada en Railway prod):
 *
 *   topic_prominence_history (
 *     topic_id TEXT,
 *     subtopic_id TEXT DEFAULT '',
 *     computed_at TIMESTAMPTZ DEFAULT NOW(),
 *     window_spec TEXT,
 *     score / volume_score / momentum_score / source_diversity_score /
 *       tier_weight_score / entity_density_score NUMERIC(4,3),
 *     state TEXT DEFAULT 'STABLE',
 *     volume INTEGER, source_count INTEGER,
 *     PRIMARY KEY (topic_id, subtopic_id, computed_at, window_spec)
 *   )
 *
 * Strategy DB:
 *   - Usa el wrapper `withDb` de lib/db/client.ts (drizzle-orm + postgres-js
 *     opcional; si no están instalados, fallback noop).
 *   - El driver `postgres` expone `sql` taggeable y los devuelve filas como
 *     objetos. Lo usamos directamente — no necesitamos Drizzle ORM aquí
 *     porque son queries CRUDas contra una tabla simple.
 *   - En el callback de withDb tomamos `db` (Drizzle) pero seguimos el
 *     patrón de extraer el `sql` subyacente leyendo `db.session.client`.
 *     Como simplificación, hacemos la query directamente sobre la
 *     conexión `postgres` reimportando el módulo.
 *
 * Para C3 (cron horario hourly) las funciones son:
 *   - readArticleVolumeInWindow(topic, from, to)   → { volume, source_count }
 *   - readHistoryForTopic(topic, windowSpec, since) → VolumePoint[]
 *   - writeSnapshot(row)                            → void
 *
 * Si Postgres NO está disponible (dev sin DATABASE_URL, o sin paquetes pg
 * instalados), todas las funciones degradan a:
 *   - read → vacío / cero
 *   - write → noop (con warning una sola vez)
 * de modo que el cron no aborta.
 */
import { withDb } from '../../../db/client.ts'
import { getRawSql } from '../../../db/sql.ts'

export interface ArticleVolumeRow {
  volume: number
  source_count: number
}

export interface HistorySnapshot {
  computed_at: Date
  volume: number
  momentum_score: number
}

export interface SnapshotInsertRow {
  topic_id: string
  subtopic_id: string
  window_spec: '24h' | '7d' | '30d'
  score: number
  volume_score: number
  momentum_score: number
  source_diversity_score: number
  tier_weight_score: number
  entity_density_score: number
  state: 'STRUCTURAL' | 'EMERGENT' | 'STABLE'
  volume: number
  source_count: number
}

/**
 * Cuenta artículos no-noise en la ventana [from, to) cuyo `categoria` (legacy
 * canónico) o `temas_json` contiene el topicId. Sprint 1.1 todavía escribe
 * topic en `categoria` para mantener compatibilidad con noticias_prensa.
 *
 * Devuelve { volume, source_count } o { volume: 0, source_count: 0 } si la
 * DB no está disponible.
 */
export async function readArticleVolumeInWindow(
  topicId: string,
  from: Date,
  to: Date,
): Promise<ArticleVolumeRow> {
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return { volume: 0, source_count: 0 }
      // categoria stores the canonical topicId from Sprint 1.1+ pipeline writes
      const rows = (await sql`
        SELECT
          COUNT(*)::int AS volume,
          COUNT(DISTINCT source_id)::int AS source_count
        FROM article
        WHERE COALESCE(is_noise, FALSE) = FALSE
          AND categoria = ${topicId}
          AND COALESCE(ingested_at, published_at) >= ${from.toISOString()}
          AND COALESCE(ingested_at, published_at) <  ${to.toISOString()}
      `) as Array<{ volume: number; source_count: number }>
      const row = rows[0]
      if (!row) return { volume: 0, source_count: 0 }
      return { volume: Number(row.volume) || 0, source_count: Number(row.source_count) || 0 }
    },
    () => ({ volume: 0, source_count: 0 }),
  )
}

/**
 * Lee snapshots históricos de un topic en la ventana [since, now]. Devuelve
 * solo los campos necesarios para computeMomentum (computed_at + volume).
 */
export async function readHistoryForTopic(
  topicId: string,
  windowSpec: '24h' | '7d' | '30d',
  since: Date,
): Promise<HistorySnapshot[]> {
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return []
      const rows = (await sql`
        SELECT computed_at, volume, momentum_score
        FROM topic_prominence_history
        WHERE topic_id = ${topicId}
          AND window_spec = ${windowSpec}
          AND computed_at >= ${since.toISOString()}
        ORDER BY computed_at ASC
      `) as Array<{ computed_at: string | Date; volume: number; momentum_score: number }>
      return rows.map((r) => ({
        computed_at: r.computed_at instanceof Date ? r.computed_at : new Date(r.computed_at),
        volume: Number(r.volume) || 0,
        momentum_score: Number(r.momentum_score) || 0,
      }))
    },
    () => [],
  )
}

/**
 * Sprint 2 C4 · distribución de artículos por medio (source_id) para un
 * topic en una ventana. Necesaria para sourceDiversityScore y tierWeight.
 *
 * Devuelve `[{ source_id, count }]` o `[]` si DB no disponible o si no hay
 * artículos en la ventana.
 */
export async function readArticleDistributionByTopic(
  topicId: string,
  from: Date,
  to: Date,
): Promise<Array<{ source_id: string; count: number }>> {
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return [] as Array<{ source_id: string; count: number }>
      const rows = (await sql`
        SELECT source_id, COUNT(*)::int AS count
        FROM article
        WHERE COALESCE(is_noise, FALSE) = FALSE
          AND categoria = ${topicId}
          AND COALESCE(ingested_at, published_at) >= ${from.toISOString()}
          AND COALESCE(ingested_at, published_at) <  ${to.toISOString()}
        GROUP BY source_id
      `) as Array<{ source_id: string; count: number | string }>
      return rows.map((r) => ({
        source_id: r.source_id,
        count: Number(r.count) || 0,
      }))
    },
    () => [],
  )
}

/**
 * Sprint 2 C4 · entidades extraídas (Layer 1 NER) de los artículos de un
 * topic en una ventana. Necesaria para entityDensityScore.
 *
 * `article.entities` es JSONB con shape `[{ type, id, ... }, ...]`. Si la
 * columna no existe o el valor no es array, normalizamos a [] para que
 * computeEntityDensity no explote en datos legacy pre-Sprint 2.
 *
 * Devuelve `[{ entities: [...] }]` (una fila por artículo) o `[]`.
 */
export async function readArticleEntitiesByTopic(
  topicId: string,
  from: Date,
  to: Date,
): Promise<Array<{ entities: Array<{ type: string; id: string }> }>> {
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return [] as Array<{ entities: Array<{ type: string; id: string }> }>
      const rows = (await sql`
        SELECT entities
        FROM article
        WHERE COALESCE(is_noise, FALSE) = FALSE
          AND categoria = ${topicId}
          AND COALESCE(ingested_at, published_at) >= ${from.toISOString()}
          AND COALESCE(ingested_at, published_at) <  ${to.toISOString()}
      `) as Array<{ entities: unknown }>
      return rows.map((r) => ({
        entities: Array.isArray(r.entities)
          ? (r.entities as Array<{ type: string; id: string }>)
          : [],
      }))
    },
    () => [],
  )
}

/**
 * Inserta un snapshot. La PK incluye `computed_at` (server default NOW()),
 * así que no proporcionamos timestamp explícito — Postgres asigna el momento
 * del INSERT.
 *
 * Si la DB no está disponible: noop silenciosa (withDb ya warnea en su
 * fallback).
 */
export async function writeSnapshot(row: SnapshotInsertRow): Promise<void> {
  await withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return
      await sql`
        INSERT INTO topic_prominence_history (
          topic_id, subtopic_id, window_spec,
          score, volume_score, momentum_score,
          source_diversity_score, tier_weight_score, entity_density_score,
          state, volume, source_count
        ) VALUES (
          ${row.topic_id}, ${row.subtopic_id}, ${row.window_spec},
          ${row.score}, ${row.volume_score}, ${row.momentum_score},
          ${row.source_diversity_score}, ${row.tier_weight_score}, ${row.entity_density_score},
          ${row.state}, ${row.volume}, ${row.source_count}
        )
        ON CONFLICT (topic_id, subtopic_id, computed_at, window_spec) DO NOTHING
      `
    },
    () => undefined,
  )
}
