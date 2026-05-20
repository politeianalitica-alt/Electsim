/**
 * sw-push.js · Service Worker para Web Push (VAPID).
 *
 * Recibe push events del navegador y muestra notificaciones.
 * Click → focus/abre la URL incluida en data.url.
 *
 * Registrado desde hooks/useWebPush.ts con scope '/'.
 */

self.addEventListener('install', (event) => {
  // Activa inmediatamente · sin esperar a recargar tabs viejas
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'Politeia', body: event.data ? event.data.text() : 'Alerta' }
  }

  const title = payload.title || 'Politeia · alerta'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/politeia-logo.svg',
    badge: payload.badge || '/politeia-logo.svg',
    tag: payload.tag || 'politeia-alert',
    data: payload.data || {},
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/commodities/alerts'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      // Si ya hay una pestaña, le damos foco y navegamos
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try {
              await client.navigate(url)
            } catch {
              /* cross-origin · ignore */
            }
          }
          return
        }
      }
      // Si no, abrimos una nueva
      if (self.clients.openWindow) {
        await self.clients.openWindow(url)
      }
    })(),
  )
})
