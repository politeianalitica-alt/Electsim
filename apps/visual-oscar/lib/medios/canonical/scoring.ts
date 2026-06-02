/**
 * Scoring canónico · Sprint 0.5
 *
 * TopicProminenceScore: 5 componentes ponderados.
 *   · VolumeScore         (30%) — proporción de volumen sobre el topic top
 *   · MomentumScore       (25%) — Δ vs ventana anterior (Sprint 2 lo llena)
 *   · SourceDiversityScore(20%) — fuentes únicas / totales del catálogo
 *   · TierWeightScore     (15%) — promedio de sourceWeight (tier 1-4)
 *   · EntityDensityScore  (10%) — % de artículos con entidades extraídas
 *
 * Sprint 0.5 implementa la estructura + Volume/SourceDiversity/TierWeight/
 * EntityDensity. MomentumScore queda en 0 y lo completa el job 15min del
 * Sprint 2 (que persiste series temporales en topic_prominence_history).
 *
 * State derivado:
 *   · momentum > 0.7  → EMERGENT
 *   · volume > 5      → STRUCTURAL
 *   · resto            → STABLE
 */
import type { ArticleUnit, TopicProminenceScore, TopicState } from './types'

export function computeProminenceForTopic(
  topicId: string,
  articlesInTopic: ArticleUnit[],
  _allArticles: ArticleUnit[],
  maxVolume: number,
  totalSources: number,
): TopicProminenceScore {
  const volume = articlesInTopic.length

  // 1. VolumeScore: proporción sobre el topic más voluminoso
  const volumeScore = maxVolume > 0 ? volume / maxVolume : 0

  // 2. SourceDiversityScore: fuentes únicas que cubren el topic
  const sources = new Set(articlesInTopic.map((a) => a.source.id))
  const sourceCount = sources.size
  const sourceDiversityScore =
    totalSources > 0 ? sourceCount / totalSources : 0

  // 3. MomentumScore: Sprint 2 lo calcula con histórico real
  const momentumScore = 0

  // 4. TierWeightScore: promedio del sourceWeight (1.0 tier 1, 0.4 tier 4)
  const tierWeightScore =
    articlesInTopic.length > 0
      ? articlesInTopic.reduce((s, a) => s + a.sourceWeight, 0) /
        articlesInTopic.length
      : 0

  // 5. EntityDensityScore: artículos con entidades / total
  const entityDensityScore =
    articlesInTopic.length > 0
      ? articlesInTopic.filter((a) => a.entities.length > 0).length /
        articlesInTopic.length
      : 0

  const score =
    volumeScore * 0.30 +
    momentumScore * 0.25 +
    sourceDiversityScore * 0.20 +
    tierWeightScore * 0.15 +
    entityDensityScore * 0.10

  const state: TopicState =
    momentumScore > 0.7 ? 'EMERGENT' : volume > 5 ? 'STRUCTURAL' : 'STABLE'

  return {
    topicId,
    subtopicId: null,
    score,
    components: {
      volumeScore,
      momentumScore,
      sourceDiversityScore,
      tierWeightScore,
      entityDensityScore,
    },
    state,
    volume,
    sourceCount,
  }
}
