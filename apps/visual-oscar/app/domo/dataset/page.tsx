import type { Metadata } from 'next'
import DatasetListClient from './_components/DatasetListClient'

export const metadata: Metadata = { title: 'Datasets · Domo | Politeia' }

export default function DatasetPage() {
  return <DatasetListClient />
}
