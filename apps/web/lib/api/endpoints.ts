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

// Block 2 — Actors & Signals
export interface Actor {
  id: string;
  nombre_completo: string;
  tipo: string;
  activo: boolean;
  cargo_actual?: string;
  partido?: string;
  circunscripcion?: string;
  ambito?: string;
  foto_url?: string;
  wikidata_id?: string;
  score_influencia: number;
  score_riesgo: number;
  sentimiento_actual: number;
  tendencia_sentimiento?: string;
  ultima_mencion_media?: string;
}

export interface Signal {
  id: string;
  tipo: string;
  urgencia: number;
  titulo: string;
  resumen: string;
  personas: string[];
  orgs: string[];
  modulo_origen: string;
  leida: boolean;
  activa: boolean;
  created_at: string;
}

export interface Organizacion {
  id: string;
  nombre: string;
  tipo: string;
  sector?: string;
  ibex35: boolean;
  sede_ccaa?: string;
  score_influencia: number;
  n_personas_clave: number;
}

// Block 4 — Legislation
export interface LegislationItem {
  id: number;
  tipo?: string;
  titulo_corto?: string;
  fuente?: string;
  departamento?: string;
  estado?: string;
  rango?: string;
  numero_boe?: string;
  resumen_ejecutivo?: string;
  temas?: string[];
  sectores_afectados?: Array<{ sector: string; peso: number }>;
  score_impacto_economico?: number;
  score_impacto_empresas?: number;
  score_urgencia_cliente?: number;
  fecha_publicacion?: string;
  fecha_entrada_vigor?: string;
  grupos_favor?: string[];
  grupos_contra?: string[];
  votos_favor?: number;
  votos_contra?: number;
  url_fuente?: string;
}

export interface LegislationStats {
  hoy: number;
  semana: number;
  mes: number;
  n_boe: number;
  n_eurlex: number;
  n_ccaa: number;
  en_tramite: number;
  alta_urgencia: number;
  impacto_eco_medio?: number;
  impacto_emp_medio?: number;
}

// Block 5 — OSINT / Narratives
export interface OsintNarrativa {
  id: number;
  titulo: string;
  descripcion?: string;
  tipo?: string;
  tono?: string;
  actores_mencionados?: string[];
  hashtags_clave?: string[];
  riesgo_narrativo?: number;
  es_coordinada?: boolean;
  n_posts?: number;
  alcance_total?: number;
  velocidad_por_hora?: number;
  score_coordinacion?: number;
  plataformas?: Record<string, number>;
  fecha_deteccion?: string;
}

export interface NowcastingEstimate {
  partido: string;
  color: string;
  estimacion_pct: number;
  ic_95_inf: number;
  ic_95_sup: number;
  fecha_estimacion: string;
  n_encuestas: number;
  modelo: string;
}

export interface CoalicionData {
  seats: { partido: string; color: string; escanos: number; escanos_p5: number; escanos_p95: number }[];
  total_seats: number;
  majority: number;
  coalitions: {
    members: string[];
    total: number;
    distancia: number;
    probability: number;
    es_minima: boolean;
    conflicts: string[];
  }[];
  pivotal_party: string;
  pivotal_coalition_count: number;
  updated_at: string;
}

export interface MacroIndicadores {
  indicadores: Record<string, {
    label?: string;
    valor: number;
    variacion: number;
    unidad?: string;
    fuente: string;
    fecha: string;
  }>;
  updated_at: string;
}

export interface KpiPulso {
  label: string;
  value: number;
  format: "pct" | "num" | "score";
  delta: number;
  spark: number[];
}

export interface OsintKpis {
  posts_ultima_hora: number;
  posts_hoy: number;
  posts_toxicos: number;
  sentiment_medio: number;
  autores_unicos: number;
  n_twitter: number;
  n_telegram: number;
  narrativas_hoy: number;
  coordinadas_hoy: number;
  alto_riesgo: number;
  alertas_hoy: number;
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

  // Alerts (legacy)
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

  // Block 2 — Actors
  actorsList: (params?: { partido?: string; q?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.partido) qs.set("partido", params.partido);
    if (params?.q) qs.set("q", params.q);
    if (params?.limit) qs.set("limit", String(params.limit));
    return api.get<{ actors: Actor[] }>(`/actors${qs.toString() ? "?" + qs : ""}`);
  },
  actorsTop: (n = 10, campo: "influencia" | "riesgo" = "influencia") =>
    api.get<{ actors: Actor[] }>(`/actors?limit=${n}&sort=${campo}`),
  actorDetail: (id: string) => api.get<Actor & Record<string, any>>(`/actors?q=${encodeURIComponent(id)}`),
  actorsDashboard: () => api.get<Record<string, number>>("/actors"),

  signalsActivas: (urgenciaMin?: number) => {
    const qs = urgenciaMin ? `?urgencia_min=${urgenciaMin}` : "";
    return api.get<any>(`/analysis/signals${qs}`);
  },
  signalMarkRead: (id: string) => api.post<{ ok: boolean }>(`/analysis/signals`, { id, action: "mark_read" }),
  signalRunEngine: () => api.post<Record<string, any>>("/analysis/refresh", {}),

  organizacionesList: (_tipo?: string) =>
    api.get<{ actors: any[] }>("/actors"),
  relacionesGrafo: () => api.get<{ nodes: any[]; edges: any[] }>("/actors"),

  // Block 4 — Legislation
  legislationList: (params?: { fuente?: string; tipo?: string; estado?: string; dias?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.tipo) qs.set("procedure_type", params.tipo);
    if (params?.estado) qs.set("stage", params.estado);
    if (params?.limit) qs.set("limit", String(params.limit));
    return api.get<{ items: LegislationItem[]; total: number }>(`/legislative/items${qs.toString() ? "?" + qs : ""}`);
  },
  legislationDetail: (id: number) => api.get<LegislationItem & Record<string, any>>(`/legislative/items/${id}`),
  legislationTramite: () => api.get<{ items: LegislationItem[] }>("/legislative/initiatives"),
  legislationStats: () => api.get<LegislationStats>("/legislative/kpis"),
  legislationSearch: (q: string, _topK = 10) =>
    api.get<{ items: LegislationItem[] }>(`/legislative/analyze?q=${encodeURIComponent(q)}`),
  legislationSectorImpact: (_dias = 90) =>
    api.get<any>("/legislative/heatmap"),

  // Block 5 — OSINT (mapped to media narratives + alerts)
  osintNarrativas: (_params?: { tipo?: string; minRiesgo?: number; horas?: number }) =>
    api.get<NarrativeCluster[]>("/media/narratives"),
  osintKpis: () => api.get<any>("/legislative/kpis"),
  osintAlertas: (_horas = 72) => api.get<AlertItem[]>("/alerts"),
  osintTopActores: (_horas = 24) => api.get<{ actors: any[] }>("/actors"),
  osintHashtag: (_tag: string, _horas = 24) => api.get<any>("/media/narratives"),

  // Nowcasting (these paths exist on backend as /api/v1/...)
  nowcastingCurrent: () => api.get<NowcastingEstimate[]>("/v1/nowcasting/current"),
  nowcastingSerie: (partido: string, dias = 90) =>
    api.get<{ fecha_estimacion: string; estimacion_pct: number; ic_95_inf: number; ic_95_sup: number }[]>(
      `/v1/nowcasting/serie/${encodeURIComponent(partido)}?dias=${dias}`
    ),
  nowcastingCasas: () => api.get<any[]>("/v1/nowcasting/casas/cobertura"),

  // Coaliciones (these paths exist on backend as /api/v1/...)
  coalicionesViables: () => api.get<CoalicionData>("/v1/coaliciones/viables"),
  coalicionesVotos: () => api.get<any[]>("/v1/coaliciones/votos"),

  // Macroeconomía
  macroUltimo: () => api.get<MacroIndicadores>("/v1/macro/ultimo"),

  // KPIs operativos
  kpisPulso: () => api.get<KpiPulso[]>("/v1/kpis/pulso-operativo"),

  // Ticker (live)
  tickerLive: () => api.get<TickerItem[]>("/system/ticker"),

  // Geopolitica (these paths exist on backend as /api/v1/...)
  geoEventos: (dias = 7) => api.get<any[]>(`/v1/geopolitica/eventos?dias=${dias}`),
  geoRiesgoPais: () => api.get<any[]>("/v1/geopolitica/riesgo-pais"),
  geoPresenciaEspana: () => api.get<any[]>("/v1/geopolitica/presencia-espana"),
  geoKpis: () => api.get<Record<string, number>>("/v1/geopolitica/kpis"),
};
