'use client'

export function KpiCard({
  label,
  value,
  sub,
  delta,
  pos,
  color,
}: {
  label: string
  value: string
  sub?: string
  delta?: string
  pos?: boolean
  color: string
}) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #ECECEF',
      borderRadius: 12,
      padding: '14px 16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        fontSize: 9,
        fontWeight: 800,
        color: '#6e6e73',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          color,
          letterSpacing: '-0.022em',
          lineHeight: 1,
        }}>
          {value}
        </span>
        {sub && (
          <span style={{ fontSize: 10, color: '#86868b', fontWeight: 600 }}>{sub}</span>
        )}
      </div>
      {delta && (
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: pos ? '#16A34A' : color,
          marginTop: 5,
        }}>
          {pos ? '▲ ' : ''}{delta}
        </div>
      )}
    </div>
  )
}
