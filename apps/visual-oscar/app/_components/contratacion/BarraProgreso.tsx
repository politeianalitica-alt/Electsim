'use client'

export function BarraProgreso({
  pct,
  color = '#1F4E8C',
  height = 6,
  label,
}: {
  pct: number
  color?: string
  height?: number
  label?: string
}) {
  return (
 <div>
      {label && (
 <div style={{
          fontSize: 9,
          fontWeight: 800,
          color: '#6e6e73',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 3,
        }}>
          {label}
 </div>
      )}
 <div style={{
        height,
        background: '#F5F5F7',
        borderRadius: height / 2,
        overflow: 'hidden',
      }}>
 <div style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: '100%',
          background: color,
          borderRadius: height / 2,
        }} />
 </div>
 </div>
  )
}
