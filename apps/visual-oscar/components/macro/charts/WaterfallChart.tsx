'use client'
/**
 * `<WaterfallChart />` · SVG inline waterfall para descomposiciones
 * fiscales/PIB. Cada barra muestra una contribución positiva/negativa
 * acumulada desde el inicio hasta el total.
 *
 * Uso típico:
 *   Margen fiscal · descomposición variación deuda año a año:
 *   [Δ déficit primario, Δ intereses, Δ ajuste valoración, Δ PIB nom]
 *
 * No requiere librerías externas. Render 100% SVG.
 */

interface WaterfallBar {
  label: string;
  value: number;
  /** Si true, esta barra es el total final (apoya en suelo, no acumulada). */
  isTotal?: boolean;
  /** Override color. Por defecto verde positivo / rojo negativo / azul total. */
  color?: string;
}

interface Props {
  data: WaterfallBar[];
  height?: number;
  unit?: string;
  decimals?: number;
  title?: string;
  baselineLabel?: string;
}

export function WaterfallChart({
  data,
  height = 260,
  unit = '',
  decimals = 1,
  title,
  baselineLabel = 'Inicio',
}: Props) {
  if (!data || data.length === 0) return null

  // Calcular acumulados
  let running = 0
  const bars = data.map((b) => {
    if (b.isTotal) {
      return { ...b, start: 0, end: b.value }
    }
    const start = running
    running += b.value
    return { ...b, start, end: running }
  })

  const allValues = bars.flatMap((b) => [b.start, b.end, 0])
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const range = maxVal - minVal || 1
  const pad = range * 0.1
  const yMin = minVal - pad
  const yMax = maxVal + pad
  const yRange = yMax - yMin

  const w = 100
  const barWidth = 70 / bars.length
  const gap = 30 / Math.max(bars.length - 1, 1)

  const yScale = (v: number) => height - ((v - yMin) / yRange) * height

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#475569', textTransform: 'uppercase' }}>
          {title}
        </p>
      )}
      <svg width="100%" viewBox={`0 0 ${w} ${height + 60}`} style={{ display: 'block', overflow: 'visible' }}>
        {/* zero line */}
        <line
          x1={0}
          x2={w}
          y1={yScale(0)}
          y2={yScale(0)}
          stroke="#cbd5e1"
          strokeDasharray="2,2"
          strokeWidth={0.3}
        />
        {/* bars */}
        {bars.map((b, i) => {
          const x = 5 + i * (barWidth + gap)
          const isUp = b.value >= 0
          const color = b.color || (b.isTotal ? '#0f172a' : isUp ? '#16a34a' : '#dc2626')
          const top = Math.min(yScale(b.start), yScale(b.end))
          const bottom = Math.max(yScale(b.start), yScale(b.end))
          const barH = Math.max(bottom - top, 1)
          return (
            <g key={i}>
              <rect
                x={x}
                y={top}
                width={barWidth}
                height={barH}
                fill={color}
                opacity={b.isTotal ? 1 : 0.85}
                rx={1}
              />
              {/* connector line to next bar */}
              {!b.isTotal && i < bars.length - 1 && !bars[i + 1].isTotal && (
                <line
                  x1={x + barWidth}
                  x2={x + barWidth + gap}
                  y1={yScale(b.end)}
                  y2={yScale(b.end)}
                  stroke="#94a3b8"
                  strokeWidth={0.2}
                  strokeDasharray="1,1"
                />
              )}
              {/* value label */}
              <text
                x={x + barWidth / 2}
                y={top - 1}
                fontSize={2.4}
                fill={color}
                fontWeight={700}
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {b.value >= 0 ? '+' : ''}
                {b.value.toFixed(decimals)}
                {unit}
              </text>
              {/* x-axis label */}
              <text
                x={x + barWidth / 2}
                y={height + 6}
                fontSize={2.2}
                fill="#64748b"
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {b.label.length > 14 ? b.label.slice(0, 12) + '…' : b.label}
              </text>
            </g>
          )
        })}
        {/* y-axis labels (min/max) */}
        <text x={1} y={yScale(yMin) - 0.5} fontSize={2} fill="#94a3b8" fontFamily="system-ui">
          {yMin.toFixed(decimals)}
        </text>
        <text x={1} y={yScale(yMax) + 2} fontSize={2} fill="#94a3b8" fontFamily="system-ui">
          {yMax.toFixed(decimals)}
        </text>
      </svg>
      <p style={{ marginTop: 4, fontSize: 10, color: '#94a3b8', textAlign: 'right' }}>
        Inicio {baselineLabel} · variaciones acumuladas
      </p>
    </div>
  )
}

export default WaterfallChart
