'use client'

import { useEffect } from 'react'

/**
 * Cortafuegos de último recurso: captura errores que ocurren en el propio
 * layout raíz (providers, fuentes, etc.), donde app/error.tsx ya no llega.
 * Debe renderizar su propio <html>/<body> porque sustituye al layout raíz,
 * y por eso lleva estilos inline (globals.css podría no haberse cargado).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (typeof console !== 'undefined') console.error('Global error:', error)
  }, [error])

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#FBFBFD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: '-apple-system, system-ui, sans-serif',
          color: '#1d1d1f',
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            background: '#fff',
            borderRadius: 20,
            padding: '40px 32px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            border: '1px solid #ECECEF',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#FEE2E2',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px', letterSpacing: '-0.018em' }}>
            La aplicación ha fallado
          </h1>
          <p style={{ color: '#6e6e73', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 6px' }}>
            Ha ocurrido un error inesperado al cargar Politeia. Vuelve a intentarlo;
            si persiste, recarga la página.
          </p>
          {error?.message && (
            <p
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 11,
                color: '#9CA3AF',
                background: '#FAFAFB',
                padding: '8px 12px',
                borderRadius: 8,
                margin: '12px 0 20px',
                wordBreak: 'break-word',
              }}
            >
              {error.message}
              {error.digest && <span style={{ display: 'block', marginTop: 4 }}>digest: {error.digest}</span>}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '10px 20px',
                borderRadius: 999,
                border: 'none',
                background: '#1F4E8C',
                color: '#fff',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
            <a
              href="/inicio"
              style={{
                padding: '10px 20px',
                borderRadius: 999,
                border: '1px solid #D9D9DE',
                background: '#fff',
                color: '#1d1d1f',
                fontSize: 13.5,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
