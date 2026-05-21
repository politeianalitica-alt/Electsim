'use client'
/**
 * `<EurostatRegionsMap />` · ranking 17 CCAA España por métrica
 * Eurostat NUTS2 + posición vs media UE.
 *
 * Datos via /api/eurostat/regions-nuts2?metric=...
 *      + /api/eurostat/eu-comparison?metric=...
 *
 * Layout: table sort por valor + bar chart inline.
 */
import { useEffect, useState } from 'react'

interface NutsRegion {
  nuts2: string
  nuts2_name: string
  value: number | null
  period: string
}
interface RegionsData {
  ok: boolean
  metric?: string
  year?: number
  data_quality?: { source_type: string; source_name: string }
  n_regions?: number
  regions?: NutsRegion[]
}

interface EuComparisonData {
  ok: boolean
  metric?: string
  year?: number
  spain_position?: number
  spain_value?: number | null
  eu_avg?: number | null
  items?: { geo: string; value: number }[]
}

const ACCENT = '#059669' // emerald Eurostat

const METRIC_LABELS: Record<string, { label: string; unit: string; format: (v: number) => string }> = {
  gdp_per_capita: {
    label: 'PIB per cápita',
    unit: 'EUR/hab',
    format: (v) => v.toLocaleString('es-ES', { maximumFractionDigits: 0 }),
  },
  unemployment: {
    label: 'Tasa de paro',
    unit: '%',
    format: (v) => `${v.toFixed(1)}%`,
  },
}

export function EurostatRegionsMap({ defaultMetric = 'gdp_per_capita' }: { defaultMetric?: string }) {
  const [metric, setMetric] = useState(defaultMetric)
  const [regions, setRegions] = useState<RegionsData | null>(null)
  const [euComparison, setEuComparison] = useState<EuComparisonData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const euMetric = metric === 'gdp_per_capita' ? 'gdp_pc' : metric
    Promise.all([
      fetch(`/api/eurostat/regions-nuts2?metric=${metric}`, { cache: 'force-cache' }).then((r) => r.json()),
      fetch(`/api/eurostat/eu-comparison?metric=${euMetric}`, { cache: 'force-cache' }).then((r) => r.json()),
    ]).then(([r, e]) => {
      if (!alive) return
      setRegions(r)
      setEuComparison(e)
    }).catch(() => {}).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [metric])

  const isLive = regions?.data_quality?.source_type === 'live'
  const cfg = METRIC_LABELS[metric] || { label: metric, unit: '', format: (v: number) => v.toFixed(2) }
  const items = (regions?.regions || []).filter((r) => r.value != null)
  const maxValue = items.length ? Math.max(...items.map((r) => r.value || 0)) : 1

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
            EUROSTAT · REGIONES NUTS2 ESPAÑA · {regions?.year ?? '—'}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            17 CCAA · ranking + comparativa UE-27 · cache 6h
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            style={{
              fontSize: 11, padding: '3px 6px', borderRadius: 4,
              border: '1px solid #d1d5db', background: '#fff',
            }}
          >
            {Object.entries(METRIC_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {isLive ? (
            <span style={{ fontSize: 9, padding: '2px 6px', background: '#d1fae5', color: '#065f46', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
              LIVE
            </span>
          ) : (
            <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
              Eurostat error
            </span>
          )}
        </div>
      </header>

      {loading && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando Eurostat NUTS2…</p>}

      {!loading && euComparison?.spain_position && (
        <div style={{ background: '#ecfdf5', borderRadius: 6, padding: 8, marginBottom: 10, fontSize: 12 }}>
          <strong style={{ color: ACCENT }}>España (UE-27)</strong>: posición #{euComparison.spain_position} de {euComparison.items?.length} · valor <strong>{euComparison.spain_value ? cfg.format(euComparison.spain_value) : '—'} {cfg.unit}</strong> · media UE <strong>{euComparison.eu_avg ? cfg.format(euComparison.eu_avg) : '—'} {cfg.unit}</strong>
        </div>
      )}

      {!loading && isLive && items.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12 }}>
          {items.map((r, i) => {
            const pct = ((r.value || 0) / maxValue) * 100
            return (
              <li key={r.nuts2} style={{ padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>
                    {i + 1}. {r.nuts2_name}
                  </span>
                  <span style={{ color: ACCENT, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {r.value ? cfg.format(r.value) : '—'} {cfg.unit}
                  </span>
                </div>
                <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: 4, background: ACCENT }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right' }}>
        Fuente · Eurostat ·{' '}
        <a href="https://ec.europa.eu/eurostat" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
          ec.europa.eu/eurostat →
        </a>
      </p>
    </section>
  )
}

export default EurostatRegionsMap
