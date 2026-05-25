'use client'
/**
 * `<GeoNatoFeed />` · Sprint G6.
 *
 * Feed RSS oficial NATO HQ · riesgo militar europeo, flanco este,
 * cumbres, comunicados, ejercicios, defensa colectiva, presencia avanzada,
 * artículo 5, relación Rusia-OTAN, misiones aliadas.
 *
 * Fuente: https://www.nato.int/cps/en/natohq/news.xml
 */
import { useEffect, useState } from 'react'

interface RssItem {
  title: string
  link: string
  pubDate: string
  description: string
}

interface NatoResp {
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

export function GeoNatoFeed({ limit = 20 }: { limit?: number }) {
  const [data, setData] = useState<NatoResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`/api/geopolitica/nato-press?limit=${limit}`, { cache: 'force-cache' })
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
      borderLeft: '4px solid #1e40af',
      borderRadius: 12,
      padding: 18,
    }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#1e40af', textTransform: 'uppercase' }}>
          ◆ NATO HQ · Press releases & defense alliance
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          RSS oficial nato.int · cumbres, ejercicios, flanco este, defensa aérea, presencia avanzada, relación Rusia-OTAN.
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando NATO…</p>}

      {data?.ok && data.items && data.items.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
          {data.items.map((it, i) => (
            <a key={`${it.link}-${i}`} href={it.link} target="_blank" rel="noopener noreferrer" style={{
              padding: 10,
              background: '#f8fafc',
              borderLeft: '3px solid #1e40af',
              borderRadius: 4,
              textDecoration: 'none',
              color: 'inherit',
              transition: 'background 0.15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', flex: 1 }}>{it.title}</span>
                <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>{fmtDate(it.pubDate)}</span>
              </div>
              {it.description && (
                <p style={{ margin: 0, fontSize: 10, color: '#475569', lineHeight: 1.4 }}>
                  {it.description.slice(0, 220)}{it.description.length > 220 ? '…' : ''}
                </p>
              )}
            </a>
          ))}
        </div>
      ) : !loading && (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>
          {data?.error ? `NATO RSS no disponible · ${data.error}` : 'Sin entradas recientes en NATO RSS.'}
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

export default GeoNatoFeed
