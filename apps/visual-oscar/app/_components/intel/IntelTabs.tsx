'use client'
import { CSSProperties } from 'react'

export interface IntelTab<T extends string> {
  id: T
  label: string
  count?: number
}

export interface IntelTabsProps<T extends string> {
  tabs: IntelTab<T>[]
  active: T
  onChange: (id: T) => void
}

export default function IntelTabs<T extends string>({ tabs, active, onChange }: IntelTabsProps<T>) {
  const wrap: CSSProperties = {
    display: 'inline-flex',
    background: '#F5F5F7',
    borderRadius: 999,
    padding: 3,
    gap: 2,
  }
  return (
    <div style={wrap}>
      {tabs.map(t => {
        const isActive = t.id === active
        const pill: CSSProperties = {
          padding: '6px 14px',
          borderRadius: 999,
          background: isActive ? '#fff' : 'transparent',
          color: isActive ? '#1d1d1f' : '#6e6e73',
          border: 'none',
          fontSize: 12,
          fontWeight: isActive ? 600 : 500,
          fontFamily: 'inherit',
          cursor: 'pointer',
          letterSpacing: '-0.005em',
          boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          transition: 'all 140ms',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }
        return (
          <button key={t.id} type="button" style={pill} onClick={() => onChange(t.id)}>
            {t.label}
            {typeof t.count === 'number' && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 999,
                background: isActive ? 'rgba(31,78,140,0.10)' : 'rgba(0,0,0,0.06)',
                color: isActive ? '#1F4E8C' : '#6e6e73', fontWeight: 600,
              }}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
