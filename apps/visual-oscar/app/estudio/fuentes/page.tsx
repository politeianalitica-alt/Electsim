import type { Metadata } from 'next'
import FuentesClient from './_components/FuentesClient'

export const metadata: Metadata = {
  title: 'Fuentes de Datos · Domo | Politeia',
}

export default function FuentesPage() {
  return <FuentesClient />
}
