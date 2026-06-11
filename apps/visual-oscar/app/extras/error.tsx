'use client'

/** Error boundary del Toolbox (/extras): conserva la página y ofrece reintento. */

import { useEffect } from 'react'

export default function ToolboxError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[toolbox] error:', error)
  }, [error])

  return (
    <div style={{
      fontFamily: '-apple-system, system-ui, sans-serif', maxWidth: 560,
      margin: '80px auto', textAlign: 'center', padding: 28,
      background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14,
    }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', margin: '0 0 6px' }}>
        El Toolbox ha fallado
      </h2>
      <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 16px', lineHeight: 1.5 }}>
        Puedes reintentar o volver al panel ejecutivo desde la barra superior.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '8px 18px', fontSize: 13, fontWeight: 600, borderRadius: 9,
          border: 'none', background: '#1F4E8C', color: '#fff', cursor: 'pointer',
        }}
      >
        Reintentar
      </button>
    </div>
  )
}
