'use client'
import { useState, useEffect, useCallback } from 'react'
import { narrativaApi } from '@/lib/api/narrativa'
import type { MediosNarrativaSnapshot } from '@/types/narrativa'

export function useMediosNarrativa() {
  const [snapshot, setSnapshot] = useState<MediosNarrativaSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    narrativaApi.getMediosSnapshot()
      .then(setSnapshot)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return { snapshot, loading, refetch: load }
}
