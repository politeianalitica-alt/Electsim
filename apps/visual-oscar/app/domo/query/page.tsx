import type { Metadata } from 'next'
import QueryClient from './_components/QueryClient'

export const metadata: Metadata = { title: 'AI Query · Domo | Politeia' }

export default function QueryPage() {
  return <QueryClient />
}
