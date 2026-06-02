import type { Metadata } from 'next'
import QueryClient from './_components/QueryClient'

export const metadata: Metadata = { title: 'Preguntar a los datos · Estudio | Politeia Analítica' }

export default function QueryPage() {
  return <QueryClient />
}
