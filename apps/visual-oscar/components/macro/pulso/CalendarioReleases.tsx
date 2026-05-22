'use client'
/**
 * `<CalendarioReleases />` · próximos releases macro de INE/Eurostat/BCE/IMF.
 *
 * Consume `/api/macro/pulso/releases` (cadencia 6h cache edge).
 */
import { useEffect, useState } from 'react'

interface Release {
  date: string
  source: string
  indicator: string
  url: string
  importance: 'high' | 'medium' | 'low'
  daysFromNow: number
}

const IMPORTANCE = {
  high: { bg: '#fee2e2', color: '#991b1b', label: 'ALTA' },
  medium: { bg: '#fef3c7', color: '#92400e', label: 'MEDIA' },
  low: { bg: '#f1f5f9', color: '#475569', label: 'BAJA' },
}

const SOURCE_COLOR: Record<string, string> = {
  INE: '#dc2626',
  Eurostat: '#0F766E',
  BCE: '#6366f1',
  IMF: '#7c3aed',
  BdE: '#f59e0b',
}

export function CalendarioReleases() {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/macro/releases', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        setReleases(j?.releases ?? [])
      })
      .catch(() => {/* */})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  // Agrupar por fecha
  const byDate: Record<string, Release[]> = {}
  for (const r of releases) {
    if (!byDate[r.date]) byDate[r.date] = []
    byDate[r.date].push(r)
  }
  const dates = Object.keys(byDate).sort()

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: '4px solid #6366f1',
        borderRadius: 10,
        padding: 16,
      }}
    >
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#6366f1', textTransform: 'uppercase' }}>
          Calendario · próximos releases macro
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
          INE · Eurostat · BCE · IMF · BdE · 45 días vista · cadencia indicativa mensual
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando calendario…</p>}

      {!loading && releases.length === 0 && (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin releases en los próximos 45 días.</p>
      )}

      {!loading && releases.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dates.slice(0, 20).map((date) => (
            <DateBlock key={date} date={date} releases={byDate[date]} />
          ))}
        </div>
      )}
    </section>
  )
}

function DateBlock({ date, releases }: { date: string; releases: Release[] }) {
  const d = new Date(date + 'T00:00:00')
  const days = Math.round((d.getTime() - Date.now()) / 86400000)
  const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', weekday: 'short' })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 12, alignItems: 'flex-start' }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>{days === 0 ? 'hoy' : `+${days}d`}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {releases.map((r, i) => {
          const imp = IMPORTANCE[r.importance]
          const srcColor = SOURCE_COLOR[r.source] || '#475569'
          return (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                fontSize: 12,
                color: '#0f172a',
                textDecoration: 'none',
                padding: '4px 0',
                borderBottom: '1px dashed #f1f5f9',
              }}
            >
              <span style={{ fontSize: 9, padding: '2px 6px', background: imp.bg, color: imp.color, borderRadius: 4, fontWeight: 700, letterSpacing: 0.3 }}>
                {imp.label}
              </span>
              <span style={{ fontSize: 10, color: srcColor, fontWeight: 700, letterSpacing: 0.3 }}>
                {r.source}
              </span>
              <span style={{ flex: 1 }}>{r.indicator}</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>↗</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarioReleases
