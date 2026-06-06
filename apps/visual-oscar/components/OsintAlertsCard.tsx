'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface OAlert {
  id: string
  title: string
  sev: 'red' | 'orange' | 'green'
  source: string
  time?: string
}

const SEV_COLOR: Record<OAlert['sev'], string> = { red: '#DC2626', orange: '#D97706', green: '#16A34A' }

function ago(t?: string): string {
  if (!t) return ''
  const ms = Date.now() - Date.parse(t)
  if (isNaN(ms)) return ''
  const m = Math.round(ms / 60000)
  if (m < 60) return `${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h`
  return `${Math.round(h / 24)} d`
}

export default function OsintAlertsCard({ height = 340 }: { height?: number }) {
  const [items, setItems] = useState<OAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const out: OAlert[] = []
      try {
        const r = await fetch('/api/osiris/earthquakes')
        if (r.ok) {
          const j = await r.json()
          ;(j.earthquakes || [])
            .filter((e: any) => Number(e.magnitude) >= 4.5)
            .slice(0, 6)
            .forEach((e: any) =>
              out.push({
                id: 'eq_' + (e.id ?? `${e.place}_${e.magnitude}`),
                title: `Terremoto M${Number(e.magnitude).toFixed(1)} · ${e.place ?? '—'}`,
                sev: Number(e.magnitude) >= 6 ? 'red' : 'orange',
                source: 'USGS',
                time: e.time ?? e.createdAt,
              }),
            )
        }
      } catch {}
      try {
        const r = await fetch('/api/osiris/gdacs')
        if (r.ok) {
          const j = await r.json()
          const evs = j.events ?? j.gdacs ?? j.features ?? []
          evs.slice(0, 5).forEach((e: any) => {
            const p = e.properties ?? e
            const lvl = String(p.alertlevel ?? p.level ?? '').toLowerCase()
            out.push({
              id: 'gd_' + (p.eventid ?? p.id ?? p.title ?? Math.random()),
              title: p.title ?? p.name ?? p.eventname ?? 'Alerta de desastre',
              sev: lvl === 'red' ? 'red' : lvl === 'orange' ? 'orange' : 'green',
              source: 'GDACS',
              time: p.fromdate ?? p.date ?? p.pubDate,
            })
          })
        }
      } catch {}
      if (alive) {
        const order = { red: 0, orange: 1, green: 2 }
        out.sort((a, b) => order[a.sev] - order[b.sev])
        setItems(out.slice(0, 8))
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 180000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: '#DC2626', boxShadow: '0 0 0 3px rgba(220,38,38,0.15)' }} />
          Alertas OSINT en vivo
        </h2>
        <Link href="/osint-global?layers=conflict_zones,gdacs,war_ukraine,war_gaza&embed=0" style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textDecoration: 'none' }}>Mapa →</Link>
      </div>
      <div className="styled-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        {loading ? (
          <div style={{ padding: '20px 12px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>Cargando alertas…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '20px 12px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>Sin alertas significativas ahora mismo</div>
        ) : (
          items.map((a) => (
            <div key={a.id} style={{ display: 'flex', gap: 9, padding: '8px 8px', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV_COLOR[a.sev], marginTop: 4, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#1d1d1f', lineHeight: 1.4 }}>{a.title}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{a.source}{a.time ? ` · hace ${ago(a.time)}` : ''}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
