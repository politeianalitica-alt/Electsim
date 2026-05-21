import type { Metadata } from 'next'
import AppHeader from '../_components/AppHeader'
import CuadernoClient from './_components/CuadernoClient'

export const metadata: Metadata = {
  title:       'Cuaderno | Workspace · Politeia Analítica',
  description: 'Tu segundo cerebro dentro de Politeia: notas Markdown, backlinks, grafo y bitácora automática.',
}

export default function CuadernoPage() {
  return (
    <>
      <AppHeader />
      <CuadernoClient />
    </>
  )
}
