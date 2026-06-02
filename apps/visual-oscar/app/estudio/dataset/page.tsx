import type { Metadata } from 'next'
import DatasetListClient from './_components/DatasetListClient'

export const metadata: Metadata = { title: 'Mis tablas · Estudio | Politeia Analítica' }

export default function DatasetPage() {
  return <DatasetListClient />
}
