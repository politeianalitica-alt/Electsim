'use client'

import { useMemo } from 'react'
import type { OHLCPoint } from '@/types/commodities'

interface Props {
  data: OHLCPoint[]
  height?: number
  /** Indicadores opcionales superpuestos (línea). */
  overlays?: { name: string; values: (number | null)[]; color: string }[]
  /** Mostrar como línea simple en lugar de velas (para timeframes largos). */
  asLine?: boolean
}

/**
 * Mini-OHLC chart inline SVG · sin dependencias externas.
 * Para production "trader-grade" reemplazar por lightweight-charts.
 */
export function OHLCChart({ data, height = 320, overlays = [], asLine = false }: Props) {
  const { points, minY, maxY, width } = useMemo(() => {
    const w = Math.max(600, data.length * 8)
    const valid = data.filter((d) => d.close != null) as Required<OHLCPoint>[]
    if (valid.length === 0) return { points: [], minY: 0, maxY: 1, width: w }
    let lo = Infinity
    let hi = -Infinity
    valid.forEach((d) => {
      if (d.low != null && d.low < lo) lo = d.low
      if (d.high != null && d.high > hi) hi = d.high
      if (d.close != null) {
        lo = Math.min(lo, d.close)
        hi = Math.max(hi, d.close)
      }
    })
    overlays.forEach((ov) => {
      ov.values.forEach((v) => {
        if (v != null && !Number.isNaN(v)) {
          lo = Math.min(lo, v)
          hi = Math.max(hi, v)
        }
      })
    })
    const pad = (hi - lo) * 0.05
    return { points: valid, minY: lo - pad, maxY: hi + pad, width: w }
  }, [data, overlays])

  if (!points.length) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
        Sin datos OHLC.
      </div>
    )
  }

  const W = width
  const H = height
  const padL = 50
  const padR = 10
  const padT = 10
  const padB = 30
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const xScale = (i: number) => padL + (i * innerW) / Math.max(1, points.length - 1)
  const yScale = (v: number) =>
    padT + (innerH * (maxY - v)) / Math.max(0.0001, maxY - minY)

  const candleW = Math.max(2, Math.min(8, innerW / points.length - 2))

  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, background: '#fff' }}>
      <svg width={W} height={H} role="img" aria-label="Gráfico OHLC">
        {/* Eje Y · 5 líneas */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const v = maxY - (maxY - minY) * p
          const y = padT + innerH * p
          return (
            <g key={idx}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray={idx === 0 || idx === 4 ? 'none' : '2 4'}
              />
              <text x={4} y={y + 4} fontSize={10} fill="#9ca3af">
                {v.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
              </text>
            </g>
          )
        })}

        {/* Velas o línea de cierre */}
        {asLine ? (
          <polyline
            fill="none"
            stroke="#7c3aed"
            strokeWidth={1.5}
            points={points
              .map((p, i) => `${xScale(i)},${yScale(p.close as number)}`)
              .join(' ')}
          />
        ) : (
          points.map((p, i) => {
            const open = p.open ?? p.close ?? 0
            const close = p.close ?? open
            const high = p.high ?? Math.max(open, close)
            const low = p.low ?? Math.min(open, close)
            const x = xScale(i)
            const yH = yScale(high)
            const yL = yScale(low)
            const yO = yScale(open)
            const yC = yScale(close)
            const bull = close >= open
            const col = bull ? '#16a34a' : '#dc2626'
            const top = Math.min(yO, yC)
            const bh = Math.max(1, Math.abs(yC - yO))
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={yH} y2={yL} stroke={col} strokeWidth={1} />
                <rect
                  x={x - candleW / 2}
                  y={top}
                  width={candleW}
                  height={bh}
                  fill={col}
                  stroke={col}
                />
              </g>
            )
          })
        )}

        {/* Overlays · líneas de indicadores */}
        {overlays.map((ov) => {
          const pts = ov.values
            .map((v, i) => (v == null ? null : `${xScale(i)},${yScale(v)}`))
            .filter((s): s is string => s !== null)
            .join(' ')
          if (!pts) return null
          return (
            <polyline
              key={ov.name}
              fill="none"
              stroke={ov.color}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              points={pts}
            />
          )
        })}

        {/* Ticks X · primer y último */}
        <text x={padL} y={H - 8} fontSize={10} fill="#6b7280">
          {points[0]?.date}
        </text>
        <text x={W - padR - 80} y={H - 8} fontSize={10} fill="#6b7280">
          {points[points.length - 1]?.date}
        </text>
      </svg>

      {/* Leyenda overlays */}
      {overlays.length > 0 ? (
        <div style={{ display: 'flex', gap: 12, padding: '6px 12px', flexWrap: 'wrap' }}>
          {overlays.map((ov) => (
            <span key={ov.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <span
                style={{ width: 12, height: 2, background: ov.color, display: 'inline-block' }}
              />
              {ov.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
