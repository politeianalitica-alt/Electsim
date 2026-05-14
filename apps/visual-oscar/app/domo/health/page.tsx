import type { Metadata } from 'next'
import HealthClient from './_components/HealthClient'

export const metadata: Metadata = { title: 'System Health · Domo | Politeia' }

export default function HealthPage() {
  return <HealthClient />
}
