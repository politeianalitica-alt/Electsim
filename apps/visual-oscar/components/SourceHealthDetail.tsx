'use client'
import { useState } from 'react'
import { useApi } from '@/lib/useApi'

interface Source { id?: string; name: string; type?: string; status?: 'active' | 'degraded' | 'down'; last_success?: string; articles_24h?: number; latency_ms?: number; error?: string }
interface SourceHealthData {
  summary?: { total: number; active: number; degraded: number; down: number }
  active?: Source[]
  degraded?: Source[]
  down?: Source[]
  mode?: 'real' | 'demo'
}

const FALLBACK: SourceHealthData = {
  summary: { total: 487, active: 412, degraded: 47, down: 28 },
  mode: 'demo',
  degraded: [
    { name: 'EFE Agencia', type: 'agencia', status: 'degraded', last_success: '2026-05-08T03:22:00Z', latency_ms: 3400, error: 'timeout intermitente' },
    { name: 'Antena 3 Noticias', type: 'tv', status: 'degraded', last_success: '2026-05-08T05:11:00Z', latency_ms: 5200, error: 'rate limit' },
    { name: 'Onda Cero', type: 'radio', status: 'degraded', last_success: '2026-05-07T22:48:00Z', latency_ms: 2800, error: 'feed parcial' },
    { name: 'Diario de Mallorca', type: 'prensa', status: 'degraded', last_success: '2026-05-08T01:30:00Z', latency_ms: 4100, error: 'parser fallando' },
    { name: 'OK Diario', type: 'digital', status: 'degraded', last_success: '2026-05-08T04:55:00Z', latency_ms: 6700, error: 'lentitud' },
  ],
  down: [
    { name: 'Andalucía Información', type: 'prensa', status: 'down', last_success: '2026-05-06T18:00:00Z', error: 'HTTP 503' },
    { name: 'Vasco Press', type: 'prensa', status: 'down', last_success: '2026-05-05T12:30:00Z', error: 'DNS error' },
    { name: 'Canal Sur Notícias', type: 'tv', status: 'down', last_success: '2026-05-07T09:00:00Z', error: 'feed offline' },
    { name: 'Voz Galicia', type: 'prensa', status: 'down', last_success: '2026-05-07T20:11:00Z', error: 'HTTP 502' },
  ],
  active: [
    { name: 'El País', type: 'prensa', status: 'active', last_success: '2026-05-08T08:00:00Z', articles_24h: 142 },
    { name: 'El Mundo', type: 'prensa', status: 'active', last_success: '2026-05-08T08:02:00Z', articles_24h: 118 },
    { name: 'ABC', type: 'prensa', status: 'active', last_success: '2026-05-08T08:01:00Z', articles_24h: 96 },
    { name: 'La Vanguardia', type: 'prensa', status: 'active', last_success: '2026-05-08T08:03:00Z', articles_24h: 87 },
    { name: 'eldiario.es', type: 'digital', status: 'active', last_success: '2026-05-08T08:00:00Z', articles_24h: 73 },
    { name: 'RTVE', type: 'tv', status: 'active', last_success: '2026-05-08T07:58:00Z', articles_24h: 62 },
    { name: 'Cadena SER', type: 'radio', status: 'active', last_success: '2026-05-08T07:59:00Z', articles_24h: 58 },
    { name: 'COPE', type: 'radio', status: 'active', last_success: '2026-05-08T08:00:00Z', articles_24h: 47 },
    { name: 'Europa Press', type: 'agencia', status: 'active', last_success: '2026-05-08T08:01:00Z', articles_24h: 312 },
    { name: '20 Minutos', type: 'digital', status: 'active', last_success: '2026-05-08T08:02:00Z', articles_24h: 89 },
    { name: 'El Confidencial', type: 'digital', status: 'active', last_success: '2026-05-08T08:00:00Z', articles_24h: 42 },
    { name: 'Público', type: 'digital', status: 'active', last_success: '2026-05-08T08:01:00Z', articles_24h: 31 },
  ],
}

export default function SourceHealthDetail() {
  const { data } = useApi<SourceHealthData>('/api/media/source-health', { refreshInterval: 300_000 })
  const d = data ?? FALLBACK
  const summary = d.summary ?? FALLBACK.summary!
  const degraded = (d.degraded?.length ?? 0) > 0 ? d.degraded! : (FALLBACK.degraded ?? [])
  const down = (d.down?.length ?? 0) > 0 ? d.down! : (FALLBACK.down ?? [])
  const active = (d.active?.length ?? 0) > 0 ? d.active! : (FALLBACK.active ?? [])

  const [activeOpen, setActiveOpen] = useState(false)

  return (
 <section style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '22px 26px' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
 <div>
 <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>
            Monitor de fuentes
 </p>
 <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Salud de fuentes · {summary.total} catalogadas</h3>
 </div>
 <span style={{
          padding: '4px 12px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          background: d.mode === 'real' ? 'rgba(45,138,57,0.12)' : 'rgba(178,80,0,0.12)',
          color: d.mode === 'real' ? '#2d8a39' : '#b25000',
        }}>{d.mode === 'real' ? 'Tiempo real' : 'Modo demo'}</span>
 </div>

      {/* Summary KPIs */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { l: 'Total', v: summary.total, c: '#1d1d1f' },
          { l: 'Activas', v: summary.active, c: '#2d8a39' },
          { l: 'Degradadas', v: summary.degraded, c: '#b25000' },
          { l: 'Caídas', v: summary.down, c: '#c42c2c' },
        ].map(k => (
 <div key={k.l} style={{ background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12, padding: '12px 14px' }}>
 <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>{k.l}</div>
 <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 24, fontWeight: 700, color: k.c, letterSpacing: '-0.02em' }}>{k.v}</div>
 </div>
        ))}
 </div>

      {/* Degraded — always expanded */}
 <CollapsibleSection title="Degradadas" count={summary.degraded} color="#b25000" defaultOpen>
 <SourceList items={degraded} statusColor="#b25000"/>
 </CollapsibleSection>

      {/* Down */}
 <CollapsibleSection title="Caídas" count={summary.down} color="#c42c2c">
 <SourceList items={down} statusColor="#c42c2c"/>
 </CollapsibleSection>

      {/* Active — collapsed by default */}
 <CollapsibleSection title="Activas" count={summary.active} color="#2d8a39"
        controlled={{ open: activeOpen, setOpen: setActiveOpen }}>
        {!activeOpen ? (
 <button onClick={() => setActiveOpen(true)} style={{
            width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px dashed #e8e8ed', background: '#fafafc',
            fontSize: 12, color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit',
          }}>Ver todas ({summary.active})</button>
        ) : (
 <SourceList items={active.slice(0, 20)} statusColor="#2d8a39"/>
        )}
 </CollapsibleSection>
 </section>
  )
}

function CollapsibleSection({ title, count, color, defaultOpen = false, controlled, children }: {
  title: string; count: number; color: string; defaultOpen?: boolean
  controlled?: { open: boolean; setOpen: (b: boolean) => void }
  children: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = controlled ? controlled.open : internalOpen
  const setOpen = controlled ? controlled.setOpen : setInternalOpen
  return (
 <div style={{ marginBottom: 12, border: '1px solid #f0f0f3', borderRadius: 12, overflow: 'hidden' }}>
 <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: 'none', background: '#fafafc', cursor: 'pointer', fontFamily: 'inherit',
      }}>
 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
 <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
 <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{title}</span>
 <span style={{ padding: '2px 10px', borderRadius: 999, background: `${color}15`, color, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display,system-ui)' }}>{count}</span>
 </span>
 <span style={{ fontSize: 11, color: '#6e6e73' }}>{open ? '▼' : '▶'}</span>
 </button>
      {open && <div style={{ padding: '12px 16px', background: '#fff' }}>{children}</div>}
 </div>
  )
}

function SourceList({ items, statusColor }: { items: Source[]; statusColor: string }) {
  if (items.length === 0) return <p style={{ fontSize: 11.5, color: '#6e6e73', fontStyle: 'italic', margin: 0 }}>Datos no disponibles en modo demo.</p>
  return (
 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
 <tbody>
        {items.map((s, i) => (
 <tr key={s.name} style={{ borderBottom: i < items.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
 <td style={{ padding: '8px 10px', color: '#1d1d1f', fontWeight: 500 }}>{s.name}</td>
 <td style={{ padding: '8px 10px', color: '#6e6e73', fontSize: 10.5 }}>{s.type ?? '—'}</td>
 <td style={{ padding: '8px 10px', color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>
              {s.last_success ? new Date(s.last_success).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
 </td>
 <td style={{ padding: '8px 10px', textAlign: 'right' }}>
              {s.articles_24h != null && (
 <span style={{ fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, color: '#1F4E8C' }}>{s.articles_24h}</span>
              )}
              {s.error && (
 <span style={{ fontSize: 10, color: statusColor, fontStyle: 'italic' }}>{s.error}</span>
              )}
 </td>
 </tr>
        ))}
 </tbody>
 </table>
  )
}
