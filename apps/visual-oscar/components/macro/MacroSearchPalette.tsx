'use client'
/**
 * `<MacroSearchPalette />` · Sprint N10 · Cmd+K global search.
 *
 * Modal overlay con input + dropdown de resultados. Busca en los ~130
 * indicadores de los 15 catálogos. Atajos teclado:
 *  - Cmd/Ctrl+K · abrir/cerrar
 *  - Esc · cerrar
 *  - ↑ ↓ · navegar resultados
 *  - Enter · abrir indicador en /macro/{slug}/indicator/{id}
 *  - Tab · cambiar foco (mantiene navegación dentro del modal)
 *
 * Aparece en el bottom-right del MacroShell como botón pill discreto
 * "⌘K · Buscar indicador" siempre visible. Click abre el modal.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchMacroIndicators, buildIndicatorHref, type SearchHit } from '@/lib/macro/macro-search'

interface Props {
  /** Si está controlado externamente, se ignora el atajo Cmd+K */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MacroSearchPalette({ open: openProp, onOpenChange }: Props) {
  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp !== undefined ? openProp : openInternal
  const setOpen = (v: boolean) => {
    if (openProp !== undefined) onOpenChange?.(v)
    else setOpenInternal(v)
  }

  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()

  const hits = useMemo(() => searchMacroIndicators(query, 15), [query])

  // Atajo Cmd+K / Ctrl+K global cuando uncontrolled
  useEffect(() => {
    if (openProp !== undefined) return // controlado externamente
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpenInternal((o) => !o)
      } else if (e.key === 'Escape' && openInternal) {
        e.preventDefault()
        setOpenInternal(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openProp, openInternal])

  // Focus al input al abrir + reset query
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  // Reset índice activo cuando cambian hits
  useEffect(() => {
    setActiveIdx(0)
  }, [hits.length])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && hits.length > 0) {
      e.preventDefault()
      const hit = hits[activeIdx]
      if (hit) {
        setOpen(false)
        router.push(buildIndicatorHref(hit))
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
        }}
      />
      {/* Modal */}
      <div
        role="dialog"
        aria-label="Buscar indicador macro"
        style={{
          position: 'fixed',
          top: '12vh',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(620px, 92vw)',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          zIndex: 9999,
          overflow: 'hidden',
          fontSize: 13,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: 16, color: '#94a3b8' }}>⌕</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar indicador… (paro, IPC, yield, REER, BERD, AROPE, IBEX…)"
            style={{
              flex: 1,
              border: 0,
              outline: 0,
              fontSize: 14,
              fontFamily: 'inherit',
              background: 'transparent',
              color: '#0f172a',
            }}
          />
          <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, padding: '3px 7px', border: '1px solid #e5e7eb', borderRadius: 4 }}>
            esc
          </span>
        </div>

        <div style={{ maxHeight: '56vh', overflowY: 'auto' }}>
          {!query && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
              <p style={{ margin: 0 }}>Busca entre 130+ indicadores de los 15 catálogos macro.</p>
              <p style={{ margin: '4px 0 0' }}>Ejemplos: <code>paro</code> · <code>10Y yield</code> · <code>REER</code> · <code>BERD</code> · <code>AROPE</code> · <code>turistas</code></p>
            </div>
          )}
          {query && hits.length === 0 && (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
              Sin resultados para “{query}”. Prueba con otra palabra clave o un sourceCode (ej. <code>IPC290750</code>, <code>irt_lt_mcby_m</code>).
            </div>
          )}
          {hits.map((hit, i) => {
            const active = i === activeIdx
            return (
              <button
                key={`${hit.subtabSlug}::${hit.indicator.id}`}
                onClick={() => {
                  setOpen(false)
                  router.push(buildIndicatorHref(hit))
                }}
                onMouseEnter={() => setActiveIdx(i)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '4px 1fr auto',
                  gap: 12,
                  padding: '10px 16px',
                  background: active ? '#f1f5f9' : '#fff',
                  border: 0,
                  borderBottom: '1px solid #f8fafc',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ background: hit.subtabAccent, borderRadius: 2, height: '100%' }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                    {hit.indicator.shortLabel || hit.indicator.label}
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 500, color: hit.subtabAccent, padding: '1px 6px', background: '#fff', border: `1px solid ${hit.subtabAccent}30`, borderRadius: 3 }}>
                      {hit.subtabLabel}
                    </span>
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#64748b' }}>
                    {hit.indicator.source} · {hit.indicator.sourceCode}
                    {hit.indicator.unit && ` · ${hit.indicator.unit}`}
                    {hit.indicator.frequency && ` · ${hit.indicator.frequency}`}
                  </p>
                </div>
                <span style={{ fontSize: 9, color: '#cbd5e1', fontWeight: 600, alignSelf: 'center' }}>
                  ↵
                </span>
              </button>
            )
          })}
        </div>

        <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12, fontSize: 10, color: '#94a3b8' }}>
          <span><kbd style={{ padding: '1px 5px', border: '1px solid #e5e7eb', borderRadius: 3, fontFamily: 'inherit' }}>↑ ↓</kbd> navegar</span>
          <span><kbd style={{ padding: '1px 5px', border: '1px solid #e5e7eb', borderRadius: 3, fontFamily: 'inherit' }}>↵</kbd> abrir indicador</span>
          <span style={{ marginLeft: 'auto' }}>{hits.length}/15 resultados</span>
        </div>
      </div>
    </>
  )
}

/**
 * Botón pill flotante que abre el palette · Sprint N10.
 * Se integra como children adicional en el hero de MacroShell.
 */
export function MacroSearchTrigger() {
  const [open, setOpen] = useState(false)
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Buscar indicador (Cmd+K)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 999,
          color: 'rgba(255,255,255,0.85)',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        ⌕ Buscar indicador
        <span style={{ fontSize: 9, padding: '1px 6px', background: 'rgba(255,255,255,0.12)', borderRadius: 3, fontWeight: 700 }}>
          {isMac ? '⌘K' : 'Ctrl+K'}
        </span>
      </button>
      <MacroSearchPalette open={open} onOpenChange={setOpen} />
    </>
  )
}

export default MacroSearchPalette
