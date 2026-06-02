import type { Metadata } from 'next'
import NotificationsPageClient from './_components/NotificationsPageClient'

export const metadata: Metadata = { title: 'Notificaciones · Estudio | Politeia Analítica' }

export default function NotificacionesPage() {
  return <NotificationsPageClient />
}
