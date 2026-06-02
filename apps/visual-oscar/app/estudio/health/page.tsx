import type { Metadata } from 'next'
import HealthClient from './_components/HealthClient'

export const metadata: Metadata = { title: 'Estado del sistema · Estudio | Politeia Analítica' }

export default function HealthPage() {
  return <HealthClient />
}
