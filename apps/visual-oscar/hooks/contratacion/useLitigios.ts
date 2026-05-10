'use client'
import { useState, useEffect, useCallback } from 'react'
import { contratacionApi } from '@/lib/api/contratacion'
import type { LitigiosSnapshot } from '@/types/contratacion'

export function useLitigios() {
  const [data, setData] = useState<LitigiosSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(() => {
    contratacionApi.getLitigios()
      .then(r => { setData(r); setError(null) })
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
