'use client'

import { useState, useCallback, useRef } from 'react'
import { useSSE, SSEStatus } from './useSSE'

export interface FeedSignal {
  id: string
  titulo: string
  resumen?: string
  fuente?: string
  urgencia?: number
  categoria?: string
  fecha?: string
  es_breaking?: boolean
}

export interface FeedStats {
  total_monitorizados_24h: number
  breaking_activos: number
  ts: string
}

export interface IntelligenceFeedState {
  signals: FeedSignal[]
  stats: FeedStats | null
  status: SSEStatus
  lastUpdate: Date | null
}

export function useIntelligenceFeed(enabled = true) {
  const [signals, setSignals] = useState<FeedSignal[]>([])
  const [stats, setStats] = useState<FeedStats | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const seenIds = useRef(new Set<string>())

  const handleMessage = useCallback((ev: MessageEvent) => {
    // SSE messages without named event
    try {
      const payload = JSON.parse(ev.data)
      setSignals(prev => {
        const id = String(payload.id ?? payload.titulo ?? Math.random())
        if (seenIds.current.has(id)) return prev
        seenIds.current.add(id)
        const signal: FeedSignal = {
          id,
          titulo: String(payload.titulo ?? payload.title ?? ''),
          resumen: String(payload.resumen ?? payload.description ?? ''),
          fuente: String(payload.fuente ?? payload.source ?? 'Internacional'),
          urgencia: Number(payload.urgencia ?? 3),
          categoria: String(payload.categoria ?? payload.type ?? 'general'),
          fecha: String(payload.fecha ?? payload.date ?? new Date().toISOString()),
          es_breaking: false,
        }
        return [signal, ...prev].slice(0, 50)
      })
      setLastUpdate(new Date())
    } catch { /* ignore parse errors */ }
  }, [])

  // Parse named SSE events via addEventListener approach won't work through onmessage
  // Instead the route sends all as data blobs with a type field
  const url = enabled ? '/api/intelligence/stream' : null

  const { status } = useSSE(url, {
    onMessage: handleMessage,
  })

  // Also handle named events by reading from EventSource directly
  // The useSSE hook uses onmessage; for named events we use a separate listener

  const addBreaking = useCallback((signal: FeedSignal) => {
    setSignals(prev => {
      if (seenIds.current.has(signal.id)) return prev
      seenIds.current.add(signal.id)
      return [{ ...signal, es_breaking: true }, ...prev].slice(0, 50)
    })
    setLastUpdate(new Date())
  }, [])

  const updateStats = useCallback((s: FeedStats) => {
    setStats(s)
    setLastUpdate(new Date())
  }, [])

  return { signals, stats, status, lastUpdate, addBreaking, updateStats }
}
