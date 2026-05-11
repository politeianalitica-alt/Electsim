'use client'

import { useApi } from '@/lib/useApi'
import type { ExpedienteHuella, TopOrg, RegistroLobby } from '@/data/huella-legislativa-fixture'

interface HuellaLegislativaData {
  expedientes: ExpedienteHuella[]
  top_orgs: TopOrg[]
  registro: RegistroLobby[]
}

export function useHuellaLegislativa() {
  const { data, loading, error, source, updatedAt, warnings, refresh, isLive } =
    useApi<HuellaLegislativaData>('/api/huella-legislativa', { refreshInterval: 5 * 60_000 })

  return {
    expedientes: data?.expedientes ?? [],
    topOrgs: data?.top_orgs ?? [],
    registro: data?.registro ?? [],
    loading,
    error,
    source,
    isLive,
    warnings,
    updatedAt,
    refresh,
  }
}
