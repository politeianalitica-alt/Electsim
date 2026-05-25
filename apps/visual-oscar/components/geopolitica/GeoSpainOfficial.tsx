'use client'
/**
 * `<GeoSpainOfficial />` · Sprint G7.
 *
 * Voz oficial del Estado español en exterior: MAEC + Moncloa + Defensa.gob
 * agregados en un único feed combinado y ordenado por fecha. Sirve para
 * posición oficial, viajes exteriores, reuniones bilaterales, visitas,
 * misiones militares, declaraciones diplomáticas, ayuda militar/humanitaria,
 * evacuaciones, crisis consulares.
 *
 * Fuente: RSS oficiales de exteriores.gob.es, lamoncloa.gob.es, defensa.gob.es
 * (best-effort · si una falla, las otras siguen).
 */
import { useEffect, useState } from 'react'

interface RssItem { title: string; link: string; pubDate: string; description: string; tag: string }
interface Resp {
  ok: boolean
  n_items?: number
  items?: RssItem[]
  sources_status?: Record<string, { ok: boolean; n?: number; error?: string }>
  source?: string
  note?: string
  error?: string
}

const TAG_COLOR: Record<string, string> = {
  MAEC: '#dc2626',
  MONCLOA: '#1e40af',
  DEFENSA: '#16a34a',
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso.slice(0, 16) }
}

export function GeoSpainOfficial({ limit = 25 }: { limit?: number }) {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'MAEC' | 'MONCLOA' | 'DEFENSA'>('all')

  useEffect(() => {
    let alive = true
    fetch(`/api/geopolitica/spain-official?limit=${limit}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [limit])

  const items = data?.items ?? []
  const filtered = filter === 'all' ? items : items.filter((i) => i.tag === filter)

  return (
    <section style={{
      background: 'linear-gradient(180deg, #fef2f2 0%, #fff 60%)',
      border: '1px solid #fecaca',
      borderLeft: '4px solid #dc2626',
      borderRadius: 12,
      padding: 18,
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#dc2626', textTransform: 'uppercase' }}>
            ◆ Voz oficial · España en exterior
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
            MAEC + Moncloa + Defensa.gob combinados. Posición oficial, viajes, misiones, declaraciones, alertas consulares.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'MAEC', 'MONCLOA', 'DEFENSA'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? (f === 'all' ? '#0f172a' : TAG_COLOR[f]) : '#fff',
                color: filter === f ? '#fff' : '#475569',
                border: `1px solid ${filter === f ? 'transparent' : '#e2e8f0'}`,
                borderRadius: 4,
                fontSize: 9,
                fontWeight: 700,
                padding: '4px 8px',
                cursor: 'pointer',
                letterSpacing: 0.4,
              }}
            >
              {f === 'all' ? 'TODOS' : f}
            </button>
          ))}
        </div>
      </header>

      {data?.sources_status && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 9, color: '#64748b', flexWrap: 'wrap' }}>
          {Object.entries(data.sources_status).map(([name, st]) => (
            <span key={name} style={{
              padding: '2px 6px',
              borderRadius: 3,
              background: st.ok ? '#dcfce7' : '#fee2e2',
              color: st.ok ? '#166534' : '#991b1b',
              letterSpacing: 0.4,
              fontWeight: 600,
            }}>
              {name}: {st.ok ? `${st.n} items` : `error ${st.error?.slice(0, 30) ?? ''}`}
            </span>
          ))}
        </div>
      )}

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando voz oficial española…</p>}

      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
          {filtered.map((it, i) => {
            const col = TAG_COLOR[it.tag] || '#64748b'
            return (
              <a key={`${it.link}-${i}`} href={it.link} target="_blank" rel="noopener noreferrer" style={{
                padding: 10,
                background: '#fff',
                borderLeft: `3px solid ${col}`,
                borderRadius: 4,
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background 0.15s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fef9f9' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: col,
                      color: '#fff',
                      flexShrink: 0,
                    }}>{it.tag}</span>
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
          {data?.error ? `Voz oficial no disponible · ${data.error}` : 'Sin entradas recientes.'}
        </p>
      )}

      {data?.source && (
        <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', borderTop: '1px solid #fecaca', paddingTop: 8 }}>
          {data.source} · {data.note}
        </p>
      )}
    </section>
  )
}

export default GeoSpainOfficial
