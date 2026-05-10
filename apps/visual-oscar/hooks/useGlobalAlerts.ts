'use client'

import { useCallback } from 'react'
import { useSSE } from './useSSE'
import { useAlerts, GlobalAlert } from '@/context/AlertsContext'

export function useGlobalAlerts(enabled = true) {
  const { pushAlert, unreadCount, alerts } = useAlerts()

  const handleMessage = useCallback((ev: MessageEvent) => {
    try {
      const payload = JSON.parse(ev.data)
      // Filter out heartbeat/init messages
      if (payload.connected !== undefined || payload.ts && !payload.titulo) return

      const alert: Omit<GlobalAlert, 'leida'> = {
        id: String(payload.id ?? `alert_${Date.now()}`),
        titulo: String(payload.titulo ?? 'Alerta'),
        descripcion: String(payload.descripcion ?? ''),
        severidad: payload.severidad ?? 'medio',
        timestamp: String(payload.timestamp ?? new Date().toISOString()),
        pais: payload.pais,
        categoria: payload.categoria,
      }
      pushAlert(alert)
    } catch { /* ignore */ }
  }, [pushAlert])

  const url = enabled ? '/api/alerts/stream' : null
  const { status } = useSSE(url, { onMessage: handleMessage })

  return { status, unreadCount, alerts }
}
