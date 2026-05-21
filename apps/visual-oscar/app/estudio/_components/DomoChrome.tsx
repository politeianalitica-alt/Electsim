'use client'

/**
 * DomoChrome — capa de UI superpuesta al módulo Domo:
 *   - Atajo global ⌘K / Ctrl+K para abrir el Command Palette
 *   - Botón flotante para abrirlo desde la UI
 *   - Botón de notificaciones (NotificationBell)
 *
 * Se renderiza desde el layout del módulo Domo y vive siempre encima
 * del sidebar.
 */

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import NotificationBell from '@/components/NotificationBell'
import styles from './DomoChrome.module.css'

const DomoCommandPalette = dynamic(
  () => import('@/components/DomoCommandPalette'),
  { ssr: false },
)

export default function DomoChrome() {
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const k = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && k === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
 <>
 <div className={styles.topBar}>
 <button onClick={() => setPaletteOpen(true)} className={styles.searchBtn} aria-label="Buscar">
 <span className={styles.searchGlyph}>⌕</span>
 <span className={styles.searchText}>Buscar en tu Estudio…</span>
 <kbd className={styles.kbd}>⌘K</kbd>
 </button>
 <NotificationBell />
 </div>
 <DomoCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
 </>
  )
}
