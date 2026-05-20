'use client'

/**
 * Hook de alertas commodities · backend-first con fallback localStorage.
 *
 * Backend (post Sprint cron):
 *   GET    /api/commodities/alerts?user_id=
 *   POST   /api/commodities/alerts
 *   PATCH  /api/commodities/alerts/[id]
 *   DELETE /api/commodities/alerts/[id]
 *
 * Si el backend no está configurado (BACKEND_URL ausente) o devuelve error,
 * las operaciones caen a localStorage como en Sprint 7. El contrato del hook
 * no cambia · `backendOk` señala el estado de sync.
 */
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
    /* ignore quota */
  }
}

function normalizeFromBackend(row: any): CommodityAlertDraft {
  return {
    id: row.id,
    slug: row.commodity_slug,
    kind: row.kind,
    threshold: Number(row.threshold),
    period_days: row.period_days ?? undefined,
    channels: Array.isArray(row.channels) ? row.channels : ['inapp'],
    active: Boolean(row.active),
    created_at: row.created_at ?? new Date().toISOString(),
    last_triggered: row.last_triggered_at ?? null,
  }
}

const DEFAULT_USER_ID = 'anon@politeia.local'

export function useCommodityAlerts(userId: string = DEFAULT_USER_ID) {
  const [alerts, setAlerts] = useState<CommodityAlertDraft[]>(() => safeRead())
  const [backendOk, setBackendOk] = useState<boolean | null>(null)

  // Fetch inicial del backend; si falla, mantenemos localStorage
  useEffect(() => {
    let cancelled = false
    const fetchBackend = async () => {
      try {
        const r = await fetch(
          `/api/commodities/alerts?user_id=${encodeURIComponent(userId)}`,
          { cache: 'no-store' },
        )
        if (!r.ok) throw new Error(`status ${r.status}`)
        const data = await r.json()
        if (cancelled) return
        const fromBackend = Array.isArray(data.items)
          ? data.items.map(normalizeFromBackend)
          : []
        setAlerts(fromBackend)
        setBackendOk(true)
      } catch {
        if (!cancelled) setBackendOk(false)
      }
    }
    fetchBackend()
    return () => {
      cancelled = true
    }
  }, [userId])

  // Persistencia local de respaldo (siempre sincroniza)
  useEffect(() => safeWrite(alerts), [alerts])

  const add = useCallback(
    async (draft: Omit<CommodityAlertDraft, 'id' | 'created_at'>) => {
      const optimistic: CommodityAlertDraft = {
        ...draft,
        id: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        created_at: new Date().toISOString(),
      }
      setAlerts((prev) => [...prev, optimistic])
      try {
        const r = await fetch('/api/commodities/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            commodity_slug: draft.slug,
            kind: draft.kind,
            threshold: draft.threshold,
            period_days: draft.period_days,
            channels: draft.channels,
            active: draft.active,
          }),
        })
        if (!r.ok) throw new Error(`status ${r.status}`)
        const created = await r.json()
        if (!created.error) {
          setAlerts((prev) =>
            prev.map((a) => (a.id === optimistic.id ? normalizeFromBackend(created) : a)),
          )
          setBackendOk(true)
        } else {
          setBackendOk(false)
        }
      } catch {
        setBackendOk(false)
      }
    },
    [userId],
  )

  const remove = useCallback(async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    if (id.startsWith('tmp_')) return
    try {
      await fetch(`/api/commodities/alerts/${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch {
      /* ignore */
    }
  }, [])

  const toggleActive = useCallback(async (id: string) => {
    let nextActive = false
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a
        nextActive = !a.active
        return { ...a, active: nextActive }
      }),
    )
    if (id.startsWith('tmp_')) return
    try {
      await fetch(`/api/commodities/alerts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive }),
      })
    } catch {
      /* ignore */
    }
  }, [])

  const update = useCallback(
    async (id: string, patch: Partial<CommodityAlertDraft>) => {
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
      if (id.startsWith('tmp_')) return
      const body: Record<string, unknown> = {}
      if (patch.active !== undefined) body.active = patch.active
      if (patch.threshold !== undefined) body.threshold = patch.threshold
      if (patch.channels !== undefined) body.channels = patch.channels
      if (patch.period_days !== undefined) body.period_days = patch.period_days
      try {
        await fetch(`/api/commodities/alerts/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } catch {
        /* ignore */
      }
    },
    [],
  )

  return { alerts, add, remove, toggleActive, update, backendOk }
}
