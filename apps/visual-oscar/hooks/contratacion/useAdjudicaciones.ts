'use client'
import { useState, useEffect, useCallback } from 'react'
import { contratacionApi } from '@/lib/api/contratacion'
import type { AdjudicacionesSnapshot } from '@/types/contratacion'

export function useAdjudicaciones() {
  const [data, setData] = useState<AdjudicacionesSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(() => {
    contratacionApi.getAdjudicaciones()
      .then(r => { setData(r); setError(null) })
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
