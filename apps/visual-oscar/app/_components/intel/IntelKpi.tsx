'use client'
import { CSSProperties } from 'react'

export interface IntelKpiProps {
  label: string
  value: string | number
  sub?: string
  delta?: string
  color?: string
}

export default function IntelKpi({ label, value, sub, delta, color = '#1F4E8C' }: IntelKpiProps) {
  const wrap: CSSProperties = {
    background: '#fff',
    border: '1px solid #ECECEF',
    borderRadius: 14,
    padding: '14px 16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }
  return (
 <div style={wrap}>
 <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', color: '#6e6e73', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
 </div>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color }}>
        {value}
 </div>
      {sub && <div style={{ fontSize: 11, color: '#86868b', marginTop: 3 }}>{sub}</div>}
      {delta && <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 2 }}>{delta}</div>}
 </div>
  )
}
