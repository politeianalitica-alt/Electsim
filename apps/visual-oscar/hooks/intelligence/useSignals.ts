'use client'
import { useState, useEffect, useCallback } from 'react'
import { intelligenceApi } from '@/lib/api/intelligence'
import type { SignalsSnapshot, RiskDominio, NivelRelevancia } from '@/types/intelligence'

export function useSignals(filters?: { dominio?: RiskDominio; relevancia?: NivelRelevancia }) {
  const [data, setData] = useState<SignalsSnapshot | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    setIsLoading(true)
    intelligenceApi.getSignals(filters)
      .then(d => { setData(d); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  useEffect(() => { refetch() }, [refetch])

  return { data, isLoading, isError, refetch }
}
