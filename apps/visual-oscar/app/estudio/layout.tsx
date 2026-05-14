import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import DomoSidebar from './_components/DomoSidebar'
import DomoChrome from './_components/DomoChrome'
import styles from './estudio.module.css'

export const metadata: Metadata = {
  title:       'Estudio del Analista | Politeia Analítica',
  description: 'Tu espacio personal para conectar fuentes, crear paneles y explorar tus datos.',
}

export default function EstudioLayout({ children }: { children: ReactNode }) {
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
