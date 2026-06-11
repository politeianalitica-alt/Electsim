'use client'
/**
 * `<ChokepointsDashboard />` · monitor diario de los 8 chokepoints
 * marítimos clave (Suez, Panamá, Bab al-Mandeb, Malacca, Hormuz,
 * Gibraltar, Bosphorus, Cape of Good Hope).
 *
 * Datos via IMF PortWatch Daily_Chokepoints_Data ArcGIS:
 *  - /api/portwatch/chokepoints-overview?days=14 → ranking compact
 *  - /api/portwatch/chokepoint-timeseries?portid=X&days=37 → drill detail
 *
 * Visualización inspirada en marine_traffic_monitor.html. Sin libs
 * externas (sparklines SVG inline). Selector chokepoint con timeseries
 * stacked area por tipo de buque + WoW% trend.
 */
import { useEffect, useState } from 'react'

interface ChokepointStat {
  portid: string
  name: string
  region: string
  n_days: number
  latest_date?: string
  latest_n_total?: number
  avg_daily: number
  total_period: number
}
interface OverviewData {
  ok: boolean
  days?: number
  data_quality?: { source_type: string; source_name: string }
  n_chokepoints?: number
  chokepoints?: ChokepointStat[]
}
interface TimeseriesPoint {
  date: string | null
  n_total: number
  n_container: number
  n_dry_bulk: number
  n_tanker: number
  n_roro: number
  n_general_cargo: number
  capacity_container?: number
  capacity_tanker?: number
  capacity_dry_bulk?: number
}
interface TimeseriesData {
  ok: boolean
  portid?: string
  name?: string
  region?: string
  n_points?: number
  data_quality?: { source_type: string; source_name: string }
  stats?: { avg_7d: number; avg_prev_7d: number; wow_pct: number }
  points?: TimeseriesPoint[]
}

const ACCENT = '#0e7490' // cyan IMF
const COLORS = {
  container:     '#0ea5e9',
  tanker:        '#ef4444',
  dry_bulk:      '#f59e0b',
  general_cargo: '#8b5cf6',
  roro:          '#10b981',
}
const VESSEL_LABELS = {
  n_container:     { label: 'Container', color: COLORS.container, key: 'container' },
  n_tanker:        { label: 'Tanker',    color: COLORS.tanker,    key: 'tanker' },
  n_dry_bulk:      { label: 'Dry Bulk',  color: COLORS.dry_bulk,  key: 'dry_bulk' },
  n_general_cargo: { label: 'Gen Cargo', color: COLORS.general_cargo, key: 'general_cargo' },
  n_roro:          { label: 'RoRo',      color: COLORS.roro,      key: 'roro' },
} as const

export function ChokepointsDashboard() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [selected, setSelected] = useState<string>('chokepoint1')
  const [series, setSeries] = useState<TimeseriesData | null>(null)
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingSeries, setLoadingSeries] = useState(true)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [seriesError, setSeriesError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setOverviewError(null)
    fetch('/api/portwatch/chokepoints-overview?days=14', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: OverviewData) => alive && setOverview(j))
      .catch((e: unknown) => {
        // No tragar errores de red: se guardan para avisar en el cuerpo
        if (alive) setOverviewError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => alive && setLoadingOverview(false))
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    setLoadingSeries(true)
    setSeriesError(null)
    fetch(`/api/portwatch/chokepoint-timeseries?portid=${selected}&days=37`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: TimeseriesData) => alive && setSeries(j))
      .catch((e: unknown) => {
        // No tragar errores de red: se guardan para avisar en el cuerpo
        if (alive) setSeriesError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => alive && setLoadingSeries(false))
    return () => { alive = false }
  }, [selected])

  // SVG dimensions
  const W = 720
  const H = 220
  const PAD = { l: 40, r: 12, t: 12, b: 28 }

  const points = series?.points || []
  const xValues = points.length
  const maxY = Math.max(...points.map((p) => p.n_total), 100)
  const yScale = (v: number) => H - PAD.b - ((v / maxY) * (H - PAD.t - PAD.b))
  const xScale = (i: number) => PAD.l + (xValues > 1 ? (i / (xValues - 1)) * (W - PAD.l - PAD.r) : PAD.l)

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${ACCENT}`,
        borderRadius: 8,
        padding: 14,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 0.8, color: ACCENT, fontWeight: 700, margin: 0 }}>
            IMF PORTWATCH · CHOKEPOINTS MARÍTIMOS · DAILY
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            8 estrechos críticos · ~90K buques AIS · updates martes 9am ET
          </p>
        </div>
        {overview?.data_quality?.source_type === 'live' ? (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#cffafe', color: '#155e75', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            LIVE · IMF
          </span>
        ) : (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            no disponible
          </span>
        )}
      </header>

      {/* Grid de tarjetas por chokepoint (clickeables) */}
      {loadingOverview && <p style={{ fontSize: 12, color: '#94a3b8' }}>Cargando overview...</p>}

      {!loadingOverview && (overviewError || !overview?.chokepoints?.length) && (
        <div style={{ padding: 10, background: '#fef9e7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e', marginBottom: 14 }}>
          <strong>Sin datos disponibles</strong> ·{' '}
          {overviewError
            ? `la petición a /api/portwatch/chokepoints-overview falló (${overviewError}).`
            : 'la fuente IMF PortWatch respondió sin chokepoints.'}
          <br />
          <a href="https://portwatch.imf.org" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT }}>
            portwatch.imf.org →
          </a>
        </div>
      )}

      {!loadingOverview && overview?.chokepoints && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6, marginBottom: 14 }}>
          {overview.chokepoints.map((c) => {
            const isSelected = c.portid === selected
            return (
              <button
                key={c.portid}
                onClick={() => setSelected(c.portid)}
                style={{
                  textAlign: 'left',
                  background: isSelected ? '#ecfeff' : '#f9fafb',
                  border: isSelected ? `2px solid ${ACCENT}` : '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: 8,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                  {c.name}
                </p>
                <p style={{ fontSize: 9, color: '#64748b', margin: '2px 0 0' }}>{c.region}</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: ACCENT, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {c.latest_n_total ?? 0}
                  <span style={{ fontSize: 9, color: '#64748b', fontWeight: 500, marginLeft: 4 }}>buques/d</span>
                </p>
                <p style={{ fontSize: 9, color: '#94a3b8', margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  promedio {c.avg_daily.toFixed(0)} · {c.latest_date}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail panel con SVG stacked area */}
      {loadingSeries && <p style={{ fontSize: 12, color: '#94a3b8' }}>Cargando timeseries…</p>}

      {!loadingSeries && !(series?.ok && points.length > 0) && (
        <div style={{ padding: 10, background: '#fef9e7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
          <strong>Sin serie disponible para este corredor</strong> ·{' '}
          {seriesError
            ? `la petición a /api/portwatch/chokepoint-timeseries falló (${seriesError}).`
            : 'la fuente IMF PortWatch no devolvió puntos para este chokepoint.'}
        </div>
      )}

      {!loadingSeries && series?.ok && points.length > 0 && (
        <div style={{ background: '#f8fafc', borderRadius: 6, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {series.name} · últimos {series.n_points ?? points.length} días
              </p>
              <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>{series.region}</p>
            </div>
            {series.stats && (
              <div style={{ display: 'flex', gap: 12, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                <div>
                  <span style={{ color: '#64748b' }}>7d avg: </span>
                  <strong style={{ color: ACCENT }}>{series.stats.avg_7d.toFixed(0)}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>WoW: </span>
                  <strong style={{ color: series.stats.wow_pct >= 0 ? '#166534' : '#991b1b' }}>
                    {series.stats.wow_pct >= 0 ? '+' : ''}{series.stats.wow_pct.toFixed(1)}%
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* SVG chart */}
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: '100%', display: 'block' }}>
            {/* Y axis grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}>
                <line x1={PAD.l} y1={yScale(maxY * t)} x2={W - PAD.r} y2={yScale(maxY * t)} stroke="#e5e7eb" strokeWidth="0.5" />
                <text x={PAD.l - 6} y={yScale(maxY * t) + 4} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                  {(maxY * t).toFixed(0)}
                </text>
              </g>
            ))}
            {/* Lines per vessel type */}
            {Object.entries(VESSEL_LABELS).map(([key, meta]) => {
              const pts = points.map((p, i) => {
                const v = (p as any)[key] ?? 0
                return `${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`
              }).join(' ')
              return (
                <polyline
                  key={key}
                  points={pts}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              )
            })}
            {/* Last x-axis label */}
            {points.length > 0 && (
              <>
                <text x={PAD.l} y={H - PAD.b + 14} fontSize="9" fill="#94a3b8" fontFamily="monospace">
                  {points[0].date}
                </text>
                <text x={W - PAD.r} y={H - PAD.b + 14} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                  {points[points.length - 1].date}
                </text>
              </>
            )}
          </svg>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8, fontSize: 11 }}>
            {Object.entries(VESSEL_LABELS).map(([key, meta]) => {
              const total = points.reduce((a, p) => a + ((p as any)[key] ?? 0), 0)
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 3, background: meta.color, display: 'inline-block', borderRadius: 1.5 }} />
                  <span style={{ color: '#475569', fontWeight: 600 }}>{meta.label}</span>
                  <span style={{ color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{total.toLocaleString('es-ES')}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right' }}>
        Fuente · IMF PortWatch ·{' '}
        <a href="https://portwatch.imf.org" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
          portwatch.imf.org →
        </a>
      </p>
    </section>
  )
}

export default ChokepointsDashboard
