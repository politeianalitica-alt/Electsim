'use client'
import { ReactNode } from 'react'

export interface IntelEmptyProps {
  title: string
  description?: string
  action?: ReactNode
}

export default function IntelEmpty({ title, description, action }: IntelEmptyProps) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #ECECEF',
      borderRadius: 14,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      padding: '48px 32px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'rgba(31,78,140,0.08)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1F4E8C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 8 L15 8 M9 12 L15 12 M9 16 L13 16" />
        </svg>
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.012em', margin: '0 0 6px', color: '#1d1d1f' }}>{title}</h3>
      {description && <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 auto', maxWidth: 480, lineHeight: 1.5 }}>{description}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  )
}
