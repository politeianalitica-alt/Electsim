'use client'

interface Props {
  /** Color scale — maps a number to a CSS color string (output of positiveColorScale / riskColorScale). */
  scale: (value: number) => string
  min: number
  max: number
  unit?: string
  steps?: number
}

export default function MapLegend({ scale, min, max, unit = '', steps = 6 }: Props) {
  const colors = Array.from({ length: steps }, (_, i) =>
    scale(min + (max - min) * (i / (steps - 1)))
  )
  const gradient = `linear-gradient(90deg, ${colors.join(', ')})`
  const fmt = (n: number) => Math.round(n).toLocaleString('es-ES')

  return (
 <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
 <span style={{ fontSize: 10, color: '#6e6e73' }}>{fmt(min)}</span>
 <div
        role="img"
        aria-label={`Escala: ${fmt(min)}–${fmt(max)}${unit ? ' ' + unit : ''}`}
        style={{ flex: 1, height: 8, borderRadius: 4, background: gradient, border: '1px solid rgba(0,0,0,0.06)' }}
      />
 <span style={{ fontSize: 10, color: '#6e6e73' }}>
        {fmt(max)}{unit ? ` ${unit}` : ''}
 </span>
 </div>
  )
}
