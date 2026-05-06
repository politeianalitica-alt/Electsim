import { api } from "./client";
import type {
  BrainStatusResponse,
  BrainTestRequest,
  BrainTestResponse,
  EmbedTestRequest,
  EmbedTestResponse,
} from "@/lib/types/status";
import type {
  SourcesCatalogResponse,
  SourcesHealthResponse,
  SourcesCoverageResponse,
  SourcesRunsResponse,
  IngestionRunRequest,
  IngestionRunResult,
} from "@/lib/types/sources";
import type {
  AnalysisHubResponse,
  AnalysisSignalsResponse,
} from "@/lib/types/analysis";
import type {
  BriefingRequest,
  BriefingDocument,
  BriefingsListResponse,
  BriefingMarkdownResponse,
  BriefingPdfResponse,
} from "@/lib/types/briefings";
import type {
  BoeResponse, InitiativesResponse, LegislativeKpis,
  LegislativeOverviewResponse, LegislativeItemsResponse,
  LegislativeItemDetail, LegislativeAnalysisRequest,
  LegislativeAnalysisResponse, CalendarItem, LegislativeHeatmapCell,
} from "@/lib/types/legislative";
import type { ActorsResponse } from "@/lib/types/actors_api";
import type { RiskOverview } from "@/lib/types/risk_api";
import type {
  RiskOverviewResponse,
  RiskSignalsResponse,
  RiskAnalysisRequest,
  RiskAnalysisResponse,
} from "@/lib/types/risk_rich";
import type { GeoOverview } from "@/lib/types/geopolitica_api";
import type { CoalitionOverview } from "@/lib/types/coalition_api";
import type {
  ElectoralOverviewResponse,
  SwingSimulateRequest,
  SwingSimResult,
  ElectoralBriefingRequest,
  ElectoralBriefingResponse,
} from "@/lib/types/electoral";

function toQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return "";
  const filtered = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (!filtered.length) return "";
  return "?" + filtered.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}

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

  // Brain diagnostics
  brainStatus: () => api.get<BrainStatusResponse>("/api/brain/status"),

  brainTest: (req: BrainTestRequest) =>
    api.post<BrainTestResponse>("/api/brain/test", req),

  brainEmbedTest: (req: EmbedTestRequest) =>
    api.post<EmbedTestResponse>("/api/brain/embed-test", req),

  // Sources & Ingestion
  sourcesCatalog: (params?: { domain?: string; include_disabled?: boolean }) =>
    api.get<SourcesCatalogResponse>(`/api/sources/catalog${toQuery(params)}`),

  sourcesHealth: (params?: { domain?: string; status?: string; include_disabled?: boolean }) =>
    api.get<SourcesHealthResponse>(`/api/sources/health${toQuery(params)}`),

  sourcesCoverage: () =>
    api.get<SourcesCoverageResponse>("/api/sources/coverage"),

  sourcesRuns: (limit = 50) =>
    api.get<SourcesRunsResponse>(`/api/sources/runs?limit=${limit}`),

  sourcesRun: (payload: IngestionRunRequest) =>
    api.post<IngestionRunResult>("/api/sources/run", payload),

  sourcesRunAllDry: () =>
    api.post<Record<string, unknown>>("/api/sources/run-all-dry", {}),

  // Analysis Hub
  analysisHub: (params?: { period?: string; workspace_id?: string }) =>
    api.get<AnalysisHubResponse>(`/api/analysis/hub${toQuery(params)}`),

  analysisSignals: (params?: { domain?: string; severity?: string; period?: string; limit?: number }) =>
    api.get<AnalysisSignalsResponse>(`/api/analysis/signals${toQuery(params)}`),

  analysisRefresh: (payload: { period?: string; workspace_id?: string; force?: boolean }) =>
    api.post<AnalysisHubResponse>("/api/analysis/refresh", payload),

  // Briefings v2 (Sprint 3)
  briefingGenerate: (payload: BriefingRequest) =>
    api.post<BriefingDocument>("/api/briefings/generate", payload),

  briefingPreview: (payload: BriefingRequest) =>
    api.post<BriefingDocument>("/api/briefings/preview", payload),

  briefingsListV2: (params?: { workspace_id?: string; limit?: number }) =>
    api.get<BriefingsListResponse>(`/api/briefings/v2${toQuery(params)}`),

  briefingDetail: (id: string) =>
    api.get<BriefingDocument>(`/api/briefings/${id}/detail`),

  briefingMarkdown: (id: string) =>
    api.get<BriefingMarkdownResponse>(`/api/briefings/${id}/markdown`),

  briefingPdfV2: (id: string) =>
    api.get<BriefingPdfResponse>(`/api/briefings/${id}/pdf-v2`),

  // Legislative
  legislativeBoe: (limit = 10) =>
    api.get<BoeResponse>(`/api/legislative/boe?limit=${limit}`),

  legislativeInitiatives: (limit = 20) =>
    api.get<InitiativesResponse>(`/api/legislative/initiatives?limit=${limit}`),

  legislativeKpis: () =>
    api.get<LegislativeKpis>("/api/legislative/kpis"),

  // Legislative — new endpoints
  legislativeOverview: () =>
    api.get<LegislativeOverviewResponse>("/api/legislative/overview"),

  legislativeItems: (params?: { page?: number; page_size?: number; urgency?: string; sector?: string; jurisdiction?: string; search?: string }) =>
    api.get<LegislativeItemsResponse>(`/api/legislative/items${toQuery(params)}`),

  legislativeItemDetail: (itemId: string) =>
    api.get<LegislativeItemDetail>(`/api/legislative/items/${itemId}`),

  legislativeCalendar: (days?: number) =>
    api.get<CalendarItem[]>(`/api/legislative/calendar${days ? `?days=${days}` : ""}`),

  legislativeHeatmap: () =>
    api.get<LegislativeHeatmapCell[]>("/api/legislative/heatmap"),

  legislativeAnalyze: (payload: LegislativeAnalysisRequest) =>
    api.post<LegislativeAnalysisResponse>("/api/legislative/analyze", payload),

  // Actors
  actorsList: (params?: { partido?: string; search?: string; limit?: number }) =>
    api.get<ActorsResponse>(`/api/actors${toQuery(params)}`),

  // Risk
  riskOverview: () =>
    api.get<RiskOverview>("/api/risk/overview"),

  // Risk v2 (rich)
  riskOverviewV2: () =>
    api.get<RiskOverviewResponse>("/api/risk/overview-v2"),

  riskDimensions: () =>
    api.get<{ dimensions: unknown[]; mode: string }>("/api/risk/dimensions"),

  riskSignals: (params?: { domain?: string; severity?: string; limit?: number }) =>
    api.get<RiskSignalsResponse>(`/api/risk/signals${toQuery(params)}`),

  riskCrisis: () =>
    api.get<{ crisis_signals: unknown[]; mode: string }>("/api/risk/crisis"),

  riskEarlyWarnings: () =>
    api.get<{ early_warnings: unknown[]; mode: string }>("/api/risk/early-warnings"),

  riskSpark: () =>
    api.get<{ spark: number[]; global_score: number; trend_delta: number; mode: string }>("/api/risk/spark"),

  riskScenarios: () =>
    api.get<{ scenarios: unknown[]; mode: string }>("/api/risk/scenarios"),

  riskTimeline: () =>
    api.get<{ timeline: unknown[]; mode: string }>("/api/risk/timeline"),

  riskHeatmap: () =>
    api.get<{ heatmap: unknown[]; mode: string }>("/api/risk/heatmap"),

  riskKpis: () =>
    api.get<{ kpis: unknown[]; global_score: number; mode: string }>("/api/risk/kpis"),

  riskAnalyze: (payload: RiskAnalysisRequest) =>
    api.post<RiskAnalysisResponse>("/api/risk/analyze", payload),

  riskSnapshot: () =>
    api.post<{ snapshot_id: string; timestamp: string; global_score: number; mode: string }>("/api/risk/snapshot", {}),

  // Geopolitica
  geopoliticaOverview: () =>
    api.get<GeoOverview>("/api/geopolitica/overview"),

  // Coalition
  coalitionOverview: () =>
    api.get<CoalitionOverview>("/api/coalition/overview"),

  // Electoral
  electoralOverview: () =>
    api.get<ElectoralOverviewResponse>("/api/electoral/overview"),

  electoralParties: () =>
    api.get<{ parties: unknown[]; total_seats: number; majority_threshold: number; mode: string }>("/api/electoral/parties"),

  electoralCoalitions: () =>
    api.get<{ coalitions: unknown[]; mode: string }>("/api/electoral/coalitions"),

  electoralKingmakers: () =>
    api.get<{ kingmakers: unknown[]; mode: string }>("/api/electoral/kingmakers"),

  electoralVotingPatterns: (category?: string) =>
    api.get<{ voting_records: unknown[]; mode: string }>(`/api/electoral/voting-patterns${category ? `?category=${encodeURIComponent(category)}` : ""}`),

  electoralHemicycle: () =>
    api.get<{ seats: unknown[]; total_seats: number; mode: string }>("/api/electoral/hemicycle"),

  electoralSimulate: (payload: SwingSimulateRequest) =>
    api.post<SwingSimResult>("/api/electoral/simulate", payload),

  electoralBriefing: (payload: ElectoralBriefingRequest) =>
    api.post<ElectoralBriefingResponse>("/api/electoral/briefing", payload),
};
