'use client'

import { useState, useMemo } from 'react'
import { useApi } from '@/lib/useApi'
import Skeleton, { LiveDot } from './Skeleton'
import CountUp from './CountUp'
import LiveStatusBadge from './LiveStatusBadge'
import {
  RiesgoGauge, RiesgoRadar, RiesgoTrendChart,
  RiesgoTrendLegend,
  type RiesgoTrendData,
} from './RiskVisuals'
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

// Card wrapper · contenedor estándar con el estilo Apple light
// (border #ECECEF + shadow + h3 11.5px uppercase).
function Card({ title, subtitle, extra, children, style }: {
  title: string; subtitle?: string; extra?: React.ReactNode
  children: React.ReactNode; style?: React.CSSProperties
}) {
  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 12,
      padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      ...style,
    }}>
      <header style={{
        margin: '0 0 10px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{
            margin: 0, fontSize: 11.5, fontWeight: 700,
            color: '#1d1d1f', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>{title}</h3>
          {subtitle && (
            <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 400 }}>· {subtitle}</span>
          )}
        </div>
        {extra}
      </header>
      {children}
    </section>
  )
}

/**
 * Construye un trend con shape RiesgoTrendData a partir del timeseries del
 * motor live. Como /api/risk/timeseries no devuelve previsión, generamos una
 * proyección simple de 14 días con drift = media de los últimos 7 días y un
 * IC 80% que se ensancha con el horizonte (~±1.4*sqrt(t)).
 */
function buildTrendFromTimeseries(buckets: Array<{ composite: number }>): RiesgoTrendData {
  const history = buckets.map(b => b.composite)
  const last = history[history.length - 1] ?? 0
  const recent = history.slice(-7)
  const avg = recent.length > 0 ? recent.reduce((s, v) => s + v, 0) / recent.length : last
  const drift = (avg - last) * 0.05 // mean-reverting suave hacia la media reciente
  const forecast: number[] = []
  const forecastLow: number[] = []
  const forecastHigh: number[] = []
  let f = last
  // Previsión más corta (7 días en lugar de 14) para que ocupe menos espacio
  // y los puntos del histórico se vean con más holgura
  for (let i = 1; i <= 7; i++) {
    f = Math.max(0, Math.min(100, f + drift + (Math.random() - 0.5) * 1.2))
    forecast.push(Math.round(f * 10) / 10)
    const halfWidth = 3 + Math.sqrt(i) * 2.2
    forecastLow.push(Math.max(0, Math.round((f - halfWidth) * 10) / 10))
    forecastHigh.push(Math.min(100, Math.round((f + halfWidth) * 10) / 10))
  }
  return { history, forecast, forecastLow, forecastHigh }
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

      {/* Fila única horizontal · Gauge + Radar (mismo tamaño) + Serie (más ancha) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 14, marginBottom: 16 }}>
        {/* Gauge */}
        <Card title="Principio de calibración" subtitle="índice compuesto live">
          {composite ? (
            <RiesgoGauge
              value={composite.composite}
              delta={composite.dimensions ? +(Object.values(composite.dimensions).reduce((s, d) => s + d.delta_24h, 0) / Math.max(1, Object.keys(composite.dimensions).length)).toFixed(1) : undefined}
              showTicks={false}
            />
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#86868b', fontSize: 12 }}>Cargando…</div>
          )}
        </Card>

        {/* Radar · 3 niveles · sin leyendas para que el SVG se vea más grande */}
        {(() => {
          const dims = composite?.dimensions ?? {}
          const axes = DIM_KEYS.map(k => dims[k]?.label || k)
          const current = DIM_KEYS.map(k => dims[k]?.score ?? 0)
          const radarData = {
            axes,
            levels: [
              { label: 'Nivel 3 · Vigilancia', color: '#22C55E', values: axes.map(() => 30) },
              { label: 'Nivel 2 · Alerta',     color: '#F59E0B', values: axes.map(() => 60) },
              { label: 'Nivel 1 · Crítico',    color: '#EF4444', values: current },
            ],
          }
          return (
            <Card title="Radar de amenazas">
              {Object.keys(dims).length > 0 ? (
                <RiesgoRadar data={radarData} size="small"/>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: '#86868b', fontSize: 12 }}>Sin dimensiones</div>
              )}
            </Card>
          )
        })()}

        {/* Serie histórica + previsión · más alta para llenar todo el hueco */}
        <Card
          title="Serie histórica"
          subtitle={`${timeseries?.buckets?.length ?? 0}d + previsión 7d`}
          extra={<RiesgoTrendLegend/>}
        >
          {timeseries && timeseries.buckets && timeseries.buckets.length > 0 ? (
            <RiesgoTrendChart trend={buildTrendFromTimeseries(timeseries.buckets)} height={340}/>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#86868b', fontSize: 12 }}>
              Cargando serie histórica…
            </div>
          )}
        </Card>
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
                {drv.url ? (
                  <a
                    href={drv.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 2,
                      display: 'block', textDecoration: 'none',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0071e3' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink)' }}
                  >{drv.title} <span style={{ color: '#0071e3', fontSize: 10 }}>↗</span></a>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 2 }}>{drv.title}</div>
                )}
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
