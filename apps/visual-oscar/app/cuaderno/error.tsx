'use client'

/**
 * Error boundary del Cuaderno. Las notas viven en localStorage: un throw en
 * el cliente (nota corrupta, parser…) antes hacía bubble hasta app/error.tsx
 * y el usuario perdía toda la pantalla sin pista de que sus notas siguen ahí.
 */

import { useEffect } from 'react'

export default function CuadernoError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[cuaderno] error:', error)
  }, [error])

  return (
    <div style={{
      fontFamily: '-apple-system, system-ui, sans-serif', maxWidth: 560,
      margin: '80px auto', textAlign: 'center', padding: 28,
      background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14,
    }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', margin: '0 0 6px' }}>
        El Cuaderno ha fallado
      </h2>
      <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 16px', lineHeight: 1.5 }}>
        Tus notas siguen guardadas en este navegador. Reintenta; si persiste,
        recarga la página.
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
