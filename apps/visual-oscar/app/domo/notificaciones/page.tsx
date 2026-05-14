import type { Metadata } from 'next'
import NotificationsPageClient from './_components/NotificationsPageClient'

export const metadata: Metadata = { title: 'Notificaciones · Domo | Politeia' }

export default function NotificacionesPage() {
  return <NotificationsPageClient />
}
