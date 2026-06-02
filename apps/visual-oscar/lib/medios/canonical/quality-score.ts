/**
 * Quality score · 6 componentes spec §Paso 8.
 * Sprint 0+1 · Task 3 · 2026-06-02
 */
import type { ArticleUnit } from './types'

export function computeQualityScore(
  article: Pick<
    ArticleUnit,
    'title' | 'description' | 'entities' | 'topicTags' | 'source'
  >,
): number {
  let score = 0
  const desc = (article.description ?? '').trim()
  if (desc.length > 0) score += 0.2
  if (desc && desc.toLowerCase() !== article.title.toLowerCase()) score += 0.1
  const wordCount = article.title.split(/\s+/).length
  if (wordCount >= 6 && wordCount <= 20) score += 0.1
  if (article.entities.length >= 1) score += 0.2
  if (article.topicTags.some((t) => t.confidence >= 0.7)) score += 0.2
  if (article.source.tier === 1 || article.source.tier === 2) score += 0.2
  return Math.min(score, 1.0)
}
