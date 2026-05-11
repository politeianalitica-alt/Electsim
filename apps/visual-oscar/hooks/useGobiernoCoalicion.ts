'use client'

import { useApi } from '@/lib/useApi'
import type {
  Ministro,
  Apoyo,
  Hito,
} from '@/data/gobierno-coalicion-fixture'

interface GobiernoCoalicionData {
  presidente: Ministro
  vicepresidencias: Ministro[]
  ministros: Ministro[]
  apoyos: Apoyo[]
  hitos: Hito[]
}

export function useGobiernoCoalicion() {
  const { data, loading, error, source, updatedAt, warnings, refresh, isLive } =
    useApi<GobiernoCoalicionData>('/api/gobierno-coalicion', { refreshInterval: 5 * 60_000 })

  return {
    presidente: data?.presidente ?? null,
    vicepresidencias: data?.vicepresidencias ?? [],
    ministros: data?.ministros ?? [],
    apoyos: data?.apoyos ?? [],
    hitos: data?.hitos ?? [],
    loading,
    error,
    source,
    isLive,
    warnings,
    updatedAt,
    refresh,
  }
}
