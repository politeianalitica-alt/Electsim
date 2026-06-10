'use client'

/**
 * CollapsibleArticle — tarjeta de noticia con diseño limpio: por defecto muestra
 * SOLO el titular y el medio. Al pinchar la tarjeta se expande y revela el resto
 * de información (`children`): sentimiento, ideología, categoría, figuras, etc.
 *
 * El botón de archivo (archive.today) va en la ESQUINA superior derecha
 * (cuadrado, azul marino, candado abierto). Ni el titular ni ese botón propagan
 * el click, así que se puede abrir la noticia o el archivo sin desplegar el
 * detalle.
 */

import { useState, type ReactNode } from 'react'
import ArchiveLink from './ArchiveLink'

export default function CollapsibleArticle({
  title,
  href,
  medio,
  when,
  accent = '#1d1d1f',
  titleSize = 13.5,
  defaultOpen = false,
  children,
}: {
  title: string
  href: string
  medio?: string
  when?: string
  accent?: string
  titleSize?: number
  defaultOpen?: boolean
  children?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const expandable = !!children

  return (
    <div
      onClick={expandable ? () => setOpen((o) => !o) : undefined}
      style={{
        position: 'relative',
        background: '#fff',
        border: '1px solid #ECECEF',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
        padding: '9px 42px 9px 13px',
        cursor: expandable ? 'pointer' : 'default',
      }}
    >
      {/* Botón de archivo · esquina superior derecha */}
      <div style={{ position: 'absolute', top: 8, right: 8 }} onClick={(e) => e.stopPropagation()}>
        <ArchiveLink url={href} size={22} />
      </div>

      <div style={{ fontSize: titleSize, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.35 }}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ color: '#1d1d1f', textDecoration: 'none' }}
        >
          {title}
        </a>
      </div>

      {(medio || when || expandable) && (
        <div style={{ marginTop: 3, fontSize: 11, color: '#6e6e73', display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          {medio && <span style={{ fontWeight: 700, color: '#3a3a3d' }}>{medio}</span>}
          {when && <span style={{ color: '#9ca3af' }}>· {when}</span>}
          {expandable && (
            <span aria-hidden style={{ color: '#c0c0c6', fontSize: 10 }}>{open ? '▾ menos' : '▸ más'}</span>
          )}
        </div>
      )}

      {open && children && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid #F0F0F2' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
