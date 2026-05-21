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
  return (
 <div style={base} onClick={onClick}
      onMouseEnter={e => { if (hoverable) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.06)' } }}
      onMouseLeave={e => { if (hoverable) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' } }}>
      {children}
 </div>
  )
}
