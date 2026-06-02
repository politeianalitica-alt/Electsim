/**
 * Sprint 2 C4 · Acceso a `medios_config` (Railway Postgres).
 *
 * `medios_config` es la tabla canónica de medios curados (rellena por las
 * migraciones 004_mediatico + 0012_media_infrastructure). NO tiene una
 * columna `tier` — derivamos el tier weight a partir de `credibilidad`
 * (NUMERIC 0-1) + `establishment` (BOOLEAN) en tier.ts:
 *
 *   tier_weight = 0.6 · credibilidad + 0.4 · (establishment ? 1 : 0)
 *
 * Esta función sólo expone los campos brutos; la fórmula vive en tier.ts.
 *
 * Schema (post-0058):
 *   clave TEXT PRIMARY KEY,
 *   nombre TEXT,
 *   tendencia TEXT (NULL si no clasificado),
 *   establishment BOOLEAN (NULL si no clasificado),
 *   credibilidad NUMERIC(3,2) (NULL si no clasificado),
 *   rss_urls TEXT[],
 *   activo BOOLEAN DEFAULT TRUE
 *
 * Caché en memoria de 5 minutos:
 *   El catálogo de medios cambia muy raramente (días/semanas), pero el
 *   snapshot writer corre cada hora para cada topic — leer ~80 filas de
 *   medios_config N veces por ejecución sería desperdicio. Una caché
 *   process-local con TTL = 5 min es seguro: las ediciones manuales se
 *   propagan en ≤5 min, y un restart del worker invalida todo.
 *
 * Si Postgres NO está disponible (dev sin DATABASE_URL, o sin paquetes pg
 * instalados), `readAllMediosConfig` devuelve `[]` y `computeTierWeight`
 * cae al neutro 0.5 para todos los medios — comportamiento aceptable en
 * dev/CI sin tocar DB.
 */
import { withDb } from '../../../db/client.ts'
import { getRawSql } from '../../../db/sql.ts'

export interface MedioConfig {
  clave: string
  nombre: string
  tendencia: string | null
  establishment: boolean | null
  credibilidad: number | null
}

let _cache: { data: MedioConfig[]; expiresAt: number } | null = null
const TTL_MS = 5 * 60_000

/**
 * Lee el catálogo activo de `medios_config`. Resultados cacheados durante
 * 5 min en memoria. Si la DB no responde, devuelve [].
 */
export async function readAllMediosConfig(): Promise<MedioConfig[]> {
  if (_cache && _cache.expiresAt > Date.now()) return _cache.data

  const data = await withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return [] as MedioConfig[]
      const rows = (await sql`
        SELECT clave, nombre, tendencia, establishment, credibilidad
        FROM medios_config
        WHERE COALESCE(activo, TRUE) = TRUE
      `) as Array<{
        clave: string
        nombre: string
        tendencia: string | null
        establishment: boolean | null
        credibilidad: number | string | null
      }>
      return rows.map((r) => ({
        clave: r.clave,
        nombre: r.nombre,
        tendencia: r.tendencia ?? null,
        establishment: r.establishment ?? null,
        // postgres-js devuelve NUMERIC como string para preservar precisión.
        credibilidad:
          r.credibilidad === null || r.credibilidad === undefined
            ? null
            : Number(r.credibilidad),
      }))
    },
    () => [],
  )

  _cache = { data, expiresAt: Date.now() + TTL_MS }
  return data
}

/** Limpia la caché — sólo para tests / hot-reload. */
export function clearMediosConfigCache(): void {
  _cache = null
}
