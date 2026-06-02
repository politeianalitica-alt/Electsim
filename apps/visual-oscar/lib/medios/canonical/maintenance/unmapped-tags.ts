/**
 * Sprint 2 C7 · Job unmapped-tags (cron schedule '6hourly').
 *
 * Detecta RSS tags vistos en `article.raw_tags` (JSONB, migración 0058) en las
 * últimas 6 horas que NO están en el mapping de `data/medios/rss-tag-map.json`,
 * ordenados por frecuencia descendente. Emite un reporte con TOP 50 para
 * curación humana — UI futura (Sprint 3+) consumirá el endpoint
 * `/api/medios/maintenance/unmapped-tags` para mostrar panel "Tags no
 * clasificados" en el Estudio.
 *
 * Por qué importa:
 *   - Cuando un medio introduce una nueva sección o categoría RSS, los
 *     artículos caen a OTRO en Layer 1 hasta que añadimos el mapping al
 *     catálogo. Este job nos hace ver esa cola sin esperar a que el % OTRO
 *     dispare otro-alert.
 *
 * Failure mode:
 *   - DB no disponible (sin DATABASE_URL / sin pg pkgs) → withDb cae a []
 *     y el report queda { unmapped: [] }. No lanza.
 *   - rss-tag-map.json missing / parseo fallido → loadRssTagMap del catalog
 *     loader lanza (intencionalmente, en Sprint 0+1 catálogos son hard
 *     requirements). Atrapamos y retornamos report vacío para no abortar
 *     el cron.
 *   - raw_tags TEXT legacy (pre-migración 0058) → intentamos JSON.parse;
 *     si falla, ignoramos esa fila.
 *
 * Test injection:
 *   - `__withTestRawTags(stub, fn)` ejecuta `fn` con un array de raw_tags
 *     stubeado en lugar de leer Postgres, mismo patrón que
 *     `__withTestStore` de snapshot-writer.ts. Solo se usa en tests.
 */
import { withDb } from '../../../db/client.ts'
import { getRawSql } from '../../../db/sql.ts'
import { loadRssTagMap } from '../catalogs.ts'
import type { JobResult } from './index.ts'

const WINDOW_HOURS = 6
const TOP_N = 50

export interface UnmappedReportEntry {
  tag: string
  count: number
}

export interface UnmappedReport {
  generated_at: string // ISO timestamp para serialización JSON estable
  window_hours: number
  unmapped: UnmappedReportEntry[]
}

// Override mutable, solo usado por tests. En producción es null y leemos
// raw_tags reales de Postgres vía withDb.
let _rawTagsOverride: string[][] | null = null

/**
 * Helper test-only: ejecuta `fn` con un array de `raw_tags` stubeado en
 * lugar de leer Postgres. Cada elemento del array es un artículo y cada
 * sub-array son sus raw_tags. Restaura el estado anterior al final.
 *
 * No exportar a producción ni usar fuera de tests.
 */
export async function __withTestRawTags<T>(
  stub: string[][],
  fn: () => Promise<T>,
): Promise<T> {
  const prev = _rawTagsOverride
  _rawTagsOverride = stub
  try {
    return await fn()
  } finally {
    _rawTagsOverride = prev
  }
}

/**
 * Lee todos los `raw_tags` de artículos ingestados en las últimas
 * WINDOW_HOURS y los devuelve como un array plano lowercase. Cubre tanto el
 * caso JSONB (Sprint 1.1+ tras migración 0058) como TEXT con JSON.parse
 * (legacy migración 0012).
 *
 * Si DB no disponible → []. No lanza.
 */
export async function readRawTagsInWindow(): Promise<string[]> {
  // Test injection: short-circuit antes de tocar DB.
  if (_rawTagsOverride !== null) {
    const tags: string[] = []
    for (const articleTags of _rawTagsOverride) {
      for (const t of articleTags) {
        if (typeof t === 'string' && t.length > 0) tags.push(t.toLowerCase())
      }
    }
    return tags
  }
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return [] as string[]
      // Usamos INTERVAL parametrizado al construir el string (no podemos
      // tagged-template un INTERVAL '${n} hours' porque postgres-js trata
      // ${n} como bind y rompería el INTERVAL parsing). Como WINDOW_HOURS
      // es una constante module-level (no input de usuario), la
      // interpolación es segura.
      const rows = (await sql`
        SELECT raw_tags FROM article
        WHERE COALESCE(ingested_at, published_at) >= NOW() - (${WINDOW_HOURS} * INTERVAL '1 hour')
          AND raw_tags IS NOT NULL
      `) as Array<{ raw_tags: unknown }>
      const tags: string[] = []
      for (const r of rows) {
        const raw = r.raw_tags
        if (Array.isArray(raw)) {
          for (const t of raw) {
            if (typeof t === 'string' && t.length > 0) tags.push(t.toLowerCase())
            else if (t != null) tags.push(String(t).toLowerCase())
          }
        } else if (typeof raw === 'string') {
          // Legacy TEXT column: intentar parsear como JSON array.
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              for (const t of parsed) {
                if (typeof t === 'string' && t.length > 0)
                  tags.push(t.toLowerCase())
              }
            }
          } catch {
            // No es JSON → skip silenciosamente.
          }
        }
      }
      return tags
    },
    () => [],
  )
}

/**
 * Carga el catálogo `rss-tag-map.json` y devuelve un Set normalizado
 * (lowercase) de los `rawTag` mapeados. Usar Set para O(1) lookup en el
 * filtrado posterior.
 *
 * Si el catálogo falla a cargar (no debería en producción, pero defensivo
 * para el cron), devuelve Set vacío → todos los tags vistos pasarían como
 * unmapped, pero el report no aborta el cron.
 */
export async function loadRssTagMapAsSet(): Promise<Set<string>> {
  try {
    const catalog = await loadRssTagMap()
    const mappings = (catalog.mappings ?? []) as Array<{ rawTag?: unknown }>
    const set = new Set<string>()
    for (const m of mappings) {
      if (typeof m.rawTag === 'string' && m.rawTag.length > 0) {
        set.add(m.rawTag.toLowerCase())
      }
    }
    return set
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[unmapped-tags] No se pudo cargar rss-tag-map.json:', err)
    return new Set<string>()
  }
}

/**
 * Computa el reporte de tags no mapeados en la ventana de 6h. Pipeline:
 *   1. Leer raw_tags en ventana (lowercase normalizado).
 *   2. Cargar mapping rss-tag-map.json como Set.
 *   3. Contar tags NO presentes en el mapping.
 *   4. Ordenar desc por count, slice TOP_N.
 *
 * Salida estable serializable a JSON (generated_at = ISO string para no
 * depender del JSON encoder de NextResponse para Dates).
 */
export async function jobUnmappedTags(): Promise<UnmappedReport> {
  const [tags, mapped] = await Promise.all([
    readRawTagsInWindow(),
    loadRssTagMapAsSet(),
  ])
  const counts = new Map<string, number>()
  for (const tag of tags) {
    if (!mapped.has(tag)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  const unmapped: UnmappedReportEntry[] = Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, TOP_N)
  return {
    generated_at: new Date().toISOString(),
    window_hours: WINDOW_HOURS,
    unmapped,
  }
}

/**
 * Wrapper `JobResult` para registrar el job en `maintenance/index.ts`.
 * Emite log estructurado con TOP 5 para visibilidad inmediata en el
 * output del cron.
 */
export async function unmappedTagsJob(): Promise<JobResult> {
  const t0 = Date.now()
  const errors: string[] = []
  let processed = 0
  try {
    const report = await jobUnmappedTags()
    processed = report.unmapped.length
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        event: 'maintenance.unmapped_tags',
        window_hours: report.window_hours,
        count: report.unmapped.length,
        top_5: report.unmapped.slice(0, 5),
      }),
    )
  } catch (e: unknown) {
    errors.push(String((e as Error)?.message ?? e))
  }
  return {
    job: 'unmapped-tags',
    durationMs: Date.now() - t0,
    itemsProcessed: processed,
    errors,
  }
}
