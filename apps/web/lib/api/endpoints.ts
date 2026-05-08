import { api } from "./client";

export interface MorningBriefing {
  date: string;
  generated_at: string;
  executive_summary: string;
  key_alerts: Array<{ title: string; level: string; body: string }>;
  top_stories: Array<{ title: string; source: string; relevance: number; summary?: string }>;
  active_narratives: Array<{ frame_label: string; velocity: string; recommended_action?: string }>;
  risk_signals: Array<{ title: string; probability: number; impact: string; description: string }>;
  legislative_updates: Array<{ title: string; status: string; date: string }>;
  electoral_snapshot: { itpe?: number; top_parties?: Record<string, number>; trend?: string };
  three_questions: string[];
  analyst_note: string;
  mode: string;
}

export interface SystemStatus {
  database: { ok: boolean };
  modules: Record<string, { active: boolean; mode: string }>;
  llm: { available: boolean; model: string; provider: string };
  pipelines: { healthy: number; degraded: number; failed: number };
  sources: { total: number; active: number; degraded: number; down: number };
  overall_ok: boolean;
}

export interface MediaStory {
  id: string;
  title: string;
  source: string;
  url?: string;
  published_at?: string;
  language?: string;
  relevance_score: number;
  sentiment?: number;
  topics?: string[];
  entities?: string[];
}

export interface NarrativeCluster {
  id: string;
  frame_label: string;
  central_claim: string;
  lifecycle: string;
  velocity: string;
  promoters: string[];
  affected_actors: string[];
  opponents?: string[];
  article_count: number;
  dominant_emotion?: string;
  recommended_action?: string;
}

export interface AlertItem {
  id: string;
  title: string;
  body: string;
  level: "low" | "medium" | "high" | "critical";
  source: string;
  created_at: string;
  read: boolean;
}

export interface TickerItem {
  text: string;
  category: string;
  color: string;
  priority: number;
  timestamp: string;
}

// ── RISK (api/routers/risk.py) ───────────────────────────────────────────────
export interface RiskKpi {
  label: string;
  value: number;
  color: "red" | "amber" | "blue" | "green";
  delta?: number;
}

export interface RiskSummary {
  score: number;
  banda: string;
  confianza: number;
  kpis: RiskKpi[];
  updated_at: string;
  mode: "real" | "fallback" | "demo";
}

export interface HeatmapData {
  dimensions: string[];
  severities: string[];
  matrix: Record<string, Record<string, number>>;
}

export interface RiskSignal {
  title: string;
  probability: number;
  impact: string;
  description: string;
  area: string;
  url?: string;
  source?: string;
  sentiment?: string;
  scraped_at?: string;
}

export interface RiskHistoryPoint {
  date: string;
  score: number;
}

// ── GEOPOLITICA (api/routers/geopolitica.py) ─────────────────────────────────
export interface CountryRisk {
  code: string;
  name: string;
  risk: number;
  status: "war" | "tense" | "watch";
  delta_7d: number;
  n_articles_7d: number;
  n_negative: number;
  n_high_impact: number;
}

export interface GeoEvent {
  date: string;
  country: string;
  type: string;
  description: string;
  impact: number;
  url?: string;
  source?: string;
  spain_impact?: string;
  title: string;
}

export interface SpainPresence {
  territory: string;
  status: string;
  level: "high" | "medium" | "low";
  last_updated?: string;
  context?: string;
}

export interface GeoKPIs {
  eventos_criticos_24h: number;
  paises_escalada_7d: number;
  conflictos_activos: number;
  fuentes_internacionales: number;
  impacto_espana_alto_7d: number;
  updated_at: string;
}

// ── INTELLIGENCE (api/routers/intelligence.py) — endpoints reales del back ──
export interface PersonaPublica {
  id: string;
  nombre_completo: string;
  tipo?: string;
  partido?: string;
  cargo_actual?: string;
  ambito?: string;
  score_influencia?: number;
  score_riesgo?: number;
  sentimiento_actual?: number;
  tendencia_sentimiento?: string;
  foto_url?: string;
}

export interface PersonaGrafo {
  nodes: Array<{ id: string; type: string; label?: string }>;
  edges: Array<{ id: string; source: string; target: string; label: string; weight: number }>;
  root: string;
}

export interface IntelligenceSignal {
  id: string;
  tipo: string;
  urgencia: number;
  titulo: string;
  resumen?: string;
  modulo_origen?: string;
  created_at: string;
}

export interface LegislationItem {
  id: string;
  titulo: string;
  nivel: string;
  status?: string;
  ai_category?: string;
  ai_impact_level?: string;
  ai_relevance?: number;
  published_at?: string;
  scheduled_date?: string;
  sectores_afectados?: string[];
  url?: string;
}

export interface RiskIndexComponents {
  senales_criticas_24h: number;
  leyes_alto_impacto_7d: number;
  sentimiento_politicos: number;
  iniciativas_pendientes: number;
}

export interface RiskIndex {
  score: number;
  nivel: string;
  componentes: RiskIndexComponents;
  timestamp: string;
}

export interface PersonaMencion {
  id: string;
  title: string;
  url?: string;
  source: string;
  sentiment?: string;
  date?: string;
  summary?: string;
}

export interface SwingDistrict {
  seccion_id?: string;
  municipio?: string;
  nombre?: string;
  ccaa?: string;
  provincia?: string;
  partido_a?: string;
  partido_b?: string;
  pct_a?: number;
  pct_b?: number;
  margen?: number;
  swing_score?: number;
  // Legacy/alternate fields the backend may use
  pp?: number; psoe?: number; vox?: number; sumar?: number;
}

export interface PropensityOportunidad {
  partido: string;
  umbral: number;
  n_secciones: number;
  secciones: Array<{
    seccion_id: string;
    municipio?: string;
    ccaa?: string;
    delta?: number;
    roi?: number;
  }>;
}

// ── ACTORS (api/routers/actors.py) ───────────────────────────────────────────
export interface Actor {
  id: string;
  name: string;
  party: string | null;
  party_color: string;
  role: string | null;
  bio: string | null;
  photo_url?: string | null;
  source: string;
  relevance_score: number;
  exposure: number;
  approval: number;
  sentiment: "up" | "down" | "stable";
  mention_count_24h: number;
  mention_count_7d: number;
  is_active: boolean;
  auto_created: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActorRelation {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  label: string;
}

export interface ActorGraphData {
  nodes: ActorGraphNode[];
  edges: ActorGraphEdge[];
}

export interface ActorMention {
  id: string;
  title: string;
  url?: string;
  source?: string;
  published_at?: string;
  sentiment?: number;
  relevance: number;
  summary?: string;
}

export interface ActorNarrative {
  id: string;
  frame_label: string;
  description?: string;
  lifecycle: string;
  velocity: string;
  intensity: number;
  first_seen_at: string;
  last_seen_at: string;
}

export interface ActorGraphNode {
  id: string;
  name: string;
  party: string;
  color: string;
  role: string;
  relevance: number;
  exposure: number;
  sentiment: string;
  mentions_24h: number;
  group: string;
  // New enriched fields:
  mention_count_7d?: number;
  approval?: number;
  bio?: string;
  photo_url?: string;
  trending?: boolean;
  risk_score?: number;
  top_narrative?: string;
  last_mention_at?: string;
}

export interface ActorGraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  label: string;
  // New fields:
  co_mentions_72h?: number;
  sentiment_delta?: number;
  last_seen_at?: string;
  evidence_url?: string;
}

export interface ActorDossier {
  actor: Actor & {
    risk_score?: number;
    top_narrative?: string;
    last_mention_at?: string;
    trending?: boolean;
    intelligence?: {
      score_influencia?: number;
      score_riesgo?: number;
      cargo_actual?: string;
      foto_url?: string;
    } | null;
  };
  mentions: ActorMention[];
  history: Array<{ score: number; date: string }>;
  narratives: ActorNarrative[];
  co_mentions: Array<{
    actor_id: string;
    name: string;
    party?: string;
    party_color?: string;
    co_count: number;
    last_seen_at?: string;
  }>;
  sentiment_by_source: Array<{
    source: string;
    avg_sentiment: number;
    count: number;
    hostile: boolean;
  }>;
  sentiment_weekly: Array<{
    week: string;
    avg_sentiment: number;
    count: number;
  }>;
  top_keywords: string[];
  risk_signals: Array<{
    id: string;
    titulo: string;
    urgencia: number;
    tipo: string;
    created_at: string;
  }>;
}

// Cliente alternativo para rutas que NO van bajo /api (intelligence está en raíz).
// Same-origin "" → next.config.mjs proxea /intelligence/:path* → BACKEND/intelligence/:path*
const INTELLIGENCE_BASE = process.env.NEXT_PUBLIC_INTELLIGENCE_URL ?? "";
async function intel<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${INTELLIGENCE_BASE}${path}`;
  const r = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${path}`);
  return r.json();
}

export const endpoints = {
  // System
  systemStatus: () => api.get<SystemStatus>("/system/status"),
  systemHealth: () => api.get<{ ok: boolean }>("/system/health"),

  // Briefings
  morningBriefing: (workspaceId: string = "default") =>
    api.get<MorningBriefing>(`/briefings/morning?workspace_id=${encodeURIComponent(workspaceId)}`),
  briefingsList: () => api.get<MorningBriefing[]>("/briefings"),
  briefingPdf: (id: string) => api.get<{ url: string; bytes_b64?: string }>(`/briefings/${id}/pdf`),

  // Media
  mediaTopStories: (n: number = 10) => api.get<MediaStory[]>(`/media/top-stories?n=${n}`),
  mediaSourceHealth: () => api.get<{ active: number; degraded: number; down: number; sources: any[] }>("/media/source-health"),
  mediaNarratives: () => api.get<NarrativeCluster[]>("/media/narratives"),

  // Alerts
  alertsList: (unreadOnly = false) => api.get<AlertItem[]>(`/alerts?unread=${unreadOnly}`),

  // Ticker
  tickerItems: () => api.get<TickerItem[]>("/system/ticker"),

  // Workspace
  workspaceOverview: (id: string) => api.get<any>(`/workspaces/${id}/overview`),

  // Brain
  brainAsk: (question: string, context?: string) =>
    api.post<{ answer: string; model_used: string; latency_ms: number }>("/brain/chat", { question, context }),

  // Workflows
  workflowsList: () => api.get<any[]>("/workflows"),
  workflowStart: (id: string) => api.post<any>(`/workflows/${id}/start`),

  // Comms
  commsStrategy: (issue: string, context?: string, audience?: string) =>
    api.post<any>("/comms/strategy", { issue, context, audience }),

  // ── Risk (api/routers/risk.py) ─────────────────────────────────────────
  risk: {
    summary:  () => api.get<RiskSummary>("/risk/summary"),
    heatmap:  () => api.get<HeatmapData>("/risk/heatmap"),
    signals:  (top = 5) => api.get<RiskSignal[]>(`/risk/signals?top=${top}`),
    history:  (days = 30) => api.get<RiskHistoryPoint[]>(`/risk/history?days=${days}`),
    snapshot: () => api.post<{ ok: boolean; score: number; banda: string }>("/risk/snapshot"),
  },

  // ── Geopolítica (api/routers/geopolitica.py) ───────────────────────────
  geopolitica: {
    countryRisk:   () => api.get<CountryRisk[]>("/geopolitica/country-risk"),
    events:        (limit = 20) => api.get<GeoEvent[]>(`/geopolitica/events?limit=${limit}`),
    spainPresence: () => api.get<SpainPresence[]>("/geopolitica/spain-presence"),
    kpis:          () => api.get<GeoKPIs>("/geopolitica/kpis"),
  },

  // ── Intelligence (api/routers/intelligence.py · sin prefix /api) ───────
  intelligence: {
    riskIndex:        () => intel<RiskIndex>("/intelligence/risk-index"),
    riskHistory:      (n = 30) => intel<Array<{ date: string; score: number }>>(`/intelligence/risk-index/history?n=${n}`),
    personasList:     (params: { partido?: string; search?: string; limit?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.partido) qs.set("partido", params.partido);
      if (params.search)  qs.set("search", params.search);
      qs.set("limit", String(params.limit ?? 50));
      return intel<PersonaPublica[]>(`/intelligence/personas?${qs.toString()}`);
    },
    persona:          (id: string) => intel<PersonaPublica>(`/intelligence/personas/${id}`),
    personaGrafo:     (id: string, depth = 2) => intel<PersonaGrafo>(`/intelligence/personas/${id}/grafo?depth=${depth}`),
    personaMenciones: (id: string, limit = 20) => intel<PersonaMencion[]>(`/intelligence/personas/${id}/menciones?limit=${limit}`),
    signals:          (urgenciaMin = 1, sinceMinutes = 4320, limit = 50) =>
      intel<IntelligenceSignal[]>(`/intelligence/signals?urgencia_min=${urgenciaMin}&limit=${limit}&since_minutes=${sinceMinutes}`),
    legislationImpact: (params: { minRelevance?: number; daysBack?: number; level?: string; category?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.minRelevance != null) qs.set("min_relevance", String(params.minRelevance));
      if (params.daysBack != null)     qs.set("days_back",     String(params.daysBack));
      if (params.level)                qs.set("level", params.level);
      if (params.category)             qs.set("category", params.category);
      return intel<LegislationItem[]>(`/intelligence/legislation/impact?${qs.toString()}`);
    },
    swingDistricts: (partidoA: string, partidoB: string, n = 50) =>
      intel<SwingDistrict[]>(`/intelligence/propensity/swing-districts?partido_a=${partidoA}&partido_b=${partidoB}&n=${n}`),
    propensityOportunidades: (partido: string, umbral = 0.05, ccaa?: string) => {
      const qs = new URLSearchParams({ umbral: String(umbral) });
      if (ccaa) qs.set("ccaa", ccaa);
      return intel<PropensityOportunidad>(`/intelligence/propensity/oportunidades/${partido}?${qs.toString()}`);
    },
  },

  // ── Brain status (apps/visual-oscar style endpoint en politeia_v3) ─────
  brainStatus: () => api.get<{ available: boolean; model: string; mode: string }>("/brain/status"),

  // ── Actors (api/routers/actors.py · prefix /api/actors) ─────────────────
  actors: {
    list: (params?: { partido?: string; search?: string; limit?: number; only_active?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.partido) qs.set("partido", params.partido);
      if (params?.search)  qs.set("search", params.search);
      if (params?.limit != null) qs.set("limit", String(params.limit));
      if (params?.only_active === false) qs.set("only_active", "false");
      return api.get<Actor[]>(`/actors${qs.toString() ? "?" + qs : ""}`);
    },
    graph: (params?: { min_weight?: number; relation_type?: string; partido?: string; limit_nodes?: number }) => {
      const qs = new URLSearchParams();
      if (params?.min_weight != null)    qs.set("min_weight", String(params.min_weight));
      if (params?.relation_type)         qs.set("relation_type", params.relation_type);
      if (params?.partido)               qs.set("partido", params.partido);
      if (params?.limit_nodes != null)   qs.set("limit_nodes", String(params.limit_nodes));
      return api.get<ActorGraphData>(`/actors/graph${qs.toString() ? "?" + qs : ""}`);
    },
    get:        (id: string) => api.get<Actor>(`/actors/${encodeURIComponent(id)}`),
    dossier:    (id: string) => api.get<ActorDossier>(`/actors/${encodeURIComponent(id)}/dossier`),
    mentions:   (id: string, limit = 20) => api.get<ActorMention[]>(`/actors/${encodeURIComponent(id)}/mentions?limit=${limit}`),
    narratives: (id: string) => api.get<ActorNarrative[]>(`/actors/${encodeURIComponent(id)}/narratives`),
    history:    (id: string, n = 30) => api.get<Array<{ score: number; date: string }>>(`/actors/${encodeURIComponent(id)}/history?n=${n}`),
    create:     (body: { name: string; party: string; role: string; bio: string }) => api.post<Actor>(`/actors`, body),
    triggerDiscovery: (lookbackHours = 48, minMentions = 3) =>
      api.post<{ created: number; ids: string[]; ingest: any; scores: any; relations: any }>(
        `/actors/trigger-discovery?lookback_hours=${lookbackHours}&min_mentions=${minMentions}`, {},
      ),
  },
};
