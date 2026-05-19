// lib/api/workflows.ts · cliente del workflow registry.
import type {
  Workflow, WorkflowSummary, WorkflowResult, RunWorkflowRequest,
} from '@/types/workflows'

const BASE = '/api/workflows'

function userHeader(): HeadersInit {
  if (typeof window === 'undefined') return {}
  const uid = window.localStorage.getItem('politeia.user_id') || 'demo'
  return { 'X-User-Id': uid }
}

async function get<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(path, {
    next: { revalidate },
    headers: userHeader(),
  })
  if (!res.ok) throw new Error(`[workflows] ${res.status} ${path}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...userHeader() },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`[workflows] POST ${res.status} ${path} · ${text.slice(0, 120)}`)
  }
  return res.json() as Promise<T>
}

export const workflowsApi = {
  list: () => get<WorkflowSummary[]>(BASE, 300),
  get: (slug: string) => get<Workflow>(`${BASE}/${encodeURIComponent(slug)}`, 300),
  run: (slug: string, body: RunWorkflowRequest) =>
    post<WorkflowResult>(`${BASE}/${encodeURIComponent(slug)}/run`, body),
  dryRun: (slug: string, body: RunWorkflowRequest) =>
    post<WorkflowResult>(`${BASE}/${encodeURIComponent(slug)}/dry-run`, body),
}
