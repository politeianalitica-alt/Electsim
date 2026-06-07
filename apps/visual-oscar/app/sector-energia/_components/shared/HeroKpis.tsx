'use client'
/**
 * <HeroKpis /> · Primitiva compartida · Energía v3 · Sprint E1
 *
 * Grid de tarjetas KPI "hero" que las vistas por tipo de energía repiten en su
 * cabecera (ver patrón `HeroKPI` en RenovablesView / GasView / …): label +
 * valor + unidad + footer, sobre la banda de color del hero. Se diseñan con
 * superficies translúcidas (rgba blanco) para asentarse sobre el gradiente del
 * hero; el color del valor lo aporta cada KPI (`color`).
 *
 * Una sola implementación memoizada. Cero emojis · Unicode geométrico.
 *
 * Adopción: este sprint la CREA; su migración plena en cada vista la harán los
 * sprints de profundidad (E3–E9). Aquí queda lista para consumir.
 */
import { useMemo } from 'react'

export interface HeroKpiItem {
  label: string
  /** Valor ya calculado. `null`/`undefined` → se muestra '—'. */
  value: number | string | null
  unit?: string
  /** Color del número (default blanco translúcido del hero). */
  color?: string
  /** Texto auxiliar bajo el valor (fuente, nota de degradación, etc.). */
  footer?: string
  /** Decimales para valores numéricos (default: 0 si ≥100, si no 1). */
  decimals?: number
  /** Si se pasa, la tarjeta es interactiva (drill-down). */
  onClick?: () => void
}

interface HeroKpisProps {
  items: HeroKpiItem[]
  /** Skeleton mientras se cargan los datos. */
  loading?: boolean
}

function formatValue(value: number | string | null, decimals?: number): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  const d = decimals != null ? decimals : value >= 100 ? 0 : 1
  return value.toLocaleString('es-ES', { maximumFractionDigits: d })
}

export function HeroKpis({ items, loading = false }: HeroKpisProps) {
  // El nº de columnas se adapta al recuento (2 si pocos, hasta 4).
  const cols = useMemo(() => Math.min(4, Math.max(2, items.length || 1)), [items.length])

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
        {Array.from({ length: items.length || cols }).map((_, i) => (
          <div
            key={i}
            style={{ height: 78, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12 }}
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
      {items.map((kpi) => {
        const interactive = typeof kpi.onClick === 'function'
        const display = formatValue(kpi.value, kpi.decimals)
        return (
          <div
            key={kpi.label}
            onClick={kpi.onClick}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      kpi.onClick?.()
                    }
                  }
                : undefined
            }
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 12,
              padding: '12px 14px',
              cursor: interactive ? 'pointer' : 'default',
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                opacity: 0.72,
                marginBottom: 4,
              }}
            >
              {kpi.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: kpi.color ?? '#fff',
                lineHeight: 1.05,
              }}
            >
              {display}
              {kpi.unit && (
                <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 5, opacity: 0.85 }}>{kpi.unit}</span>
              )}
            </div>
            {kpi.footer && <div style={{ fontSize: 9.5, opacity: 0.6, marginTop: 2 }}>{kpi.footer}</div>}
          </div>
        )
      })}
    </div>
  )
}

export default HeroKpis
