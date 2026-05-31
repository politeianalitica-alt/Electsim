import type { Metadata } from 'next'
import DashboardListClient from './_components/DashboardListClient'

export const metadata: Metadata = { title: 'Mis paneles · Estudio | Politeia Analítica' }

export default function DashboardPage() {
  return <DashboardListClient />
}
