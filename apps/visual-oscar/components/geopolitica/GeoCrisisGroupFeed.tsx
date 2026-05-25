'use client'
/**
 * `<GeoCrisisGroupFeed />` · Sprint G7.
 *
 * International Crisis Group CrisisWatch · early warning analyst-grade.
 * Conflictos activos, deterioros, mejoras, análisis regional cualitativo.
 *
 * Fuente: crisisgroup.org RSS · varios endpoints best-effort.
 */
import { useEffect, useState } from 'react'

interface RssItem { title: string; link: string; pubDate: string; description: string }
interface Resp { ok: boolean; n_items?: number; items?: RssItem[]; source?: string; note?: string; error?: string }

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso.slice(0, 16) }
}

// Heurística simple para tag de región
function regionFromTitle(title: string): { label: string; color: string } {
  const t = title.toLowerCase()
  if (t.includes('ukrain') || t.includes('russia') || t.includes('belarus')) return { label: 'Europa·Ex-URSS', color: '#0ea5e9' }
  if (t.includes('gaza') || t.includes('israel') || t.includes('iran') || t.includes('lebanon') || t.includes('syria') || t.includes('yemen')) return { label: 'Oriente Medio', color: '#dc2626' }
  if (t.includes('sudan') || t.includes('somalia') || t.includes('ethiopia') || t.includes('mali') || t.includes('sahel') || t.includes('niger')) return { label: 'África', color: '#f97316' }
  if (t.includes('china') || t.includes('taiwan') || t.includes('myanmar') || t.includes('korea')) return { label: 'Asia', color: '#7c3aed' }
  if (t.includes('venezuela') || t.includes('haiti') || t.includes('colombia') || t.includes('mexico')) return { label: 'América Latina', color: '#16a34a' }
  return { label: 'Global', color: '#64748b' }
}

export function GeoCrisisGroupFeed({ limit = 20 }: { limit?: number }) {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`/api/geopolitica/crisis-group?limit=${limit}`, { cache: 'force-cache' })
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
      borderLeft: '4px solid #7c3aed',
      borderRadius: 12,
      padding: 18,
    }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#7c3aed', textTransform: 'uppercase' }}>
          ◆ International Crisis Group · CrisisWatch
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          Early warning analyst-grade · conflictos activos, deterioro, mejora, análisis regional cualitativo.
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando ICG…</p>}

      {data?.ok && data.items && data.items.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
          {data.items.map((it, i) => {
            const tag = regionFromTitle(it.title)
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
                onMouseEnter={(e) => { e.currentTarget.style.background = '#faf5ff' }}
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
                    {it.description.slice(0, 240)}{it.description.length > 240 ? '…' : ''}
                  </p>
                )}
              </a>
            )
          })}
        </div>
      ) : !loading && (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>
          {data?.error ? `ICG no disponible · ${data.error}` : 'Sin entradas recientes.'}
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

export default GeoCrisisGroupFeed
