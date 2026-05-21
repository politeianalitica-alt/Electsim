'use client'
/**
 * `<ImfWeoForecast />` · Forecast macro IMF WEO comparativo.
 *
 * Datos via /api/imf/spain-overview (vista España) o /api/imf/weo-forecast
 * (cross-country). Cache 24h.
 *
 * Usado en /macro tab "Forecast IMF" y /dashboard (modo compact).
 */
import { useEffect, useState } from 'react'

interface Indicator {
  code: string
  label: string
  unit: string
  current_value: number | null
  current_fmt?: string
  history?: { year: number; value: number | null }[]
  forecast?: { year: number; value: number | null }[]
  error?: string
}
interface SpainOverview {
  ok: boolean
  country?: string
  year?: number
  data_quality?: { source_type: string; source_name: string }
  indicators?: Indicator[]
}

const ACCENT = '#0f5fa6' // IMF blue

export function ImfWeoForecast({
  compact = false,
  year,
}: {
  compact?: boolean
  year?: number
}) {
  const [data, setData] = useState<SpainOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const targetYear = year ?? new Date().getFullYear()

  useEffect(() => {
    let alive = true
    fetch(`/api/imf/spain-overview?year=${targetYear}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: SpainOverview) => alive && setData(j))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [targetYear])

  const isLive = data?.data_quality?.source_type === 'live'
  const indicators = (data?.indicators || []).slice(0, compact ? 4 : 8)

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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 0.8, color: ACCENT, fontWeight: 700, margin: 0 }}>
            IMF DATAMAPPER · MACRO ESPAÑA · {data?.year ?? targetYear}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            WEO indicadores oficiales · histórico + forecast 5 años · cache 24h
          </p>
        </div>
        {isLive ? (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            LIVE · FMI
          </span>
        ) : (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            IMF no disponible
          </span>
        )}
      </header>

      {loading && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando IMF DataMapper…</p>}

      {!loading && !isLive && (
        <div style={{ padding: 10, background: '#fef9e7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
          <strong>IMF DataMapper no responde</strong> · API pública sin auth, debería estar siempre disponible.
          <br />
          Ver{' '}
          <a href="https://www.imf.org/external/datamapper/api/v1/indicators" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT }}>
            imf.org/external/datamapper/api →
          </a>
        </div>
      )}

      {!loading && isLive && indicators.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10 }}>
          {indicators.map((ind) => {
            const forecastNext = ind.forecast?.[0]
            const delta = ind.current_value != null && forecastNext?.value != null
              ? forecastNext.value - ind.current_value
              : null
            return (
              <div key={ind.code} style={{ background: '#f9fafb', borderRadius: 6, padding: 10 }}>
                <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4, lineHeight: 1.3 }}>
                  {ind.label}
                </p>
                <p style={{ fontSize: 22, color: ACCENT, fontWeight: 700, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                  {ind.current_fmt ?? '—'}
                </p>
                {forecastNext && forecastNext.value != null && (
                  <div style={{ marginTop: 6, fontSize: 10, color: '#64748b' }}>
                    {forecastNext.year}: {forecastNext.value.toFixed(1)}{ind.unit === '%' ? '%' : ''}
                    {delta != null && (
                      <span style={{
                        marginLeft: 4,
                        color: delta > 0 ? '#166534' : delta < 0 ? '#991b1b' : '#64748b',
                        fontWeight: 700,
                      }}>
                        ({delta > 0 ? '+' : ''}{delta.toFixed(2)})
                      </span>
                    )}
                  </div>
                )}
                {!compact && ind.history && ind.history.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 2, alignItems: 'flex-end', height: 16 }}>
                    {[...ind.history, { year: targetYear, value: ind.current_value }, ...(ind.forecast || [])].map((p) => {
                      const allValues = [...(ind.history || []), { year: 0, value: ind.current_value }, ...(ind.forecast || [])]
                        .map((x) => x.value).filter((x): x is number => x != null)
                      const max = Math.max(...allValues, 0)
                      const min = Math.min(...allValues, 0)
                      const range = max - min || 1
                      const h = p.value == null ? 0 : ((p.value - min) / range) * 14 + 2
                      const isForecast = ind.forecast?.some((f) => f.year === p.year)
                      return (
                        <div
                          key={p.year}
                          style={{
                            flex: 1,
                            height: `${h}px`,
                            background: isForecast ? '#cbd5e1' : ACCENT,
                            borderRadius: '2px 2px 0 0',
                            minHeight: 2,
                          }}
                          title={`${p.year}: ${p.value?.toFixed(2) ?? '—'}`}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right' }}>
        Fuente · IMF DataMapper (WEO) ·{' '}
        <a href="https://www.imf.org/external/datamapper" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
          imf.org/external/datamapper →
        </a>
      </p>
    </section>
  )
}

export default ImfWeoForecast
