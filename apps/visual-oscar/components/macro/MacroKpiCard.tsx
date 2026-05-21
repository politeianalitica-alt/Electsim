'use client'
/**
 * `<MacroKpiCard />` · Card KPI reutilizable con valor + label + footer + spark.
 */
import { MacroSpark } from './MacroSpark'

export function MacroKpiCard({
  label,
  value,
  unit = '%',
  delta,
  spark,
  color = '#0F766E',
  footer,
  onClick,
  loading = false,
  decimals = 1,
}: {
  label: string
  value: number | null | undefined
  unit?: string
  delta?: number | null
  spark?: number[]
  color?: string
  footer?: string
  onClick?: () => void
  loading?: boolean
  decimals?: number
}) {
  const fmt = (v: number) => {
    const sign = v > 0 && unit === '%' ? '+' : ''
    return `${sign}${v.toFixed(decimals)}${unit}`
  }
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `3px solid ${color}`,
        borderRadius: 10,
        padding: 14,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 120ms, box-shadow 120ms',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ fontSize: 28, color, fontWeight: 700, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.05 }}>
        {loading ? '…' : value != null && Number.isFinite(value) ? fmt(value) : '—'}
      </p>
      {delta != null && Number.isFinite(delta) && (
        <p style={{ fontSize: 10, margin: '2px 0 0', color: delta >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(decimals)}pp
        </p>
      )}
      {spark && spark.length > 1 && (
        <div style={{ marginTop: 6 }}>
          <MacroSpark points={spark} color={color} width={160} height={26} />
        </div>
      )}
      {footer && (
        <p style={{ fontSize: 9, color: '#94a3b8', margin: '6px 0 0', letterSpacing: 0.4 }}>{footer}</p>
      )}
    </div>
  )
}

export default MacroKpiCard
