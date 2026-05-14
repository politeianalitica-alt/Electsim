import type { Metadata } from 'next'
import DatasetDetailClient from '../[id]/_components/DatasetDetailClient'

export const metadata: Metadata = { title: 'Nuevo Dataset · Domo | Politeia' }

export default function NuevoDatasetPage() {
  return <DatasetDetailClient id="nuevo" />
}
