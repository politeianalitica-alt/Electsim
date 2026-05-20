'use client'

/**
 * Hook SSE para feed live de eventos de alertas commodities.
 *
 * Conexión persistente a /api/commodities/alerts-events/stream con:
 *   - parsing de SSE events 'connected', 'alert', 'ping', 'error'
 *   - auto-reconnect exponencial cuando la conexión cae (1s, 2s, 4s, 8s, 16s, max 30s)
 *   - cleanup limpio en unmount (close + clearTimeout)
 *
 * Devuelve:
 *   { events, isConnected, lastError, reconnectAttempt, clearEvents }
 *
 * Cada evento entrante se prepende a la lista (max 50). Útil para badge
 * "🔔 N" en sidebar + toast nuevo evento en tiempo real.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export interface AlertEvent {
  id: number
  alert_id: string
  user_id: string
  commodity_slug: string
  kind: string
  trigger_value: number
  threshold: number
  channels_notified: string[]
  delivery_log?: Record<string, unknown>
  in_app_read: boolean
  created_at: string
}

const MAX_KEEP = 50
const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000]

export function useAlertEventsStream(userId: string | null = 'anon@politeia.local') {
  const [events, setEvents] = useState<AlertEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aliveRef = useRef(true)

  const connect = useCallback(() => {
    if (!aliveRef.current) return
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    const url = userId
      ? `/api/commodities/alerts-events/stream?user_id=${encodeURIComponent(userId)}`
      : '/api/commodities/alerts-events/stream'

    let es: EventSource
    try {
      es = new EventSource(url)
    } catch (e) {
      setLastError(`EventSource init failed: ${String(e)}`)
      return
    }
    esRef.current = es

    es.addEventListener('connected', () => {
      setIsConnected(true)
      setLastError(null)
      setReconnectAttempt(0)
    })

    es.addEventListener('alert', (e: MessageEvent) => {
      try {
        const parsed: AlertEvent = JSON.parse(e.data)
        setEvents((prev) => {
          if (prev.some((p) => p.id === parsed.id)) return prev
          const next = [parsed, ...prev]
          return next.slice(0, MAX_KEEP)
        })
      } catch (err) {
        setLastError(`parse alert: ${String(err)}`)
      }
    })

    es.addEventListener('ping', () => {
      /* keepalive · nothing to do */
    })

    es.addEventListener('error', (e: MessageEvent | Event) => {
      // Algunos errores son MessageEvent con data, otros sólo Event
      const errData =
        'data' in e && typeof (e as MessageEvent).data === 'string'
          ? (e as MessageEvent).data
          : 'connection error'
      setLastError(errData)
      setIsConnected(false)

      // ReadyState=2 = closed · necesitamos reconnect
      if (es.readyState === EventSource.CLOSED) {
        const attempt = reconnectAttempt
        const delay =
          RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)]
        reconnectTimer.current = setTimeout(() => {
          if (!aliveRef.current) return
          setReconnectAttempt((n) => n + 1)
          connect()
        }, delay)
      }
    })
  }, [userId, reconnectAttempt])

  useEffect(() => {
    aliveRef.current = true
    connect()
    return () => {
      aliveRef.current = false
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const clearEvents = useCallback(() => setEvents([]), [])

  return { events, isConnected, lastError, reconnectAttempt, clearEvents }
}
