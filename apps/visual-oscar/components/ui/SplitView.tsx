'use client'
/**
 * <SplitView /> · layout horizontal o vertical de 2 paneles redimensionables.
 *
 * Implementación ligera sin librería externa. Soporta:
 *   - direction='horizontal' (col-resize) | 'vertical' (row-resize)
 *   - initialSize en %, mínimo y máximo
 *   - persistencia en localStorage (opcional, vía storageKey)
 *
 * Esto desbloquea el layout multi-pane del workspace investigation-centric
 * (Pilar 2 §6.1). De momento solo se usa programáticamente · si quieres una
 * split-pane más completa (3 paneles, anidados), añade lo necesario aquí.
 */
import { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from 'react'

export interface SplitViewProps {
  primary: ReactNode
  secondary: ReactNode
  direction?: 'horizontal' | 'vertical'
  initialSize?: number   // %
  minSize?: number       // %
  maxSize?: number       // %
  storageKey?: string    // si se pasa, persiste tamaño en localStorage
  className?: string
}

export function SplitView({
  primary, secondary,
  direction = 'horizontal',
  initialSize = 50, minSize = 20, maxSize = 80,
  storageKey, className,
}: SplitViewProps) {
  const stored = (() => {
    if (typeof window === 'undefined' || !storageKey) return initialSize
    const v = window.localStorage.getItem(`splitview:${storageKey}`)
    const n = v ? parseFloat(v) : NaN
    return Number.isFinite(n) ? Math.min(maxSize, Math.max(minSize, n)) : initialSize
  })()
  const [size, setSize] = useState<number>(stored)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<boolean>(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
  }, [direction])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const px = direction === 'horizontal'
        ? e.clientX - rect.left
        : e.clientY - rect.top
      const total = direction === 'horizontal' ? rect.width : rect.height
      const pct = (px / total) * 100
      const clamped = Math.min(maxSize, Math.max(minSize, pct))
      setSize(clamped)
    }
    const onUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      if (storageKey && typeof window !== 'undefined') {
        window.localStorage.setItem(`splitview:${storageKey}`, String(size))
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [direction, minSize, maxSize, storageKey, size])

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    width: '100%', height: '100%', overflow: 'hidden',
  }
  const primaryStyle: CSSProperties = direction === 'horizontal'
    ? { width: `${size}%`, minWidth: 0, overflow: 'auto' }
    : { height: `${size}%`, minHeight: 0, overflow: 'auto' }
  const secondaryStyle: CSSProperties = direction === 'horizontal'
    ? { width: `${100 - size}%`, minWidth: 0, overflow: 'auto' }
    : { height: `${100 - size}%`, minHeight: 0, overflow: 'auto' }
  const handleStyle: CSSProperties = direction === 'horizontal'
    ? {
        width: 4, cursor: 'col-resize', background: 'var(--color-hairline-soft)',
        flexShrink: 0, transition: 'background var(--transition-fast, 0.12s)',
      }
    : {
        height: 4, cursor: 'row-resize', background: 'var(--color-hairline-soft)',
        flexShrink: 0,
      }

  return (
    <div ref={containerRef} className={className} style={containerStyle}>
      <div style={primaryStyle}>{primary}</div>
      <div onMouseDown={onMouseDown} style={handleStyle} aria-hidden />
      <div style={secondaryStyle}>{secondary}</div>
    </div>
  )
}
