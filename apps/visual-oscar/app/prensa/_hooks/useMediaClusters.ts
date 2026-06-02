'use client'
/**
 * useMediaClusters · Sprint 0.5
 *
 * Hook cliente que consume /api/medios/clusters?window=...&minSources=...
 * Devuelve { clusters, loading, error }. Los clusters quedan tipados como
 * `unknown[]` hasta que Sprint 1.2 expone el shape canónico al consumidor.
 */
import { useEffect, useState } from 'react'

export function useMediaClusters(
  window = '72h',
  minSources = 2,
): { clusters: unknown[]; loading: boolean; error: string | null } {
  const [clusters, setClusters] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/medios/clusters?window=${window}&minSources=${minSources}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((d) => {
        if (cancelled) return
        setClusters(d.clusters ?? [])
        setError(null)
      })
      .catch((e) => {
        if (cancelled) return
        setError(String(e))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [window, minSources])

  return { clusters, loading, error }
}
