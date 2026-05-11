/**
 * Catálogo de endpoints tipados — fuente única de verdad para visual-oscar.
 *
 * Cada endpoint es una función que devuelve `ApiResult<T>` (con `data`, `meta`,
 * `isLive`, `error?`). Los componentes los consumen vía `useApiQuery` (React
 * Query) o `apiClient` directamente.
 *
 * Las rutas son las del **proxy Next.js** (`/api/*`) — el proxy reescribe a
 * FastAPI server-side. Para llamar al FastAPI directo desde un route handler,
 * usar `lib/backend.ts:fromBackend`.
 */

import { apiClient } from './client'
import type {
  ActorDossier,
  ActorGraphData,
  AlertItem,
  AlertaGeo,
  Actor,
  BrainAnswer,
  BrainStatus,
  CountryRisk,
  DashboardHome,
  GeoEvent,
  GeoKPIs,
  HeatmapData,
  IntelligenceSignal,
  LegislationItem,
  MediaStory,
  MorningBriefing,
  NarrativeCluster,
  OsintItem,
  PersonaGrafo,
  PersonaPublica,
  RiesgoPaisItem,
  RiskHistoryPoint,
  RiskIndex,
  RiskSignal,
  RiskSummary,
  SpainPresence,
  SwingDistrict,
  SystemStatus,
  TickerItem,
} from './types'

function qs(params: Record<string, unknown>): string {
  const out = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue
    if (v === '' || v === false) continue
    out.set(k, String(v))
  }
  const s = out.toString()
  return s ? '?' + s : ''
}

export const endpoints = {
  // ── System ──────────────────────────────────────────────────────────────
  system: {
    status: () => apiClient.get<SystemStatus>('/api/system/status'),
    health: () => apiClient.get<{ ok: boolean }>('/api/system/health'),
    ticker: () => apiClient.get<{ items: TickerItem[] }>('/api/system/ticker'),
  },

  // ── Dashboard home (consolidado) ───────────────────────────────────────
  dashboard: {
    home: (workspaceId: string = 'default') =>
      apiClient.get<DashboardHome>(`/api/dashboard/home${qs({ workspace_id: workspaceId })}`),
  },

  // ── Briefings ───────────────────────────────────────────────────────────
  briefings: {
    morning: (workspaceId: string = 'default') =>
      apiClient.get<MorningBriefing>(`/api/briefings/morning${qs({ workspace_id: workspaceId })}`),
    list: () => apiClient.get<MorningBriefing[]>('/api/briefings'),
    pdf:  (id: string) => apiClient.get<{ url: string; bytes_b64?: string }>(`/api/briefings/${encodeURIComponent(id)}/pdf`),
  },

  // ── Media ───────────────────────────────────────────────────────────────
  media: {
    topStories: (n: number = 10) => apiClient.get<{ items: MediaStory[] }>(`/api/media-intel/feed${qs({ n })}`),
    narratives: () => apiClient.get<{ items: NarrativeCluster[] }>('/api/narrativa/clusters'),
    sourceHealth: () =>
      apiClient.get<{ total: number; active: number; degraded: number; down: number; sources: unknown[] }>(
        '/api/media-intel/source-health',
      ),
  },

  // ── Alerts ──────────────────────────────────────────────────────────────
  alerts: {
    list: (unreadOnly = false) => apiClient.get<{ items: AlertItem[] }>(`/api/alertas${qs({ unread: unreadOnly })}`),
  },

  // ── Risk ────────────────────────────────────────────────────────────────
  risk: {
    summary: () => apiClient.get<RiskSummary>('/api/risk/summary'),
    heatmap: () => apiClient.get<HeatmapData>('/api/risk/heatmap'),
    signals: (top = 5) => apiClient.get<{ items: RiskSignal[] }>(`/api/risk/signals${qs({ top })}`),
    history: (days = 30) => apiClient.get<{ items: RiskHistoryPoint[] }>(`/api/risk/history${qs({ days })}`),
    snapshot: () => apiClient.post<{ ok: boolean; score: number; banda: string }>('/api/risk/snapshot'),
  },

  // ── Geopolítica ─────────────────────────────────────────────────────────
  geopolitica: {
    countryRisk:   () => apiClient.get<{ items: CountryRisk[] }>('/api/geopolitica/country-risk'),
    events:        (limit = 20) => apiClient.get<{ items: GeoEvent[] }>(`/api/geopolitica/events${qs({ limit })}`),
    spainPresence: () => apiClient.get<{ items: SpainPresence[] }>('/api/geopolitica/presencia'),
    kpis:          () => apiClient.get<GeoKPIs>('/api/geopolitica/kpis'),
    riesgoPais:    (params: { interes_min?: number; limit?: number } = {}) =>
      apiClient.get<{ data: RiesgoPaisItem[] }>(`/api/geopolitica/riesgo-pais${qs(params)}`),
    osintFeed:     (params: {
      horas?: number; urgencia_min?: number; relevancia_min?: number; categoria?: string; limit?: number
    } = {}) => apiClient.get<{ data: OsintItem[] }>(`/api/geopolitica/osint-feed${qs(params)}`),
    alertasGeo:    (params: { nivel?: string; limite?: number } = {}) =>
      apiClient.get<{ data: AlertaGeo[] }>(`/api/geopolitica/alertas-geo${qs(params)}`),
  },

  // ── Intelligence ────────────────────────────────────────────────────────
  intelligence: {
    riskIndex:     () => apiClient.get<RiskIndex>('/api/intelligence/risk-index'),
    riskHistory:   (n = 30) =>
      apiClient.get<{ items: Array<{ date: string; score: number }> }>(`/api/intelligence/risk-index/history${qs({ n })}`),
    signals:       (params: { urgencia_min?: number; since_minutes?: number; limit?: number } = {}) =>
      apiClient.get<{ items: IntelligenceSignal[] }>(`/api/intelligence/signals${qs(params)}`),
    personasList:  (params: { partido?: string; search?: string; limit?: number } = {}) =>
      apiClient.get<{ items: PersonaPublica[] }>(`/api/intelligence/personas${qs(params)}`),
    persona:       (id: string) => apiClient.get<PersonaPublica>(`/api/intelligence/personas/${encodeURIComponent(id)}`),
    personaGrafo:  (id: string, depth = 2) =>
      apiClient.get<PersonaGrafo>(`/api/intelligence/personas/${encodeURIComponent(id)}/grafo${qs({ depth })}`),
    legislationImpact: (params: {
      min_relevance?: number; days_back?: number; level?: string; category?: string
    } = {}) => apiClient.get<{ items: LegislationItem[] }>(`/api/intelligence/legislation/impact${qs(params)}`),
    swingDistricts: (partido_a: string, partido_b: string, n = 50) =>
      apiClient.get<{ items: SwingDistrict[] }>(
        `/api/intelligence/propensity/swing-districts${qs({ partido_a, partido_b, n })}`,
      ),
    // Para listar evidencias/fuentes/notebooks/canvas/drafts/watchlists/team:
    // mantenemos rutas existentes en visual-oscar (que se irán migrando a backend real).
    evidencias:   () => apiClient.get<{ items: unknown[] }>('/api/intelligence/evidencias'),
    fuentes:      () => apiClient.get<{ items: unknown[] }>('/api/intelligence/fuentes'),
    notebooks:    () => apiClient.get<{ items: unknown[] }>('/api/intelligence/notebooks'),
    canvas:       () => apiClient.get<{ items: unknown[] }>('/api/intelligence/canvas'),
    drafts:       () => apiClient.get<{ items: unknown[] }>('/api/intelligence/drafts'),
    watchlists:   () => apiClient.get<{ items: unknown[] }>('/api/intelligence/watchlists'),
    team:         () => apiClient.get<{ items: unknown[] }>('/api/intelligence/team'),
    hipotesis:    () => apiClient.get<{ items: unknown[] }>('/api/intelligence/hipotesis'),
  },

  // ── Actors ──────────────────────────────────────────────────────────────
  actors: {
    list: (params: { partido?: string; search?: string; limit?: number; only_active?: boolean } = {}) =>
      apiClient.get<{ items: Actor[]; total: number }>(`/api/actors${qs(params)}`),
    graph: (params: { min_weight?: number; relation_type?: string; partido?: string; limit_nodes?: number } = {}) =>
      apiClient.get<ActorGraphData>(`/api/actors/graph${qs(params)}`),
    get:     (id: string) => apiClient.get<Actor>(`/api/actors/${encodeURIComponent(id)}`),
    dossier: (id: string) => apiClient.get<ActorDossier>(`/api/actors/${encodeURIComponent(id)}/dossier`),
    triggerDiscovery: (lookback_hours = 48, min_mentions = 3) =>
      apiClient.post<{ created: number; ids: string[] }>(
        `/api/actors/trigger-discovery${qs({ lookback_hours, min_mentions })}`,
      ),
  },

  // ── Brain (IA) ──────────────────────────────────────────────────────────
  brain: {
    status: () => apiClient.get<BrainStatus>('/api/brain/status'),
    chat:   (question: string, opts: {
      context?: string; workspace_id?: string; use_tools?: boolean; session_id?: string
    } = {}) => apiClient.post<BrainAnswer>('/api/brain/chat', { question, ...opts }),
    chatWithTools: (question: string, opts: { workspace_id?: string; session_id?: string } = {}) =>
      apiClient.post<BrainAnswer>('/api/brain/chat-with-tools', { question, ...opts }),
  },
}

export type EndpointMap = typeof endpoints
