'use client'
/**
 * ChartTooltip · sistema reutilizable de tooltips para gráficas SVG.
 *
 * Provee:
 *   - useChartTooltip()         · hook con estado (visible, x, y, label, value)
 *   - <ChartTooltip>            · overlay HTML posicionado sobre un container
 *   - <HoverArea>               · rect SVG transparente para captar mouseenter
 */
import { useState, useCallback } from 'react'

export interface TooltipState {
  visible: boolean
  x: number              // posición en %, relativa al container
  y: number              // posición en %, relativa al container
  label?: string         // título grande (e.g. "2024-Q3")
  value?: string         // valor principal (e.g. "186.75")
  unit?: string          // unidad (e.g. "%", "MW", "€/MWh")
  color?: string         // accent color
  extra?: string         // línea adicional (e.g. variación, comparativa)
}

const INITIAL: TooltipState = { visible: false, x: 0, y: 0 }

export function useChartTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState>(INITIAL)

  const show = useCallback((s: Omit<TooltipState, 'visible'>) => {
    setTooltip({ ...s, visible: true })
  }, [])

  const hide = useCallback(() => {
    setTooltip(s => ({ ...s, visible: false }))
  }, [])

  return { tooltip, show, hide }
}

export function ChartTooltip({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip.visible) return null
  return (
    <div
      style={{
        position: 'absolute',
        left: `${tooltip.x}%`,
        top: `${tooltip.y}%`,
        transform: 'translate(-50%, -110%)',
        background: 'rgba(29, 29, 31, 0.95)',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 11.5,
        pointerEvents: 'none',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        whiteSpace: 'nowrap',
        zIndex: 10,
        border: tooltip.color ? `1px solid ${tooltip.color}80` : '1px solid rgba(255,255,255,0.15)',
        backdropFilter: 'blur(6px)',
        transition: 'opacity 80ms ease-out',
      }}
    >
      {tooltip.label && (
        <div style={{
          fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
          textTransform: 'uppercase', opacity: 0.65, marginBottom: 4,
        }}>{tooltip.label}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16, fontWeight: 700,
          color: tooltip.color || '#fff',
          letterSpacing: '-0.01em',
        }}>{tooltip.value || '—'}</span>
        {tooltip.unit && <span style={{ fontSize: 10, opacity: 0.7 }}>{tooltip.unit}</span>}
      </div>
      {tooltip.extra && (
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3 }}>{tooltip.extra}</div>
      )}
      {/* Triángulo apuntando abajo */}
      <div style={{
        position: 'absolute',
        left: '50%',
        bottom: -5,
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid rgba(29, 29, 31, 0.95)',
      }}/>
    </div>
  )
}

/**
 * Wrapper para hacer un elemento SVG hover-able con tooltip.
 * Renderiza un rect transparente encima del elemento original.
 */
export function HoverableSVG({
  children, x, y, width, height,
  onShow, onHide,
}: {
  children: React.ReactNode
  x: number; y: number; width: number; height: number
  onShow: () => void
  onHide: () => void
}) {
  return (
    <g>
      {children}
      <rect
        x={x} y={y} width={width} height={height}
        fill="transparent"
        style={{ cursor: 'crosshair' }}
        onMouseEnter={onShow}
        onMouseLeave={onHide}
      />
    </g>
  )
}
