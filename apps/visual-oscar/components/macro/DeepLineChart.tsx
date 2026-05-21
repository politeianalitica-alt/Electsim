'use client'
/**
 * `<DeepLineChart />` · gráfico de líneas SVG con ejes, gridlines, hover.
 *
 * Soporta múltiples series, área shaded para forecast, anotaciones de eventos,
 * tooltip on hover con valor + período. Diseño profesional analítico.
 */
import { useState, useMemo } from 'react'

export interface ChartSeries {
  id: string
  label: string
  color: string
  points: { period: string; value: number | null }[]
  dashed?: boolean
  fillBelow?: boolean // útil para forecast areas
  forecastFromIndex?: number // a partir de qué índice es forecast (línea punteada)
}

interface Props {
  series: ChartSeries[]
  height?: number
  yLabel?: string
  showLegend?: boolean
  zeroLine?: boolean
  annotations?: { period: string; label: string; color?: string }[]
  onPointClick?: (period: string, seriesId: string) => void
  formatValue?: (v: number) => string
}

export function DeepLineChart({
  series,
  height = 240,
  yLabel,
  showLegend = true,
  zeroLine = false,
  annotations = [],
  onPointClick,
  formatValue = (v) => v.toFixed(1),
}: Props) {
  const [hover, setHover] = useState<{ x: number; period: string; values: { id: string; value: number; color: string; label: string }[] } | null>(null)

  const { allPeriods, yMin, yMax, paddedSeries } = useMemo(() => {
    const periodSet = new Set<string>()
    for (const s of series) for (const p of s.points) periodSet.add(p.period)
    const allPeriods = Array.from(periodSet).sort()
    const vals: number[] = []
    for (const s of series) for (const p of s.points) if (p.value != null && Number.isFinite(p.value)) vals.push(p.value)
    const min = vals.length ? Math.min(...vals) : 0
    const max = vals.length ? Math.max(...vals) : 1
    const range = max - min
    const padding = range > 0 ? range * 0.12 : 1
    const yMin = zeroLine ? Math.min(min, 0) - padding : min - padding
    const yMax = zeroLine ? Math.max(max, 0) + padding : max + padding
    // Re-align series to all periods (insert null donde no hay punto)
    const paddedSeries = series.map((s) => ({
      ...s,
      alignedPoints: allPeriods.map((p) => {
        const found = s.points.find((pt) => pt.period === p)
        return { period: p, value: found?.value ?? null }
      }),
    }))
    return { allPeriods, yMin, yMax, paddedSeries }
  }, [series, zeroLine])

  if (allPeriods.length === 0) return null

  const padLeft = 50
  const padRight = 16
  const padTop = 14
  const padBottom = 28
  const width = 760
  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom
  const xStep = chartW / Math.max(allPeriods.length - 1, 1)
  const yRange = yMax - yMin || 1

  const xToPx = (i: number) => padLeft + i * xStep
  const yToPx = (v: number) => padTop + chartH - ((v - yMin) / yRange) * chartH

  // Gridlines Y (5 ticks)
  const yTicks: number[] = []
  for (let i = 0; i <= 4; i++) yTicks.push(yMin + (yRange * i) / 4)

  // X ticks selectivos (max 10 labels)
  const xTickStep = Math.max(1, Math.ceil(allPeriods.length / 10))

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    const idx = Math.round((px - padLeft) / xStep)
    if (idx < 0 || idx >= allPeriods.length) { setHover(null); return }
    const period = allPeriods[idx]
    const values = paddedSeries
      .map((s) => {
        const p = s.alignedPoints[idx]
        return p.value != null ? { id: s.id, value: p.value, color: s.color, label: s.label } : null
      })
      .filter(Boolean) as { id: string; value: number; color: string; label: string }[]
    if (values.length === 0) { setHover(null); return }
    setHover({ x: xToPx(idx), period, values })
  }

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block', cursor: onPointClick ? 'pointer' : 'crosshair' }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        onClick={() => {
          if (hover && onPointClick) onPointClick(hover.period, paddedSeries[0]?.id || '')
        }}
      >
        {/* Gridlines Y */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={padLeft} x2={width - padRight}
              y1={yToPx(v)} y2={yToPx(v)}
              stroke={v === 0 && zeroLine ? '#94a3b8' : '#f1f5f9'}
              strokeWidth={v === 0 && zeroLine ? 1 : 0.5}
              strokeDasharray={v === 0 && zeroLine ? '4 2' : ''}
            />
            <text x={padLeft - 6} y={yToPx(v) + 3} fontSize={9} fill="#94a3b8" textAnchor="end">
              {formatValue(v)}
            </text>
          </g>
        ))}

        {/* Anotaciones verticales */}
        {annotations.map((a, i) => {
          const idx = allPeriods.indexOf(a.period)
          if (idx < 0) return null
          return (
            <g key={i}>
              <line
                x1={xToPx(idx)} x2={xToPx(idx)}
                y1={padTop} y2={padTop + chartH}
                stroke={a.color || '#cbd5e1'}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={xToPx(idx)} y={padTop + 10}
                fontSize={9} fill={a.color || '#64748b'}
                transform={`rotate(-90 ${xToPx(idx)} ${padTop + 10})`}
                textAnchor="end"
                style={{ fontWeight: 600 }}
              >
                {a.label}
              </text>
            </g>
          )
        })}

        {/* Series */}
        {paddedSeries.map((s) => {
          const fc = s.forecastFromIndex ?? -1
          const validHist: { i: number; v: number }[] = []
          const validFc: { i: number; v: number }[] = []
          s.alignedPoints.forEach((p, i) => {
            if (p.value == null) return
            if (fc >= 0 && i >= fc) validFc.push({ i, v: p.value })
            else validHist.push({ i, v: p.value })
          })
          const buildPath = (pts: { i: number; v: number }[]) =>
            pts.map((p, k) => `${k === 0 ? 'M' : 'L'} ${xToPx(p.i).toFixed(1)} ${yToPx(p.v).toFixed(1)}`).join(' ')
          return (
            <g key={s.id}>
              {s.fillBelow && validHist.length > 1 && (
                <path
                  d={`${buildPath(validHist)} L ${xToPx(validHist[validHist.length - 1].i)} ${yToPx(zeroLine ? 0 : yMin)} L ${xToPx(validHist[0].i)} ${yToPx(zeroLine ? 0 : yMin)} Z`}
                  fill={s.color}
                  opacity={0.12}
                />
              )}
              {validHist.length > 1 && (
                <path
                  d={buildPath(validHist)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeDasharray={s.dashed ? '4 3' : ''}
                />
              )}
              {validFc.length > 1 && (
                <>
                  {/* Línea de continuidad si hay hist + fc */}
                  {validHist.length > 0 && (
                    <line
                      x1={xToPx(validHist[validHist.length - 1].i)}
                      y1={yToPx(validHist[validHist.length - 1].v)}
                      x2={xToPx(validFc[0].i)}
                      y2={yToPx(validFc[0].v)}
                      stroke={s.color}
                      strokeWidth={1.5}
                      strokeDasharray="2 3"
                      opacity={0.7}
                    />
                  )}
                  <path
                    d={buildPath(validFc)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={1.8}
                    strokeLinejoin="round"
                    strokeDasharray="3 3"
                    opacity={0.85}
                  />
                </>
              )}
              {/* Punto último valor */}
              {validHist.length > 0 && (
                <circle
                  cx={xToPx(validHist[validHist.length - 1].i)}
                  cy={yToPx(validHist[validHist.length - 1].v)}
                  r={3}
                  fill={s.color}
                />
              )}
            </g>
          )
        })}

        {/* X axis labels */}
        {allPeriods.map((p, i) => {
          if (i % xTickStep !== 0 && i !== allPeriods.length - 1) return null
          return (
            <text
              key={i}
              x={xToPx(i)} y={height - padBottom + 14}
              fontSize={9} fill="#94a3b8" textAnchor="middle"
            >
              {p.length > 7 ? p.slice(2) : p}
            </text>
          )
        })}

        {/* Y axis label */}
        {yLabel && (
          <text
            x={12} y={padTop + chartH / 2}
            fontSize={10} fill="#64748b"
            textAnchor="middle"
            transform={`rotate(-90 12 ${padTop + chartH / 2})`}
            style={{ fontWeight: 600, letterSpacing: 0.4 }}
          >
            {yLabel}
          </text>
        )}

        {/* Hover crosshair */}
        {hover && (
          <line
            x1={hover.x} x2={hover.x}
            y1={padTop} y2={padTop + chartH}
            stroke="#0f172a" strokeWidth={1} strokeDasharray="2 2" opacity={0.4}
          />
        )}
      </svg>

      {/* Tooltip */}
      {hover && (
        <div style={{
          position: 'absolute',
          left: `${(hover.x / width) * 100}%`,
          top: 6,
          transform: 'translateX(-50%)',
          background: 'rgba(15,23,42,0.95)',
          color: '#fff',
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 11,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 5,
        }}>
          <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 3, opacity: 0.9 }}>{hover.period}</div>
          {hover.values.map((v) => (
            <div key={v.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ width: 8, height: 8, background: v.color, borderRadius: '50%' }} />
              <span>{v.label}: <strong>{formatValue(v.value)}</strong></span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      {showLegend && series.length > 1 && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 10 }}>
          {series.map((s) => (
            <span key={s.id} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: '#475569' }}>
              <span style={{ width: 10, height: 2, background: s.color, borderStyle: s.dashed ? 'dashed' : 'solid' }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default DeepLineChart
