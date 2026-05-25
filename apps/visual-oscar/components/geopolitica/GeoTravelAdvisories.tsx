'use client'
/**
 * `<GeoTravelAdvisories />` · Sprint G6.
 *
 * Recomendaciones oficiales de viaje · US State Department + UK FCDO
 * agregadas vía travel-advisory.info. Capa de RIESGO CONSULAR para
 * ciudadanos españoles: terrorismo, secuestro, crimen violento, disturbios,
 * detención arbitraria, riesgo frontera.
 *
 * Escala 0-5:
 *   0-2.5 · normal con cuidados
 *   2.5-3.5 · aumentar precauciones / reconsiderar viaje
 *   3.5-4.5 · evitar viajes no esenciales
 *   4.5+ · NO viajar
 */
import { useEffect, useState } from 'react'

interface Advisory {
  iso2: string
  country: string
  continent: string
  score: number
  band: string
  sources: number
  updated: string
  message: string
}

interface AdvisoriesResp {
  ok: boolean
  n_countries?: number
  high_risk_count?: number
  extreme_risk_count?: number
  list?: Advisory[]
  source: string
  note?: string
  error?: string
}

function bandColor(score: number): string {
  if (score >= 4.5) return '#7f1d1d'
  if (score >= 3.5) return '#dc2626'
  if (score >= 2.5) return '#f97316'
  if (score >= 1.5) return '#f59e0b'
  return '#16a34a'
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso.slice(0, 10) }
}

export function GeoTravelAdvisories() {
  const [data, setData] = useState<AdvisoriesResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'top' | 'extreme' | 'high' | 'all'>('high')

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/travel-advisories?country=all', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const list = data?.list ?? []
  const filtered = filter === 'extreme' ? list.filter((c) => c.score >= 4.5)
                 : filter === 'high'    ? list.filter((c) => c.score >= 3.5)
                 : filter === 'top'     ? list.slice(0, 20)
                 : list

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderLeft: '4px solid #dc2626',
      borderRadius: 12,
      padding: 18,
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#dc2626', textTransform: 'uppercase' }}>
            ◆ Travel advisories · Riesgo consular oficial
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
            US State Dept + UK FCDO consolidado. Terrorismo, secuestro, crimen, detención arbitraria.
          </p>
        </div>
        {data?.ok && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {([
              { v: 'extreme', l: `NO VIAJAR · ${data.extreme_risk_count ?? 0}` },
              { v: 'high', l: `ALTO RIESGO · ${data.high_risk_count ?? 0}` },
              { v: 'top', l: 'TOP 20' },
              { v: 'all', l: 'TODOS' },
            ] as const).map((b) => (
              <button
                key={b.v}
                onClick={() => setFilter(b.v)}
                style={{
                  background: filter === b.v ? '#0f172a' : '#fff',
                  color: filter === b.v ? '#fff' : '#475569',
                  border: '1px solid #e2e8f0',
                  borderRadius: 4,
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  letterSpacing: 0.4,
                }}
              >
                {b.l}
              </button>
            ))}
          </div>
        )}
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando advisories…</p>}

      {data?.ok && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 12 }}>
            <div style={{ padding: 10, background: '#fef2f2', borderRadius: 6 }}>
              <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>Países cubiertos</p>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{data.n_countries}</p>
            </div>
            <div style={{ padding: 10, background: '#fef2f2', borderRadius: 6 }}>
              <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>Alto riesgo (≥3.5)</p>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: '#dc2626' }}>{data.high_risk_count}</p>
            </div>
            <div style={{ padding: 10, background: '#fef2f2', borderRadius: 6 }}>
              <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>Extremo (≥4.5)</p>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: '#7f1d1d' }}>{data.extreme_risk_count}</p>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto' }}>
              {filtered.map((c) => {
                const col = bandColor(c.score)
                return (
                  <div key={c.iso2} style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr auto',
                    gap: 10,
                    padding: 8,
                    background: '#f8fafc',
                    borderLeft: `3px solid ${col}`,
                    borderRadius: 4,
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: col, fontFamily: 'ui-monospace, monospace' }}>
                      {c.score.toFixed(1)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                        {c.country} · <span style={{ fontSize: 9, color: '#64748b', fontWeight: 400 }}>{c.iso2} · {c.continent}</span>
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.message || '—'}
                      </p>
                    </div>
                    <span style={{ fontSize: 9, color: col, fontWeight: 700, letterSpacing: 0.4, textAlign: 'right' }}>
                      {c.band}
                      <br />
                      <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 8 }}>{fmtDate(c.updated)}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin países en este filtro.</p>
          )}

          <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            {data.source} · {data.note}
          </p>
        </>
      )}

      {data && !data.ok && (
        <p style={{ fontSize: 11, color: '#dc2626' }}>
          Travel advisories no disponibles · {data.error}
        </p>
      )}
    </section>
  )
}

export default GeoTravelAdvisories
