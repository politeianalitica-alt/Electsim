'use client'
import { useState, useEffect, useCallback } from 'react'
import { narrativaApi } from '@/lib/api/narrativa'
import type { BriefingDiario } from '@/types/narrativa'

export function useBriefing() {
  const [briefing, setBriefing] = useState<BriefingDiario | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    narrativaApi.getBriefingDiario()
      .then(setBriefing)
      .finally(() => setLoading(false))
  }, [])

  const marcarLeido = useCallback(async (id: string) => {
    await narrativaApi.marcarBriefingLeido(id)
    setBriefing(prev =>
      prev
        ? { ...prev, items: prev.items.map(i => i.id === id ? { ...i, leido: true } : i) }
        : prev
    )
  }, [])

  useEffect(() => { load() }, [load])

  return { briefing, loading, marcarLeido, refetch: load }
}
