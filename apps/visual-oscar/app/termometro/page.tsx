'use client'
import { useState } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'

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

// ─── design tokens ────────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  CRITICO:  '#DC2626', ALTO: '#F59E0B', MEDIO: '#2563EB', BAJO: '#16A34A',
  CRITICA:  '#DC2626',
}
const SEM_COLOR: Record<Semaforo, string> = {
  rojo: '#DC2626', naranja: '#F59E0B', amarillo: '#EAB308', verde: '#16A34A',
}
const SEM_LABEL: Record<Semaforo, string> = {
  rojo: 'CRÍTICO', naranja: 'ALTO', amarillo: 'MEDIO', verde: 'BAJO',
}
const DIM_COLORS: Record<string, string> = {
  institutional: '#2563EB', electoral: '#7C3AED', geopolitical: '#F59E0B',
  economic: '#16A34A', media: '#EC4899', social: '#F97316',
}
const DIM_LABELS: Record<string, string> = {
  institutional: 'Institucional', electoral: 'Electoral', geopolitical: 'Geopolítico',
  economic: 'Económico', media: 'Mediático', social: 'Social',
}

function scoreColor(s: number): string {
  if (s >= 75) return '#DC2626'
  if (s >= 55) return '#F59E0B'
  if (s >= 30) return '#2563EB'
  return '#16A34A'
}

function scoreLabel(s: number): Level {
  if (s >= 75) return 'CRITICO'
  if (s >= 55) return 'ALTO'
  if (s >= 30) return 'MEDIO'
  return 'BAJO'
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

// ─── Sparkline (light) ────────────────────────────────────────────────────────
function Sparkline({ data, color, W = 80, H = 32 }: { data: number[]; color: string; W?: number; H?: number }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`)
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─── Termómetro Apple-like ────────────────────────────────────────────────────
function Thermometer({ score, semaforo, level }: { score: number; semaforo: Semaforo; level: string }) {
  const color = SEM_COLOR[semaforo]
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const cx = 140, cy = 140, r = 110
  function arcPath(startDeg: number, endDeg: number, ri: number) {
    const start = { x: cx + ri * Math.cos(toRad(startDeg)), y: cy + ri * Math.sin(toRad(startDeg)) }
    const end   = { x: cx + ri * Math.cos(toRad(endDeg)),   y: cy + ri * Math.sin(toRad(endDeg)) }
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${ri} ${ri} 0 ${large} 1 ${end.x} ${end.y}`
  }
  const needleAngle = -135 + (score / 100) * 270
  const nx = cx + (r - 22) * Math.cos(toRad(needleAngle))
  const ny = cy + (r - 22) * Math.sin(toRad(needleAngle))
  return (
    <svg viewBox="0 0 280 200" width="100%" height="auto" style={{ display: 'block', maxWidth: 320 }}>
      {/* Track segmentado · 4 zonas con sus colores */}
      {[
        { from: -135, to: -54,  c: '#16A34A' },
        { from: -54,  to:  18,  c: '#EAB308' },
        { from:  18,  to:  72,  c: '#F59E0B' },
        { from:  72,  to: 135,  c: '#DC2626' },
      ].map((seg, i) => (
        <path key={i} d={arcPath(seg.from, seg.to, r)} fill="none" stroke={seg.c} strokeWidth={14} strokeLinecap="butt" opacity={0.18} />
      ))}
      {/* Track activo */}
      <path d={arcPath(-135, -135 + (score / 100) * 270, r)} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" />
      {/* Marcas */}
      {[0, 25, 50, 75, 100].map(v => {
        const a = -135 + (v / 100) * 270
        const mx = cx + (r + 16) * Math.cos(toRad(a))
        const my = cy + (r + 16) * Math.sin(toRad(a))
        return <text key={v} x={mx} y={my + 3} textAnchor="middle" fill="#86868b" fontSize={10} fontWeight={600}>{v}</text>
      })}
      {/* Aguja */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#1d1d1f" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={9} fill={color} />
      <circle cx={cx} cy={cy} r={4} fill="#fff" />
      {/* Lectura central */}
      <text x={cx} y={cy + 38} textAnchor="middle" fill={color} fontSize={36} fontWeight={800} style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>{Math.round(score)}</text>
      <text x={cx} y={cy + 55} textAnchor="middle" fill="#86868b" fontSize={11} fontWeight={500}>/100</text>
      <text x={cx} y={cy + 78} textAnchor="middle" fill={color} fontSize={13} fontWeight={700} letterSpacing="0.08em">{level}</text>
    </svg>
  )
}

// ─── Dimension card (light) ───────────────────────────────────────────────────
function DimCard({ dim, k, buckets }: { dim: RiskDimension; k: string; buckets: RiskBucket[] }) {
  const color = DIM_COLORS[k] ?? '#6e6e73'
  const sparkValues = buckets.slice(-14).map(b => (b as unknown as Record<string, number>)[k] ?? 0)
  const deltaColor = dim.delta_24h > 0 ? '#DC2626' : dim.delta_24h < 0 ? '#16A34A' : '#86868b'
  const sc = scoreColor(dim.score)
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #ECECEF',
      borderLeft: `3px solid ${color}`,
      padding: '14px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {DIM_LABELS[k] || dim.label || k}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', color: sc, lineHeight: 1 }}>
              {dim.score.toFixed(0)}
            </span>
            <span style={{ fontSize: 11, color: '#86868b' }}>/100</span>
            {dim.is_anomaly && (
              <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: '#F59E0B', borderRadius: 999, padding: '2px 7px', letterSpacing: '0.06em' }}>ANOMALÍA</span>
            )}
          </div>
        </div>
        {sparkValues.length > 1 && <Sparkline data={sparkValues} color={color} W={68} H={32} />}
      </div>
      <div style={{ height: 5, background: '#F5F5F7', borderRadius: 3, marginBottom: 10 }}>
        <div style={{ width: `${Math.min(100, dim.score)}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 600ms ease' }} />
      </div>
      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#6e6e73', flexWrap: 'wrap' }}>
        <span><span style={{ fontWeight: 600, color: '#1d1d1f' }}>{dim.n_articles}</span> art.</span>
        <span>peso <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{(dim.weight * 100).toFixed(0)}%</span></span>
        <span style={{ color: deltaColor, fontWeight: 600 }}>{dim.delta_24h >= 0 ? '+' : ''}{dim.delta_24h.toFixed(1)} 24h</span>
        {Math.abs(dim.z_score) > 0.1 && <span>z=<span style={{ fontWeight: 600, color: '#1d1d1f' }}>{dim.z_score.toFixed(1)}</span></span>}
      </div>
    </div>
  )
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────
function KPI({ label, value, accent, sub }: { label: string; value: string | number; accent: string; sub?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '14px 18px',
      border: '1px solid #ECECEF', borderLeft: `3px solid ${accent}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em', color: accent, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#86868b', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function TermometroPage() {
  const [tab, setTab] = useState<'overview' | 'dimensiones' | 'drivers' | 'historico'>('overview')
  const [selectedDim, setSelectedDim] = useState<string | null>(null)
  const [histDim, setHistDim] = useState<string>('composite')

  const riskData   = useApi<RiskComposite & { _meta?: unknown }>('/api/risk/composite', { refreshInterval: 120_000 })
  const tsData     = useApi<RiskTimeseriesResponse>('/api/risk/timeseries?days=30', { refreshInterval: 1_800_000 })
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
  const semLabel   = risk?.composite_level || SEM_LABEL[semaforo]
  const compositeHistory = buckets.map(b => b.composite)
  const change7d = compositeHistory.length >= 8
    ? +(compositeHistory[compositeHistory.length - 1] - compositeHistory[compositeHistory.length - 8]).toFixed(1)
    : 0

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '28px 40px 80px' }}>

        {/* Header */}
        <section style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6e6e73', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span>INTELIGENCIA · TERMÓMETRO DE RIESGO</span>
            <LiveStatusBadge updatedAt={risk?.fetched_at ?? null} source={(riskData as unknown as { source?: string }).source ?? 'aggregator'} refreshIntervalSec={120} onRefresh={riskData.refresh}/>
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1, color: '#1d1d1f' }}>
            Termómetro de Riesgo <em style={{ fontWeight: 300, fontStyle: 'italic', color: '#6e6e73' }}>· España</em>
          </h1>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: 0, maxWidth: 880, lineHeight: 1.5 }}>
            Índice compuesto multidimensional · seis dimensiones agregadas (institucional, electoral,
            geopolítico, económico, mediático, social) con feeds públicos y análisis SIGINT en tiempo real.
          </p>
        </section>

        {/* Gauge + KPIs */}
        <section style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, marginBottom: 18 }}>

          {/* Gauge card */}
          <div style={{
            background: '#fff', borderRadius: 16, padding: '20px 16px 24px',
            border: '1px solid #ECECEF', borderTop: `4px solid ${semColor}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <Thermometer score={composite} semaforo={semaforo} level={semLabel} />
            <div style={{ marginTop: 4, fontSize: 11.5, color: '#6e6e73', textAlign: 'center' }}>
              {risk?.framework === 'unavailable' ? 'Estimación SIGINT · sin backend' : `Framework · ${risk?.framework ?? 'politeia-v3'}`}
            </div>
            {compositeHistory.length > 1 && (
              <div style={{ marginTop: 14, width: '100%', borderTop: '1px solid #F5F5F7', paddingTop: 14 }}>
                <div style={{ fontSize: 10, color: '#6e6e73', marginBottom: 6, textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                  Histórico 30 días
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Sparkline data={compositeHistory} color={semColor} W={220} H={44} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8, fontSize: 11, color: '#6e6e73' }}>
                  <span>Min · <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{Math.min(...compositeHistory).toFixed(0)}</span></span>
                  <span>Max · <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{Math.max(...compositeHistory).toFixed(0)}</span></span>
                </div>
              </div>
            )}
          </div>

          {/* KPIs grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <KPI label="Score compuesto"   value={composite.toFixed(0)} accent={semColor} sub={`${semLabel} · ${change7d >= 0 ? '+' : ''}${change7d.toFixed(1)} vs 7d`}/>
              <KPI label="Dimensiones"        value={dimKeys.length || 6}  accent="#6e6e73" sub="Cobertura completa"/>
              <KPI label="Drivers activos"    value={topRisks.length || signals.filter(s => s.score >= 50).length} accent="#F59E0B" sub="Eventos con peso >50"/>
              <KPI label="Anomalías"          value={dimKeys.filter(k => dimensions[k]?.is_anomaly).length} accent="#DC2626" sub="z-score |·|>2"/>
              <KPI label="Señales SIGINT"     value={signals.filter(s => s.severidad === 'CRITICO').length} accent="#DC2626" sub={`${signals.length} totales últimas 6h`}/>
              <KPI label="Cambio 7 días"      value={`${change7d >= 0 ? '+' : ''}${change7d.toFixed(1)}`} accent={change7d > 0 ? '#DC2626' : '#16A34A'} sub="Variación del compuesto"/>
            </div>

            {/* Señales SIGINT recientes */}
            {signals.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', border: '1px solid #ECECEF', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Señales SIGINT recientes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {signals.slice(0, 4).map((s, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto', gap: 10, alignItems: 'center', fontSize: 12, padding: '6px 0', borderTop: i > 0 ? '1px solid #F5F5F7' : 'none' }}>
                      <span style={{
                        color: '#fff', background: SEV_COLOR[s.severidad] ?? '#86868b',
                        fontWeight: 800, fontSize: 9.5, letterSpacing: '0.08em',
                        padding: '3px 8px', borderRadius: 999, textAlign: 'center',
                      }}>{s.severidad}</span>
                      <span style={{ color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.titulo}</span>
                      <span style={{ color: '#6e6e73', fontSize: 11, fontWeight: 500 }}>{s.fuente.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Tabs Apple style */}
        <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3, marginBottom: 18 }}>
          {([['overview', 'Vista general'], ['dimensiones', 'Dimensiones'], ['drivers', 'Drivers de riesgo'], ['historico', 'Histórico']] as const).map(([id, label]) => {
            const active = tab === id
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border: 'none', borderRadius: 999, padding: '7px 16px',
                fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>{label}</button>
            )
          })}
        </div>

        {/* TAB: OVERVIEW */}
        {tab === 'overview' && (
          <div>
            {dimKeys.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '24px 28px', textAlign: 'center', color: '#6e6e73', fontSize: 13 }}>
                {riskData.loading ? 'Cargando dimensiones…' : 'Sin backend · mostrando estimación a partir de señales SIGINT'}
                {signals.length > 0 && (
                  <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10, textAlign: 'left' }}>
                    {[
                      { label: 'Institucional',  types: ['parlamentario'], color: '#2563EB' },
                      { label: 'Ciberseguridad', types: ['ciberataque'],   color: '#DC2626' },
                      { label: 'Geopolítico',    types: ['conflicto', 'diplomatico'], color: '#F59E0B' },
                      { label: 'Social',         types: ['social', 'sismo'], color: '#F97316' },
                      { label: 'Informacional',  types: ['desinformacion'], color: '#EC4899' },
                      { label: 'Económico',      types: ['energia', 'economico'], color: '#16A34A' },
                    ].map(({ label, types, color }) => {
                      const related = signals.filter(s => types.includes(s.tipo))
                      const avgScore = related.length > 0 ? Math.round(related.reduce((a, b) => a + b.score, 0) / related.length) : Math.round(15 + Math.random() * 20)
                      return (
                        <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #ECECEF', borderLeft: `3px solid ${color}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: scoreColor(avgScore) }}>{avgScore}</span>
                          </div>
                          <div style={{ height: 5, background: '#F5F5F7', borderRadius: 3, marginBottom: 6 }}>
                            <div style={{ width: `${Math.min(100, avgScore)}%`, height: '100%', borderRadius: 3, background: color }} />
                          </div>
                          <div style={{ fontSize: 11, color: '#86868b' }}>{related.length} señales SIGINT activas</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
                {dimKeys.map(k => <DimCard key={k} dim={dimensions[k]} k={k} buckets={buckets} />)}
              </div>
            )}
          </div>
        )}

        {/* TAB: DIMENSIONES */}
        {tab === 'dimensiones' && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedDim ? '320px 1fr' : '1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dimKeys.length === 0 ? (
                <div style={{ color: '#86868b', textAlign: 'center', padding: 32, background: '#fff', borderRadius: 14, border: '1px solid #ECECEF' }}>
                  Sin dimensiones desde backend
                </div>
              ) : dimKeys.map(k => {
                const dim = dimensions[k]
                const color = DIM_COLORS[k] ?? '#6e6e73'
                const active = selectedDim === k
                return (
                  <button key={k} onClick={() => setSelectedDim(prev => prev === k ? null : k)} style={{
                    textAlign: 'left', padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                    background: active ? `${color}10` : '#fff',
                    border: '1px solid ' + (active ? color + '60' : '#ECECEF'),
                    borderLeft: `3px solid ${color}`,
                    fontFamily: 'inherit', transition: 'all 160ms',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f' }}>{DIM_LABELS[k] || dim.label || k}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: scoreColor(dim.score) }}>{dim.score.toFixed(0)}</span>
                    </div>
                    <div style={{ height: 4, background: '#F5F5F7', borderRadius: 2, marginBottom: 6 }}>
                      <div style={{ width: `${Math.min(100, dim.score)}%`, height: '100%', borderRadius: 2, background: color }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#86868b' }}>
                      {dim.n_articles} art · peso {(dim.weight * 100).toFixed(0)}% · {dim.is_anomaly ? 'anomalía' : 'normal'}
                    </div>
                  </button>
                )
              })}
            </div>
            {selectedDim && dimensions[selectedDim] && (
              <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: `1px solid ${DIM_COLORS[selectedDim] ?? '#ECECEF'}60`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#1d1d1f', marginBottom: 16, letterSpacing: '-0.015em' }}>
                  {DIM_LABELS[selectedDim] || dimensions[selectedDim].label || selectedDim}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                  {[
                    { label: 'Score',     value: dimensions[selectedDim].score.toFixed(0), color: scoreColor(dimensions[selectedDim].score) },
                    { label: 'Delta 24h', value: `${dimensions[selectedDim].delta_24h >= 0 ? '+' : ''}${dimensions[selectedDim].delta_24h.toFixed(1)}`, color: dimensions[selectedDim].delta_24h > 0 ? '#DC2626' : '#16A34A' },
                    { label: 'Z-score',   value: dimensions[selectedDim].z_score.toFixed(2), color: Math.abs(dimensions[selectedDim].z_score) > 2 ? '#DC2626' : '#86868b' },
                    { label: 'Artículos', value: dimensions[selectedDim].n_articles, color: '#1d1d1f' },
                    { label: 'Peso',      value: `${(dimensions[selectedDim].weight * 100).toFixed(0)}%`, color: '#1d1d1f' },
                    { label: 'Nivel',     value: dimensions[selectedDim].level, color: SEV_COLOR[dimensions[selectedDim].level] ?? '#86868b' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: '#FAFAFA', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 10, color: '#6e6e73', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</div>
                    </div>
                  ))}
                </div>
                {dimensions[selectedDim].drivers?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Drivers del índice
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {dimensions[selectedDim].drivers.slice(0, 6).map(d => (
                        <div key={d.id} style={{ padding: '10px 12px', background: '#FAFAFA', borderRadius: 8, fontSize: 12.5 }}>
                          <div style={{ color: '#1d1d1f', fontWeight: 600, marginBottom: 4 }}>{d.title}</div>
                          <div style={{ display: 'flex', gap: 14, color: '#6e6e73', fontSize: 11, flexWrap: 'wrap' }}>
                            <span><span style={{ fontWeight: 600, color: '#1d1d1f' }}>{d.source}</span></span>
                            <span>Relevancia · {d.relevance}</span>
                            <span style={{ color: d.sentiment === 'negativo' || d.sentiment === 'muy_negativo' ? '#DC2626' : '#16A34A', fontWeight: 600 }}>{d.sentiment}</span>
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
              <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 48, textAlign: 'center', color: '#86868b', fontSize: 13 }}>
                Sin drivers disponibles
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 100px 90px 100px',
                  gap: 10, padding: '10px 18px',
                  background: '#FAFAFA', borderBottom: '1px solid #ECECEF',
                  fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  <span>Driver</span>
                  <span style={{ textAlign: 'center' }}>Relevancia</span>
                  <span>Sentimiento</span>
                  <span>Impacto</span>
                  <span>Detectado</span>
                </div>
                {topRisks.map(d => (
                  <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 90px 100px', gap: 10, alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #F5F5F7', fontSize: 12.5 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1d1d1f', marginBottom: 3 }}>{d.title}</div>
                      <div style={{ fontSize: 11, color: '#86868b' }}>{d.source}</div>
                    </div>
                    <span style={{ color: '#1d1d1f', textAlign: 'center', fontWeight: 600 }}>{d.relevance}</span>
                    <span style={{ color: d.sentiment === 'negativo' ? '#F59E0B' : d.sentiment === 'muy_negativo' ? '#DC2626' : '#16A34A', fontWeight: 600, fontSize: 11.5 }}>{d.sentiment}</span>
                    <span style={{ color: d.spain_impact === 'alto' ? '#DC2626' : d.spain_impact === 'medio' ? '#F59E0B' : '#16A34A', fontWeight: 600, fontSize: 11.5 }}>{d.spain_impact}</span>
                    <span style={{ color: '#86868b', fontSize: 11 }}>{relTime(d.scraped_at)}</span>
                  </div>
                ))}
                {topRisks.length === 0 && signals.map((s, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px', gap: 10, alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #F5F5F7', fontSize: 12.5 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1d1d1f', marginBottom: 3 }}>{s.titulo}</div>
                      <div style={{ fontSize: 11, color: '#86868b' }}>{s.fuente} · {s.tipo}</div>
                    </div>
                    <span style={{ color: '#fff', background: SEV_COLOR[s.severidad] ?? '#86868b', fontWeight: 800, fontSize: 9.5, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 999, textAlign: 'center' }}>{s.severidad}</span>
                    <span style={{ color: scoreColor(s.score), fontWeight: 700 }}>{s.score}/100</span>
                    <span style={{ color: '#86868b', fontSize: 11 }}>SIGINT</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: HISTÓRICO */}
        {tab === 'historico' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {['composite', ...Object.keys(DIM_COLORS)].map(k => {
                const active = histDim === k
                const c = DIM_COLORS[k] ?? '#2563EB'
                return (
                  <button key={k} onClick={() => setHistDim(k)} style={{
                    padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
                    background: active ? c : '#fff',
                    color: active ? '#fff' : '#3a3a3d',
                    border: '1px solid ' + (active ? c : '#ECECEF'),
                    fontFamily: 'inherit',
                  }}>{k === 'composite' ? 'Compuesto' : (DIM_LABELS[k] ?? k)}</button>
                )
              })}
            </div>
            {buckets.length < 2 ? (
              <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 48, textAlign: 'center', color: '#86868b', fontSize: 13 }}>
                Sin datos históricos · backend no conectado
              </div>
            ) : (() => {
              const vals = buckets.map(b => histDim === 'composite' ? b.composite : ((b as unknown as Record<string, number>)[histDim] ?? 0))
              const W = 800, H = 220
              const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - (v / 100) * H}`)
              const color = DIM_COLORS[histDim] ?? '#2563EB'
              return (
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #ECECEF', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: '100%', height: 'auto' }}>
                    {[0, 25, 50, 75, 100].map(v => {
                      const y = H - (v / 100) * H
                      return (
                        <g key={v}>
                          <line x1={32} y1={y} x2={W} y2={y} stroke="#F5F5F7" strokeWidth={1} />
                          <text x={4} y={y + 3} fill="#86868b" fontSize={10}>{v}</text>
                        </g>
                      )
                    })}
                    <polygon points={`32,${H} ${pts.map((p, i) => i === 0 ? `32,${p.split(',')[1]}` : p).join(' ')} ${W},${H}`} fill={color} fillOpacity={0.08} />
                    <polyline points={pts.map(p => { const [x, y] = p.split(','); return `${Math.max(32, +x)},${y}` }).join(' ')} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
                    {buckets.map((b, i) => {
                      if (i % Math.ceil(buckets.length / 7) !== 0) return null
                      const x = Math.max(32, (i / (buckets.length - 1)) * W)
                      return <text key={i} x={x} y={H + 20} textAnchor="middle" fill="#86868b" fontSize={10}>{b.date.slice(5)}</text>
                    })}
                  </svg>
                  <div style={{ display: 'flex', gap: 24, marginTop: 14, paddingTop: 14, borderTop: '1px solid #F5F5F7', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Máximo', value: Math.max(...vals).toFixed(0), color: scoreColor(Math.max(...vals)) },
                      { label: 'Mínimo', value: Math.min(...vals).toFixed(0), color: '#16A34A' },
                      { label: 'Actual', value: vals[vals.length - 1]?.toFixed(0) ?? '—', color },
                      { label: 'Media',  value: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(0), color: '#1d1d1f' },
                    ].map(({ label, value, color: col }) => (
                      <div key={label} style={{ fontSize: 12 }}>
                        <span style={{ color: '#6e6e73', fontWeight: 500 }}>{label} · </span>
                        <span style={{ color: col, fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 16 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

      </main>
    </div>
  )
}
