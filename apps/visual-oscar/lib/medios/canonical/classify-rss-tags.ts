/**
 * Capa 1 clasificación: mapeo RSS tag → TopicTag.
 * Umbral confidence ≥ 0.65 para producir resultado.
 * Spec §2.1 Sprint 2 / §Paso 6 Sprint 0+1.
 * Sprint 0+1 · Task 3 · 2026-06-02
 */
import type { TopicTag, RssTagMapCatalog } from './types'

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

interface RssTagMapping {
  rawTag: string
  topicId: string | null
  subtopicId?: string
  confidence: number
  sources: string[]
  note?: string
}

export function classifyByRssTags(
  rawTags: string[],
  sourceId: string,
  catalog: RssTagMapCatalog,
): TopicTag | null {
  if (!rawTags || rawTags.length === 0) return null

  const mappings = catalog.mappings as RssTagMapping[]

  let best: { topicId: string; subtopicId?: string; confidence: number } | null = null

  for (const tag of rawTags) {
    const tagNorm = normalize(tag)
    for (const m of mappings) {
      if (normalize(m.rawTag) !== tagNorm) continue
      if (m.topicId === null) continue
      const sourceMatch = m.sources.includes('*') || m.sources.includes(sourceId)
      if (!sourceMatch) continue
      if (m.confidence < 0.65) continue
      if (!best || m.confidence > best.confidence) {
        best = {
          topicId: m.topicId,
          subtopicId: m.subtopicId,
          confidence: m.confidence,
        }
      }
    }
  }

  if (!best) return null
  return {
    topicId: best.topicId,
    subtopicId: best.subtopicId ?? null,
    level: best.subtopicId ? 2 : 1,
    confidence: best.confidence,
    method: 'RSS_TAG',
    assignedAt: new Date().toISOString(),
  }
}
