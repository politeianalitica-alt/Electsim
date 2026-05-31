import type { Metadata } from 'next'
import PipelineEditorClient from '../[id]/_components/PipelineEditorClient'

export const metadata: Metadata = { title: 'Nuevo pipeline · Estudio | Politeia Analítica' }

export default function NuevoPipelinePage() {
  return <PipelineEditorClient id="nuevo" />
}
