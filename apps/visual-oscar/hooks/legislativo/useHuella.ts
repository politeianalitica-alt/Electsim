'use client'
import { useState, useEffect, useCallback } from 'react'
import { legislativoApi } from '@/lib/api/legislativo'
import type { HuellaLegislativa, EventoAgenda } from '@/types/legislativo'

export function useHuellaLegislativa(periodo?: string) {
  const [data, setData] = useState<HuellaLegislativa | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    setIsLoading(true)
    legislativoApi.getHuella(periodo)
      .then(res => { setData(res.data as HuellaLegislativa); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [periodo])

  useEffect(() => { refetch() }, [refetch])

  return { data, isLoading, isError, refetch }
}

export function useAgendaLegislativa(params?: { dias?: number; tipo?: string }) {
  const [data, setData] = useState<EventoAgenda[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const paramsKey = JSON.stringify(params ?? {})

  const refetch = useCallback(() => {
    setIsLoading(true)
    legislativoApi.getAgenda(params)
      .then(res => { setData(res.data as EventoAgenda[]); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  useEffect(() => { refetch() }, [refetch])

  return { data, isLoading, isError, refetch }
}
