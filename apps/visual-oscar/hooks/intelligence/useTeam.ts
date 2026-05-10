'use client'
import { useState, useEffect, useCallback } from 'react'
import { intelligenceApi } from '@/lib/api/intelligence'
import type { TeamSnapshot } from '@/types/intelligence'

export function useTeam() {
  const [data, setData] = useState<TeamSnapshot | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    setIsLoading(true)
    intelligenceApi.getTeam()
      .then(d => { setData(d); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { data, isLoading, isError, refetch }
}
