'use client'
/**
 * `<MacroSpark />` · Mini sparkline SVG inline reutilizable.
 */
export function MacroSpark({
  points,
  color,
  stroke = 1.5,
  width = 180,
  height = 28,
  showLast = false,
}: {
  points: number[]
  color: string
  stroke?: number
  width?: number
  height?: number
  showLast?: boolean
}) {
  const valid = points.filter((v): v is number => Number.isFinite(v))
  if (valid.length < 2) return null
  const max = Math.max(...valid)
  const min = Math.min(...valid)
  const range = max - min || 1
  const step = width / Math.max(valid.length - 1, 1)
  const pts = valid
    .map(
      (v, i) =>
        `${(i * step).toFixed(1)},${(height - ((v - min) / range) * (height - 4) - 2).toFixed(1)}`,
    )
    .join(' ')
  const lastX = (valid.length - 1) * step
  const lastY = height - ((valid[valid.length - 1] - min) / range) * (height - 4) - 2
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
      {showLast && <circle cx={lastX} cy={lastY} r={2.5} fill={color} />}
    </svg>
  )
}

export default MacroSpark
