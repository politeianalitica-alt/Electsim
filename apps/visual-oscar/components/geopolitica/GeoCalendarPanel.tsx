'use client'
/**
 * `<GeoCalendarPanel />` · Sprint G2.
 *
 * Calendario de eventos geopolíticos clave próximos 90 días.
 * Inspiración: Stratfor Geopolitical Calendar + CFR upcoming events.
 *
 * Fuentes incluidas:
 *   - UN Security Council (revisiones país-específicas)
 *   - NATO (cumbres, ministerial meetings)
 *   - EU Council (cumbres trimestrales)
 *   - IMF (WEO updates abril+octubre)
 *   - ACLED (Conflict Severity Index anual)
 *   - Crisis Group (CrisisWatch mensual)
 *   - Eurasia Group (Top Risks anual)
 */
import { useEffect, useState } from 'react'

interface CalEvent {
  date: string
  source: string
  title: string
  importance: 'high' | 'medium' | 'low'
  url?: string
  tags?: string[]
  daysFromNow: number
}

interface CalResponse {
  ok: boolean
  horizon_days: number
  events: CalEvent[]
  sources: string[]
}

const SOURCE_COLOR: Record<string, string> = {
  UN: '#1e40af',
  NATO: '#0891b2',
  EU: '#7c3aed',
  IMF: '#16a34a',
  ACLED: '#dc2626',
  'Crisis Group': '#f59e0b',
  'Eurasia Group': '#8b5cf6',
}
const IMP_COLOR: Record<string, { bg: string; fg: string; label: string }> = {
  high:   { bg: '#fee2e2', fg: '#991b1b', label: 'ALTA' },
  medium: { bg: '#fef3c7', fg: '#92400e', label: 'MEDIA' },
  low:    { bg: '#f1f5f9', fg: '#475569', label: 'BAJA' },
}

export function GeoCalendarPanel() {
  const [data, setData] = useState<CalResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/calendario?dias=120', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  // Group by month for readability
  const byMonth: Record<string, CalEvent[]> = {}
  if (data?.events) {
    for (const e of data.events) {
      const month = e.date.slice(0, 7)
      if (!byMonth[month]) byMonth[month] = []
      byMonth[month].push(e)
    }
  }
  const months = Object.keys(byMonth).sort()
  const monthLabel = (m: string) => {
    try {
      const d = new Date(m + '-01')
      return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    } catch {
      return m
    }
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #6366f1', borderRadius: 12, padding: 18 }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#6366f1', textTransform: 'uppercase' }}>
          ◆ Geopolitical Calendar · próximos {data?.horizon_days || 90} días
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          Inspirado en Stratfor Geopolitical Calendar · {data?.sources?.length || 7} fuentes consolidadas
        </p>
      </header>
      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando calendario…</p>}
      {data && months.length === 0 && (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin eventos en el horizonte.</p>
      )}
      {months.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {months.map((m) => (
            <div key={m}>
              <p style={{
                margin: '0 0 8px',
                fontSize: 10,
                fontWeight: 700,
                color: '#475569',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                borderBottom: '1px dashed #e2e8f0',
                paddingBottom: 4,
              }}>
                {monthLabel(m)} · {byMonth[m].length} eventos
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {byMonth[m].map((e, i) => {
                  const imp = IMP_COLOR[e.importance] || IMP_COLOR.medium
                  const srcColor = SOURCE_COLOR[e.source] || '#64748b'
                  return (
                    <div key={i} style={{
                      display: 'grid',
                      gridTemplateColumns: '70px 80px 60px 1fr auto',
                      gap: 10,
                      alignItems: 'center',
                      fontSize: 11,
                      padding: '6px 8px',
                      background: '#f8fafc',
                      borderRadius: 4,
                      borderLeft: `2px solid ${srcColor}`,
                    }}>
                      <span style={{ fontFamily: 'ui-monospace, monospace', color: '#0f172a', fontWeight: 600 }}>
                        {e.date.slice(5)}
                      </span>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: srcColor,
                        letterSpacing: 0.5,
                      }}>
                        {e.source}
                      </span>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: imp.bg,
                        color: imp.fg,
                        textAlign: 'center',
                      }}>
                        {imp.label}
                      </span>
                      <span style={{ color: '#0f172a', fontWeight: 500 }}>{e.title}</span>
                      <span style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right' }}>
                        +{e.daysFromNow}d
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default GeoCalendarPanel
