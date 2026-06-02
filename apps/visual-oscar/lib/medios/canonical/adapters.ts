/**
 * Adaptadores entre tipos canónicos y:
 *  - Filas Postgres (`article` row · pre-migración 0058 backwards-compatible)
 *  - Legacy types (AggregatedArticle, CatalogMedio, NarrativeCluster)
 *
 * Sprint 0+1 · Canonical layer · 2026-06-02
 */
import { createHash } from 'crypto'
import type {
  ArticleUnit,
  Source,
  TopicTag,
  IngestionSource,
} from './types'

/**
 * Calcula el id canónico de un artículo: SHA-256(canonicalUrl).
 * Determinista. Misma URL → mismo id.
 */
export function computeArticleId(canonicalUrl: string): string {
  return createHash('sha256').update(canonicalUrl).digest('hex')
}

/**
 * Limpia una URL para obtener su versión canónica:
 *  - Elimina tracking params (utm_*, fbclid, gclid, ref, from, origin)
 *  - Normaliza host (lowercase)
 *  - Elimina fragment
 */
export function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    // Lowercase host
    u.hostname = u.hostname.toLowerCase()
    // Strip tracking params
    const STRIP = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'msclkid',
      'ref',
      'from',
      'origin',
      'mc_cid',
      'mc_eid',
    ]
    for (const k of STRIP) u.searchParams.delete(k)
    // Strip fragment
    u.hash = ''
    return u.toString()
  } catch {
    return url
  }
}

/**
 * Shape de la fila Postgres `article` POST-MIGRACIÓN 0058.
 * Antes de Task 6 (migración), algunos campos serán undefined.
 */
export interface ArticleRow {
  id?: string // url hash, opcional pre-migration
  canonical_url?: string // Task 6 lo añade
  url: string // existing
  title: string
  summary: string | null // === description en canon
  body_text: string | null // === bodySnippet
  source_id: string
  lang: string
  published_at: string // ISO
  ingested_at?: string // Task 6 lo añade
  category: string | null // === topic_id legacy
  raw_tags?: unknown[] // JSONB, Task 6
  is_noise?: boolean
  noise_reason?: string | null
  is_duplicate?: boolean
  duplicate_of?: string | null
  processing_status?: string
  failed_step?: string | null
  quality_score?: number
  framing?: string | null
  entities?: unknown[] // JSONB
}

/**
 * Convierte una fila DB en ArticleUnit canónico.
 * Source debe pasarse aparte (lookup en catálogo).
 */
export function articleRowToCanonical(
  row: ArticleRow,
  source: Source,
): ArticleUnit {
  const canonicalUrl = row.canonical_url ?? canonicalizeUrl(row.url)
  const id = row.id ?? computeArticleId(canonicalUrl)
  return {
    id,
    canonicalUrl,
    title: row.title,
    description: row.summary,
    bodySnippet: row.body_text,
    source,
    publishedAt: row.published_at,
    ingestedAt: row.ingested_at ?? row.published_at,
    language: row.lang || 'es',
    country: 'ES',
    rawTags: (row.raw_tags as string[]) ?? [],
    ingestionSource: 'RSS' as IngestionSource,
    topicTags: row.category ? [legacyCategoryToTopicTag(row.category)] : [],
    entities:
      (row.entities as Array<{
        entityId: string
        alias: string
        confidence: number
        position: 'title' | 'description' | 'both'
        resolutionMethod: 'direct' | 'context' | 'coreference'
      }>) ?? [],
    sentiment: null,
    framing: (row.framing as ArticleUnit['framing']) ?? null,
    clusterId: null,
    qualityScore: row.quality_score ?? 0,
    isNoise: row.is_noise ?? false,
    noiseReason: row.noise_reason ?? null,
    isDuplicate: row.is_duplicate ?? false,
    duplicateOf: row.duplicate_of ?? null,
    sourceWeight:
      source.tier === 1
        ? 1.0
        : source.tier === 2
          ? 0.7
          : source.tier === 3
            ? 0.4
            : 0.3,
    processingStatus:
      (row.processing_status as ArticleUnit['processingStatus']) ?? 'pending',
    failedStep: row.failed_step ?? null,
  }
}

function legacyCategoryToTopicTag(category: string): TopicTag {
  return {
    topicId: category.toUpperCase(),
    subtopicId: null,
    level: 1,
    confidence: 0.5,
    method: 'RSS_TAG',
    assignedAt: new Date(0).toISOString(),
  }
}
