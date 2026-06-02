import type { Metadata } from 'next'
import DashboardBuilderClient from '../[id]/editar/_components/DashboardBuilderClient'

export const metadata: Metadata = { title: 'Nuevo panel · Estudio | Politeia Analítica' }

export default function NuevoDashboardPage() {
  return <DashboardBuilderClient id="nuevo" />
}
