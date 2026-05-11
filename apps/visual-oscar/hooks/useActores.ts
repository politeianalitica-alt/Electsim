'use client'

import { useApi } from '@/lib/useApi'
import type { ActorVO } from '@/lib/actor-utils'

export function useActores(opts: { cat?: string; search?: string; limit?: number } = {}) {
  const params = new URLSearchParams()
  if (opts.cat && opts.cat !== 'Todos') params.set('cat', opts.cat)
  if (opts.search) params.set('search', opts.search)
  if (opts.limit) params.set('limit', String(opts.limit))
  const qs = params.toString()
  const path = `/api/actores${qs ? '?' + qs : ''}`

  const { data, loading, error, source, updatedAt, warnings, refresh, isLive } =
    useApi<{ items: ActorVO[]; total: number }>(path, {
      refreshInterval: 5 * 60_000,  // 5 min — actores cambian lento
    })

  return {
    actores: data?.items ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    source,
    isLive,
    warnings,
    updatedAt,
    refresh,
  }
}
