'use client'
/**
 * `<OecdMacroPanel />` · 4 indicadores OECD core España (PIB growth,
 * paro, inflación, deuda pública) con último valor disponible.
 *
 * Datos via /api/oecd/spain-macro · cache 12h.
 *
 * Si OECD SDMX devuelve dataset_not_found en alguna métrica (cosa
 * habitual cuando OECD cambia las versiones de DSDs), el panel
 * muestra el resto y marca la fallida con badge ámbar.
 */
import { useEffect, useState } from 'react'

interface OecdIndicator {
  code: string
  label: string
  latest_period?: string | null
  latest_value?: number | null
  latest_fmt?: string
  n_points?: number
  error?: string
}
interface OecdData {
  ok: boolean
  country?: string
  data_quality?: { source_type: string; source_name: string }
  indicators?: OecdIndicator[]
}

const ACCENT = '#7c3aed' // violet OECD

export function OecdMacroPanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<OecdData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/oecd/spain-macro', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: OecdData) => alive && setData(j))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const isLive = data?.data_quality?.source_type === 'live'
  const indicators = data?.indicators || []
  const liveCount = indicators.filter((i) => !i.error).length

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
            OECD · INDICADORES MACRO ESPAÑA
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            PIB · paro · inflación · deuda pública · SDMX oficial · cache 12h
          </p>
        </div>
        {isLive ? (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#ede9fe', color: '#5b21b6', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            LIVE · {liveCount}/{indicators.length} series
          </span>
        ) : (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            OECD SDMX en revisión
          </span>
        )}
      </header>

      {loading && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando OECD SDMX…</p>}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10 }}>
          {indicators.map((ind) => (
            <div
              key={ind.code}
              style={{
                background: ind.error ? '#fef9e7' : '#faf5ff',
                border: ind.error ? '1px solid #fde68a' : '1px solid #e9d5ff',
                borderRadius: 6,
                padding: 10,
              }}
            >
              <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4, lineHeight: 1.3 }}>
                {ind.label}
              </p>
              {ind.error ? (
                <>
                  <p style={{ fontSize: 13, color: '#92400e', fontWeight: 600, margin: '6px 0 0' }}>—</p>
                  <p style={{ fontSize: 9, color: '#92400e', margin: '2px 0 0', fontStyle: 'italic' }}>
                    {ind.error.replace('_', ' ')}
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 22, color: ACCENT, fontWeight: 700, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                    {ind.latest_fmt ?? '—'}
                  </p>
                  {ind.latest_period && (
                    <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0' }}>
                      {ind.latest_period}
                    </p>
                  )}
                  {ind.n_points && ind.n_points > 1 && (
                    <p style={{ fontSize: 9, color: '#94a3b8', margin: '4px 0 0' }}>
                      {ind.n_points} obs
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right' }}>
        Fuente · OECD Data API ·{' '}
        <a href="https://data-explorer.oecd.org" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
          data-explorer.oecd.org →
        </a>
      </p>
    </section>
  )
}

export default OecdMacroPanel
