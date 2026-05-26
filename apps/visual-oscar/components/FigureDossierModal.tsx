'use client'

/**
 * <FigureDossierModal> — Modal con dossier rico de una figura pública.
 *
 * Llama a /api/figures/dossier/[id] y muestra:
 *   - Cabecera con foto + cargo + organización + score influencia + tendencia
 *   - Bio Wikipedia
 *   - Sentimiento agregado (positivo/negativo) con tendencia
 *   - Tags clave de cobertura
 *   - Comisiones a las que pertenece (políticos)
 *   - Intervenciones parlamentarias
 *   - Noticias recientes (con sentimiento por noticia)
 *   - Conexiones con otras figuras (clic para abrir su dossier)
 */

import { useState, useEffect } from 'react'
import EntityBacklinks from './EntityBacklinks'
import { slugify } from '@/lib/ontology/slugify'
// Sprint G14 cierre · panel OSINT externo · audit obligatorio
import { DossierOSINTPanel } from './dossier/DossierOSINTPanel'

interface DossierData {
  figure: {
    id: string
    nombre: string
    category: string
    cargo: string
    organizacion: string
    afiliacion: string | null
    color: string
    influencia: number
    twitter?: string | null
    wikipedia?: string | null
    tags: string[]
  }
  bio: { extract: string; source: string | null; sourceUrl: string | null }
  noticias: Array<{
    titulo: string; medio: string; fecha: string | null; url: string
    sentiment: string; sentiment_score: number; resumen: string
  }>
  intervenciones: Array<{ fecha: string; organo: string; fase: string }>
  votos: Array<{ fecha: string; iniciativa: string; voto: string; resultadoFinal: string }>
  comisiones: Array<{ codigo: string; nombre: string; cargo: string; camara: string }>
  conexiones: Array<{ figureId: string; nombre: string; relacion: string; intensidad: number; detalle?: string }>
  sentimientoAgregado: { positivo: number; negativo: number; neutral: number; score: number; tendencia: string }
  tagsCobertura: string[]
  updatedAt: string
  error?: string
}

interface Props {
  figureId: string | null
  /** Alternativa: lookup por nombre + hints. Si figureId está, gana */
  byName?: { name: string; cargo?: string; organizacion?: string; afiliacion?: string; category?: string; color?: string } | null
  onClose: () => void
  onSelectFigure?: (id: string) => void
}

const CAT_LABEL: Record<string, string> = {
  politico: 'Político', empresario: 'Empresario', mediatico: 'Mediático',
  periodista: 'Periodista', lobbista: 'Lobbista', consultor: 'Consultor',
  fondo: 'Fondo de inversión', institucional: 'Institucional',
  judicial: 'Judicial', sindical: 'Sindical', patronal: 'Patronal',
  academico: 'Académico',
}

const RELACION_LABEL: Record<string, { label: string; color: string }> = {
  'mismo-partido':   { label: 'Mismo partido',   color: '#1F4E8C' },
  'misma-comision':  { label: 'Misma comisión',  color: '#5B21B6' },
  'misma-empresa':   { label: 'Misma empresa',   color: '#0E7490' },
  'mismo-medio':     { label: 'Mismo medio',     color: '#525258' },
  'mismo-sector':    { label: 'Mismo sector',    color: '#0F766E' },
  'lobby':           { label: 'Lobby común',     color: '#7C3AED' },
  'familiar':        { label: 'Familiar',        color: '#DC2626' },
  'mentor':          { label: 'Mentor',          color: '#EAB308' },
  'rival':           { label: 'Rival',           color: '#DC2626' },
  'otro':            { label: 'Otro',            color: '#6E6E73' },
}

export default function FigureDossierModal({ figureId, byName, onClose, onSelectFigure }: Props) {
  const [data, setData] = useState<DossierData | null>(null)
  const [loading, setLoading] = useState(false)

  const active = !!(figureId || byName)
  const cacheKey = figureId || (byName ? `name:${byName.name}` : null)

  useEffect(() => {
    if (!active) { setData(null); return }
    setLoading(true)
    setData(null)
    let url: string
    if (figureId) {
      url = `/api/figures/dossier/${encodeURIComponent(figureId)}`
    } else if (byName) {
      const params = new URLSearchParams({ name: byName.name })
      if (byName.cargo) params.set('cargo', byName.cargo)
      if (byName.organizacion) params.set('organizacion', byName.organizacion)
      if (byName.afiliacion) params.set('afiliacion', byName.afiliacion)
      if (byName.category) params.set('category', byName.category)
      if (byName.color) params.set('color', byName.color)
      url = `/api/figures/dossier-by-name?${params}`
    } else { return }
    fetch(url)
      .then(r => r.json())
      .then(setData)
      .catch(e => setData({ figure: {} as DossierData['figure'], error: String(e) } as DossierData))
      .finally(() => setLoading(false))
  }, [active, cacheKey, figureId, byName])

  if (!active) return null

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(4px)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 20px', overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 18, maxWidth: 980, width: '100%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.30)', padding: 0, overflow: 'hidden',
        maxHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Cabecera */}
        <div style={{
          padding: '24px 32px', position: 'relative',
          background: data?.figure ? `linear-gradient(135deg,${data.figure.color}EE,${data.figure.color}AA)` : '#525258',
          color: '#fff',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 14, right: 16, background: 'rgba(255,255,255,0.20)',
            border: 'none', borderRadius: 999, padding: '6px 10px', color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>×</button>

          {loading ? (
            <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>Cargando dossier…</p>
          ) : data?.error ? (
            <p style={{ margin: 0, fontSize: 13 }}>Error: {data.error.slice(0, 200)}</p>
          ) : data ? (
            <>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', opacity: 0.78, margin: '0 0 6px', textTransform: 'uppercase' }}>
                {CAT_LABEL[data.figure.category] || data.figure.category}
                {data.figure.afiliacion && ` · ${data.figure.afiliacion}`}
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.022em', margin: '0 0 6px', lineHeight: 1.1 }}>
                {data.figure.nombre}
              </h2>
              <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>
                {data.figure.cargo} · {data.figure.organizacion}
              </p>
              <div style={{ marginTop: 14, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', opacity: 0.7, textTransform: 'uppercase' }}>INFLUENCIA</p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{data.figure.influencia}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', opacity: 0.7, textTransform: 'uppercase' }}>NOTICIAS 7D</p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{data.noticias.length}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', opacity: 0.7, textTransform: 'uppercase' }}>SENT. SCORE</p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                    {data.sentimientoAgregado.score > 0 ? '+' : ''}{data.sentimientoAgregado.score}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', opacity: 0.7, textTransform: 'uppercase' }}>TENDENCIA</p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                    {data.sentimientoAgregado.tendencia === 'up' ? '↑' : data.sentimientoAgregado.tendencia === 'down' ? '↓' : '→'}
                  </p>
                </div>
                {data.figure.twitter && (
                  <a href={`https://x.com/${data.figure.twitter}`} target="_blank" rel="noopener noreferrer" style={{
                    marginLeft: 'auto', padding: '6px 12px', background: 'rgba(255,255,255,0.20)',
                    color: '#fff', borderRadius: 8, fontSize: 11.5, fontWeight: 600, textDecoration: 'none',
                  }}>𝕏 @{data.figure.twitter}</a>
                )}
                {data.figure.wikipedia && (
                  <a href={data.figure.wikipedia} target="_blank" rel="noopener noreferrer" style={{
                    padding: '6px 12px', background: 'rgba(255,255,255,0.20)',
                    color: '#fff', borderRadius: 8, fontSize: 11.5, fontWeight: 600, textDecoration: 'none',
                  }}>Wikipedia ↗</a>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Cuerpo */}
        <div style={{ padding: '20px 32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {data && !data.error && (
            <>
              {/* Bio */}
              {data.bio.extract && (
                <section>
                  <p style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', color: '#6e6e73', textTransform: 'uppercase' }}>
                    BIOGRAFÍA · {data.bio.source}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#1d1d1f', lineHeight: 1.55 }}>{data.bio.extract}</p>
                  {data.bio.sourceUrl && (
                    <a href={data.bio.sourceUrl} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: 11, color: '#7C3AED', textDecoration: 'none', marginTop: 4, display: 'inline-block',
                    }}>Ver fuente completa ↗</a>
                  )}
                </section>
              )}

              {/* Tags de cobertura */}
              {data.tagsCobertura.length > 0 && (
                <section>
                  <p style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', color: '#6e6e73', textTransform: 'uppercase' }}>
                    TEMAS RECIENTES EN COBERTURA
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {data.tagsCobertura.map(t => (
                      <span key={t} style={{
                        padding: '3px 9px', borderRadius: 999, fontSize: 11,
                        background: 'rgba(124,58,237,0.10)', color: '#7C3AED', fontWeight: 600,
                      }}>{t}</span>
                    ))}
                  </div>
                </section>
              )}

              {/* Comisiones */}
              {data.comisiones.length > 0 && (
                <section>
                  <p style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', color: '#1F4E8C', textTransform: 'uppercase' }}>
                    COMISIONES PARLAMENTARIAS · {data.comisiones.length}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                    {data.comisiones.map((c, i) => (
                      <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: '#FAFAFB', border: '1px solid #ECECEF', borderLeft: '3px solid #1F4E8C' }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{c.nombre}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#6e6e73' }}>
                          {c.cargo} · cód. {c.codigo} · {c.camara}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Intervenciones */}
              {data.intervenciones.length > 0 && (
                <section>
                  <p style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', color: '#5B21B6', textTransform: 'uppercase' }}>
                    INTERVENCIONES PARLAMENTARIAS · {data.intervenciones.length}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {data.intervenciones.slice(0, 10).map((i, idx) => (
                      <div key={idx} style={{ padding: '6px 10px', borderRadius: 6, background: '#FAFAFB', border: '1px solid #ECECEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 11.5, color: '#1d1d1f' }}>{i.organo} · {i.fase}</span>
                        <span style={{ fontSize: 10.5, color: '#6e6e73' }}>{i.fecha}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Noticias */}
              <section>
                <p style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', color: '#0F766E', textTransform: 'uppercase' }}>
                  NOTICIAS RECIENTES · {data.noticias.length} (últimos 7 días)
                </p>
                {data.noticias.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 11.5, color: '#9ca3af', padding: 10 }}>
                    Sin noticias recientes detectadas en feeds RSS de 35 medios.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                    {data.noticias.slice(0, 15).map((n, i) => {
                      const sentColor = n.sentiment === 'positive' ? '#16A34A' : n.sentiment === 'negative' ? '#DC2626' : '#94A3B8'
                      return (
                        <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{
                          padding: '8px 10px', borderRadius: 8, background: '#FAFAFB',
                          border: '1px solid #ECECEF', borderLeft: `3px solid ${sentColor}`,
                          textDecoration: 'none', color: 'inherit', display: 'block',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: sentColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {n.sentiment === 'positive' ? '+' : n.sentiment === 'negative' ? '−' : '·'} {n.medio}
                            </span>
                            <span style={{ fontSize: 10, color: '#6e6e73' }}>{n.fecha ? n.fecha.slice(0, 10) : ''}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.35 }}>{n.titulo}</p>
                        </a>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Conexiones */}
              {data.conexiones.length > 0 && (
                <section>
                  <p style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', color: '#7C3AED', textTransform: 'uppercase' }}>
                    CONEXIONES · {data.conexiones.length}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {data.conexiones.slice(0, 12).map((c, i) => {
                      const rel = RELACION_LABEL[c.relacion] || { label: c.relacion, color: '#6E6E73' }
                      return (
                        <button key={i} onClick={() => onSelectFigure?.(c.figureId)} style={{
                          padding: '6px 10px', borderRadius: 6, background: '#FAFAFB',
                          border: '1px solid #ECECEF', borderLeft: `3px solid ${rel.color}`,
                          fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>{c.nombre}</span>
                          <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${rel.color}15`, color: rel.color, letterSpacing: '0.04em' }}>
                            {rel.label.toUpperCase()}
                          </span>
                          {c.detalle && <span style={{ fontSize: 10, color: '#6e6e73', fontStyle: 'italic' }}>{c.detalle.slice(0, 30)}</span>}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Backlinks · memoria institucional propia (Pilar 1+2) */}
              <EntityBacklinks
                kind="actor_person"
                slug={slugify(data.figure.nombre)}
                fallbackName={data.figure.nombre}
              />

              {/* Sprint G14 cierre · panel OSINT externo · audit log obligatorio */}
              <DossierOSINTPanel
                subject={{
                  full_name: data.figure.nombre,
                  cargo: data.figure.cargo,
                  partido: data.figure.afiliacion,
                  organizacion: data.figure.organizacion,
                  afiliacion: data.figure.afiliacion,
                  tipo: data.figure.category,
                  dossier_slug: data.figure.id,
                }}
              />

              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', textAlign: 'center', paddingTop: 8 }}>
                Dossier actualizado · {new Date(data.updatedAt).toLocaleString('es-ES')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
