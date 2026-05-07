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

// Cliente alternativo para rutas que NO van bajo /api (intelligence está en raíz)
const INTELLIGENCE_BASE = process.env.NEXT_PUBLIC_INTELLIGENCE_URL || "/api"; // pasa por rewrites
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
    personasList:     (params: { partido?: string; search?: string; limit?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.partido) qs.set("partido", params.partido);
      if (params.search)  qs.set("search", params.search);
      qs.set("limit", String(params.limit ?? 50));
      return intel<PersonaPublica[]>(`/intelligence/personas?${qs.toString()}`);
    },
    personaGrafo:     (id: string, depth = 2) => intel<PersonaGrafo>(`/intelligence/personas/${id}/grafo?depth=${depth}`),
    signals:          (urgenciaMin = 1, limit = 50) => intel<IntelligenceSignal[]>(`/intelligence/signals?urgencia_min=${urgenciaMin}&limit=${limit}&since_minutes=4320`),
    legislationImpact: (params: { minRelevance?: number; daysBack?: number; level?: string; category?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.minRelevance != null) qs.set("min_relevance", String(params.minRelevance));
      if (params.daysBack != null)     qs.set("days_back",     String(params.daysBack));
      if (params.level)                qs.set("level", params.level);
      if (params.category)             qs.set("category", params.category);
      return intel<LegislationItem[]>(`/intelligence/legislation/impact?${qs.toString()}`);
    },
  },

  // ── Brain status (apps/visual-oscar style endpoint en politeia_v3) ─────
  brainStatus: () => api.get<{ available: boolean; model: string; mode: string }>("/brain/status"),
};
