import type { Metadata } from 'next'
import DatasetDetailClient from '../[id]/_components/DatasetDetailClient'

export const metadata: Metadata = { title: 'Nueva tabla · Estudio | Politeia Analítica' }

export default function NuevoDatasetPage() {
  return <DatasetDetailClient id="nuevo" />
}
