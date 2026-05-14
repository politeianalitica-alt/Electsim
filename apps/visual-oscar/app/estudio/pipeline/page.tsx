import type { Metadata } from 'next'
import PipelineListClient from './_components/PipelineListClient'

export const metadata: Metadata = {
  title: 'Pipelines ETL · Domo | Politeia',
}

export default function PipelinePage() {
  return <PipelineListClient />
}
