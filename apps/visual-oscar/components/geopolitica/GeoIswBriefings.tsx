'use client'
/**
 * `<GeoIswBriefings />` · Sprint G7.
 *
 * ISW (Institute for the Study of War) + Critical Threats · briefings
 * operativos teatro Ucrania-Rusia, Oriente Medio, redes proxy iraníes,
 * China. Mapas de avance, evaluaciones operacionales.
 *
 * Fuente: understandingwar.org + criticalthreats.org RSS.
 * NB: análisis OSINT cualitativo, NO dato duro. Validar con ACLED + UCDP.
 */
import { useEffect, useState } from 'react'

interface RssItem { title: string; link: string; pubDate: string; description: string }
interface Resp { ok: boolean; n_items?: number; items?: RssItem[]; source?: string; note?: string; error?: string }

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso.slice(0, 16) }
}

// Heurística teatro
function teatroFromTitle(title: string): { label: string; color: string } {
  const t = title.toLowerCase()
  if (t.includes('russia') || t.includes('ukrain') || t.includes('moscow') || t.includes('kyiv') || t.includes('kremlin')) return { label: 'TEATRO UCRANIA', color: '#dc2626' }
  if (t.includes('iran') || t.includes('hezbollah') || t.includes('houthi') || t.includes('hamas') || t.includes('proxy')) return { label: 'IRÁN+PROXIES', color: '#7c3aed' }
  if (t.includes('israel') || t.includes('gaza') || t.includes('lebanon')) return { label: 'ORIENTE MEDIO', color: '#f97316' }
  if (t.includes('china') || t.includes('taiwan') || t.includes('pla') || t.includes('beijing')) return { label: 'INDOPACÍFICO', color: '#0ea5e9' }
  if (t.includes('north korea') || t.includes('dprk')) return { label: 'COREA NORTE', color: '#1e40af' }
  return { label: 'BRIEFING', color: '#64748b' }
}

export function GeoIswBriefings({ limit = 20 }: { limit?: number }) {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`/api/geopolitica/isw-briefings?limit=${limit}`, { cache: 'force-cache' })
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
      borderLeft: '4px solid #be123c',
      borderRadius: 12,
      padding: 18,
    }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#be123c', textTransform: 'uppercase' }}>
          ◆ ISW / Critical Threats · Briefings operativos
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          Análisis OSINT cualitativo de teatro. Validar con ACLED + UCDP antes de tratar como hecho.
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando ISW…</p>}

      {data?.ok && data.items && data.items.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
          {data.items.map((it, i) => {
            const tg = teatroFromTitle(it.title)
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
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fff1f2' }}
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
                    {it.description.slice(0, 240)}{it.description.length > 240 ? '…' : ''}
                  </p>
                )}
              </a>
            )
          })}
        </div>
      ) : !loading && (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>
          {data?.error ? `ISW no disponible · ${data.error}` : 'Sin entradas recientes.'}
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

export default GeoIswBriefings
