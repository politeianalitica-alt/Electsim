'use client'

import { useState, useMemo } from 'react'
import { useApi } from '@/lib/useApi'
import Skeleton, { LiveDot } from './Skeleton'
import CountUp from './CountUp'
import LiveStatusBadge from './LiveStatusBadge'
import type { RiskComposite, RiskDimension, RiskDriver } from '../app/api/risk/composite/route'
import type { RiskTimeseriesResponse } from '../app/api/risk/timeseries/route'
import type { EscalationsResponse } from '../app/api/risk/escalations/route'
import type { RiskScenario } from '../app/api/risk/scenarios/route'

const DIM_KEYS = ['institutional', 'electoral', 'geopolitical', 'economic', 'media', 'social'] as const
type DimKey = typeof DIM_KEYS[number]

const LEVEL_COLOR: Record<string, string> = {
  'BAJO':    '#16A34A',
  'MEDIO':   '#D97706',
  'ALTO':    '#DC2626',
  'CRÍTICO': '#991B1B',
}
const SEMAFORO_BG: Record<string, string> = {
  verde:    '#F0FDF4',
  amarillo: '#FEFCE8',
  naranja:  '#FFF7ED',
  rojo:     '#FEF2F2',
}
const IMPACT_COLOR: Record<string, string> = {
  LOW: '#0EA5E9', MEDIUM: '#D97706', HIGH: '#DC2626', CRITICAL: '#991B1B',
}

function gaugeColor(score: number): string {
  if (score >= 75) return '#991B1B'
  if (score >= 50) return '#DC2626'
  if (score >= 30) return '#D97706'
  return '#16A34A'
}

export default function RiskIntelligence() {
  const [selectedDim, setSelectedDim] = useState<DimKey | null>(null)
  const [scenarioHorizon, setScenarioHorizon] = useState<'24h' | '7d' | '30d'>('7d')
  const [scenarios, setScenarios] = useState<RiskScenario[]>([])
  const [scenariosLoading, setScenariosLoading] = useState(false)

  const { data: composite, source, updatedAt, refresh } = useApi<RiskComposite>(
    '/api/risk/composite?hours_back=72',
    { refreshInterval: 180_000 }
  )

  const { data: timeseries } = useApi<RiskTimeseriesResponse>(
    '/api/risk/timeseries?days=14',
    { refreshInterval: 300_000 }
  )

  const { data: escalations } = useApi<EscalationsResponse>(
    '/api/risk/escalations?hours_back=72',
    { refreshInterval: 180_000 }
  )

  async function generateScenarios() {
    setScenariosLoading(true)
    try {
      const res = await fetch('/api/risk/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horizon: scenarioHorizon, n_scenarios: 3 }),
      })
      const json = await res.json()
      if (json.scenarios) setScenarios(json.scenarios)
    } catch { /* ignore */ }
    finally { setScenariosLoading(false) }
  }

  const dimList: { k: DimKey; d: RiskDimension }[] = useMemo(() => {
    if (!composite?.dimensions) return []
    return DIM_KEYS.map(k => ({ k, d: composite.dimensions[k] })).filter(x => x.d) as { k: DimKey; d: RiskDimension }[]
  }, [composite])

  const selDim = selectedDim && composite?.dimensions[selectedDim]

  return (
    <section style={{ marginTop: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.018em', margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'}/>
            Politeia Risk Index
          </h2>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0' }}>
            Marco ICRG adaptado · Pedersen · Kleinberg burst · EWMA · 6 dimensiones · {composite?.dimensions ? Object.values(composite.dimensions).reduce((s, d) => s + d.n_articles, 0) : '—'} señales analizadas
          </p>
        </div>
        <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={180} onRefresh={refresh}/>
      </div>

      {/* Top row: Gauge + Radar + Time series */}
      <div style={{ display: 'grid', gridTemplateColumns: '4fr 4fr 4fr', gap: 14, marginBottom: 16 }}>
        {/* Composite Gauge */}
        <CompositeGauge composite={composite}/>

        {/* Radar */}
        <RiskRadar
          dimensions={composite?.dimensions}
          selected={selectedDim}
          onSelect={setSelectedDim}
        />

        {/* Time series stack */}
        <CompositeTimeline timeseries={timeseries} composite={composite}/>
      </div>

      {/* Dimensions strip — clickable */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 16 }}>
        {dimList.length > 0 ? dimList.map(({ k, d }) => {
          const isActive = selectedDim === k
          const lvlColor = LEVEL_COLOR[d.level] || '#6E6E73'
          return (
            <button
              key={k}
              onClick={() => setSelectedDim(isActive ? null : k)}
              style={{
                background: isActive ? '#fff' : '#FAFAFB',
                border: `1px solid ${isActive ? lvlColor : '#ECECEF'}`,
                borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'left',
                transition: 'all 200ms', position: 'relative',
              }}
            >
              {d.is_anomaly && (
                <span style={{
                  position: 'absolute', top: 6, right: 8, fontSize: 8, fontWeight: 700,
                  color: '#DC2626', letterSpacing: '0.05em',
                }}>ANOMALÍA</span>
              )}
              <div style={{ fontSize: 9.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 4 }}>
                {d.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: lvlColor, lineHeight: 1 }}>
                  <CountUp value={d.score} decimals={1}/>
                </span>
                <span style={{ fontSize: 9.5, color: 'var(--ink-4)', fontWeight: 500 }}>/100</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontWeight: 600, color: lvlColor }}>{d.level}</span>
                <span style={{ color: d.delta_24h > 0 ? '#DC2626' : d.delta_24h < 0 ? '#16A34A' : 'var(--ink-4)', fontWeight: 600 }}>
                  {d.delta_24h > 0 ? '+' : ''}{d.delta_24h.toFixed(1)}
                </span>
              </div>
              {/* Mini progress bar */}
              <div style={{ marginTop: 6, height: 3, background: '#F5F5F7', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${d.score}%`, height: '100%', background: lvlColor, transition: 'width 800ms cubic-bezier(0.16,1,0.3,1)' }}/>
              </div>
            </button>
          )
        }) : (
          Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={86} radius={12}/>)
        )}
      </div>

      {/* Drill-down panel + Top risks panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 14, marginBottom: 16 }}>
        {/* Drill-down: dimension detail OR placeholder */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', minHeight: 280 }}>
          {selDim ? (
            <DimensionDrillDown dim={selDim}/>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--ink-4)', textAlign: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Selecciona una dimensión</span>
              <span style={{ fontSize: 11, fontStyle: 'italic' }}>Verás las noticias que más están elevando esa dimensión.</span>
            </div>
          )}
        </div>

        {/* Top global risks */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
            Top riesgos detectados ahora
          </h3>
          {composite?.top_risks && composite.top_risks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
              {composite.top_risks.slice(0, 6).map((r, i) => (
                <div key={`${r.id}-${i}`} style={{
                  padding: '8px 10px', background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 8,
                  animation: 'pol-fade-in 320ms ease-out', animationDelay: `${i * 30}ms`, animationFillMode: 'backwards',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: gaugeColor(r.contribution * 1.5), minWidth: 38, textAlign: 'right' }}>
                      {r.contribution.toFixed(0)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, letterSpacing: '0.04em',
                        background: '#EFF6FF', color: '#1F4E8C', marginRight: 6,
                      }}>{r.dimension_label?.toUpperCase()}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.4 }}>{r.title}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', display: 'flex', gap: 8, marginLeft: 46 }}>
                    <span style={{ fontWeight: 600 }}>{r.source}</span>
                    <span style={{ color: r.sentiment === 'negativo' ? '#DC2626' : r.sentiment === 'positivo' ? '#16A34A' : 'var(--ink-4)' }}>● {r.sentiment}</span>
                    <span>R{r.relevance}</span>
                    {r.spain_impact !== 'ninguno' && r.spain_impact !== 'bajo' && (
                      <span style={{ background: '#FEF3C7', color: '#92400E', padding: '0 4px', borderRadius: 3, fontWeight: 600 }}>
                        ESP {r.spain_impact}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} height={50} radius={8}/>)}
            </div>
          )}
        </div>
      </div>

      {/* Escalations panel */}
      <EscalationsPanel data={escalations}/>

      {/* Scenarios */}
      <ScenariosPanel
        scenarios={scenarios}
        loading={scenariosLoading}
        horizon={scenarioHorizon}
        onHorizonChange={setScenarioHorizon}
        onGenerate={generateScenarios}
      />
    </section>
  )
}

// ── Composite Gauge ─────────────────────────────────────────────────────────
function CompositeGauge({ composite }: { composite?: RiskComposite }) {
  const score = composite?.composite ?? 0
  const level = composite?.composite_level ?? 'BAJO'
  const semaforo = composite?.composite_semaforo ?? 'verde'
  const color = gaugeColor(score)

  // Arc params
  const dasharray = 282
  const filled = (score / 100) * dasharray

  return (
    <div style={{
      background: SEMAFORO_BG[semaforo] || '#FAFAFB',
      borderRadius: 14, padding: '20px 22px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: `1px solid ${color}30`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 220,
    }}>
      <div style={{ fontSize: 9.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
        Índice compuesto
      </div>
      <div style={{ position: 'relative', width: 200, height: 100 }}>
        <svg viewBox="0 0 200 100" style={{ width: '100%', height: '100%' }}>
          {/* Background arc */}
          <path d="M 10 100 A 90 90 0 0 1 190 100" stroke="#E5E7EB" strokeWidth="14" fill="none" strokeLinecap="round"/>
          {/* Color zones (translucent) */}
          <path d="M 10 100 A 90 90 0 0 1 64 22" stroke="#16A34A20" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <path d="M 64 22 A 90 90 0 0 1 100 10" stroke="#D9770620" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <path d="M 100 10 A 90 90 0 0 1 136 22" stroke="#DC262620" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <path d="M 136 22 A 90 90 0 0 1 190 100" stroke="#991B1B20" strokeWidth="3" fill="none" strokeLinecap="round"/>
          {/* Filled arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            stroke={color} strokeWidth="14" fill="none" strokeLinecap="round"
            strokeDasharray={`${filled} ${dasharray}`}
            style={{ transition: 'stroke-dasharray 1200ms cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', color, lineHeight: 1, marginTop: -8 }}>
        <CountUp value={score} decimals={1}/>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color, letterSpacing: '0.06em', marginTop: 4 }}>
        {level}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 6, fontFamily: 'var(--font-body)' }}>
        Semáforo <strong style={{ color }}>{semaforo}</strong>
      </div>
    </div>
  )
}

// ── Risk Radar ───────────────────────────────────────────────────────────────
function RiskRadar({ dimensions, selected, onSelect }: {
  dimensions?: Record<string, RiskDimension>
  selected: DimKey | null
  onSelect: (k: DimKey) => void
}) {
  const W = 280, H = 220
  const cx = W / 2, cy = H / 2 + 6
  const r = 80
  const dims = DIM_KEYS

  function pointAt(idx: number, value: number): [number, number] {
    const angle = (Math.PI * 2 * idx) / dims.length - Math.PI / 2
    const radius = (Math.max(0, Math.min(100, value)) / 100) * r
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]
  }
  function labelAt(idx: number): [number, number] {
    const angle = (Math.PI * 2 * idx) / dims.length - Math.PI / 2
    return [cx + Math.cos(angle) * (r + 22), cy + Math.sin(angle) * (r + 22)]
  }

  // Threshold rings
  const rings = [25, 50, 75]

  // Polygon points
  const dataPoints = dims.map((k, i) => pointAt(i, dimensions?.[k]?.score ?? 0))
  const polyPath = dataPoints.map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '20px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', minHeight: 220,
    }}>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
        Radar 6 dimensiones
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {/* Threshold rings */}
        {rings.map(t => (
          <circle key={t} cx={cx} cy={cy} r={(t / 100) * r}
                  stroke={t >= 75 ? '#FEE2E2' : t >= 50 ? '#FED7AA' : '#FEF3C7'}
                  strokeWidth="0.8" fill="none" strokeDasharray="2 2" opacity={0.6}/>
        ))}
        <circle cx={cx} cy={cy} r={r} stroke="#E5E7EB" strokeWidth="1" fill="none"/>

        {/* Axes */}
        {dims.map((_, i) => {
          const [x, y] = pointAt(i, 100)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#ECECEF" strokeWidth="0.5"/>
        })}

        {/* Data polygon */}
        {dimensions && (
          <polygon points={polyPath} fill="#1F4E8C40" stroke="#1F4E8C" strokeWidth="1.5"/>
        )}

        {/* Data dots */}
        {dimensions && dims.map((k, i) => {
          const v = dimensions[k]?.score ?? 0
          const [x, y] = pointAt(i, v)
          const c = gaugeColor(v)
          const isSelected = selected === k
          return (
            <g key={k} style={{ cursor: 'pointer' }} onClick={() => onSelect(k)}>
              <circle cx={x} cy={y} r={isSelected ? 5 : 3.5} fill={c} stroke="#fff" strokeWidth="1.5"/>
              <title>{`${dimensions[k]?.label}: ${v.toFixed(1)}/100`}</title>
            </g>
          )
        })}

        {/* Labels */}
        {dims.map((k, i) => {
          const [x, y] = labelAt(i)
          const label = dimensions?.[k]?.label || k
          const isSelected = selected === k
          // Shorten label to first 2 words
          const short = label.split(' ').slice(0, 2).join(' ')
          return (
            <text key={k} x={x} y={y} textAnchor="middle"
                  style={{ fontSize: 9.5, fontFamily: 'var(--font-display)', fill: isSelected ? '#1F4E8C' : '#6E6E73', fontWeight: isSelected ? 700 : 500, cursor: 'pointer' }}
                  onClick={() => onSelect(k)}>
              {short}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ── Composite Timeline ───────────────────────────────────────────────────────
function CompositeTimeline({ timeseries, composite }: {
  timeseries?: RiskTimeseriesResponse
  composite?: RiskComposite
}) {
  const buckets = timeseries?.buckets ?? []
  const W = 320, H = 220, padX = 12, padY = 30

  const maxScore = 60  // fixed scale 0-60 for clarity

  function project(idx: number, value: number): [number, number] {
    const x = padX + (idx / Math.max(1, buckets.length - 1)) * (W - 2 * padX)
    const y = (H - padY) - (Math.min(maxScore, value) / maxScore) * (H - padY - padY / 2)
    return [x, y]
  }

  // Lines per dimension (lighter), composite (bolder)
  const dimColors: Record<string, string> = {
    institutional: '#1F4E8C',
    electoral:     '#7C3AED',
    geopolitical:  '#0F766E',
    economic:      '#D97706',
    media:         '#DC2626',
    social:        '#15803D',
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '18px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', minHeight: 220,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Evolución 14 días
        </span>
        {composite && (
          <span style={{ fontSize: 11, fontWeight: 600, color: gaugeColor(composite.composite) }}>
            {composite.composite.toFixed(1)} hoy
          </span>
        )}
      </div>
      {buckets.length > 1 ? (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
          {/* Y axis grid */}
          {[15, 30, 45].map(t => {
            const [, y] = project(0, t)
            return (
              <g key={t}>
                <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#F5F5F7" strokeWidth="0.5"/>
                <text x={padX - 4} y={y + 3} textAnchor="end" style={{ fontSize: 8, fill: '#9CA3AF' }}>{t}</text>
              </g>
            )
          })}

          {/* Dimension lines (faint) */}
          {DIM_KEYS.map(k => {
            const path = buckets.map((b, i) => {
              const [x, y] = project(i, b[k] ?? 0)
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
            }).join(' ')
            return <path key={k} d={path} stroke={dimColors[k]} strokeWidth="0.8" fill="none" opacity={0.45}/>
          })}

          {/* Composite line (bold) */}
          {(() => {
            const path = buckets.map((b, i) => {
              const [x, y] = project(i, b.composite)
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
            }).join(' ')
            // Area fill
            const last = buckets.length - 1
            const [xL, yL] = project(last, buckets[last].composite)
            const [x0] = project(0, 0)
            const [, yBase] = project(0, 0)
            const fillPath = `${path} L ${xL} ${yBase} L ${x0} ${yBase} Z`
            return (
              <>
                <path d={fillPath} fill="#1F4E8C15"/>
                <path d={path} stroke="#1F4E8C" strokeWidth="2" fill="none"/>
                {/* Last point dot */}
                <circle cx={xL} cy={yL} r={3} fill="#1F4E8C" stroke="#fff" strokeWidth="1.5"/>
              </>
            )
          })()}

          {/* X axis dates (every 3 days) */}
          {buckets.map((b, i) => {
            if (i % 3 !== 0 && i !== buckets.length - 1) return null
            const [x] = project(i, 0)
            const date = new Date(b.date)
            return (
              <text key={i} x={x} y={H - 10} textAnchor="middle" style={{ fontSize: 8.5, fill: '#9CA3AF' }}>
                {date.getDate()}/{date.getMonth() + 1}
              </text>
            )
          })}
        </svg>
      ) : (
        <Skeleton width="100%" height={170} radius={8}/>
      )}
      {/* Mini legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, fontSize: 8.5, color: 'var(--ink-4)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 2, background: '#1F4E8C', display: 'inline-block' }}/>Compuesto</span>
        {DIM_KEYS.map(k => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 8, height: 2, background: dimColors[k], display: 'inline-block', opacity: 0.6 }}/>
            {k.slice(0, 4)}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Dimension Drill-down ─────────────────────────────────────────────────────
function DimensionDrillDown({ dim }: { dim: RiskDimension }) {
  const lvlColor = LEVEL_COLOR[dim.level] || '#6E6E73'
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Drill-down</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '4px 0 12px', letterSpacing: '-0.015em', color: '#1d1d1f' }}>
        {dim.label}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        <Stat label="Score"     value={dim.score} accent={lvlColor} decimals={1}/>
        <Stat label="Δ ventana" value={dim.delta_24h} accent={dim.delta_24h > 0 ? '#DC2626' : dim.delta_24h < 0 ? '#16A34A' : '#6E6E73'} decimals={1}/>
        <Stat label="Z-score"   value={dim.z_score} accent={Math.abs(dim.z_score) > 2 ? '#DC2626' : '#6E6E73'} decimals={2}/>
      </div>

      {dim.is_anomaly && (
        <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 9.5, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Anomalía detectada</div>
          <div style={{ fontSize: 11, color: '#991B1B', marginTop: 2 }}>z = {dim.z_score.toFixed(2)} (más de 2σ del baseline)</div>
        </div>
      )}

      {/* Drivers */}
      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>
        Por qué subió: noticias contributoras
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {dim.drivers.length > 0 ? dim.drivers.map(drv => (
          <div key={drv.id} style={{ padding: '8px 10px', background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: gaugeColor(drv.contribution * 1.5), minWidth: 38, textAlign: 'right' }}>
                {drv.contribution.toFixed(0)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 2 }}>{drv.title}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-4)', display: 'flex', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{drv.source}</span>
                  <span>● {drv.sentiment}</span>
                  <span>R{drv.relevance}</span>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <p style={{ fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' }}>
            Sin contribuyentes destacados en esta ventana.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Escalations Panel ────────────────────────────────────────────────────────
function EscalationsPanel({ data }: { data?: EscalationsResponse }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '18px 22px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16,
    }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
        Detección de escaladas
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {/* Burst */}
        <Section title="Burst topics (Kleinberg)" subtitle="rate 24h vs baseline">
          {(data?.burst_topics ?? []).slice(0, 6).map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--hairline)' }}>
              <span style={{ fontSize: 11, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                {b.is_new && <span style={{ fontSize: 8, fontWeight: 700, color: '#DC2626', marginRight: 4 }}>NUEVO</span>}
                {b.topic}
              </span>
              <span style={{ fontSize: 10.5, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#DC2626', flexShrink: 0 }}>
                ×{b.ratio.toFixed(1)}
              </span>
            </div>
          ))}
          {(!data?.burst_topics || data.burst_topics.length === 0) && (
            <p style={{ fontSize: 10.5, color: 'var(--ink-4)', fontStyle: 'italic' }}>Sin bursts detectados.</p>
          )}
        </Section>

        {/* Amplification */}
        <Section title="Amplificación cross-medio" subtitle="≥3 medios distintos">
          {(data?.amplification ?? []).slice(0, 5).map((a, i) => (
            <div key={i} style={{ padding: '5px 0', borderBottom: '1px solid var(--hairline)' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.topic}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>
                {a.n_sources} medios · {a.n_countries} países · {a.n_articles} arts
              </div>
            </div>
          ))}
          {(!data?.amplification || data.amplification.length === 0) && (
            <p style={{ fontSize: 10.5, color: 'var(--ink-4)', fontStyle: 'italic' }}>Sin amplificación destacada.</p>
          )}
        </Section>

        {/* Dual polarization */}
        <Section title="Polarización dual" subtitle="≥25% pos Y neg simultáneo">
          {(data?.dual_polarization ?? []).slice(0, 5).map((p, i) => (
            <div key={i} style={{ padding: '5px 0', borderBottom: '1px solid var(--hairline)' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.topic}
              </div>
              <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', background: '#F5F5F7', marginBottom: 2 }}>
                <div style={{ width: `${p.pos_pct}%`, background: '#16A34A' }}/>
                <div style={{ width: `${p.neu_pct}%`, background: '#9CA3AF' }}/>
                <div style={{ width: `${p.neg_pct}%`, background: '#DC2626' }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--ink-4)' }}>
                <span style={{ color: '#16A34A' }}>+{p.pos_pct.toFixed(0)}%</span>
                <span style={{ color: '#DC2626' }}>−{p.neg_pct.toFixed(0)}%</span>
              </div>
            </div>
          ))}
          {(!data?.dual_polarization || data.dual_polarization.length === 0) && (
            <p style={{ fontSize: 10.5, color: 'var(--ink-4)', fontStyle: 'italic' }}>Sin polarización dual significativa.</p>
          )}
        </Section>
      </div>
    </div>
  )
}

// ── Scenarios Panel ──────────────────────────────────────────────────────────
function ScenariosPanel({ scenarios, loading, horizon, onHorizonChange, onGenerate }: {
  scenarios: RiskScenario[]
  loading: boolean
  horizon: '24h' | '7d' | '30d'
  onHorizonChange: (h: '24h' | '7d' | '30d') => void
  onGenerate: () => void
}) {
  return (
    <div style={{
      background: '#1d1d1f', borderRadius: 14, padding: '20px 24px',
      color: '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
          Escenarios prospectivos · generados con Ollama
        </h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.08)', borderRadius: 999, padding: 2 }}>
            {(['24h', '7d', '30d'] as const).map(h => (
              <button key={h} onClick={() => onHorizonChange(h)} style={{
                background: horizon === h ? '#fff' : 'transparent',
                color: horizon === h ? '#1d1d1f' : 'rgba(255,255,255,0.6)',
                border: 'none', borderRadius: 999, padding: '4px 11px', fontSize: 11,
                fontWeight: horizon === h ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>{h}</button>
            ))}
          </div>
          <button onClick={onGenerate} disabled={loading} style={{
            background: loading ? 'rgba(255,255,255,0.1)' : '#5DBC52',
            color: loading ? 'rgba(255,255,255,0.5)' : '#1d1d1f',
            border: 'none', padding: '7px 14px', borderRadius: 999,
            fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
            cursor: loading ? 'wait' : 'pointer', letterSpacing: '0.04em',
          }}>
            {loading ? 'Generando…' : (scenarios.length > 0 ? 'Regenerar' : 'Generar escenarios')}
          </button>
        </div>
      </div>

      {scenarios.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {scenarios.map((sc, i) => (
            <ScenarioCard key={i} sc={sc} delay={i * 80}/>
          ))}
        </div>
      ) : loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} height={260} radius={10} style={{ background: 'rgba(255,255,255,0.08)' }}/>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: 0 }}>
          Pulsa "Generar escenarios" para que Ollama prospecte 3 escenarios con probabilidad, impacto y mitigaciones, anclados en los datos actuales del Risk Index.
        </p>
      )}
    </div>
  )
}

function ScenarioCard({ sc, delay }: { sc: RiskScenario; delay: number }) {
  const impColor = IMPACT_COLOR[sc.impact_level] || '#9CA3AF'
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 10, padding: '14px 16px',
      animation: 'pol-fade-in 360ms ease-out', animationDelay: `${delay}ms`, animationFillMode: 'backwards',
    }}>
      {/* Header: probability + impact */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em' }}>
          <CountUp value={sc.probability_pct}/>%
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: impColor, padding: '2px 8px', borderRadius: 4, background: `${impColor}20`, letterSpacing: '0.06em' }}>
          {sc.impact_level}
        </span>
      </div>
      {/* Probability bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 10 }}>
        <div style={{ width: `${sc.probability_pct}%`, height: '100%', background: impColor, borderRadius: 2, transition: 'width 800ms cubic-bezier(0.16,1,0.3,1)' }}/>
      </div>
      {/* Title */}
      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, margin: '0 0 6px', color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
        {sc.title}
      </h4>
      {/* Narrative */}
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', margin: '0 0 10px', lineHeight: 1.5 }}>
        {sc.narrative}
      </p>

      {/* Dimensions affected */}
      {(sc.dimensions_affected || []).length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 3 }}>Dimensiones</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {sc.dimensions_affected.map(d => (
              <span key={d} style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 3, background: 'rgba(31,78,140,0.4)', color: 'rgba(255,255,255,0.85)' }}>{d}</span>
            ))}
          </div>
        </div>
      )}

      {/* Triggers + Early warnings + Mitigations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {(sc.triggers || []).length > 0 && (
          <ScenarioField label="Triggers" items={sc.triggers} accent="#DC2626"/>
        )}
        {(sc.early_warnings || []).length > 0 && (
          <ScenarioField label="Early warnings" items={sc.early_warnings} accent="#D97706"/>
        )}
        {(sc.mitigations || []).length > 0 && (
          <ScenarioField label="Mitigaciones" items={sc.mitigations} accent="#5DBC52"/>
        )}
      </div>
    </div>
  )
}

function ScenarioField({ label, items, accent }: { label: string; items: string[]; accent: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 2 }}>{label}</div>
      {items.slice(0, 2).map((it, i) => (
        <div key={i} style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.4, paddingLeft: 8, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, color: accent }}>·</span>
          {it}
        </div>
      ))}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-2)', fontWeight: 700, letterSpacing: '0.02em', marginBottom: 1 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 9.5, color: 'var(--ink-4)', marginBottom: 8 }}>{subtitle}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
    </div>
  )
}

function Stat({ label, value, accent, decimals = 0 }: { label: string; value: number; accent: string; decimals?: number }) {
  return (
    <div style={{ padding: '8px 10px', background: '#FAFAFB', borderRadius: 8, border: '1px solid #ECECEF' }}>
      <div style={{ fontSize: 9, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', color: accent, lineHeight: 1 }}>
        <CountUp value={value} decimals={decimals}/>
      </div>
    </div>
  )
}
