'use client'
/**
 * `<GeoEeasFeed />` · Sprint G7.
 *
 * EEAS (European External Action Service) + Council of EU · posición
 * oficial europea: sanciones, declaraciones Alto Representante, misiones
 * CSDP, respuesta UE a crisis, condena de violencia.
 *
 * Fuente: Council of EU + EEAS RSS · varios endpoints best-effort.
 */
import { useEffect, useState } from 'react'

interface RssItem { title: string; link: string; pubDate: string; description: string }
interface Resp { ok: boolean; n_items?: number; items?: RssItem[]; source?: string; note?: string; error?: string }

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso.slice(0, 16) }
}

function topicFromTitle(title: string): { label: string; color: string } {
  const t = title.toLowerCase()
  if (t.includes('sanction') || t.includes('restrictive')) return { label: 'SANCIÓN UE', color: '#dc2626' }
  if (t.includes('declaration') || t.includes('high representative') || t.includes('borrell') || t.includes('kallas')) return { label: 'ALTO REPRES.', color: '#1e40af' }
  if (t.includes('mission') || t.includes('csdp') || t.includes('eutm') || t.includes('eubam')) return { label: 'MISIÓN CSDP', color: '#0ea5e9' }
  if (t.includes('council conclusion')) return { label: 'CONSEJO UE', color: '#7c3aed' }
  if (t.includes('press release')) return { label: 'COMUNICADO', color: '#64748b' }
  return { label: 'DIPLOMACIA UE', color: '#1e40af' }
}

export function GeoEeasFeed({ limit = 20 }: { limit?: number }) {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`/api/geopolitica/eeas-news?limit=${limit}`, { cache: 'force-cache' })
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
          ◆ EEAS / Council EU · Posición oficial europea
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          Sanciones UE, declaraciones Alto Representante, misiones CSDP, respuesta europea a crisis.
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando EEAS…</p>}

      {data?.ok && data.items && data.items.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
          {data.items.map((it, i) => {
            const tg = topicFromTitle(it.title)
            return (
              <a key={`${it.link}-${i}`} href={it.link} target="_blank" rel="noopener noreferrer" style={{
                padding: 10,
                background: '#f8fafc',
                borderLeft: `3px solid ${tg.color}`,
                borderRadius: 4,
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background 0.15s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff' }}
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
                      background: tg.color,
                      color: '#fff',
                      flexShrink: 0,
                    }}>{tg.label}</span>
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
          {data?.error ? `EEAS no disponible · ${data.error}` : 'Sin entradas recientes.'}
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

export default GeoEeasFeed
