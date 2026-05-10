'use client'
import { useState, useEffect, useCallback } from 'react'
import { narrativaApi } from '@/lib/api/narrativa'
import type { CommunicationIntelSnapshot } from '@/types/narrativa'

export function useCommIntel(pollingMs = 120_000) {
  const [snapshot, setSnapshot] = useState<CommunicationIntelSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    narrativaApi.getCommIntel()
      .then(setSnapshot)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, pollingMs)
    return () => clearInterval(id)
  }, [load, pollingMs])

  return { snapshot, loading, refetch: load }
}
