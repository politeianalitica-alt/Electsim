'use client'
/**
 * `<BisBankingPanel />` · BIS Consolidated Banking Statistics + FX.
 *
 * Para /sector-banca y /macro: claims externos bancos España y BIS
 * effective exchange rate. Datos via /api/bis/* · cache 24h.
 */
import { useEffect, useState } from 'react'

interface BisPoint {
  value: number | null
  TIME_PERIOD?: string
  time?: string
  [k: string]: any
}
interface BisFxResponse {
  ok: boolean
  country?: string
  rate_type?: string
  data_quality?: { source_type: string; source_name: string }
  latest_value?: number | null
  latest_period?: string | null
  points?: BisPoint[]
}

const ACCENT = '#0c4a6e' // navy BIS

export function BisBankingPanel({ country = 'ES' }: { country?: string }) {
  const [fxBroad, setFxBroad] = useState<BisFxResponse | null>(null)
  const [fxNarrow, setFxNarrow] = useState<BisFxResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch(`/api/bis/fx-effective?country=${country}&rate=broad`, { cache: 'force-cache' }).then((r) => r.json()),
      fetch(`/api/bis/fx-effective?country=${country}&rate=narrow`, { cache: 'force-cache' }).then((r) => r.json()),
    ]).then(([b, n]) => {
      if (!alive) return
      setFxBroad(b)
      setFxNarrow(n)
    }).catch(() => {}).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [country])

  const broadLive = fxBroad?.data_quality?.source_type === 'live'
  const narrowLive = fxNarrow?.data_quality?.source_type === 'live'
  const isLive = broadLive || narrowLive

  const sparkPoints = (p?: BisPoint[]) => {
    if (!p || p.length === 0) return null
    const values = p.map((x) => x.value).filter((v): v is number => v != null)
    if (values.length < 2) return null
    const max = Math.max(...values)
    const min = Math.min(...values)
    const range = max - min || 1
    const w = 100
    const h = 24
    const step = w / Math.max(values.length - 1, 1)
    const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ')
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <polyline points={points} fill="none" stroke={ACCENT} strokeWidth="1.5" />
      </svg>
    )
  }

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
            BIS · TIPO DE CAMBIO EFECTIVO · {country.toUpperCase()}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            BIS Effective Exchange Rates · broad + narrow · cache 24h
          </p>
        </div>
        {isLive ? (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#cffafe', color: '#0c4a6e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            LIVE · BIS
          </span>
        ) : (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            BIS no disponible
          </span>
        )}
      </header>

      {loading && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando BIS Statistics…</p>}

      {!loading && !isLive && (
        <div style={{ padding: 10, background: '#fef9e7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
          <strong>BIS Statistics no respondió</strong> · BIS cambia ocasionalmente las keys SDMX.
          <br />
          Ver{' '}
          <a href="https://www.bis.org/statistics/sdmx_api.htm" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT }}>
            bis.org/statistics/sdmx_api →
          </a>
        </div>
      )}

      {!loading && isLive && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'BROAD (61 países)', data: fxBroad, color: ACCENT },
            { label: 'NARROW (27 economías)', data: fxNarrow, color: '#0891b2' },
          ].map((row) => (
            <div key={row.label} style={{ background: '#f0f9ff', borderRadius: 6, padding: 10 }}>
              <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>
                {row.label}
              </p>
              {row.data?.data_quality?.source_type === 'live' ? (
                <>
                  <p style={{ fontSize: 22, color: row.color, fontWeight: 700, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                    {row.data.latest_value?.toFixed(2) ?? '—'}
                  </p>
                  {row.data.latest_period && (
                    <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0' }}>
                      {row.data.latest_period}
                    </p>
                  )}
                  <div style={{ marginTop: 6 }}>
                    {sparkPoints(row.data.points)}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 11, color: '#92400e', margin: '6px 0 0', fontStyle: 'italic' }}>
                  no disponible
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right' }}>
        Fuente · BIS Statistics ·{' '}
        <a href="https://stats.bis.org" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
          stats.bis.org →
        </a>
      </p>
    </section>
  )
}

export default BisBankingPanel
