import type { Metadata } from 'next'
import PipelineEditorClient from './_components/PipelineEditorClient'

export const metadata: Metadata = { title: 'Editar pipeline · Estudio | Politeia Analítica' }

export default function PipelineEditorPage({ params }: { params: { id: string } }) {
  return <PipelineEditorClient id={params.id} />
}
