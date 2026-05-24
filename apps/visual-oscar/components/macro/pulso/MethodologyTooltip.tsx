'use client'
/**
 * `<MethodologyTooltip />` · Sprint N19.
 *
 * Tooltip lightweight con hover delay para mostrar methodology + release +
 * confidence de un indicador. Sustituye `title=` nativo del navegador por
 * un componente con:
 *  - hover delay (300ms) para no aparecer en hovers accidentales
 *  - posicionamiento fijo bottom-right del trigger (no se sale del viewport)
 *  - estilo coherente con el design system (amber border + dark bg)
 *  - escape key para cerrar
 *  - aria-describedby para accesibilidad
 *
 * No depende de @floating-ui (libs externas) · usa hooks nativos + portal a
 * document.body. Fallback graceful en SSR (devuelve sólo children).
 *
 * Uso:
 *   <MethodologyTooltip
 *     methodology="..."
 *     release="Mensual · T+15 días"
 *     confidence="high"
 *     label="IPC YoY"
 *   >
 *     <div>...trigger...</div>
 *   </MethodologyTooltip>
 */
import { useEffect, useRef, useState, useId, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  label?: string
  methodology?: string
  release?: string
  confidence?: 'high' | 'medium' | 'low'
  description?: string
  children: ReactNode
  delayMs?: number
}

const CONFIDENCE_COLOR = {
  high: { bg: '#dcfce7', fg: '#166534', label: 'ALTA' },
  medium: { bg: '#fef3c7', fg: '#92400e', label: 'MEDIA' },
  low: { bg: '#fee2e2', fg: '#991b1b', label: 'BAJA' },
} as const

export function MethodologyTooltip({
  label,
  methodology,
  release,
  confidence,
  description,
  children,
  delayMs = 350,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; align: 'left' | 'right' } | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const id = useId()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const hasContent = methodology || release || confidence || description

  const compute = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const TIP_WIDTH = 360
    const TIP_HEIGHT = 200 // estimate
    const margin = 8
    let left = rect.right - TIP_WIDTH
    let align: 'left' | 'right' = 'right'
    if (left < margin) {
      left = rect.left
      align = 'left'
    }
    if (left + TIP_WIDTH > window.innerWidth - margin) {
      left = window.innerWidth - TIP_WIDTH - margin
    }
    let top = rect.bottom + 6
    if (top + TIP_HEIGHT > window.innerHeight - margin && rect.top > TIP_HEIGHT + margin) {
      top = rect.top - TIP_HEIGHT - 6
    }
    top = top + (window.scrollY || 0)
    left = left + (window.scrollX || 0)
    setPos({ top, left, align })
  }, [])

  const handleEnter = useCallback(() => {
    if (!hasContent) return
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    if (open) return
    openTimer.current = setTimeout(() => {
      compute()
      setOpen(true)
    }, delayMs)
  }, [delayMs, hasContent, open, compute])

  const handleLeave = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current)
      openTimer.current = null
    }
    if (!open) return
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }, [open])

  // Escape to close + reposition on scroll/resize
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', esc)
    window.addEventListener('resize', compute)
    window.addEventListener('scroll', compute, { passive: true })
    return () => {
      window.removeEventListener('keydown', esc)
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', compute)
    }
  }, [open, compute])

  useEffect(() => () => {
    if (openTimer.current) clearTimeout(openTimer.current)
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  if (!hasContent) return <>{children}</>

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        aria-describedby={open ? id : undefined}
        style={{ display: 'inline-block' }}
      >
        {children}
      </span>
      {open && mounted && pos && createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          id={id}
          onMouseEnter={() => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null } }}
          onMouseLeave={handleLeave}
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            width: 360,
            zIndex: 9999,
            background: '#0f172a',
            color: '#f1f5f9',
            border: '1px solid #1e293b',
            borderLeft: '3px solid #f59e0b',
            borderRadius: 8,
            padding: 12,
            boxShadow: '0 14px 32px rgba(2, 6, 23, 0.40)',
            fontSize: 11,
            lineHeight: 1.5,
            pointerEvents: 'auto',
          }}
        >
          {label && (
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#fbbf24', letterSpacing: 0.4 }}>
              {label}
            </p>
          )}
          {methodology && (
            <div style={{ marginTop: label ? 6 : 0 }}>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: 0.6, color: '#fbbf24', textTransform: 'uppercase' }}>
                ⓘ Metodología
              </p>
              <p style={{ margin: '2px 0 0', color: '#e2e8f0' }}>{methodology}</p>
            </div>
          )}
          {(release || confidence) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {release && (
                <span style={{ fontSize: 9, padding: '3px 7px', background: '#1e3a8a', color: '#dbeafe', borderRadius: 4 }}>
                  ⏱ {release}
                </span>
              )}
              {confidence && (
                <span style={{
                  fontSize: 9,
                  padding: '3px 7px',
                  background: CONFIDENCE_COLOR[confidence].bg,
                  color: CONFIDENCE_COLOR[confidence].fg,
                  borderRadius: 4,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                }}>
                  Confianza {CONFIDENCE_COLOR[confidence].label}
                </span>
              )}
            </div>
          )}
          {!methodology && description && (
            <p style={{ margin: '6px 0 0', color: '#cbd5e1' }}>{description}</p>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

export default MethodologyTooltip
