import type { Metadata } from 'next'
import DashboardBuilderClient from './_components/DashboardBuilderClient'

export const metadata: Metadata = { title: 'Editar Dashboard · Domo | Politeia' }

export default function DashboardBuilderPage({ params }: { params: { id: string } }) {
  return <DashboardBuilderClient id={params.id} />
}
