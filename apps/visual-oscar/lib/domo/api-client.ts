import type {
  DataSource, SyncRun,
  Pipeline, PipelineRun,
  Dataset, DatasetPreview, DatasetQueryResult,
  Dashboard, ChartConfig,
  AlertRule, AlertTrigger,
  Job, JobStep,
  DataQualityCheck, DataLineage,
  AIQuerySession, AIQueryMessage,
  DomoStats, PaginatedResponse,
} from '@/types/domo'

// Toda la pila de Domo se proxy-fea a través de /api/domo/* (rutas Next.js).
// Esas rutas internas hacen el fallback al backend FastAPI o devuelven mocks.
const BASE = '/api/domo'

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
  // URL para descarga directa (no JSON)
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
  create: (data: Partial<ChartConfig>) =>
    fetchDomo<ChartConfig>('/charts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ChartConfig>) =>
    fetchDomo<ChartConfig>(`/charts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string)                => fetchDomo<void>(`/charts/${id}`, { method: 'DELETE' }),
  getData: (id: string, filters?: Record<string, unknown>) =>
    fetchDomo<{ x: unknown[]; y: unknown[]; [k: string]: unknown }>(
      `/charts/${id}/data`,
      filters ? { method: 'POST', body: JSON.stringify(filters) } : undefined,
    ),
}

// ─── Alertas ─────────────────────────────────────────────────────────────────
export const alertsApi = {
  list:   ()                                  => fetchDomo<AlertRule[]>('/alertas'),
  get:    (id: string)                        => fetchDomo<AlertRule>(`/alertas/${id}`),
  create: (data: Partial<AlertRule>)          => fetchDomo<AlertRule>('/alertas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<AlertRule>) =>
    fetchDomo<AlertRule>(`/alertas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string)                        => fetchDomo<void>(`/alertas/${id}`, { method: 'DELETE' }),
  getTriggers: (id: string)                   => fetchDomo<AlertTrigger[]>(`/alertas/${id}/triggers`),
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

// ─── Gobernanza ──────────────────────────────────────────────────────────────
export const governanceApi = {
  getChecks: (datasetId: string)              => fetchDomo<DataQualityCheck[]>(`/governance/${datasetId}/checks`),
  createCheck: (datasetId: string, data: Partial<DataQualityCheck>) =>
    fetchDomo<DataQualityCheck>(`/governance/${datasetId}/checks`, { method: 'POST', body: JSON.stringify(data) }),
  updateCheck: (datasetId: string, checkId: string, data: Partial<DataQualityCheck>) =>
    fetchDomo<DataQualityCheck>(`/governance/${datasetId}/checks/${checkId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCheck: (datasetId: string, checkId: string) =>
    fetchDomo<void>(`/governance/${datasetId}/checks/${checkId}`, { method: 'DELETE' }),
  runChecks:        (datasetId: string)       => fetchDomo<DataQualityCheck[]>(`/governance/${datasetId}/run`, { method: 'POST' }),
  getGlobalLineage: ()                        => fetchDomo<DataLineage>('/governance/lineage'),
}

// ─── AI Query ────────────────────────────────────────────────────────────────
export const aiQueryApi = {
  getSessions:   ()                           => fetchDomo<AIQuerySession[]>('/ai-query/sessions'),
  getSession:    (id: string)                 => fetchDomo<AIQuerySession>(`/ai-query/sessions/${id}`),
  createSession: (contextTables: string[])    =>
    fetchDomo<AIQuerySession>('/ai-query/sessions', { method: 'POST', body: JSON.stringify({ contextTables }) }),
  sendMessage:   (sessionId: string, message: string) =>
    fetchDomo<AIQueryMessage>(`/ai-query/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: message }),
    }),
  deleteSession: (id: string)                 => fetchDomo<void>(`/ai-query/sessions/${id}`, { method: 'DELETE' }),
}
