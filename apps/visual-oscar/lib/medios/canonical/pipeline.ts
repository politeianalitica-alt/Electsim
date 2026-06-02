/**
 * processArticle(): orquesta los 10 pasos del spec §2.3.
 * Función pura: misma entrada + mismos catálogos + mismo state → misma salida.
 * No side effects (no fetch, no fs, no clock excepto ingestedAt).
 *
 * Sprint 0+1 · Task 3 · 2026-06-02
 */
import type {
  ArticleUnit,
  Catalogs,
  IngestionSource,
  ProcessingStatus,
  Source,
  TopicTag,
} from './types'
import { computeArticleId, canonicalizeUrl } from './adapters.ts'
import {
  isExactDuplicate,
  computeTitleHash,
  isTitleDuplicate,
} from './dedupe.ts'
import { detectNoise } from './noise-filter.ts'
import { classifyByRssTags } from './classify-rss-tags.ts'
import { classifyByHeuristic } from './classify-heuristic.ts'
import {
  type LlmClassifierClient,
  semanticResultToTopicTag,
  StubLlmClient,
} from './classify-semantic.ts'
import { buildAliasIndex, extractEntities } from './extract-entities.ts'
import { computeQualityScore } from './quality-score.ts'
import { findSourceByDomain } from './catalogs.ts'

export interface RawArticle {
  url: string
  title: string
  description?: string
  bodySnippet?: string
  publishedAt: string
  language?: string
  country?: string
  rawTags?: string[]
  ingestionSource: IngestionSource
  sourceDomain?: string
}

export interface ProcessOptions {
  knownIds?: Set<string>
  recentTitleHashes?: Map<string, { id: string; sourceId: string; ts: string }>
  semanticEnabled?: boolean
  semanticClient?: LlmClassifierClient
  topicListForLlm?: string[]
}

export interface ProcessOutcome {
  article: ArticleUnit | null
  status: ProcessingStatus
  failedStep: string | null
  error: string | null
  method?: 'RSS_TAG' | 'HEURISTIC' | 'SEMANTIC' | 'FALLBACK'
  confidence?: number
  hasEntities: boolean
}

const FALLBACK_SOURCE: Source = {
  id: 'unknown',
  name: 'Unknown',
  domain: '',
  type: 'NATIONAL',
  country: 'ES',
  regions: ['ES'],
  language: 'es',
  ideology: 'UNKNOWN',
  ideologyScore: 0,
  tier: 4,
  audienceEstimate: 0,
  rssFeeds: [],
  qualityScore: 0.1,
  active: false,
}

function tierWeight(tier: 1 | 2 | 3 | 4): number {
  return tier === 1 ? 1.0 : tier === 2 ? 0.7 : tier === 3 ? 0.4 : 0.3
}

export async function processArticle(
  raw: RawArticle,
  catalogs: Catalogs,
  options: ProcessOptions = {},
): Promise<ProcessOutcome> {
  try {
    // 1. Fetch/parse: limpieza
    const canonicalUrl = canonicalizeUrl(raw.url)
    const id = computeArticleId(canonicalUrl)
    const title = raw.title.trim().replace(/\s+/g, ' ')
    const description = (raw.description ?? '').trim()

    // 2. Dedupe exacta
    if (options.knownIds && isExactDuplicate(id, options.knownIds)) {
      return {
        article: null,
        status: 'duplicate',
        failedStep: 'dedupe_exact',
        error: null,
        hasEntities: false,
      }
    }

    // 3. Dedupe titular
    const sourceDomain = raw.sourceDomain ?? extractDomain(raw.url) ?? ''
    const source = findSourceByDomain(catalogs.sources, sourceDomain) ?? FALLBACK_SOURCE
    const titleHash = computeTitleHash(title)
    if (
      options.recentTitleHashes &&
      isTitleDuplicate(titleHash, source.id, options.recentTitleHashes, 30)
    ) {
      return {
        article: null,
        status: 'duplicate',
        failedStep: 'dedupe_titular',
        error: null,
        hasEntities: false,
      }
    }

    // 4. Filtro ruido
    const noise = detectNoise({ title, description })
    if (noise.isNoise) {
      const ingestedAt = new Date().toISOString()
      const article: ArticleUnit = makeArticleSkeleton(
        id,
        canonicalUrl,
        title,
        description,
        raw,
        source,
        ingestedAt,
      )
      article.isNoise = true
      article.noiseReason = noise.reason
      article.processingStatus = 'noise'
      return {
        article,
        status: 'noise',
        failedStep: null,
        error: null,
        hasEntities: false,
      }
    }

    // 5. Source weight
    const sourceWeight = tierWeight(source.tier) * source.qualityScore

    // 6. Clasificación en cascada
    let topicTag: TopicTag | null = null
    let method: 'RSS_TAG' | 'HEURISTIC' | 'SEMANTIC' | 'FALLBACK' = 'FALLBACK'

    topicTag = classifyByRssTags(raw.rawTags ?? [], source.id, catalogs.rssTagMap)
    if (topicTag) method = 'RSS_TAG'
    if (!topicTag) {
      topicTag = classifyByHeuristic(title, description, catalogs.topicRules)
      if (topicTag) method = 'HEURISTIC'
    }
    if (!topicTag && options.semanticEnabled && options.semanticClient) {
      const topicList = options.topicListForLlm ?? extractTopicIds(catalogs)
      const llmResult = await options.semanticClient.classifyBatch(
        [{ title, description }],
        topicList,
      )
      const r = llmResult[0]
      if (r) {
        topicTag = semanticResultToTopicTag(r)
        method = 'SEMANTIC'
      }
    }
    if (!topicTag) {
      topicTag = {
        topicId: 'OTRO',
        subtopicId: null,
        level: 1,
        confidence: 0.3,
        method: 'FALLBACK',
        assignedAt: new Date().toISOString(),
      }
      method = 'FALLBACK'
    }

    // 7. Extracción entidades
    const aliasIndex = buildAliasIndex(catalogs.entities)
    const extracted = extractEntities(title, description, catalogs.entities, aliasIndex)

    // 8. Quality score
    const ingestedAt = new Date().toISOString()
    const article: ArticleUnit = makeArticleSkeleton(
      id,
      canonicalUrl,
      title,
      description,
      raw,
      source,
      ingestedAt,
    )
    article.topicTags = [topicTag]
    article.entities = extracted
    article.sourceWeight = sourceWeight
    article.qualityScore = computeQualityScore({
      title,
      description,
      entities: extracted,
      topicTags: [topicTag],
      source,
    })
    article.processingStatus = 'success'

    // 9. Storage: el caller persiste si quiere
    // 10. Clustering: en Sprint 0.3 dejamos clusterId=null

    return {
      article,
      status: 'success',
      failedStep: null,
      error: null,
      method,
      confidence: topicTag.confidence,
      hasEntities: extracted.length > 0,
    }
  } catch (e: unknown) {
    const err = e as { message?: string }
    return {
      article: null,
      status: 'failed',
      failedStep: 'unknown',
      error: String(err?.message ?? e).slice(0, 200),
      hasEntities: false,
    }
  }
}

function makeArticleSkeleton(
  id: string,
  canonicalUrl: string,
  title: string,
  description: string,
  raw: RawArticle,
  source: Source,
  ingestedAt: string,
): ArticleUnit {
  return {
    id,
    canonicalUrl,
    title,
    description: description || null,
    bodySnippet: raw.bodySnippet ?? null,
    source,
    publishedAt: raw.publishedAt,
    ingestedAt,
    language: raw.language ?? 'es',
    country: raw.country ?? 'ES',
    rawTags: raw.rawTags ?? [],
    ingestionSource: raw.ingestionSource,
    topicTags: [],
    entities: [],
    sentiment: null,
    framing: null,
    clusterId: null,
    qualityScore: 0,
    isNoise: false,
    noiseReason: null,
    isDuplicate: false,
    duplicateOf: null,
    sourceWeight: 0,
    processingStatus: 'pending',
    failedStep: null,
  }
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

function extractTopicIds(catalogs: Catalogs): string[] {
  return (catalogs.topicRules.topics as Array<{ topicId: string }>).map((t) => t.topicId)
}

export { StubLlmClient }
