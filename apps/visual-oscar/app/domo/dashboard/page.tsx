import type { Metadata } from 'next'
import DashboardListClient from './_components/DashboardListClient'

export const metadata: Metadata = { title: 'Dashboards · Domo | Politeia' }

export default function DashboardPage() {
  return <DashboardListClient />
}
