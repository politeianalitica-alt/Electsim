'use client'
/**
 * `<GeoEventStream />` · Sprint G2.
 *
 * Cascading Event Timeline · feed vertical estilo social media de eventos
 * geopolíticos (OSINT + alertas + ACLED) ordenados cronológicamente
 * descendente con severity bands.
 *
 * Diferenciador vs dashboards típicos:
 *  - Vertical scroll (más natural que horizontal timelines)
 *  - Severity bands color-coded (rojo crítico, ámbar alto, etc.)
 *  - Multi-source (OSINT + alertas + ACLED juntos)
 *  - Tags + source attribution
 *  - Click → link a fuente original
 *
 * Inspiración: combinación de Bloomberg Terminal alert feed + Bellingcat
 * OSINT tracker + Crisis Group CrisisWatch monthly digest.
 */
import { useEffect, useState } from 'react'
import { MediaBiasBadgeAsync } from './MediaBiasBadge'

interface EventItem {
  id: string
  type: 'osint' | 'alert' | 'acled'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  ts: string
  source: string
  url?: string
  tags?: string[]
}

const SEVERITY_COLOR: Record<string, { bg: string; fg: string; track: string }> = {
  low:      { bg: '#f1f5f9', fg: '#475569', track: '#94a3b8' },
  medium:   { bg: '#fef3c7', fg: '#92400e', track: '#f59e0b' },
  high:     { bg: '#ffedd5', fg: '#9a3412', track: '#f97316' },
  critical: { bg: '#fee2e2', fg: '#991b1b', track: '#dc2626' },
}

const TYPE_LABEL: Record<string, string> = {
  osint: 'OSINT',
  alert: 'ALERTA',
  acled: 'ACLED',
}

function relativeTime(iso: string): string {
  try {
    const t = new Date(iso).getTime()
    if (isNaN(t)) return iso.slice(0, 10)
    const diffMin = (Date.now() - t) / 60000
    if (diffMin < 60) return `hace ${Math.round(diffMin)}m`
    if (diffMin < 1440) return `hace ${Math.round(diffMin / 60)}h`
    if (diffMin < 60 * 24 * 7) return `hace ${Math.round(diffMin / 1440)}d`
    return iso.slice(0, 10)
  } catch {
    return iso.slice(0, 10)
  }
}

export function GeoEventStream({ limit = 30 }: { limit?: number }) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'critical' | 'high'>('all')

  useEffect(() => {
    let alive = true
    fetch(`/api/geopolitica/cascading-events?limit=${limit}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive && Array.isArray(j?.events)) setEvents(j.events) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [limit])

  const filtered = filter === 'all' ? events
    : filter === 'critical' ? events.filter((e) => e.severity === 'critical')
    : events.filter((e) => e.severity === 'critical' || e.severity === 'high')

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0EA5E9', borderRadius: 12, padding: 18 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0EA5E9', textTransform: 'uppercase' }}>
            ◆ Cascading Event Stream · multi-source
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
            OSINT + Alertas + ACLED · vertical timeline · severity bands · {events.length} eventos
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'high', 'critical'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              type="button"
              style={{
                background: filter === f ? '#0EA5E9' : '#f1f5f9',
                color: filter === f ? '#fff' : '#475569',
                border: 'none',
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'TODOS' : f === 'critical' ? 'SOLO CRÍTICOS' : '≥ ALTO'}
            </button>
          ))}
        </div>
      </header>
      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando feed eventos…</p>}
      {!loading && filtered.length === 0 && (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin eventos en el filtro actual.</p>
      )}
      {filtered.length > 0 && (
        <div style={{ maxHeight: 500, overflowY: 'auto', position: 'relative', paddingLeft: 18 }}>
          {/* Línea timeline */}
          <div style={{ position: 'absolute', left: 6, top: 0, bottom: 0, width: 2, background: '#e2e8f0' }} />
          {filtered.map((e, idx) => {
            const sev = SEVERITY_COLOR[e.severity] || SEVERITY_COLOR.medium
            return (
              <div key={e.id} style={{ position: 'relative', marginBottom: 12 }}>
                {/* Dot */}
                <div style={{
                  position: 'absolute', left: -16, top: 6,
                  width: 12, height: 12,
                  background: sev.track,
                  borderRadius: '50%',
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 1px ' + sev.track,
                }} />
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  borderLeft: `3px solid ${sev.track}`,
                  borderRadius: 6,
                  padding: '8px 10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: sev.bg,
                      color: sev.fg,
                      textTransform: 'uppercase',
                    }}>
                      {e.severity}
                    </span>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: '#94a3b8',
                      letterSpacing: 0.4,
                    }}>
                      {TYPE_LABEL[e.type] || e.type.toUpperCase()}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>
                      {relativeTime(e.ts)} · {e.source}
                    </span>
                  </div>
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#0f172a', textDecoration: 'none', fontWeight: 500, lineHeight: 1.4 }}>
                      {e.title}
                    </a>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, color: '#0f172a', fontWeight: 500, lineHeight: 1.4 }}>
                      {e.title}
                    </p>
                  )}
                  {/* Sprint G14 FASE 2 · MBFC bias badge si el dominio está en MBFC.
                      Silencio informativo si miss (no inventa). */}
                  {e.url && (
                    <div style={{ marginTop: 4 }}>
                      <MediaBiasBadgeAsync domain={e.url} size="sm" showCountry />
                    </div>
                  )}
                  {e.tags && e.tags.length > 0 && (
                    <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {e.tags.slice(0, 4).map((t) => (
                        <span key={t} style={{
                          fontSize: 9,
                          padding: '1px 6px',
                          background: '#e2e8f0',
                          color: '#475569',
                          borderRadius: 3,
                        }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default GeoEventStream
