import type { Metadata } from 'next'
import PipelineListClient from './_components/PipelineListClient'

export const metadata: Metadata = {
  title: 'Limpieza y cruces · Estudio | Politeia Analítica',
}

export default function PipelinePage() {
  return <PipelineListClient />
}
