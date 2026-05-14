import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import DomoSidebar from './_components/DomoSidebar'
import DomoChrome from './_components/DomoChrome'
import styles from './domo.module.css'

export const metadata: Metadata = {
  title:       'Domo · Centro de Datos | Politeia Analítica',
  description: 'Gestión, ingesta, transformación y análisis de datos',
}

export default function DomoLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.domoShell}>
      <DomoSidebar />
      <div className={styles.domoContent}>
        <DomoChrome />
        <div className={styles.domoMain}>
          {children}
        </div>
      </div>
    </div>
  )
}
