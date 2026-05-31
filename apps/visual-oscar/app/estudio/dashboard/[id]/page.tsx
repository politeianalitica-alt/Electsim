import type { Metadata } from 'next'
import DashboardViewerClient from './_components/DashboardViewerClient'

export const metadata: Metadata = { title: 'Panel · Estudio | Politeia Analítica' }

export default function DashboardViewerPage({ params }: { params: { id: string } }) {
  return <DashboardViewerClient id={params.id} />
}
