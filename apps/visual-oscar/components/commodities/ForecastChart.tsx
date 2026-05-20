'use client'

import { useMemo } from 'react'
import type { ForecastPoint, OHLCPoint } from '@/types/commodities'

interface Props {
  history: OHLCPoint[]
  forecast: ForecastPoint[]
  height?: number
}

/** Gráfico histórico + zona forecast con bandas confianza 80/95%. */
export function ForecastChart({ history, forecast, height = 320 }: Props) {
  const { points, bandUpper95, bandLower95, bandUpper80, bandLower80, dates, minY, maxY, splitIdx } = useMemo(() => {
    const validHist = history.filter((d) => d.close != null) as Required<OHLCPoint>[]
    const histVals = validHist.map((d) => d.close as number)
    const fcVals = forecast.map((f) => f.value)
    const upper95 = forecast.map((f) => f.upper_95)
    const lower95 = forecast.map((f) => f.lower_95)
    const upper80 = forecast.map((f) => f.upper_80)
    const lower80 = forecast.map((f) => f.lower_80)

    const all = [...histVals, ...fcVals, ...upper95, ...lower95]
    if (!all.length) {
      return {
        points: [], bandUpper95: [], bandLower95: [], bandUpper80: [], bandLower80: [],
        dates: [], minY: 0, maxY: 1, splitIdx: 0,
      }
    }
    const lo = Math.min(...all.filter((v) => v != null && !Number.isNaN(v)))
    const hi = Math.max(...all.filter((v) => v != null && !Number.isNaN(v)))
    const pad = (hi - lo) * 0.05
    const points = [...histVals, ...fcVals]
    const dates = [...validHist.map((d) => d.date), ...forecast.map((f) => f.date)]
    const split = validHist.length
    const u95 = new Array(split).fill(null).concat(upper95)
    const l95 = new Array(split).fill(null).concat(lower95)
    const u80 = new Array(split).fill(null).concat(upper80)
    const l80 = new Array(split).fill(null).concat(lower80)
    return {
      points, bandUpper95: u95, bandLower95: l95, bandUpper80: u80, bandLower80: l80,
      dates, minY: lo - pad, maxY: hi + pad, splitIdx: split,
    }
  }, [history, forecast])

  if (!points.length) {
    return <p style={{ fontSize: 12, color: '#9ca3af' }}>Sin datos.</p>
  }

  const W = Math.max(600, points.length * 8)
  const H = height
  const padL = 50
  const padR = 10
  const padT = 10
  const padB = 30
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const xScale = (i: number) => padL + (i * innerW) / Math.max(1, points.length - 1)
  const yScale = (v: number) => padT + (innerH * (maxY - v)) / Math.max(0.0001, maxY - minY)

  const polyHist = points
    .slice(0, splitIdx)
    .map((v, i) => `${xScale(i)},${yScale(v as number)}`)
    .join(' ')

  const polyFc = points
    .slice(splitIdx - 1)
    .map((v, idx) => `${xScale(splitIdx - 1 + idx)},${yScale(v as number)}`)
    .join(' ')

  const buildBand = (upper: (number | null)[], lower: (number | null)[]) => {
    const upPoints = upper
      .map((v, i) => (v == null ? null : `${xScale(i)},${yScale(v)}`))
      .filter(Boolean) as string[]
    const downPoints = lower
      .map((v, i) => (v == null ? null : `${xScale(i)},${yScale(v)}`))
      .filter(Boolean) as string[]
    return upPoints.concat(downPoints.reverse()).join(' ')
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: 8 }}>
      <svg width={W} height={H} role="img" aria-label="Gráfico forecast">
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const v = maxY - (maxY - minY) * p
          const y = padT + innerH * p
          return (
            <g key={idx}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e5e7eb" />
              <text x={4} y={y + 4} fontSize={10} fill="#9ca3af">
                {v.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
              </text>
            </g>
          )
        })}

        {/* Línea vertical split */}
        <line
          x1={xScale(splitIdx - 1)}
          x2={xScale(splitIdx - 1)}
          y1={padT}
          y2={H - padB}
          stroke="#9ca3af"
          strokeDasharray="4 4"
        />
        <text x={xScale(splitIdx - 1) + 4} y={padT + 12} fontSize={10} fill="#7c3aed" fontWeight={700}>
          ↑ forecast
        </text>

        {/* Banda 95% */}
        <polygon
          fill="rgba(124,58,237,0.12)"
          points={buildBand(bandUpper95, bandLower95)}
        />
        {/* Banda 80% */}
        <polygon
          fill="rgba(124,58,237,0.22)"
          points={buildBand(bandUpper80, bandLower80)}
        />

        {/* Histórico */}
        <polyline fill="none" stroke="#111827" strokeWidth={1.5} points={polyHist} />
        {/* Forecast */}
        <polyline
          fill="none"
          stroke="#7c3aed"
          strokeWidth={2}
          strokeDasharray="0"
          points={polyFc}
        />

        <text x={padL} y={H - 8} fontSize={10} fill="#6b7280">
          {dates[0]}
        </text>
        <text x={W - padR - 80} y={H - 8} fontSize={10} fill="#6b7280">
          {dates[dates.length - 1]}
        </text>
      </svg>
      <div style={{ display: 'flex', gap: 16, padding: '6px 12px', fontSize: 11, color: '#374151' }}>
        <Legend color="#111827" label="Histórico" />
        <Legend color="#7c3aed" label="Forecast" />
        <Legend color="rgba(124,58,237,0.22)" label="Banda 80%" filled />
        <Legend color="rgba(124,58,237,0.12)" label="Banda 95%" filled />
      </div>
    </div>
  )
}

function Legend({ color, label, filled }: { color: string; label: string; filled?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {filled ? (
        <span style={{ width: 12, height: 8, background: color, display: 'inline-block', borderRadius: 2 }} />
      ) : (
        <span style={{ width: 12, height: 2, background: color, display: 'inline-block' }} />
      )}
      {label}
    </span>
  )
}
