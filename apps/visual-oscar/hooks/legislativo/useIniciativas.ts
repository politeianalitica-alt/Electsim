'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { legislativoApi } from '@/lib/api/legislativo'
import type { IniciativaLegislativa } from '@/types/legislativo'

interface IniciativasParams {
  tipo?: string
  estado?: string
  grupo?: string
  limit?: number
  offset?: number
}

export function useIniciativas(params?: IniciativasParams) {
  const [data, setData] = useState<IniciativaLegislativa[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  // Stable key to re-run effect when params change
  const paramsKey = JSON.stringify(params ?? {})
  const paramsKeyRef = useRef(paramsKey)
  paramsKeyRef.current = paramsKey

  const refetch = useCallback(() => {
    setIsLoading(true)
    legislativoApi.getIniciativas(params)
      .then(res => { setData(res.data as IniciativaLegislativa[]); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  useEffect(() => { refetch() }, [refetch])

  return { data, isLoading, isError, refetch }
}

export function useIniciativa(id: string | null) {
  const [data, setData] = useState<IniciativaLegislativa | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(!!id)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    if (!id) return
    setIsLoading(true)
    legislativoApi.getIniciativa(id)
      .then(res => { setData(res.data as IniciativaLegislativa); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => { if (id) refetch() }, [id, refetch])

  return { data, isLoading, isError, refetch }
}

export function useFeedLegislativo(limit = 20) {
  const [data, setData] = useState<IniciativaLegislativa[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    setIsLoading(true)
    legislativoApi.getFeed(limit)
      .then(res => { setData(res.data as IniciativaLegislativa[]); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [limit])

  useEffect(() => {
    refetch()
    const id = setInterval(refetch, 3 * 60 * 1000)
    return () => clearInterval(id)
  }, [refetch])

  return { data, isLoading, isError, refetch }
}
