// lib/api/entities.ts · cliente para el modelo ontológico unificado.
import type {
  Entity, EntitySummary, EntitySearchResult, EntityLink,
  EntityKind, LinkKind, KindsResponse,
} from '@/types/ontology'

const BASE = '/api/entities'

async function get<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(path, { next: { revalidate } })
  if (!res.ok) throw new Error(`[entities] ${res.status} ${path}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`[entities] POST ${res.status} ${path}`)
  return res.json() as Promise<T>
}

export const entitiesApi = {
  kinds: () => get<KindsResponse>(`${BASE}/kinds`, 3600),

  search: (q: string, opts?: { kind?: EntityKind; limit?: number }) => {
    const qs = new URLSearchParams({ q })
    if (opts?.kind) qs.set('kind', opts.kind)
    if (opts?.limit) qs.set('limit', String(opts.limit))
    return get<EntitySearchResult[]>(`${BASE}/search?${qs}`, 30)
  },

  bySlug: (kind: EntityKind, slug: string) =>
    get<Entity>(`${BASE}/by-slug/${kind}/${encodeURIComponent(slug)}`, 300),

  byQid: (qid: string) =>
    get<Entity>(`${BASE}/by-qid/${encodeURIComponent(qid)}`, 300),

  byKind: (kind: EntityKind, opts?: { limit?: number; offset?: number; tags?: string[] }) => {
    const qs = new URLSearchParams()
    if (opts?.limit) qs.set('limit', String(opts.limit))
    if (opts?.offset) qs.set('offset', String(opts.offset))
    if (opts?.tags?.length) qs.set('tags', opts.tags.join(','))
    return get<EntitySummary[]>(`${BASE}/by-kind/${kind}?${qs}`, 60)
  },

  get: (id: number) => get<Entity>(`${BASE}/${id}`, 60),

  getLinks: (id: number, opts?: { direction?: 'outgoing' | 'incoming' | 'both'; linkKind?: LinkKind; activeOnly?: boolean }) => {
    const qs = new URLSearchParams()
    if (opts?.direction) qs.set('direction', opts.direction)
    if (opts?.linkKind) qs.set('link_kind', opts.linkKind)
    if (opts?.activeOnly) qs.set('active_only', '1')
    return get<EntityLink[]>(`${BASE}/${id}/links?${qs}`, 60)
  },

  create: (data: Partial<Entity> & { kind: EntityKind; slug: string; display_name: string }) =>
    post<Entity>(BASE, data),

  runBackfill: (dryRun = false) =>
    post<{ ok: boolean; dry_run: boolean; counts: Record<string, number> }>(
      `${BASE}/_backfill?dry_run=${dryRun ? '1' : '0'}`,
      {},
    ),
}
