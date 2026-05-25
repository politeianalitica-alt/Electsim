'use client'
/**
 * `<GeoUnscFeed />` · Sprint G6.
 *
 * Feed UN News · Security Council. Diplomacia de crisis: resoluciones,
 * vetos, reuniones de emergencia, mandatos, misiones de paz, sanciones,
 * alto el fuego, posiciones P5 (US/UK/FR/RU/CN).
 *
 * Fuente: news.un.org RSS topic security-council
 */
import { useEffect, useState } from 'react'

interface RssItem {
  title: string
  link: string
  pubDate: string
  description: string
}

interface UnscResp {
  ok: boolean
  n_items?: number
  items?: RssItem[]
  source: string
  note?: string
  error?: string
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso.slice(0, 16) }
}

// Heurística simple para tag de tema diplomático
function tagFromTitle(title: string): { label: string; color: string } {
  const t = title.toLowerCase()
  if (t.includes('resolution') || t.includes('resolución')) return { label: 'RESOLUCIÓN', color: '#7c3aed' }
  if (t.includes('veto')) return { label: 'VETO', color: '#dc2626' }
  if (t.includes('ceasefire') || t.includes('alto el fuego')) return { label: 'ALTO EL FUEGO', color: '#16a34a' }
  if (t.includes('peacekeeping') || t.includes('mission')) return { label: 'MISIÓN PAZ', color: '#0ea5e9' }
  if (t.includes('sanction')) return { label: 'SANCIÓN', color: '#f97316' }
  if (t.includes('briefing') || t.includes('meeting')) return { label: 'REUNIÓN', color: '#64748b' }
  return { label: 'DIPLOMÁTICA', color: '#1e40af' }
}

export function GeoUnscFeed({ limit = 20 }: { limit?: number }) {
  const [data, setData] = useState<UnscResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`/api/geopolitica/unsc-news?limit=${limit}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [limit])

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderLeft: '4px solid #0ea5e9',
      borderRadius: 12,
      padding: 18,
    }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0ea5e9', textTransform: 'uppercase' }}>
          ◆ UN Security Council · Diplomacia de crisis
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          news.un.org · resoluciones, vetos, reuniones emergencia, peacekeeping, posiciones P5.
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando UN Security Council…</p>}

      {data?.ok && data.items && data.items.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
          {data.items.map((it, i) => {
            const tag = tagFromTitle(it.title)
            return (
              <a key={`${it.link}-${i}`} href={it.link} target="_blank" rel="noopener noreferrer" style={{
                padding: 10,
                background: '#f8fafc',
                borderLeft: `3px solid ${tag.color}`,
                borderRadius: 4,
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background 0.15s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f9ff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: tag.color,
                      color: '#fff',
                      flexShrink: 0,
                    }}>{tag.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{it.title}</span>
                  </div>
                  <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>{fmtDate(it.pubDate)}</span>
                </div>
                {it.description && (
                  <p style={{ margin: 0, fontSize: 10, color: '#475569', lineHeight: 1.4 }}>
                    {it.description.slice(0, 220)}{it.description.length > 220 ? '…' : ''}
                  </p>
                )}
              </a>
            )
          })}
        </div>
      ) : !loading && (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>
          {data?.error ? `UN Security Council RSS no disponible · ${data.error}` : 'Sin entradas recientes.'}
        </p>
      )}

      {data?.source && (
        <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
          {data.source} · {data.note}
        </p>
      )}
    </section>
  )
}

export default GeoUnscFeed
