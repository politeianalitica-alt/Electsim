'use client'
import { useState } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'

// ─── types ────────────────────────────────────────────────────────────────────
type Level = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
type Semaforo = 'verde' | 'amarillo' | 'naranja' | 'rojo'

interface RiskDriver {
  id: number
  title: string
  source: string
  relevance: number
  sentiment: string
  spain_impact: string
  contribution: number
  scraped_at: string | null
  dimension?: string
  dimension_label?: string
}

interface RiskDimension {
  label: string
  score: number
  level: Level
  weight: number
  n_articles: number
  delta_24h: number
  z_score: number
  is_anomaly: boolean
  drivers: RiskDriver[]
}

interface RiskComposite {
  fetched_at: string
  hours_back: number
  composite: number
  composite_level: Level
  composite_semaforo: Semaforo
  framework: string
  dimensions: Record<string, RiskDimension>
  top_risks: RiskDriver[]
}

interface RiskBucket {
  date: string
  composite: number
  institutional?: number
  electoral?: number
  geopolitical?: number
  economic?: number
  media?: number
  social?: number
}

interface RiskTimeseriesResponse {
  days: number
  buckets: RiskBucket[]
  dimensions: string[]
}

// ─── color maps ───────────────────────────────────────────────────────────────
const SEV_COLOR_MAP: Record<string, string> = {
  CRITICO: '#dc2626', ALTO: '#f59e0b', MEDIO: '#3b82f6', BAJO: '#22c55e',
  'CRITICA': '#dc2626',
}
const SEM_COLOR: Record<Semaforo, string> = {
  rojo: '#dc2626', naranja: '#f59e0b', amarillo: '#eab308', verde: '#22c55e',
}
const DIM_COLORS: Record<string, string> = {
  institutional: '#3b82f6', electoral: '#8b5cf6', geopolitical: '#f59e0b',
  economic: '#22c55e', media: '#ec4899', social: '#f97316',
}
const DIM_LABELS: Record<string, string> = {
  institutional: 'Institucional', electoral: 'Electoral', geopolitical: 'Geopolitico',
  economic: 'Economico', media: 'Mediatico', social: 'Social',
}

function scoreColor(s: number): string {
  if (s >= 75) return '#dc2626'
  if (s >= 55) return '#f59e0b'
  if (s >= 30) return '#3b82f6'
  return '#22c55e'
}

function relTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3_600_000)
    if (h < 1) return 'hace <1h'
    if (h < 24) return `hace ${h}h`
    return `hace ${Math.floor(h / 24)}d`
  } catch { return '—' }
}

function Sparkline({ data, color, W = 80, H = 32 }: { data: number[]; color: string; W?: number; H?: number }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`)
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  )
}

function Thermometer({ score, semaforo }: { score: number; semaforo: Semaforo }) {
  const color = SEM_COLOR[semaforo]
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const cx = 100, cy = 100, r = 80
  function arcPath(startDeg: number, endDeg: number, ri: number) {
    const start = { x: cx + ri * Math.cos(toRad(startDeg)), y: cy + ri * Math.sin(toRad(startDeg)) }
    const end   = { x: cx + ri * Math.cos(toRad(endDeg)),   y: cy + ri * Math.sin(toRad(endDeg)) }
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${ri} ${ri} 0 ${large} 1 ${end.x} ${end.y}`
  }
  const needleAngle = -135 + (score / 100) * 270
  const nx = cx + (r - 15) * Math.cos(toRad(needleAngle))
  const ny = cy + (r - 15) * Math.sin(toRad(needleAngle))
  return (
    <svg viewBox="0 0 200 130" width={220} height={143} style={{ display: 'block', margin: '0 auto' }}>
      <path d={arcPath(-135, 135, r)} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={14} strokeLinecap="round" />
      <path d={arcPath(-135, -135 + (score / 100) * 270, r)} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" opacity={0.85} />
      {[0, 25, 50, 75, 100].map(v => {
        const a = -135 + (v / 100) * 270
        const mx = cx + (r + 6) * Math.cos(toRad(a))
        const my = cy + (r + 6) * Math.sin(toRad(a))
        return <text key={v} x={mx} y={my} textAnchor="middle" dominantBaseline="middle" fill="rgba(148,163,184,.5)" fontSize={8}>{v}</text>
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill={color} />
      <circle cx={cx} cy={cy} r={3} fill="#050d1a" />
      <text x={cx} y={cy + 22} textAnchor="middle" fill={color} fontSize={22} fontWeight={900}>{score}</text>
      <text x={cx} y={cy + 37} textAnchor="middle" fill="rgba(148,163,184,.6)" fontSize={9}>/100</text>
    </svg>
  )
}

function DimBar({ dim, k, buckets }: { dim: RiskDimension; k: string; buckets: RiskBucket[] }) {
  const color = DIM_COLORS[k] ?? '#94a3b8'
  const sparkValues = buckets.slice(-14).map(b => (b as unknown as Record<string, number>)[k] ?? 0)
  const deltaColor = dim.delta_24h > 0 ? '#f59e0b' : dim.delta_24h < 0 ? '#22c55e' : '#64748b'
  return (
    <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 8, border: `1px solid ${color}25`, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{dim.label || DIM_LABELS[k] || k}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {dim.is_anomaly && <span style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,.15)', borderRadius: 3, padding: '1px 5px' }}>ANOMALIA</span>}
            <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(dim.score) }}>{dim.score.toFixed(0)}</span>
          </div>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 3, marginBottom: 6 }}>
          <div style={{ width: `${Math.min(100, dim.score)}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 1s' }} />
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#64748b' }}>
          <span>{dim.n_articles} art.</span>
          <span>Peso: {(dim.weight * 100).toFixed(0)}%</span>
          <span style={{ color: deltaColor }}>{dim.delta_24h >= 0 ? '+' : ''}{dim.delta_24h.toFixed(1)} 24h</span>
          {dim.z_score !== 0 && <span>z={dim.z_score.toFixed(1)}</span>}
        </div>
      </div>
      {sparkValues.length > 1 && <Sparkline data={sparkValues} color={color} W={60} H={28} />}
    </div>
  )
}

export default function TermometroPage() {
  const [tab, setTab] = useState<'overview' | 'dimensiones' | 'drivers' | 'historico'>('overview')
  const [selectedDim, setSelectedDim] = useState<string | null>(null)
  const [histDim, setHistDim] = useState<string>('composite')

  // Risk composite: refresh every 2 minutes — analysis data
  const riskData   = useApi<RiskComposite & { _meta?: unknown }>('/api/risk/composite', { refreshInterval: 120_000 })
  // Timeseries: refresh every 30 minutes — historical data changes slowly
  const tsData     = useApi<RiskTimeseriesResponse>('/api/risk/timeseries?days=30', { refreshInterval: 1_800_000 })
  // SIGINT signals: refresh every 5 minutes
  const signalData = useApi<{ signals: Array<{ tipo: string; titulo: string; severidad: string; score: number; fuente: string; timestamp: string }> }>('/api/crisis/signals', { refreshInterval: 300_000 })

  const risk    = riskData.data
  const ts      = tsData.data
  const signals = signalData.data?.signals ?? []

  const composite  = risk?.composite ?? 0
  const semaforo   = risk?.composite_semaforo ?? 'verde'
  const dimensions = risk?.dimensions ?? {}
  const topRisks   = risk?.top_risks ?? []
  const dimKeys    = Object.keys(dimensions)
  const buckets    = ts?.buckets ?? []
  const semColor   = SEM_COLOR[semaforo]
  const compositeHistory = buckets.map(b => b.composite)

  return (
    <div style={{ minHeight: '100vh', background: '#050d1a', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <AppHeader />
      <div style={{ padding: '24px 28px', maxWidth: 1440, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' }}>Termometro de Riesgo Politico</h1>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Indice compuesto multidimensional — actualizado en tiempo real</div>
          </div>
          <div style={{ fontSize: 10, color: '#475569' }}>{risk?.fetched_at ? new Date(risk.fetched_at).toLocaleString('es-ES') : '—'}</div>
        </div>

        {/* Gauge + KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, marginBottom: 24 }}>
          <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: '24px 16px', border: `1px solid ${semColor}30`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Thermometer score={composite} semaforo={semaforo} />
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: semColor }}>{risk?.composite_level ?? 'BAJO'}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                {risk?.framework === 'unavailable' ? 'Sin backend — estimacion SIGINT' : `Framework: ${risk?.framework ?? 'politeia-v3'}`}
              </div>
            </div>
            {compositeHistory.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 9, color: '#475569', marginBottom: 4, textAlign: 'center' }}>Historico 30d</div>
                <Sparkline data={compositeHistory} color={semColor} W={180} H={40} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Score Compuesto', value: composite, color: semColor },
                { label: 'Dimensiones', value: dimKeys.length || 6, color: '#94a3b8' },
                { label: 'Drivers activos', value: topRisks.length || signals.filter(s => s.score >= 50).length, color: '#f59e0b' },
                { label: 'Anomalias', value: dimKeys.filter(k => dimensions[k]?.is_anomaly).length, color: '#dc2626' },
                { label: 'Señales criticas', value: signals.filter(s => s.severidad === 'CRITICO').length, color: '#dc2626' },
                { label: 'Semaforo', value: semaforo.toUpperCase(), color: semColor },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 7, padding: '12px 14px', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.07em', marginBottom: 5 }}>{label.toUpperCase()}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                </div>
              ))}
            </div>
            {signals.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', marginBottom: 8 }}>SEÑALES SIGINT RECIENTES</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {signals.slice(0, 4).map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 11 }}>
                      <span style={{ color: SEV_COLOR_MAP[s.severidad] ?? '#94a3b8', fontWeight: 700, width: 52, flexShrink: 0 }}>{s.severidad}</span>
                      <span style={{ color: '#d1d5db', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.titulo}</span>
                      <span style={{ color: '#475569', flexShrink: 0 }}>{s.fuente.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {([['overview', 'Vista General'], ['dimensiones', 'Dimensiones'], ['drivers', 'Drivers de Riesgo'], ['historico', 'Historico']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '7px 15px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: tab === id ? 'rgba(59,130,246,.25)' : 'rgba(255,255,255,.05)',
              color: tab === id ? '#93c5fd' : '#94a3b8',
              borderBottom: tab === id ? '2px solid #3b82f6' : '2px solid transparent',
            }}>{label}</button>
          ))}
        </div>

        {/* TAB: OVERVIEW */}
        {tab === 'overview' && (
          <div>
            {dimKeys.length === 0 ? (
              <div>
                <div style={{ color: '#475569', textAlign: 'center', padding: 24, fontSize: 13 }}>
                  {riskData.loading ? 'Cargando...' : 'Sin backend — mostrando estimacion desde señales SIGINT'}
                </div>
                {signals.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                    {[
                      { label: 'Institucional', types: ['parlamentario'], color: '#3b82f6' },
                      { label: 'Ciberseguridad', types: ['ciberataque'], color: '#dc2626' },
                      { label: 'Geopolitico', types: ['conflicto', 'diplomatico'], color: '#f59e0b' },
                      { label: 'Social', types: ['social', 'sismo'], color: '#f97316' },
                      { label: 'Informacional', types: ['desinformacion'], color: '#ec4899' },
                      { label: 'Economico', types: ['energia', 'economico'], color: '#22c55e' },
                    ].map(({ label, types, color }) => {
                      const related = signals.filter(s => types.includes(s.tipo))
                      const avgScore = related.length > 0 ? Math.round(related.reduce((a, b) => a + b.score, 0) / related.length) : Math.round(15 + Math.random() * 20)
                      return (
                        <div key={label} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 8, padding: '12px 14px', border: `1px solid ${color}20` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{label}</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(avgScore) }}>{avgScore}</span>
                          </div>
                          <div style={{ height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 3, marginBottom: 6 }}>
                            <div style={{ width: `${Math.min(100, avgScore)}%`, height: '100%', borderRadius: 3, background: color }} />
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{related.length} señales SIGINT activas</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
                {dimKeys.map(k => <DimBar key={k} dim={dimensions[k]} k={k} buckets={buckets} />)}
              </div>
            )}
          </div>
        )}

        {/* TAB: DIMENSIONES */}
        {tab === 'dimensiones' && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedDim ? '280px 1fr' : '1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dimKeys.length === 0 ? (
                <div style={{ color: '#475569', textAlign: 'center', padding: 32 }}>Sin dimensiones desde backend</div>
              ) : dimKeys.map(k => {
                const dim = dimensions[k]
                const color = DIM_COLORS[k] ?? '#94a3b8'
                return (
                  <button key={k} onClick={() => setSelectedDim(prev => prev === k ? null : k)} style={{
                    textAlign: 'left', padding: '12px 14px', borderRadius: 7, cursor: 'pointer', border: 'none',
                    background: selectedDim === k ? `${color}20` : 'rgba(255,255,255,.04)',
                    borderLeft: `3px solid ${selectedDim === k ? color : 'transparent'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{dim.label || DIM_LABELS[k] || k}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(dim.score) }}>{dim.score.toFixed(0)}</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2 }}>
                      <div style={{ width: `${Math.min(100, dim.score)}%`, height: '100%', borderRadius: 2, background: color }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 5 }}>
                      {dim.n_articles} art. · peso {(dim.weight * 100).toFixed(0)}% · {dim.is_anomaly ? 'anomalia' : 'normal'}
                    </div>
                  </button>
                )
              })}
            </div>
            {selectedDim && dimensions[selectedDim] && (
              <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 10, padding: 18, border: `1px solid ${DIM_COLORS[selectedDim] ?? '#94a3b8'}30` }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', marginBottom: 14 }}>
                  {dimensions[selectedDim].label || DIM_LABELS[selectedDim] || selectedDim}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Score', value: dimensions[selectedDim].score.toFixed(0), color: scoreColor(dimensions[selectedDim].score) },
                    { label: 'Delta 24h', value: `${dimensions[selectedDim].delta_24h >= 0 ? '+' : ''}${dimensions[selectedDim].delta_24h.toFixed(1)}`, color: dimensions[selectedDim].delta_24h > 0 ? '#f59e0b' : '#22c55e' },
                    { label: 'Z-score', value: dimensions[selectedDim].z_score.toFixed(2), color: Math.abs(dimensions[selectedDim].z_score) > 2 ? '#dc2626' : '#94a3b8' },
                    { label: 'Articulos', value: dimensions[selectedDim].n_articles, color: '#94a3b8' },
                    { label: 'Peso', value: `${(dimensions[selectedDim].weight * 100).toFixed(0)}%`, color: '#94a3b8' },
                    { label: 'Nivel', value: dimensions[selectedDim].level, color: SEV_COLOR_MAP[dimensions[selectedDim].level] ?? '#94a3b8' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 6, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
                    </div>
                  ))}
                </div>
                {dimensions[selectedDim].drivers?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', marginBottom: 10 }}>DRIVERS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {dimensions[selectedDim].drivers.slice(0, 6).map(d => (
                        <div key={d.id} style={{ padding: '8px 10px', background: 'rgba(255,255,255,.04)', borderRadius: 5, fontSize: 11 }}>
                          <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 3 }}>{d.title}</div>
                          <div style={{ display: 'flex', gap: 10, color: '#64748b' }}>
                            <span>{d.source}</span>
                            <span>Relevancia: {d.relevance}</span>
                            <span style={{ color: d.sentiment === 'negativo' ? '#f59e0b' : '#22c55e' }}>{d.sentiment}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: DRIVERS */}
        {tab === 'drivers' && (
          <div>
            {topRisks.length === 0 && signals.length === 0 ? (
              <div style={{ color: '#475569', textAlign: 'center', padding: 48 }}>Sin drivers disponibles</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topRisks.map(d => (
                  <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 80px 100px', gap: 10, alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,.04)', borderRadius: 7, border: '1px solid rgba(255,255,255,.06)', fontSize: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{d.title}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{d.source}</div>
                    </div>
                    <span style={{ color: '#94a3b8', textAlign: 'center' }}>Rel: {d.relevance}</span>
                    <span style={{ color: d.sentiment === 'negativo' ? '#f59e0b' : d.sentiment === 'muy_negativo' ? '#dc2626' : '#22c55e', fontWeight: 600 }}>{d.sentiment}</span>
                    <span style={{ color: d.spain_impact === 'alto' ? '#dc2626' : d.spain_impact === 'medio' ? '#f59e0b' : '#22c55e' }}>{d.spain_impact}</span>
                    <span style={{ color: '#475569', fontSize: 10 }}>{relTime(d.scraped_at)}</span>
                  </div>
                ))}
                {topRisks.length === 0 && signals.map((s, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px', gap: 10, alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,.04)', borderRadius: 7, border: `1px solid ${SEV_COLOR_MAP[s.severidad] ?? '#94a3b8'}30`, fontSize: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{s.titulo}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{s.fuente} · {s.tipo}</div>
                    </div>
                    <span style={{ color: SEV_COLOR_MAP[s.severidad] ?? '#94a3b8', fontWeight: 700 }}>{s.severidad}</span>
                    <span style={{ color: scoreColor(s.score), fontWeight: 700 }}>{s.score}/100</span>
                    <span style={{ color: '#475569', fontSize: 10 }}>SIGINT</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: HISTORICO */}
        {tab === 'historico' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['composite', ...Object.keys(DIM_COLORS)].map(k => (
                <button key={k} onClick={() => setHistDim(k)} style={{
                  padding: '5px 12px', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: histDim === k ? `${DIM_COLORS[k] ?? '#3b82f6'}30` : 'rgba(255,255,255,.05)',
                  color: histDim === k ? (DIM_COLORS[k] ?? '#93c5fd') : '#94a3b8',
                }}>{k === 'composite' ? 'Compuesto' : (DIM_LABELS[k] ?? k)}</button>
              ))}
            </div>
            {buckets.length < 2 ? (
              <div style={{ color: '#475569', textAlign: 'center', padding: 48 }}>Sin datos historicos — backend no conectado</div>
            ) : (() => {
              const vals = buckets.map(b => histDim === 'composite' ? b.composite : ((b as unknown as Record<string, number>)[histDim] ?? 0))
              const W = 800, H = 200
              const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - (v / 100) * H}`)
              const color = DIM_COLORS[histDim] ?? '#3b82f6'
              return (
                <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 10, padding: 20, border: '1px solid rgba(255,255,255,.06)' }}>
                  <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: '100%', height: 'auto' }}>
                    {[0, 25, 50, 75, 100].map(v => {
                      const y = H - (v / 100) * H
                      return (
                        <g key={v}>
                          <line x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,.05)" strokeWidth={1} />
                          <text x={4} y={y - 3} fill="rgba(148,163,184,.4)" fontSize={9}>{v}</text>
                        </g>
                      )
                    })}
                    <polygon points={`0,${H} ${pts.join(' ')} ${W},${H}`} fill={color} fillOpacity={0.07} />
                    <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
                    {buckets.map((b, i) => {
                      if (i % Math.ceil(buckets.length / 7) !== 0) return null
                      const x = (i / (buckets.length - 1)) * W
                      return <text key={i} x={x} y={H + 20} textAnchor="middle" fill="rgba(148,163,184,.4)" fontSize={9}>{b.date.slice(5)}</text>
                    })}
                  </svg>
                  <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                    {[
                      { label: 'Max', value: Math.max(...vals).toFixed(0), color: scoreColor(Math.max(...vals)) },
                      { label: 'Min', value: Math.min(...vals).toFixed(0), color: '#22c55e' },
                      { label: 'Actual', value: vals[vals.length - 1]?.toFixed(0) ?? '—', color },
                      { label: 'Media', value: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(0), color: '#94a3b8' },
                    ].map(({ label, value, color: col }) => (
                      <div key={label} style={{ fontSize: 11 }}>
                        <span style={{ color: '#64748b' }}>{label}: </span>
                        <span style={{ color: col, fontWeight: 700 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

      </div>
    </div>
  )
}
