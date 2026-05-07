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
  systemStatus: () => api.get<SystemStatus>("/api/system/status"),
  systemHealth: () => api.get<{ ok: boolean }>("/api/system/health"),

  // Briefings
  morningBriefing: (workspaceId: string = "default") =>
    api.get<MorningBriefing>(`/api/briefings/morning?workspace_id=${encodeURIComponent(workspaceId)}`),
  briefingsList: () => api.get<MorningBriefing[]>("/api/briefings"),
  briefingPdf: (id: string) => api.get<{ url: string; bytes_b64?: string }>(`/api/briefings/${id}/pdf`),

  // Media
  mediaTopStories: (n: number = 10) => api.get<MediaStory[]>(`/api/media/top-stories?n=${n}`),
  mediaSourceHealth: () => api.get<{ active: number; degraded: number; down: number; sources: any[] }>("/api/media/source-health"),
  mediaNarratives: () => api.get<NarrativeCluster[]>("/api/media/narratives"),

  // Alerts
  alertsList: (unreadOnly = false) => api.get<AlertItem[]>(`/api/alerts?unread=${unreadOnly}`),

  // Ticker
  tickerItems: () => api.get<TickerItem[]>("/api/system/ticker"),

  // Workspace
  workspaceOverview: (id: string) => api.get<any>(`/workspaces/${id}/overview`),

  // Brain
  brainAsk: (question: string, context?: string) =>
    api.post<{ answer: string; model?: string; model_used?: string; latency_ms?: number }>("/api/brain/chat", { question, context, use_llm: true }),

  // Workflows
  workflowsList: () => api.get<any[]>("/workflows"),
  workflowStart: (id: string) => api.post<any>(`/workflows/${id}/start`),

  // Comms
  commsStrategy: (issue: string, context?: string, audience?: string) =>
    api.post<any>("/api/comms/strategy", { issue, context, audience }),

  // Draft Studio — generate via Brain
  draftGenerate: (params: { format: string; tono: string; audiencia: string; brief: string }) => {
    const formatLabels: Record<string, string> = {
      nota: "nota de prensa", email: "email político", post: "post para redes sociales",
      discurso: "fragmento de discurso político", web: "texto para página web"
    };
    const label = formatLabels[params.format] || params.format;
    const question = `Genera una ${label} con tono "${params.tono}" para audiencia "${params.audiencia}". Brief: ${params.brief}. Devuelve únicamente el texto del borrador, sin explicaciones adicionales.`;
    return api.post<{ answer: string; model_used?: string; mode?: string }>("/api/brain/chat", { question, use_llm: true });
  },

  // Actors — main endpoint at /api/actors
  actorsList: (params?: { partido?: string; q?: string; search?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.partido) qs.set("partido", params.partido);
    if (params?.q) qs.set("search", params.q);
    if (params?.search) qs.set("search", params.search);
    if (params?.limit) qs.set("limit", String(params.limit));
    return api.get<any>(`/api/actors${qs.toString() ? "?" + qs : ""}`);
  },
  actorsTop: (n = 10, campo: "influencia" | "riesgo" = "influencia") =>
    api.get<any>(`/api/actors?limit=${n}&campo=${campo}`),
  actorDetail: (id: string) => api.get<Actor & Record<string, any>>(`/api/actors/${id}`),
  actorsDashboard: () => api.get<Record<string, number>>("/api/actors/dashboard"),

  signalsActivas: (urgenciaMin?: number) => {
    const qs = urgenciaMin ? `?urgencia_min=${urgenciaMin}` : "";
    return api.get<any>(`/api/analysis/signals${qs}`);
  },
  signalMarkRead: (id: string) => api.post<{ ok: boolean }>(`/api/analysis/signals/${id}/mark-read`),
  signalRunEngine: () => api.post<Record<string, any>>("/api/analysis/refresh", {}),

  organizacionesList: (tipo?: string) =>
    api.get<Organizacion[]>(`/api/actors${tipo ? `?tipo=${tipo}` : ""}`),
  relacionesGrafo: () => api.get<{ nodes: any[]; edges: any[] }>("/api/actors/graph"),

  // Block 4 — Legislation
  legislationList: (params?: { fuente?: string; tipo?: string; estado?: string; dias?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.fuente) qs.set("fuente", params.fuente);
    if (params?.tipo) qs.set("tipo", params.tipo);
    if (params?.estado) qs.set("estado", params.estado);
    if (params?.dias) qs.set("dias", String(params.dias));
    if (params?.limit) qs.set("limit", String(params.limit));
    return api.get<LegislationItem[]>(`/api/v1/legislation/${qs.toString() ? "?" + qs : ""}`);
  },
  legislationDetail: (id: number) => api.get<LegislationItem & Record<string, any>>(`/api/v1/legislation/${id}`),
  legislationTramite: () => api.get<LegislationItem[]>("/api/v1/legislation/tramite/activas"),
  legislationStats: () => api.get<LegislationStats>("/api/v1/legislation/estadisticas/dashboard"),
  legislationSearch: (q: string, topK = 10) =>
    api.get<LegislationItem[]>(`/api/v1/legislation/buscar/semantico?q=${encodeURIComponent(q)}&top_k=${topK}`),
  legislationSectorImpact: (dias = 90) =>
    api.get<any[]>(`/api/v1/legislation/sectores/impacto?dias=${dias}`),

  // Block 5 — OSINT (uses media narratives as fallback since dedicated OSINT endpoint unavailable)
  osintNarrativas: (params?: { tipo?: string; minRiesgo?: number; horas?: number }) => {
    void params;
    return api.get<NarrativeCluster[]>("/api/media/narratives");
  },
  osintKpis: () => api.get<OsintKpis>("/api/media/source-health"),
  osintAlertas: (horas = 72) => api.get<any[]>(`/api/alerts?horas=${horas}`),
  osintTopActores: (horas = 24) => api.get<any[]>(`/api/actors?limit=10&horas=${horas}`),
  osintHashtag: (tag: string, _horas = 24) =>
    api.get<any>(`/api/analysis/hub?q=${encodeURIComponent(tag)}`),

  // Nowcasting
  nowcastingCurrent: () => api.get<NowcastingEstimate[]>("/api/v1/nowcasting/current"),
  nowcastingSerie: (partido: string, dias = 90) =>
    api.get<{ fecha_estimacion: string; estimacion_pct: number; ic_95_inf: number; ic_95_sup: number }[]>(
      `/api/v1/nowcasting/serie/${encodeURIComponent(partido)}?dias=${dias}`
    ),
  nowcastingCasas: () => api.get<any[]>("/api/v1/nowcasting/casas/cobertura"),

  // Coaliciones
  coalicionesViables: () => api.get<CoalicionData>("/api/v1/coaliciones/viables"),
  coalicionesVotos: () => api.get<any[]>("/api/v1/coaliciones/votos"),

  // Macroeconomía
  macroUltimo: () => api.get<MacroIndicadores>("/api/v1/macro/ultimo"),

  // KPIs operativos
  kpisPulso: () => api.get<KpiPulso[]>("/api/v1/kpis/pulso-operativo"),

  // Ticker (live)
  tickerLive: () => api.get<TickerItem[]>("/api/system/ticker"),

  // Geopolitica
  geoEventos: (dias = 7) => api.get<any[]>(`/api/v1/geopolitica/eventos?dias=${dias}`),
  geoRiesgoPais: () => api.get<any[]>("/api/v1/geopolitica/riesgo-pais"),
  geoPresenciaEspana: () => api.get<any[]>("/api/v1/geopolitica/presencia-espana"),
  geoKpis: () => api.get<Record<string, number>>("/api/v1/geopolitica/kpis"),

  // Briefings v2 (full document management)
  briefingsListV2: (params?: { limit?: number; workspace_id?: string; briefing_type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.workspace_id) qs.set("workspace_id", params.workspace_id);
    if (params?.briefing_type) qs.set("briefing_type", params.briefing_type);
    return api.get<{ items: any[]; total: number }>(`/api/briefings/v2${qs.toString() ? "?" + qs : ""}`);
  },
  briefingGenerate: (req: any) => api.post<any>("/api/briefings/generate", req),
  briefingDetail: (id: string) => api.get<any>(`/api/briefings/${id}/detail`),
  briefingMarkdown: (id: string) =>
    api.get<import("@/lib/types/briefings").BriefingMarkdownResponse>(`/api/briefings/${id}/markdown`),
  briefingPdfV2: (id: string) =>
    api.get<import("@/lib/types/briefings").BriefingPdfResponse>(`/api/briefings/${id}/pdf-v2`),
  electoralBriefing: (req?: any) => api.post<any>("/api/briefings/morning", req ?? {}),

  // Analysis
  analysisHub: (params?: { period?: string; workspace_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.period) qs.set("period", params.period);
    if (params?.workspace_id) qs.set("workspace_id", params.workspace_id);
    return api.get<any>(`/api/analysis/hub${qs.toString() ? "?" + qs : ""}`);
  },
  analysisRefresh: (body: any) => api.post<any>("/api/analysis/refresh", body),

  // Legislative (v2 — full CRUD)
  legislativeOverview: () => api.get<any>("/api/legislative/overview"),
  legislativeItems: (params?: { page?: number; page_size?: number; urgency?: string; sector?: string; jurisdiction?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    if (params?.urgency) qs.set("urgency", params.urgency);
    if (params?.sector) qs.set("sector", params.sector);
    if (params?.jurisdiction) qs.set("jurisdiction", params.jurisdiction);
    if (params?.search) qs.set("search", params.search);
    return api.get<any>(`/api/legislative/items${qs.toString() ? "?" + qs : ""}`);
  },
  legislativeItemDetail: (id: string) => api.get<any>(`/api/legislative/items/${id}`),

  // Risk
  riskOverviewV2: () => api.get<any>("/api/risk/overview-v2"),
  riskTimeline: (days = 30) => api.get<any[]>(`/api/risk/timeline?days=${days}`),
  riskScenarios: () => api.get<any[]>("/api/risk/scenarios"),
  riskAnalyze: (body: any) => api.post<any>("/api/risk/analyze", body),

  // Sources / Fuentes
  sourcesCoverage: () => api.get<any>("/api/sources/coverage"),
  sourcesHealth: (params?: { domain?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.domain) qs.set("domain", params.domain);
    if (params?.status) qs.set("status", params.status);
    return api.get<{ items: any[]; summary: any; mode: string }>(`/api/sources/health${qs.toString() ? "?" + qs : ""}`);
  },
  sourcesRun: (params: { source_id: string; dry_run: boolean; limit: number }) =>
    api.post<any>(`/api/sources/run`, params),
  sourcesRunAllDry: () => api.post<any>("/api/sources/run-all-dry"),
  sourcesRuns: (limit?: number) =>
    api.get<{ items: any[] }>(`/api/sources/runs${limit ? "?limit=" + limit : ""}`),

  // Brain extended
  brainStatus: () => api.get<any>("/api/brain/status"),
  brainTest: (params: { prompt: string; task_type: string }) => api.post<any>("/api/brain/test", params),
  brainEmbedTest: (params: { text: string }) => api.post<any>("/api/brain/embed-test", params),

  // Media Intelligence (new)
  mediaIntelKpis: () => api.get<any>("/api/media-intel/kpis"),
  mediaIntelFeed: (params?: {
    category?: string; bias?: string; partido?: string;
    scope?: string; page?: number; page_size?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.bias) qs.set("bias", params.bias);
    if (params?.partido) qs.set("partido", params.partido);
    if (params?.scope) qs.set("scope", params.scope);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    return api.get<{ items: any[]; total: number; page: number; page_size: number; mode: string }>(
      `/api/media-intel/feed${qs.toString() ? "?" + qs : ""}`
    );
  },
  mediaIntelBiasSpectrum: () => api.get<any[]>("/api/media-intel/bias-spectrum"),
  mediaIntelSentimentHeatmap: () => api.get<any>("/api/media-intel/sentiment-heatmap"),
  mediaIntelNarratives: () => api.get<any[]>("/api/media-intel/narratives"),
  mediaIntelMapWorld: () => api.get<any[]>("/api/media-intel/map/world"),
  mediaIntelMapEurope: () => api.get<any[]>("/api/media-intel/map/europe"),
  mediaIntelMapSpainCcaa: () => api.get<any[]>("/api/media-intel/map/spain-ccaa"),
  mediaIntelSourceHealth: () => api.get<any>("/api/media-intel/source-health"),
};
