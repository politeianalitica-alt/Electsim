'use client'
import { useState, useEffect, useCallback } from 'react'
import { intelligenceApi } from '@/lib/api/intelligence'
import type { WatchlistSnapshot } from '@/types/intelligence'

export function useWatchlists() {
  const [data, setData] = useState<WatchlistSnapshot | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    setIsLoading(true)
    intelligenceApi.getWatchlists()
      .then(d => { setData(d); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { data, isLoading, isError, refetch }
}
