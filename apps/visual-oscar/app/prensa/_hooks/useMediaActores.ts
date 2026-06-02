'use client'
/**
 * useMediaActores · Sprint 0.5
 *
 * Hook cliente para métricas por actor (entityId) que consume
 * /api/medios/actores/{entityId}/metricas. Sprint 3 enriquece el shape
 * con ProminenceScore y co-ocurrencias.
 */
import { useEffect, useState } from 'react'

export function useMediaActorMetrics(
  entityId: string | null,
): { data: unknown | null; loading: boolean } {
  const [data, setData] = useState<unknown | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!entityId) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/medios/actores/${entityId}/metricas`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setData(d)
      })
      .catch(() => {
        if (cancelled) return
        setData(null)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [entityId])

  return { data, loading }
}
