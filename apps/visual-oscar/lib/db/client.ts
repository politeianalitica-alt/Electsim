/**
 * DB client wrapper — graceful degradation.
 *
 * - Si `DATABASE_URL` está presente Y `drizzle-orm` + `postgres` están
 *   instalados, devuelve un cliente Drizzle conectado.
 * - Si falta cualquiera de los dos, devuelve `null` y los repositorios
 *   caen al backend mock.
 *
 * El `import("...")` se evalúa en runtime: si los paquetes no están en
 * node_modules, atrapamos el error y seguimos.
 */

type AnyDb = unknown;
let _cached: AnyDb | null | undefined = undefined;
let _warned = false;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function getDb(): Promise<AnyDb | null> {
  if (_cached !== undefined) return _cached as AnyDb | null;
  if (!isDbConfigured()) {
    _cached = null;
    return null;
  }
  try {
    // Especificadores guardados en variables para que webpack NO los
    // resuelva estáticamente — sólo se evalúan en runtime, y si la dep
    // no está instalada el try/catch lo absorbe.
    const drizzleMod = "drizzle-orm/postgres-js";
    const postgresMod = "postgres";
    const drizzle = (await import(/* webpackIgnore: true */ drizzleMod)) as any;
    const postgres = (await import(/* webpackIgnore: true */ postgresMod)) as any;
    const sql = postgres.default(process.env.DATABASE_URL!, {
      max: Number(process.env.DATABASE_POOL_SIZE || 10),
      idle_timeout: 20,
    });
    _cached = drizzle.drizzle(sql);
    return _cached as AnyDb;
  } catch (err) {
    if (!_warned) {
      // eslint-disable-next-line no-console
      console.warn("[db] drizzle/postgres no instalados — falling back to mock repository.");
      _warned = true;
    }
    _cached = null;
    return null;
  }
}

/**
 * Helper para callers: ejecuta `fn` con la DB cuando esté disponible o
 * llama a `fallback` (típicamente el repo in-memory).
 */
export async function withDb<T>(
  fn: (db: NonNullable<AnyDb>) => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  const db = await getDb();
  if (!db) return await fallback();
  try {
    return await fn(db);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[db] query failed, using fallback:", (err as Error).message);
    }
    return await fallback();
  }
}
