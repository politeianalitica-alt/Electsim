import type { Metadata } from 'next'
import GovernanceClient from './_components/GovernanceClient'

export const metadata: Metadata = { title: 'Equipo y permisos · Estudio | Politeia Analítica' }

export default function GobernanzaPage() {
  return <GovernanceClient />
}
