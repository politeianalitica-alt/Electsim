import type { Metadata } from 'next'
import AppHeader from '../_components/AppHeader'
import { SpaceHero } from '../_components/space/SpaceHero'
import CuadernoClient from './_components/CuadernoClient'

export const metadata: Metadata = {
  title:       'Cuaderno | Workspace · Politeia Analítica',
  description: 'Tu segundo cerebro dentro de Politeia: notas Markdown, backlinks, grafo y bitácora automática.',
}

export default function CuadernoPage() {
  return (
    <>
      <AppHeader />
      {/* Hero unificado estilo War Room */}
      <SpaceHero
        icon="CU"
        iconColor="#B45309"
        eyebrow="CUADERNO · SEGUNDO CEREBRO DEL ANALISTA"
        title="Cuaderno"
        subtitle="Notas Markdown con backlinks, grafo y bitácora automática."
      />
      <CuadernoClient />
    </>
  )
}
