import type { Metadata } from 'next'
import DashboardBuilderClient from '../[id]/editar/_components/DashboardBuilderClient'

export const metadata: Metadata = { title: 'Nuevo Dashboard · Domo | Politeia' }

export default function NuevoDashboardPage() {
  return <DashboardBuilderClient id="nuevo" />
}
