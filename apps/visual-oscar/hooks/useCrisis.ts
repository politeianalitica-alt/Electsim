'use client'

import { useApi } from '@/lib/useApi'
import type { Crisis, Playbook } from '@/data/crisis-fixture'

interface CrisisData {
  crisis: Crisis[]
  playbooks: Playbook[]
}

export function useCrisis() {
  const { data, loading, error, source, updatedAt, warnings, refresh, isLive } =
    useApi<CrisisData>('/api/crisis', { refreshInterval: 5 * 60_000 })

  return {
    crisis: data?.crisis ?? [],
    playbooks: data?.playbooks ?? [],
    loading,
    error,
    source,
    isLive,
    warnings,
    updatedAt,
    refresh,
  }
}
