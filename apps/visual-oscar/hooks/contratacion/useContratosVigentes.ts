'use client'
import { useState, useEffect, useCallback } from 'react'
import { contratacionApi } from '@/lib/api/contratacion'
import type { ContratosVigentesSnapshot } from '@/types/contratacion'

export function useContratosVigentes() {
  const [data, setData] = useState<ContratosVigentesSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(() => {
    contratacionApi.getContratosVigentes()
      .then(r => { setData(r); setError(null) })
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
