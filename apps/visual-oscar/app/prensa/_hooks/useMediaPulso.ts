'use client'
/**
 * useMediaPulso · Sprint 0.5
 *
 * Hook cliente que consume /api/medios/pulso?window=...&mode=...
 * Devuelve { data, loading, error } con confianza, balance, latencia y
 * dominantTopics. Forward-compatible con Sprint 2 (clasificación).
 */
import { useEffect, useState } from 'react'
import type {
  ConfidenceMetrics,
  DominantTopic,
  PulsoMode,
  WindowSpec,
} from '@/lib/medios/canonical/types'

export interface PulsoResponse {
  generatedAt: string
  window: WindowSpec
  mode: PulsoMode
  confidence: ConfidenceMetrics
  volume: {
    total: number
    analyzed: number
    noise: number
    duplicates: number
    unique: number
    clustered: number
  }
  balance: {
    ideological: number
    territorial: number
    tierDistribution: Record<string, number>
  }
  latency: number
  dominantTopics: DominantTopic[]
  sourcesActive: number
}

export function useMediaPulso(
  window: WindowSpec = '72h',
  mode: PulsoMode = 'PLURAL',
): { data: PulsoResponse | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<PulsoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/medios/pulso?window=${window}&mode=${mode}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((d: PulsoResponse) => {
        if (cancelled) return
        setData(d)
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
  }, [window, mode])

  return { data, loading, error }
}
