import type { Metadata } from 'next'
import FuentesClient from './_components/FuentesClient'

export const metadata: Metadata = {
  title: 'Fuentes · Estudio | Politeia Analítica',
}

export default function FuentesPage() {
  return <FuentesClient />
}
