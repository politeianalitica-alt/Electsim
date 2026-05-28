'use client'
/**
 * <MilitarySignalFeed /> · Sprint GEO-MIL C5
 *
 * Feed señales reconfiguración estratégica con tipo, país, título, hora.
 * Click en país → callback onCountryClick(iso3).
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
  pending_signals: string[]
}

interface Props {
  onCountryClick?: (iso3: string) => void
}

export function MilitarySignalFeed({ onCountryClick }: Props) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/militar/senales-feed', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      <header style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Señales de reconfiguración estratégica · 7 días
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
          Cambios detectados algorítmicamente antes de ser noticia · GDELT themes MIL_EXERCISE + GOV_LEADERSHIP_CHANGE
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando señales militares…</p>}

      {!loading && data?.signals && data.signals.length === 0 && (
        <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin señales en últimos 7 días.</p>
      )}

      {!loading && data?.signals && data.signals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {data.signals.map((s) => {
            const hasCountry = !!s.country_iso3
            const isClickable = hasCountry && !!onCountryClick
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
                  <span style={{ fontSize: 9, fontWeight: 700, color: s.type_color, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {s.type_label}
                  </span>
                  {hasCountry && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#0f172a' }}>· {s.country_name}</span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
                    {timeAgo(s.datetime)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: '#0f172a', lineHeight: 1.3 }}>{s.title}</p>
                <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8' }}>{s.source_domain}</p>
              </div>
            )
          })}
        </div>
      )}

      {!loading && data?.pending_signals && data.pending_signals.length > 0 && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef3c7', borderRadius: 6, fontSize: 9, color: '#92400e' }}>
          <strong>Tipos señal pendientes</strong>: {data.pending_signals.join(' · ')}
        </div>
      )}
    </section>
  )
}

function timeAgo(iso: string): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  if (d > 0) return `hace ${d}d`
  if (h > 0) return `hace ${h}h`
  return 'hace <1h'
}

export default MilitarySignalFeed
