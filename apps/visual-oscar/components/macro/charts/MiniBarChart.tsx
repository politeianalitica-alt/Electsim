'use client'
/**
 * `<MiniBarChart />` · SVG inline minimalista para preview de datasets.
 * Diseñado para ~50-80px de alto, sin ejes, sólo barras + valor último.
 * Usado por `<DatasetAnalyzer>` para visualizar al vuelo cualquier CSV
 * parseado (Sprint L F4).
 */
interface Point {
  label: string
  value: number | null
}

interface Props {
  data: Point[]
  accent?: string
  width?: number
  height?: number
  formatValue?: (v: number) => string
}

export function MiniBarChart({
  data,
  accent = '#0F766E',
  width = 480,
  height = 70,
  formatValue,
}: Props) {
  const valid = data.filter((p) => p.value != null && Number.isFinite(p.value)) as { label: string; value: number }[]
  if (valid.length === 0) {
    return (
      <div style={{ fontSize: 10, color: '#94a3b8', padding: '8px 0' }}>
        Sin valores numéricos para graficar.
      </div>
    )
  }
  const max = Math.max(...valid.map((p) => p.value))
  const min = Math.min(...valid.map((p) => p.value))
  const range = max - min || 1
  const barW = width / valid.length
  const fmt = formatValue || ((v: number) => v.toFixed(2))

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 14}`}
      width="100%"
      height={height + 14}
      style={{ display: 'block' }}
      role="img"
      aria-label={`Mini chart de ${valid.length} puntos, mínimo ${fmt(min)}, máximo ${fmt(max)}`}
    >
      {valid.map((p, i) => {
        const h = ((p.value - min) / range) * (height - 8) + 4
        const x = i * barW + 2
        const y = height - h
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={Math.max(1, barW - 4)}
              height={h}
              fill={accent}
              fillOpacity={0.85}
              rx={1}
            >
              <title>{`${p.label}: ${fmt(p.value)}`}</title>
            </rect>
          </g>
        )
      })}
      {/* Min/max labels */}
      <text x={2} y={height + 11} style={{ fontSize: 8, fill: '#94a3b8' }}>
        {valid[0]?.label || ''}
      </text>
      <text x={width - 2} y={height + 11} textAnchor="end" style={{ fontSize: 8, fill: '#94a3b8' }}>
        {valid[valid.length - 1]?.label || ''}
      </text>
      <text x={width / 2} y={10} textAnchor="middle" style={{ fontSize: 9, fill: '#0f172a', fontWeight: 600, fontVariantNumeric: 'tabular-nums' as any }}>
        último: {fmt(valid[valid.length - 1].value)} · rango {fmt(min)}–{fmt(max)}
      </text>
    </svg>
  )
}

export default MiniBarChart
