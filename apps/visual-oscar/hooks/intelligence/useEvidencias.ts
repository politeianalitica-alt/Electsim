'use client'
import { useState, useEffect, useCallback } from 'react'
import { intelligenceApi } from '@/lib/api/intelligence'
import type { EvidenciaSnapshot, Evidencia, TipoFuente, ClasificacionDraft } from '@/types/intelligence'

export interface UseEvidenciasFilters {
  fuente_tipo?: TipoFuente
  clasificacion?: ClasificacionDraft
  q?: string
}

export function useEvidencias(filters?: UseEvidenciasFilters) {
  const [data, setData] = useState<EvidenciaSnapshot | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    setIsLoading(true)
    intelligenceApi.getEvidencias(filters)
      .then(d => { setData(d); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  // Stringified filters for shallow comparison
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  useEffect(() => { refetch() }, [refetch])

  return { data, isLoading, isError, refetch }
}

export function useEvidencia(id: string | null) {
  const [data, setData] = useState<Evidencia | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    if (!id) return
    setIsLoading(true)
    intelligenceApi.getEvidencia(id)
      .then(d => { setData(d); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => { if (id) refetch() }, [id, refetch])

  return { data, isLoading, isError, refetch }
}
