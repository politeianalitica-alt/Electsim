'use client'
/**
 * <DiplomaticSignalFeed /> · Sprint GEO-DIP C2
 *
 * Feed señales diplomáticas tipadas · GDELT 7d
 * Filtros por tipo · click en señal opcional callback.
 */
import { useEffect, useState } from 'react'

interface Signal {
  type: string
  type_label: string
  type_emoji: string
  type_color: string
  country_iso3: string | null
  country_name: string | null
  title: string
  source_domain: string
  url: string
  datetime: string
  tone: number
  confidence: number
}

interface Response {
  ok: boolean
  signals: Signal[]
  counts_by_type: Record<string, number>
  pending_types: string[]
}

interface Props {
  onCountryClick?: (iso3: string) => void
}

export function DiplomaticSignalFeed({ onCountryClick }: Props) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/diplomacia/senales', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const filtered = filter ? data?.signals.filter((s) => s.type === filter) : data?.signals

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      <header style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Radar diplomático · señales 7 días
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
          Movimientos detectados antes de ser titulares · GDELT themes específicos
        </p>
        {data?.counts_by_type && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
            <button onClick={() => setFilter(null)} style={chipStyle(filter === null, '#0f172a')}>
              Todas ({data.signals.length})
            </button>
            {Object.entries(data.counts_by_type).filter(([, n]) => n > 0).map(([t, n]) => (
              <button key={t} onClick={() => setFilter(filter === t ? null : t)} style={chipStyle(filter === t, '#475569')}>
                {t.replace(/_/g, ' ')} ({n})
              </button>
            ))}
          </div>
        )}
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando señales diplomáticas…</p>}

      {!loading && filtered && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {filtered.slice(0, 25).map((s) => {
            const isClickable = !!s.country_iso3 && !!onCountryClick
            return (
              <div
                key={s.url}
                onClick={() => isClickable && onCountryClick!(s.country_iso3!)}
                style={{
                  padding: '8px 10px', background: '#fff', borderRadius: 6,
                  borderLeft: `3px solid ${s.type_color}`, border: '1px solid #f1f5f9',
                  cursor: isClickable ? 'pointer' : 'default',
                }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 2 }}>
                  <span style={{ fontSize: 14 }}>{s.type_emoji}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: s.type_color, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.type_label}</span>
                  {s.country_name && <span style={{ fontSize: 10, fontWeight: 600, color: '#0f172a' }}>· {s.country_name}</span>}
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>{timeAgo(s.datetime)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: '#0f172a', lineHeight: 1.3 }}>{s.title}</p>
                <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8' }}>{s.source_domain}</p>
              </div>
            )
          })}
        </div>
      )}

      {!loading && data?.pending_types && data.pending_types.length > 0 && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef3c7', borderRadius: 6, fontSize: 9, color: '#92400e' }}>
          <strong>Tipos pendientes</strong>: {data.pending_types.join(' · ')}
        </div>
      )}
    </section>
  )
}

function chipStyle(active: boolean, color: string): React.CSSProperties {
  return {
    padding: '3px 8px', borderRadius: 6,
    border: active ? `1px solid ${color}` : '1px solid #e2e8f0',
    background: active ? color : '#fff',
    color: active ? '#fff' : '#475569',
    fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }
}

function timeAgo(iso: string): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  if (d > 0) return `hace ${d}d`
  if (h > 0) return `hace ${h}h`
  return '<1h'
}

export default DiplomaticSignalFeed
