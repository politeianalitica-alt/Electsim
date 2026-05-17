'use client'

/**
 * /partidos — Dossier en vivo de partidos políticos españoles.
 *
 * Sin datos hardcodeados de "fortalezas/debilidades". Todo derivado:
 *   - Bio Wikipedia REST API
 *   - Iniciativas legislativas que promueve (Congreso + Senado dataset)
 *   - Noticias 7d con sentimiento (50 medios RSS)
 *   - Líderes del catálogo de figuras
 *   - Tags clave de cobertura mediática
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import FigureDossierModal from '@/components/FigureDossierModal'

interface PartyMeta {
  slug: string; siglas: string; nombre: string; color: string
  familia: string; ambito: string; fundacion: number
  ideologia: number; centralizacion: number
  web: string; twitter: string; wikipedia: string; grupoUE: string
  tokens: string[]; liderazgos: string[]
}

interface PartyProfile {
  meta: PartyMeta
  bio: { extract: string; source: string | null; sourceUrl: string | null }
  noticias: Array<{ titulo: string; medio: string; fecha: string | null; url: string; sentiment: string; sentiment_score: number }>
  iniciativas: Array<{ titulo: string; expediente: string; ambito: string; materia: string; fechaRegistro: string | null; stage: string; url: string | null }>
  lideres: Array<{ id: string; nombre: string; cargo: string; organizacion: string; influencia: number }>
  sentimientoAgregado: { positivo: number; negativo: number; neutral: number; score: number; tendencia: string }
  tagsCobertura: string[]
  metrics: { nIniciativas: number; nNoticias7d: number; nLideres: number }
  updatedAt: string
}

export default function PartidosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [parties, setParties] = useState<PartyMeta[]>([])
  const [selected, setSelected] = useState<string>('psoe')
  const [profile, setProfile] = useState<PartyProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [dossierByName, setDossierByName] = useState<{ name: string; cargo?: string; afiliacion?: string; color?: string } | null>(null)

  // Cargar catálogo de partidos
  useEffect(() => {
    fetch('/api/parties/list')
      .then(r => r.json())
      .then(d => setParties(d.items || []))
      .catch(() => {/* noop */})
  }, [])

  // Cargar perfil al cambiar selección
  useEffect(() => {
    if (!selected) return
    setLoading(true)
    setProfile(null)
    fetch(`/api/parties/profile/${selected}`)
      .then(r => r.json())
      .then(setProfile)
      .catch(e => setProfile({ meta: {} as PartyMeta, bio: { extract: String(e), source: null, sourceUrl: null } } as PartyProfile))
      .finally(() => setLoading(false))
  }, [selected])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero */}
        <section style={{
          background: profile?.meta.color
            ? `linear-gradient(135deg,${profile.meta.color}EE,${profile.meta.color}99)`
            : 'linear-gradient(135deg,#1F4E8C,#0B2447)',
          borderRadius: 22, padding: '28px 36px', marginBottom: 16, color: '#fff',
          transition: 'background 200ms',
        }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.78, margin: '0 0 6px', textTransform: 'uppercase' }}>
            DOSSIER DE PARTIDOS · {parties.length} catalogados · datos en vivo
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1 }}>
            {profile?.meta.nombre || 'Cargando…'}
          </h1>
          <p style={{ fontSize: 13, opacity: 0.85, margin: 0, lineHeight: 1.5 }}>
            {profile?.meta.familia} · {profile?.meta.ambito} · fundado {profile?.meta.fundacion} · {profile?.meta.grupoUE}
          </p>
          {profile?.metrics && (
            <div style={{ marginTop: 16, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <KPIBar label="Iniciativas" value={profile.metrics.nIniciativas}/>
              <KPIBar label="Noticias 7d" value={profile.metrics.nNoticias7d}/>
              <KPIBar label="Líderes" value={profile.metrics.nLideres}/>
              <KPIBar label="Score" value={profile.sentimientoAgregado.score} prefix={profile.sentimientoAgregado.score > 0 ? '+' : ''} suffix={profile.sentimientoAgregado.tendencia === 'up' ? ' ↑' : profile.sentimientoAgregado.tendencia === 'down' ? ' ↓' : ' →'}/>
            </div>
          )}
        </section>

        {/* Selector pills de partidos */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {parties.map(p => {
            const active = selected === p.slug
            return (
              <button key={p.slug} onClick={() => setSelected(p.slug)} style={{
                background: active ? p.color : '#fff',
                color: active ? '#fff' : '#3a3a3d',
                border: '1px solid ' + (active ? p.color : '#ECECEF'),
                borderRadius: 999, padding: '6px 14px',
                fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>{p.siglas}</button>
            )
          })}
        </div>

        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', background: '#fff', borderRadius: 14, border: '1px solid #ECECEF' }}>
            Cargando perfil del partido · Wikipedia + 50 medios RSS + Open Data Congreso/Senado…
          </div>
        )}

        {profile && profile.meta?.slug && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
            {/* Columna izquierda · bio + iniciativas + noticias */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Bio */}
              {profile.bio.extract && (
                <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
                  <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 8px' }}>
                    HISTORIA · WIKIPEDIA
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#1d1d1f', lineHeight: 1.55 }}>{profile.bio.extract}</p>
                  {profile.bio.sourceUrl && (
                    <a href={profile.bio.sourceUrl} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: 11, color: profile.meta.color, textDecoration: 'none', marginTop: 6, display: 'inline-block', fontWeight: 600,
                    }}>Ver Wikipedia completa ↗</a>
                  )}
                </section>
              )}

              {/* Iniciativas que promueve */}
              {profile.iniciativas.length > 0 && (
                <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
                  <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#5B21B6', textTransform: 'uppercase', margin: '0 0 10px' }}>
                    INICIATIVAS QUE PROMUEVE · {profile.iniciativas.length}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
                    {profile.iniciativas.map((it, i) => (
                      <a key={i} href={it.url || '#'} target="_blank" rel="noopener noreferrer" style={{
                        padding: '8px 10px', borderRadius: 8, background: '#FAFAFB',
                        border: '1px solid #ECECEF', borderLeft: `3px solid ${profile.meta.color}`,
                        textDecoration: 'none', color: '#1d1d1f', display: 'block',
                      }}>
                        <div style={{ display: 'flex', gap: 6, fontSize: 9.5, color: '#6e6e73', marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, color: profile.meta.color }}>{it.expediente}</span>
                          <span>· {it.materia}</span>
                          <span>· {it.ambito.replace('nacional-', '')}</span>
                          {it.fechaRegistro && <span>· {it.fechaRegistro.slice(0, 10)}</span>}
                        </div>
                        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.4 }}>{it.titulo}</p>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Noticias 7d */}
              {profile.noticias.length > 0 && (
                <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
                  <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#0F766E', textTransform: 'uppercase', margin: '0 0 10px' }}>
                    NOTICIAS 7 DÍAS · {profile.noticias.length} medios
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 480, overflowY: 'auto' }}>
                    {profile.noticias.slice(0, 25).map((n, i) => {
                      const sc = n.sentiment === 'positive' ? '#16A34A' : n.sentiment === 'negative' ? '#DC2626' : '#94A3B8'
                      return (
                        <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{
                          padding: '7px 10px', borderRadius: 7, fontSize: 11.5,
                          background: '#FAFAFB', border: '1px solid #ECECEF', borderLeft: `3px solid ${sc}`,
                          color: '#1d1d1f', textDecoration: 'none', display: 'block',
                        }}>
                          <div style={{ display: 'flex', gap: 6, fontSize: 10, color: '#6e6e73', marginBottom: 2 }}>
                            <span style={{ color: sc, fontWeight: 700 }}>{n.medio}</span>
                            {n.fecha && <span>· {n.fecha.slice(0, 10)}</span>}
                          </div>
                          {n.titulo}
                        </a>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* Columna derecha · sentimiento + tags + lideres */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Sentimiento */}
              <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 8px' }}>
                  SENTIMIENTO MEDIÁTICO
                </p>
                <div style={{ display: 'flex', gap: 4, marginBottom: 10, height: 10, borderRadius: 5, overflow: 'hidden', background: '#F5F5F7' }}>
                  {profile.sentimientoAgregado.positivo > 0 && <div style={{ flex: profile.sentimientoAgregado.positivo, background: '#16A34A' }}/>}
                  {profile.sentimientoAgregado.neutral > 0 && <div style={{ flex: profile.sentimientoAgregado.neutral, background: '#94A3B8' }}/>}
                  {profile.sentimientoAgregado.negativo > 0 && <div style={{ flex: profile.sentimientoAgregado.negativo, background: '#DC2626' }}/>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#16A34A', fontWeight: 700 }}>+{profile.sentimientoAgregado.positivo} positivas</span>
                  <span style={{ color: '#94A3B8', fontWeight: 700 }}>={profile.sentimientoAgregado.neutral}</span>
                  <span style={{ color: '#DC2626', fontWeight: 700 }}>−{profile.sentimientoAgregado.negativo}</span>
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 12, color: '#1d1d1f', textAlign: 'center' }}>
                  Score <strong style={{ color: profile.meta.color, fontSize: 20 }}>{profile.sentimientoAgregado.score > 0 ? '+' : ''}{profile.sentimientoAgregado.score}</strong>
                  {' · '}
                  Tendencia <strong>{profile.sentimientoAgregado.tendencia === 'up' ? '↑ mejora' : profile.sentimientoAgregado.tendencia === 'down' ? '↓ empeora' : '→ estable'}</strong>
                </p>
              </section>

              {/* Tags en cobertura */}
              {profile.tagsCobertura.length > 0 && (
                <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
                  <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 8px' }}>
                    TEMAS EN COBERTURA
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {profile.tagsCobertura.map(t => (
                      <span key={t} style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, background: `${profile.meta.color}15`, color: profile.meta.color, fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                </section>
              )}

              {/* Líderes */}
              {profile.lideres.length > 0 && (
                <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
                  <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#1F4E8C', textTransform: 'uppercase', margin: '0 0 10px' }}>
                    LÍDERES · {profile.lideres.length} (clic para dossier)
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {profile.lideres.map(l => (
                      <button key={l.id} onClick={() => setDossierByName({
                        name: l.nombre, cargo: l.cargo, afiliacion: profile.meta.siglas, color: profile.meta.color,
                      })} style={{
                        textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                        background: '#FAFAFB', border: '1px solid #ECECEF', borderLeft: `3px solid ${profile.meta.color}`,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                          <strong style={{ fontSize: 12, color: '#1d1d1f' }}>{l.nombre}</strong>
                          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: profile.meta.color }}>Inf. {l.influencia}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 10.5, color: '#6e6e73' }}>{l.cargo}</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Enlaces oficiales */}
              <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '14px 18px' }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 8px' }}>
                  CANALES OFICIALES
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5 }}>
                  <a href={profile.meta.web} target="_blank" rel="noopener noreferrer" style={{ color: profile.meta.color, textDecoration: 'none', fontWeight: 600 }}>🌐 {profile.meta.web} ↗</a>
                  {profile.meta.twitter && (
                    <a href={`https://x.com/${profile.meta.twitter}`} target="_blank" rel="noopener noreferrer" style={{ color: profile.meta.color, textDecoration: 'none', fontWeight: 600 }}>𝕏 @{profile.meta.twitter} ↗</a>
                  )}
                </div>
              </section>

              <p style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', margin: 0 }}>
                Perfil actualizado · {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString('es-ES') : ''}
              </p>
            </div>
          </div>
        )}
      </main>

      <FigureDossierModal
        figureId={null}
        byName={dossierByName}
        onClose={() => setDossierByName(null)}
      />
    </div>
  )
}

function KPIBar({ label, value, prefix, suffix }: { label: string; value: number | string; prefix?: string; suffix?: string }) {
  return (
    <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', opacity: 0.72, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1, marginTop: 2 }}>
        {prefix}{value}{suffix}
      </div>
    </div>
  )
}
