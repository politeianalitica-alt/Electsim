import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import AppHeader from '../_components/AppHeader'
import { SpaceHero } from '../_components/space/SpaceHero'
import DomoSidebar from './_components/DomoSidebar'
import DomoChrome from './_components/DomoChrome'
import styles from './estudio.module.css'

export const metadata: Metadata = {
  title: 'Estudio Politeia | Politeia Analítica',
  description: 'Tu espacio personal para conectar fuentes, crear paneles y explorar tus datos.',
}

export default function EstudioLayout({ children }: { children: ReactNode }) {
  return (
 <>
      {/* Chrome del dashboard arriba: el Estudio es una sección más
          dentro de Politeia, no una app independiente. */}
 <AppHeader />
      {/* Hero unificado estilo War Room */}
 <SpaceHero
        icon="ES"
        iconColor="#0F766E"
        eyebrow="ESTUDIO · WORKSPACE DEL ANALISTA"
        title="Estudio"
        subtitle="Conecta fuentes, construye paneles y explora tus datos con IA."
      />
 <div className={styles.domoShell}>
 <DomoSidebar />
 <div className={styles.domoContent}>
 <DomoChrome />
 <div className={styles.domoMain}>
            {children}
 </div>
 </div>
 </div>
 </>
  )
}
