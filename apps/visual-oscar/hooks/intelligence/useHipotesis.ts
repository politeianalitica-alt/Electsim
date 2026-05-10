'use client'
import { useState, useEffect, useCallback } from 'react'
import { intelligenceApi } from '@/lib/api/intelligence'
import type { HipotesisACH } from '@/types/intelligence'

export function useHipotesis(canvas_id: string | null) {
  const [data, setData] = useState<HipotesisACH | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(() => {
    if (!canvas_id) return
    setIsLoading(true)
    intelligenceApi.getHipotesis(canvas_id)
      .then(d => { setData(d); setIsError(false) })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [canvas_id])

  useEffect(() => { if (canvas_id) refetch() }, [canvas_id, refetch])

  return { data, isLoading, isError, refetch }
}
