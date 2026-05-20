'use client'

/**
 * useWebPush · hook para suscripción Web Push (VAPID).
 *
 * Flujo:
 *   1. GET /api/commodities/push/public-key → recibe applicationServerKey
 *   2. navigator.serviceWorker.register('/sw-push.js')
 *   3. Notification.requestPermission()
 *   4. registration.pushManager.subscribe({ applicationServerKey })
 *   5. POST /api/commodities/push/subscribe con {endpoint, p256dh, auth}
 *
 * Estados:
 *   - 'unsupported' · navegador sin Push API
 *   - 'disabled'    · backend sin VAPID configurado
 *   - 'idle'        · listo para suscribirse
 *   - 'subscribing' · proceso en curso
 *   - 'subscribed'  · suscrito · todo OK
 *   - 'denied'      · usuario bloqueó permisos
 *   - 'error'       · ver lastError
 */
import { useCallback, useEffect, useState } from 'react'

type Status =
  | 'unsupported'
  | 'disabled'
  | 'idle'
  | 'subscribing'
  | 'subscribed'
  | 'denied'
  | 'error'

interface PushConfig {
  enabled: boolean
  public_key?: string
  reason?: string
}

interface UseWebPushResult {
  status: Status
  lastError: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

const SW_PATH = '/sw-push.js'
const CONFIG_URL = '/api/commodities/push/public-key'
const SUBSCRIBE_URL = '/api/commodities/push/subscribe'
const UNSUBSCRIBE_URL = '/api/commodities/push/unsubscribe'

// VAPID public key viene base64url · pushManager requiere Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function arrayBufferToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return ''
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return window.btoa(binary)
}

export function useWebPush(userId: string | null = 'anon@politeia.local'): UseWebPushResult {
  const [status, setStatus] = useState<Status>('idle')
  const [lastError, setLastError] = useState<string | null>(null)
  const [config, setConfig] = useState<PushConfig | null>(null)

  // Detect support + cargar config inicial
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setStatus('unsupported')
      return
    }
    let cancelled = false
    fetch(CONFIG_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((cfg: PushConfig) => {
        if (cancelled) return
        setConfig(cfg)
        if (!cfg.enabled) {
          setStatus('disabled')
          setLastError(cfg.reason || 'backend sin VAPID')
          return
        }
        // Comprobar permiso actual + sub existente
        if (Notification.permission === 'denied') {
          setStatus('denied')
          return
        }
        navigator.serviceWorker.getRegistration(SW_PATH).then((reg) => {
          if (!reg) return
          reg.pushManager.getSubscription().then((sub) => {
            if (sub) setStatus('subscribed')
          })
        })
      })
      .catch((e) => {
        if (cancelled) return
        setStatus('error')
        setLastError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!config?.enabled || !config.public_key) {
      setStatus('disabled')
      return
    }
    if (!userId) {
      setLastError('userId requerido para suscribirse')
      setStatus('error')
      return
    }
    setStatus('subscribing')
    setLastError(null)
    try {
      // 1. Registrar SW
      const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
      await navigator.serviceWorker.ready

      // 2. Pedir permiso de notificaciones
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setStatus(perm === 'denied' ? 'denied' : 'idle')
        return
      }

      // 3. Suscribir al push manager con applicationServerKey VAPID
      const existing = await reg.pushManager.getSubscription()
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // Cast a BufferSource · TS narrow para `Uint8Array<ArrayBufferLike>` rompe
          // la inferencia, pero PushManager acepta cualquier BufferSource.
          applicationServerKey: urlBase64ToUint8Array(config.public_key) as BufferSource,
        }))

      const json = sub.toJSON() as {
        endpoint?: string
        keys?: { p256dh?: string; auth?: string }
      }
      const p256dh = json.keys?.p256dh || arrayBufferToBase64(sub.getKey('p256dh'))
      const auth = json.keys?.auth || arrayBufferToBase64(sub.getKey('auth'))
      const endpoint = json.endpoint || sub.endpoint

      // 4. POST al backend
      const r = await fetch(SUBSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent.slice(0, 380),
        }),
      })
      if (!r.ok) {
        const txt = await r.text().catch(() => '')
        throw new Error(`subscribe API ${r.status}: ${txt.slice(0, 200)}`)
      }
      setStatus('subscribed')
    } catch (exc) {
      setStatus('error')
      setLastError(String(exc))
    }
  }, [config, userId])

  const unsubscribe = useCallback(async () => {
    setLastError(null)
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH)
      if (!reg) {
        setStatus('idle')
        return
      }
      const sub = await reg.pushManager.getSubscription()
      if (!sub) {
        setStatus('idle')
        return
      }
      const endpoint = sub.endpoint
      // 1. Backend: marcar inactiva
      try {
        await fetch(UNSUBSCRIBE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
      } catch {
        /* tolerar fallo backend · no bloquea la desuscripción local */
      }
      // 2. Browser: desuscribir
      await sub.unsubscribe()
      setStatus('idle')
    } catch (exc) {
      setStatus('error')
      setLastError(String(exc))
    }
  }, [])

  return { status, lastError, subscribe, unsubscribe }
}
