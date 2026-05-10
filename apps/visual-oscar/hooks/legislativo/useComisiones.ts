'use client'
import { useState, useEffect, useCallback } from 'react'
import { legislativoApi } from '@/lib/api/legislativo'
import type { Comision } from '@/types/legislativo'

export function useComisiones(camara?: 'congreso' | 'senado' | 'mixta') {
  const [data, setData] = useState<Comision[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    setIsLoading(true)
    legislativoApi.getComisiones(camara)
      .then(res => { setData(res.data as Comision[]); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [camara])

  useEffect(() => { refetch() }, [refetch])

  return { data, isLoading, isError, refetch }
}
