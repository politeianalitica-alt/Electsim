'use client'
/**
 * `<GeoStateMediaFeeds />` · Sprint G14 FASE 4 (ligera)
 *
 * Muestra lo último publicado en medios estatales / régimen autoritario
 * (Sputnik, Xinhua, RT, CGTN, Al Jazeera, Press TV, TRT, Granma, teleSUR)
 * con etiquetas explícitas de país + régimen + caveat.
 *
 * NO es para citar como hecho · es lectura de framing oficial cross-país.
 * Cada feed lleva su "Qué mide / Qué NO mide" + nota de fiabilidad.
 *
 * Diferenciador vs scroll de Reuters/BBC: aquí ves el mismo evento desde
 * Moscú / Pekín / Teherán / Doha, y puedes detectar líneas coordinadas.
 */
import { useEffect, useState } from 'react'

interface Item {
  title: string
  link: string
  pubDate: string
  description?: string
}

interface FeedResult {
  feed_id: string
  feed_name: string
  country_iso3: string
  country_name: string
  language: string
  regime: 'authoritarian' | 'hybrid' | 'state_funded_democracy' | 'public_service'
  press_freedom: string
  via_rsshub: boolean
  relevance_to_spain: string
  reliability_note: string
  topics: string[]
  items_count: number
  items: Item[]
  fetch_status: 'ok' | 'error'
  fetch_error: string | null
}

interface Resp {
  ok: boolean
  _meta?: { what_it_means: string; what_it_does_not_mean: string; warnings: string[] }
  totals?: {
    n_feeds_ok: number; n_feeds_error: number
    n_items_total: number; n_items_authoritarian: number
  }
  feeds: FeedResult[]
}

const REGIME_COLOR: Record<string, { bg: string; fg: string; label: string }> = {
  authoritarian: { bg: '#1f2937', fg: '#fee2e2', label: 'AUTORITARIO' },
  hybrid: { bg: '#78350f', fg: '#fde68a', label: 'HÍBRIDO' },
  state_funded_democracy: { bg: '#064e3b', fg: '#a7f3d0', label: 'ESTATAL DEMOCRACIA' },
  public_service: { bg: '#064e3b', fg: '#a7f3d0', label: 'PÚBLICO' },
}

const LANG_FLAG: Record<string, string> = {
  es: 'ES', en: 'EN', ar: 'AR', zh: 'ZH', ru: 'RU', fr: 'FR',
}

function fmtRel(iso: string): string {
  if (!iso) return ''
  try {
    const t = new Date(iso).getTime()
    if (isNaN(t)) return iso.slice(0, 10)
    const diffH = (Date.now() - t) / 3600000
    if (diffH < 1) return `hace ${Math.max(1, Math.round(diffH * 60))}m`
    if (diffH < 24) return `hace ${Math.round(diffH)}h`
    if (diffH < 168) return `hace ${Math.round(diffH / 24)}d`
    return iso.slice(0, 10)
  } catch { return iso.slice(0, 10) }
}

export function GeoStateMediaFeeds() {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/state-media?limit_per_feed=6', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: '#020617',
      border: '1px solid #1e293b',
      borderLeft: '4px solid #ef4444',
      borderRadius: 12,
      padding: 18,
      color: '#f1f5f9',
    }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#fca5a5', textTransform: 'uppercase' }}>
          ⚠ Cobertura medios estatales · régimen autoritario
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          Lo que publican Moscú · Pekín · Teherán · Doha · Ankara · La Habana · Caracas sobre el mundo, AHORA.
          Útil para detectar líneas coordinadas y framing oficial cross-país.
          <strong style={{ color: '#fca5a5' }}> NO es fuente factual · NO usar para citar como hecho.</strong>
        </p>
        {data?.totals && (
          <p style={{ margin: '6px 0 0', fontSize: 10, color: '#64748b' }}>
            {data.totals.n_feeds_ok}/{data.totals.n_feeds_ok + data.totals.n_feeds_error} feeds activos · {data.totals.n_items_total} items · {data.totals.n_items_authoritarian} de fuentes opresión/no-libres
          </p>
        )}
      </header>

      {/* "Qué mide / Qué NO mide" del response */}
      {data?._meta && (
        <div style={{
          background: '#1c1917', border: '1px solid #44403c', borderRadius: 6,
          padding: '8px 10px', marginBottom: 12, fontSize: 10, color: '#fde68a',
        }}>
          <div><strong style={{ color: '#fca5a5' }}>Qué mide:</strong> {data._meta.what_it_means}</div>
          <div style={{ marginTop: 3 }}><strong style={{ color: '#fca5a5' }}>Qué NO mide:</strong> {data._meta.what_it_does_not_mean}</div>
        </div>
      )}

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando feeds estatales…</p>}

      {data && data.feeds.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {data.feeds.map((f) => {
            const rc = REGIME_COLOR[f.regime] || REGIME_COLOR.authoritarian
            const isOpen = !!expanded[f.feed_id]
            const showItems = isOpen ? f.items : f.items.slice(0, 3)
            return (
              <article key={f.feed_id} style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 8,
                padding: 12,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {/* Header feed */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{f.feed_name}</h3>
                      <span style={{
                        fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 2,
                        background: rc.bg, color: rc.fg, letterSpacing: 0.4,
                        border: f.regime === 'authoritarian' ? '1px solid #991b1b' : 'none',
                      }}>{rc.label}</span>
                      <span style={{
                        fontSize: 8, padding: '1px 4px', borderRadius: 2,
                        background: '#334155', color: '#cbd5e1', letterSpacing: 0.4,
                      }}>{LANG_FLAG[f.language] || f.language.toUpperCase()}</span>
                      <span style={{ fontSize: 8, color: '#94a3b8', textTransform: 'capitalize' }}>{f.country_name}</span>
                    </div>
                  </div>
                  {f.fetch_status === 'error' && (
                    <span title={f.fetch_error || 'fetch error'} style={{
                      fontSize: 8, color: '#fca5a5', fontWeight: 700, letterSpacing: 0.4,
                    }}>● OFFLINE</span>
                  )}
                  {f.fetch_status === 'ok' && f.items_count === 0 && (
                    <span style={{ fontSize: 8, color: '#94a3b8', letterSpacing: 0.4 }}>● VACÍO</span>
                  )}
                </div>

                {/* Por qué importa · línea descriptiva */}
                <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }}>
                  {f.relevance_to_spain}
                </p>

                {/* Items */}
                {showItems.length === 0 ? (
                  <p style={{ margin: '4px 0', fontSize: 10, color: '#64748b' }}>
                    {f.fetch_status === 'error' ? 'Feed no disponible · rsshub.app puede tener rate-limit' : 'Sin items recientes'}
                  </p>
                ) : (
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {showItems.map((it, i) => (
                      <li key={i} style={{ borderTop: i > 0 ? '1px solid #1e293b' : 'none', paddingTop: i > 0 ? 4 : 0 }}>
                        <a href={it.link} target="_blank" rel="noopener noreferrer" style={{
                          color: '#cbd5e1', fontSize: 10, lineHeight: 1.4, textDecoration: 'none',
                          display: 'block',
                        }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#fbbf24' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#cbd5e1' }}
                        >
                          {it.title}
                          {it.pubDate && <span style={{ display: 'block', fontSize: 8, color: '#64748b', marginTop: 2 }}>{fmtRel(it.pubDate)}</span>}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                {f.items.length > 3 && (
                  <button
                    onClick={() => setExpanded({ ...expanded, [f.feed_id]: !isOpen })}
                    style={{
                      background: 'transparent', color: '#94a3b8', border: '1px solid #334155',
                      borderRadius: 3, fontSize: 9, padding: '2px 8px', cursor: 'pointer',
                      letterSpacing: 0.4, alignSelf: 'flex-start', fontFamily: 'inherit',
                    }}
                  >{isOpen ? '◂ Plegar' : `▾ Ver ${f.items.length - 3} más`}</button>
                )}

                {/* Caveat fiabilidad */}
                <details style={{ marginTop: 4 }}>
                  <summary style={{ fontSize: 9, color: '#fca5a5', cursor: 'pointer', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                    ⓘ Cómo interpretar
                  </summary>
                  <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8', lineHeight: 1.5 }}>
                    {f.reliability_note}
                  </p>
                </details>
              </article>
            )
          })}
        </div>
      )}

      {/* Warnings _meta */}
      {data?._meta?.warnings && data._meta.warnings.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #1e293b' }}>
          {data._meta.warnings.map((w, i) => (
            <p key={i} style={{ margin: 0, fontSize: 9, color: '#fde68a', lineHeight: 1.4 }}>⚠ {w}</p>
          ))}
        </div>
      )}
    </section>
  )
}

export default GeoStateMediaFeeds
