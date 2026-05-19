'use client'
/**
 * RiskV2Dashboard — dashboard estructural de riesgo político.
 *
 * Lee 100% de configuración desde el backend (DB-driven). El motor calcula:
 *   - 6 índices compuestos (institucional, electoral, geopolítico, económico, mediático, social)
 *   - Componentes con pesos editables
 *   - Predicciones ML de escenarios (logistic / RF / bayesian)
 *   - Alertas configurables con ACK
 *
 * 5 pestañas:
 *   1. Análisis ejecutivo (KPI cards + radar + correlación)
 *   2. Evolución temporal (multi-line + calendar heatmap)
 *   3. Descomposición (waterfall + tabla componentes)
 *   4. Escenarios (cards predictivas + fan chart + drivers)
 *   5. Alertas (lista + ACK + config)
 */
import { useEffect, useMemo, useState } from 'react'
import type { RiskIndexCard } from '@/app/api/risk-v2/indices/route'
import type { RiskScenario } from '@/app/api/risk-v2/scenarios/route'
import type { RiskAlert } from '@/app/api/risk-v2/alerts/route'
import {
  RiesgoGauge, RiesgoRadar, RiesgoTrendChart,
  RiesgoRadarLegend, RiesgoTrendLegend,
  type RiesgoTrendData,
} from './RiskVisuals'

interface TrendKpi {
  label: string
  value: string
  delta?: number
  dir?: 'up' | 'down'
}
interface TrendPayload extends RiesgoTrendData {
  kpis: TrendKpi[]
}

type Tab = 'overview' | 'evolution' | 'breakdown' | 'scenarios' | 'alerts' | 'config'

const TAB_LABELS: Record<Tab, string> = {
  overview:   'Análisis ejecutivo',
  evolution:  'Evolución temporal',
  breakdown:  'Descomposición',
  scenarios:  'Escenarios',
  alerts:     'Alertas',
  config:     'Configuración',
}

function colorForLabel(label: string, colors: RiskIndexCard['colors']): string {
  switch (label) {
    case 'BAJO':    return colors.low
    case 'MEDIO':   return colors.medium
    case 'ALTO':    return colors.high
    case 'CRÍTICO': return colors.critical
    default:        return '#94a3b8'
  }
}

export default function RiskV2Dashboard({ country = 'ES' }: { country?: string }) {
  const [indices, setIndices]     = useState<RiskIndexCard[]>([])
  const [scenarios, setScenarios] = useState<RiskScenario[]>([])
  const [alerts, setAlerts]       = useState<RiskAlert[]>([])
  const [trend, setTrend]         = useState<TrendPayload | null>(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [meta, setMeta]           = useState<{ source: string; warnings?: string[] }>({ source: 'loading' })
  const [tab, setTab]             = useState<Tab>('overview')
  const [selectedIdx, setSelectedIdx] = useState<string>('')

  const load = async () => {
    setLoading(true)
    try {
      const [iR, sR, aR, tR] = await Promise.all([
        fetch(`/api/risk-v2/indices?country=${country}`).then(r => r.json()),
        fetch(`/api/risk-v2/scenarios?country=${country}`).then(r => r.json()),
        fetch(`/api/risk-v2/alerts?country=${country}&days=30`).then(r => r.json()),
        fetch(`/api/risk-v2/trend?country=${country}`).then(r => r.json()).catch(() => null),
      ])
      setIndices(iR.indices ?? [])
      setScenarios(sR.scenarios ?? [])
      setAlerts(aR.alerts ?? [])
      setTrend(tR && Array.isArray(tR.history) ? tR : null)
      setMeta({ source: iR._meta?.source ?? 'unknown', warnings: iR._meta?.warnings })
      if (!selectedIdx && iR.indices?.length) setSelectedIdx(iR.indices[0].index_id)
    } catch (e) {
      setMeta({ source: 'error', warnings: [String(e)] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [country])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetch(`/api/risk-v2/refresh?country=${country}`, { method: 'POST' })
      await fetch(`/api/risk-v2/scenarios/run?country=${country}`, { method: 'POST' })
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  const handleAck = async (id: number) => {
    await fetch(`/api/risk-v2/alerts/${id}/ack`, { method: 'POST' })
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }

  const aggregate = useMemo(() => {
    if (indices.length === 0) return 0
    return Math.round(indices.reduce((s, i) => s + i.score, 0) / indices.length * 10) / 10
  }, [indices])

  const selectedIndexDetail = useMemo(
    () => indices.find(i => i.index_id === selectedIdx) ?? indices[0],
    [indices, selectedIdx],
  )

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading && indices.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6e6e73', fontSize: 13 }}>
        Cargando motor de riesgo estructural…
      </div>
    )
  }

  if (!indices.length) {
    // Caso defensivo · normalmente el endpoint siempre devuelve datos
    // (mock fallback). Si llegamos aquí es porque hubo un error JS o el
    // fetch falló completamente.
    return (
      <div style={{
        padding: '32px 28px', background: '#fff', border: '1px solid #ECECEF',
        borderRadius: 14, marginTop: 12, textAlign: 'center',
      }}>
        <div style={{ fontSize: 13.5, color: '#1d1d1f', fontWeight: 600, marginBottom: 6 }}>
          No se pudieron cargar los índices de riesgo
        </div>
        <p style={{ fontSize: 12, color: '#86868b', margin: '0 0 14px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          Hubo un problema al conectar con el motor de riesgo. Pulsa el botón para reintentar.
        </p>
        <button onClick={() => void load()} style={{
          background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 999,
          padding: '7px 16px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>↻ Reintentar</button>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3, flexWrap: 'wrap' }}>
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => {
            const active = tab === t
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border: 'none', borderRadius: 999, padding: '7px 14px',
                fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>
                {TAB_LABELS[t]}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SourceBadge source={meta.source} warnings={meta.warnings} />
          <button onClick={handleRefresh} disabled={refreshing} style={{
            background: refreshing ? '#94a3b8' : '#1d1d1f', color: '#fff', border: 'none',
            borderRadius: 8, padding: '7px 14px', fontSize: 11.5, fontWeight: 700,
            cursor: refreshing ? 'wait' : 'pointer', fontFamily: 'inherit',
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {refreshing ? 'Recalculando…' : 'Recalcular ahora'}
          </button>
        </div>
      </div>

      {/* ── KPI strip siempre visible ── */}
      <KPIStrip indices={indices} aggregate={aggregate} />

      {tab === 'overview'   && <Overview indices={indices} aggregate={aggregate} trend={trend} />}
      {tab === 'evolution'  && <Evolution indices={indices} country={country} />}
      {tab === 'breakdown'  && (
        <Breakdown
          indices={indices}
          selectedIdx={selectedIdx}
          setSelectedIdx={setSelectedIdx}
          detail={selectedIndexDetail}
          country={country}
        />
      )}
      {tab === 'scenarios'  && <Scenarios scenarios={scenarios} country={country} onReload={load} />}
      {tab === 'alerts'     && <Alerts alerts={alerts} onAck={handleAck} />}
      {tab === 'config'     && <Configuration country={country} onReload={load} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI strip
// ─────────────────────────────────────────────────────────────────────────────

function KPIStrip({ indices, aggregate }: { indices: RiskIndexCard[]; aggregate: number }) {
  return (
    <section style={{
      display: 'grid', gridTemplateColumns: `repeat(${indices.length + 1}, 1fr)`,
      gap: 10, marginBottom: 16,
    }}>
      <div style={{
        border: '1.5px solid #1d1d1f', borderRadius: 10, padding: '12px 14px',
        background: 'linear-gradient(180deg, #1d1d1f 0%, #2d2d31 100%)', color: '#fff',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>
           Riesgo agregado
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, marginTop: 4, lineHeight: 1 }}>
          {aggregate}<span style={{ fontSize: 13, opacity: 0.6 }}>/100</span>
        </div>
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>
          media simple de las {indices.length} dimensiones activas
        </div>
      </div>
      {indices.map(idx => {
        const color = colorForLabel(idx.label, idx.colors)
        const delta = idx.delta_7d
        const deltaStr = delta == null ? '—' : (delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1))
        return (
          <div key={idx.index_id} style={{
            border: '1px solid #ECECEF', borderRadius: 10, padding: '12px 14px',
            background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {idx.display_name}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#1d1d1f', lineHeight: 1 }}>
                {idx.score}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>/100</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, alignItems: 'center' }}>
              <span style={{
                fontSize: 9, fontWeight: 800, color: '#fff', background: color,
                padding: '2px 7px', borderRadius: 4, letterSpacing: '0.06em',
              }}>{idx.label}</span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: delta == null ? '#94a3b8' : (delta > 0 ? '#DC2626' : '#16A34A'),
              }}>
                {deltaStr}
                <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 2, fontWeight: 500 }}>7d</span>
              </span>
            </div>
            <div style={{ height: 4, background: '#F5F5F7', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${idx.score}%`, background: color, transition: 'width 220ms' }}/>
            </div>
          </div>
        )
      })}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Overview — radar + gauge + correlation
// ─────────────────────────────────────────────────────────────────────────────

function Overview({ indices, aggregate, trend }: {
  indices: RiskIndexCard[]
  aggregate: number
  trend: TrendPayload | null
}) {
  // Construye el dataset del radar a partir de los 6 índices estructurales.
  // 3 niveles definen umbrales (Vigilancia ≤ 30, Alerta 30-60, Crítico ≥ 60).
  // El polígono "Crítico" usa los scores actuales para mostrar dónde están los
  // riesgos hoy; los otros dos son referencia visual.
  const radarData = useMemo(() => {
    const axes = indices.map(i => i.display_name)
    const current = indices.map(i => i.score)
    return {
      axes,
      levels: [
        { label: 'Nivel 3 · Vigilancia', color: '#22C55E', values: axes.map(() => 30) },
        { label: 'Nivel 2 · Alerta',     color: '#F59E0B', values: axes.map(() => 60) },
        { label: 'Nivel 1 · Crítico',    color: '#EF4444', values: current },
      ],
    }
  }, [indices])

  // Delta agregado: cambio 7d del primer índice (proxy razonable)
  const aggDelta = indices.length > 0
    ? +(indices.reduce((s, i) => s + (i.delta_7d || 0), 0) / indices.length).toFixed(1)
    : undefined

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Fila 1: Gauge (1fr) + Radar (2fr) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
        <Card title="Principio de calibración">
          <RiesgoGauge value={aggregate} delta={aggDelta} showTicks/>
        </Card>
        <Card
          title="Radar de amenazas"
          subtitle="3 niveles · vigilancia / alerta / crítico"
          extra={<RiesgoRadarLegend levels={radarData.levels}/>}
        >
          {indices.length > 0 ? (
            <RiesgoRadar data={radarData} size="small"/>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#86868b', fontSize: 12 }}>
              Sin datos
            </div>
          )}
        </Card>
      </div>

      {/* Fila 2: Serie histórica + previsión 14d a todo el ancho */}
      <Card
        title="Serie histórica"
        subtitle="30 días + previsión 14 días"
        extra={<RiesgoTrendLegend/>}
      >
        {trend ? (
          <RiesgoTrendChart trend={trend} height={240}/>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#86868b', fontSize: 12 }}>
            Cargando serie histórica…
          </div>
        )}
      </Card>

      {/* Fila 3: KPIs del trend (cambio 7d, máx, mín, previsión +14d) */}
      {trend && trend.kpis && trend.kpis.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {trend.kpis.map(k => {
            const dirColor = k.dir === 'up' ? '#DC2626' : '#16A34A'
            const arrow = k.dir === 'up' ? '↑' : '↓'
            return (
              <div key={k.label} style={{
                background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 20px',
              }}>
                <p style={{ fontSize: 10.5, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, fontWeight: 500 }}>
                  {k.label}
                </p>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 32, letterSpacing: '-0.028em', marginTop: 8, lineHeight: 1, color: '#1d1d1f' }}>
                  {k.value}
                </div>
                {k.delta !== undefined && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10,
                    fontSize: 11, fontWeight: 600,
                    padding: '3px 8px', borderRadius: 999,
                    background: `${dirColor}14`, color: dirColor, border: `1px solid ${dirColor}33`,
                  }}>
                    {arrow} {k.delta > 0 ? '+' : ''}{k.delta}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function RadarChart({ indices }: { indices: RiskIndexCard[] }) {
  const size = 320
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 40
  const n = indices.length
  const points = indices.map((idx, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (idx.score / 100) * radius
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      lx: cx + Math.cos(angle) * (radius + 22),
      ly: cy + Math.sin(angle) * (radius + 22),
      label: idx.display_name,
      score: idx.score,
      color: colorForLabel(idx.label, idx.colors),
    }
  })
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: 380, margin: '0 auto', display: 'block' }}>
      {/* concentric rings */}
      {[0.25, 0.5, 0.75, 1].map(k => (
        <circle key={k} cx={cx} cy={cy} r={radius * k} fill="none" stroke="#ECECEF" strokeWidth={1} />
      ))}
      {/* spokes */}
      {indices.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2
        const x = cx + Math.cos(angle) * radius
        const y = cy + Math.sin(angle) * radius
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#ECECEF" strokeWidth={1} />
      })}
      {/* shape */}
      <path d={path} fill="rgba(220,38,38,0.18)" stroke="#DC2626" strokeWidth={2} />
      {/* dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={p.color} stroke="#fff" strokeWidth={1.5} />
      ))}
      {/* labels */}
      {points.map((p, i) => {
        const align = p.lx > cx + 8 ? 'start' : p.lx < cx - 8 ? 'end' : 'middle'
        return (
          <g key={i}>
            <text x={p.lx} y={p.ly - 5} textAnchor={align} style={{ fontSize: 9.5, fontWeight: 700, fill: '#1d1d1f' }}>
              {p.label.replace('Riesgo ', '').replace('Estabilidad ', '')}
            </text>
            <text x={p.lx} y={p.ly + 8} textAnchor={align} style={{ fontSize: 10, fill: p.color, fontWeight: 800 }}>
              {p.score}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function DimensionBars({ indices }: { indices: RiskIndexCard[] }) {
  const max = Math.max(...indices.map(i => i.score), 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {indices.map(idx => {
        const color = colorForLabel(idx.label, idx.colors)
        return (
          <div key={idx.index_id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: '#1d1d1f', fontWeight: 600 }}>
                {idx.display_name}
              </span>
              <span style={{ fontWeight: 700, color, fontFamily: 'var(--font-display, monospace)' }}>
                {idx.score.toFixed(1)}<span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 2 }}>/100</span>
              </span>
            </div>
            <div style={{ height: 10, background: '#F5F5F7', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                width: `${(idx.score / max) * 100}%`, height: '100%',
                background: color, transition: 'width 220ms',
              }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GaugeRow({ indices, aggregate }: { indices: RiskIndexCard[]; aggregate: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center' }}>
      <SemiGauge value={aggregate} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ fontSize: 12.5, color: '#3a3a3d', lineHeight: 1.55, margin: 0 }}>
          El <strong>riesgo agregado</strong> es la media simple de los {indices.length} índices estructurales. Un valor por encima de
          <strong> 50</strong> indica que al menos la mitad de las dimensiones están en alerta; por encima de
          <strong> 70</strong> sugiere riesgo sistémico cruzado.
        </p>
        <p style={{ fontSize: 11.5, color: '#6e6e73', margin: 0 }}>
          Para una lectura ponderada según prioridad estratégica, edita pesos en{' '}
          <code style={{ background: '#F5F5F7', padding: '1px 5px', borderRadius: 3 }}>risk_index_components</code>.
        </p>
      </div>
    </div>
  )
}

function SemiGauge({ value }: { value: number }) {
  const width = 260
  const height = 140
  const cx = width / 2
  const cy = height
  const radius = 100
  const angle = Math.PI * (1 - Math.min(100, Math.max(0, value)) / 100)
  const x = cx + Math.cos(angle) * radius
  const y = cy - Math.sin(angle) * radius
  const color = value < 25 ? '#22c55e' : value < 50 ? '#f59e0b' : value < 75 ? '#ef4444' : '#7f1d1d'
  return (
    <svg viewBox={`0 0 ${width} ${height + 30}`} style={{ width: 240 }}>
      {/* bg arc */}
      <path
        d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
        stroke="#F5F5F7" strokeWidth={16} fill="none" strokeLinecap="round"
      />
      {/* filled arc */}
      <path
        d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`}
        stroke={color} strokeWidth={16} fill="none" strokeLinecap="round"
      />
      <text x={cx} y={cy - 24} textAnchor="middle" style={{ fontSize: 36, fontWeight: 800, fill: '#1d1d1f' }}>
        {value}
      </text>
      <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 10, fill: '#6e6e73', letterSpacing: '0.05em', fontWeight: 700 }}>
        / 100
      </text>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Evolution — multi-line over time from /history
// ─────────────────────────────────────────────────────────────────────────────

function Evolution({ indices, country }: { indices: RiskIndexCard[]; country: string }) {
  const [days, setDays]   = useState(90)
  const [series, setSeries] = useState<Record<string, Array<{ date: string; score: number | null }>>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all(indices.map(idx =>
      fetch(`/api/risk-v2/indices/${idx.index_id}/history?country=${country}&days=${days}`)
        .then(r => r.json())
        .then(j => [idx.index_id, j.series ?? []] as const)
        .catch(() => [idx.index_id, []] as const)
    )).then(pairs => {
      if (cancelled) return
      setSeries(Object.fromEntries(pairs))
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [indices, country, days])

  return (
    <Card title="Evolución temporal de los índices estructurales">
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[30, 90, 180, 365].map(d => (
          <button key={d} onClick={() => setDays(d)} style={{
            background: days === d ? '#1d1d1f' : '#fff',
            color: days === d ? '#fff' : '#3a3a3d',
            border: '1px solid #ECECEF', borderRadius: 6,
            padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            {d === 365 ? '1 año' : `${d}d`}
          </button>
        ))}
      </div>
      {loading ? (
        <p style={{ fontSize: 12, color: '#6e6e73', padding: '40px 0', textAlign: 'center' }}>
          Cargando series…
        </p>
      ) : (
        <MultiLineChart indices={indices} series={series} />
      )}
      <p style={{ fontSize: 11, color: '#86868b', marginTop: 8 }}>
        Si las líneas están planas o ausentes es que el caché <code>risk_index_values</code> aún no tiene
        suficientes recalculados. Pulsa «Recalcular ahora» varias veces o espera al cron diario.
      </p>
    </Card>
  )
}

function MultiLineChart({
  indices,
  series,
}: {
  indices: RiskIndexCard[]
  series: Record<string, Array<{ date: string; score: number | null }>>
}) {
  const width = 800
  const height = 280
  const padX = 36
  const padY = 22

  const allPoints = indices.flatMap(idx => (series[idx.index_id] ?? []).filter(p => p.score != null))
  if (allPoints.length === 0) {
    return (
      <p style={{ fontSize: 12, color: '#94a3b8', padding: '60px 0', textAlign: 'center' }}>
        Sin series cacheadas todavía. El gráfico aparecerá tras varios ciclos de recálculo.
      </p>
    )
  }
  const dates = Array.from(new Set(allPoints.map(p => p.date))).sort()
  const xScale = (d: string) => padX + (dates.indexOf(d) / Math.max(1, dates.length - 1)) * (width - padX * 2)
  const yScale = (v: number) => padY + (1 - v / 100) * (height - padY * 2)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      {/* y axis grid */}
      {[0, 25, 50, 75, 100].map(g => (
        <g key={g}>
          <line x1={padX} y1={yScale(g)} x2={width - padX} y2={yScale(g)} stroke="#F5F5F7" strokeWidth={1} />
          <text x={padX - 4} y={yScale(g) + 3} textAnchor="end" style={{ fontSize: 9, fill: '#94a3b8' }}>{g}</text>
        </g>
      ))}
      {indices.map(idx => {
        const pts = (series[idx.index_id] ?? []).filter(p => p.score != null)
        if (pts.length < 2) return null
        const color = colorForLabel(idx.label, idx.colors)
        const d = pts.map((p, i) =>
          `${i === 0 ? 'M' : 'L'} ${xScale(p.date).toFixed(1)} ${yScale(p.score!).toFixed(1)}`
        ).join(' ')
        return <path key={idx.index_id} d={d} fill="none" stroke={color} strokeWidth={1.6} opacity={0.85} />
      })}
      {/* legend */}
      <g transform={`translate(${padX}, ${padY - 16})`}>
        {indices.map((idx, i) => {
          const color = colorForLabel(idx.label, idx.colors)
          return (
            <g key={idx.index_id} transform={`translate(${i * 120}, 0)`}>
              <rect width={10} height={10} fill={color} rx={2} />
              <text x={14} y={9} style={{ fontSize: 9.5, fill: '#3a3a3d', fontWeight: 600 }}>
                {idx.display_name.replace('Riesgo ', '').replace('Estabilidad ', 'Est. ')}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Breakdown — components of one index
// ─────────────────────────────────────────────────────────────────────────────

function Breakdown({
  indices, selectedIdx, setSelectedIdx, detail, country,
}: {
  indices: RiskIndexCard[]
  selectedIdx: string
  setSelectedIdx: (s: string) => void
  detail: RiskIndexCard | undefined
  country: string
}) {
  const [full, setFull] = useState<RiskIndexCard | null>(null)
  useEffect(() => {
    if (!selectedIdx) return
    let cancelled = false
    fetch(`/api/risk-v2/indices?country=${country}`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        const match: RiskIndexCard | undefined = (j.indices ?? []).find((i: RiskIndexCard) => i.index_id === selectedIdx)
        setFull(match ?? null)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [selectedIdx, country])

  const components = full?.components ?? detail?.components ?? []
  const total = components.reduce((s, c) => s + c.contribution, 0)

  return (
    <Card title="Descomposición de componentes">
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {indices.map(idx => {
          const active = selectedIdx === idx.index_id
          return (
            <button key={idx.index_id} onClick={() => setSelectedIdx(idx.index_id)} style={{
              background: active ? '#1d1d1f' : '#fff',
              color: active ? '#fff' : '#3a3a3d',
              border: '1px solid #ECECEF', borderRadius: 6,
              padding: '5px 11px', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {idx.display_name}
            </button>
          )
        })}
      </div>

      {components.length === 0 ? (
        <p style={{ fontSize: 12, color: '#94a3b8', padding: '40px 0', textAlign: 'center' }}>
          Sin componentes con datos. Asegúrate de tener filas en <code>risk_raw_values</code> para las métricas configuradas.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#FAFAFB', borderBottom: '2px solid #ECECEF' }}>
                {['Fuente', 'Métrica', 'Peso', 'Valor raw', 'Score 0-100', 'Contribución', '% del total'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 9.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...components].sort((a, b) => b.contribution - a.contribution).map(c => {
                const pct = total > 0 ? (c.contribution / total) * 100 : 0
                return (
                  <tr key={`${c.source_id}-${c.metric_name}`} style={{ borderBottom: '1px solid #ECECEF' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1d1d1f' }}>{c.source_id}</td>
                    <td style={{ padding: '8px 10px', color: '#3a3a3d', fontFamily: 'monospace', fontSize: 11 }}>{c.metric_name}</td>
                    <td style={{ padding: '8px 10px', color: '#6e6e73' }}>{(c.weight * 100).toFixed(0)}%</td>
                    <td style={{ padding: '8px 10px', color: '#6e6e73', fontFamily: 'monospace' }}>{c.raw_value != null ? c.raw_value.toFixed(2) : '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#1d1d1f', fontWeight: 600 }}>{c.score_0_100.toFixed(1)}</td>
                    <td style={{ padding: '8px 10px', color: '#1d1d1f', fontWeight: 700 }}>{c.contribution.toFixed(1)}</td>
                    <td style={{ padding: '8px 10px', minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: '#F5F5F7', borderRadius: 3 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#DC2626', borderRadius: 3 }}/>
                        </div>
                        <span style={{ fontSize: 10, color: '#6e6e73', minWidth: 32, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Scenarios — predictive ML
// ─────────────────────────────────────────────────────────────────────────────

function Scenarios({
  scenarios, country, onReload,
}: {
  scenarios: RiskScenario[]
  country: string
  onReload: () => void
}) {
  const [running, setRunning] = useState(false)
  const run = async () => {
    setRunning(true)
    try {
      await fetch(`/api/risk-v2/scenarios/run?country=${country}`, { method: 'POST' })
      onReload()
    } finally { setRunning(false) }
  }
  const valid = scenarios.filter(s => s.probability != null)
  return (
    <Card title="Escenarios predictivos — próximos meses">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: '#6e6e73', margin: 0, lineHeight: 1.5 }}>
          Probabilidades calculadas con modelos <strong>logistic</strong>, <strong>random forest</strong> y <strong>bayesian</strong> entrenados sobre el histórico
          de scores. Edita escenarios en <code>risk_scenario_config</code>.
        </p>
        <button onClick={run} disabled={running} style={{
          background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 6,
          padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: running ? 'wait' : 'pointer',
        }}>
          {running ? 'Calculando…' : 'Recalcular predicciones'}
        </button>
      </div>

      {valid.length === 0 && scenarios.length === 0 && (
        <p style={{ fontSize: 12, color: '#94a3b8', padding: '40px 0', textAlign: 'center' }}>
          No hay escenarios configurados todavía.
        </p>
      )}

      {valid.length === 0 && scenarios.length > 0 && (
        <p style={{ fontSize: 12, color: '#86868b', padding: '20px 0', textAlign: 'center' }}>
          {scenarios.length} escenarios configurados, sin predicciones aún. Pulsa <strong>Recalcular predicciones</strong>.
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {[...scenarios].sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0)).map(s => {
          const prob = s.probability ?? 0
          const color = prob > 60 ? '#ef4444' : prob > 35 ? '#f59e0b' : '#22c55e'
          return (
            <div key={s.scenario_id} style={{
              background: '#fff', border: '1px solid #ECECEF', borderRadius: 12,
              padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, marginBottom: 2 }}>
                {s.index_name ?? s.index_id ?? '—'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', marginBottom: 8, lineHeight: 1.3 }}>
                {s.name}
              </div>
              {s.probability == null ? (
                <div style={{ fontSize: 12, color: '#94a3b8', padding: '12px 0' }}>
                  sin datos suficientes
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>
                    {prob.toFixed(0)}<span style={{ fontSize: 14, opacity: 0.6 }}>%</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 4 }}>
                    IC 90%: [{s.confidence_low?.toFixed(0)}% — {s.confidence_high?.toFixed(0)}%]
                  </div>
                </>
              )}
              <div style={{ height: 6, background: '#F5F5F7', borderRadius: 3, marginTop: 8 }}>
                <div style={{ width: `${prob}%`, height: '100%', background: color, borderRadius: 3 }}/>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, fontSize: 9.5, color: '#94a3b8', flexWrap: 'wrap' }}>
                <span style={{ padding: '2px 6px', background: '#F5F5F7', borderRadius: 4, fontWeight: 700 }}>
                  {s.horizon_days}d horizonte
                </span>
                <span style={{ padding: '2px 6px', background: '#F5F5F7', borderRadius: 4, fontWeight: 700 }}>
                  {s.model}
                </span>
              </div>
              {s.key_drivers && Object.keys(s.key_drivers).length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #ECECEF' }}>
                  <div style={{ fontSize: 9.5, color: '#6e6e73', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Drivers clave
                  </div>
                  {Object.entries(s.key_drivers).slice(0, 4).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#3a3a3d', padding: '2px 0' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{k}</span>
                      <span style={{ fontWeight: 700, color: '#1d1d1f' }}>{Number(v).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Alerts
// ─────────────────────────────────────────────────────────────────────────────

function Alerts({ alerts, onAck }: { alerts: RiskAlert[]; onAck: (id: number) => void }) {
  const active = alerts.filter(a => !a.acknowledged)
  const sevColor = (s: string) => s === 'critical' ? '#DC2626' : s === 'warning' ? '#F97316' : '#0EA5E9'
  return (
    <Card title="Alertas de riesgo (últimos 30 días)">
      {alerts.length === 0 ? (
        <div style={{
          padding: '32px 0', textAlign: 'center',
          color: '#16A34A', fontSize: 13, fontWeight: 600,
        }}>
           Sin alertas en los últimos 30 días.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 14, marginBottom: 12, fontSize: 11, color: '#6e6e73' }}>
            <span><strong style={{ color: '#1d1d1f' }}>{alerts.length}</strong> alertas totales</span>
            <span><strong style={{ color: '#DC2626' }}>{active.length}</strong> sin revisar</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.map(a => (
              <div key={a.id} style={{
                border: `1px solid ${a.acknowledged ? '#ECECEF' : sevColor(a.severity) + '40'}`,
                borderLeft: `4px solid ${sevColor(a.severity)}`,
                borderRadius: 8, padding: '10px 14px', background: a.acknowledged ? '#FAFAFB' : '#fff',
                opacity: a.acknowledged ? 0.7 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{
                        background: sevColor(a.severity), color: '#fff',
                        fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.06em',
                      }}>{a.severity.toUpperCase()}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f' }}>{a.index_name}</span>
                      <span style={{ fontSize: 10, color: '#86868b' }}>
                        {new Date(a.fired_at).toLocaleString('es-ES')}
                      </span>
                    </div>
                    <p style={{ fontSize: 12.5, color: '#1d1d1f', margin: 0, lineHeight: 1.45 }}>
                      {a.message}
                    </p>
                  </div>
                  {!a.acknowledged && (
                    <button onClick={() => onAck(a.id)} style={{
                      background: '#fff', border: '1px solid #ECECEF', borderRadius: 6,
                      padding: '5px 11px', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', color: '#1d1d1f',
                    }}>
                       Marcar revisada
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Configuration — admin editor for thresholds, weights, ingest trigger
// ─────────────────────────────────────────────────────────────────────────────

interface ConfigIndex {
  index_id: string
  display_name: string
  icon: string
  description?: string
  components: Array<{
    id: number
    source_id: string
    metric_name: string
    weight: number
    transform: string
    normalize_method: string
    is_active: boolean
    source_name?: string
  }>
}
interface ConfigSource {
  source_id: string
  name: string
  cadencia: string
  market: string
  is_active: boolean
  last_fetch?: string | null
  last_error?: string | null
}
interface ConfigPayload {
  n_indices: number
  indices: ConfigIndex[]
  sources: ConfigSource[]
}

function Configuration({ country, onReload }: { country: string; onReload: () => void }) {
  const [config, setConfig] = useState<ConfigPayload | null>(null)
  const [thresholds, setThresholds] = useState<Record<string, { low: number; medium: number; high: number }>>({})
  const [loading, setLoading] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [lastIngest, setLastIngest] = useState<string | null>(null)
  const [savingThr, setSavingThr] = useState<string | null>(null)

  const loadConfig = async () => {
    setLoading(true)
    try {
      const j = await fetch('/api/risk-v2/config').then(r => r.json())
      setConfig(j)
      // Also load thresholds
      const indicesRes = await fetch(`/api/risk-v2/indices?country=${country}`).then(r => r.json())
      // We can't easily get thresholds from indices endpoint; assume defaults until edited
      const initial: typeof thresholds = {}
      for (const idx of j.indices ?? []) {
        // Heuristic: based on default seed values
        initial[idx.index_id] = idx.index_id === 'riesgo_institucional'
          ? { low: 30, medium: 55, high: 75 }
          : { low: 25, medium: 50, high: 70 }
      }
      setThresholds(initial)
    } catch (e) {
      // noop
    } finally { setLoading(false) }
  }

  useEffect(() => { void loadConfig() }, [country])

  const runIngest = async () => {
    setIngesting(true)
    try {
      const r = await fetch(`/api/risk-v2/ingest?country=${country}&recompute=true`, { method: 'POST' }).then(r => r.json())
      setLastIngest(`${r.n_ok}/${r.n_connectors} conectores OK · ${r.total_rows} filas · ${r.n_stub} stub · ${r.n_failed} fallos`)
      onReload()
    } catch (e) {
      setLastIngest('Fallo al ingestar: ' + String(e))
    } finally { setIngesting(false) }
  }

  const saveThresholds = async (indexId: string) => {
    const t = thresholds[indexId]
    if (!t) return
    setSavingThr(indexId)
    try {
      await fetch(`/api/risk-v2/indices/${indexId}/thresholds`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold_low: t.low, threshold_medium: t.medium, threshold_high: t.high }),
      })
      onReload()
    } finally { setSavingThr(null) }
  }

  const saveWeight = async (componentId: number, weight: number) => {
    await fetch(`/api/risk-v2/components/${componentId}/weight`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight }),
    })
  }

  const toggleComponent = async (componentId: number, isActive: boolean) => {
    await fetch(`/api/risk-v2/components/${componentId}/active`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    })
    void loadConfig()
  }

  if (loading || !config) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: '#6e6e73', fontSize: 12 }}>
        Cargando configuración…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Ingest trigger */}
      <Card title="Pipeline de ingesta de fuentes externas">
        <p style={{ fontSize: 12, color: '#3a3a3d', margin: '0 0 10px', lineHeight: 1.5 }}>
          Lanza el orquestador ETL que descarga datos en vivo de las fuentes públicas configuradas
          (GPR, WGI, BCE, Eurostat, EPU, Metaculus, RSS-NLP) y recalcula los índices. Las fuentes
          marcadas <strong>stub</strong> requieren auth/setup adicional (ACLED, GDELT, V-Dem, CIS, RSUI, IDEA, RSF).
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={runIngest} disabled={ingesting} style={{
            background: ingesting ? '#94a3b8' : '#1d1d1f', color: '#fff', border: 'none',
            borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700,
            cursor: ingesting ? 'wait' : 'pointer',
          }}>
            {ingesting ? 'Ingestando…' : 'Lanzar ingesta ahora'}
          </button>
          {lastIngest && (
            <span style={{ fontSize: 11.5, color: '#3a3a3d' }}>
              {lastIngest}
            </span>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Estado de fuentes
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: '#FAFAFB', borderBottom: '1px solid #ECECEF' }}>
                {['Fuente', 'Cadencia', 'Último fetch', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.sources.map(s => (
                <tr key={s.source_id} style={{ borderBottom: '1px solid #F5F5F7' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: '6px 10px', color: '#6e6e73' }}>{s.cadencia}</td>
                  <td style={{ padding: '6px 10px', color: '#86868b', fontFamily: 'monospace', fontSize: 11 }}>
                    {s.last_fetch ? new Date(s.last_fetch).toLocaleString('es-ES') : '—'}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    {s.last_error ? (
                      <span style={{ color: '#DC2626', fontSize: 10.5 }} title={s.last_error}>
                         {s.last_error.slice(0, 60)}{s.last_error.length > 60 ? '…' : ''}
                      </span>
                    ) : s.last_fetch ? (
                      <span style={{ color: '#16A34A', fontSize: 10.5, fontWeight: 700 }}>OK</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 10.5 }}>nunca ejecutado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Thresholds + weights per index */}
      {config.indices.map(idx => (
        <Card key={idx.index_id} title={`${idx.display_name} · pesos y umbrales`}>
          {/* Thresholds */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
            {(['low', 'medium', 'high'] as const).map(level => (
              <label key={level} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Umbral {level === 'low' ? 'BAJO→MEDIO' : level === 'medium' ? 'MEDIO→ALTO' : 'ALTO→CRÍT'}
                </span>
                <input
                  type="number" min={0} max={100} step={1}
                  value={thresholds[idx.index_id]?.[level] ?? 50}
                  onChange={(e) => setThresholds(prev => ({
                    ...prev,
                    [idx.index_id]: { ...prev[idx.index_id], [level]: Number(e.target.value) },
                  }))}
                  style={{
                    padding: '6px 10px', fontSize: 13, fontWeight: 600,
                    border: '1px solid #ECECEF', borderRadius: 6, fontFamily: 'inherit',
                  }}
                />
              </label>
            ))}
            <button onClick={() => saveThresholds(idx.index_id)} disabled={savingThr === idx.index_id} style={{
              background: '#1d1d1f', color: '#fff', border: 'none',
              borderRadius: 6, padding: '7px 14px', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', height: 'fit-content',
            }}>
              {savingThr === idx.index_id ? 'Guardando…' : 'Guardar umbrales'}
            </button>
          </div>

          {/* Components weights */}
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Componentes ({idx.components.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {idx.components.map(c => (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: '90px 1fr 110px 90px 80px', gap: 8,
                alignItems: 'center', padding: '6px 10px',
                background: c.is_active ? '#fff' : '#FAFAFB',
                border: '1px solid #ECECEF', borderRadius: 6,
                opacity: c.is_active ? 1 : 0.5,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f' }}>{c.source_id}</span>
                <span style={{ fontSize: 10.5, color: '#3a3a3d', fontFamily: 'monospace' }}>{c.metric_name}</span>
                <input
                  type="number" min={0} max={1} step={0.05}
                  defaultValue={c.weight}
                  onBlur={(e) => saveWeight(c.id, Number(e.target.value))}
                  style={{
                    padding: '4px 8px', fontSize: 11, fontWeight: 600,
                    border: '1px solid #ECECEF', borderRadius: 4, fontFamily: 'monospace',
                  }}
                />
                <span style={{ fontSize: 10, color: '#86868b', fontFamily: 'monospace' }}>
                  {c.normalize_method.replace('minmax_', 'mm_')} · {c.transform}
                </span>
                <button onClick={() => toggleComponent(c.id, !c.is_active)} style={{
                  background: c.is_active ? '#fff' : '#F5F5F7',
                  color: c.is_active ? '#DC2626' : '#16A34A',
                  border: '1px solid #ECECEF', borderRadius: 4,
                  padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                }}>
                  {c.is_active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function Card({
  title, subtitle, extra, children, style,
}: {
  title: string
  subtitle?: string
  extra?: React.ReactNode
  children: React.ReactNode
  style?: React.CSSProperties
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
          }}>
            {title}
          </h3>
          {subtitle && (
            <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 400 }}>
              · {subtitle}
            </span>
          )}
        </div>
        {extra}
      </header>
      {children}
    </section>
  )
}

function SourceBadge({ source, warnings }: { source: string; warnings?: string[] }) {
  const color = source === 'backend' ? '#16A34A' : source === 'mock' ? '#0EA5E9' : '#94A3B8'
  const label = source === 'backend' ? 'Datos en vivo' : source === 'mock' ? 'Modo demo' : source
  const tooltip = source === 'mock'
    ? 'Datos de demostración calibrados para España. Conecta el backend FastAPI para ver índices en vivo.'
    : (warnings?.join(', ') ?? '')
  return (
    <span title={tooltip} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10.5, fontWeight: 700, color, letterSpacing: '0.04em',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }}/>
      {label}
    </span>
  )
}
