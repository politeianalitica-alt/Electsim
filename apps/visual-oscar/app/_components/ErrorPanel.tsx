'use client'

/**
 * ErrorPanel — panel de error compartido para los error.tsx de segmento.
 *
 * Fase 1: los boundaries de /workspaces/[id], /cuaderno y /extras nacieron
 * en Fase 0 como tres copias casi idénticas; este componente las unifica
 * (un solo sitio para diseño, telemetría futura y textos).
 *
 * Uso en un error.tsx:
 *   export default function XError({ error, reset }: ErrorBoundaryProps) {
 *     return <ErrorPanel error={error} reset={reset} titulo="…" descripcion="…" />
 *   }
 */

import { useEffect } from 'react'

export interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

interface ErrorPanelProps extends ErrorBoundaryProps {
  /** Título corto, p. ej. "Esta vista ha fallado". */
  titulo: string
  /** Frase tranquilizadora con el siguiente paso. */
  descripcion: string
  /** Etiqueta para el console.error de diagnóstico, p. ej. "cuaderno". */
  scope: string
}

export default function ErrorPanel({ error, reset, titulo, descripcion, scope }: ErrorPanelProps) {
  useEffect(() => {
    console.error(`[${scope}] error:`, error)
  }, [error, scope])

  return (
    <div style={{
      fontFamily: 'var(--font-text, -apple-system, system-ui, sans-serif)',
      maxWidth: 560, margin: '60px auto', textAlign: 'center', padding: 28,
      background: 'var(--color-surface, #fff)',
      border: '1px solid var(--color-hairline-soft, #e8e8ed)', borderRadius: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, margin: '0 auto 12px',
        background: 'var(--color-danger-subtle, rgba(196,44,44,0.08))',
        color: 'var(--color-danger, #c42c2c)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 700,
      }}>
        !
      </div>
      <h2 style={{
        fontFamily: 'var(--font-display, inherit)', fontSize: 18, fontWeight: 600,
        color: 'var(--color-ink, #1d1d1f)', margin: '0 0 6px',
      }}>
        {titulo}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-ink-4, #6e6e73)', margin: '0 0 16px', lineHeight: 1.5 }}>
        {descripcion}
        {error.digest && <span style={{ display: 'block', marginTop: 4, fontSize: 11 }}>Ref: {error.digest}</span>}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '8px 18px', fontSize: 13, fontWeight: 600, borderRadius: 9,
          border: 'none', background: 'var(--color-brand, #1F4E8C)', color: '#fff',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Reintentar
      </button>
    </div>
  )
}
