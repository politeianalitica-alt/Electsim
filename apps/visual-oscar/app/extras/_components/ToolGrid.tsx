'use client'

/**
 * ToolGrid — grid de tarjetas para herramientas (fallback / overview).
 *
 * Se muestra cuando ninguna herramienta inline está seleccionada.
 */

import Link from 'next/link'
import styles from './Toolbox.module.css'
import type { ToolDef, ToolId } from './ToolboxShell'

export default function ToolGrid({ tools, onPick }: { tools: ToolDef[]; onPick: (id: ToolId) => void }) {
  return (
    <div className={styles.toolGrid}>
      {tools.map(t => (
        t.inline ? (
          <button key={t.id} className={styles.toolCard} onClick={() => onPick(t.id)}>
            <span className={styles.cardGlyph}>{t.glyph}</span>
            <strong>{t.label}</strong>
            <span>{t.description}</span>
            <span className={styles.cardCat}>{t.category}</span>
          </button>
        ) : (
          <Link key={t.id} href={t.href!} className={styles.toolCard}>
            <span className={styles.cardGlyph}>{t.glyph}</span>
            <strong>{t.label}</strong>
            <span>{t.description}</span>
            <span className={styles.cardCat}>{t.category} ↗</span>
          </Link>
        )
      ))}
    </div>
  )
}
