/**
 * Sprint 2 C6 · Lógica de PulsoModes para /api/medios/pulso.
 *
 * El endpoint /api/medios/pulso acepta `mode` ∈ {PLURAL, AUDIEN, REGION,
 * IDEOLOGY, CRISIS}. Sprint 0+1 dejó PLURAL+AUDIEN como baseline (ordenación
 * por volumen vs por proxy audiencia respectivamente). C6 enriquece cada
 * topic con los campos específicos de su modo:
 *
 *   PLURAL:   ideological_distribution { izquierda, centro, derecha } (1.0 total)
 *   AUDIEN:   total_audience_proxy ∈ [0, ∞)
 *   REGION:   ccaa_breakdown { <ccaaId>: { from_medium, mentions, affects } }
 *   IDEOLOGY: ideological_distribution + bias_index ∈ [-1, +1]
 *   CRISIS:   solo topics state=EMERGENT con velocity ≥ 5/h y source_count ≥ 3
 *
 * Schema gap (REGION):
 *   La tabla `article` (post-migración 0058) NO tiene columnas
 *   `ccaa_origen` / `ccaa_mencionada` / `ccaa_afectada` explícitas. El
 *   diseño original asumía esos campos. Como pragmatic compromise:
 *
 *     - `from_medium`: 0 (placeholder — depende de medios_config.ccaa
 *       que tampoco existe en schema actual)
 *     - `mentions`:    derivado de `article.entities` JSONB donde entries
 *                      tienen `type='ccaa'` o `type='TERRITORY'`
 *     - `affects`:     0 (placeholder — futura migración debe expandir)
 *
 *   Esto deja shape consistente y unblocking; el detalle se rellena cuando
 *   futura migración añada las 3 columnas o el catálogo medios_config se
 *   expanda con ccaa.
 *
 * Degradación graceful:
 *   Todas las queries usan `withDb` con fallback []/0/{}. En dev/CI sin
 *   DATABASE_URL, los modos responden con `dominantTopics: []` y shape
 *   válido — los tests pueden aseverar shape sin necesidad de DB.
 *
 * @file packages/visual-oscar/lib/medios/canonical/pulso-modes.ts
 */
import type { DominantTopic, PulsoMode, TopicState } from './types.ts'
import { withDb } from '../../db/client.ts'
import { getRawSql } from '../../db/sql.ts'

const VALID_MODES: PulsoMode[] = [
  'PLURAL',
  'AUDIEN',
  'REGION',
  'IDEOLOGY',
  'CRISIS',
]

export function isValidMode(mode: string): mode is PulsoMode {
  return (VALID_MODES as readonly string[]).includes(mode)
}

// ──────── Tipos enriquecidos por modo ────────────────────────────────

export interface IdeologicalDistribution {
  izquierda: number
  centro: number
  derecha: number
}

export interface CCAABreakdownEntry {
  from_medium: number
  mentions: number
  affects: number
}

export type CCAABreakdown = Record<string, CCAABreakdownEntry>

/**
 * DominantTopic enriquecido con los campos opcionales que aporta cada
 * PulsoMode. Sprint 2 C6 — la interfaz `DominantTopic` canónica
 * (types.ts) queda intacta; este tipo extiende con campos modo-específicos
 * sin romper consumidores existentes.
 */
export type DominantTopicEnriched = DominantTopic & {
  total_audience_proxy?: number
  ccaa_breakdown?: CCAABreakdown
  ideological_distribution?: IdeologicalDistribution
  bias_index?: number
}

// ──────── Snapshot reader ────────────────────────────────────────────

interface TopicSnapshotRow {
  topic_id: string
  score: number
  volume: number
  source_count: number
  state: TopicState
}

/**
 * Lee el último snapshot por topic en topic_prominence_history para el
 * windowSpec dado, ordenados por score desc. Devuelve [] si DB no disponible.
 *
 * Nota: window_spec en la tabla es {24h, 7d, 30d}. Mapeamos cualquier valor
 * Sprint 0+1 (24h/48h/72h/7d) al canónico:
 *   24h, 48h, 72h → '24h'
 *   7d            → '7d'
 *   30d           → '30d'
 */
async function getLatestTopicSnapshots(
  windowSpec: string,
  limit: number,
): Promise<TopicSnapshotRow[]> {
  const canonicalWindow = mapWindowToCanonical(windowSpec)
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return []
      const rows = (await sql`
        SELECT topic_id, score::float AS score, volume::int AS volume,
               source_count::int AS source_count, state
        FROM topic_prominence_history tph
        WHERE window_spec = ${canonicalWindow}
          AND computed_at = (
            SELECT MAX(computed_at)
            FROM topic_prominence_history tph2
            WHERE tph2.window_spec = ${canonicalWindow}
              AND tph2.topic_id = tph.topic_id
          )
        ORDER BY score DESC
        LIMIT ${limit}
      `) as Array<{
        topic_id: string
        score: number | string
        volume: number | string
        source_count: number | string
        state: string
      }>
      return rows.map((r) => ({
        topic_id: r.topic_id,
        score: Number(r.score) || 0,
        volume: Number(r.volume) || 0,
        source_count: Number(r.source_count) || 0,
        state: (r.state as TopicState) ?? 'STABLE',
      }))
    },
    () => [],
  )
}

function mapWindowToCanonical(windowSpec: string): '24h' | '7d' | '30d' {
  if (windowSpec === '7d') return '7d'
  if (windowSpec === '30d') return '30d'
  return '24h'
}

function windowSpecToInterval(windowSpec: string): string {
  switch (windowSpec) {
    case '24h':
      return '24 hours'
    case '48h':
      return '48 hours'
    case '72h':
      return '72 hours'
    case '7d':
      return '7 days'
    case '30d':
      return '30 days'
    default:
      return '24 hours'
  }
}

// ──────── DominantTopic factory desde snapshot ───────────────────────

function rowToDominantTopic(row: TopicSnapshotRow): DominantTopic {
  return {
    topicId: row.topic_id,
    label: row.topic_id,
    volume: row.volume,
    volumePct: 0,
    momentum: 0,
    state: row.state,
    sentimentBalance: { positive: 0, neutral: 1.0, negative: 0, mixed: 0 },
    topEntities: [],
    topSources: [],
    rawTagsRepresentative: [],
    leadClusters: [],
    representativeTitles: [],
    confidence: row.score,
  }
}

// ──────── Builders por modo ──────────────────────────────────────────

async function buildPlural(
  windowSpec: string,
  limit: number,
): Promise<DominantTopicEnriched[]> {
  const rows = await getLatestTopicSnapshots(windowSpec, limit)
  return Promise.all(
    rows.map(async (row) => {
      const distribution = await getIdeologicalDistribution(
        row.topic_id,
        windowSpec,
      )
      return {
        ...rowToDominantTopic(row),
        ideological_distribution: distribution,
      }
    }),
  )
}

async function buildAudien(
  windowSpec: string,
  limit: number,
): Promise<DominantTopicEnriched[]> {
  const rows = await getLatestTopicSnapshots(windowSpec, limit)
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const audience = await sumAudienceProxy(row.topic_id, windowSpec)
      return {
        ...rowToDominantTopic(row),
        total_audience_proxy: audience,
      }
    }),
  )
  // Re-ordenar por proxy audiencia (no por score)
  return enriched.sort(
    (a, b) =>
      (b.total_audience_proxy ?? 0) - (a.total_audience_proxy ?? 0),
  )
}

async function buildRegion(
  windowSpec: string,
  limit: number,
): Promise<DominantTopicEnriched[]> {
  const rows = await getLatestTopicSnapshots(windowSpec, limit)
  return Promise.all(
    rows.map(async (row) => {
      const ccaaBreakdown = await getCCAABreakdown(row.topic_id, windowSpec)
      return {
        ...rowToDominantTopic(row),
        ccaa_breakdown: ccaaBreakdown,
      }
    }),
  )
}

async function buildIdeology(
  windowSpec: string,
  limit: number,
): Promise<DominantTopicEnriched[]> {
  const rows = await getLatestTopicSnapshots(windowSpec, limit)
  return Promise.all(
    rows.map(async (row) => {
      const distribution = await getIdeologicalDistribution(
        row.topic_id,
        windowSpec,
      )
      const bias = computeBias(distribution)
      return {
        ...rowToDominantTopic(row),
        ideological_distribution: distribution,
        bias_index: bias,
      }
    }),
  )
}

/**
 * CRISIS: topics con state='EMERGENT' AND velocity ≥ 5/h AND source_count ≥ 3
 * en las últimas 6 horas.
 *
 * Velocity = artículos no-noise / 6h (ventana fija — no parámetro).
 * source_count = distinct source_id en esa ventana.
 *
 * Si no hay topics que cumplan criterios, devuelve []. Eso es esperado en
 * estado normal — CRISIS solo es no-vacío cuando algo realmente despega.
 */
async function buildCrisis(
  windowSpec: string,
  limit: number,
): Promise<DominantTopicEnriched[]> {
  const canonicalWindow = mapWindowToCanonical(windowSpec)
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return []
      const rows = (await sql`
        SELECT
          a.categoria AS topic_id,
          COUNT(*)::int AS volume_6h,
          (COUNT(*)::float / 6.0) AS velocity,
          COUNT(DISTINCT a.source_id)::int AS source_count,
          MIN(a.ingested_at) AS first_seen
        FROM article a
        JOIN topic_prominence_history tph
          ON tph.topic_id = a.categoria
          AND tph.window_spec = ${canonicalWindow}
        WHERE tph.state = 'EMERGENT'
          AND a.ingested_at >= NOW() - INTERVAL '6 hours'
          AND COALESCE(a.is_noise, FALSE) = FALSE
          AND COALESCE(a.is_duplicate, FALSE) = FALSE
          AND tph.computed_at = (
            SELECT MAX(computed_at)
            FROM topic_prominence_history tph2
            WHERE tph2.window_spec = ${canonicalWindow}
              AND tph2.topic_id = a.categoria
          )
        GROUP BY a.categoria
        HAVING COUNT(*) >= 30
          AND COUNT(DISTINCT a.source_id) >= 3
        ORDER BY velocity DESC
        LIMIT ${limit}
      `) as Array<{
        topic_id: string
        volume_6h: number | string
        velocity: number | string
        source_count: number | string
        first_seen: string | Date
      }>
      return rows.map((r) => ({
        topicId: r.topic_id,
        label: r.topic_id,
        volume: Number(r.volume_6h) || 0,
        volumePct: 0,
        momentum: 0,
        state: 'EMERGENT' as TopicState,
        sentimentBalance: { positive: 0, neutral: 1.0, negative: 0, mixed: 0 },
        topEntities: [],
        topSources: [],
        rawTagsRepresentative: [],
        leadClusters: [],
        representativeTitles: [],
        confidence: 0.8,
        total_audience_proxy: Number(r.velocity) || 0,
      }))
    },
    () => [],
  )
}

// ──────── Helpers de scoring ─────────────────────────────────────────

/**
 * Distribución ideológica de artículos por topic en la ventana.
 *
 * Joins article × medios_config(tendencia). Tendencias clasificadas en 3
 * buckets:
 *   izquierda: tendencias que contienen "izquierda" o "progresista"
 *   derecha:   tendencias que contienen "derecha" o "conservador"
 *   centro:    el resto (incluye institucional, nacionalista, neutral)
 *
 * Suma siempre 1.0 (excepto cuando no hay artículos → devuelve { 0, 1, 0 }
 * para evitar división por cero en computeBias).
 */
async function getIdeologicalDistribution(
  topicId: string,
  windowSpec: string,
): Promise<IdeologicalDistribution> {
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return { izquierda: 0, centro: 1, derecha: 0 }
      const interval = windowSpecToInterval(windowSpec)
      const rows = (await sql`
        SELECT COALESCE(mc.tendencia, 'centro') AS tendencia,
               COUNT(*)::int AS n
        FROM article a
        LEFT JOIN medios_config mc ON mc.clave = a.source_id
        WHERE a.categoria = ${topicId}
          AND a.ingested_at >= NOW() - (${interval})::interval
          AND COALESCE(a.is_noise, FALSE) = FALSE
        GROUP BY mc.tendencia
      `) as Array<{ tendencia: string; n: string | number }>
      if (rows.length === 0) {
        return { izquierda: 0, centro: 1, derecha: 0 }
      }
      const total = rows.reduce((sum, r) => sum + Number(r.n), 0) || 1
      const dist: IdeologicalDistribution = {
        izquierda: 0,
        centro: 0,
        derecha: 0,
      }
      for (const r of rows) {
        const bucket = bucketizeTendencia(r.tendencia)
        dist[bucket] += Number(r.n) / total
      }
      return dist
    },
    () => ({ izquierda: 0, centro: 1, derecha: 0 }),
  )
}

function bucketizeTendencia(
  tendencia: string | null,
): 'izquierda' | 'centro' | 'derecha' {
  if (!tendencia) return 'centro'
  const t = tendencia.toLowerCase()
  if (t.includes('izquierda') || t.includes('progresista')) return 'izquierda'
  if (t.includes('derecha') || t.includes('conservador')) return 'derecha'
  return 'centro'
}

/**
 * bias_index ∈ [-1, +1]:
 *   -1 → totalmente izquierda
 *    0 → balanceado (50/50 izquierda/derecha) o todo centro
 *   +1 → totalmente derecha
 *
 * Fórmula normalizada por la cuota no-centro para evitar que medios
 * mayoritariamente centristas aplasten la métrica.
 *
 *   bias = (derecha - izquierda) / max(derecha + izquierda, ε)
 *
 * Si todo es centro (derecha + izquierda = 0), devuelve 0. Clamp al rango
 * [-1, +1] para tolerar floating point drift.
 */
function computeBias(distribution: IdeologicalDistribution): number {
  const nonCentro = distribution.derecha + distribution.izquierda
  if (nonCentro < 1e-6) return 0
  const bias = (distribution.derecha - distribution.izquierda) / nonCentro
  return Math.max(-1, Math.min(1, bias))
}

/**
 * Proxy de audiencia agregada para un topic:
 *
 *   proxy_articulo = (establishment ? 0.5 : 0) + credibilidad * 0.5
 *   total = sum(proxy_articulo) sobre todos los artículos del topic
 *
 * Esto es una aproximación a "alcance del topic" hasta que tengamos
 * audienceEstimate real por medio en medios_config.
 */
async function sumAudienceProxy(
  topicId: string,
  windowSpec: string,
): Promise<number> {
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return 0
      const interval = windowSpecToInterval(windowSpec)
      const rows = (await sql`
        SELECT COALESCE(SUM(
          (CASE WHEN mc.establishment THEN 0.5 ELSE 0 END) +
          COALESCE(mc.credibilidad, 0.5) * 0.5
        ), 0)::float AS total
        FROM article a
        LEFT JOIN medios_config mc ON mc.clave = a.source_id
        WHERE a.categoria = ${topicId}
          AND a.ingested_at >= NOW() - (${interval})::interval
          AND COALESCE(a.is_noise, FALSE) = FALSE
      `) as Array<{ total: string | number | null }>
      const row = rows[0]
      return Number(row?.total ?? 0) || 0
    },
    () => 0,
  )
}

/**
 * Breakdown de menciones por CCAA para un topic.
 *
 * Schema gap: article NO tiene ccaa_origen/mencionada/afectada como
 * columnas dedicadas. Extracción best-effort desde `article.entities`
 * JSONB — entradas con `type ∈ {ccaa, TERRITORY}` se cuentan como
 * "mention". `from_medium` y `affects` quedan a 0 hasta futura migración.
 *
 * Si `entities` está vacío o NULL en todos los artículos → {} (vacío).
 */
async function getCCAABreakdown(
  topicId: string,
  windowSpec: string,
): Promise<CCAABreakdown> {
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return {}
      const interval = windowSpecToInterval(windowSpec)
      const rows = (await sql`
        SELECT entities
        FROM article
        WHERE categoria = ${topicId}
          AND ingested_at >= NOW() - (${interval})::interval
          AND COALESCE(is_noise, FALSE) = FALSE
          AND entities IS NOT NULL
      `) as Array<{ entities: unknown }>
      const breakdown: CCAABreakdown = {}
      for (const r of rows) {
        const entities = Array.isArray(r.entities)
          ? (r.entities as Array<{ type?: string; id?: string }>)
          : []
        for (const e of entities) {
          if (!e || typeof e !== 'object') continue
          const t = (e.type ?? '').toLowerCase()
          const isCcaa = t === 'ccaa' || t === 'territory'
          if (!isCcaa || typeof e.id !== 'string') continue
          const key = e.id
          if (!breakdown[key]) {
            breakdown[key] = { from_medium: 0, mentions: 0, affects: 0 }
          }
          breakdown[key].mentions++
        }
      }
      return breakdown
    },
    () => ({}),
  )
}

// ──────── API pública ────────────────────────────────────────────────

/**
 * Construye la lista DominantTopic[] enriquecida según el modo solicitado.
 *
 * @param mode       PulsoMode ∈ {PLURAL, AUDIEN, REGION, IDEOLOGY, CRISIS}
 * @param windowSpec '24h' | '48h' | '72h' | '7d' | '30d' (acepta los del
 *                   enum WindowSpec; mapea internamente a {24h, 7d, 30d}
 *                   para topic_prominence_history)
 * @param limit      Tamaño máximo del array devuelto (default 14)
 */
export async function buildDominantTopicsForMode(
  mode: PulsoMode,
  windowSpec: string = '24h',
  limit: number = 14,
): Promise<DominantTopicEnriched[]> {
  switch (mode) {
    case 'PLURAL':
      return buildPlural(windowSpec, limit)
    case 'AUDIEN':
      return buildAudien(windowSpec, limit)
    case 'REGION':
      return buildRegion(windowSpec, limit)
    case 'IDEOLOGY':
      return buildIdeology(windowSpec, limit)
    case 'CRISIS':
      return buildCrisis(windowSpec, limit)
    default: {
      // Exhaustiveness check — TS error si añadimos modo sin manejar
      const _exhaustive: never = mode
      void _exhaustive
      return []
    }
  }
}
