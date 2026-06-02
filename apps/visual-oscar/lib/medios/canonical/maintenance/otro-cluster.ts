/**
 * Sprint 2 C8 · Job terms-not-classified (cron schedule '12hourly').
 *
 * Cluster artículos con `categoria = 'OTRO'` (legacy column de la
 * migración 0012; equivale a `topic_id='OTRO'` en el modelo canónico
 * Sprint 1.1+) de las últimas 12 horas usando TF-IDF + cosine similarity
 * con greedy clustering. NO usa embeddings semánticos, NO usa LLM.
 *
 * Por qué importa:
 *   - OTRO es el cubo final del topic classifier (Layer 1/2/3 no
 *     encontraron match). Si un mismo subtema aparece N veces en OTRO,
 *     posiblemente justifique una nueva regla heurística (RSS tag map o
 *     keyword rule) o incluso un macrotema nuevo en topic-rules.json.
 *   - Este job hace visible esa cola para curación humana — Sprint 3+
 *     consumirá el endpoint `/api/medios/maintenance/otro-cluster` para
 *     mostrar un panel "OTRO clusters" en /estudio.
 *
 * Algoritmo:
 *   1. Leer artículos OTRO últimas 12h (cap MAX_ARTICLES, filtra noise/duplicate).
 *   2. Tokenizar title + summary (lowercase, strip punct, length > 2,
 *      sin stopwords ES).
 *   3. Computar TF-IDF por documento (idf = log(N/df_t)).
 *   4. Greedy clustering: para cada doc no asignado, agrupa otros con
 *      cosine ≥ SIMILARITY_THRESHOLD.
 *   5. Descartar clusters con < MIN_CLUSTER_SIZE items.
 *   6. Por cluster: top TOP_TERMS términos por frecuencia + sample de
 *      MAX_SAMPLES artículos.
 *
 * Failure modes:
 *   - DB no disponible → withDb cae a []; report queda { clusters: [] }.
 *   - articles.length < 2 → return early con clusters vacíos.
 *   - Fixture inyectado → bypass total de DB (usado por tests).
 *
 * Cost cap:
 *   - MAX_ARTICLES = 500 limita el peor caso O(N²) del greedy clustering
 *     a 250K comparaciones por job, ≈ pocos cientos de ms en Node.
 */
import { withDb } from '../../../db/client.ts'
import { getRawSql } from '../../../db/sql.ts'
import type { JobResult } from './index.ts'

const WINDOW_HOURS = 12
const MAX_ARTICLES = 500
const SIMILARITY_THRESHOLD = 0.6
const MIN_CLUSTER_SIZE = 2
const TOP_TERMS = 5
const MAX_SAMPLES = 5

// Stopwords ES básicas (~60 más comunes). No pretende ser exhaustivo,
// solo eliminar el ruido más obvio antes del TF-IDF. Si esta lista
// resulta insuficiente, Sprint 3+ podrá importar una lista canónica
// (p.ej. de `data/medios/stopwords-es.json`).
const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo',
  'de', 'del', 'en', 'por', 'para', 'con', 'sin', 'sobre',
  'pero', 'que', 'son', 'fue', 'fueron',
  'su', 'sus', 'les', 'nos',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
  'aquel', 'aquella', 'aquellos', 'aquellas', 'ser', 'estar', 'haber',
  'más', 'mas', 'menos', 'muy', 'mucho', 'poco', 'tanto', 'tan',
  'como', 'cuando', 'donde', 'porque', 'pues', 'aunque', 'mientras',
  'sino', 'desde', 'hasta', 'entre', 'tras', 'sobre',
])

export interface OtroArticle {
  id: string
  title: string
  description: string
}

export interface OtroCluster {
  top_terms: string[]
  sample_articles: Array<{ id: string; title: string }>
  cluster_size: number
}

export interface OtroClusterReport {
  generated_at: string
  window_hours: number
  clusters: OtroCluster[]
}

/**
 * Lee artículos con categoria='OTRO' ingestados en las últimas 12h,
 * filtrando ruido/duplicados, cap MAX_ARTICLES.
 *
 * Si DB no disponible → []. No lanza.
 *
 * Nota: usamos `categoria` (legacy column de migración 0012) en vez de
 * `topic_id` porque el pipeline canónico Sprint 1.1+ escribe el
 * topic_id ahí para compatibilidad con noticias_prensa (ver
 * `topic-prominence-store.ts` que sigue el mismo patrón).
 */
export async function readOtroArticles(): Promise<OtroArticle[]> {
  return withDb(
    async (db) => {
      const sql = getRawSql(db)
      if (!sql) return [] as OtroArticle[]
      // INTERVAL parametrizado con módulo-level constant (no input
      // usuario) → safe. Mismo patrón que unmapped-tags.ts:104.
      const rows = (await sql`
        SELECT
          id::text AS id,
          title,
          COALESCE(summary, '') AS description
        FROM article
        WHERE categoria = 'OTRO'
          AND COALESCE(ingested_at, published_at) >= NOW() - (${WINDOW_HOURS} * INTERVAL '1 hour')
          AND COALESCE(is_noise, FALSE) = FALSE
          AND COALESCE(is_duplicate, FALSE) = FALSE
        LIMIT ${MAX_ARTICLES}
      `) as Array<{ id: string; title: string; description: string }>
      return rows.map((r) => ({
        id: String(r.id),
        title: r.title ?? '',
        description: r.description ?? '',
      }))
    },
    () => [],
  )
}

/**
 * Tokenizador básico:
 *   - lowercase
 *   - reemplaza no-alfanumérico (incluye puntuación, símbolos) por espacio
 *   - acepta acentos españoles y ñ/ü
 *   - filtra tokens length ≤ 2 y stopwords
 *
 * Exportado para testabilidad.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-záéíóúñü0-9 ]+/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
}

/**
 * Computa vectores TF-IDF para una lista de documentos tokenizados.
 *
 *   tf(t, d)  = count(t en d)
 *   idf(t)    = log(N / df(t))
 *   tfidf(t,d) = tf(t,d) * idf(t)
 *
 * Devuelve Map<term, weight> por documento. Términos con peso 0
 * (presentes en todos los docs) se mantienen en el Map por simplicidad —
 * no afectan al producto escalar de cosine.
 *
 * Exportado para testabilidad.
 */
export function computeTfIdf(docs: string[][]): Array<Map<string, number>> {
  const N = docs.length
  if (N === 0) return []
  // df: cuántos docs contienen cada término (al menos una vez)
  const df = new Map<string, number>()
  for (const doc of docs) {
    const seen = new Set(doc)
    for (const term of seen) df.set(term, (df.get(term) ?? 0) + 1)
  }
  return docs.map((doc) => {
    const tf = new Map<string, number>()
    for (const term of doc) tf.set(term, (tf.get(term) ?? 0) + 1)
    const vec = new Map<string, number>()
    tf.forEach((count, term) => {
      const idf = Math.log(N / (df.get(term) ?? 1))
      vec.set(term, count * idf)
    })
    return vec
  })
}

/**
 * Cosine similarity entre dos vectores sparse Map<term, weight>.
 *
 *   cos(a, b) = (a · b) / (||a|| * ||b||)
 *
 * Si cualquiera de los vectores tiene norma 0 (vacío o todo-ceros),
 * retorna 0 para evitar NaN.
 *
 * Exportado para testabilidad.
 */
export function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  let dot = 0
  let na = 0
  let nb = 0
  a.forEach((va, term) => {
    na += va * va
    const vb = b.get(term)
    if (vb !== undefined) dot += va * vb
  })
  b.forEach((vb) => {
    nb += vb * vb
  })
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/**
 * Job principal: ejecuta el pipeline completo y devuelve el reporte.
 *
 * Si `injectedArticles` está presente, bypassa la lectura de DB. Esto
 * permite tests sin DB y futuros consumidores que ya tengan los
 * artículos pre-filtrados.
 */
export async function jobOtroCluster(
  injectedArticles?: OtroArticle[],
): Promise<OtroClusterReport> {
  const articles = injectedArticles ?? (await readOtroArticles())
  if (articles.length < MIN_CLUSTER_SIZE) {
    return {
      generated_at: new Date().toISOString(),
      window_hours: WINDOW_HOURS,
      clusters: [],
    }
  }

  // Tokenizar title + description por documento.
  const docs = articles.map((a) => tokenize(`${a.title} ${a.description}`))
  const vectors = computeTfIdf(docs)

  // Greedy clustering: O(N²) en peor caso, acotado por MAX_ARTICLES=500.
  const assigned = new Set<number>()
  const clusters: number[][] = []
  for (let i = 0; i < articles.length; i++) {
    if (assigned.has(i)) continue
    const cluster = [i]
    assigned.add(i)
    for (let j = i + 1; j < articles.length; j++) {
      if (assigned.has(j)) continue
      if (cosineSimilarity(vectors[i]!, vectors[j]!) >= SIMILARITY_THRESHOLD) {
        cluster.push(j)
        assigned.add(j)
      }
    }
    if (cluster.length >= MIN_CLUSTER_SIZE) clusters.push(cluster)
  }

  return {
    generated_at: new Date().toISOString(),
    window_hours: WINDOW_HOURS,
    clusters: clusters.map((idxs) => {
      // Top términos por frecuencia agregada dentro del cluster (no
      // ponderado por IDF aquí — queremos la palabra más recurrente
      // para que la curación humana entienda el cluster, no el
      // discriminador estadístico). Esto es intencional.
      const termCounts = new Map<string, number>()
      for (const idx of idxs) {
        for (const term of docs[idx]!) {
          termCounts.set(term, (termCounts.get(term) ?? 0) + 1)
        }
      }
      const topTerms = Array.from(termCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, TOP_TERMS)
        .map(([t]) => t)
      const sampleArticles = idxs.slice(0, MAX_SAMPLES).map((i) => ({
        id: articles[i]!.id,
        title: articles[i]!.title,
      }))
      return {
        top_terms: topTerms,
        sample_articles: sampleArticles,
        cluster_size: idxs.length,
      }
    }),
  }
}

/**
 * Wrapper `JobResult` para registrar el job en `maintenance/index.ts`.
 * Emite log estructurado con resumen para visibilidad inmediata en el
 * output del cron.
 */
export async function termsNotClassifiedJob(): Promise<JobResult> {
  const t0 = Date.now()
  const errors: string[] = []
  let processed = 0
  try {
    const report = await jobOtroCluster()
    processed = report.clusters.length
    const totalClustered = report.clusters.reduce(
      (s, c) => s + c.cluster_size,
      0,
    )
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        event: 'maintenance.otro_cluster',
        window_hours: report.window_hours,
        n_clusters: report.clusters.length,
        total_clustered: totalClustered,
      }),
    )
  } catch (e: unknown) {
    errors.push(String((e as Error)?.message ?? e))
  }
  return {
    job: 'terms-not-classified',
    durationMs: Date.now() - t0,
    itemsProcessed: processed,
    errors,
  }
}
