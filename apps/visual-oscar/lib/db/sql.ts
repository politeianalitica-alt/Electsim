/**
 * Shared helper to extract the raw `postgres-js` tagged-template `sql` fn
 * from a Drizzle DB instance. Returns null if neither the modern
 * (`db.$client`, Drizzle ≥ 0.30) nor legacy (`db.session.client`) interface
 * is available — callers should fall back to their no-op or empty result.
 *
 * Centralizing this prevents copy-paste across canonical stores
 * (topic-prominence, medios-config, pipeline-metrics, ...) and ensures a
 * single point of update when Drizzle's internals change.
 */
export type RawSqlFn = (strings: TemplateStringsArray, ...args: unknown[]) => Promise<unknown>

export function getRawSql(db: unknown): RawSqlFn | null {
  if (!db || typeof db !== 'object') return null
  const client = (db as { $client?: unknown }).$client
  if (typeof client === 'function') return client as RawSqlFn
  const session = (db as { session?: { client?: unknown } }).session
  if (session && typeof session.client === 'function') return session.client as RawSqlFn
  return null
}
