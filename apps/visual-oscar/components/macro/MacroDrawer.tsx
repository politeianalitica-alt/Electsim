'use client'
/**
 * `<MacroDrawer />` · Panel lateral derecho deslizable.
 *
 * Patrón Notion/Linear:
 *  - Slide-in 40% ancho desde la derecha (60% en mobile)
 *  - Backdrop dark con click-to-close
 *  - ESC key cierra
 *  - Header: título + subtítulo + close (X)
 *  - Body scrollable
 *  - Footer: fuente + última actualización + link externo
 *
 * Renderizar UNA SOLA VEZ cerca del top del árbol (ej. en layout de
 * /macro). Lee del MacroDrawerContext y muestra el content actual.
 */
import { useEffect } from 'react'
import { useMacroDrawer } from './MacroDrawerProvider'

export function MacroDrawer() {
  const { isOpen, content, close } = useMacroDrawer()

  // ESC key cierra
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handler)
    // bloquea scroll body cuando drawer abierto
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [isOpen, close])

  if (!isOpen || !content) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          zIndex: 100,
          animation: 'macroDrawerFadeIn 200ms ease',
        }}
      />

      {/* Drawer */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '42%',
          minWidth: 480,
          maxWidth: 720,
          background: '#fff',
          borderLeft: `4px solid ${content.accent ?? '#0F766E'}`,
          boxShadow: '-10px 0 40px rgba(0,0,0,0.18)',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          animation: 'macroDrawerSlide 280ms cubic-bezier(0.16, 1, 0.3, 1)',
          // Mobile: full width override via window check (no SSR mismatch)
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="macro-drawer-title"
      >
        {/* Header */}
        <header
          style={{
            padding: '18px 24px 14px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            background: '#fafafa',
          }}
        >
          <div>
            {content.subtitle && (
              <p style={{ fontSize: 10, color: content.accent ?? '#0F766E', fontWeight: 700, letterSpacing: 0.8, margin: 0, textTransform: 'uppercase' }}>
                {content.subtitle}
              </p>
            )}
            <h2
              id="macro-drawer-title"
              style={{ fontSize: 18, color: '#0f172a', fontWeight: 700, margin: '4px 0 0', letterSpacing: '-0.01em', lineHeight: 1.2 }}
            >
              {content.title}
            </h2>
          </div>
          <button
            onClick={close}
            aria-label="Cerrar"
            style={{
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 4,
              color: '#64748b',
              fontSize: 18,
              lineHeight: 1,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e7eb' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            ✕
          </button>
        </header>

        {/* Body scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, fontFamily: 'var(--font-text)' }}>
          {content.content}
        </div>

        {/* Footer fuente */}
        {content.source && (
          <footer
            style={{
              padding: '10px 24px',
              borderTop: '1px solid #e5e7eb',
              fontSize: 10,
              color: '#94a3b8',
              background: '#fafafa',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              Fuente · <strong style={{ color: '#475569' }}>{content.source.name}</strong>
              {content.source.updatedAt && ` · actualizado ${content.source.updatedAt}`}
            </span>
            {content.source.url && (
              <a
                href={content.source.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: content.accent ?? '#0F766E', textDecoration: 'none' }}
              >
                Ver fuente →
              </a>
            )}
          </footer>
        )}
      </aside>

      <style jsx global>{`
        @keyframes macroDrawerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes macroDrawerSlide {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 640px) {
          aside[role="dialog"] {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>
    </>
  )
}

export default MacroDrawer
