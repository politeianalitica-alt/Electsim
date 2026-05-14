import type { Metadata } from 'next'
import AlertsClient from './_components/AlertsClient'

export const metadata: Metadata = { title: 'Alertas · Domo | Politeia' }

export default function AlertasPage() {
  return <AlertsClient />
}
