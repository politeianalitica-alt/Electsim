'use client'

import { useCallback, useEffect, useState } from 'react'

export type AlertKind = 'price_above' | 'price_below' | 'change_pct'

export interface CommodityAlertDraft {
  id: string
  slug: string
  kind: AlertKind
  threshold: number
  period_days?: number
  channels: ('inapp' | 'email' | 'push')[]
  active: boolean
  created_at: string
  last_triggered?: string | null
}

const STORAGE_KEY = 'politeia.commodities.alerts'

function safeRead(): CommodityAlertDraft[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function safeWrite(alerts: CommodityAlertDraft[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
  } catch {
    /* ignore */
  }
}

export function useCommodityAlerts() {
  const [alerts, setAlerts] = useState<CommodityAlertDraft[]>(() => safeRead())

  useEffect(() => safeWrite(alerts), [alerts])

  const add = useCallback((draft: Omit<CommodityAlertDraft, 'id' | 'created_at'>) => {
    setAlerts((prev) => [
      ...prev,
      {
        ...draft,
        id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        created_at: new Date().toISOString(),
      },
    ])
  }, [])

  const remove = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const toggleActive = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)))
  }, [])

  const update = useCallback((id: string, patch: Partial<CommodityAlertDraft>) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }, [])

  return { alerts, add, remove, toggleActive, update }
}
