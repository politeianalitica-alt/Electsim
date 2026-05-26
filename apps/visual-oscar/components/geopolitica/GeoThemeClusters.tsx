'use client'
/**
 * `<GeoThemeClusters />` · Sprint G10.
 *
 * Clustering temático EMERGENTE sobre 6 RSS feeds (ICG + ISW + NATO +
 * UNSC + EEAS + Spain Official) usando Gemini Flash Lite con structured
 * JSON output (responseSchema). Sin temas pre-hardcodeados · todo
 * deriva del contenido real del día.
 *
 * Replaces el patrón de "tags heurísticos por regex" (G6 tematización
 * básica) con clustering data-driven que detecta cross-source narratives.
 */
import { useEffect, useState } from 'react'

interface Member {
  idx: number
  source: string
  title: string
  date: string
  link: string
}

interface Theme {
  name: string
  summary: string
  relevance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  n_members: number
  n_sources: number
  sources: string[]
  members: Member[]
  // Sprint G13 FASE 11
  confidence?: number
  limitations?: string[]
}

interface Resp {
  ok: boolean
  n_themes?: number
  n_items_analyzed?: number
  n_items_clustered?: number
  sources_status?: Array<{ source: string; n_items: number }>
  themes?: Theme[]
  model?: string
  // Sprint G13 FASE 11
  llm_used?: boolean
  generated_by?: string
  what_it_means?: string
  what_it_does_not_mean?: string
  generated_at?: string
  methodology?: string
  disclaimer?: string
  error?: string
  note?: string
}

const RELEVANCE_COLOR: Record<string, { bg: string; track: string; fg: string }> = {
  CRITICAL: { bg: '#7f1d1d', track: '#7f1d1d', fg: '#fff' },
  HIGH:     { bg: '#dc2626', track: '#dc2626', fg: '#fff' },
  MEDIUM:   { bg: '#f59e0b', track: '#f59e0b', fg: '#fff' },
  LOW:      { bg: '#94a3b8', track: '#94a3b8', fg: '#fff' },
}

const SOURCE_COLOR: Record<string, string> = {
  ICG:   '#7c3aed',
  ISW:   '#be123c',
  NATO:  '#1e40af',
  UNSC:  '#0ea5e9',
  EEAS:  '#1e40af',
  SPAIN: '#dc2626',
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) } catch { return iso.slice(0, 10) }
}

export function GeoThemeClusters() {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/themes', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: 'linear-gradient(180deg, #1a1325 0%, #0f172a 100%)',
      border: '1px solid #4338ca',
      borderLeft: '4px solid #a855f7',
      borderRadius: 12,
      padding: 18,
      color: '#f1f5f9',
    }}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#c4b5fd', textTransform: 'uppercase' }}>
            ◆ Temas emergentes · clustering data-driven
          </p>
          {/* Sprint G13 FASE 11 · badge IA siempre visible */}
          <span
            title={data?.generated_by ? `Modelo: ${data.generated_by}` : 'Generado por LLM'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
              background: '#fae8ff', color: '#86198f', border: '1px solid #f0abfc',
              borderRadius: 999, fontSize: 9, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
            }}
          >
            ◆ Output IA{data?.generated_by ? ` · ${data.generated_by.replace('gemini-2.0-flash-lite-001', 'Gemini Flash Lite')}` : ''}
          </span>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          Gemini Flash Lite identifica temas cruzando 6 RSS feeds (ICG + ISW + NATO + UN SC +
          EEAS + voz oficial ES). Cero temas pre-hardcodeados · todo emerge del contenido
          real del día.
        </p>
        {/* Sprint G13 FASE 11 · what_it_means / what_it_does_not_mean obligatorio */}
        {(data?.what_it_means || data?.what_it_does_not_mean) && (
          <div style={{ marginTop: 8, padding: 8, background: '#3f1351', borderLeft: '3px solid #f0abfc', borderRadius: 4 }}>
            {data.what_it_means && (
              <p style={{ margin: 0, fontSize: 10, color: '#e9d5ff', lineHeight: 1.5 }}>
                <strong style={{ color: '#f0abfc' }}>Qué mide:</strong> {data.what_it_means}
              </p>
            )}
            {data.what_it_does_not_mean && (
              <p style={{ margin: '4px 0 0', fontSize: 10, color: '#fbbf24', lineHeight: 1.5, fontStyle: 'italic' }}>
                <strong style={{ color: '#fcd34d' }}>⚠ NO ES FUENTE FACTUAL:</strong> {data.what_it_does_not_mean}
              </p>
            )}
          </div>
        )}
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Clusterizando temas con Gemini…</p>}

      {data?.ok && (
        <>
          {/* Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 14 }}>
            <Stat label="Temas detectados" value={String(data.n_themes ?? 0)} color="#a855f7" />
            <Stat label="Items analizados" value={String(data.n_items_analyzed ?? 0)} color="#cbd5e1" />
            <Stat label="Items clusterizados" value={String(data.n_items_clustered ?? 0)} color="#fbbf24" />
            <Stat label="Modelo" value="gemini-flash-lite" color="#94a3b8" small />
          </div>

          {/* Sources status */}
          {data.sources_status && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14, fontSize: 9 }}>
              {data.sources_status.map((s) => (
                <span key={s.source} style={{
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: s.n_items > 0 ? `${SOURCE_COLOR[s.source] || '#64748b'}30` : '#7f1d1d30',
                  color: s.n_items > 0 ? (SOURCE_COLOR[s.source] || '#94a3b8') : '#fca5a5',
                  border: `1px solid ${s.n_items > 0 ? `${SOURCE_COLOR[s.source] || '#64748b'}60` : '#7f1d1d60'}`,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                }}>
                  {s.source}: {s.n_items}
                </span>
              ))}
            </div>
          )}

          {/* Themes */}
          {data.themes && data.themes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 720, overflowY: 'auto' }}>
              {data.themes.map((t, i) => {
                const rc = RELEVANCE_COLOR[t.relevance] || RELEVANCE_COLOR.MEDIUM
                const key = `${i}-${t.name}`
                const isOpen = !!expanded[key]
                return (
                  <article key={key} style={{
                    background: '#1e293b',
                    border: `1px solid ${rc.track}40`,
                    borderLeft: `4px solid ${rc.track}`,
                    borderRadius: 6,
                    padding: 12,
                  }}>
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: rc.bg,
                          color: rc.fg,
                          letterSpacing: 0.5,
                          flexShrink: 0,
                        }}>{t.relevance}</span>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>{t.name}</h3>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: '#cbd5e1' }}>
                          {t.n_members} items · {t.n_sources}/6 fuentes
                        </span>
                        {/* Sprint G13 FASE 11 · confidence por tema */}
                        {typeof t.confidence === 'number' && (
                          <span title="Confianza del clustering · alta si ≥3 fuentes coinciden" style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                            background: t.confidence >= 0.65 ? '#166534' : t.confidence >= 0.5 ? '#92400e' : '#7f1d1d',
                            color: '#fff', letterSpacing: 0.3,
                          }}>conf {Math.round(t.confidence * 100)}%</span>
                        )}
                        <button
                          onClick={() => setExpanded({ ...expanded, [key]: !isOpen })}
                          style={{
                            background: '#334155',
                            color: '#cbd5e1',
                            border: 'none',
                            borderRadius: 3,
                            fontSize: 10,
                            padding: '2px 8px',
                            cursor: 'pointer',
                            letterSpacing: 0.3,
                          }}
                        >
                          {isOpen ? '▴ Ocultar' : '▾ Ver items'}
                        </button>
                      </div>
                    </header>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                      {t.summary}
                    </p>
                    {/* Sprint G13 FASE 11 · limitations por tema */}
                    {t.limitations && t.limitations.length > 0 && (
                      <details style={{ marginBottom: 8 }}>
                        <summary style={{ fontSize: 9, color: '#f0abfc', cursor: 'pointer', letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 700 }}>
                          ⚠ {t.limitations.length} limitaciones del cluster IA
                        </summary>
                        <ul style={{ margin: '4px 0 0 14px', padding: 0, fontSize: 9, color: '#cbd5e1', lineHeight: 1.4 }}>
                          {t.limitations.map((l, i) => <li key={i}>{l}</li>)}
                        </ul>
                      </details>
                    )}
                    {/* Source chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: isOpen ? 10 : 0 }}>
                      {t.sources.map((s) => (
                        <span key={s} style={{
                          fontSize: 8,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 2,
                          background: SOURCE_COLOR[s] || '#64748b',
                          color: '#fff',
                          letterSpacing: 0.4,
                        }}>{s}</span>
                      ))}
                    </div>
                    {/* Member items expandible */}
                    {isOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, paddingTop: 8, borderTop: '1px solid #334155' }}>
                        {t.members.map((m) => {
                          const sc = SOURCE_COLOR[m.source] || '#94a3b8'
                          return (
                            <a key={m.idx} href={m.link} target="_blank" rel="noopener noreferrer" style={{
                              display: 'grid',
                              gridTemplateColumns: '50px 1fr 70px',
                              gap: 8,
                              padding: '4px 6px',
                              background: '#0f172a',
                              borderRadius: 3,
                              textDecoration: 'none',
                              color: '#cbd5e1',
                              fontSize: 10,
                              alignItems: 'center',
                              transition: 'background 0.15s',
                            }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#0f172a' }}
                            >
                              <span style={{ fontSize: 8, fontWeight: 700, color: sc, letterSpacing: 0.4 }}>{m.source}</span>
                              <span>{m.title}</span>
                              <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>{fmtDate(m.date)}</span>
                            </a>
                          )
                        })}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin temas detectados (probable: feeds vacíos o Gemini sin respuesta).</p>
          )}

          <p style={{ margin: '14px 0 0', fontSize: 9, color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: 10, lineHeight: 1.5 }}>
            {data.methodology} · generado {data.generated_at?.slice(0, 16).replace('T', ' ')} · cache 6h
            <br />
            <em>{data.disclaimer}</em>
          </p>
        </>
      )}

      {data && !data.ok && (
        <p style={{ fontSize: 11, color: '#fca5a5' }}>
          Clustering no disponible · {data.error}
          {data.note && <span style={{ display: 'block', marginTop: 4, color: '#94a3b8' }}>{data.note}</span>}
        </p>
      )}
    </section>
  )
}

function Stat({ label, value, color, small = false }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div style={{ padding: 8, background: '#0f172a', borderRadius: 4, border: '1px solid #1e293b' }}>
      <p style={{ margin: 0, fontSize: 8, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: small ? 11 : 20, fontWeight: 700, color, fontFamily: small ? 'inherit' : 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

export default GeoThemeClusters
