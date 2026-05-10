'use client'
import { useState, useEffect, useCallback } from 'react'
import { legislativoApi } from '@/lib/api/legislativo'
import type { VotacionPlenaria } from '@/types/legislativo'

export function useVotaciones(params?: { resultado?: string; iniciativa_id?: string; limit?: number }) {
  const [data, setData] = useState<VotacionPlenaria[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const paramsKey = JSON.stringify(params ?? {})

  const refetch = useCallback(() => {
    setIsLoading(true)
    legislativoApi.getVotaciones(params)
      .then(res => { setData(res.data as VotacionPlenaria[]); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  useEffect(() => { refetch() }, [refetch])

  return { data, isLoading, isError, refetch }
}
