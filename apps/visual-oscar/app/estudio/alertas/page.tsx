import type { Metadata } from 'next'
import AlertsClient from './_components/AlertsClient'

export const metadata: Metadata = { title: 'Alertas · Estudio | Politeia Analítica' }

export default function AlertasPage() {
  return <AlertsClient />
}
