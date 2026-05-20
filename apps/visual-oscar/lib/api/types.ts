/**
 * Tipos compartidos entre el frontend visual-oscar y el backend FastAPI.
 *
 * Esta es la **única fuente de verdad** para shapes del backend. Cualquier
 * interfaz nueva del backend debe añadirse aquí, no inline en componentes.
 *
 * Origen: portado de `apps/web/lib/api/endpoints.ts` + adiciones específicas
 * de visual-oscar. Mantén ambos archivos sincronizados (idealmente, mover a
 * `packages/types/src/api.ts` en el futuro).
 */

// ─────────────────────────────────────────────────────────────────────────────
//  Meta · cabecera estándar que añade el proxy `withMeta()` a toda respuesta
// ─────────────────────────────────────────────────────────────────────────────

/** Origen real de los datos. El operador debe distinguir backend vs. mock.
 *  - 'backend' · FastAPI propio
 *  - 'wikipedia' · agregador Wikipedia (datos electorales en vivo)
 *  - 'electocracia'· catálogo curado + electocracia.com
 *  - 'aggregator' · cualquier otro agregador externo en vivo
 *  - 'mock' · stub/jitter (no datos reales)
 *  - 'fallback' · caché stale-while-revalidate
 *  - 'error' · fallo de fetch
 */
export type DataSource =
  | 'backend' | 'wikipedia' | 'electocracia' | 'aggregator'
  | 'mock' | 'fallback' | 'error'

/** Bloque `_meta` que el proxy server-side añade a cada respuesta JSON. */
export interface ResponseMeta {
  source: DataSource
  /** ISO timestamp del momento de la respuesta. */
  ts: string
  /** Avisos no fatales (`backend_unreachable`, `auth_failed`, etc.). */
  warnings?: string[]
  /** Latencia del backend en ms (cuando proxy hace medida). */
  latency_ms?: number
}

export type WithMeta<T> = T & { _meta: ResponseMeta }

// ─────────────────────────────────────────────────────────────────────────────
//  System & briefings
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemStatus {
  database: { ok: boolean; message?: string }
  modules: Record<string, { active: boolean; mode: string }>
  llm?: { available: boolean; model: string; provider: string }
  pipelines?: { healthy: number; degraded: number; failed: number }
  sources?: { total: number; active: number; degraded: number; down: number }
  overall_ok?: boolean
}

export interface MorningBriefing {
  date: string
  generated_at: string
  tenant_id?: string
  workspace_id?: string
  executive_summary: string
  key_alerts: Array<{ title: string; level: string; body: string }>
  top_stories: Array<{ title: string; source: string; relevance: number; summary?: string; url?: string }>
  active_narratives: Array<{ frame_label: string; velocity: string; recommended_action?: string }>
  risk_signals: Array<{ title: string; probability: number; impact: string; description: string }>
  legislative_updates: Array<{ title: string; status: string; date: string }>
  electoral_snapshot: { itpe?: number; top_parties?: Record<string, number>; trend?: string }
  three_questions: string[]
  analyst_note: string
  mode: string
}

export interface TickerItem {
  text: string
  category: string
  color: string
  priority: number
  timestamp: string
}

export interface AlertItem {
  id: string
  title: string
  body: string
  level: 'low' | 'medium' | 'high' | 'critical'
  source: string
  created_at: string
  read: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
//  Media & narrativas
// ─────────────────────────────────────────────────────────────────────────────

export interface MediaStory {
  id: string
  title: string
  source: string
  url?: string
  published_at?: string
  language?: string
  relevance_score: number
  sentiment?: number
  topics?: string[]
  entities?: string[]
  summary?: string
}

export interface NarrativeCluster {
  id: string
  frame_label: string
  central_claim: string
  lifecycle: string
  velocity: string
  promoters: string[]
  affected_actors: string[]
  opponents?: string[]
  article_count: number
  dominant_emotion?: string
  recommended_action?: string
}

// ─────────────────────────────────────────────────────────────────────────────
//  Risk · /api/risk/*
// ─────────────────────────────────────────────────────────────────────────────

export interface RiskKpi {
  label: string
  value: number
  color: 'red' | 'amber' | 'blue' | 'green'
  delta?: number
}

export interface RiskSummary {
  score: number
  banda: string
  confianza: number
  kpis: RiskKpi[]
  updated_at: string
  mode: 'real' | 'fallback' | 'demo'
}

export interface HeatmapData {
  dimensions: string[]
  severities: string[]
  matrix: Record<string, Record<string, number>>
}

export interface RiskSignal {
  title: string
  probability: number
  impact: string
  description: string
  area: string
  url?: string
  source?: string
  sentiment?: string
  scraped_at?: string
}

export interface RiskHistoryPoint {
  date: string
  score: number
}

// ─────────────────────────────────────────────────────────────────────────────
//  Geopolítica · /api/geopolitica/*
// ─────────────────────────────────────────────────────────────────────────────

export interface CountryRisk {
  code: string
  name: string
  risk: number
  status: 'war' | 'tense' | 'watch'
  delta_7d: number
  n_articles_7d: number
  n_negative: number
  n_high_impact: number
}

export interface GeoEvent {
  date: string
  country: string
  type: string
  description: string
  impact: number
  url?: string
  source?: string
  spain_impact?: string
  title: string
}

export interface SpainPresence {
  territory: string
  status: string
  level: 'high' | 'medium' | 'low'
  last_updated?: string
  context?: string
}

export interface GeoKPIs {
  eventos_criticos_24h: number
  paises_escalada_7d: number
  conflictos_activos: number
  fuentes_internacionales: number
  impacto_espana_alto_7d: number
  updated_at: string
}

export interface RiesgoPaisItem {
  nombre: string
  lat_capital?: number
  lon_capital?: number
  score_total: number
  interes_espana: number
  riesgo_tendencia?: string
  flag_emoji?: string
  empresas_espanolas?: string[]
  iso3?: string
}

export interface OsintItem {
  urgencia: number
  relevancia_espana?: number
  titulo: string
  resumen_ollama?: string
  fuente?: string
  fecha_publicacion?: string
  url?: string
  categoria?: string
  paises_mencionados?: string[]
  procesado_llm?: boolean
}

export interface AlertaGeo {
  nivel: string
  titulo: string
  descripcion?: string
  paises?: string[]
  creada_en?: string
  leida?: boolean
  url_origen?: string
}

// ─────────────────────────────────────────────────────────────────────────────
//  Intelligence · /api/intelligence/*
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonaPublica {
  id: string
  nombre_completo: string
  tipo?: string
  partido?: string
  cargo_actual?: string
  ambito?: string
  score_influencia?: number
  score_riesgo?: number
  sentimiento_actual?: number
  tendencia_sentimiento?: string
  foto_url?: string
}

export interface PersonaGrafo {
  nodes: Array<{ id: string; type: string; label?: string }>
  edges: Array<{ id: string; source: string; target: string; label: string; weight: number }>
  root: string
}

export interface IntelligenceSignal {
  id: string
  tipo: string
  urgencia: number
  titulo: string
  resumen?: string
  modulo_origen?: string
  created_at: string
  url?: string
}

export interface LegislationItem {
  id: string
  titulo: string
  nivel: string
  status?: string
  ai_category?: string
  ai_impact_level?: string
  ai_relevance?: number
  published_at?: string
  scheduled_date?: string
  sectores_afectados?: string[]
  url?: string
}

export interface RiskIndexComponents {
  senales_criticas_24h: number
  leyes_alto_impacto_7d: number
  sentimiento_politicos: number
  iniciativas_pendientes: number
}

export interface RiskIndex {
  score: number
  nivel: string
  componentes: RiskIndexComponents
  timestamp: string
}

export interface SwingDistrict {
  seccion_id?: string
  municipio?: string
  nombre?: string
  ccaa?: string
  provincia?: string
  partido_a?: string
  partido_b?: string
  pct_a?: number
  pct_b?: number
  margen?: number
  swing_score?: number
}

// ─────────────────────────────────────────────────────────────────────────────
//  Actors · /api/actors/*
// ─────────────────────────────────────────────────────────────────────────────

export interface Actor {
  id: string
  name: string
  party: string | null
  party_color: string
  role: string | null
  bio: string | null
  photo_url?: string | null
  source: string
  relevance_score: number
  exposure: number
  approval: number
  sentiment: 'up' | 'down' | 'stable'
  mention_count_24h: number
  mention_count_7d: number
  is_active: boolean
  auto_created: boolean
  created_at: string
  updated_at: string
}

export interface ActorMention {
  id: string
  title: string
  url?: string
  source?: string
  published_at?: string
  sentiment?: number
  relevance: number
  summary?: string
}

export interface ActorNarrative {
  id: string
  frame_label: string
  description?: string
  lifecycle: string
  velocity: string
  intensity: number
  first_seen_at: string
  last_seen_at: string
}

export interface ActorGraphNode {
  id: string
  name: string
  party: string
  color: string
  party_color?: string
  role: string
  relevance: number
  exposure: number
  sentiment: string
  mentions_24h: number
  group: string
  mention_count_7d?: number
  approval?: number
  bio?: string
  photo_url?: string
  trending?: boolean
  risk_score?: number
  top_narrative?: string
  last_mention_at?: string
}

export interface ActorGraphEdge {
  id: string
  source: string
  target: string
  type: string
  weight: number
  label: string
  co_mentions_72h?: number
  sentiment_delta?: number
  last_seen_at?: string
  evidence_url?: string
}

export interface ActorGraphData {
  nodes: ActorGraphNode[]
  edges: ActorGraphEdge[]
}

export interface ActorEnrichment {
  wikipedia?: {
    extract?: string
    description?: string
    thumbnail_url?: string
    url?: string
  } | null
  congreso?: {
    group?: string
    comisiones?: string[]
    votaciones?: Array<{ titulo: string; fecha: string; resultado: string }>
  } | null
  boe?: { mentions_count?: number } | null
  twitter?: {
    handle?: string
    followers?: number
    tweet_count_7d?: number
    top_tweets?: Array<{ text: string; date: string; likes: number; url?: string }>
  } | null
  recent_news?: Array<{
    title: string
    url?: string
    source?: string
    published_at?: string
    summary?: string
  }>
  updated_at?: string
}

export interface ActorDossier {
  actor: Actor & {
    risk_score?: number
    top_narrative?: string
    last_mention_at?: string
    trending?: boolean
  }
  enrichment?: ActorEnrichment
  mentions: ActorMention[]
  history: Array<{ score: number; date: string }>
  narratives: ActorNarrative[]
  co_mentions: Array<{
    actor_id: string
    name: string
    party?: string
    party_color?: string
    co_count: number
    last_seen_at?: string
  }>
  sentiment_by_source: Array<{
    source: string
    avg_sentiment: number
    count: number
    hostile: boolean
  }>
  sentiment_weekly: Array<{ week: string; avg_sentiment: number; count: number }>
  top_keywords: string[]
  risk_signals: Array<{
    id: string
    titulo: string
    urgencia: number
    tipo: string
    created_at: string
  }>
}

// ─────────────────────────────────────────────────────────────────────────────
//  Brain & IA · /api/brain/*
// ─────────────────────────────────────────────────────────────────────────────

export interface BrainStatus {
  available: boolean
  model: string
  mode: string
  provider?: string
}

export interface BrainAnswer {
  answer: string
  model_used: string
  latency_ms: number
  tools_used?: string[]
  citations?: Array<{ source: string; url?: string; snippet?: string }>
}

// ─────────────────────────────────────────────────────────────────────────────
//  Dashboard home · /api/dashboard/home (agregado consolidado)
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardParty {
  id: number
  abbr: string
  name: string
  color: string
  bloque: string
  pct: number
  seats: number
  delta_7d?: number
  sparkline?: number[]
}

export interface DashboardKpi {
  key: string
  label: string
  value: number
  unit?: string
  delta?: number
  trend?: 'up' | 'down' | 'flat'
}

export interface DashboardHome {
  date: string
  workspace_id?: string
  parties: DashboardParty[]
  itpe?: number
  itpe_trend?: 'up' | 'down' | 'flat'
  kpis: DashboardKpi[]
  alerts: AlertItem[]
  top_stories: MediaStory[]
  ticker: TickerItem[]
  macro?: Record<string, { value: number; delta?: number; unit?: string; sparkline?: number[] }>
  regions?: Array<{ ccaa: string; winner: string; pct: number }>
  updated_at: string
}
