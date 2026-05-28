'use client'
/**
 * <GeoConflictsTable /> · Sprint GEO-RADAR C3
 *
 * Tabla interactiva con 15-20 conflictos activos del mundo + actores top.
 * Click en fila → callback para abrir drawer detalle.
 *
 * Consume /api/geopolitica/conflictos-activos.
 */
import { useEffect, useState } from 'react'

interface Conflict {
  iso3: string; name_es: string
  intensity: 1 | 2 | 3 | 4 | 5
  events_30d: number; events_7d: number
  trend: 'subida' | 'estable' | 'bajada'
  avg_tone: number
  top_themes: string[]
  top_sources: string[]
  vdem_polyarchy: number | null
  milex_pct_gdp: number | null
  // ── Nuevos campos UCDP/PRIO (FIX-A3) ─────────────────────────────
  conflict_label?: string
  conflict_type?: 'state-based' | 'non-state' | 'one-sided'
  start_year?: number
  actors?: string[]
  fatalities_year_est?: number
  has_gdelt_signal?: boolean
}
interface Response { ok: boolean; conflicts: Conflict[] }

interface Props {
  onConflictClick?: (iso3: string) => void
  highlightIso3?: string | null
}

export function GeoConflictsTable({ onConflictClick, highlightIso3 }: Props) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'events' | 'intensity' | 'tone'>('events')

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/conflictos-activos', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const sorted = data?.conflicts ? [...data.conflicts].sort((a, b) => {
    if (sortBy === 'events') return b.events_30d - a.events_30d
    if (sortBy === 'intensity') return b.intensity - a.intensity
    return a.avg_tone - b.avg_tone   // más negativo primero
  }) : []

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '14px 16px',
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
            Panel de conflictos activos
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
            Top 20 países por intensidad. Click en fila para drawer detalle.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, fontSize: 10 }}>
          {[
            { v: 'events', l: 'Por eventos' },
            { v: 'intensity', l: 'Por intensidad' },
            { v: 'tone', l: 'Por tono ↓' },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setSortBy(o.v as any)}
              style={{
                padding: '4px 8px', borderRadius: 5,
                border: sortBy === o.v ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: sortBy === o.v ? '#0f172a' : '#fff',
                color: sortBy === o.v ? '#fff' : '#475569',
                fontSize: 10, fontWeight: 600, cursor: 'pointer',
              }}
            >{o.l}</button>
          ))}
        </div>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando conflictos…</p>}

      {!loading && sorted.length === 0 && (
        <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin conflictos activos registrados</p>
      )}

      {!loading && sorted.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '6px 8px', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.3 }}>País</th>
                <th style={{ padding: '6px 8px', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.3 }}>Intensidad</th>
                <th style={{ padding: '6px 8px', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.3 }}>Tendencia</th>
                <th style={{ padding: '6px 8px', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.3 }}>Arts 30d</th>
                <th style={{ padding: '6px 8px', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.3 }}>Tono</th>
                <th style={{ padding: '6px 8px', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.3 }}>Top medios</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const isHighlight = c.iso3 === highlightIso3
                const trendArrow = c.trend === 'subida' ? '↑' : c.trend === 'bajada' ? '↓' : '→'
                const trendColor = c.trend === 'subida' ? '#dc2626' : c.trend === 'bajada' ? '#16a34a' : '#94a3b8'
                const toneColor = c.avg_tone < -5 ? '#dc2626' : c.avg_tone < -2 ? '#ea580c' : c.avg_tone < 0 ? '#f59e0b' : '#94a3b8'
                return (
                  <tr
                    key={c.iso3}
                    onClick={() => onConflictClick?.(c.iso3)}
                    style={{
                      borderBottom: '1px solid #f8fafc',
                      background: isHighlight ? '#fef3c7' : 'transparent',
                      cursor: onConflictClick ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isHighlight) e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={(e) => { if (!isHighlight) e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '8px 8px', fontWeight: 600, color: '#0f172a' }}>
                      {c.name_es} <span style={{ color: '#94a3b8', fontSize: 9, fontWeight: 400 }}>{c.iso3}</span>
                      {c.conflict_label && (
                        <p style={{ margin: '2px 0 0', fontSize: 9, color: '#7c3aed', fontWeight: 500, lineHeight: 1.3 }}>
                          {c.conflict_label}
                        </p>
                      )}
                      {c.actors && c.actors.length > 0 && (
                        <p style={{ margin: '1px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.3 }}>
                          {c.actors.slice(0, 2).join(' · ')}
                          {c.actors.length > 2 && <span> +{c.actors.length - 2}</span>}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '8px 8px', color: '#dc2626', fontFamily: 'ui-monospace, monospace' }}>
                      {'●'.repeat(c.intensity)}<span style={{ color: '#e2e8f0' }}>{'●'.repeat(5 - c.intensity)}</span>
                      {c.conflict_type && (
                        <p style={{ margin: '2px 0 0', fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.2 }}>
                          {c.conflict_type}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '8px 8px', color: trendColor, fontWeight: 700, fontSize: 14 }}>
                      {trendArrow}
                      {!c.has_gdelt_signal && (
                        <p style={{ margin: '2px 0 0', fontSize: 8, color: '#94a3b8', fontWeight: 400 }}>baseline</p>
                      )}
                    </td>
                    <td style={{ padding: '8px 8px', fontFamily: 'ui-monospace, monospace', color: '#0f172a' }}>
                      {c.events_30d}
                      {c.fatalities_year_est !== undefined && c.fatalities_year_est > 0 && (
                        <p style={{ margin: '2px 0 0', fontSize: 9, color: '#dc2626', fontFamily: 'inherit' }}>
                          ~{Math.round(c.fatalities_year_est / 1000)}k muertes/año
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '8px 8px', fontFamily: 'ui-monospace, monospace', color: toneColor, fontWeight: 600 }}>
                      {c.has_gdelt_signal ? `${c.avg_tone > 0 ? '+' : ''}${c.avg_tone}` : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding: '8px 8px', fontSize: 10, color: '#475569' }}>
                      {c.top_sources.slice(0, 2).join(', ') || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default GeoConflictsTable
