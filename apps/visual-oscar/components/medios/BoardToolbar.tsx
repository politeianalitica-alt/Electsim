'use client'

/**
 * BoardToolbar — barra de acciones reutilizable para los tableros de Medios:
 * "Exportar CSV" (descarga lo visible) y "Copiar enlace" (comparte la vista
 * filtrada actual, con feedback). Sin emojis (CLAUDE.md §0.5): marcas Unicode.
 */

import { useState } from 'react'
import { copyCurrentLink } from '@/lib/medios/export'

const btn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  background: '#fff',
  border: '1px solid #ECECEF',
  borderRadius: 999,
  padding: '6px 12px',
  fontSize: 11.5,
  fontWeight: 600,
  color: '#3a3a3d',
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
}

export default function BoardToolbar({
  onExportCsv,
  count,
  showCopyLink = true,
}: {
  onExportCsv?: () => void
  count?: number
  showCopyLink?: boolean
}) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    const ok = await copyCurrentLink()
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }
  }
  return (
    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {onExportCsv && (
        <button onClick={onExportCsv} style={btn} title="Descargar lo visible como CSV">
          ⇩ Exportar CSV{count != null ? ` · ${count}` : ''}
        </button>
      )}
      {showCopyLink && (
        <button
          onClick={copy}
          style={{ ...btn, color: copied ? '#15803d' : '#3a3a3d', borderColor: copied ? '#86efac' : '#ECECEF' }}
          title="Copiar el enlace de esta vista (con los filtros aplicados)"
        >
          {copied ? '✓ Enlace copiado' : '⧉ Copiar enlace'}
        </button>
      )}
    </div>
  )
}
