import type {
  DataSource, SyncRun,
  Pipeline, PipelineRun,
  Dataset, DatasetPreview, DatasetQueryResult,
  Dashboard, ChartConfig,
  DomoAlert, AlertTrigger,
  DomoNotification,
  DashboardShare, ShareLinkMeta, ShareRole,
  OrgMember, OrgRole, OrgTeam,
  AuditLog, ApiKey,
  QuerySession, QueryMessage,
  SystemHealth,
  DomoAnnotation, ExportJob,
  Job, JobStep,
  DataQualityCheck, DataLineage,
  DomoStats, PaginatedResponse,
} from '@/types/domo'

// Los route handlers viven en app/api/estudio/* (el alias histórico /api/domo
// nunca existió como ruta: todo el BI devolvía 404 hasta jun 2026).
const BASE = '/api/estudio'

async function fetchDomo<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Domo API error ${res.status}: ${text || path}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// Alias para mantener compat con código existente
const apiFetch = fetchDomo

// ─── Stats globales ──────────────────────────────────────────────────────────
export const domoStatsApi = {
  get: () => fetchDomo<DomoStats>('/stats'),
}

// ─── Fuentes ─────────────────────────────────────────────────────────────────
export const sourcesApi = {
  list: (params?: { page?: number; pageSize?: number; status?: string }) => {
    const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return fetchDomo<PaginatedResponse<DataSource>>(`/fuentes${qs ? `?${qs}` : ''}`)
  },
  get:    (id: string)                       => fetchDomo<DataSource>(`/fuentes/${id}`),
  create: (data: Partial<DataSource>)        => fetchDomo<DataSource>('/fuentes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<DataSource>) =>
    fetchDomo<DataSource>(`/fuentes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string)                       => fetchDomo<void>(`/fuentes/${id}`, { method: 'DELETE' }),
  sync:   (id: string)                       => fetchDomo<SyncRun>(`/fuentes/${id}/sync`, { method: 'POST' }),
  getRuns: (id: string)                      => fetchDomo<SyncRun[]>(`/fuentes/${id}/runs`),
  testConnection: (config: Partial<DataSource>) =>
    fetchDomo<{ ok: boolean; message: string }>(`/fuentes/test`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),
}

// ─── Pipelines ───────────────────────────────────────────────────────────────
export const pipelinesApi = {
  list:   ()                          => fetchDomo<Pipeline[]>('/pipeline'),
  get:    (id: string)                => fetchDomo<Pipeline>(`/pipeline/${id}`),
  create: (data: Partial<Pipeline>)   => fetchDomo<Pipeline>('/pipeline', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pipeline>) =>
    fetchDomo<Pipeline>(`/pipeline/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string)                => fetchDomo<void>(`/pipeline/${id}`, { method: 'DELETE' }),
  run:    (id: string)                => fetchDomo<PipelineRun>(`/pipeline/${id}/run`, { method: 'POST' }),
  getRuns: (id: string)               => fetchDomo<PipelineRun[]>(`/pipeline/${id}/runs`),
  preview: (id: string, nodeId?: string) =>
    fetchDomo<{ columns: string[]; rows: Record<string, unknown>[] }>(
 `/pipeline/${id}/preview${nodeId ? `?nodeId=${nodeId}` : ''}`
    ),
}

// ─── Datasets ────────────────────────────────────────────────────────────────
export const datasetsApi = {
  list:    ()                         => fetchDomo<Dataset[]>('/dataset'),
  get:     (id: string)               => fetchDomo<Dataset>(`/dataset/${id}`),
  create:  (data: Partial<Dataset>)   => fetchDomo<Dataset>('/dataset', { method: 'POST', body: JSON.stringify(data) }),
  update:  (id: string, data: Partial<Dataset>) =>
    fetchDomo<Dataset>(`/dataset/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete:  (id: string)               => fetchDomo<void>(`/dataset/${id}`, { method: 'DELETE' }),
  refresh: (id: string)               => fetchDomo<{ jobId: string }>(`/dataset/${id}/refresh`, { method: 'POST' }),
  preview: (id: string, limit = 50, offset = 0) =>
    fetchDomo<DatasetPreview>(`/dataset/${id}/preview?limit=${limit}&offset=${offset}`),
  query:   (id: string, sql: string)  =>
    fetchDomo<DatasetQueryResult>(`/dataset/${id}/query`, { method: 'POST', body: JSON.stringify({ sql }) }),
  exportUrl: (id: string, format: 'csv' | 'json' | 'parquet' = 'csv') =>
 `${BASE}/dataset/${id}/export?format=${format}`,
}

// ─── Dashboards ──────────────────────────────────────────────────────────────
export const dashboardsApi = {
  list:   ()                            => fetchDomo<Dashboard[]>('/dashboard'),
  get:    (id: string)                  => fetchDomo<Dashboard>(`/dashboard/${id}`),
  create: (data: Partial<Dashboard>)    => fetchDomo<Dashboard>('/dashboard', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Dashboard>) =>
    fetchDomo<Dashboard>(`/dashboard/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string)                  => fetchDomo<void>(`/dashboard/${id}`, { method: 'DELETE' }),
  duplicate: (id: string)               => fetchDomo<Dashboard>(`/dashboard/${id}/duplicate`, { method: 'POST' }),
  widgetData: (dashboardId: string, widgetId: string) =>
    fetchDomo<{ columns: string[]; rows: Record<string, unknown>[] }>(
 `/dashboard/${dashboardId}/widget/${widgetId}/data`
    ),
}

// ─── Charts (catálogo independiente, opcional) ───────────────────────────────
export const chartsApi = {
  list:   ()                          => fetchDomo<ChartConfig[]>('/charts'),
  get:    (id: string)                => fetchDomo<ChartConfig>(`/charts/${id}`),
}

// ─── Alertas (Sprint 6) ──────────────────────────────────────────────────────
export const alertsApi = {
  list:   ()                            => fetchDomo<DomoAlert[]>('/alert'),
  get:    (id: string)                  => fetchDomo<DomoAlert>(`/alert/${id}`),
  create: (data: Partial<DomoAlert>)    => fetchDomo<DomoAlert>('/alert', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<DomoAlert>) =>
    fetchDomo<DomoAlert>(`/alert/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string)                  => fetchDomo<void>(`/alert/${id}`, { method: 'DELETE' }),
  toggle: (id: string)                  => fetchDomo<DomoAlert>(`/alert/${id}/toggle`, { method: 'POST' }),
  testFire: (id: string)                => fetchDomo<{ fired: boolean }>(`/alert/${id}/test`, { method: 'POST' }),
  getTriggers: (id: string)             => fetchDomo<AlertTrigger[]>(`/alert/${id}/triggers`),
}

// ─── Notifications (Sprint 6) ────────────────────────────────────────────────
export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.unreadOnly) q.set('unreadOnly', '1')
    if (params?.limit) q.set('limit', String(params.limit))
    const qs = q.toString()
    return fetchDomo<DomoNotification[]>(`/notification${qs ? `?${qs}` : ''}`)
  },
  markRead: (id: string) =>
    fetchDomo<DomoNotification>(`/notification/${id}/read`, { method: 'POST' }),
  markAllRead: () => fetchDomo<void>('/notification/read-all', { method: 'POST' }),
  delete: (id: string) => fetchDomo<void>(`/notification/${id}`, { method: 'DELETE' }),
}

// ─── Dashboard Sharing (Sprint 6) ────────────────────────────────────────────
export const sharingApi = {
  listShares: (dashboardId: string) =>
    fetchDomo<DashboardShare[]>(`/dashboard/${dashboardId}/share`),
  addShare: (dashboardId: string, data: Partial<DashboardShare>) =>
    fetchDomo<DashboardShare>(`/dashboard/${dashboardId}/share`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  updateShare: (dashboardId: string, shareId: string, role: ShareRole) =>
    fetchDomo<DashboardShare>(`/dashboard/${dashboardId}/share/${shareId}`, {
      method: 'PUT', body: JSON.stringify({ role }),
    }),
  removeShare: (dashboardId: string, shareId: string) =>
    fetchDomo<void>(`/dashboard/${dashboardId}/share/${shareId}`, { method: 'DELETE' }),
  createPublicLink: (dashboardId: string, expiresInDays?: number) =>
    fetchDomo<ShareLinkMeta>(`/dashboard/${dashboardId}/share/link`, {
      method: 'POST', body: JSON.stringify({ expiresInDays }),
    }),
  revokePublicLink: (dashboardId: string) =>
    fetchDomo<void>(`/dashboard/${dashboardId}/share/link`, { method: 'DELETE' }),
}

// ─── Gobernanza (Sprint 7) ───────────────────────────────────────────────────
export const governanceApi = {
  listMembers: () => fetchDomo<OrgMember[]>('/governance/members'),
  inviteMember: (email: string, role: OrgRole) =>
    fetchDomo<OrgMember>('/governance/members', {
      method: 'POST', body: JSON.stringify({ email, role }),
    }),
  updateMemberRole: (memberId: string, role: OrgRole) =>
    fetchDomo<OrgMember>(`/governance/members/${memberId}`, {
      method: 'PUT', body: JSON.stringify({ role }),
    }),
  removeMember: (memberId: string) =>
    fetchDomo<void>(`/governance/members/${memberId}`, { method: 'DELETE' }),
  listTeams: () => fetchDomo<OrgTeam[]>('/governance/teams'),
  listAuditLogs: (params?: { limit?: number; resourceType?: string; actorId?: string }) => {
    const q = new URLSearchParams()
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.resourceType) q.set('resourceType', params.resourceType)
    if (params?.actorId) q.set('actorId', params.actorId)
    const qs = q.toString()
    return fetchDomo<AuditLog[]>(`/governance/audit${qs ? `?${qs}` : ''}`)
  },
  listApiKeys: () => fetchDomo<ApiKey[]>('/governance/api-keys'),
  createApiKey: (data: { name: string; scopes: string[]; expiresInDays?: number }) =>
    fetchDomo<ApiKey>('/governance/api-keys', {
      method: 'POST', body: JSON.stringify(data),
    }),
  revokeApiKey: (id: string) =>
    fetchDomo<void>(`/governance/api-keys/${id}`, { method: 'DELETE' }),
  getGlobalLineage: () => fetchDomo<DataLineage>('/governance/lineage'),
}

// ─── AI Query (Sprint 7) ─────────────────────────────────────────────────────
export const queryApi = {
  listSessions: () => fetchDomo<QuerySession[]>('/query/sessions'),
  getSession: (id: string) => fetchDomo<QuerySession>(`/query/sessions/${id}`),
  createSession: (datasetIds: string[]) =>
    fetchDomo<QuerySession>('/query/sessions', {
      method: 'POST', body: JSON.stringify({ datasetIds }),
    }),
  deleteSession: (id: string) =>
    fetchDomo<void>(`/query/sessions/${id}`, { method: 'DELETE' }),
  sendMessage: (sessionId: string, content: string) =>
    fetchDomo<QueryMessage>(`/query/sessions/${sessionId}/message`, {
      method: 'POST', body: JSON.stringify({ content }),
    }),
  runSql: (sessionId: string, sql: string) =>
    fetchDomo<QueryMessage['queryResult']>(`/query/sessions/${sessionId}/sql`, {
      method: 'POST', body: JSON.stringify({ sql }),
    }),
}

// ─── Jobs ────────────────────────────────────────────────────────────────────
export const jobsApi = {
  list: (params?: { type?: string; status?: string }) => {
    const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
    return fetchDomo<Job[]>(`/jobs${qs ? `?${qs}` : ''}`)
  },
  get:      (id: string)                  => fetchDomo<Job>(`/jobs/${id}`),
  getSteps: (id: string)                  => fetchDomo<JobStep[]>(`/jobs/${id}/steps`),
  cancel:   (id: string)                  => fetchDomo<void>(`/jobs/${id}/cancel`, { method: 'POST' }),
  retry:    (id: string, fromStepId?: string) =>
    fetchDomo<Job>(`/jobs/${id}/retry`, { method: 'POST', body: JSON.stringify({ fromStepId }) }),
}

// ─── Data Quality ────────────────────────────────────────────────────────────
export const qualityApi = {
  getChecks: (datasetId: string) =>
    fetchDomo<DataQualityCheck[]>(`/governance/${datasetId}/checks`),
  runChecks: (datasetId: string) =>
    fetchDomo<DataQualityCheck[]>(`/governance/${datasetId}/run`, { method: 'POST' }),
}

// ─── Health (Sprint 8) ───────────────────────────────────────────────────────
export const healthApi = {
  check: () => fetchDomo<SystemHealth>('/health'),
}

// ─── Annotations (Killer feature) ────────────────────────────────────────────
export const annotationsApi = {
  list: (scope: 'dataset' | 'dashboard' | 'widget', scopeId: string) =>
    fetchDomo<DomoAnnotation[]>(`/annotation?scope=${scope}&scopeId=${scopeId}`),
  create: (data: Partial<DomoAnnotation>) =>
    fetchDomo<DomoAnnotation>('/annotation', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchDomo<void>(`/annotation/${id}`, { method: 'DELETE' }),
}

// ─── Exports programables (Killer feature) ───────────────────────────────────
export const exportsApi = {
  list: () => fetchDomo<ExportJob[]>('/export'),
  get: (id: string) => fetchDomo<ExportJob>(`/export/${id}`),
  create: (data: Partial<ExportJob>) =>
    fetchDomo<ExportJob>('/export', { method: 'POST', body: JSON.stringify(data) }),
  run: (id: string) =>
    fetchDomo<{ status: string; fileUrl?: string }>(`/export/${id}/run`, { method: 'POST' }),
  delete: (id: string) =>
    fetchDomo<void>(`/export/${id}`, { method: 'DELETE' }),
}

// alias para Sprint 6/7/8 tests
export { fetchDomo, apiFetch }
