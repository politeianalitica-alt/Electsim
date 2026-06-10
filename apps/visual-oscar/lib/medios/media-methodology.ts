/**
 * media-methodology.ts · Sprint M1
 *
 * Capa metodológica central para todo el módulo de medios/prensa.
 *
 * Aquí vive el "cómo" pensamos en:
 *   - qué fuente es buena (SourcePriorityScore)
 *   - cómo leemos una noticia (ArticleReading)
 *   - cómo medimos sentimiento de evento, titular y actor (SentimentAssessment)
 *   - cómo medimos confianza (MethodologyConfidence)
 *   - cómo medimos diversidad de muestra (SourceDiversityBreakdown)
 *   - cómo agrupamos en narrativas (NarrativeCluster)
 *   - cómo medimos impacto político por actor (ActorImpact)
 *   - cómo separamos territorio del medio vs territorio mencionado (RegionalMediaSignal)
 *
 * Filosofía:
 *   - Determinista y sin LLM. Las heurísticas son auditables.
 *   - Reusable desde news-aggregator, news-intel, /api/medios/*, UI.
 *   - Cada inferencia lleva confianza y "por qué".
 *
 * Versionado: METHODOLOGY_VERSION abajo. Si cambia el shape, súbelo.
 */

import type { CatalogMedio, AggregatedArticle } from '../news-aggregator'
// Clasificación por SECTOR (taxonomía compartida) · para el sector dominante de
// cada narrativa y el filtro de sector del workbench de Narrativas.
// Extensión .ts explícita: este módulo lo carga también el runner de tests
// `node --experimental-strip-types` (test:unit), que exige extensión al resolver
// imports de VALOR (no-type). tsconfig tiene allowImportingTsExtensions:true.
import { classifySector, SECTOR_LABELS, type SectorKey } from './sector-taxonomy.ts'

export const METHODOLOGY_VERSION = 'media-intel-v2'

// ════════════════════════════════════════════════════════════════════════
// 1 · MediaSourceProfile + SourcePriorityScore
// ════════════════════════════════════════════════════════════════════════

export type IdeologyBucket = 'left' | 'center-left' | 'center' | 'center-right' | 'right'
export type MediaTypeBucket = 'prensa' | 'digital' | 'radio' | 'tv' | 'agencia' | 'verificador' | 'otro'
export type AmbitoBucket = 'nacional' | 'regional' | 'local' | 'europeo' | 'internacional' | 'sectorial'

export interface MediaSourceProfile {
  id: string
  name: string
  group: string                     // grupo empresarial (PRISA, Atresmedia, Vocento, etc.)
  type: MediaTypeBucket
  ambito: AmbitoBucket
  ccaa: string | null
  ideology_raw: number              // -100 a +100
  ideology_bucket: IdeologyBucket
  audience_M: number
  credibility: number               // 0 a 100 (catálogo)
  rss_url: string | null
  web: string
  has_rss: boolean
  // Sprint G15 FASE F · scope_level propagado desde overlay (data/medios-locales.json)
  // o derivado de ambito. Permite cuotas locales en selectPrioritySources.
  scope_level?: 'nacional' | 'autonomico' | 'provincial' | 'local' | 'europeo' | null
  provincia?: string | null
  municipio?: string | null
}

export interface SourcePriorityScore {
  source_id: string
  total_score: number               // 0..1 normalizado
  components: {
    audience: number                // 0..1
    credibility: number             // 0..1
    ideological_balance: number     // 0..1 (más alto = ayuda a balancear)
    territorial_balance: number     // 0..1
    type_balance: number            // 0..1
    rss_health: number              // 0..1 (penaliza si falla / sin RSS)
    spain_relevance: number         // 0..1
    group_concentration_penalty: number  // 0..1 (resta si su grupo ya está saturado)
  }
  reason: string                    // explicación humana de la priorización
}

export type BalanceMode =
  | 'audience'           // priorización clásica · audiencia domina
  | 'pluralism'          // balanceado ideología + territorio + tipo (default)
  | 'regional'           // sesgo a regional con base nacional mínima
  | 'ideological'        // fuerza presencia mínima de cada bucket ideológico
  | 'crisis'             // prioriza credibilidad + RSS health + spain_relevance

export interface SelectPrioritySourcesOptions {
  maxSources?: number                       // hasta 100
  balanceMode?: BalanceMode
  ccaa?: string | null                      // filtro suave · prioriza pero no excluye
  ideologyTarget?: IdeologyBucket | null
  includeEuropean?: boolean
  includeRegional?: boolean
  tabContext?: string | null                // ej. 'pulso' | 'cobertura-ideologica' | 'regional'
  // Sprint G15 FASE F · cuota mínima de medios provinciales/locales (scope_level).
  // Se aplica como pasada-3 después de cuotas ideológicas: si la selección final
  // no llega a `minLocalShare` de scope_level provincial/local, rellena con los
  // mejores candidatos locales pendientes (hasta agotar maxSources).
  // Default: 0.20 (20%) cuando balanceMode='regional', 0 en otros modos.
  minLocalShare?: number
}

export interface SourceDiversityBreakdown {
  ideological_distribution: Record<IdeologyBucket, number>
  territorial_distribution: Record<AmbitoBucket, number>
  media_type_distribution: Record<MediaTypeBucket, number>
  group_distribution: Array<{ group: string; count: number; share: number }>
  ccaa_distribution: Array<{ ccaa: string; count: number }>
  ideological_balance_score: number        // 0..1 · 1 = perfecto balance
  territorial_balance_score: number
  type_balance_score: number
  warnings: string[]                       // ej. "70% del muestreo es de un solo grupo"
}

// ════════════════════════════════════════════════════════════════════════
// 2 · ArticleReading + SentimentAssessment + ActorImpact
// ════════════════════════════════════════════════════════════════════════

export type ActionVerb =
  | 'acusa' | 'propone' | 'aprueba' | 'bloquea' | 'denuncia' | 'moviliza'
  | 'negocia' | 'dimite' | 'investiga' | 'sentencia' | 'critica' | 'apoya'
  | 'anuncia' | 'rechaza' | 'firma' | 'condena' | 'reclama' | 'amenaza'
  | 'protesta' | 'pacta' | 'rompe' | 'mantiene' | 'cesa' | 'imputa'
  | 'absuelve' | 'evalúa' | 'reúne' | 'visita' | 'otro'

export type FrameType =
  | 'crisis' | 'corrupción' | 'amenaza' | 'oportunidad' | 'gestión'
  | 'identidad' | 'seguridad' | 'economía' | 'territorial' | 'institucional'
  | 'electoral' | 'internacional' | 'social' | 'judicial' | 'desinformación' | 'otro'

export type EmotionalRegister =
  | 'indignación' | 'alarma' | 'esperanza' | 'tecnocrático' | 'institucional'
  | 'polarización' | 'conflicto' | 'escándalo' | 'movilización' | 'económico' | 'neutro'

export type EventTone = 'positive' | 'negative' | 'neutral' | 'mixed'
export type ActorImpactKind = 'beneficial' | 'harmful' | 'neutral' | 'uncertain'

export interface ActorSentiment {
  actor: string
  sentiment: number                 // -1 a +1 · tono HACIA este actor en la pieza
  confidence: number                // 0..1
  reason: string
}

export interface ActorImpact {
  actor: string
  impact: ActorImpactKind           // beneficial | harmful | neutral | uncertain
  confidence: number                // 0..1
  reason: string                    // por qué le beneficia o perjudica
}

export interface SentimentAssessment {
  event_tone: EventTone
  headline_tone_score: number       // -1 a +1
  controversy_score: number         // 0 a 100
  actor_sentiment: ActorSentiment[]
  actor_impact: ActorImpact[]
  emotional_register: EmotionalRegister
  explanation: string               // auditable, 1 frase
}

export interface MethodologyConfidence {
  overall: number                   // 0..1
  reasons: string[]                 // qué baja la confianza
  components: {
    source_quality: number          // según credibility del medio
    text_signal: number             // según riqueza de title+description
    entity_coverage: number         // cuántas entidades reconocidas
    deterministic_only: boolean     // true si sin LLM
  }
}

export interface ArticleReading {
  // identidad
  id: string                        // hash del url · estable
  url: string
  headline: string
  summary: string
  pub_date: string | null
  // medio
  medium: string
  medium_id: string
  medium_type: MediaTypeBucket
  medium_ideology_bucket: IdeologyBucket
  medium_ambito: AmbitoBucket
  medium_ccaa: string | null        // territorio del medio (de dónde es)
  // territorio
  territory_mentioned: string[]     // CCAA mencionadas en el contenido
  territory_affected: string[]      // CCAA políticamente afectadas (heurística)
  // entidades
  actors: string[]                  // figuras
  parties: string[]                 // partidos
  institutions: string[]            // instituciones (gobierno, congreso, jueces...)
  companies: string[]               // empresas mencionadas
  sectors: string[]                 // sectores económicos
  // evento
  main_topic: string                // ej. "vivienda"
  secondary_topics: string[]
  event_description: string         // 1 frase del evento
  action_verb: ActionVerb
  action_subject: string | null     // quién hace
  action_object: string | null      // a quién/qué
  // valoración
  sentiment: SentimentAssessment
  beneficiaries: string[]           // actores beneficiados (resumen rápido)
  affected: string[]                // actores perjudicados (resumen rápido)
  // relevancia
  political_risk: number            // 0..100
  spain_relevance: number           // 0..100
  electoral_relevance: number       // 0..100
  institutional_relevance: number   // 0..100
  // confianza
  confidence: MethodologyConfidence
  frame: FrameType
}

// ════════════════════════════════════════════════════════════════════════
// 3 · NarrativeCluster + RegionalMediaSignal
// ════════════════════════════════════════════════════════════════════════

export interface NarrativeCluster {
  id: string
  title: string
  short_summary: string
  frame_type: FrameType
  main_topic: string
  secondary_topics: string[]
  dominant_sector?: SectorKey | null   // sector dominante (taxonomía sector-taxonomy)
  sector_label?: string | null         // etiqueta legible del sector dominante
  articles: string[]                // ids de ArticleReading
  representative_titles: string[]
  first_seen: string                // ISO
  last_seen: string                 // ISO
  velocity_score: number            // articles/hour en ventana reciente
  velocity_confidence: number       // 0..1 · cae rápido cuando last24h < 4 (muestra insuficiente para tasa)
  acceleration_score: number        // delta vs ventana anterior
  acceleration_confidence: number   // 0..1 · cae cuando prev24h baja
  reach_estimate: number            // suma audience_M de medios involucrados
  source_diversity: SourceDiversityBreakdown
  ideological_spread: { left: number; center: number; right: number; balanced: boolean }
  territorial_spread: string[]      // CCAA / países tocados
  dominant_actors: string[]
  benefited_actors: string[]
  harmed_actors: string[]
  emotional_register: EmotionalRegister
  controversy_score: number
  confidence: MethodologyConfidence
  why_this_is_a_narrative: string   // explicación humana
  evidence: Array<{ title: string; medium: string; url: string; ideology: IdeologyBucket }>
  // Sprint G15 FASE D3 · campos nuevos para el workbench unificado
  key_messages?: string[]                                          // 2-3 frases tesis repetidas
  topic_tags?: string[]                                            // agregado de source_tags RSS
  channels?: Array<{ channel: string; weight: number; examples: string[] }>  // prensa/digital/TV/radio share
  target_audiences?: Array<{ label: string; reason: string; confidence: number }>
  supporting_news?: Array<{ title: string; medium: string; url: string; ideology: IdeologyBucket; published_at: string | null }>
  impact_summary?: { benefited: string[]; harmed: string[]; uncertain: string[] }
  trend?: {
    velocity_score: number
    velocity_confidence: number
    acceleration_score: number
    acceleration_confidence: number
    label: 'emergente' | 'estable' | 'acelerando' | 'en retroceso'
  }
}

export interface RegionalMediaSignal {
  ccaa: string
  signal_score: number              // 0..100 · volumen + negatividad + relevancia + diversidad
  components: {
    volume: number
    negativity: number
    institutional_relevance: number
    electoral_relevance: number
    source_diversity: number
  }
  n_articles_by_medium_ccaa: number     // CCAA del medio
  n_articles_by_mention: number         // CCAA mencionada en el texto
  n_articles_by_affected: number        // CCAA afectada políticamente
  top_narratives: string[]              // ids o títulos
  regional_actors: string[]
  accelerating_topics: string[]
  confidence: number                    // 0..1
  why: string                           // por qué aparece esta región
}

// ════════════════════════════════════════════════════════════════════════
// 4 · Helpers de buckets (los exportamos para uso UI)
// ════════════════════════════════════════════════════════════════════════

export function ideologyBucket(ideologia: number): IdeologyBucket {
  if (ideologia <= -40) return 'left'
  if (ideologia <= -15) return 'center-left'
  if (ideologia <= 15) return 'center'
  if (ideologia <= 40) return 'center-right'
  return 'right'
}

export function mediaTypeBucket(tipo: string): MediaTypeBucket {
  const t = (tipo || '').toLowerCase()
  if (t.includes('prensa')) return 'prensa'
  if (t.includes('digital')) return 'digital'
  if (t.includes('radio')) return 'radio'
  if (t.includes('tv') || t.includes('televisión') || t.includes('television')) return 'tv'
  if (t.includes('agencia')) return 'agencia'
  if (t.includes('verif') || t.includes('fact')) return 'verificador'
  return 'otro'
}

export function ambitoBucket(ambito: string, ccaa?: string | null): AmbitoBucket {
  const a = (ambito || '').toLowerCase()
  if (a.includes('europ')) return 'europeo'
  if (a.includes('internac')) return 'internacional'
  if (a.includes('sector') || a.includes('económico') || a.includes('economico')) return 'sectorial'
  if (a.includes('region') || a.includes('autonomic') || ccaa) return 'regional'
  if (a.includes('local')) return 'local'
  return 'nacional'
}

/**
 * Sprint G15 FASE A · Normaliza credibility a escala 0-100 sin importar si el
 * catálogo lo da en 0-1 (medios.json schema: credibilidad 0..1) o 0-100.
 *
 * BUG histórico: `media-methodology.ts` dividía `p.credibility / 100` en L367
 * y L1107, pero el catálogo entrega 0.85 (0-1). Resultado: credibility=0.0085,
 * el component aportaba ~0 al ranking. Solucionado normalizando a la entrada.
 */
export function normalizeCredibility(raw: number | null | undefined): number {
  if (typeof raw !== 'number' || isNaN(raw)) return 0
  if (raw <= 0) return 0
  // Si viene en 0-1, escalar a 0-100. Si ya viene en 0-100, dejar.
  if (raw <= 1) return raw * 100
  return Math.min(100, raw)
}

export function profileFromCatalog(m: CatalogMedio): MediaSourceProfile {
  return {
    id: m.id,
    name: m.nombre,
    group: m.grupo || 'Independiente',
    type: mediaTypeBucket(m.tipo),
    ambito: ambitoBucket(m.ambito, m.ccaa),
    ccaa: m.ccaa,
    ideology_raw: m.ideologia,
    ideology_bucket: ideologyBucket(m.ideologia),
    audience_M: m.audiencia_M,
    credibility: normalizeCredibility(m.credibilidad),  // siempre 0-100 desde aquí
    rss_url: m.rss,
    web: m.web,
    has_rss: !!m.rss,
    // Sprint G15 FASE F · scope_level + provincia/municipio del overlay
    scope_level: (m as any).scope_level ?? null,
    provincia: (m as any).provincia ?? null,
    municipio: (m as any).municipio ?? null,
  }
}

// ════════════════════════════════════════════════════════════════════════
// 5 · Priorización inteligente de fuentes
// ════════════════════════════════════════════════════════════════════════

const DEFAULT_TARGETS: Record<BalanceMode, Partial<Record<AmbitoBucket, number>>> = {
  audience:    { nacional: 0.80, regional: 0.10, europeo: 0.05, sectorial: 0.05 },
  pluralism:   { nacional: 0.45, regional: 0.25, sectorial: 0.15, europeo: 0.10, internacional: 0.05 },
  regional:    { regional: 0.55, nacional: 0.30, sectorial: 0.10, europeo: 0.05 },
  ideological: { nacional: 0.60, regional: 0.20, sectorial: 0.10, europeo: 0.10 },
  crisis:      { nacional: 0.50, internacional: 0.15, europeo: 0.10, sectorial: 0.15, regional: 0.10 },
}

const MIN_IDEOLOGY_QUOTA: Record<BalanceMode, Partial<Record<IdeologyBucket, number>>> = {
  audience:    {},
  pluralism:   { left: 0.10, 'center-left': 0.15, center: 0.15, 'center-right': 0.15, right: 0.10 },
  regional:    { left: 0.05, 'center-left': 0.10, center: 0.20, 'center-right': 0.10, right: 0.05 },
  ideological: { left: 0.15, 'center-left': 0.20, center: 0.20, 'center-right': 0.20, right: 0.15 },
  crisis:      { 'center-left': 0.20, center: 0.30, 'center-right': 0.20 },
}

/**
 * Selección priorizada con balance multidimensional.
 * No es simplemente "top-N por audiencia". Garantiza diversidad mínima
 * según balance_mode y respeta cuotas por bucket ideológico y ámbito.
 */
export function selectPrioritySources(
  catalog: CatalogMedio[],
  options: SelectPrioritySourcesOptions = {},
): { selected: MediaSourceProfile[]; scores: SourcePriorityScore[]; eligible: number } {
  const {
    maxSources = 100,
    balanceMode = 'pluralism',
    ccaa = null,
    ideologyTarget = null,
    includeEuropean = true,
    includeRegional = true,
    minLocalShare = balanceMode === 'regional' ? 0.20 : 0,
  } = options

  // Filtrar candidatos
  let candidates = catalog
    .filter((m) => !!m.rss)
    .map(profileFromCatalog)

  if (!includeEuropean) candidates = candidates.filter((p) => p.ambito !== 'europeo' && p.ambito !== 'internacional')
  if (!includeRegional) candidates = candidates.filter((p) => p.ambito !== 'regional')

  const eligible = candidates.length

  // Cuotas objetivo
  const ambitoTargets = DEFAULT_TARGETS[balanceMode]
  const ideologyQuotas = MIN_IDEOLOGY_QUOTA[balanceMode]
  const capPerAmbito: Partial<Record<AmbitoBucket, number>> = {}
  for (const [amb, share] of Object.entries(ambitoTargets)) {
    capPerAmbito[amb as AmbitoBucket] = Math.max(2, Math.round((share as number) * maxSources))
  }
  const minPerIdeology: Partial<Record<IdeologyBucket, number>> = {}
  for (const [idb, share] of Object.entries(ideologyQuotas)) {
    minPerIdeology[idb as IdeologyBucket] = Math.max(1, Math.round((share as number) * maxSources))
  }

  // Scoring inicial sin grupo-penalty (se aplica iterativamente)
  const groupCount: Record<string, number> = {}
  const scoreOne = (p: MediaSourceProfile): SourcePriorityScore => {
    const audience = Math.min(1, p.audience_M / 25)        // 25M = top tier
    // Sprint G15 FASE A · `p.credibility` ya viene normalizada a 0-100 desde
    // `profileFromCatalog` (G15 normalizeCredibility helper). Antes este `/100`
    // sobre 0.85 daba 0.0085 → credibility component aportaba ~0 al ranking.
    const credibility = Math.min(1, p.credibility / 100)
    const rss_health = p.has_rss ? 1 : 0
    const spain_relevance = p.ambito === 'nacional' ? 1 : p.ambito === 'regional' ? 0.85 : p.ambito === 'europeo' ? 0.7 : p.ambito === 'sectorial' ? 0.75 : 0.5
    // Ideological balance bonus: si pertenece a un bucket sub-representado
    const ideological_balance = ideologyTarget ? (p.ideology_bucket === ideologyTarget ? 1 : 0.4) : 0.6
    // Territorial balance: si pidieron ccaa específica, premiar
    const territorial_balance = ccaa ? (p.ccaa === ccaa ? 1 : p.ambito === 'nacional' ? 0.6 : 0.3) : 0.6
    // Type balance: leve premio a tipos sub-representados (radio/tv)
    const type_balance = (p.type === 'radio' || p.type === 'tv' || p.type === 'verificador') ? 0.8 : 0.6
    // Group concentration penalty se calcula a posteriori
    const group_concentration_penalty = 0
    const weights = balanceMode === 'audience'
      ? { audience: 0.55, credibility: 0.20, rss_health: 0.10, spain_relevance: 0.10, ideo: 0.025, terr: 0.025, type: 0.0 }
      : balanceMode === 'crisis'
      ? { audience: 0.20, credibility: 0.35, rss_health: 0.20, spain_relevance: 0.15, ideo: 0.05, terr: 0.025, type: 0.025 }
      : balanceMode === 'regional'
      ? { audience: 0.20, credibility: 0.15, rss_health: 0.15, spain_relevance: 0.10, ideo: 0.10, terr: 0.25, type: 0.05 }
      : balanceMode === 'ideological'
      ? { audience: 0.20, credibility: 0.15, rss_health: 0.10, spain_relevance: 0.10, ideo: 0.30, terr: 0.10, type: 0.05 }
      // pluralism (default)
      : { audience: 0.25, credibility: 0.20, rss_health: 0.10, spain_relevance: 0.15, ideo: 0.15, terr: 0.10, type: 0.05 }

    const total_score =
      weights.audience * audience +
      weights.credibility * credibility +
      weights.rss_health * rss_health +
      weights.spain_relevance * spain_relevance +
      weights.ideo * ideological_balance +
      weights.terr * territorial_balance +
      weights.type * type_balance

    return {
      source_id: p.id,
      total_score,
      components: { audience, credibility, ideological_balance, territorial_balance, type_balance, rss_health, spain_relevance, group_concentration_penalty },
      reason: `mode=${balanceMode} · audience=${audience.toFixed(2)} cred=${credibility.toFixed(2)} ideo=${ideological_balance.toFixed(2)} terr=${territorial_balance.toFixed(2)}`,
    }
  }

  // Ordenar por score
  const scored = candidates.map(scoreOne)
  scored.sort((a, b) => b.total_score - a.total_score)

  // Selección con cuotas: pasada 1 = greedy respetando caps por ámbito + group cap 18%
  const pickedById = new Set<string>()
  const ambitoCount: Partial<Record<AmbitoBucket, number>> = {}
  const ideoCount: Partial<Record<IdeologyBucket, number>> = {}
  const maxGroupShare = balanceMode === 'audience' ? 0.30 : 0.18
  const maxPerGroup = Math.max(3, Math.round(maxSources * maxGroupShare))

  const byId: Record<string, MediaSourceProfile> = {}
  for (const c of candidates) byId[c.id] = c

  for (const s of scored) {
    if (pickedById.size >= maxSources) break
    const p = byId[s.source_id]
    const cap = capPerAmbito[p.ambito] ?? Math.round(maxSources * 0.5)
    if ((ambitoCount[p.ambito] || 0) >= cap) continue
    if ((groupCount[p.group] || 0) >= maxPerGroup) continue
    pickedById.add(s.source_id)
    ambitoCount[p.ambito] = (ambitoCount[p.ambito] || 0) + 1
    ideoCount[p.ideology_bucket] = (ideoCount[p.ideology_bucket] || 0) + 1
    groupCount[p.group] = (groupCount[p.group] || 0) + 1
  }

  // Pasada 2 · rellenar mínimos ideológicos pendientes
  for (const [idb, minN] of Object.entries(minPerIdeology)) {
    if (pickedById.size >= maxSources) break
    const have = ideoCount[idb as IdeologyBucket] || 0
    if (have >= (minN as number)) continue
    const needed = (minN as number) - have
    const remaining = scored.filter((s) => !pickedById.has(s.source_id) && byId[s.source_id].ideology_bucket === idb)
    for (let i = 0; i < Math.min(needed, remaining.length); i++) {
      if (pickedById.size >= maxSources) break
      pickedById.add(remaining[i].source_id)
      const p = byId[remaining[i].source_id]
      ambitoCount[p.ambito] = (ambitoCount[p.ambito] || 0) + 1
      ideoCount[p.ideology_bucket] = (ideoCount[p.ideology_bucket] || 0) + 1
      groupCount[p.group] = (groupCount[p.group] || 0) + 1
    }
  }

  // Pasada 3 · Sprint G15 FASE F · cuota mínima de scope_level local/provincial
  // El propósito: que la tab Mapas y los enrichments por CCAA vean realmente
  // medios locales, no sólo prensa nacional con CCAA mencionada.
  if (minLocalShare > 0) {
    const isLocal = (p: MediaSourceProfile) =>
      p.scope_level === 'provincial' || p.scope_level === 'local'
    const localCount = Array.from(pickedById).filter((id) => isLocal(byId[id])).length
    const minLocal = Math.max(2, Math.round(maxSources * minLocalShare))
    if (localCount < minLocal) {
      const needed = minLocal - localCount
      const localCandidates = scored.filter(
        (s) => !pickedById.has(s.source_id) && isLocal(byId[s.source_id]),
      )
      // Limita por cap de grupo (mantiene la regla anti-concentración)
      for (let i = 0, added = 0; i < localCandidates.length && added < needed; i++) {
        if (pickedById.size >= maxSources) break
        const p = byId[localCandidates[i].source_id]
        if ((groupCount[p.group] || 0) >= maxPerGroup) continue
        pickedById.add(localCandidates[i].source_id)
        ambitoCount[p.ambito] = (ambitoCount[p.ambito] || 0) + 1
        ideoCount[p.ideology_bucket] = (ideoCount[p.ideology_bucket] || 0) + 1
        groupCount[p.group] = (groupCount[p.group] || 0) + 1
        added++
      }
    }
  }

  const selected = Array.from(pickedById).map((id) => byId[id])
  // Aplicar group_concentration_penalty informativo en scores
  const finalScores = scored.map((s) => {
    const p = byId[s.source_id]
    const groupShare = (groupCount[p.group] || 0) / Math.max(1, selected.length)
    return {
      ...s,
      components: { ...s.components, group_concentration_penalty: Math.max(0, groupShare - maxGroupShare) },
    }
  })

  return { selected, scores: finalScores, eligible }
}

// ════════════════════════════════════════════════════════════════════════
// 6 · Diversity breakdown
// ════════════════════════════════════════════════════════════════════════

export function buildDiversityBreakdown(profiles: MediaSourceProfile[]): SourceDiversityBreakdown {
  const total = Math.max(1, profiles.length)
  const ideo: Record<IdeologyBucket, number> = { left: 0, 'center-left': 0, center: 0, 'center-right': 0, right: 0 }
  const terr: Record<AmbitoBucket, number> = { nacional: 0, regional: 0, local: 0, europeo: 0, internacional: 0, sectorial: 0 }
  const type: Record<MediaTypeBucket, number> = { prensa: 0, digital: 0, radio: 0, tv: 0, agencia: 0, verificador: 0, otro: 0 }
  const groupCount: Record<string, number> = {}
  const ccaaCount: Record<string, number> = {}

  for (const p of profiles) {
    ideo[p.ideology_bucket]++
    terr[p.ambito]++
    type[p.type]++
    groupCount[p.group] = (groupCount[p.group] || 0) + 1
    if (p.ccaa) ccaaCount[p.ccaa] = (ccaaCount[p.ccaa] || 0) + 1
  }

  const ideologicalEntropy = shannonEntropy(Object.values(ideo)) / Math.log2(5)         // normalizar 0..1
  const territorialEntropy = shannonEntropy(Object.values(terr).filter((v) => v > 0))
  const typeEntropy = shannonEntropy(Object.values(type).filter((v) => v > 0))

  const groupDist = Object.entries(groupCount)
    .map(([group, count]) => ({ group, count, share: count / total }))
    .sort((a, b) => b.count - a.count)

  const ccaaDist = Object.entries(ccaaCount)
    .map(([ccaa, count]) => ({ ccaa, count }))
    .sort((a, b) => b.count - a.count)

  const warnings: string[] = []
  const dominantGroup = groupDist[0]
  if (dominantGroup && dominantGroup.share > 0.25) {
    warnings.push(`Grupo dominante "${dominantGroup.group}" concentra ${(dominantGroup.share * 100).toFixed(0)}% de la muestra · riesgo de sesgo editorial.`)
  }
  const ideoVals = Object.values(ideo)
  const ideoMax = Math.max(...ideoVals)
  if (ideoMax / total > 0.5) {
    const dom = (Object.entries(ideo).find(([, v]) => v === ideoMax)?.[0]) || 'desconocido'
    warnings.push(`Sesgo ideológico · bucket "${dom}" representa ${((ideoMax / total) * 100).toFixed(0)}% de la muestra.`)
  }
  if (ideo.left === 0 || ideo.right === 0) {
    warnings.push('Sin cobertura mínima en algún extremo ideológico · narrativas podrían faltar.')
  }
  if (terr.regional === 0) {
    warnings.push('Sin medios regionales en la muestra · perspectiva territorial limitada.')
  }

  return {
    ideological_distribution: ideo,
    territorial_distribution: terr,
    media_type_distribution: type,
    group_distribution: groupDist.slice(0, 15),
    ccaa_distribution: ccaaDist.slice(0, 19),
    ideological_balance_score: Math.max(0, Math.min(1, ideologicalEntropy)),
    territorial_balance_score: Math.max(0, Math.min(1, territorialEntropy / Math.log2(6))),
    type_balance_score: Math.max(0, Math.min(1, typeEntropy / Math.log2(7))),
    warnings,
  }
}

function shannonEntropy(counts: number[]): number {
  const total = counts.reduce((s, c) => s + c, 0)
  if (total === 0) return 0
  let h = 0
  for (const c of counts) {
    if (c === 0) continue
    const p = c / total
    h -= p * Math.log2(p)
  }
  return h
}

// ════════════════════════════════════════════════════════════════════════
// 7 · readArticle · lectura estructurada determinista (sin LLM)
// ════════════════════════════════════════════════════════════════════════

// Mini-diccionarios reutilizables (en runtime · sólo server-side)
const PARTIDOS_DICT: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: 'PSOE',    aliases: ['psoe', 'socialistas', 'partido socialista'] },
  { canonical: 'PP',      aliases: ['partido popular', 'populares', /\bpp\b/i.source] },
  { canonical: 'Vox',     aliases: ['vox'] },
  { canonical: 'Sumar',   aliases: ['sumar'] },
  { canonical: 'Podemos', aliases: ['podemos'] },
  { canonical: 'ERC',     aliases: ['erc', 'esquerra'] },
  { canonical: 'Junts',   aliases: ['junts'] },
  { canonical: 'PNV',     aliases: ['pnv'] },
  { canonical: 'EH Bildu', aliases: ['bildu', 'eh bildu'] },
  { canonical: 'BNG',     aliases: ['bng'] },
  { canonical: 'Cs',      aliases: ['ciudadanos', /\bcs\b/i.source] },
]

/**
 * Sprint M5 FASE 4 · Catálogo de figuras políticas con desambiguación.
 *
 * Cada figura declara:
 *   - canonical: nombre canónico que aparecerá en la salida (siempre el mismo)
 *   - full: forma completa (cuando aparece, match unívoco)
 *   - lastname: apellido(s) que pueden aparecer solos en titulares (apellidos
 *     compuestos como "Núñez Feijóo" cuentan como uno)
 *   - context: términos que, si aparecen cerca, confirman que el lastname
 *     ambiguo se refiere a esta figura concreta (partido, cargo, territorio)
 *   - ambiguous_lastname: true si el apellido es homónimo de otra figura en
 *     este catálogo (Sánchez, Montero, Moreno, Díaz, Rueda...) → requiere
 *     context para ser atribuido; sin context se devuelve "Apellido (ambiguo)"
 *
 * Esto evita el bug que mezclaba "María Jesús Montero (PSOE Hacienda)" con
 * "Irene Montero (Podemos)" simplemente por compartir apellido en titulares.
 */
interface FiguraPolitica {
  canonical: string
  full: string
  lastname: string
  context: string[]
  ambiguous_lastname?: boolean
}

const FIGURAS_DICT_V2: FiguraPolitica[] = [
  // Presidente y líderes nacionales · Sánchez es ambiguo (Joan Sánchez Llibre CEOE, etc.)
  // Cross-context · cuando aparecen Feijóo/Abascal/Yolanda Díaz en el texto, el
  // "Sánchez" suelto casi siempre se refiere al presidente. Idem en sentido
  // inverso para Feijóo cuando aparece Sánchez/Moncloa.
  { canonical: 'Pedro Sánchez',           full: 'Pedro Sánchez',           lastname: 'Sánchez', context: ['psoe', 'presidente', 'moncloa', 'gobierno', 'sumar', 'pedro', 'feijóo', 'feijoo', 'abascal', 'yolanda díaz', 'yolanda diaz', 'junts', 'erc'], ambiguous_lastname: true },
  { canonical: 'Alberto Núñez Feijóo',    full: 'Alberto Núñez Feijóo',    lastname: 'Feijóo',  context: ['pp', 'popular', 'oposición', 'genova', 'alberto', 'sánchez', 'sanchez', 'moncloa'] },
  { canonical: 'Santiago Abascal',        full: 'Santiago Abascal',        lastname: 'Abascal', context: ['vox', 'ultraderecha'] },
  { canonical: 'Yolanda Díaz',            full: 'Yolanda Díaz',            lastname: 'Díaz',    context: ['sumar', 'trabajo', 'vicepresidenta', 'vicepresidencia', 'yolanda', 'smi', 'salario mínimo'], ambiguous_lastname: true },
  { canonical: 'Ione Belarra',            full: 'Ione Belarra',            lastname: 'Belarra', context: ['podemos', 'ione'] },
  // Presidentes autonómicos · Moreno y Mazón son ambiguos (varios "Moreno")
  { canonical: 'Isabel Díaz Ayuso',       full: 'Isabel Díaz Ayuso',       lastname: 'Ayuso',   context: ['madrid', 'pp', 'isabel'] },
  { canonical: 'Salvador Illa',           full: 'Salvador Illa',           lastname: 'Illa',    context: ['psc', 'catalunya', 'cataluña', 'salvador'] },
  { canonical: 'Carlos Mazón',            full: 'Carlos Mazón',            lastname: 'Mazón',   context: ['valencia', 'comunidad valenciana', 'pp', 'carlos', 'dana'] },
  { canonical: 'Juanma Moreno',           full: 'Juanma Moreno',           lastname: 'Moreno',  context: ['andalucía', 'andalucia', 'pp', 'sevilla', 'juanma'], ambiguous_lastname: true },
  { canonical: 'Alfonso Rueda',           full: 'Alfonso Rueda',           lastname: 'Rueda',   context: ['galicia', 'pp', 'alfonso'] },
  { canonical: 'Alfonso Fernández Mañueco', full: 'Alfonso Fernández Mañueco', lastname: 'Mañueco', context: ['castilla', 'león', 'leon', 'pp'] },
  { canonical: 'Pere Aragonès',           full: 'Pere Aragonès',           lastname: 'Aragonès', context: ['cataluña', 'erc', 'generalitat'] },
  { canonical: 'Carles Puigdemont',       full: 'Carles Puigdemont',       lastname: 'Puigdemont', context: ['junts', 'cataluña', 'expresidente', 'bruselas'] },
  { canonical: 'Imanol Pradales',         full: 'Imanol Pradales',         lastname: 'Pradales', context: ['pnv', 'lehendakari', 'euskadi', 'pais vasco'] },
  // Ministros · Montero ambiguo (María Jesús PSOE vs Irene Podemos)
  { canonical: 'María Jesús Montero',     full: 'María Jesús Montero',     lastname: 'Montero', context: ['psoe', 'hacienda', 'vicepresidenta', 'maría jesús', 'maria jesus', 'ministra de hacienda'], ambiguous_lastname: true },
  { canonical: 'Irene Montero',           full: 'Irene Montero',           lastname: 'Montero', context: ['podemos', 'irene', 'igualdad', 'exministra'], ambiguous_lastname: true },
  { canonical: 'Margarita Robles',        full: 'Margarita Robles',        lastname: 'Robles',  context: ['defensa', 'ministra', 'margarita'] },
  { canonical: 'José Luis Escrivá',       full: 'José Luis Escrivá',       lastname: 'Escrivá', context: ['transformación digital', 'función pública', 'bde', 'banco de españa', 'gobernador'] },
  { canonical: 'Nadia Calviño',           full: 'Nadia Calviño',           lastname: 'Calviño', context: ['bei', 'vicepresidenta', 'economía', 'nadia'] },
  { canonical: 'Óscar Puente',            full: 'Óscar Puente',            lastname: 'Puente',  context: ['transportes', 'ministro', 'óscar', 'oscar'] },
  { canonical: 'Alejandro Soler',         full: 'Alejandro Soler',         lastname: 'Soler',   context: ['psoe', 'portavoz', 'alejandro'] },
]

// Lastname → list of figuras con ese apellido · usado para resolver ambigüedades
const LASTNAME_INDEX: Map<string, FiguraPolitica[]> = (() => {
  const m = new Map<string, FiguraPolitica[]>()
  for (const f of FIGURAS_DICT_V2) {
    const k = f.lastname.toLowerCase()
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(f)
  }
  return m
})()

const INSTITUCIONES_DICT: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: 'Gobierno',        aliases: ['gobierno', 'ejecutivo', 'moncloa'] },
  { canonical: 'Congreso',        aliases: ['congreso', 'diputados'] },
  { canonical: 'Senado',          aliases: ['senado'] },
  { canonical: 'Tribunal Supremo', aliases: ['tribunal supremo', 'supremo', 'ts'] },
  { canonical: 'Tribunal Constitucional', aliases: ['constitucional', 'tc'] },
  { canonical: 'CGPJ',            aliases: ['cgpj', 'consejo general'] },
  { canonical: 'Fiscalía',        aliases: ['fiscalía', 'fiscalia', 'fiscal general'] },
  { canonical: 'Banco de España', aliases: ['banco de españa', 'bde'] },
  { canonical: 'CNMC',            aliases: ['cnmc'] },
  { canonical: 'CNMV',            aliases: ['cnmv'] },
  { canonical: 'AEAT',            aliases: ['agencia tributaria', 'aeat'] },
  { canonical: 'CIS',             aliases: ['cis'] },
  { canonical: 'Comisión Europea', aliases: ['comisión europea', 'comision europea', 'bruselas'] },
  { canonical: 'BCE',             aliases: ['bce', 'banco central europeo'] },
  { canonical: 'OTAN',            aliases: ['otan', 'nato'] },
  { canonical: 'ONU',             aliases: ['onu', 'naciones unidas'] },
]

const IBEX35_DICT: string[] = [
  'Telefónica', 'Iberdrola', 'Repsol', 'Santander', 'BBVA', 'CaixaBank', 'Bankinter',
  'Mapfre', 'Inditex', 'Naturgy', 'Endesa', 'ACS', 'Ferrovial', 'Acciona', 'Aena',
  'Indra', 'Cellnex', 'Amadeus', 'Grifols', 'Sacyr', 'Logista', 'Solaria', 'Rovi',
]

const SECTORES_KW: Record<string, string[]> = {
  energía: ['energía', 'energia', 'eléctrica', 'electrica', 'petróleo', 'petroleo', 'gas', 'renovable', 'solar', 'eólic'],
  banca: ['banco', 'banca', 'hipoteca', 'crédito', 'credito', 'tipos de interés'],
  vivienda: ['vivienda', 'alquiler', 'hipoteca', 'inmobiliari'],
  sanidad: ['sanidad', 'hospital', 'medicamento', 'farmac'],
  educación: ['educación', 'educacion', 'universidad', 'escuela', 'colegio'],
  defensa: ['defensa', 'militar', 'ejército', 'ejercito', 'armamento'],
  agricultura: ['agricultura', 'ganadería', 'ganaderia', 'pesca', 'agrari'],
  transporte: ['transporte', 'tren', 'aena', 'aeropuerto', 'autopista'],
  telecomunicaciones: ['telecomunicaciones', '5g', 'fibra', 'movistar'],
  turismo: ['turismo', 'turista', 'hotel'],
}

const FRAME_KW: Record<FrameType, string[]> = {
  crisis: ['crisis', 'colapso', 'desplome', 'derrumbe', 'estallido', 'emergencia'],
  corrupción: ['corrupción', 'corrupcion', 'sobornos', 'mordida', 'comisiones', 'enchufe', 'caso', 'mascarillas', 'koldo', 'puigdemont'],
  amenaza: ['amenaza', 'riesgo', 'peligro', 'advertencia', 'alerta'],
  oportunidad: ['oportunidad', 'récord', 'record', 'avance', 'fortalece', 'crece', 'positivo'],
  gestión: ['gestión', 'gestion', 'aprueba', 'plan', 'reforma', 'medida', 'política', 'politica'],
  identidad: ['identidad', 'lengua', 'nacionalismo', 'independentismo', 'cataluña', 'pais vasco', 'cultura'],
  seguridad: ['seguridad', 'policía', 'guardia civil', 'detenido', 'asalto', 'atentado', 'terror'],
  economía: ['economía', 'economia', 'pib', 'inflación', 'inflacion', 'empleo', 'paro', 'mercado'],
  territorial: ['ccaa', 'autonómica', 'autonomica', 'andalucía', 'cataluña', 'comunidad valenciana', 'galicia'],
  institucional: ['institucional', 'congreso', 'parlamento', 'cgpj', 'supremo', 'constitucional'],
  electoral: ['elecciones', 'campaña', 'candidatura', 'voto', 'encuesta', 'sondeo'],
  internacional: ['internacional', 'ue', 'unión europea', 'union europea', 'otan', 'guerra', 'ucrania', 'israel'],
  social: ['social', 'manifestación', 'huelga', 'protesta', 'movilización', 'movilizacion'],
  judicial: ['judicial', 'juez', 'fiscal', 'sentencia', 'condena', 'investigación'],
  desinformación: ['bulo', 'desinformación', 'desinformacion', 'fake news', 'manipulación', 'manipulacion'],
  otro: [],
}

const ACTION_VERB_RX: Array<{ verb: ActionVerb; rx: RegExp }> = [
  { verb: 'acusa',     rx: /\b(acusa|denuncia)\b/i },
  { verb: 'denuncia',  rx: /\b(denuncia|condena)\b/i },
  { verb: 'aprueba',   rx: /\b(aprueba|aprobado|aprobada|ratifica)\b/i },
  { verb: 'rechaza',   rx: /\b(rechaza|veta|tumba)\b/i },
  { verb: 'bloquea',   rx: /\b(bloquea|paraliza|frena)\b/i },
  { verb: 'propone',   rx: /\b(propone|plantea|ofrece)\b/i },
  { verb: 'firma',     rx: /\b(firma|rubrica)\b/i },
  { verb: 'pacta',     rx: /\b(pacta|acuerda|alcanza un acuerdo)\b/i },
  { verb: 'rompe',     rx: /\b(rompe|fractura)\b/i },
  { verb: 'dimite',    rx: /\b(dimite|dimisión|dimision|renuncia|cese)\b/i },
  { verb: 'imputa',    rx: /\b(imputa|imputan|imputado|imputada|imputados|imputadas)\b/i },
  { verb: 'absuelve',  rx: /\b(absuelve|absolución|absolucion)\b/i },
  { verb: 'investiga', rx: /\b(investiga|investigación|investigacion)\b/i },
  { verb: 'sentencia', rx: /\b(sentencia|condena|fallo)\b/i },
  { verb: 'moviliza',  rx: /\b(moviliz|manifest|protesta|huelga)\b/i },
  { verb: 'negocia',   rx: /\b(negocia|negociaci)\b/i },
  { verb: 'reúne',     rx: /\b(reúne|reune|reunión|reunion)\b/i },
  { verb: 'visita',    rx: /\b(visita|recibe en)\b/i },
  { verb: 'anuncia',   rx: /\b(anuncia|presenta)\b/i },
  { verb: 'amenaza',   rx: /\b(amenaza|advierte)\b/i },
  { verb: 'reclama',   rx: /\b(reclama|exige|pide)\b/i },
  { verb: 'apoya',     rx: /\b(apoya|respalda)\b/i },
  { verb: 'critica',   rx: /\b(critica|carga contra|ataca)\b/i },
]

const CCAA_KW: Record<string, string[]> = {
  Andalucía: ['andalucía', 'andalucia', 'sevilla', 'málaga', 'granada', 'cádiz', 'córdoba'],
  Cataluña: ['cataluña', 'catalunya', 'barcelona', 'tarragona', 'girona', 'lleida'],
  Madrid: ['comunidad de madrid', 'madrid capital', /\bmadrid\b/i.source],
  'Comunidad Valenciana': ['valencia', 'comunidad valenciana', 'alicante', 'castellón'],
  Galicia: ['galicia', 'a coruña', 'vigo', 'santiago'],
  'País Vasco': ['país vasco', 'pais vasco', 'euskadi', 'bilbao', 'donostia', 'san sebastián'],
  Castilla: ['castilla y león', 'castilla la mancha', 'valladolid', 'salamanca', 'toledo'],
  Aragón: ['aragón', 'zaragoza', 'huesca'],
  Asturias: ['asturias', 'oviedo', 'gijón'],
  Cantabria: ['cantabria', 'santander'],
  Navarra: ['navarra', 'pamplona'],
  'La Rioja': ['la rioja', 'logroño'],
  Murcia: ['murcia', 'cartagena'],
  Extremadura: ['extremadura', 'badajoz', 'cáceres'],
  Baleares: ['baleares', 'mallorca', 'menorca', 'ibiza'],
  Canarias: ['canarias', 'las palmas', 'tenerife'],
  Ceuta: ['ceuta'],
  Melilla: ['melilla'],
}

function matchAlias(text: string, aliases: string[]): boolean {
  const lower = text.toLowerCase()
  for (const a of aliases) {
    if (a.startsWith('\\b')) {
      try { if (new RegExp(a, 'i').test(text)) return true } catch { /* noop */ }
    } else if (lower.includes(a.toLowerCase())) {
      return true
    }
  }
  return false
}

/**
 * Sprint M5 FASE 4 · Detección con desambiguación de homónimos.
 *
 * Algoritmo:
 *   1. Si el texto contiene la `full` form → atribuye sin ambigüedad.
 *   2. Si sólo aparece el `lastname` y NO es ambiguo → atribuye al único
 *      titular de ese apellido.
 *   3. Si aparece el `lastname` y SÍ es ambiguo → busca términos `context`
 *      en el texto; el primer figura cuya lista de context terms tenga al
 *      menos un hit (o el match más fuerte) gana. Sin context → se devuelve
 *      `"{Apellido} (ambiguo)"` para que el analista sepa que hay
 *      indeterminación y la lectura humana debe resolver.
 *
 * Esto cambia la salida en caso de homonimia: antes "Montero" se atribuía
 * al primer match del catálogo silenciosamente; ahora obtiene
 * "Montero (ambiguo)" si falta context o "María Jesús Montero" / "Irene
 * Montero" si el context lo resuelve.
 */
export function detectActorsList(text: string): string[] {
  const found = new Set<string>()
  const lowText = text.toLowerCase()

  // Paso 1 · full-name matches (sin ambigüedad)
  const fullMatched = new Set<string>()
  for (const f of FIGURAS_DICT_V2) {
    if (text.includes(f.full)) {
      found.add(f.canonical)
      fullMatched.add(f.lastname.toLowerCase())
    }
  }

  // Paso 2 · lastname-only matches
  const entries = Array.from(LASTNAME_INDEX.entries())
  for (const [lastnameKey, candidates] of entries) {
    if (fullMatched.has(lastnameKey)) continue // ya cubierto por full
    // Buscar apellido como palabra completa (evita "Sánchez" dentro de
    // "Sánchez-Camacho" como falso positivo trivial — aún así word-boundary
    // ES razonable, no perfecto)
    const lastnameRx = new RegExp(`\\b${candidates[0].lastname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (!lastnameRx.test(text)) continue

    if (candidates.length === 1 && !candidates[0].ambiguous_lastname) {
      // Único titular y no marcado como ambiguo → atribuye
      found.add(candidates[0].canonical)
      continue
    }

    // Hay ≥1 candidato ambiguo · resolver con context
    let best: { figura: FiguraPolitica; score: number } | null = null
    for (const cand of candidates) {
      let score = 0
      for (const ctx of cand.context) {
        if (lowText.includes(ctx.toLowerCase())) score++
      }
      if (!best || score > best.score) best = { figura: cand, score }
    }
    if (best && best.score > 0) {
      found.add(best.figura.canonical)
    } else {
      // Ambigüedad no resuelta · marcador explícito para que la UI lo refleje
      const labels = candidates.map((c) => c.canonical.split(' ').slice(-2).join(' '))
      found.add(`${candidates[0].lastname} (ambiguo · posiblemente ${labels.slice(0, 2).join(' o ')})`)
    }
  }

  return Array.from(found)
}

function detectPartiesList(text: string): string[] {
  const out = new Set<string>()
  for (const p of PARTIDOS_DICT) if (matchAlias(text, p.aliases)) out.add(p.canonical)
  return Array.from(out)
}

function detectInstitutionsList(text: string): string[] {
  const out = new Set<string>()
  for (const i of INSTITUCIONES_DICT) if (matchAlias(text, i.aliases)) out.add(i.canonical)
  return Array.from(out)
}

function detectCompaniesList(text: string): string[] {
  const out = new Set<string>()
  for (const c of IBEX35_DICT) if (text.includes(c)) out.add(c)
  return Array.from(out)
}

function detectSectorsList(text: string): string[] {
  const lower = text.toLowerCase()
  const out = new Set<string>()
  for (const [sec, kws] of Object.entries(SECTORES_KW)) {
    for (const k of kws) if (lower.includes(k)) { out.add(sec); break }
  }
  return Array.from(out)
}

function detectFrame(text: string): FrameType {
  const lower = text.toLowerCase()
  let bestFrame: FrameType = 'otro'
  let bestScore = 0
  for (const [frame, kws] of Object.entries(FRAME_KW) as Array<[FrameType, string[]]>) {
    let score = 0
    for (const k of kws) if (lower.includes(k)) score++
    if (score > bestScore) { bestScore = score; bestFrame = frame }
  }
  return bestFrame
}

function detectActionVerb(text: string): ActionVerb {
  for (const { verb, rx } of ACTION_VERB_RX) if (rx.test(text)) return verb
  return 'otro'
}

function detectCCAAList(text: string): string[] {
  const lower = text.toLowerCase()
  const out = new Set<string>()
  for (const [ccaa, kws] of Object.entries(CCAA_KW)) {
    for (const k of kws) {
      if (k.startsWith('\\b')) {
        try { if (new RegExp(k, 'i').test(text)) { out.add(ccaa); break } } catch { /* noop */ }
      } else if (lower.includes(k)) { out.add(ccaa); break }
    }
  }
  return Array.from(out)
}

function detectMainTopic(text: string, sectors: string[], frame: FrameType): string {
  if (sectors.length > 0) return sectors[0]
  if (frame !== 'otro') return frame
  // fallback · primer sustantivo significativo
  return 'general'
}

function emotionalRegisterFromFrame(frame: FrameType, controversy: number): EmotionalRegister {
  if (frame === 'corrupción' || frame === 'judicial') return 'escándalo'
  if (frame === 'crisis' || frame === 'amenaza') return 'alarma'
  if (frame === 'electoral') return 'polarización'
  if (frame === 'institucional') return 'institucional'
  if (frame === 'economía') return 'económico'
  if (frame === 'social' && controversy > 50) return 'movilización'
  if (frame === 'oportunidad') return 'esperanza'
  if (controversy > 70) return 'indignación'
  if (controversy > 40) return 'conflicto'
  return 'tecnocrático'
}

function hashId(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return `a${Math.abs(h).toString(36)}`
}

// Sentimiento heurístico re-exportable · usa los dicts del aggregator pero
// devuelve confianza explícita y razones.
const POS_KW = ['acuerdo', 'récord', 'record', 'éxito', 'exito', 'avance', 'crece', 'firma', 'fortalece', 'mejora', 'aprueba', 'apoyo', 'pacta', 'consigue']
const NEG_KW = ['crisis', 'cae', 'caída', 'caida', 'dimite', 'imputa', 'condena', 'rechaza', 'bloquea', 'denuncia', 'corrupción', 'corrupcion', 'amenaza', 'protesta', 'huelga', 'fracaso', 'derrota', 'escándalo', 'escandalo', 'tensión', 'tension']

function basicTone(text: string): { score: number; pos: number; neg: number } {
  const lower = text.toLowerCase()
  let pos = 0, neg = 0
  for (const k of POS_KW) if (lower.includes(k)) pos++
  for (const k of NEG_KW) if (lower.includes(k)) neg++
  if (pos === 0 && neg === 0) return { score: 0, pos: 0, neg: 0 }
  return { score: (pos - neg) / (pos + neg), pos, neg }
}

/**
 * assessSentiment · separa tono del evento, del titular y hacia cada actor.
 * Modela el ejemplo del usuario: "Vox denuncia corrupción del PSOE"
 *   → evento negativo, Vox sujeto acusador (neutral-positivo), PSOE perjudicado.
 */
export function assessSentiment(reading: Pick<ArticleReading, 'headline' | 'summary' | 'actors' | 'parties' | 'action_verb' | 'action_subject' | 'action_object' | 'frame'>): SentimentAssessment {
  const fullText = `${reading.headline} ${reading.summary}`
  const headTone = basicTone(reading.headline)
  const eventTone = basicTone(fullText)
  const eventToneLabel: EventTone =
    eventTone.pos > 0 && eventTone.neg > 0 ? 'mixed'
    : eventTone.score > 0.1 ? 'positive'
    : eventTone.score < -0.1 ? 'negative'
    : 'neutral'
  const controversy = Math.min(100, (eventTone.pos + eventTone.neg) * 18 + (reading.frame === 'corrupción' ? 30 : 0))

  // Actor sentiment + impact · usa action_verb para decidir sujeto vs objeto
  const allEntities = Array.from(new Set([...reading.actors, ...reading.parties]))
  const actor_sentiment: ActorSentiment[] = []
  const actor_impact: ActorImpact[] = []
  const subj = reading.action_subject
  const obj = reading.action_object
  const verb = reading.action_verb

  const negativeVerbs: ActionVerb[] = ['acusa', 'denuncia', 'critica', 'condena', 'bloquea', 'imputa', 'amenaza', 'rompe', 'rechaza']
  const positiveVerbs: ActionVerb[] = ['apoya', 'firma', 'pacta', 'aprueba', 'absuelve']

  for (const e of allEntities) {
    let sentiment = 0
    let confidence = 0.4
    let reason = 'mención sin contexto fuerte'
    let impact: ActorImpactKind = 'uncertain'

    if (subj && e === subj) {
      // sujeto de la acción · NO recibe el "beneficio" del verbo positivo:
      // en "X apoya a Y" el beneficiario narrativo es Y, no X. El sujeto en
      // verbos positivos queda neutral-leve (lidera la acción pero no es el
      // receptor del bien). Sprint M5 FASE 4b · fix expectativa direccional.
      if (negativeVerbs.includes(verb)) { sentiment = 0.05; impact = 'neutral'; reason = `sujeto que ${verb} · postura activa, no es el objeto del daño`; confidence = 0.65 }
      else if (positiveVerbs.includes(verb)) { sentiment = 0.05; impact = 'neutral'; reason = `sujeto de acción positiva (${verb}) · el beneficio narrativo recae en el objeto`; confidence = 0.6 }
      else { sentiment = 0.05; impact = 'neutral'; reason = `sujeto de la acción (${verb})`; confidence = 0.5 }
    } else if (obj && e === obj) {
      // objeto de la acción
      if (negativeVerbs.includes(verb)) { sentiment = -0.5; impact = 'harmful'; reason = `objeto de ${verb} · suele perjudicarle`; confidence = 0.7 }
      else if (positiveVerbs.includes(verb)) { sentiment = 0.4; impact = 'beneficial'; reason = `objeto de acción positiva (${verb})`; confidence = 0.65 }
      else { sentiment = -0.1; impact = 'neutral'; reason = `objeto de la acción (${verb})`; confidence = 0.5 }
    } else {
      // mención secundaria · usa tono general del texto
      sentiment = eventTone.score * 0.4
      impact = eventToneLabel === 'negative' ? 'harmful' : eventToneLabel === 'positive' ? 'beneficial' : 'uncertain'
      reason = `mención secundaria · hereda tono general (${eventToneLabel})`
      confidence = 0.35
    }
    actor_sentiment.push({ actor: e, sentiment, confidence, reason })
    actor_impact.push({ actor: e, impact, confidence, reason })
  }

  return {
    event_tone: eventToneLabel,
    headline_tone_score: headTone.score,
    controversy_score: Math.round(controversy),
    actor_sentiment,
    actor_impact,
    emotional_register: emotionalRegisterFromFrame(reading.frame, controversy),
    explanation: `event=${eventToneLabel} controversy=${controversy.toFixed(0)} verb=${verb} subj=${subj || '?'} obj=${obj || '?'} · ${actor_sentiment.length} actores valorados`,
  }
}

/**
 * readArticle · lectura estructurada determinista de un artículo agregado.
 * Sin LLM. Es la materia prima sobre la que después puede operar una IA.
 */
export function readArticle(article: AggregatedArticle, mediumProfile?: MediaSourceProfile): ArticleReading {
  const text = `${article.title} ${article.description || ''}`
  const headline = article.title || ''
  const summary = (article.description || '').slice(0, 320)

  // Sprint M5 FASE 4 · profileFromCatalog crasheaba si article.medio era undefined
  // (caso real cuando NewsAPI devuelve fuentes externas al catálogo o cuando un
  // fixture/test prepara un AggregatedArticle sin perfil). Fallback a un perfil
  // mínimo neutro.
  const profile: MediaSourceProfile = mediumProfile
    || (article.medio ? profileFromCatalog(article.medio) : {
      id: 'desconocido',
      name: 'fuente externa',
      group: 'Independiente',
      type: 'digital' as MediaTypeBucket,
      ambito: 'nacional' as AmbitoBucket,
      ccaa: null,
      ideology_raw: 0,
      ideology_bucket: 'center' as IdeologyBucket,
      audience_M: 0,
      credibility: 0.5,
      rss_url: null,
      web: '',
      has_rss: false,
    })
  const actors = detectActorsList(text)
  const parties = detectPartiesList(text)
  const institutions = detectInstitutionsList(text)
  const companies = detectCompaniesList(text)
  const sectors = detectSectorsList(text)
  const territories = detectCCAAList(text)

  const frame = detectFrame(text)
  const action_verb = detectActionVerb(text)
  const main_topic = detectMainTopic(text, sectors, frame)

  // Sprint M5 FASE 4b · Sujeto/objeto basado en posición REAL en titular.
  //
  // El bug previo: si una entidad canónica era "Alberto Núñez Feijóo" pero en
  // el titular aparecía sólo como "Feijóo", `headline.includes("Alberto Núñez Feijóo")`
  // devolvía false y caíamos al fallback `entityOrder[0]/[1]`, que reflejaba el
  // orden de inserción del catálogo (no la posición en el titular). En
  // "Feijóo acusa a Sánchez" eso atribuía Sánchez como sujeto y Feijóo como
  // objeto · justo al revés.
  //
  // Fix: para cada entidad canónica, buscar TODAS sus surface forms (full,
  // lastname, primer apellido si compuesto, alias de partido) y registrar la
  // primera posición encontrada en el titular. Ordenar por posición. La que
  // precede al verbo es sujeto, la primera que le sigue es objeto.
  const entityOrder: string[] = [...actors, ...parties, ...institutions]
  const lowerHeadline = headline.toLowerCase()
  let action_subject: string | null = null
  let action_object: string | null = null

  // Mapa canonical → primera posición en el titular
  const entityPositions: Array<{ canonical: string; pos: number }> = []
  for (const ent of entityOrder) {
    const surfaces: string[] = [ent]
    // Heurística: si tiene espacios, añadir el último token como surface adicional
    // (apellido) y el primero (nombre)
    if (ent.includes(' ')) {
      const tokens = ent.split(' ').filter(Boolean)
      surfaces.push(tokens[tokens.length - 1])         // apellido suelto
      if (tokens.length >= 3) surfaces.push(tokens.slice(-2).join(' ')) // doble apellido
    }
    // Buscar alias de partido si la entidad es un partido canónico
    const partyEntry = PARTIDOS_DICT.find((p) => p.canonical === ent)
    if (partyEntry) for (const a of partyEntry.aliases) if (!a.startsWith('\\b')) surfaces.push(a)
    // Buscar marcador "ambiguo" → la posición es la del apellido suelto
    const ambMatch = ent.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\s+\(ambiguo/)
    if (ambMatch) surfaces.push(ambMatch[1])

    let firstPos = -1
    for (const s of surfaces) {
      const idx = lowerHeadline.indexOf(s.toLowerCase())
      if (idx >= 0 && (firstPos < 0 || idx < firstPos)) firstPos = idx
    }
    if (firstPos >= 0) entityPositions.push({ canonical: ent, pos: firstPos })
  }
  entityPositions.sort((a, b) => a.pos - b.pos)

  // Posición del verbo principal en el titular
  const verbMatch = ACTION_VERB_RX.find((v) => v.rx.test(lowerHeadline))
  let verbPos = -1
  if (verbMatch) {
    const m = lowerHeadline.match(verbMatch.rx)
    if (m && m.index !== undefined) verbPos = m.index
  }

  if (verbPos >= 0 && entityPositions.length > 0) {
    // Sujeto = última entidad ANTES del verbo · Objeto = primera entidad DESPUÉS
    const before = entityPositions.filter((e) => e.pos < verbPos)
    const after = entityPositions.filter((e) => e.pos > verbPos)
    if (before.length > 0) action_subject = before[before.length - 1].canonical
    if (after.length > 0) action_object = after[0].canonical
    // Patrón "verbo + a + ENTIDAD" (acusativo personal) refuerza el objeto:
    // si no hay entidad antes del verbo pero hay justo después tras "a ",
    // confirma que la entidad ES el objeto (no el sujeto omitido)
    if (!action_subject && after.length > 0) {
      const afterText = lowerHeadline.slice(verbPos)
      if (/\s+a\s+/.test(afterText.slice(0, 30))) action_object = after[0].canonical
    }
  }
  // Fallback posicional (no por orden de catálogo).
  // IMPORTANTE: si ya hemos asignado action_object (caso "imputan a X" sin
  // sujeto expreso) NO promovemos esa misma entidad a sujeto · sería atribución
  // doble que sobrescribiría el sentiment correcto de objeto.
  if (!action_subject && entityPositions.length > 0) {
    const candidate = entityPositions[0].canonical
    if (candidate !== action_object) action_subject = candidate
  }
  if (!action_object && entityPositions.length > 1 && entityPositions[1].canonical !== action_subject) {
    action_object = entityPositions[1].canonical
  }

  // Pre-build reading (sin sentiment final · necesario para assessSentiment)
  const preReading = {
    headline, summary, actors, parties,
    action_verb, action_subject, action_object, frame,
  }
  const sentiment = assessSentiment(preReading)

  // Relevancias
  const spain_relevance = profile.ambito === 'nacional' ? 90 : profile.ambito === 'regional' ? 80 : profile.ambito === 'europeo' ? 70 : 50
  const political_risk = Math.min(100, sentiment.controversy_score + (frame === 'crisis' ? 20 : 0) + (frame === 'corrupción' ? 25 : 0))
  const electoral_relevance = (frame === 'electoral' ? 90 : 0) + parties.length * 8 + (actors.length > 0 ? 10 : 0)
  const institutional_relevance = (frame === 'institucional' ? 90 : 0) + institutions.length * 10

  // Confianza metodológica
  const text_signal = Math.min(1, (headline.length + summary.length) / 280)
  const entity_coverage = Math.min(1, (actors.length + parties.length + institutions.length + companies.length) / 4)
  const source_quality = profile.credibility / 100
  const overall = (text_signal * 0.35) + (entity_coverage * 0.35) + (source_quality * 0.30)
  const reasons: string[] = []
  if (text_signal < 0.4) reasons.push('descripción corta o ausente · inferencias débiles')
  if (entity_coverage < 0.25) reasons.push('sin entidades reconocidas · análisis genérico')
  if (source_quality < 0.5) reasons.push(`credibilidad fuente baja (${profile.credibility})`)

  const beneficiaries = sentiment.actor_impact.filter((a) => a.impact === 'beneficial').map((a) => a.actor)
  const affected = sentiment.actor_impact.filter((a) => a.impact === 'harmful').map((a) => a.actor)

  // Territorio afectado · heurística: si el medio es regional Y se menciona el territorio del medio, es afectado
  const territory_affected = profile.ccaa && territories.includes(profile.ccaa) ? [profile.ccaa] : territories.slice(0, 3)

  return {
    id: hashId(article.link || article.title),
    url: article.link,
    headline,
    summary,
    pub_date: article.pub_date_iso,
    medium: profile.name,
    medium_id: profile.id,
    medium_type: profile.type,
    medium_ideology_bucket: profile.ideology_bucket,
    medium_ambito: profile.ambito,
    medium_ccaa: profile.ccaa,
    territory_mentioned: territories,
    territory_affected,
    actors,
    parties,
    institutions,
    companies,
    sectors,
    main_topic,
    secondary_topics: sectors.slice(1),
    event_description: headline,
    action_verb,
    action_subject,
    action_object,
    sentiment,
    beneficiaries,
    affected,
    political_risk,
    spain_relevance,
    electoral_relevance: Math.min(100, electoral_relevance),
    institutional_relevance: Math.min(100, institutional_relevance),
    confidence: {
      overall,
      reasons,
      components: { source_quality, text_signal, entity_coverage, deterministic_only: true },
    },
    frame,
  }
}

// ════════════════════════════════════════════════════════════════════════
// 8 · NarrativeCluster builder · Sprint M2
// ════════════════════════════════════════════════════════════════════════
//
// Distingue 3 conceptos:
//   topic     · asunto del que se habla ("vivienda")
//   frame     · cómo se encuadra (crisis | gestión | identidad | ...)
//   narrative · combinación estable de topic + frame + actores + medios + tiempo
//                ej. "El alquiler como crisis de gobernabilidad urbana que presiona
//                     al Gobierno y a las CCAA"
//
// Algoritmo greedy O(n²) sobre readings:
//   1. seed: el reading con mayor entity_coverage + spain_relevance
//   2. agregar readings con similarity >= THRESHOLD
//   3. al saturar, construir NarrativeCluster con metadata derivada
//   4. repetir hasta no quedar seeds viables
//
// Similarity: Jaccard sobre entidades + match de frame + match topic +
//             solape de ngrams + proximidad temporal (decay 48h).

const SIMILARITY_THRESHOLD = 0.32
const MAX_NARRATIVE_SIZE = 30

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0
  const setA = new Set(a.map((x) => x.toLowerCase()))
  const setB = new Set(b.map((x) => x.toLowerCase()))
  let inter = 0
  setA.forEach((x) => { if (setB.has(x)) inter++ })
  const union = setA.size + setB.size - inter
  return union > 0 ? inter / union : 0
}

function tokenizeHeadline(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-záéíóúñü\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4)
}

function bigrams(words: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < words.length - 1; i++) out.push(`${words[i]}_${words[i + 1]}`)
  return out
}

function ageHoursBetween(a: string | null, b: string | null): number {
  if (!a || !b) return 24
  const ta = new Date(a).getTime()
  const tb = new Date(b).getTime()
  if (isNaN(ta) || isNaN(tb)) return 24
  return Math.abs(ta - tb) / 3_600_000
}

function similarity(a: ArticleReading, b: ArticleReading): number {
  // Entidades (peso fuerte)
  const actorsJ = jaccard(a.actors, b.actors) * 0.30
  const partiesJ = jaccard(a.parties, b.parties) * 0.15
  const institutionsJ = jaccard(a.institutions, b.institutions) * 0.10
  const companiesJ = jaccard(a.companies, b.companies) * 0.05
  // Frame + topic
  const frameMatch = a.frame === b.frame && a.frame !== 'otro' ? 0.10 : 0
  const topicMatch = a.main_topic === b.main_topic ? 0.10 : 0
  const sectorJ = jaccard(a.sectors, b.sectors) * 0.05
  // Headline ngrams (señal léxica)
  const bigramJ = jaccard(bigrams(tokenizeHeadline(a.headline)), bigrams(tokenizeHeadline(b.headline))) * 0.10
  // Decay temporal · misma semana
  const hours = ageHoursBetween(a.pub_date, b.pub_date)
  const timeDecay = Math.max(0, 1 - hours / 48) * 0.05
  return actorsJ + partiesJ + institutionsJ + companiesJ + frameMatch + topicMatch + sectorJ + bigramJ + timeDecay
}

function modeOf<T>(arr: T[]): T | null {
  if (arr.length === 0) return null
  const counts = new Map<T, number>()
  for (const x of arr) counts.set(x, (counts.get(x) || 0) + 1)
  let best: T | null = null
  let bestC = 0
  Array.from(counts.entries()).forEach(([k, v]) => {
    if (v > bestC) { best = k; bestC = v }
  })
  return best
}

function topNByCount<T extends string>(arr: T[], n: number): T[] {
  const counts = new Map<T, number>()
  for (const x of arr) counts.set(x, (counts.get(x) || 0) + 1)
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k)
}

export interface BuildNarrativeClustersOptions {
  threshold?: number
  maxClusters?: number
  windowHours?: number
}

/**
 * Sprint G15 FASE D · resultado enriquecido de buildNarrativeClusters separando
 * narrativas reales de señales emergentes (clusters demasiado pequeños o débiles
 * para llamarlos "narrativa" pero útiles como early warning).
 */
export interface NarrativeClustersResult {
  narrative_clusters: NarrativeCluster[]
  emerging_signals: NarrativeCluster[]   // mismo shape · clusters 2 artículos / 1 medio / topic genérico
}

/**
 * Sprint G15 FASE D · checks de "narrativa real" vs "señal emergente".
 *
 * Una narrativa es topic + frame + mensaje repetido + actores + medios/canales +
 * ventana temporal + evidencia suficiente. NO es "un tema". NO es "un frame suelto".
 *
 * REGLAS DURAS (todas deben cumplirse para ser narrative_cluster):
 *  1. mínimo 3 artículos en el cluster
 *  2. mínimo 2 medios DISTINTOS amplificándola
 *  3. al menos UNA señal fuerte en el cluster:
 *      - actor dominante (actor catalogado, no anónimo)
 *      - institución mencionada
 *      - partido mencionado
 *      - empresa mencionada
 *      - territorio (no solo el del medio)
 *      - main_topic NO genérico ('general'/'otros' descartado)
 *
 * Si falla alguna → cae a emerging_signals (clusters de 2 arts, o 3+ pero sin
 * señal fuerte). El frontend renderiza emerging_signals diferenciado para que
 * el analista vea early warnings sin confundirlos con narrativas establecidas.
 */
const GENERIC_TOPICS = new Set(['general', 'otros', 'otro', 'general/otros', ''])

function hasStrongSignal(arts: ArticleReading[]): { strong: boolean; reasons: string[] } {
  const reasons: string[] = []
  const allActors = arts.flatMap((a) => a.actors).filter((a) => a && a.length > 2)
  const allParties = arts.flatMap((a) => a.parties)
  const allInst = arts.flatMap((a) => a.institutions)
  const allCompanies = arts.flatMap((a) => a.companies)
  const allTerritories = arts.flatMap((a) => a.territory_mentioned).filter(Boolean)
  const mainTopics = arts.map((a) => a.main_topic).filter((t) => t && !GENERIC_TOPICS.has(t.toLowerCase()))

  // Cuenta de menciones por entidad · 2+ menciones = entidad recurrente real, no ruido
  const counts = new Map<string, number>()
  for (const e of [...allActors, ...allParties, ...allInst, ...allCompanies]) {
    counts.set(e, (counts.get(e) || 0) + 1)
  }
  const dominantEntity = Array.from(counts.entries()).find(([, n]) => n >= 2)
  if (dominantEntity) reasons.push(`entidad dominante "${dominantEntity[0]}" en ${dominantEntity[1]} arts`)
  if (allParties.length > 0) reasons.push(`partido(s): ${Array.from(new Set(allParties)).slice(0, 3).join(',')}`)
  if (allInst.length > 0) reasons.push(`institución(es): ${Array.from(new Set(allInst)).slice(0, 3).join(',')}`)
  if (allCompanies.length > 0) reasons.push(`empresa(s): ${Array.from(new Set(allCompanies)).slice(0, 3).join(',')}`)
  if (allTerritories.length >= 2) reasons.push(`territorio mencionado en ≥2 arts`)
  if (mainTopics.length >= 2) reasons.push(`topic no genérico recurrente`)

  return { strong: reasons.length > 0, reasons }
}

/**
 * Construye NarrativeCluster[] a partir de readings.
 * Determinista, sin LLM. Output sirve para UI auditable y para
 * alimentar la lectura IA con material estructurado.
 *
 * Sprint G15 FASE D · acepta clusters de tamaño 2 para evitar perder
 * señales débiles, pero los SEPARA en narrative_clusters vs emerging_signals
 * según las reglas duras de hasStrongSignal().
 */
export function buildNarrativeClustersDetailed(
  readings: ArticleReading[],
  opts: BuildNarrativeClustersOptions = {},
): NarrativeClustersResult {
  const threshold = opts.threshold ?? SIMILARITY_THRESHOLD
  const maxClusters = opts.maxClusters ?? 15
  const emerging_signals: NarrativeCluster[] = []
  const narrative_clusters: NarrativeCluster[] = []
  if (readings.length === 0) return { narrative_clusters, emerging_signals }

  const scoredSeeds = [...readings]
    .map((r) => ({
      r,
      seedScore:
        (r.actors.length + r.parties.length + r.institutions.length + r.companies.length) *
        (r.spain_relevance / 100) *
        r.confidence.overall,
    }))
    .sort((a, b) => b.seedScore - a.seedScore)
    .map((x) => x.r)

  const used = new Set<string>()
  const rawClusters: ArticleReading[][] = []

  for (const seed of scoredSeeds) {
    if (used.has(seed.id)) continue
    if (rawClusters.length >= maxClusters * 2) break  // x2 budget · partimos en 2 outputs
    const cluster: ArticleReading[] = [seed]
    used.add(seed.id)
    for (const other of readings) {
      if (used.has(other.id)) continue
      if (cluster.length >= MAX_NARRATIVE_SIZE) break
      const sim = similarity(seed, other)
      if (sim >= threshold) {
        cluster.push(other)
        used.add(other.id)
      }
    }
    if (cluster.length >= 2) rawClusters.push(cluster)
  }

  // Clasificar cada cluster: narrative real vs emerging signal
  for (let i = 0; i < rawClusters.length; i++) {
    const arts = rawClusters[i]
    const distinctMedia = new Set(arts.map((a) => a.medium_id || a.medium)).size
    const { strong, reasons } = hasStrongSignal(arts)
    const isNarrative =
      arts.length >= 3 &&
      distinctMedia >= 2 &&
      strong

    const cluster = narrativeFromArticles(arts, i, readings)
    // Inyectamos meta de por qué se considera narrativa (o no) al why_this_is_a_narrative
    if (isNarrative) {
      cluster.why_this_is_a_narrative =
        `${arts.length} artículos en ${distinctMedia} medios distintos · señal fuerte: ${reasons.join(' · ')}.`
      narrative_clusters.push(cluster)
    } else {
      const missing: string[] = []
      if (arts.length < 3) missing.push(`solo ${arts.length} artículos (mínimo 3)`)
      if (distinctMedia < 2) missing.push(`solo ${distinctMedia} medio (mínimo 2 distintos)`)
      if (!strong) missing.push('sin señal fuerte (sin actor/partido/institución/empresa/territorio/topic-no-genérico recurrente)')
      cluster.why_this_is_a_narrative =
        `Señal emergente · NO considerada narrativa establecida. Falta: ${missing.join(' · ')}.`
      emerging_signals.push(cluster)
    }
  }

  // Ordenamos narrative_clusters por confidence + n_articles descendente
  narrative_clusters.sort((a, b) => {
    const ca = (a.confidence || 0) + a.articles.length / 100
    const cb = (b.confidence || 0) + b.articles.length / 100
    return cb - ca
  })

  return {
    narrative_clusters: narrative_clusters.slice(0, maxClusters),
    emerging_signals: emerging_signals.slice(0, maxClusters),
  }
}

/**
 * Wrapper backward-compat · devuelve solo `narrative_clusters` (la API legacy).
 * Mantiene el contrato anterior para code que aún espera el array directo.
 * NUEVO código debe usar `buildNarrativeClustersDetailed` que devuelve también
 * `emerging_signals`.
 */
export function buildNarrativeClusters(
  readings: ArticleReading[],
  opts: BuildNarrativeClustersOptions = {},
): NarrativeCluster[] {
  return buildNarrativeClustersDetailed(readings, opts).narrative_clusters
}

function narrativeFromArticles(
  arts: ArticleReading[],
  idx: number,
  allReadings: ArticleReading[],
): NarrativeCluster {
  const allActors = arts.flatMap((a) => a.actors)
  const allParties = arts.flatMap((a) => a.parties)
  const allSectors = arts.flatMap((a) => a.sectors)
  // Sector dominante (taxonomía nueva) · suma el `score` de classifySector por
  // artículo y elige el sector de mayor peso acumulado. Rompe empates de
  // frecuencia por la fuerza de clasificación (entidades/leyes/términos), no por
  // el orden de clustering. null si ningún artículo encaja en un sector.
  const sectorWeights = new Map<SectorKey, number>()
  for (const a of arts) {
    const r = classifySector(`${a.headline} ${a.summary}`)
    if (r.sector !== 'otro') sectorWeights.set(r.sector, (sectorWeights.get(r.sector) || 0) + r.score)
  }
  let dominantSector: SectorKey | null = null
  let bestSectorWeight = 0
  for (const [k, w] of sectorWeights) { if (w > bestSectorWeight) { dominantSector = k; bestSectorWeight = w } }
  const allInstitutions = arts.flatMap((a) => a.institutions)
  const allFrames = arts.map((a) => a.frame)
  const allTopics = arts.map((a) => a.main_topic)
  const secondaryTopics = arts.flatMap((a) => a.secondary_topics)
  const beneficiaries = arts.flatMap((a) => a.beneficiaries)
  const affected = arts.flatMap((a) => a.affected)

  const dominantFrame = (modeOf(allFrames) || 'otro') as FrameType
  const mainTopic = modeOf(allTopics) || 'general'
  const dominantActors = topNByCount(allActors, 6)
  const benefited = topNByCount(beneficiaries, 5)
  const harmed = topNByCount(affected, 5)
  const institutions = topNByCount(allInstitutions, 4)

  // Temporal
  const sortedByDate = [...arts].sort((a, b) => (a.pub_date || '').localeCompare(b.pub_date || ''))
  const first_seen = sortedByDate[0].pub_date || new Date(0).toISOString()
  const last_seen = sortedByDate[sortedByDate.length - 1].pub_date || new Date().toISOString()
  // Velocity = arts en últimas 24h / 24
  const now = Date.now()
  const last24h = arts.filter((a) => a.pub_date && now - new Date(a.pub_date).getTime() <= 24 * 3_600_000).length
  const prev24h = arts.filter((a) => {
    if (!a.pub_date) return false
    const t = new Date(a.pub_date).getTime()
    return now - t > 24 * 3_600_000 && now - t <= 48 * 3_600_000
  }).length
  const velocity_score = last24h / 24
  const acceleration_score = prev24h > 0 ? (last24h - prev24h) / prev24h : (last24h > 0 ? 1 : 0)
  // Sprint M5 FASE 4 · velocity_confidence baja cuando hay <4 artículos en las
  // últimas 24h · una tasa de "1 artículo/día" basada en N=1 es ruido
  const velocity_confidence =
    last24h >= 8 ? 1.0
    : last24h >= 4 ? 0.7
    : last24h >= 2 ? 0.4
    : last24h === 1 ? 0.2
    : 0
  // acceleration_confidence requiere AMBAS ventanas con muestras
  const acceleration_confidence =
    prev24h >= 4 && last24h >= 4 ? 1.0
    : prev24h >= 2 && last24h >= 2 ? 0.5
    : 0.1

  // Source diversity · construye profiles desde readings
  const uniqueMediums = new Map<string, { id: string; ideology_bucket: IdeologyBucket; ambito: AmbitoBucket; type: MediaTypeBucket; ccaa: string | null; group: string; name: string; audience_M: number; credibility: number; web: string; rss_url: string | null; has_rss: boolean; ideology_raw: number }>()
  for (const a of arts) {
    if (!uniqueMediums.has(a.medium_id)) {
      uniqueMediums.set(a.medium_id, {
        id: a.medium_id,
        ideology_bucket: a.medium_ideology_bucket,
        ambito: a.medium_ambito,
        type: a.medium_type,
        ccaa: a.medium_ccaa,
        group: 'unknown',          // info no propagada al reading
        name: a.medium,
        audience_M: 0,
        credibility: 0,
        web: '', rss_url: null, has_rss: false, ideology_raw: 0,
      })
    }
  }
  const source_diversity = buildDiversityBreakdown(Array.from(uniqueMediums.values()) as MediaSourceProfile[])

  // Ideological spread normalizado a 3 buckets
  const ideoBuckets = arts.map((a) => a.medium_ideology_bucket)
  const left = ideoBuckets.filter((b) => b === 'left' || b === 'center-left').length / arts.length
  const center = ideoBuckets.filter((b) => b === 'center').length / arts.length
  const right = ideoBuckets.filter((b) => b === 'center-right' || b === 'right').length / arts.length
  const balanced = left > 0.15 && center > 0.15 && right > 0.15

  // Territorial spread
  const territoriesArr: string[] = []
  for (const a of arts) for (const t of a.territory_mentioned) territoriesArr.push(t)
  const allTerritories = Array.from(new Set(territoriesArr))

  // Reach estimate · suma de audience NO propagada al reading · usamos heurística
  // (n_medios distintos * 1.2 como proxy de millones de impactos diarios)
  const reach_estimate = Math.round(uniqueMediums.size * 1.2)

  // Emotional register · moda
  const emotionalRegisters = arts.map((a) => a.sentiment.emotional_register)
  const emotional_register = (modeOf(emotionalRegisters) || 'tecnocrático') as EmotionalRegister

  // Controversy avg
  const controversy_score = Math.round(
    arts.reduce((s, a) => s + a.sentiment.controversy_score, 0) / arts.length,
  )

  // Sprint M5 FASE 4 · Confidence más estricta:
  // - Cap duro 0.55 si arts.length < 3 (narrativa de 2 artículos no es narrativa)
  // - Penalización -0.15 si balance ideológico falla (sesgo de un único bloque)
  // - Penalización -0.10 si velocity_confidence < 0.4 (tasa basada en muestra pobre)
  // - Penalización -0.10 si source_diversity tiene warnings
  const avgConf = arts.reduce((s, a) => s + a.confidence.overall, 0) / arts.length
  const confidenceReasons: string[] = []
  let sampleCap = 1
  if (arts.length < 3) {
    sampleCap = 0.55
    confidenceReasons.push(`narrativa muy pequeña (${arts.length} artículos · no es una narrativa estabilizada)`)
  } else if (arts.length < 5) {
    sampleCap = 0.75
    confidenceReasons.push(`narrativa pequeña (${arts.length} artículos) · podría no ser representativa`)
  }
  let penalty = 0
  if (!balanced) {
    penalty += 0.15
    confidenceReasons.push('cobertura ideológica desequilibrada · sesgo posible · no extrapolable a opinión pública')
  }
  if (velocity_confidence < 0.4) {
    penalty += 0.10
    confidenceReasons.push(`velocidad calculada sobre muestra pobre (last24h=${last24h}) · trend no fiable`)
  }
  if (source_diversity.warnings.length > 0) {
    penalty += 0.10
    confidenceReasons.push(source_diversity.warnings[0])
  }
  const confidence: MethodologyConfidence = {
    overall: Math.max(0, Math.min(sampleCap, avgConf - penalty)),
    reasons: confidenceReasons,
    components: {
      source_quality: avgConf,
      text_signal: Math.min(1, arts.length / 8),
      entity_coverage: Math.min(1, (dominantActors.length + institutions.length) / 6),
      deterministic_only: true,
    },
  }

  // Título emergente · Sprint G15 FASE D · ahora con institutions+parties para títulos mejorados
  const title = generateNarrativeTitle(mainTopic, dominantFrame, dominantActors, harmed, benefited, institutions, topNByCount(allParties, 3))
  const short_summary = generateNarrativeSummary(arts, mainTopic, dominantFrame, dominantActors, harmed, benefited)

  // Evidence · 1 representativo por bucket ideológico (hasta 6)
  const evidence = buildEvidence(arts).slice(0, 8)
  const representative_titles = arts.slice(0, 5).map((a) => a.headline)

  const id = `nc${idx}_${dominantFrame}_${mainTopic}`.slice(0, 40)

  return {
    id,
    title,
    short_summary,
    frame_type: dominantFrame,
    main_topic: mainTopic,
    secondary_topics: topNByCount(secondaryTopics, 4),
    dominant_sector: dominantSector,
    sector_label: dominantSector ? SECTOR_LABELS[dominantSector] : null,
    articles: arts.map((a) => a.id),
    representative_titles,
    first_seen,
    last_seen,
    velocity_score,
    velocity_confidence,
    acceleration_score,
    acceleration_confidence,
    reach_estimate,
    source_diversity,
    ideological_spread: { left, center, right, balanced },
    territorial_spread: allTerritories,
    dominant_actors: dominantActors,
    benefited_actors: benefited,
    harmed_actors: harmed,
    emotional_register,
    controversy_score,
    confidence,
    why_this_is_a_narrative: `${arts.length} artículos comparten frame "${dominantFrame}" y topic "${mainTopic}". Mencionan en común: ${dominantActors.slice(0, 3).join(', ') || institutions.slice(0, 2).join(', ') || 'actores múltiples'}. Difusión en ${uniqueMediums.size} medios distintos (balance ideológico: ${balanced ? 'sí' : 'no'}).`,
    evidence,
    // Sprint G15 FASE D3 · campos extendidos para el workbench unificado
    key_messages: extractKeyMessages(arts, dominantActors, harmed, benefited, dominantFrame),
    topic_tags: extractTopicTags(arts),
    channels: extractChannels(arts),
    target_audiences: inferTargetAudiences(arts, allTerritories, dominantFrame, mainTopic),
    supporting_news: arts.slice(0, 8).map((a) => ({
      title: a.headline,
      medium: a.medium || 'Desconocido',
      url: a.url,
      ideology: a.medium_ideology_bucket || 'center',
      published_at: a.pub_date,
    })),
    impact_summary: {
      benefited: benefited.slice(0, 5),
      harmed: harmed.slice(0, 5),
      uncertain: dominantActors.filter((a) => !benefited.includes(a) && !harmed.includes(a)).slice(0, 3),
    },
    trend: {
      velocity_score,
      velocity_confidence,
      acceleration_score,
      acceleration_confidence,
      label: classifyTrendLabel(velocity_score, acceleration_score),
    },
  }
}

// ── Sprint G15 FASE D3 · helpers para campos extendidos ──────────────────────

/**
 * Tendencia legible derivada de velocity + acceleration.
 *   emergente   · accel > 0.5 y velocity > 0.5  → muy reciente y acelerando
 *   acelerando  · accel > 0.3                   → ya activa pero subiendo
 *   estable     · |accel| ≤ 0.3                 → ritmo constante
 *   en retroceso · accel < -0.3                 → perdiendo fuerza
 */
function classifyTrendLabel(
  velocity: number,
  accel: number,
): 'emergente' | 'estable' | 'acelerando' | 'en retroceso' {
  if (accel > 0.5 && velocity > 0.5) return 'emergente'
  if (accel > 0.3) return 'acelerando'
  if (accel < -0.3) return 'en retroceso'
  return 'estable'
}

/**
 * Extrae 2-3 mensajes clave (tesis repetidas) buscando bigramas/trigramas
 * recurrentes en los titulares. Heurístico simple sin LLM.
 */
function extractKeyMessages(
  arts: ArticleReading[],
  dominantActors: string[],
  harmed: string[],
  benefited: string[],
  frame: FrameType,
): string[] {
  const messages: string[] = []
  const mainActor = dominantActors[0]
  const harmActor = harmed[0]
  const benActor = benefited[0]

  // Mensaje 1: el actor central enfrenta el frame
  if (mainActor) {
    if (frame === 'crisis') messages.push(`${mainActor} bajo presión por la crisis`)
    else if (frame === 'corrupción') messages.push(`${mainActor} en el foco por presunta corrupción`)
    else if (frame === 'judicial') messages.push(`${mainActor} implicado judicialmente`)
    else if (frame === 'electoral') messages.push(`${mainActor} en el centro de la batalla electoral`)
    else messages.push(`${mainActor} marca la agenda mediática`)
  }
  // Mensaje 2: quién pierde / quién gana
  if (harmActor && harmActor !== mainActor) {
    messages.push(`${harmActor} sale perjudicado de la cobertura`)
  }
  if (benActor && benActor !== mainActor && benActor !== harmActor) {
    messages.push(`${benActor} sale beneficiado de la cobertura`)
  }
  // Mensaje 3: si nada de lo anterior, usar el primer titular como mensaje
  if (messages.length === 0 && arts[0]?.headline) {
    messages.push(arts[0].headline)
  }
  return messages.slice(0, 3)
}

/**
 * Agrega TODOS los source_tags RSS de todos los artículos del cluster,
 * dedupea y devuelve top 8 por frecuencia. Esto es "qué dicen los propios
 * medios que va este cluster".
 */
function extractTopicTags(arts: ArticleReading[]): string[] {
  const counts = new Map<string, number>()
  for (const a of arts) {
    const tags = (a as ArticleReading & { source_tags?: string[] }).source_tags
    if (Array.isArray(tags)) {
      for (const t of tags) {
        const cleaned = t.trim()
        if (cleaned.length >= 2) counts.set(cleaned, (counts.get(cleaned) || 0) + 1)
      }
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => t)
}

/**
 * Distribución por canal · agrupa por medio.type (prensa/digital/tv/radio).
 * Devuelve weight 0..1 y 2 medios de ejemplo por canal.
 */
function extractChannels(arts: ArticleReading[]): Array<{ channel: string; weight: number; examples: string[] }> {
  const byChannel = new Map<string, { count: number; examples: Set<string> }>()
  for (const a of arts) {
    const type = a.medium_type || 'otro'
    const cur = byChannel.get(type) || { count: 0, examples: new Set<string>() }
    cur.count++
    if (a.medium) cur.examples.add(a.medium)
    byChannel.set(type, cur)
  }
  const total = arts.length
  return Array.from(byChannel.entries())
    .map(([channel, v]) => ({
      channel,
      weight: +(v.count / total).toFixed(2),
      examples: Array.from(v.examples).slice(0, 2),
    }))
    .sort((a, b) => b.weight - a.weight)
}

/**
 * Heurística simple de audiencias objetivo basada en territorio + frame + topic.
 * No es ground truth · es pista accionable para el analista.
 */
function inferTargetAudiences(
  arts: ArticleReading[],
  territories: string[],
  frame: FrameType,
  topic: string,
): Array<{ label: string; reason: string; confidence: number }> {
  const out: Array<{ label: string; reason: string; confidence: number }> = []
  // Por territorio
  if (territories.length === 1) {
    out.push({ label: `Opinión pública ${territories[0]}`, reason: `Cobertura concentrada en ${territories[0]}`, confidence: 0.65 })
  } else if (territories.length >= 3) {
    out.push({ label: 'Opinión pública nacional', reason: `Cobertura en ${territories.length} territorios distintos`, confidence: 0.55 })
  }
  // Por frame
  if (frame === 'electoral') {
    out.push({ label: 'Votantes indecisos', reason: 'Frame electoral activo · narrativa de movilización', confidence: 0.50 })
  }
  if (frame === 'judicial' || frame === 'corrupción') {
    out.push({ label: 'Élites institucionales y prensa de referencia', reason: `Frame ${frame} típicamente trasciende a editoriales`, confidence: 0.55 })
  }
  if (frame === 'crisis' || frame === 'social') {
    out.push({ label: 'Colectivos afectados directos', reason: `Frame ${frame} interpela a quien sufre el evento`, confidence: 0.50 })
  }
  if (frame === 'economía') {
    out.push({ label: 'Comunidad empresarial / inversores', reason: 'Frame económico · narrativa de mercado', confidence: 0.50 })
  }
  // Por topic (hint específico)
  const topicLower = (topic || '').toLowerCase()
  if (topicLower.includes('vivienda') || topicLower.includes('alquiler')) {
    out.push({ label: 'Jóvenes urbanos · inquilinos', reason: 'Topic vivienda · afecta directo', confidence: 0.55 })
  }
  if (topicLower.includes('empleo') || topicLower.includes('paro')) {
    out.push({ label: 'Trabajadores y sindicatos', reason: 'Topic empleo · interés organizado', confidence: 0.50 })
  }
  return out.slice(0, 4)
}

/**
 * Sprint G15 FASE D · títulos legibles que NO caen en "General + otro",
 * "Internacional con repercusión internacional", "Defensa + otro" etc.
 *
 * Reglas:
 *  - Si topic ∈ GENERIC_TOPICS y no hay actor/inst, usa el frame o actor
 *    explícito en lugar de "General"
 *  - Plantillas tipo "La huelga como crisis de servicios públicos",
 *    "La vivienda como presión sobre el Gobierno", "El empleo en clave de
 *    reforma laboral"
 *  - Nunca producir "X · otro" como output final
 */
function generateNarrativeTitle(
  topic: string,
  frame: FrameType,
  dominantActors: string[],
  harmed: string[],
  benefited: string[] = [],
  institutions: string[] = [],
  parties: string[] = [],
): string {
  // Títulos CORTOS y llanos, para captar de un vistazo de qué va la narrativa.
  // El detalle (frame, actores, resumen y "por qué es narrativa") se explica
  // aparte en la tarjeta — aquí solo el titular sencillo.
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
  const isGenericTopic = GENERIC_TOPICS.has((topic || '').toLowerCase())
  const isGenericFrame = !frame || frame === 'otro'
  const actor = dominantActors[0] || harmed[0] || benefited[0] || ''
  // Sujeto principal: el tema real si lo hay; si no, el actor/institución/partido.
  const subject = isGenericTopic
    ? cap(actor || institutions[0] || parties[0] || '')
    : cap(topic)

  if (!subject) {
    return isGenericFrame ? 'Tema emergente en la prensa' : `Cobertura sobre ${frame}`
  }

  // Una frase corta por frame, en lenguaje normal (sin "en clave X",
  // "como cuestión de" ni "judicialización de").
  switch (frame) {
    case 'crisis':        return `Crisis: ${subject}`
    case 'corrupción':    return `Presunta corrupción: ${subject}`
    case 'judicial':      return `${subject} ante la justicia`
    case 'electoral':     return `${subject} en campaña`
    case 'institucional': return `Tensión política: ${subject}`
    case 'internacional': return `${subject}, foco internacional`
    case 'economía':      return `${subject} y la economía`
    case 'seguridad':     return `${subject} y la seguridad`
    case 'territorial':   return `Tensión territorial: ${subject}`
    case 'social':        return `Debate social: ${subject}`
    case 'amenaza':       return `Alerta: ${subject}`
    case 'oportunidad':   return `Oportunidad: ${subject}`
    default:              return subject
  }
}

function generateNarrativeSummary(
  arts: ArticleReading[],
  topic: string,
  frame: FrameType,
  dominantActors: string[],
  harmed: string[],
  benefited: string[],
): string {
  const n = arts.length
  const mainActor = dominantActors[0]
  const harmActor = harmed[0]
  const benefActor = benefited[0]
  let s = `${n} artículos coinciden en cubrir ${topic} con un enfoque de ${frame}.`
  if (mainActor) s += ` Actor central: ${mainActor}.`
  if (harmActor && harmActor !== mainActor) s += ` Sale perjudicado: ${harmActor}.`
  if (benefActor && benefActor !== mainActor && benefActor !== harmActor) s += ` Sale beneficiado: ${benefActor}.`
  return s
}

function buildEvidence(arts: ArticleReading[]): Array<{ title: string; medium: string; url: string; ideology: IdeologyBucket }> {
  // Tomar 1 por bucket ideológico para evidence balanceada
  const seen: Partial<Record<IdeologyBucket, boolean>> = {}
  const out: Array<{ title: string; medium: string; url: string; ideology: IdeologyBucket }> = []
  for (const a of arts) {
    if (!seen[a.medium_ideology_bucket]) {
      seen[a.medium_ideology_bucket] = true
      out.push({ title: a.headline, medium: a.medium, url: a.url, ideology: a.medium_ideology_bucket })
    }
  }
  // Si quedan huecos · rellenar con más artículos
  for (const a of arts) {
    if (out.length >= 8) break
    if (!out.find((x) => x.url === a.url)) {
      out.push({ title: a.headline, medium: a.medium, url: a.url, ideology: a.medium_ideology_bucket })
    }
  }
  return out
}

// ════════════════════════════════════════════════════════════════════════
// 9 · Aggregates derivados de ArticleReading[] para alimentar UI/IA
// ════════════════════════════════════════════════════════════════════════

export interface FigureFromReadings {
  name: string
  mentions: number
  avg_sentiment: number          // -1 a +1
  avg_confidence: number         // 0 a 1
  beneficial_count: number
  harmful_count: number
  neutral_count: number
  uncertain_count: number
  top_frames: Array<{ frame: FrameType; count: number }>
  top_mediums: Array<{ medium: string; count: number }>
}

/**
 * Construye agregados por figura usando assessSentiment · separa
 * sentiment HACIA el actor de mention plana.
 */
export function figuresFromReadings(readings: ArticleReading[], n = 20): FigureFromReadings[] {
  const byActor = new Map<string, {
    mentions: number
    sentSum: number
    confSum: number
    impacts: Record<ActorImpactKind, number>
    frames: string[]
    mediums: string[]
  }>()

  for (const r of readings) {
    for (const ai of r.sentiment.actor_impact) {
      const cur = byActor.get(ai.actor) || {
        mentions: 0, sentSum: 0, confSum: 0,
        impacts: { beneficial: 0, harmful: 0, neutral: 0, uncertain: 0 },
        frames: [], mediums: [],
      }
      cur.mentions++
      const sa = r.sentiment.actor_sentiment.find((x) => x.actor === ai.actor)
      cur.sentSum += sa ? sa.sentiment : 0
      cur.confSum += ai.confidence
      cur.impacts[ai.impact]++
      cur.frames.push(r.frame)
      cur.mediums.push(r.medium)
      byActor.set(ai.actor, cur)
    }
  }

  const out: FigureFromReadings[] = []
  for (const [actor, agg] of Array.from(byActor.entries())) {
    const frameCounts: Record<string, number> = {}
    for (const f of agg.frames) frameCounts[f] = (frameCounts[f] || 0) + 1
    const top_frames = Object.entries(frameCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([frame, count]) => ({ frame: frame as FrameType, count }))
    const medCounts: Record<string, number> = {}
    for (const m of agg.mediums) medCounts[m] = (medCounts[m] || 0) + 1
    const top_mediums = Object.entries(medCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([medium, count]) => ({ medium, count }))

    out.push({
      name: actor,
      mentions: agg.mentions,
      avg_sentiment: agg.mentions > 0 ? agg.sentSum / agg.mentions : 0,
      avg_confidence: agg.mentions > 0 ? agg.confSum / agg.mentions : 0,
      beneficial_count: agg.impacts.beneficial,
      harmful_count: agg.impacts.harmful,
      neutral_count: agg.impacts.neutral,
      uncertain_count: agg.impacts.uncertain,
      top_frames,
      top_mediums,
    })
  }
  return out.sort((a, b) => b.mentions - a.mentions).slice(0, n)
}

export interface ReadingsSummary {
  n_readings: number
  dominant_frames: Array<{ frame: string; count: number }>
  avg_controversy: number
  avg_political_risk: number
  avg_confidence: number
  top_beneficiaries: Array<{ actor: string; count: number }>
  top_affected: Array<{ actor: string; count: number }>
  action_verbs: Array<{ verb: string; count: number }>
}

/**
 * Resumen ejecutivo de un set de readings · listo para enviar a lectura IA
 * como `readings_summary` en /api/medios/lectura.
 */
export function summarizeReadings(readings: ArticleReading[]): ReadingsSummary {
  const n = readings.length
  if (n === 0) {
    return { n_readings: 0, dominant_frames: [], avg_controversy: 0, avg_political_risk: 0, avg_confidence: 0, top_beneficiaries: [], top_affected: [], action_verbs: [] }
  }
  const frameCounts = new Map<string, number>()
  const verbCounts = new Map<string, number>()
  const benefCounts = new Map<string, number>()
  const affectCounts = new Map<string, number>()
  let contSum = 0, riskSum = 0, confSum = 0
  for (const r of readings) {
    frameCounts.set(r.frame, (frameCounts.get(r.frame) || 0) + 1)
    verbCounts.set(r.action_verb, (verbCounts.get(r.action_verb) || 0) + 1)
    for (const b of r.beneficiaries) benefCounts.set(b, (benefCounts.get(b) || 0) + 1)
    for (const a of r.affected) affectCounts.set(a, (affectCounts.get(a) || 0) + 1)
    contSum += r.sentiment.controversy_score
    riskSum += r.political_risk
    confSum += r.confidence.overall
  }
  const sortByCount = <T>(m: Map<T, number>): Array<{ frame: string; count: number }> =>
    Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([k, count]) => ({ frame: String(k), count }))
  const dominant_frames = sortByCount(frameCounts).slice(0, 6)
  const action_verbs = Array.from(verbCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([verb, count]) => ({ verb, count }))
  const top_beneficiaries = Array.from(benefCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([actor, count]) => ({ actor, count }))
  const top_affected = Array.from(affectCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([actor, count]) => ({ actor, count }))
  return {
    n_readings: n,
    dominant_frames,
    avg_controversy: contSum / n,
    avg_political_risk: riskSum / n,
    avg_confidence: confSum / n,
    top_beneficiaries,
    top_affected,
    action_verbs,
  }
}

// ════════════════════════════════════════════════════════════════════════
// 10 · Meta builder unificado para endpoints
// ════════════════════════════════════════════════════════════════════════

export interface ApiMeta {
  source: 'live' | 'backend' | 'mock' | 'fallback' | 'error'
  ts: string
  latency_ms: number
  warnings: string[]
  methodology_version: typeof METHODOLOGY_VERSION
  sources_requested?: number
  sources_used?: number
  articles_read?: number
  confidence?: number
}

export function buildMeta(opts: Partial<ApiMeta> & { source: ApiMeta['source']; startedAt?: number }): ApiMeta {
  const startedAt = opts.startedAt ?? Date.now()
  return {
    source: opts.source,
    ts: new Date().toISOString(),
    latency_ms: Date.now() - startedAt,
    warnings: opts.warnings || [],
    methodology_version: METHODOLOGY_VERSION,
    sources_requested: opts.sources_requested,
    sources_used: opts.sources_used,
    articles_read: opts.articles_read,
    confidence: opts.confidence,
  }
}
