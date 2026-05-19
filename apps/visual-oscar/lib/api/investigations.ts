// lib/api/investigations.ts · cliente para investigations workspace.
import type {
  Investigation, InvestigationDetail, PinnedEntity, Artifact, AnalystEvent,
  CreateInvestigationInput, ArtifactKind,
} from '@/types/investigations'

const BASE = '/api/investigations'

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
  if (!res.ok) throw new Error(`[investigations] ${res.status} ${path}`)
  return res.json() as Promise<T>
}

async function send<T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...userHeader() },
  }
  if (body !== undefined) init.body = JSON.stringify(body)
  const res = await fetch(path, init)
  if (!res.ok) throw new Error(`[investigations] ${method} ${res.status} ${path}`)
  return res.json() as Promise<T>
}

export const investigationsApi = {
  list: (opts?: { status?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (opts?.status) qs.set('status', opts.status)
    if (opts?.limit) qs.set('limit', String(opts.limit))
    const sep = qs.toString() ? `?${qs}` : ''
    return get<Investigation[]>(`${BASE}${sep}`, 30)
  },

  create: (data: CreateInvestigationInput) =>
    send<Investigation>('POST', BASE, {
      ...data,
      owner_id: typeof window !== 'undefined'
        ? (window.localStorage.getItem('politeia.user_id') || 'demo')
        : 'demo',
      status: 'active',
    }),

  get: (id: number) => get<InvestigationDetail>(`${BASE}/${id}`, 15),

  getBySlug: (slug: string) =>
    get<InvestigationDetail>(`${BASE}/by-slug/${encodeURIComponent(slug)}`, 15),

  update: (id: number, patch: Partial<Investigation>) =>
    send<Investigation>('PATCH', `${BASE}/${id}`, patch),

  archive: (id: number) => send<{ ok: boolean; id: number }>('POST', `${BASE}/${id}/archive`),

  pinEntity: (id: number, entityId: number, opts?: { note?: string; position?: number }) =>
    send<PinnedEntity>('POST', `${BASE}/${id}/pin`, {
      entity_id: entityId, note: opts?.note ?? '', position: opts?.position ?? 0,
    }),

  unpinEntity: (id: number, entityId: number) =>
    send<{ ok: boolean }>('DELETE', `${BASE}/${id}/pin/${entityId}`),

  addArtifact: (id: number, data: {
    artifact_kind: ArtifactKind; title?: string; payload?: Record<string, unknown>;
    entity_refs?: number[]; position?: number;
  }) =>
    send<Artifact>('POST', `${BASE}/${id}/artifacts`, {
      ...data,
      author_id: typeof window !== 'undefined'
        ? (window.localStorage.getItem('politeia.user_id') || 'demo')
        : 'demo',
    }),

  listArtifacts: (id: number, opts?: { kind?: ArtifactKind; includeArchived?: boolean }) => {
    const qs = new URLSearchParams()
    if (opts?.kind) qs.set('kind', opts.kind)
    if (opts?.includeArchived) qs.set('include_archived', '1')
    const sep = qs.toString() ? `?${qs}` : ''
    return get<Artifact[]>(`${BASE}/${id}/artifacts${sep}`, 15)
  },

  events: (id: number, limit = 50) =>
    get<AnalystEvent[]>(`${BASE}/${id}/events?limit=${limit}`, 15),

  recordEvent: (id: number, body: { verb: string; target_kind?: string; target_id?: number; entity_id?: number; payload?: Record<string, unknown> }) =>
    send<{ ok: boolean }>('POST', `${BASE}/${id}/events`, body),
}
