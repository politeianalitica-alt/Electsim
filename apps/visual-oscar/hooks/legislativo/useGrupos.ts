'use client'
import { useState, useEffect, useCallback } from 'react'
import { legislativoApi } from '@/lib/api/legislativo'
import type { GrupoParlamentario, EstadoLegislativo } from '@/types/legislativo'

export function useGrupos() {
  const [data, setData] = useState<GrupoParlamentario[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    setIsLoading(true)
    legislativoApi.getGrupos()
      .then(res => { setData(res.data as GrupoParlamentario[]); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { data, isLoading, isError, refetch }
}

export function useEstadoLegislativo() {
  const [data, setData] = useState<EstadoLegislativo | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    setIsLoading(true)
    legislativoApi.getEstado()
      .then(res => { setData(res.data); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { data, isLoading, isError, refetch }
}
