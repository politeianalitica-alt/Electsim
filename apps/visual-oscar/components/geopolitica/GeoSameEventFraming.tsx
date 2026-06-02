'use client'
/**
 * `<GeoSameEventFraming />` · Sprint G14 FASE 4 cierre
 *
 * Patrón "El mismo evento contado por N voces · framing comparativo".
 * Inspirado en news-title-bias dataset (allsides.com) del repo
 * `gits amigos/news-title-bias-master`.
 *
 * Usa la salida de /api/geopolitica/themes (clustering IA Gemini sobre 6 RSS
 * feeds expertos) cuyos miembros ya vienen enriquecidos server-side con
 * media_bias (G14 FASE 2 cont). Selecciona temas con ≥3 sources distintas y
 * los muestra horizontalmente con cada voz coloreada por bias + regime.
 *
 * Diferenciador: en vez de ver el feed de Reuters AISLADO del feed de Xinhua,
 * el analista ve el MISMO tema contado por ambos lado a lado · framing
 * comparativo instantáneo · útil para detectar líneas coordinadas o
 * desalineamientos.
 */
import { useEffect, useState } from 'react'

interface MemberBias {
  country: string
  bias: string
  press_freedom: string
  regime: 'free' | 'hybrid' | 'authoritarian' | 'unknown'
  factual: string
}

interface MemberEvidence {
  source: string
  title: string
  link: string
  date: string
  media_bias?: MemberBias | null
}

interface Theme {
  name: string
  summary: string
  relevance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  n_members: number
  n_sources: number
  sources: string[]
  member_evidence: MemberEvidence[]
  confidence?: number
  authoritarian_flag?: boolean
  authoritarian_source_share?: number
}

interface Resp {
  ok: boolean
  themes?: Theme[]
  llm_used?: boolean
  generated_by?: string
}

const REGIME_BG: Record<string, string> = {
  authoritarian: '#7f1d1d',
  hybrid: '#78350f',
  free: '#064e3b',
  unknown: '#1e293b',
}
const REGIME_FG: Record<string, string> = {
  authoritarian: '#fee2e2',
  hybrid: '#fde68a',
  free: '#a7f3d0',
  unknown: '#cbd5e1',
}
const RELEVANCE_COLOR: Record<string, string> = {
  CRITICAL: '#dc2626', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#94a3b8',
}

function fmtRel(iso: string): string {
  if (!iso) return ''
  try {
    const t = new Date(iso).getTime()
    if (isNaN(t)) return iso.slice(0, 10)
    const dh = (Date.now() - t) / 3600000
    if (dh < 1) return `${Math.max(1, Math.round(dh * 60))}m`
    if (dh < 24) return `${Math.round(dh)}h`
    if (dh < 168) return `${Math.round(dh / 24)}d`
    return iso.slice(0, 10)
  } catch { return '' }
}

export function GeoSameEventFraming() {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/themes', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  // Filtrar temas con ≥3 voces distintas (esos son los que merecen comparativa)
  const themesForCompare = (data?.themes || [])
    .filter((t) => t.n_sources >= 3 && t.member_evidence && t.member_evidence.length >= 3)
    .slice(0, 5)  // top 5 temas más relevantes
    .sort((a, b) => {
      const rw: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
      return (rw[b.relevance] || 0) - (rw[a.relevance] || 0)
    })

  return (
    <section style={{
      background: '#020617',
      border: '1px solid #1e293b',
      borderLeft: '4px solid #8b5cf6',
      borderRadius: 12,
      padding: 18,
      color: '#f1f5f9',
    }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#c4b5fd', textTransform: 'uppercase' }}>
          ▦ El mismo tema contado por N voces · framing comparativo
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          Cada fila es un tema agrupado por IA. Cada celda es cómo lo contó una fuente distinta.
          Compara titulares al instante para detectar líneas coordinadas o desalineamientos cross-país.
          Color de cada celda: <span style={{ background: '#7f1d1d', color: '#fee2e2', padding: '0 4px', borderRadius: 2 }}>autoritario</span> ·
          <span style={{ background: '#78350f', color: '#fde68a', padding: '0 4px', borderRadius: 2, marginLeft: 4 }}>híbrido</span> ·
          <span style={{ background: '#064e3b', color: '#a7f3d0', padding: '0 4px', borderRadius: 2, marginLeft: 4 }}>libre</span>
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando temas IA…</p>}

      {!loading && themesForCompare.length === 0 && (
        <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          Sin temas con ≥3 voces distintas todavía. Espera al siguiente run de Theme Clusters (Gemini).
        </p>
      )}

      {themesForCompare.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {themesForCompare.map((theme, ti) => (
            <article key={ti} style={{
              background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                  background: RELEVANCE_COLOR[theme.relevance] || '#94a3b8', color: '#fff',
                  letterSpacing: 0.5,
                }}>{theme.relevance}</span>
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{theme.name}</h4>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                  {theme.n_sources} voces · {theme.n_members} items
                </span>
                {theme.authoritarian_flag && (
                  <span title={`${Math.round((theme.authoritarian_source_share || 0) * 100)}% de las evidencias provienen de fuentes régimen autoritario`} style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                    background: '#1f2937', color: '#fee2e2', border: '1px solid #991b1b',
                    letterSpacing: 0.4, textTransform: 'uppercase',
                  }}>▲ {Math.round((theme.authoritarian_source_share || 0) * 100)}% autoritario</span>
                )}
              </div>

              {/* Grid horizontal · una celda por voz */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`,
                gap: 8,
              }}>
                {theme.member_evidence.slice(0, 8).map((m, mi) => {
                  const regime = m.media_bias?.regime || 'unknown'
                  const bg = REGIME_BG[regime]
                  const fg = REGIME_FG[regime]
                  return (
                    <a
                      key={mi}
                      href={m.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: bg, color: fg,
                        padding: '8px 10px', borderRadius: 4, textDecoration: 'none',
                        border: regime === 'authoritarian' ? '1px solid #991b1b' : '1px solid transparent',
                        display: 'flex', flexDirection: 'column', gap: 4,
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, fontWeight: 700, letterSpacing: 0.4, opacity: 0.9 }}>
                        <span style={{ textTransform: 'uppercase' }}>{m.source}</span>
                        {m.media_bias && (
                          <span title={`${m.media_bias.country} · ${m.media_bias.press_freedom} · bias ${m.media_bias.bias}`} style={{ textTransform: 'uppercase', opacity: 0.85 }}>
                            {m.media_bias.country.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, lineHeight: 1.4, fontWeight: 500 }}>
                        {m.title}
                      </div>
                      <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>
                        {fmtRel(m.date)}
                      </div>
                    </a>
                  )
                })}
              </div>
              {theme.member_evidence.length > 8 && (
                <p style={{ margin: '6px 0 0', fontSize: 9, color: '#64748b', fontStyle: 'italic' }}>
                  + {theme.member_evidence.length - 8} voces más · expandir en Theme Clusters
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', lineHeight: 1.5, borderTop: '1px solid #1e293b', paddingTop: 10 }}>
        ◆ Output IA · clustering Gemini Flash Lite · enriquecido con MBFC bias/freedom server-side.
        NO ES FUENTE FACTUAL · usar como brújula comparativa, no como veredicto. Inspirado en allsides.com cross-bias display.
      </p>
    </section>
  )
}

export default GeoSameEventFraming
