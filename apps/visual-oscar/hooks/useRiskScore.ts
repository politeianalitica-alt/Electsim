'use client'

import { useState, useCallback } from 'react'
import { useSSE, SSEStatus } from './useSSE'

export interface RiskScorePoint {
  score: number
  nivel: string
  ts: string
}

export function useRiskScore(enabled = true) {
  const [current, setCurrent] = useState<RiskScorePoint | null>(null)
  const [history, setHistory] = useState<RiskScorePoint[]>([])
  const [status, setStatus] = useState<SSEStatus>('connecting')

  const handleMessage = useCallback((ev: MessageEvent) => {
    try {
      const point: RiskScorePoint = JSON.parse(ev.data)
      if (typeof point.score === 'number') {
        setCurrent(point)
        setHistory(prev => [...prev, point].slice(-60))
      }
    } catch { /* ignore */ }
  }, [])

  const url = enabled ? '/api/risk/stream' : null
  const { status: sseStatus } = useSSE(url, { onMessage: handleMessage })

  return { current, history, status: sseStatus }
}
