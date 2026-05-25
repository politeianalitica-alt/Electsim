/**
 * media-analysis.ts · Sprint M4 · FASE A
 *
 * Capa de análisis específica para NewsAPI y búsquedas puntuales.
 * Construye SOBRE `media-methodology.ts` (Sprint M1-M2) reusando todos
 * sus tipos y funciones core. No duplica lógica.
 *
 * Aporta:
 *   - Adaptador NewsAPI article → AggregatedArticle (para reusar readArticle)
 *   - normalizeArticle() · normaliza shape de cualquier fuente
 *   - readArticlesBatch() · paraleliza readArticle para muchos
 *   - framingComparison() · análisis profundo por bucket ideológico
 *     (actores enfatizados, omitidos, términos distintivos, asimetría)
 *   - coverageGaps() · topics infrarrepresentados por bucket
 *   - suggestedFollowupQueries() · queries derivadas de actores/topics dominantes
 *   - mediaAnalysisWarnings() · advertencias de representatividad y muestreo
 *   - explainArticleReading() · explicación legible humana del reading
 *
 * Re-exports clave de methodology para que media-analysis sea la
 * "puerta" única para search/lectura/intel.
 */

import {
  type ArticleReading,
  type NarrativeCluster,
  type SourceDiversityBreakdown,
  type MethodologyConfidence,
  type FrameType,
  type IdeologyBucket,
  type MediaTypeBucket,
  type AmbitoBucket,
  readArticle,
  assessSentiment,
  buildNarrativeClusters,
  buildDiversityBreakdown,
  summarizeReadings,
  figuresFromReadings,
  profileFromCatalog,
  ideologyBucket,
  mediaTypeBucket,
  ambitoBucket,
  METHODOLOGY_VERSION,
} from './media-methodology'
import type { CatalogMedio, AggregatedArticle } from '../news-aggregator'

// Re-exports para uso desde endpoints/UI sin importar dos módulos
export type {
  ArticleReading, NarrativeCluster, SourceDiversityBreakdown,
  MethodologyConfidence, FrameType, IdeologyBucket, MediaTypeBucket, AmbitoBucket,
}
export {
  readArticle, assessSentiment, buildNarrativeClusters, buildDiversityBreakdown,
  summarizeReadings, figuresFromReadings, profileFromCatalog,
  METHODOLOGY_VERSION,
}

export const ANALYSIS_VERSION = 'media-analysis-v2'

// ════════════════════════════════════════════════════════════════════════
// 1 · Tipos específicos de NewsAPI/búsqueda puntual
// ════════════════════════════════════════════════════════════════════════

export interface NewsApiArticle {
  title: string
  description: string | null
  url: string
  urlToImage?: string | null
  source: { name: string; id: string | null } | null
  domain?: string
  author?: string | null
  publishedAt: string
  content?: string | null
  language?: string
  sentiment_score?: number
  ideology_bucket?: IdeologyBucket | null
}

export interface FramingComparisonBucket {
  bucket: IdeologyBucket | 'unknown'
  count: number
  top_sources: Array<{ source: string; count: number }>
  dominant_topics: Array<{ topic: string; count: number }>
  dominant_frames: Array<{ frame: FrameType; count: number }>
  actors_emphasized: Array<{ actor: string; mentions: number }>
  actors_omitted: string[]                       // mencionados en otros buckets pero no en éste
  average_tone: number                            // -1 a +1
  controversy_score: number                       // 0..100
  representative_titles: string[]
  distinctive_terms: Array<{ term: string; lift: number }>  // términos sobre-indexados vs media
  interpretation: string                          // texto auditable
}

export interface CoverageGap {
  topic: string
  total_mentions: number
  expected_per_bucket: number
  buckets_underreporting: Array<{ bucket: IdeologyBucket; mentions: number; shortfall: number }>
  buckets_overreporting: Array<{ bucket: IdeologyBucket; mentions: number; surplus: number }>
  interpretation: string
}

export interface SuggestedFollowupQuery {
  query: string
  reason: string
  expected_focus: 'actor' | 'topic' | 'territory' | 'frame' | 'contradiction' | 'time' | 'source'
  // Sprint M5 · params estructurados ejecutables directamente por /api/medios/search
  params?: {
    domains?: string[]
    sourceGroups?: Array<'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'economic' | 'international' | 'regional' | 'fact-checkers'>
    sortBy?: 'publishedAt' | 'relevancy' | 'popularity'
    from?: string
    to?: string
    language?: 'es' | 'en' | 'fr'
  }
}

export interface MediaAnalysisWarning {
  level: 'info' | 'warning' | 'critical'
  category: 'sample' | 'ideology' | 'territory' | 'sources' | 'time' | 'confidence'
  message: string
  evidence?: string
}

// ════════════════════════════════════════════════════════════════════════
// 2 · normalizeArticle · adapta cualquier fuente a AggregatedArticle
// ════════════════════════════════════════════════════════════════════════

// Sprint M5 · matching robusto contra catálogo
// 5 estrategias en cascada para minimizar fuentes "NewsAPI external":
//   1. dominio exacto del campo `web` del catálogo (sin www)
//   2. dominio sin subdominio (theguardian.com vs www.theguardian.com)
//   3. hostname incluido dentro de `web` del catálogo
//   4. source.id de NewsAPI (los IDs tipo "el-pais" mapean bien)
//   5. matching aproximado del nombre con normalización (Levenshtein-lite)
function matchCatalog(
  catalog: CatalogMedio[] | undefined,
  domain: string,
  sourceName: string,
  sourceId: string | null,
): { medio: CatalogMedio | null; strategy: string | null } {
  if (!catalog || catalog.length === 0) return { medio: null, strategy: null }
  const cleanDomain = domain.toLowerCase().replace(/^www\./, '')
  // 1 · dominio exacto sin www
  for (const m of catalog) {
    if (!m.web) continue
    try {
      const w = new URL(m.web.startsWith('http') ? m.web : `https://${m.web}`)
      const h = w.hostname.toLowerCase().replace(/^www\./, '')
      if (h === cleanDomain) return { medio: m, strategy: 'domain-exact' }
    } catch { /* noop */ }
  }
  // 2 · root domain match (subdominio inverso · ej. cincodias.elpais.com vs elpais.com)
  if (cleanDomain.includes('.')) {
    const root = cleanDomain.split('.').slice(-2).join('.')
    for (const m of catalog) {
      if (!m.web) continue
      try {
        const w = new URL(m.web.startsWith('http') ? m.web : `https://${m.web}`)
        const h = w.hostname.toLowerCase().replace(/^www\./, '')
        const hRoot = h.includes('.') ? h.split('.').slice(-2).join('.') : h
        if (hRoot === root) return { medio: m, strategy: 'domain-root' }
      } catch { /* noop */ }
    }
  }
  // 3 · hostname incluido en m.web (caso "elpais.com" en catálogo, "noticias.elpais.com" en artículo)
  for (const m of catalog) {
    if (!m.web) continue
    const w = m.web.toLowerCase()
    if (cleanDomain && w.includes(cleanDomain)) return { medio: m, strategy: 'domain-included' }
  }
  // 4 · source.id de NewsAPI ("el-pais", "abc-es", "marca", etc.)
  if (sourceId) {
    const normId = sourceId.toLowerCase().replace(/[-_]/g, '')
    for (const m of catalog) {
      const mId = m.id.toLowerCase().replace(/[-_]/g, '')
      if (mId === normId) return { medio: m, strategy: 'source-id' }
      const nameNorm = m.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (nameNorm === normId) return { medio: m, strategy: 'name-id' }
    }
  }
  // 5 · nombre aproximado · normalizado sin espacios/acentos
  const normSourceName = sourceName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
  if (normSourceName.length >= 3) {
    for (const m of catalog) {
      const normMedio = m.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
      if (normMedio === normSourceName) return { medio: m, strategy: 'name-exact' }
      // Sub-string match · si el nombre normalizado es 80%+ del otro
      if (normMedio.length >= 5 && normSourceName.length >= 5) {
        if (normMedio.includes(normSourceName) && normSourceName.length / normMedio.length >= 0.6) {
          return { medio: m, strategy: 'name-substr' }
        }
        if (normSourceName.includes(normMedio) && normMedio.length / normSourceName.length >= 0.6) {
          return { medio: m, strategy: 'name-substr' }
        }
      }
    }
  }
  return { medio: null, strategy: null }
}

// Tracking de matching para metrics catalog_match_rate
const __MATCH_STATS = new WeakMap<object, { matched: number; unmatched: number; strategies: Record<string, number>; unmatchedSamples: Array<{ domain: string; name: string }> }>()

export function startCatalogMatchTracking(catalog: CatalogMedio[]): object {
  const token = { __catalog: catalog }
  __MATCH_STATS.set(token, { matched: 0, unmatched: 0, strategies: {}, unmatchedSamples: [] })
  return token
}

export function endCatalogMatchTracking(token: object): {
  matched_sources: number
  unmatched_sources: number
  catalog_match_rate: number
  match_strategies: Record<string, number>
  unmatched_samples: Array<{ domain: string; name: string }>
} {
  const s = __MATCH_STATS.get(token)
  if (!s) return { matched_sources: 0, unmatched_sources: 0, catalog_match_rate: 0, match_strategies: {}, unmatched_samples: [] }
  const total = s.matched + s.unmatched
  return {
    matched_sources: s.matched,
    unmatched_sources: s.unmatched,
    catalog_match_rate: total > 0 ? Math.round((s.matched / total) * 100) / 100 : 0,
    match_strategies: s.strategies,
    unmatched_samples: s.unmatchedSamples.slice(0, 20),
  }
}

export function normalizeArticle(
  article: NewsApiArticle | any,
  fallbackCatalog?: CatalogMedio[],
  matchToken?: object,
): AggregatedArticle {
  const domain = (article.domain || domainOf(article.url || '')) as string
  const sourceName = article.source?.name || article.source || domain
  const sourceId = article.source?.id || null
  const idHash = sourceName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40)
  // Sprint M5 · matching robusto con 5 estrategias
  const { medio: matched, strategy } = matchCatalog(fallbackCatalog, domain, sourceName, sourceId)
  // Track stats si se proveyó token
  if (matchToken) {
    const s = __MATCH_STATS.get(matchToken)
    if (s) {
      if (matched && strategy) {
        s.matched++
        s.strategies[strategy] = (s.strategies[strategy] || 0) + 1
      } else {
        s.unmatched++
        if (s.unmatchedSamples.length < 50 && !s.unmatchedSamples.find((u) => u.domain === domain)) {
          s.unmatchedSamples.push({ domain, name: sourceName })
        }
      }
    }
  }
  const medio: CatalogMedio = matched || {
    id: idHash,
    nombre: sourceName,
    grupo: 'NewsAPI external',
    tipo: 'Digital',
    ambito: 'internacional',
    ccaa: null,
    ideologia: article.ideology_bucket ? ideologyBucketToNumber(article.ideology_bucket) : 0,
    audiencia_M: 0,
    credibilidad: 60,                              // conservador para fuentes no curadas
    rss: null,
    web: `https://${domain}`,
  }
  const pubDate = article.publishedAt ? new Date(article.publishedAt) : null
  return {
    title: article.title || '',
    link: article.url || '',
    description: article.description || article.content || '',
    pubDate,
    pub_date_iso: pubDate ? pubDate.toISOString() : null,
    medio,
    sentiment: 'neutral',
    sentiment_score: 0,
  }
}

function ideologyBucketToNumber(b: IdeologyBucket): number {
  switch (b) {
    case 'left': return -60
    case 'center-left': return -25
    case 'center': return 0
    case 'center-right': return 25
    case 'right': return 60
  }
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

// ════════════════════════════════════════════════════════════════════════
// 3 · readArticlesBatch · paraleliza readArticle
// ════════════════════════════════════════════════════════════════════════

export function readArticlesBatch(
  articles: Array<NewsApiArticle | AggregatedArticle>,
  catalog?: CatalogMedio[],
  matchToken?: object,
): ArticleReading[] {
  return articles.map((a) => {
    const norm = ('medio' in a && a.medio) ? (a as AggregatedArticle) : normalizeArticle(a as NewsApiArticle, catalog, matchToken)
    return readArticle(norm)
  })
}

// ════════════════════════════════════════════════════════════════════════
// 4 · framingComparison · análisis profundo por bucket ideológico
// ════════════════════════════════════════════════════════════════════════

export function framingComparison(readings: ArticleReading[]): FramingComparisonBucket[] {
  if (readings.length === 0) return []
  // Agrupar por bucket
  const byBucket = new Map<IdeologyBucket | 'unknown', ArticleReading[]>()
  for (const r of readings) {
    const b = (r.medium_ideology_bucket || 'unknown') as IdeologyBucket | 'unknown'
    if (!byBucket.has(b)) byBucket.set(b, [])
    byBucket.get(b)!.push(r)
  }

  // Universo de actores · usado para detectar "actors_omitted"
  const universeActors = new Set<string>()
  for (const r of readings) for (const a of r.actors) universeActors.add(a)

  // Universo de términos · para distinctive_terms (lift = freq_bucket / freq_global)
  const globalTerms = countTerms(readings)
  const totalGlobalTerms = sumValues(globalTerms)

  const out: FramingComparisonBucket[] = []
  Array.from(byBucket.entries()).forEach(([bucket, arts]) => {
    const sources = new Map<string, number>()
    const topics = new Map<string, number>()
    const frames = new Map<FrameType, number>()
    const actors = new Map<string, number>()
    let toneSum = 0, controvSum = 0
    for (const r of arts) {
      sources.set(r.medium, (sources.get(r.medium) || 0) + 1)
      topics.set(r.main_topic, (topics.get(r.main_topic) || 0) + 1)
      frames.set(r.frame, (frames.get(r.frame) || 0) + 1)
      for (const a of r.actors) actors.set(a, (actors.get(a) || 0) + 1)
      toneSum += r.sentiment.headline_tone_score
      controvSum += r.sentiment.controversy_score
    }
    const actorsEmphasized = topMap(actors, 6).map(([actor, mentions]) => ({ actor, mentions }))
    const presentActors = new Set(actors.keys())
    const actorsOmitted = Array.from(universeActors).filter((a) => !presentActors.has(a)).slice(0, 5)

    // Términos distintivos · lift
    const bucketTerms = countTerms(arts)
    const totalBucketTerms = sumValues(bucketTerms)
    const distinctive: Array<{ term: string; lift: number }> = []
    Array.from(bucketTerms.entries()).forEach(([term, cBucket]) => {
      if (cBucket < 2) return
      const cGlobal = globalTerms.get(term) || cBucket
      const freqBucket = cBucket / Math.max(1, totalBucketTerms)
      const freqGlobal = cGlobal / Math.max(1, totalGlobalTerms)
      const lift = freqGlobal > 0 ? freqBucket / freqGlobal : 1
      if (lift >= 1.5) distinctive.push({ term, lift: Math.round(lift * 100) / 100 })
    })
    distinctive.sort((a, b) => b.lift - a.lift)

    const avgTone = arts.length > 0 ? toneSum / arts.length : 0
    const avgControv = arts.length > 0 ? Math.round(controvSum / arts.length) : 0

    out.push({
      bucket,
      count: arts.length,
      top_sources: topMap(sources, 5).map(([source, count]) => ({ source, count })),
      dominant_topics: topMap(topics, 5).map(([topic, count]) => ({ topic, count })),
      dominant_frames: topMap(frames, 4).map(([frame, count]) => ({ frame, count })),
      actors_emphasized: actorsEmphasized,
      actors_omitted: actorsOmitted,
      average_tone: Math.round(avgTone * 100) / 100,
      controversy_score: avgControv,
      representative_titles: arts.slice(0, 3).map((r) => r.headline),
      distinctive_terms: distinctive.slice(0, 8),
      interpretation: interpretBucket(bucket, arts.length, avgTone, avgControv, distinctive[0]?.term, actorsEmphasized[0]?.actor),
    })
  })

  return out.sort((a, b) => b.count - a.count)
}

function interpretBucket(
  bucket: string,
  count: number,
  tone: number,
  controv: number,
  distinctiveTerm: string | undefined,
  topActor: string | undefined,
): string {
  const bits: string[] = []
  bits.push(`${count} artículos`)
  if (tone <= -0.2) bits.push('tono claramente negativo')
  else if (tone >= 0.2) bits.push('tono claramente positivo')
  else bits.push('tono mixto')
  if (controv >= 60) bits.push(`controversia alta (${controv}/100)`)
  if (topActor) bits.push(`enfatiza a ${topActor}`)
  if (distinctiveTerm) bits.push(`vocabulario distintivo: "${distinctiveTerm}"`)
  return bits.join(' · ')
}

function countTerms(readings: ArticleReading[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const r of readings) {
    const words = (r.headline + ' ' + r.summary)
      .toLowerCase()
      .replace(/[^a-záéíóúñü\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 5 && !STOPWORDS.has(w))
    for (const w of words) out.set(w, (out.get(w) || 0) + 1)
  }
  return out
}

function topMap<K>(m: Map<K, number>, n: number): Array<[K, number]> {
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n)
}

function sumValues(m: Map<string, number>): number {
  let s = 0
  m.forEach((v) => { s += v })
  return s
}

const STOPWORDS = new Set([
  'sobre', 'desde', 'hasta', 'entre', 'porque', 'cuando', 'donde',
  'mientras', 'aunque', 'siempre', 'nunca', 'también', 'todos', 'todas',
  'mismo', 'misma', 'tanto', 'tanta', 'esos', 'esas', 'estos', 'estas',
  'estar', 'tener', 'haber', 'hacer', 'decir', 'poder', 'deber',
  'país', 'países', 'gobierno', 'gobiernos',
])

// ════════════════════════════════════════════════════════════════════════
// 5 · coverageGaps · topics infrarrepresentados por bucket
// ════════════════════════════════════════════════════════════════════════

export function coverageGapsAnalysis(readings: ArticleReading[]): CoverageGap[] {
  if (readings.length === 0) return []
  // Counts globales por topic
  const topicTotals = new Map<string, number>()
  const topicByBucket = new Map<string, Map<IdeologyBucket, number>>()
  const bucketTotals = new Map<IdeologyBucket, number>()
  for (const r of readings) {
    const b = r.medium_ideology_bucket
    bucketTotals.set(b, (bucketTotals.get(b) || 0) + 1)
    const topic = r.main_topic
    topicTotals.set(topic, (topicTotals.get(topic) || 0) + 1)
    if (!topicByBucket.has(topic)) topicByBucket.set(topic, new Map())
    const m = topicByBucket.get(topic)!
    m.set(b, (m.get(b) || 0) + 1)
  }
  const totalArticles = readings.length
  const buckets = Array.from(bucketTotals.entries())

  const out: CoverageGap[] = []
  Array.from(topicTotals.entries())
    .filter(([, total]) => total >= 3)            // topics con poca señal no aplican
    .forEach(([topic, total]) => {
      const expectedShare = total / totalArticles
      const under: CoverageGap['buckets_underreporting'] = []
      const over: CoverageGap['buckets_overreporting'] = []
      for (const [bucket, bucketTotal] of buckets) {
        const actual = topicByBucket.get(topic)?.get(bucket) || 0
        const expected = Math.round(bucketTotal * expectedShare)
        if (actual < expected * 0.5 && expected >= 2) {
          under.push({ bucket, mentions: actual, shortfall: expected - actual })
        } else if (actual > expected * 1.7) {
          over.push({ bucket, mentions: actual, surplus: actual - expected })
        }
      }
      if (under.length > 0 || over.length > 0) {
        const expectedPerBucket = Math.round((total / Math.max(1, buckets.length)) * 10) / 10
        out.push({
          topic,
          total_mentions: total,
          expected_per_bucket: expectedPerBucket,
          buckets_underreporting: under,
          buckets_overreporting: over,
          interpretation: gapInterpretation(topic, under, over),
        })
      }
    })

  return out.sort((a, b) => b.total_mentions - a.total_mentions).slice(0, 8)
}

function gapInterpretation(
  topic: string,
  under: CoverageGap['buckets_underreporting'],
  over: CoverageGap['buckets_overreporting'],
): string {
  const bits: string[] = [`Topic "${topic}":`]
  if (over.length > 0) bits.push(`sobre-cobertura en ${over.map((b) => b.bucket).join(', ')}`)
  if (under.length > 0) bits.push(`infra-cobertura en ${under.map((b) => b.bucket).join(', ')}`)
  bits.push('asimetría significativa.')
  return bits.join(' · ')
}

// ════════════════════════════════════════════════════════════════════════
// 6 · suggestedFollowupQueries · derivadas de readings
// ════════════════════════════════════════════════════════════════════════

// Sprint M5 · sugerencias con params estructurados ejecutables directamente por
// /api/medios/search · sin `site:` (NewsAPI no lo soporta como Google).
// Cada sugerencia trae query + params para construir un POST directo.
export function suggestedFollowupQueries(
  readings: ArticleReading[],
  originalQuery: string,
  framing?: FramingComparisonBucket[],
): SuggestedFollowupQuery[] {
  const out: SuggestedFollowupQuery[] = []
  if (readings.length === 0) return out

  // 1 · actores beneficiados/perjudicados con alta presencia
  const benef = new Map<string, number>()
  const aff = new Map<string, number>()
  const actors = new Map<string, number>()
  const sectors = new Map<string, number>()
  const territories = new Map<string, number>()
  for (const r of readings) {
    for (const a of r.beneficiaries) benef.set(a, (benef.get(a) || 0) + 1)
    for (const a of r.affected) aff.set(a, (aff.get(a) || 0) + 1)
    for (const a of r.actors) actors.set(a, (actors.get(a) || 0) + 1)
    for (const s of r.sectors) sectors.set(s, (sectors.get(s) || 0) + 1)
    for (const t of r.territory_mentioned) territories.set(t, (territories.get(t) || 0) + 1)
  }

  // 1a · actores top como query principal
  topMap(actors, 3).forEach(([actor]) => {
    out.push({
      query: `"${actor}" AND ${originalQuery}`,
      reason: `Actor más mencionado (${actors.get(actor)} apariciones) · acota la cobertura al actor`,
      expected_focus: 'actor',
      params: { sortBy: 'relevancy' },
    })
  })

  // 1b · sectores como query con sort por popularidad para detectar viralidad sectorial
  topMap(sectors, 2).forEach(([sector]) => {
    if (originalQuery.toLowerCase().includes(sector)) return
    out.push({
      query: `${sector} ${originalQuery}`,
      reason: `Topic dominante (${sectors.get(sector)} apariciones) · sort por popularidad detecta viralidad`,
      expected_focus: 'topic',
      params: { sortBy: 'popularity' },
    })
  })

  // 1c · territorios + sourceGroup regional para captar prensa regional
  topMap(territories, 2).forEach(([terr]) => {
    out.push({
      query: `${originalQuery} ${terr}`,
      reason: `Territorio recurrente (${territories.get(terr)} apariciones) · añade sourceGroup regional para prensa local`,
      expected_focus: 'territory',
      params: { sourceGroups: ['regional'] },
    })
  })

  // 2 · si hay asimetría ideológica, sugerir consultar el bucket sub-representado
  // ahora con sourceGroups (NewsAPI lo entiende vía domains internos) · NO `site:`
  if (framing && framing.length >= 2) {
    const sorted = [...framing].sort((a, b) => a.count - b.count)
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    if (min.count < max.count * 0.4 && min.bucket !== 'unknown') {
      const validGroups = ['left', 'center-left', 'center', 'center-right', 'right'] as const
      const targetGroup = validGroups.includes(min.bucket as any) ? (min.bucket as typeof validGroups[number]) : null
      if (targetGroup) {
        out.push({
          query: originalQuery,
          reason: `Bucket "${min.bucket}" infrarrepresentado (${min.count} vs ${max.count}) · ejecuta misma query restringida a ese bloque para auditar asimetría`,
          expected_focus: 'contradiction',
          params: { sourceGroups: [targetGroup] },
        })
      }
    }
  }

  // 3 · sugerencia temporal · si la cobertura está concentrada en pocos días
  const dates = new Set(readings.map((r) => (r.pub_date || '').slice(0, 10)).filter(Boolean))
  if (dates.size <= 2 && readings.length >= 5) {
    const lastWeek = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)
    out.push({
      query: originalQuery,
      reason: `Cobertura concentrada en ${dates.size} día(s) · amplía a últimas 2 semanas para contexto temporal`,
      expected_focus: 'time',
      params: { from: lastWeek, sortBy: 'publishedAt' },
    })
  }

  // 4 · sugerencia fact-checkers · si hay frame "corrupción" o "desinformación" dominante
  const hasControv = readings.some((r) => r.frame === 'corrupción' || r.frame === 'desinformación' || r.sentiment.controversy_score >= 60)
  if (hasControv) {
    out.push({
      query: originalQuery,
      reason: 'Tema con controversia alta · verifica con fact-checkers (Maldita, Newtral, EFE Verifica)',
      expected_focus: 'source',
      params: { sourceGroups: ['fact-checkers'], sortBy: 'publishedAt' },
    })
  }

  return out.slice(0, 8)
}

// ════════════════════════════════════════════════════════════════════════
// 7 · mediaAnalysisWarnings · advertencias de representatividad
// ════════════════════════════════════════════════════════════════════════

export function mediaAnalysisWarnings(
  readings: ArticleReading[],
  diversity?: SourceDiversityBreakdown,
  framing?: FramingComparisonBucket[],
): MediaAnalysisWarning[] {
  const w: MediaAnalysisWarning[] = []
  if (readings.length === 0) {
    w.push({ level: 'critical', category: 'sample', message: 'Sin artículos · análisis no posible' })
    return w
  }
  if (readings.length < 10) {
    w.push({ level: 'warning', category: 'sample', message: `Sólo ${readings.length} artículos · análisis tentativo`, evidence: 'menos de 10 piezas es muestra muy pequeña' })
  }
  // Confianza media baja
  const avgConf = readings.reduce((s, r) => s + r.confidence.overall, 0) / readings.length
  if (avgConf < 0.5) {
    w.push({ level: 'warning', category: 'confidence', message: `Confianza media baja (${(avgConf * 100).toFixed(0)}%) · muchas inferencias débiles`, evidence: 'titulares cortos o sin entidades reconocidas' })
  }
  if (diversity) {
    for (const dw of diversity.warnings) w.push({ level: 'warning', category: 'sources', message: dw })
  }
  if (framing && framing.length > 1) {
    const totals = framing.map((b) => b.count)
    const max = Math.max(...totals), min = Math.min(...totals)
    if (max / Math.max(1, min) > 4) {
      w.push({
        level: 'warning', category: 'ideology',
        message: `Cobertura ideológica desequilibrada · bucket dominante ${max}× el menos cubierto`,
        evidence: framing.map((b) => `${b.bucket}: ${b.count}`).join(' · '),
      })
    }
  }
  // Sin entities en mitad de artículos
  const lowEntity = readings.filter((r) => r.actors.length === 0 && r.parties.length === 0 && r.institutions.length === 0).length
  if (lowEntity / readings.length > 0.5) {
    w.push({
      level: 'info', category: 'sample',
      message: `${lowEntity}/${readings.length} artículos sin entidades políticas reconocidas`,
      evidence: 'tema con poca politización directa o naming alternativo',
    })
  }
  // Concentración temporal
  const dates = readings.map((r) => (r.pub_date || '').slice(0, 10)).filter(Boolean)
  const uniqueDays = new Set(dates).size
  if (uniqueDays === 1 && readings.length > 5) {
    w.push({
      level: 'info', category: 'time',
      message: `Toda la cobertura en 1 día · pico puntual, no tendencia`,
      evidence: dates[0],
    })
  }
  return w
}

// ════════════════════════════════════════════════════════════════════════
// 8 · explainArticleReading · explicación humana
// ════════════════════════════════════════════════════════════════════════

export function explainArticleReading(r: ArticleReading): string {
  const bits: string[] = []
  bits.push(`Medio: ${r.medium} (${r.medium_ideology_bucket} · ${r.medium_ambito}).`)
  bits.push(`Frame detectado: ${r.frame}.`)
  if (r.action_verb !== 'otro') bits.push(`Acción: ${r.action_verb}.`)
  if (r.action_subject) bits.push(`Sujeto: ${r.action_subject}.`)
  if (r.action_object) bits.push(`Objeto: ${r.action_object}.`)
  if (r.beneficiaries.length > 0) bits.push(`Beneficia a: ${r.beneficiaries.join(', ')}.`)
  if (r.affected.length > 0) bits.push(`Perjudica a: ${r.affected.join(', ')}.`)
  bits.push(`Confianza: ${(r.confidence.overall * 100).toFixed(0)}%.`)
  if (r.confidence.reasons.length > 0) bits.push(`Limitaciones: ${r.confidence.reasons.join('; ')}.`)
  return bits.join(' ')
}

// ════════════════════════════════════════════════════════════════════════
// 9 · computeMethodologyConfidence · confianza compuesta del análisis
// ════════════════════════════════════════════════════════════════════════

export function computeMethodologyConfidence(
  readings: ArticleReading[],
  diversity?: SourceDiversityBreakdown,
  totalResults?: number,
): MethodologyConfidence {
  const n = readings.length
  if (n === 0) {
    return {
      overall: 0,
      reasons: ['Sin artículos'],
      components: { source_quality: 0, text_signal: 0, entity_coverage: 0, deterministic_only: true },
    }
  }
  const avgConf = readings.reduce((s, r) => s + r.confidence.overall, 0) / n
  const avgEntity = readings.reduce((s, r) => s + (r.actors.length + r.parties.length + r.institutions.length), 0) / n
  const avgTextSignal = readings.reduce((s, r) => s + r.confidence.components.text_signal, 0) / n
  const avgSourceQual = readings.reduce((s, r) => s + r.confidence.components.source_quality, 0) / n
  // Penalización si la muestra es minúscula comparada con totalResults
  let samplePenalty = 1
  if (totalResults && totalResults > 0) {
    const coverage = n / totalResults
    if (coverage < 0.05) samplePenalty = 0.7
    else if (coverage < 0.20) samplePenalty = 0.85
  }
  const ideoBonus = diversity ? diversity.ideological_balance_score * 0.15 : 0
  const overall = Math.min(1, (avgConf * 0.5 + avgTextSignal * 0.2 + avgSourceQual * 0.15 + Math.min(1, avgEntity / 3) * 0.15) * samplePenalty + ideoBonus * 0.5)
  // Sprint M5 · razones accionables · cada warning sugiere qué hacer
  const reasons: string[] = []
  if (avgConf < 0.5) {
    reasons.push('Confianza por artículo baja · revisa si los titulares son cortos o ambiguos · prueba ampliar a fuentes con mejor descripción (ej. añadir prensa nacional)')
  }
  if (avgEntity < 1) {
    reasons.push('Pocas entidades políticas reconocidas: prueba una query más específica con actor/partido o revisa si el tema es principalmente sectorial')
  }
  if (samplePenalty < 1 && totalResults) {
    reasons.push(`Sólo analizamos ${n} de ${totalResults.toLocaleString('es-ES')} resultados (cobertura ${((n / totalResults) * 100).toFixed(1)}%) · sube pageSize o acota por dominios/sourceGroups`)
  }
  if (diversity && diversity.ideological_balance_score < 0.4) {
    reasons.push('Balance ideológico débil · activa modo comparative o añade sourceGroups complementarios al bloque dominante')
  }
  // Diversidad temporal · concentración en un solo día = pico, no tendencia
  if (n >= 5) {
    const dates = new Set(readings.map((r) => (r.pub_date || '').slice(0, 10)).filter(Boolean))
    if (dates.size === 1) {
      reasons.push('Toda la cobertura en 1 solo día · es un pico puntual, no una tendencia · amplía ventana con `from=hace 1 semana`')
    } else if (dates.size === 2 && n >= 10) {
      reasons.push('Cobertura concentrada en 2 días · señal puede ser un disparo de actualidad · contextualiza con timespan más amplio')
    }
  }
  // Catalog match rate
  const externalCount = readings.filter((r) => r.medium === '' || (r as any).medium_type === 'otro').length
  if (externalCount / n > 0.5) {
    reasons.push(`${externalCount} de ${n} fuentes no están en el catálogo Politeia · análisis con perfil sintético · considera revisar UnmatchedSourcesPanel`)
  }
  return {
    overall: Math.round(overall * 100) / 100,
    reasons,
    components: {
      source_quality: avgSourceQual,
      text_signal: avgTextSignal,
      entity_coverage: avgEntity,
      deterministic_only: true,
    },
  }
}

// ════════════════════════════════════════════════════════════════════════
// 10 · Aux · profile de fuente desde domain (para articles sin catalog match)
// ════════════════════════════════════════════════════════════════════════

export function profileFromDomain(domain: string, name: string, ideologyHint?: IdeologyBucket | null) {
  const ideology_raw = ideologyHint ? ideologyBucketToNumber(ideologyHint) : 0
  return {
    id: domain.replace(/\./g, '-'),
    name,
    group: 'NewsAPI external',
    type: mediaTypeBucket('Digital'),
    ambito: ambitoBucket('internacional', null),
    ccaa: null,
    ideology_raw,
    ideology_bucket: ideologyHint || ideologyBucket(ideology_raw),
    audience_M: 0,
    credibility: 60,
    rss_url: null,
    web: `https://${domain}`,
    has_rss: false,
  }
}
