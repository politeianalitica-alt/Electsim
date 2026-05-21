'use client'
/**
 * Drawer provider para /prensa · slide-in derecha · ESC + backdrop click.
 * Reutiliza el patrón de MacroDrawerProvider.
 */
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

interface DrawerContent {
  title: string
  subtitle?: string
  accent?: string
  content: ReactNode
  footerHref?: string
  footerLabel?: string
}

interface MediosDrawerContextValue {
  isOpen: boolean
  content: DrawerContent | null
  openDrill: (c: DrawerContent) => void
  close: () => void
}

const Ctx = createContext<MediosDrawerContextValue>({
  isOpen: false,
  content: null,
  openDrill: () => {},
  close: () => {},
})

export function MediosDrawerProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<DrawerContent | null>(null)

  const openDrill = useCallback((c: DrawerContent) => setContent(c), [])
  const close = useCallback(() => setContent(null), [])

  useEffect(() => {
    if (!content) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handler)
    }
  }, [content, close])

  return (
    <Ctx.Provider value={{ isOpen: !!content, content, openDrill, close }}>
      {children}
      {content && (
        <>
          <div
            onClick={close}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.40)', zIndex: 100,
              backdropFilter: 'blur(2px)',
            }}
          />
          <aside
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 101,
              width: 'min(640px, 92vw)',
              background: '#fff',
              borderLeft: `4px solid ${content.accent || '#0f172a'}`,
              boxShadow: '-10px 0 40px rgba(15,23,42,0.18)',
              display: 'flex', flexDirection: 'column',
              animation: 'slideInRight 280ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <header style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                {content.subtitle && (
                  <p style={{ fontSize: 10, color: content.accent || '#475569', margin: 0, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                    {content.subtitle}
                  </p>
                )}
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '4px 0 0', lineHeight: 1.3 }}>
                  {content.title}
                </h3>
              </div>
              <button
                onClick={close}
                aria-label="Cerrar"
                style={{
                  background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 6,
                  width: 30, height: 30, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: '#64748b',
                }}
              >×</button>
            </header>
            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>{content.content}</div>
            {content.footerHref && (
              <footer style={{ padding: '12px 18px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
                <a href={content.footerHref} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: content.accent || '#0f766e', textDecoration: 'underline', fontWeight: 600 }}>
                  {content.footerLabel || 'Abrir fuente'} →
                </a>
              </footer>
            )}
          </aside>
          <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        </>
      )}
    </Ctx.Provider>
  )
}

export function useMediosDrawer() {
  return useContext(Ctx)
}
