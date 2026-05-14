import type { Metadata } from 'next'
import GovernanceClient from './_components/GovernanceClient'

export const metadata: Metadata = { title: 'Gobernanza · Domo | Politeia' }

export default function GobernanzaPage() {
  return <GovernanceClient />
}
