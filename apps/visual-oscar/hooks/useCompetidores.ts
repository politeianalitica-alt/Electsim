'use client'

import { useApi } from '@/lib/useApi'
import type {
  Competidor,
  WinLossEntry,
  InformeGenerado,
} from '@/data/competidores-fixture'

interface CompetidoresData {
  competidores: Competidor[]
  win_loss: WinLossEntry[]
  informes: InformeGenerado[]
}

export function useCompetidores() {
  const { data, loading, error, source, updatedAt, warnings, refresh, isLive } =
    useApi<CompetidoresData>('/api/competidores', { refreshInterval: 5 * 60_000 })

  return {
    competidores: data?.competidores ?? [],
    winLoss: data?.win_loss ?? [],
    informes: data?.informes ?? [],
    loading,
    error,
    source,
    isLive,
    warnings,
    updatedAt,
    refresh,
  }
}
