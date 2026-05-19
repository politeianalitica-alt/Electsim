'use client'
/**
 * <Stat /> · KPI compacto tokenizado.
 *
 * Pieza universal: label arriba, valor grande, delta opcional, unidad,
 * todo desde tokens. Reemplaza los `<div style={{ fontSize: 14, color: '#6e6e73' }}>`
 * dispersos que tantos archivos usan.
 *
 * Variantes:
 *   tone='neutral' | 'positive' | 'negative' | 'warning'
 *   size='sm' | 'md' | 'lg'   · controla el tamaño del valor
 *
 * Si quieres un layout en grid de KPIs, envuelvelos en <Toolbar /> o un
 * grid CSS · este componente solo se ocupa del bloque individual.
 */
import { CSSProperties, ReactNode } from 'react'

export type StatTone = 'neutral' | 'positive' | 'negative' | 'warning'
export type StatSize = 'sm' | 'md' | 'lg'

export interface StatProps {
  label: string
  value: ReactNode
  unit?: string
  delta?: number
  deltaSuffix?: string
  hint?: string
  tone?: StatTone
  size?: StatSize
  icon?: ReactNode
  className?: string
}

const TONE_COLOR: Record<StatTone, string> = {
  neutral:  'var(--color-ink)',
  positive: 'var(--color-success)',
  negative: 'var(--color-danger)',
  warning:  'var(--color-warn)',
}

const VALUE_SIZE: Record<StatSize, string> = {
  sm: 'var(--text-lg)',
  md: 'var(--text-xl)',
  lg: 'var(--text-2xl)',
}

export function Stat({
  label, value, unit, delta, deltaSuffix = '',
  hint, tone = 'neutral', size = 'md', icon, className,
}: StatProps) {
  const valueStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: VALUE_SIZE[size],
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.05,
    color: TONE_COLOR[tone],
  }
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {icon && <span style={{ color: 'var(--color-ink-4)' }}>{icon}</span>}
        <span style={{
          fontSize: 'var(--text-xs)', fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--color-ink-4)',
        }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
        <span style={valueStyle}>{value}</span>
        {unit && (
          <span style={{
            fontSize: 'var(--text-sm)', fontWeight: 600,
            color: 'var(--color-ink-4)',
          }}>{unit}</span>
        )}
        {typeof delta === 'number' && (
          <DeltaPill delta={delta} suffix={deltaSuffix} />
        )}
      </div>
      {hint && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-5)' }}>{hint}</span>
      )}
    </div>
  )
}

function DeltaPill({ delta, suffix }: { delta: number; suffix: string }) {
  const isPos = delta > 0
  const isZero = delta === 0
  const color = isZero
    ? 'var(--color-ink-4)'
    : isPos ? 'var(--color-success)' : 'var(--color-danger)'
  const symbol = isZero ? '→' : isPos ? '▲' : '▼'
  return (
    <span style={{
      fontSize: 'var(--text-xs)', fontWeight: 700,
      color, letterSpacing: '0.02em',
    }}>
      {symbol} {Math.abs(delta).toFixed(1)}{suffix}
    </span>
  )
}
