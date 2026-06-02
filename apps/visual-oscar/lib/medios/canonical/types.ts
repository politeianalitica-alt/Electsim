/**
 * Tipos canónicos de la capa de ingesta Prensa.
 * Sprint 0+1 · Capa Canónica · 2026-06-02
 *
 * Diseñados para ser forward-compatibles con Sprint 2 (Clasificación),
 * Sprint 3 (Actores) y Sprint 4 (Narrativas + Lectura IA).
 *
 * Spec: docs/superpowers/specs/2026-06-02-prensa-sprint-0-1-ingesta-canonica-design.md
 */

// ──────── Enums / tipos base ────────────────────────────────────────────

export type IngestionSource = 'RSS' | 'NEWSAPI' | 'GDELT' | 'MANUAL' | 'INSTITUTIONAL'

export type Polarity = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED' | 'UNKNOWN'

export type Tone =
  | 'INFORMATIVO'
  | 'CRITICO'
  | 'LAUDATORIO'
  | 'ALARMISTA'
  | 'IRONICO'
  | 'NEUTRAL_FORMAL'
  | 'UNKNOWN'

export type Framing =
  | 'GESTION_COMPETENCIA'
  | 'CRISIS_CONFLICTO'
  | 'CORRUPCION_ESCANDALO'
  | 'NEGOCIACION_BLOQUEO'
  | 'IMPACTO_ECONOMICO'
  | 'LEGITIMIDAD_INSTITUCIONAL'
  | 'SEGURIDAD_AMENAZA'
  | 'DERECHOS_GARANTIAS'
  | 'PROTESTA_MOVILIZACION'
  | 'UNKNOWN'

export type ClassificationMethod =
  | 'RSS_TAG'
  | 'HEURISTIC'
  | 'SEMANTIC'
  | 'MANUAL'
  | 'FALLBACK'

export type ProcessingStatus = 'pending' | 'success' | 'noise' | 'duplicate' | 'failed'

export type SourceTier = 1 | 2 | 3 | 4

export type Ideology =
  | 'LEFT'
  | 'CENTER_LEFT'
  | 'CENTER'
  | 'CENTER_RIGHT'
  | 'RIGHT'
  | 'NATIONALIST'
  | 'INSTITUTIONAL'
  | 'UNKNOWN'

export type SourceType =
  | 'NATIONAL'
  | 'REGIONAL'
  | 'LOCAL'
  | 'DIGITAL_NATIVE'
  | 'AGENCY'
  | 'INTERNATIONAL'
  | 'SECTORAL'
  | 'INSTITUTIONAL'

export type EntityType =
  | 'PERSON'
  | 'PARTY'
  | 'INSTITUTION'
  | 'TERRITORY'
  | 'COMPANY'
  | 'UNION'
  | 'THINKTANK'
  | 'COALITION'
  | 'ORGANISM'

export type TopicLevel = 1 | 2 | 3
export type TopicState = 'STRUCTURAL' | 'EMERGENT' | 'STABLE'

export type WarningSeverity = 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL'

export type WindowSpec = '24h' | '48h' | '72h' | '7d'
export type PulsoMode = 'PLURAL' | 'AUDIEN' | 'REGION' | 'IDEOLOGY' | 'CRISIS'

// ──────── ArticleUnit ─────────────────────────────────────────────────

export interface ExtractedEntity {
  entityId: string
  alias: string
  confidence: number
  position: 'title' | 'description' | 'both'
  resolutionMethod: 'direct' | 'context' | 'coreference'
}

export interface TopicTag {
  topicId: string
  subtopicId: string | null
  level: TopicLevel
  confidence: number
  method: ClassificationMethod
  assignedAt: string
}

export interface Sentiment {
  polarity: Polarity
  confidence: number
  tone: Tone
  framing: Framing
  method: 'heuristic' | 'lexicon' | 'llm' | 'unknown'
}

export interface ArticleUnit {
  // Inmutables tras ingesta
  readonly id: string
  readonly canonicalUrl: string
  readonly title: string
  readonly description: string | null
  readonly bodySnippet: string | null
  readonly source: Source
  readonly publishedAt: string
  readonly ingestedAt: string
  readonly language: string
  readonly country: string
  readonly rawTags: string[]
  readonly ingestionSource: IngestionSource
  // Enriquecidos (modificables por pipeline)
  topicTags: TopicTag[]
  entities: ExtractedEntity[]
  sentiment: Sentiment | null
  framing: Framing | null
  clusterId: string | null
  qualityScore: number
  isNoise: boolean
  noiseReason: string | null
  isDuplicate: boolean
  duplicateOf: string | null
  sourceWeight: number
  processingStatus: ProcessingStatus
  failedStep: string | null
}

// ──────── Source ──────────────────────────────────────────────────────

export interface RssFeedRef {
  url: string
  kind: 'general' | 'politica' | 'economia' | 'opinion' | 'otro'
  active: boolean
}

export interface Source {
  readonly id: string
  readonly name: string
  readonly domain: string
  readonly type: SourceType
  readonly country: string
  readonly regions: string[]
  readonly language: string
  readonly ideology: Ideology
  readonly ideologyScore: number
  readonly tier: SourceTier
  readonly audienceEstimate: number
  readonly rssFeeds: RssFeedRef[]
  readonly qualityScore: number
  readonly active: boolean
}

// ──────── Entity ──────────────────────────────────────────────────────

export interface EntityAlias {
  text: string
  confidence: number
  disambiguationRequired?: boolean
  contextRequired?: string[]
  note?: string
}

export interface Entity {
  readonly id: string
  readonly canonicalName: string
  readonly type: EntityType
  readonly politicalFamily: string | null
  readonly role: string | null
  readonly territory: string | null
  readonly relevanceScore: number
  readonly active: boolean
  readonly aliases: EntityAlias[]
}

// ──────── NewsCluster (Sprint 0+1) + Narrative (Sprint 4 preparado) ──

export interface ClusterEntityRef {
  entityId: string
  mentionCount: number
  averageConfidence: number
}

export interface SentimentDistribution {
  positive: number
  neutral: number
  negative: number
  mixed: number
}

export interface NewsCluster {
  readonly id: string
  title: string
  leaderArticleId: string
  memberIds: string[]
  topic: TopicTag
  entities: ClusterEntityRef[]
  firstSeen: string
  lastSeen: string
  velocity: number
  sourceCount: number
  tierDistribution: Record<string, number>
  territoryDistribution: Record<string, number>
  ideologyDistribution: Record<string, number>
  sentimentBalance: SentimentDistribution
  framingDistribution: Record<string, number>
  prominence: number
}

export interface Narrative {
  readonly id: string
  label: string
  topicId: string
  primaryEntity: string
  framing: Framing
  sentiment: Polarity
  articleCount: number
  sourceCount: number
  sourceDistribution: {
    byTier: Record<string, number>
    byIdeology: Record<string, number>
  }
  momentum: number
  firstDetected: string
  lastUpdated: string
  representativeArticles: string[]
  auditTrail: {
    matchingArticleIds: string[]
    detectionCriteria: string
    confidenceScore: number
  }
}

// ──────── EntityMetrics (Sprint 3 preparado) ──────────────────────────

export interface EntityMetrics {
  entityId: string
  window: WindowSpec
  prominenceScore: number
  articleCount: number
  sourceCount: number
  topicDistribution: Record<string, number>
  sentimentProfile: {
    overall: SentimentDistribution
    byTopic: Record<string, SentimentDistribution>
    byIdeology: Record<string, SentimentDistribution>
  }
  coOccurrences: Array<{ entityId: string; count: number }>
  mediaDistribution: Record<string, number>
  computedAt: string
}

// ──────── TopicProminenceScore (Sprint 2 preparado) ───────────────────

export interface TopicProminenceScore {
  topicId: string
  subtopicId: string | null
  score: number
  components: {
    volumeScore: number
    momentumScore: number
    sourceDiversityScore: number
    tierWeightScore: number
    entityDensityScore: number
  }
  state: TopicState
  volume: number
  sourceCount: number
}

// ──────── Confidence metrics + warnings ──────────────────────────────

export interface ConfidenceWarning {
  code: string
  severity: WarningSeverity
  title: string
  message: string
  detail: string
  action: string
  affectedMetrics: string[]
}

export interface ConfidenceMetrics {
  score: number
  components: {
    classificationCoverage: number
    entityCoverage: number
    deduplicationRate: number
    sourceCatalogCoverage: number
    tier12Proportion: number
  }
  warnings: ConfidenceWarning[]
}

// ──────── PipelineMetrics ─────────────────────────────────────────────

export interface PipelineMetrics {
  windowFrom: string
  windowTo: string
  fetchedTotal: number
  duplicatesExact: number
  duplicatesTitular: number
  noiseFiltered: number
  processedSuccessfully: number
  classifiedWithTaxonomy: number
  withEntities: number
  clusteredExisting: number
  clusteredNew: number
  failedInPipeline: Record<string, number>
  classificationByMethod: Record<ClassificationMethod, number>
  classificationConfidence: { high: number; mid: number; low: number }
  otroPercentage: number
}

// ──────── DominantTopic (output del endpoint /pulso) ──────────────────

export interface DominantTopic {
  topicId: string
  label: string
  volume: number
  volumePct: number
  momentum: number
  state: TopicState
  sentimentBalance: SentimentDistribution
  topEntities: string[]
  topSources: string[]
  rawTagsRepresentative: string[]
  leadClusters: string[]
  representativeTitles: string[]
  confidence: number
}

// ──────── Catalogs (cargados desde JSON) ──────────────────────────────

export interface TopicRulesCatalog {
  version: string
  lastUpdated: string
  topics: unknown[] // Validado por Zod en Task 2
}

export interface RssTagMapCatalog {
  version: string
  lastUpdated: string
  mappings: unknown[]
}

export interface FramingRulesCatalog {
  version: string
  lastUpdated: string
  framings: unknown[]
}

export interface Catalogs {
  sources: Source[]
  entities: Entity[]
  topicRules: TopicRulesCatalog
  rssTagMap: RssTagMapCatalog
  framingRules: FramingRulesCatalog
}

// ──────── Type guards ────────────────────────────────────────────────

export function isArticleUnit(value: unknown): value is ArticleUnit {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.canonicalUrl === 'string' &&
    typeof v.title === 'string' &&
    typeof v.publishedAt === 'string' &&
    typeof v.ingestedAt === 'string' &&
    Array.isArray(v.rawTags) &&
    Array.isArray(v.topicTags) &&
    Array.isArray(v.entities) &&
    typeof v.qualityScore === 'number' &&
    typeof v.isNoise === 'boolean' &&
    typeof v.isDuplicate === 'boolean'
  )
}

export function isSource(value: unknown): value is Source {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.domain === 'string' &&
    typeof v.tier === 'number' &&
    [1, 2, 3, 4].includes(v.tier as number) &&
    Array.isArray(v.regions) &&
    Array.isArray(v.rssFeeds) &&
    typeof v.active === 'boolean'
  )
}

export function isEntity(value: unknown): value is Entity {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.canonicalName === 'string' &&
    typeof v.relevanceScore === 'number' &&
    typeof v.active === 'boolean' &&
    Array.isArray(v.aliases)
  )
}
