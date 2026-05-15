'use client'
/**
 * RiskVisuals · 3 componentes del Termómetro de Riesgo Político
 *
 * Adaptados desde el handoff de Claude Design (project/riesgo-app.jsx):
 *
 *   - <RiesgoGauge value delta />
 *     Gauge semicircular con 5 zonas (Verde/Amarillo/Naranja/Rojo/Negro),
 *     aguja, valor central + delta + label "RIESGO POLÍTICO".
 *
 *   - <RiesgoRadar data />
 *     Radar de 6 ejes con 3 niveles (Vigilancia/Alerta/Crítico),
 *     polígonos solapados + dots en el nivel crítico.
 *
 *   - <RiesgoTrendChart trend />
 *     Serie histórica 30d (azul con área degradada) + previsión 14d
 *     (naranja punteada) + banda IC 80% (polígono naranja claro)
 *     + línea vertical "Hoy".
 *
 * SVG puro · sin d3 · viewBox responsive.
 */

// ────────────────────────────────────────────────────────────
//  GAUGE
// ────────────────────────────────────────────────────────────

export interface RiesgoGaugeProps {
  value: number
  delta?: number
  showTicks?: boolean
}

const GAUGE_SEGMENTS = [
  { from: 180, to: 216, color: '#22C55E', label: '0-20',    name: 'Verde'    },
  { from: 216, to: 252, color: '#84CC16', label: '20-40',   name: 'Amarillo' },
  { from: 252, to: 288, color: '#F59E0B', label: '40-60',   name: 'Naranja'  },
  { from: 288, to: 324, color: '#EF4444', label: '60-80',   name: 'Rojo'     },
  { from: 324, to: 360, color: '#7C2D12', label: '80-100',  name: 'Negro'    },
]

export function RiesgoGauge({ value, delta, showTicks = true }: RiesgoGaugeProps) {
  const W = 360, H = 220
  const cx = W / 2, cy = H * 0.85
  const r = 130
  const arc = (a1: number, a2: number, rad: number): string => {
    const x1 = cx + Math.cos(a1 * Math.PI / 180) * rad
    const y1 = cy + Math.sin(a1 * Math.PI / 180) * rad
    const x2 = cx + Math.cos(a2 * Math.PI / 180) * rad
    const y2 = cy + Math.sin(a2 * Math.PI / 180) * rad
    const large = (a2 - a1) > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${rad} ${rad} 0 ${large} 1 ${x2} ${y2}`
  }
  const clamped = Math.max(0, Math.min(100, value))
  const needleAngle = 180 + (clamped / 100) * 180
  const nx = cx + Math.cos(needleAngle * Math.PI / 180) * (r - 18)
  const ny = cy + Math.sin(needleAngle * Math.PI / 180) * (r - 18)
  const valueStr = value.toFixed(1).replace('.', ',')
  const deltaStr = delta != null ? Math.abs(delta).toFixed(1).replace('.', ',') : null
  const deltaColor = delta != null && delta < 0 ? '#16A34A' : '#DC2626'
  const deltaArrow = delta != null && delta < 0 ? '▼' : '▲'

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', margin: '0 auto' }}>
        {GAUGE_SEGMENTS.map((s, i) => (
          <path key={i} d={arc(s.from, s.to, r)} stroke={s.color} strokeWidth={22} fill="none" strokeLinecap="butt" opacity={0.92}/>
        ))}
        <text x={cx} y={H * 0.16} textAnchor="middle" fontSize={10.5} fill="#86868b" letterSpacing="0.1em" fontWeight={600}>
          RIESGO POLÍTICO
        </text>
        <text x={cx} y={cy - 56} textAnchor="middle" fontFamily="var(--font-display)" fontSize={48} fontWeight={600} letterSpacing="-0.03em" fill="#1d1d1f">
          {valueStr}
        </text>
        {delta != null && (
          <text x={cx} y={cy - 36} textAnchor="middle" fontSize={12} fill={deltaColor} fontWeight={600}>
            {deltaArrow} {deltaStr}
          </text>
        )}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#1d1d1f" strokeWidth={2.5} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={6} fill="#1d1d1f"/>
      </svg>
      {showTicks && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, padding: '8px 6px 0', fontSize: 10 }}>
          {GAUGE_SEGMENTS.map(s => (
            <div key={s.label} style={{ textAlign: 'center', color: '#86868b' }}>
              <div style={{ fontWeight: 600, color: '#3a3a3d' }}>{s.label}</div>
              <div style={{ fontWeight: 700, color: s.color, marginTop: 1 }}>{s.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
//  RADAR
// ────────────────────────────────────────────────────────────

export interface RiesgoRadarLevel {
  label: string
  color: string
  values: number[]
}

export interface RiesgoRadarData {
  axes: string[]
  levels: RiesgoRadarLevel[]  // se renderizan del más grande al más pequeño
}

export interface RiesgoRadarProps {
  data: RiesgoRadarData
  size?: 'small' | 'large'
}

export function RiesgoRadar({ data, size = 'small' }: RiesgoRadarProps) {
  const W = size === 'large' ? 1100 : 520
  const H = size === 'large' ?  520 : 360
  const R = size === 'large' ?  210 : 130
  const labelR = size === 'large' ? 234 : 158
  const fontSize = size === 'large' ? 13 : 10.5
  const dotR = size === 'large' ? 4 : 3

  const cx = W / 2, cy = H / 2
  const N = data.axes.length
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI / N)
  const point = (i: number, v: number): [number, number] => {
    const r = (v / 100) * R
    return [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r]
  }
  const polygon = (vals: number[]): string =>
    vals.map((v, i) => point(i, v).join(',')).join(' ')

  const rings = [20, 40, 60, 80, 100]
  // Renderizamos del más grande al más pequeño para que el más interno
  // quede arriba visualmente.
  const levelsSorted = [...data.levels].sort((a, b) => {
    const avgA = a.values.reduce((s, v) => s + v, 0) / a.values.length
    const avgB = b.values.reduce((s, v) => s + v, 0) / b.values.length
    return avgB - avgA
  })
  const topLevel = levelsSorted[levelsSorted.length - 1]
  const topDotsColor = topLevel?.color || '#EF4444'
  const criticalLevel = data.levels.find(l => /crítico|critic/i.test(l.label)) || levelsSorted[0]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: '100%', display: 'block' }}>
      {/* Anillos */}
      {rings.map(r => (
        <polygon key={r}
          points={Array.from({ length: N }).map((_, i) => point(i, r).join(',')).join(' ')}
          fill="none" stroke="#ECECEF" strokeWidth={1}/>
      ))}
      {/* Ejes */}
      {Array.from({ length: N }).map((_, i) => {
        const [x, y] = point(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#ECECEF" strokeWidth={1}/>
      })}
      {/* Polígonos por nivel (del más grande al más pequeño) */}
      {levelsSorted.map(l => (
        <polygon key={l.label}
          points={polygon(l.values)}
          fill={l.color} fillOpacity={0.18}
          stroke={l.color} strokeWidth={1.5}/>
      ))}
      {/* Dots solo en el nivel crítico (el más exterior) */}
      {criticalLevel && criticalLevel.values.map((v, i) => {
        const [x, y] = point(i, v)
        return <circle key={i} cx={x} cy={y} r={dotR} fill={topDotsColor}/>
      })}
      {/* Etiquetas de ejes */}
      {data.axes.map((a, i) => {
        const [x, y] = point(i, (labelR / R) * 100)
        return (
          <text key={a} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize={fontSize} fill="#3a3a3d" fontWeight={500}>
            {a}
          </text>
        )
      })}
    </svg>
  )
}

// Leyenda reusable para el radar (3 niveles)
export function RiesgoRadarLegend({ levels }: { levels: RiesgoRadarLevel[] }) {
  return (
    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#3a3a3d', flexWrap: 'wrap' }}>
      {levels.map(l => (
        <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <span style={{ width: 10, height: 10, background: l.color, borderRadius: 2 }}/>
          {l.label}
        </span>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
//  TREND CHART (histórico + previsión + IC 80%)
// ────────────────────────────────────────────────────────────

export interface RiesgoTrendData {
  history: number[]
  forecast: number[]
  forecastLow: number[]
  forecastHigh: number[]
}

export interface RiesgoTrendChartProps {
  trend: RiesgoTrendData
  height?: number
  todayLabel?: string
  xLabels?: Array<{ i: number; label: string }>
  yLabel?: string
  yearLabel?: string
}

export function RiesgoTrendChart({
  trend, height = 360,
  todayLabel = 'Hoy',
  xLabels,
  yLabel = 'Índice de Riesgo',
  yearLabel,
}: RiesgoTrendChartProps) {
  const W = 1100, H = height
  const padL = 48, padR = 24, padT = 18, padB = 38
  const max = 100
  const total = trend.history.length + trend.forecast.length
  const stepX = (W - padL - padR) / (total - 1)
  const x = (i: number): number => padL + i * stepX
  const y = (v: number): number => padT + (1 - v / max) * (H - padT - padB)

  const histPath = trend.history.map((v, i) => (i === 0 ? 'M' : 'L') + x(i) + ' ' + y(v)).join(' ')
  const histFill = histPath + ` L ${x(trend.history.length - 1)} ${H - padB} L ${x(0)} ${H - padB} Z`

  const last = trend.history.length - 1
  const fcPath = [`M ${x(last)} ${y(trend.history[last])}`, ...trend.forecast.map((v, i) => `L ${x(last + 1 + i)} ${y(v)}`)].join(' ')

  // Banda IC 80%: polygon con top + bottom invertido
  const bandTop = trend.forecastHigh.map((v, i) => `${x(last + 1 + i)},${y(v)}`).join(' ')
  const bandBot = [...trend.forecastLow].reverse().map((v, i) => `${x(last + trend.forecastLow.length - i)},${y(v)}`).join(' ')

  const todayX = x(last)
  const yTicks = [0, 20, 40, 60, 80, 100]

  // X labels por defecto: marcadores semanales
  const defaultXLabels = [
    { i: 4,  label: 'D-26' },
    { i: 11, label: 'D-19' },
    { i: 18, label: 'D-12' },
    { i: 25, label: 'D-5' },
    { i: 32, label: 'D+3' },
    { i: 39, label: 'D+10' },
  ]
  const labels = xLabels || defaultXLabels

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="riesgoHistFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0EA5E9" stopOpacity={0.18}/>
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0}/>
        </linearGradient>
      </defs>

      {/* Y grid */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)}
            stroke="#ECECEF" strokeDasharray={t === 0 ? '' : '2 4'}/>
          <text x={padL - 10} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#86868b">{t}</text>
        </g>
      ))}
      <text x={14} y={H / 2} fontSize={10.5} fill="#86868b"
        transform={`rotate(-90 14 ${H / 2})`} textAnchor="middle">
        {yLabel}
      </text>

      {/* X labels */}
      {labels.map(l => (
        <text key={l.label} x={x(l.i)} y={H - 16} textAnchor="middle" fontSize={10.5} fill="#86868b">{l.label}</text>
      ))}
      {yearLabel && <text x={x(0)} y={H - 4} fontSize={9.5} fill="#86868b" textAnchor="middle">{yearLabel}</text>}

      {/* Línea "Hoy" */}
      <line x1={todayX} y1={padT} x2={todayX} y2={H - padB}
        stroke="#86868b" strokeWidth={1} strokeDasharray="3 4"/>
      <text x={todayX} y={padT - 4} textAnchor="middle" fontSize={10.5} fill="#3a3a3d" fontWeight={500}>
        {todayLabel}
      </text>

      {/* Banda de confianza IC 80% */}
      <polygon points={bandTop + ' ' + bandBot} fill="#F59E0B" fillOpacity={0.16}/>

      {/* Histórico (area + line + dots) */}
      <path d={histFill} fill="url(#riesgoHistFill)"/>
      <path d={histPath} fill="none" stroke="#0EA5E9" strokeWidth={2}/>
      {trend.history.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={2.2} fill="#0EA5E9"/>
      ))}

      {/* Previsión (dashed line + dots) */}
      <path d={fcPath} fill="none" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 4"/>
      {trend.forecast.map((v, i) => (
        <circle key={i} cx={x(last + 1 + i)} cy={y(v)} r={2.4} fill="#F59E0B"/>
      ))}
    </svg>
  )
}

// Leyenda reusable para el trend (Histórico · Previsión · IC 80%)
export function RiesgoTrendLegend() {
  return (
    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#3a3a3d', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
        <svg width={22} height={6}><line x1={0} y1={3} x2={22} y2={3} stroke="#0EA5E9" strokeWidth={2}/></svg>
        Histórico
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
        <svg width={22} height={6}><line x1={0} y1={3} x2={22} y2={3} stroke="#F59E0B" strokeWidth={2} strokeDasharray="3 3"/></svg>
        Previsión (14d)
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
        <span style={{ width: 14, height: 9, background: '#F59E0B', opacity: 0.25, borderRadius: 2 }}/>
        IC 80%
      </span>
    </div>
  )
}
