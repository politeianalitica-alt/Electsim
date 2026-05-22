'use client'
/**
 * Termómetro Pulso 0-100 con breakdown por señal.
 *
 * Devuelve un dial visual + lista de qué indicador vota qué.
 */

interface Signal {
  id: string
  vote: number
  reason: string
}

interface Props {
  score: number
  bySignal: Signal[]
  labelMap?: Record<string, string> // id → label legible
}

export function TermometroPulso({ score, bySignal, labelMap }: Props) {
  const safe = Math.max(0, Math.min(100, score))
  const color = safe >= 70 ? '#16a34a' : safe >= 40 ? '#f59e0b' : '#dc2626'
  const status = safe >= 70 ? 'EXPANSIVO' : safe >= 50 ? 'NEUTRO+' : safe >= 30 ? 'NEUTRO−' : 'RECESIVO'

  // Heatmap-style breakdown
  const sortedSignals = bySignal
    .slice()
    .sort((a, b) => b.vote - a.vote)

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${color}`,
        borderRadius: 10,
        padding: 16,
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 280px) 1fr',
        gap: 18,
      }}
    >
      {/* Dial */}
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: 0.8,
            color: '#0f172a',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          Termómetro Pulso
        </p>
        <div style={{ marginTop: 10, position: 'relative', height: 120 }}>
          <Dial value={safe} color={color} />
        </div>
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.6,
              padding: '3px 10px',
              background: `${color}1a`,
              color,
              borderRadius: 4,
            }}
          >
            {status}
          </span>
        </div>
        <p style={{ fontSize: 11, color: '#64748b', marginTop: 10, lineHeight: 1.5 }}>
          Score compuesto basado en {bySignal.length} indicadores macro con umbrales académicos.
          Verde = expansión sostenible · ámbar = tensiones · rojo = vulnerabilidades agregadas.
        </p>
      </div>

      {/* Breakdown */}
      <div>
        <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Descomposición · {bySignal.length} señales
        </p>
        <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
          {sortedSignals.map((s) => {
            const c = s.vote >= 70 ? '#16a34a' : s.vote >= 40 ? '#f59e0b' : '#dc2626'
            return (
              <div
                key={s.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(160px, 220px) 1fr 36px',
                  gap: 8,
                  alignItems: 'center',
                  padding: '3px 0',
                  fontSize: 11,
                }}
              >
                <span style={{ color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {labelMap?.[s.id] || s.id}
                </span>
                <div style={{ background: '#f1f5f9', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${s.vote}%`, height: '100%', background: c }} />
                </div>
                <span style={{ color: c, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                  {Math.round(s.vote)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Dial({ value, color }: { value: number; color: string }) {
  // Semicircle SVG dial
  const w = 240
  const h = 120
  const cx = w / 2
  const cy = h
  const r = 100
  const startAngle = Math.PI
  const endAngle = 2 * Math.PI

  const valueAngle = startAngle + (value / 100) * Math.PI

  const arcPath = (a0: number, a1: number) => {
    const x0 = cx + r * Math.cos(a0)
    const y0 = cy + r * Math.sin(a0)
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    const large = a1 - a0 > Math.PI ? 1 : 0
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
  }

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 14}`} style={{ display: 'block' }}>
      {/* track */}
      <path d={arcPath(startAngle, endAngle)} fill="none" stroke="#f1f5f9" strokeWidth={16} strokeLinecap="round" />
      {/* segments coloured */}
      <path d={arcPath(startAngle, startAngle + Math.PI * 0.3)} fill="none" stroke="#fee2e2" strokeWidth={16} />
      <path d={arcPath(startAngle + Math.PI * 0.3, startAngle + Math.PI * 0.5)} fill="none" stroke="#fef3c7" strokeWidth={16} />
      <path d={arcPath(startAngle + Math.PI * 0.5, endAngle)} fill="none" stroke="#dcfce7" strokeWidth={16} />
      {/* value progress */}
      <path d={arcPath(startAngle, valueAngle)} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
      {/* needle */}
      <circle cx={cx} cy={cy} r={6} fill={color} />
      <line
        x1={cx}
        y1={cy}
        x2={cx + r * 0.86 * Math.cos(valueAngle)}
        y2={cy + r * 0.86 * Math.sin(valueAngle)}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* center label */}
      <text
        x={cx}
        y={cy - 30}
        textAnchor="middle"
        fontSize={32}
        fontWeight={700}
        fill={color}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {Math.round(value)}
      </text>
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight={500}>
        / 100
      </text>
    </svg>
  )
}

export default TermometroPulso
