'use client'
import { CSSProperties, ReactNode } from 'react'

export interface IntelCardProps {
  children: ReactNode
  padding?: number | string
  style?: CSSProperties
  onClick?: () => void
  hoverable?: boolean
}

export default function IntelCard({ children, padding = 18, style, onClick, hoverable }: IntelCardProps) {
  const base: CSSProperties = {
    background: '#fff',
    border: '1px solid #ECECEF',
    borderRadius: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    padding,
    cursor: onClick ? 'pointer' : 'default',
    transition: hoverable ? 'transform 160ms, box-shadow 160ms' : undefined,
    ...style,
  }
  // Sprint Quality-3 · accesibilidad WCAG 2.1.1 Keyboard
  // Si la tarjeta es CLICKABLE:
  //   1. role="button" → screen reader la anuncia como botón
  //   2. tabIndex={0} → entra en el orden de tabulación
  //   3. onKeyDown Enter/Space → dispara el handler como botón nativo
  // Si NO hay onClick, se renderiza como <div> normal (no entra en focus).
  const interactive = !!onClick
  return (
 <div
      style={base}
      onClick={onClick}
      {...(interactive ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.()
          }
        },
      } : {})}
      onMouseEnter={e => { if (hoverable) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.06)' } }}
      onMouseLeave={e => { if (hoverable) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' } }}>
      {children}
 </div>
  )
}
