import type { Metadata } from 'next'
import DatasetDetailClient from './_components/DatasetDetailClient'

export const metadata: Metadata = { title: 'Dataset · Domo | Politeia' }

export default function DatasetDetailPage({ params }: { params: { id: string } }) {
  return <DatasetDetailClient id={params.id} />
}
