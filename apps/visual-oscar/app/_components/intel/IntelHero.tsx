'use client'
import { CSSProperties, ReactNode } from 'react'

export interface IntelKpiInline {
  label: string
  value: string | number
  accent?: string
  sub?: string
}

export interface IntelHeroProps {
  eyebrow: string
  title: string
  subtitle?: string
  kpis?: IntelKpiInline[]
  rightSlot?: ReactNode
  colorFrom?: string
  colorTo?: string
}

export default function IntelHero({ eyebrow, title, subtitle, kpis, rightSlot, colorFrom = '#1F4E8C', colorTo = '#0F2A4F' }: IntelHeroProps) {
  const cardStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${colorFrom} 0%, ${colorTo} 100%)`,
    color: '#fff',
    borderRadius: 18,
    padding: '24px 32px',
    marginBottom: 18,
    display: 'grid',
    gridTemplateColumns: kpis && kpis.length > 0 ? '1.4fr 1fr' : '1fr',
    gap: 32,
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }
  return (
    <section style={cardStyle}>
      <div>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.7, textTransform: 'uppercase', margin: '0 0 8px' }}>
          {eyebrow}
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1 }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: 13, opacity: 0.7, margin: 0, lineHeight: 1.5, maxWidth: 720 }}>{subtitle}</p>}
      </div>
      {kpis && kpis.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`, gap: 8 }}>
          {kpis.map(k => (
            <div key={k.label} style={{
              background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 12, padding: '10px 12px',
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', opacity: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: k.accent || '#fff' }}>{k.value}</div>
              {k.sub && <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 2 }}>{k.sub}</div>}
            </div>
          ))}
        </div>
      )}
      {rightSlot && !kpis && <div>{rightSlot}</div>}
    </section>
  )
}
