'use client'
/**
 * `<DailyTradePanel />` · IMF PortWatch comercio diario.
 *
 * Combina World Trade (Daily_Trade_Data_WLD) + Country Trade (España)
 * vía /api/portwatch/world-trade-daily + /country-trade-daily.
 *
 * Visualización: línea total portcalls + breakdown container/tanker/bulk
 * + WoW% trend + import/export.
 */
import { useEffect, useState } from 'react'

interface TradePoint {
  date: string | null
  portcalls: number
  portcalls_container: number
  portcalls_tanker: number
  portcalls_dry_bulk: number
  import: number
  export: number
}
interface WorldData {
  ok: boolean
  data_quality?: { source_type: string; source_name: string }
  stats?: { avg_portcalls_30d: number; avg_portcalls_prev_30d: number; trend_pct: number }
  points?: TradePoint[]
}

const ACCENT = '#1d4ed8'

function fmtBn(v: number): string {
  if (!v || isNaN(v)) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v.toFixed(0)
}

function SparkLine({ values, color, height = 36 }: { values: number[]; color: string; height?: number }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 200
  const step = w / Math.max(values.length - 1, 1)
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

export function DailyTradePanel({ country = 'Spain' }: { country?: string }) {
  const [world, setWorld] = useState<WorldData | null>(null)
  const [countryData, setCountryData] = useState<WorldData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/portwatch/world-trade-daily?days=90', { cache: 'force-cache' }).then((r) => r.json()),
      fetch(`/api/portwatch/country-trade-daily?country=${encodeURIComponent(country)}&days=90`, { cache: 'force-cache' }).then((r) => r.json()),
    ])
      .then(([w, c]) => {
        if (!alive) return
        setWorld(w)
        setCountryData(c)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [country])

  const wPoints = world?.points || []
  const cPoints = countryData?.points || []
  const isLive = world?.data_quality?.source_type === 'live'

  // último día disponible
  const wLast = wPoints[wPoints.length - 1]
  const cLast = cPoints[cPoints.length - 1]

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
            COMERCIO MARÍTIMO DIARIO · MUNDO vs {country.toUpperCase()}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            IMF PortWatch · portcalls + import/export tons · 90 días
          </p>
        </div>
        {isLive ? (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            LIVE
          </span>
        ) : (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            no disponible
          </span>
        )}
      </header>

      {loading && <p style={{ fontSize: 12, color: '#94a3b8' }}>Cargando datos PortWatch...</p>}

      {!loading && isLive && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* World */}
          <div style={{ background: '#eff6ff', borderRadius: 6, padding: 10 }}>
            <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>
              MUNDO · {wLast?.date}
            </p>
            <p style={{ fontSize: 26, color: ACCENT, fontWeight: 700, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
              {(wLast?.portcalls ?? 0).toLocaleString('es-ES')}
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500, marginLeft: 6 }}>port calls/d</span>
            </p>
            {world?.stats && (
              <p style={{ fontSize: 11, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ color: '#64748b' }}>30d avg: </span>
                <strong>{world.stats.avg_portcalls_30d.toLocaleString('es-ES')}</strong>
                {' · '}
                <strong style={{ color: world.stats.trend_pct >= 0 ? '#166534' : '#991b1b' }}>
                  {world.stats.trend_pct >= 0 ? '+' : ''}{world.stats.trend_pct.toFixed(1)}%
                </strong>
                <span style={{ color: '#64748b' }}> vs prev 30d</span>
              </p>
            )}
            <div style={{ marginTop: 8 }}>
              <SparkLine values={wPoints.map((p) => p.portcalls)} color={ACCENT} />
            </div>
            <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', fontSize: 10, color: '#64748b' }}>
              <li>Container: <strong style={{ color: '#0ea5e9' }}>{(wLast?.portcalls_container ?? 0).toLocaleString('es-ES')}</strong></li>
              <li>Tanker: <strong style={{ color: '#ef4444' }}>{(wLast?.portcalls_tanker ?? 0).toLocaleString('es-ES')}</strong></li>
              <li>Dry Bulk: <strong style={{ color: '#f59e0b' }}>{(wLast?.portcalls_dry_bulk ?? 0).toLocaleString('es-ES')}</strong></li>
              <li>Import (tons): <strong>{fmtBn(wLast?.import ?? 0)}</strong> · Export: <strong>{fmtBn(wLast?.export ?? 0)}</strong></li>
            </ul>
          </div>

          {/* Country */}
          <div style={{ background: '#f0fdfa', borderRadius: 6, padding: 10 }}>
            <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>
              {country.toUpperCase()} · {cLast?.date}
            </p>
            <p style={{ fontSize: 26, color: '#0e7490', fontWeight: 700, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
              {(cLast?.portcalls ?? 0).toLocaleString('es-ES')}
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500, marginLeft: 6 }}>port calls/d</span>
            </p>
            <p style={{ fontSize: 11, margin: '4px 0 0', color: '#64748b' }}>
              {cPoints.length} puntos · {cPoints[0]?.date} → {cLast?.date}
            </p>
            <div style={{ marginTop: 8 }}>
              <SparkLine values={cPoints.map((p) => p.portcalls)} color="#0e7490" />
            </div>
            <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', fontSize: 10, color: '#64748b' }}>
              <li>Container: <strong style={{ color: '#0ea5e9' }}>{(cLast?.portcalls_container ?? 0).toLocaleString('es-ES')}</strong></li>
              <li>Tanker: <strong style={{ color: '#ef4444' }}>{(cLast?.portcalls_tanker ?? 0).toLocaleString('es-ES')}</strong></li>
              <li>Dry Bulk: <strong style={{ color: '#f59e0b' }}>{(cLast?.portcalls_dry_bulk ?? 0).toLocaleString('es-ES')}</strong></li>
              <li>Import (tons): <strong>{fmtBn(cLast?.import ?? 0)}</strong> · Export: <strong>{fmtBn(cLast?.export ?? 0)}</strong></li>
            </ul>
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

export default DailyTradePanel
