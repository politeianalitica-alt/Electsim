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
  articles: string[]                // ids de ArticleReading
  representative_titles: string[]
  first_seen: string                // ISO
  last_seen: string                 // ISO
  velocity_score: number            // articles/hour en ventana reciente
  acceleration_score: number        // delta vs ventana anterior
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
    credibility: m.credibilidad,
    rss_url: m.rss,
    web: m.web,
    has_rss: !!m.rss,
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

const FIGURAS_DICT: string[] = [
  'Pedro Sánchez', 'Alberto Núñez Feijóo', 'Feijóo', 'Santiago Abascal', 'Yolanda Díaz',
  'Isabel Díaz Ayuso', 'Salvador Illa', 'Carlos Mazón', 'Juanma Moreno', 'Alfonso Rueda',
  'Alfonso Fernández Mañueco', 'Pere Aragonès', 'Carles Puigdemont', 'Imanol Pradales',
  'Alejandro Soler', 'María Jesús Montero', 'Margarita Robles', 'José Luis Escrivá',
  'Nadia Calviño', 'Óscar Puente',
]

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
  { verb: 'imputa',    rx: /\b(imputa|imputado|imputada)\b/i },
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

function detectActorsList(text: string): string[] {
  const found = new Set<string>()
  for (const name of FIGURAS_DICT) {
    if (text.includes(name) || (name.includes(' ') && text.includes(name.split(' ').pop()!))) found.add(name)
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
      // sujeto de la acción
      if (negativeVerbs.includes(verb)) { sentiment = 0.1; impact = 'neutral'; reason = `sujeto que ${verb} · postura activa pero no objeto del daño`; confidence = 0.65 }
      else if (positiveVerbs.includes(verb)) { sentiment = 0.4; impact = 'beneficial'; reason = `sujeto en acción positiva (${verb})`; confidence = 0.7 }
      else { sentiment = 0.1; impact = 'neutral'; reason = `sujeto de la acción (${verb})`; confidence = 0.5 }
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

  const profile = mediumProfile || profileFromCatalog(article.medio)
  const actors = detectActorsList(text)
  const parties = detectPartiesList(text)
  const institutions = detectInstitutionsList(text)
  const companies = detectCompaniesList(text)
  const sectors = detectSectorsList(text)
  const territories = detectCCAAList(text)

  const frame = detectFrame(text)
  const action_verb = detectActionVerb(text)
  const main_topic = detectMainTopic(text, sectors, frame)

  // Heurística sujeto/objeto: primer actor (o partido) que precede al verbo es sujeto, el siguiente es objeto
  const entityOrder: string[] = [...actors, ...parties, ...institutions]
  const lowerHeadline = headline.toLowerCase()
  let action_subject: string | null = null
  let action_object: string | null = null
  // Buscamos verbo en headline y separamos pre/post
  const verbMatch = ACTION_VERB_RX.find((v) => v.rx.test(lowerHeadline))
  if (verbMatch) {
    const m = lowerHeadline.match(verbMatch.rx)
    if (m && m.index !== undefined) {
      const pre = headline.slice(0, m.index)
      const post = headline.slice(m.index + m[0].length)
      action_subject = entityOrder.find((e) => pre.includes(e) || pre.toLowerCase().includes(e.toLowerCase())) || null
      action_object = entityOrder.find((e) => post.includes(e) || post.toLowerCase().includes(e.toLowerCase())) || null
    }
  }
  if (!action_subject && entityOrder.length > 0) action_subject = entityOrder[0]
  if (!action_object && entityOrder.length > 1 && entityOrder[1] !== action_subject) action_object = entityOrder[1]

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
// 8 · Meta builder unificado para endpoints
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
