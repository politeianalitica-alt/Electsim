'use client'
/**
 * `<GeoCountryTimeline />` · Sprint G9.
 *
 * Timeline cronológico multi-source de un país: UCDP conflictos por año
 * (1946→2023 según v24.1) + ACLED eventos recientes + sanciones + Travel
 * Advisory. Todo live, sin hardcode.
 *
 * Render: lista vertical agrupada por año (más reciente arriba), badges
 * de fuente y severidad coloreadas.
 */
import { useEffect, useState } from 'react'

interface Ev {
  date: string
  year: number
  source: string
  type: string
  severity: 'LOW' | 'MED' | 'HIGH' | 'CRITICAL'
  title: string
  detail?: string
}
interface Resp {
  ok: boolean
  country?: { iso3: string; name: string; region: string }
  n_events?: number
  years_covered?: string
  sources_used?: {
    ucdp: number
    ucdp_live_results?: number
    ucdp_seed_used?: boolean
    acled: number
    sanctions: number
    travel: number
    economic?: number
    wb_available?: boolean
  }
  events?: Ev[]
  by_year?: Record<string, Ev[]>
  methodology?: string
  error?: string
}

const SOURCE_COLOR: Record<string, string> = {
  UCDP:     '#7c3aed',
  ACLED:    '#dc2626',
  Sanctions: '#f97316',
  Travel:   '#0ea5e9',
  Economic: '#16a34a',   // FIX-B2 · recesión + hiperinflación + snapshot macro
}
const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#7f1d1d',
  HIGH:     '#dc2626',
  MED:      '#f59e0b',
  LOW:      '#94a3b8',
}

export function GeoCountryTimeline({ iso }: { iso: string }) {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState<'all' | 'UCDP' | 'ACLED' | 'Sanctions' | 'Travel' | 'Economic'>('all')

  useEffect(() => {
    if (!iso) return
    let alive = true
    setLoading(true)
    fetch(`/api/geopolitica/country-timeline?iso=${iso}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [iso])

  const events = data?.events ?? []
  const filtered = sourceFilter === 'all' ? events : events.filter((e) => e.source === sourceFilter)

  // Agrupar el filtrado por año
  const byYear: Record<number, Ev[]> = {}
  for (const e of filtered) {
    if (!byYear[e.year]) byYear[e.year] = []
    byYear[e.year].push(e)
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderLeft: '4px solid #475569',
      borderRadius: 12,
      padding: 18,
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#475569', textTransform: 'uppercase' }}>
            ◆ Country timeline multi-source
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
            UCDP conflictos por año + ACLED eventos · sanciones · Travel Advisory.
            Todo live, sin datos hardcodeados.
          </p>
        </div>
        {data?.ok && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(['all', 'UCDP', 'ACLED', 'Sanctions', 'Travel', 'Economic'] as const).map((f) => {
              const active = sourceFilter === f
              const col = f === 'all' ? '#0f172a' : (SOURCE_COLOR[f] || '#94a3b8')
              return (
                <button
                  key={f}
                  onClick={() => setSourceFilter(f)}
                  style={{
                    background: active ? col : '#fff',
                    color: active ? '#fff' : '#475569',
                    border: `1px solid ${active ? col : '#e2e8f0'}`,
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    letterSpacing: 0.4,
                  }}
                >
                  {f === 'all' ? 'TODOS' : f}
                </button>
              )
            })}
          </div>
        )}
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando timeline…</p>}

      {data?.ok && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6, marginBottom: 14, fontSize: 10 }}>
            <Stat label="Total eventos" value={String(data.n_events ?? 0)} />
            <Stat label="Años cubiertos" value={data.years_covered || '—'} />
            <Stat label="UCDP" value={String(data.sources_used?.ucdp ?? 0)} color={SOURCE_COLOR.UCDP} />
            <Stat label="ACLED" value={String(data.sources_used?.acled ?? 0)} color={SOURCE_COLOR.ACLED} />
            <Stat label="Sanciones" value={String(data.sources_used?.sanctions ?? 0)} color={SOURCE_COLOR.Sanctions} />
            <Stat label="Travel" value={String(data.sources_used?.travel ?? 0)} color={SOURCE_COLOR.Travel} />
          </div>

          {filtered.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 560, overflowY: 'auto' }}>
              {years.map((year) => (
                <div key={year}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#0f172a',
                    padding: '4px 8px',
                    background: '#f1f5f9',
                    borderRadius: 4,
                    marginBottom: 6,
                    letterSpacing: 0.5,
                    fontFamily: 'ui-monospace, monospace',
                  }}>
                    {year} <span style={{ color: '#64748b', fontWeight: 400, fontSize: 10, marginLeft: 6 }}>· {byYear[year].length} eventos</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8, borderLeft: '2px solid #e2e8f0' }}>
                    {byYear[year].map((e, i) => {
                      const sc = SOURCE_COLOR[e.source] || '#94a3b8'
                      const sv = SEV_COLOR[e.severity] || '#94a3b8'
                      return (
                        <div key={`${e.date}-${i}`} style={{
                          padding: 8,
                          background: '#f8fafc',
                          borderLeft: `3px solid ${sv}`,
                          borderRadius: 3,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.4, padding: '1px 5px', borderRadius: 2, background: sc, color: '#fff' }}>{e.source}</span>
                              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.4, padding: '1px 5px', borderRadius: 2, background: sv, color: '#fff' }}>{e.severity}</span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{e.title}</span>
                            </div>
                            <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>{e.date}</span>
                          </div>
                          {e.detail && (
                            <p style={{ margin: 0, fontSize: 10, color: '#475569', paddingLeft: 4 }}>
                              {e.type} · {e.detail}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin eventos para el filtro seleccionado.</p>
          )}

          <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            {data.methodology}
          </p>
        </>
      )}

      {data && !data.ok && (
        <p style={{ fontSize: 11, color: '#dc2626' }}>Timeline no disponible · {data.error}</p>
      )}
    </section>
  )
}

function Stat({ label, value, color = '#0f172a' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: 6, background: '#f8fafc', borderRadius: 4 }}>
      <p style={{ margin: 0, fontSize: 8, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color, fontFamily: 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

export default GeoCountryTimeline
