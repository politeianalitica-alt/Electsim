'use client'

import { useApi } from '@/lib/useApi'
import type {
  CCAA,
  Diputacion,
  Capital,
  Insular,
} from '@/data/instituciones-fixture'

interface InstitucionesData {
  ccaas: CCAA[]
  diputaciones: Diputacion[]
  capitales: Capital[]
  insulares: Insular[]
}

export function useInstituciones() {
  const { data, loading, error, source, updatedAt, warnings, refresh, isLive } =
    useApi<InstitucionesData>('/api/instituciones', { refreshInterval: 5 * 60_000 })

  return {
    ccaas: data?.ccaas ?? [],
    diputaciones: data?.diputaciones ?? [],
    capitales: data?.capitales ?? [],
    insulares: data?.insulares ?? [],
    loading,
    error,
    source,
    isLive,
    warnings,
    updatedAt,
    refresh,
  }
}
