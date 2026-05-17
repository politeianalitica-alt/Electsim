'use client'

/**
 * /instituciones — Comunidades Autónomas y Municipios.
 *
 * 2 subpestañas:
 *   1. CCAA: 19 comunidades + ciudades autónomas. Búsqueda + perfil rico
 *      (Wikipedia + RSS news + iniciativas + sentimiento + preocupaciones).
 *   2. Municipios: 60+ ciudades clave (capitales + grandes municipios).
 *      Búsqueda + perfil con alcalde/partido + Wikipedia + noticias locales.
 *
 * Todo dinámico, sin contenido hardcodeado salvo metadata estable
 * (códigos INE, capitales, fundación, web oficial).
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

interface CCAA {
  slug: string; code: string; nombre: string; nombreCorto: string; capital: string
  provincias: string[]; poblacion: number; superficie: number; fundacion: number
  color: string; bandera: string; presidente: string; partidoGobierno: string
  parlamento: string; parlamentoUrl: string; gobiernoUrl: string
  boletin: string; boletinUrl: string; wikipedia: string
  pibMillones: number; sectoresClave: string[]; tokens: string[]
}

interface Municipio {
  ine: string; slug: string; nombre: string; ccaa: string; provincia: string; cpro: string
  poblacion: number; poblacionAño?: string; superficie?: number
  alcalde?: string | null; partidoAlcalde?: string | null; alcaldeDesde?: number | null
  webAyuntamiento?: string | null; wikipedia?: string
  tokens?: string[]
}

interface CCAAProfile {
  meta: CCAA
  bio: { extract: string; sourceUrl: string | null }
  noticias: Array<{ titulo: string; medio: string; fecha: string | null; url: string; sentiment: string; sentiment_score: number }>
  iniciativas: Array<{ titulo: string; expediente: string; materia: string; promotor: string; stage: string; fechaRegistro: string | null; url: string | null }>
  sentimientoAgregado: { positivo: number; negativo: number; neutral: number; score: number; tendencia: string }
  tagsCobertura: string[]
  preocupaciones: string[]
  metrics: { nNoticias7d: number; nIniciativas: number; pibMillonesEuros: number; densidadHabKm2: number }
  updatedAt: string
  error?: string
}

interface MunicipioProfile {
  meta: Municipio
  ccaaNombre: string
  ccaaColor: string
  bio: { extract: string; sourceUrl: string | null }
  noticias: Array<{ titulo: string; medio: string; fecha: string | null; url: string; sentiment: string; sentiment_score: number }>
  sentimientoAgregado: { positivo: number; negativo: number; neutral: number; score: number; tendencia: string }
  tagsCobertura: string[]
  preocupaciones: string[]
  metrics: { nNoticias7d: number; densidadHabKm2: number }
  updatedAt: string
  error?: string
}

const PARTY_COLOR: Record<string, string> = {
  'PP': '#1F4E8C', 'PSOE': '#E1322D', 'PSC': '#E1322D', 'PSC-PSOE': '#E1322D',
  'PSE': '#E1322D', 'PSN-PSOE': '#E1322D',
  'VOX': '#5BA02E', 'Sumar': '#D43F8D',
  'Junts': '#1FA89B', 'ERC': '#E8A030', 'CUP': '#FFCC00',
  'PNV': '#7DB94B', 'EH Bildu': '#3F7A3A',
  'BNG': '#5BB3D9', 'CC': '#F2C43A', 'Ciudadanos': '#FA5000',
  'Foro Asturias': '#9333EA', 'Democracia Ourensana': '#525258',
  'Tot per Terrassa': '#0F9B6C', 'IU': '#A02525',
}

type SubTab = 'ccaa' | 'municipios'

export default function InstitucionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [tab, setTab] = useState<SubTab>('ccaa')

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero */}
        <section style={{
          background: 'linear-gradient(135deg,#0F766E 0%,#054742 100%)',
          borderRadius: 22, padding: '28px 36px', marginBottom: 16, color: '#fff',
        }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.78, margin: '0 0 6px', textTransform: 'uppercase' }}>
            INSTITUCIONES LOCALES Y REGIONALES · INTELIGENCIA TERRITORIAL
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1 }}>
            Radar de las 17 CCAA + 2 ciudades autónomas + municipios clave
          </h1>
          <p style={{ fontSize: 13, opacity: 0.85, margin: 0, lineHeight: 1.5 }}>
            Para consultores políticos, candidatos, prensa y corporativos del IBEX. Bio Wikipedia + 50 medios RSS +
            iniciativas autonómicas + sentimiento mediático + preocupaciones detectadas + tags clave de cobertura.
          </p>
        </section>

        {/* Subnav */}
        <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ECECEF', marginBottom: 16 }}>
          {([
            { id: 'ccaa', label: 'Comunidades Autónomas', glyph: '◉' },
            { id: 'municipios', label: 'Municipios y ciudades', glyph: '⊞' },
          ] as Array<{ id: SubTab; label: string; glyph: string }>).map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: 'transparent',
                color: active ? '#0F766E' : '#6e6e73',
                border: 0,
                borderBottom: active ? '2px solid #0F766E' : '2px solid transparent',
                padding: '10px 16px', fontSize: 13,
                fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: -1,
              }}>
                <span style={{ fontSize: 14, color: active ? '#0F766E' : '#9ca3af' }}>{t.glyph}</span>
                {t.label}
              </button>
            )
          })}
        </nav>

        {tab === 'ccaa' && <CCAATab/>}
        {tab === 'municipios' && <MunicipiosTab/>}
      </main>
    </div>
  )
}

// ─── Tab CCAA ──────────────────────────────────────────────────────────────

function CCAATab() {
  const [list, setList] = useState<CCAA[]>([])
  const [selected, setSelected] = useState<string>('madrid')
  const [profile, setProfile] = useState<CCAAProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/ccaa/list').then(r => r.json()).then(d => setList(d.items || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    setProfile(null)
    fetch(`/api/ccaa/profile/${selected}`)
      .then(r => r.json())
      .then(setProfile)
      .catch(e => setProfile({ error: String(e) } as CCAAProfile))
      .finally(() => setLoading(false))
  }, [selected])

  const filtered = q
    ? list.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase()) || c.capital.toLowerCase().includes(q.toLowerCase()))
    : list

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <input
          type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar comunidad o capital…"
          style={{
            width: '100%', padding: '10px 14px', fontSize: 13, borderRadius: 10,
            border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {filtered.map(c => {
          const active = selected === c.slug
          return (
            <button key={c.slug} onClick={() => setSelected(c.slug)} style={{
              background: active ? c.color : '#fff', color: active ? '#fff' : '#3a3a3d',
              border: '1px solid ' + (active ? c.color : '#ECECEF'),
              borderRadius: 999, padding: '6px 12px',
              fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {c.nombreCorto} <span style={{ opacity: 0.7, marginLeft: 4 }}>{c.poblacion}k hab.</span>
            </button>
          )
        })}
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', background: '#fff', borderRadius: 14, border: '1px solid #ECECEF' }}>
          Cargando perfil · Wikipedia + 50 medios RSS + Open Data legislativo…
        </div>
      )}

      {profile && profile.meta && <CCAAProfileView profile={profile}/>}
    </div>
  )
}

function CCAAProfileView({ profile }: { profile: CCAAProfile }) {
  const c = profile.meta
  return (
    <>
      <section style={{
        background: `linear-gradient(135deg,${c.color}EE,${c.color}99)`,
        borderRadius: 16, padding: '24px 30px', marginBottom: 16, color: '#fff',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.85, margin: '0 0 6px', textTransform: 'uppercase' }}>
              {c.partidoGobierno} · {c.presidente}
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.022em', margin: '0 0 6px' }}>
              {c.nombre}
            </h2>
            <p style={{ fontSize: 12, opacity: 0.85, margin: 0 }}>
              Capital {c.capital} · {c.provincias.length} provincia(s) · fundación {c.fundacion}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
            <HeroKPI label="Población" value={`${profile.meta.poblacion}k`}/>
            <HeroKPI label="PIB" value={`${profile.metrics.pibMillonesEuros / 1000}B €`}/>
            <HeroKPI label="Densidad" value={`${profile.metrics.densidadHabKm2}/km²`}/>
            <HeroKPI label="Iniciativas" value={profile.metrics.nIniciativas}/>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {profile.bio.extract && (
            <Card titulo="HISTORIA · WIKIPEDIA" color="#525258">
              <p style={{ margin: 0, fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.55 }}>{profile.bio.extract}</p>
              {profile.bio.sourceUrl && (
                <a href={profile.bio.sourceUrl} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: 11, color: c.color, textDecoration: 'none', marginTop: 6, display: 'inline-block', fontWeight: 600,
                }}>Wikipedia completa ↗</a>
              )}
            </Card>
          )}

          {profile.iniciativas.length > 0 && (
            <Card titulo={`INICIATIVAS DEL PARLAMENTO · ${profile.iniciativas.length}`} color="#5B21B6">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 360, overflowY: 'auto' }}>
                {profile.iniciativas.map((it, i) => (
                  <a key={i} href={it.url || '#'} target="_blank" rel="noopener noreferrer" style={{
                    padding: '7px 10px', borderRadius: 7, background: '#FAFAFB',
                    border: '1px solid #ECECEF', borderLeft: `3px solid ${c.color}`,
                    textDecoration: 'none', color: '#1d1d1f',
                  }}>
                    <div style={{ display: 'flex', gap: 6, fontSize: 9.5, color: '#6e6e73', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, color: c.color }}>{it.promotor}</span>
                      <span>· {it.materia}</span>
                      {it.fechaRegistro && <span>· {it.fechaRegistro.slice(0, 10)}</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, lineHeight: 1.35 }}>{it.titulo.slice(0, 180)}</p>
                  </a>
                ))}
              </div>
            </Card>
          )}

          {profile.noticias.length > 0 && (
            <Card titulo={`NOTICIAS 7D · ${profile.noticias.length}`} color="#0F766E">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 480, overflowY: 'auto' }}>
                {profile.noticias.map((n, i) => {
                  const sc = n.sentiment === 'positive' ? '#16A34A' : n.sentiment === 'negative' ? '#DC2626' : '#94A3B8'
                  return (
                    <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{
                      padding: '6px 9px', borderRadius: 6, fontSize: 11,
                      background: '#FAFAFB', border: '1px solid #ECECEF', borderLeft: `3px solid ${sc}`,
                      textDecoration: 'none', color: '#1d1d1f',
                    }}>
                      <div style={{ display: 'flex', gap: 6, fontSize: 9.5, color: '#6e6e73', marginBottom: 2 }}>
                        <span style={{ color: sc, fontWeight: 700 }}>{n.medio}</span>
                        {n.fecha && <span>· {n.fecha.slice(0, 10)}</span>}
                      </div>
                      {n.titulo.slice(0, 130)}
                    </a>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card titulo="GOBIERNO Y INSTITUCIONES" color="#1F4E8C">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5 }}>
              <a href={c.gobiernoUrl} target="_blank" rel="noopener noreferrer" style={{ color: c.color, textDecoration: 'none', fontWeight: 600 }}>🏛 Gobierno {c.nombreCorto} ↗</a>
              <a href={c.parlamentoUrl} target="_blank" rel="noopener noreferrer" style={{ color: c.color, textDecoration: 'none', fontWeight: 600 }}>⚖ {c.parlamento} ↗</a>
              <a href={c.boletinUrl} target="_blank" rel="noopener noreferrer" style={{ color: c.color, textDecoration: 'none', fontWeight: 600 }}>📋 Boletín {c.boletin} ↗</a>
            </div>
          </Card>

          <Card titulo="SENTIMIENTO MEDIÁTICO" color="#6e6e73">
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, height: 10, borderRadius: 5, overflow: 'hidden', background: '#F5F5F7' }}>
              {profile.sentimientoAgregado.positivo > 0 && <div style={{ flex: profile.sentimientoAgregado.positivo, background: '#16A34A' }}/>}
              {profile.sentimientoAgregado.neutral > 0 && <div style={{ flex: profile.sentimientoAgregado.neutral, background: '#94A3B8' }}/>}
              {profile.sentimientoAgregado.negativo > 0 && <div style={{ flex: profile.sentimientoAgregado.negativo, background: '#DC2626' }}/>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#16A34A', fontWeight: 700 }}>+{profile.sentimientoAgregado.positivo}</span>
              <span style={{ color: '#94A3B8' }}>={profile.sentimientoAgregado.neutral}</span>
              <span style={{ color: '#DC2626', fontWeight: 700 }}>−{profile.sentimientoAgregado.negativo}</span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#1d1d1f', textAlign: 'center' }}>
              Score <strong style={{ color: c.color, fontSize: 16 }}>{profile.sentimientoAgregado.score > 0 ? '+' : ''}{profile.sentimientoAgregado.score}</strong>
              {' · '}
              <strong>{profile.sentimientoAgregado.tendencia === 'up' ? '↑ mejora' : profile.sentimientoAgregado.tendencia === 'down' ? '↓ empeora' : '→ estable'}</strong>
            </p>
          </Card>

          {profile.preocupaciones.length > 0 && (
            <Card titulo={`PREOCUPACIONES DETECTADAS · ${profile.preocupaciones.length}`} color="#DC2626">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {profile.preocupaciones.map(p => (
                  <div key={p} style={{ padding: '5px 9px', fontSize: 11, color: '#1d1d1f', background: 'rgba(220,38,38,0.06)', borderRadius: 6, borderLeft: '2px solid #DC2626' }}>
                    {p}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {profile.tagsCobertura.length > 0 && (
            <Card titulo="TEMAS EN COBERTURA" color={c.color}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {profile.tagsCobertura.map(t => (
                  <span key={t} style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, background: `${c.color}15`, color: c.color, fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </Card>
          )}

          <Card titulo="ECONOMÍA Y SECTORES" color="#0F766E">
            <p style={{ margin: '0 0 8px', fontSize: 11.5, color: '#1d1d1f' }}>
              PIB anual: <strong>{c.pibMillones.toLocaleString('es-ES')} M€</strong>
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {c.sectoresClave.map(s => (
                <span key={s} style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, background: '#FAFAFB', border: '1px solid #ECECEF', color: '#1d1d1f' }}>{s}</span>
              ))}
            </div>
          </Card>

          <Card titulo="PROVINCIAS" color="#525258">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {c.provincias.map(p => (
                <span key={p} style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, background: '#FAFAFB', border: '1px solid #ECECEF', color: '#1d1d1f' }}>{p}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

// ─── Tab MUNICIPIOS ────────────────────────────────────────────────────────

function MunicipiosTab() {
  const [list, setList] = useState<Municipio[]>([])
  const [grandTotal, setGrandTotal] = useState(0)
  const [selected, setSelected] = useState<string>('madrid')
  const [profile, setProfile] = useState<MunicipioProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [ccaaFilter, setCcaaFilter] = useState<string>('')
  const [ccaaList, setCcaaList] = useState<CCAA[]>([])

  useEffect(() => {
    fetch('/api/ccaa/list').then(r => r.json()).then(d => setCcaaList(d.items || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    setProfile(null)
    fetch(`/api/municipios/profile/${selected}`)
      .then(r => r.json())
      .then(setProfile)
      .catch(e => setProfile({ error: String(e) } as MunicipioProfile))
      .finally(() => setLoading(false))
  }, [selected])

  // Búsqueda incremental (debounce ligero)
  useEffect(() => {
    const tm = setTimeout(() => {
      const params = new URLSearchParams({ limit: '300' })
      if (q) params.set('q', q)
      if (ccaaFilter) params.set('ccaa', ccaaFilter)
      fetch(`/api/municipios/list?${params}`)
        .then(r => r.json())
        .then(d => {
          setList(d.items || [])
          if (d.grandTotal) setGrandTotal(d.grandTotal)
        })
        .catch(() => {})
    }, 200)
    return () => clearTimeout(tm)
  }, [q, ccaaFilter])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
      <aside style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: 14, maxHeight: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
        <input
          type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar entre 8.132 municipios…"
          style={{
            padding: '8px 12px', fontSize: 12, borderRadius: 8,
            border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit', marginBottom: 8,
          }}
          autoFocus
        />
        <select value={ccaaFilter} onChange={e => setCcaaFilter(e.target.value)} style={{
          padding: '7px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #ECECEF',
          background: '#fff', fontFamily: 'inherit', marginBottom: 8,
        }}>
          <option value="">Todas las CCAA</option>
          {ccaaList.map(c => <option key={c.slug} value={c.slug}>{c.nombreCorto}</option>)}
        </select>
        <p style={{ fontSize: 10, color: '#6e6e73', margin: '0 0 8px' }}>
          {grandTotal > 0 && `${grandTotal.toLocaleString('es-ES')} municipios en España · `}
          mostrando {list.length} (filtrar/buscar para más)
        </p>
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {list.map(m => {
            const active = selected === m.slug
            const partidoColor = m.partidoAlcalde ? (PARTY_COLOR[m.partidoAlcalde] || '#525258') : '#0F766E'
            return (
              <button key={m.slug + m.ine} onClick={() => setSelected(m.slug)} style={{
                textAlign: 'left', padding: '7px 10px', borderRadius: 7,
                background: active ? `${partidoColor}10` : '#fff',
                border: '1px solid ' + (active ? partidoColor : '#F0F0F3'),
                borderLeft: `3px solid ${partidoColor}`,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <strong style={{ fontSize: 11.5, color: '#1d1d1f' }}>{m.nombre}</strong>
                  <span style={{ marginLeft: 'auto', fontSize: 9.5, color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>
                    {m.poblacion > 1000000 ? `${(m.poblacion / 1000000).toFixed(1)}M`
                     : m.poblacion > 1000 ? `${(m.poblacion / 1000).toFixed(0)}k`
                     : m.poblacion}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#6e6e73' }}>
                  {m.provincia}{m.alcalde && ` · ${m.alcalde}`}
                </p>
                {m.partidoAlcalde && (
                  <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${partidoColor}15`, color: partidoColor, letterSpacing: '0.04em', marginTop: 2, display: 'inline-block' }}>
                    {m.partidoAlcalde.toUpperCase()}
                  </span>
                )}
              </button>
            )
          })}
          {list.length === 0 && q && (
            <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: 20 }}>
              Sin coincidencias para "{q}"
            </p>
          )}
        </div>
      </aside>

      <section>
        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', background: '#fff', borderRadius: 14, border: '1px solid #ECECEF' }}>
            Cargando perfil municipal · Wikipedia + 50 medios RSS…
          </div>
        )}
        {profile && profile.meta && <MunicipioProfileView profile={profile}/>}
      </section>
    </div>
  )
}

function MunicipioProfileView({ profile }: { profile: MunicipioProfile }) {
  const m = profile.meta
  const partidoColor = m.partidoAlcalde ? (PARTY_COLOR[m.partidoAlcalde] || '#525258') : profile.ccaaColor

  return (
    <>
      <section style={{
        background: `linear-gradient(135deg,${partidoColor}EE,${partidoColor}99)`,
        borderRadius: 16, padding: '24px 30px', marginBottom: 14, color: '#fff',
        display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'center',
      }}>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.85, margin: '0 0 6px', textTransform: 'uppercase' }}>
            {profile.ccaaNombre} · {m.provincia} · INE {m.ine}
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.022em', margin: '0 0 6px' }}>
            {m.nombre}
          </h2>
          {m.alcalde && (
            <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>
              <strong>{m.alcalde}</strong> ({m.partidoAlcalde}) · alcalde desde {m.alcaldeDesde}
            </p>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
          <HeroKPI label="Población" value={m.poblacion.toLocaleString('es-ES')}/>
          <HeroKPI label="Superficie" value={`${m.superficie} km²`}/>
          <HeroKPI label="Densidad" value={`${profile.metrics.densidadHabKm2}/km²`}/>
          <HeroKPI label="Noticias 7d" value={profile.metrics.nNoticias7d}/>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {profile.bio.extract && (
            <Card titulo="WIKIPEDIA" color="#525258">
              <p style={{ margin: 0, fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.55 }}>{profile.bio.extract}</p>
              {profile.bio.sourceUrl && (
                <a href={profile.bio.sourceUrl} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: 11, color: partidoColor, textDecoration: 'none', marginTop: 6, display: 'inline-block', fontWeight: 600,
                }}>Wikipedia completa ↗</a>
              )}
            </Card>
          )}

          {profile.noticias.length > 0 && (
            <Card titulo={`NOTICIAS LOCALES · ${profile.noticias.length}`} color="#0F766E">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 480, overflowY: 'auto' }}>
                {profile.noticias.map((n, i) => {
                  const sc = n.sentiment === 'positive' ? '#16A34A' : n.sentiment === 'negative' ? '#DC2626' : '#94A3B8'
                  return (
                    <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{
                      padding: '6px 9px', borderRadius: 6, fontSize: 11,
                      background: '#FAFAFB', border: '1px solid #ECECEF', borderLeft: `3px solid ${sc}`,
                      textDecoration: 'none', color: '#1d1d1f',
                    }}>
                      <div style={{ display: 'flex', gap: 6, fontSize: 9.5, color: '#6e6e73', marginBottom: 2 }}>
                        <span style={{ color: sc, fontWeight: 700 }}>{n.medio}</span>
                        {n.fecha && <span>· {n.fecha.slice(0, 10)}</span>}
                      </div>
                      {n.titulo.slice(0, 140)}
                    </a>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card titulo="WEBS OFICIALES" color={partidoColor}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5 }}>
              {m.webAyuntamiento && (
                <a href={m.webAyuntamiento} target="_blank" rel="noopener noreferrer" style={{ color: partidoColor, textDecoration: 'none', fontWeight: 600 }}>🏛 Ayuntamiento ↗</a>
              )}
              <a href={m.wikipedia} target="_blank" rel="noopener noreferrer" style={{ color: partidoColor, textDecoration: 'none', fontWeight: 600 }}>📖 Wikipedia ↗</a>
            </div>
          </Card>

          {profile.noticias.length > 0 && (
            <Card titulo="SENTIMIENTO LOCAL" color="#6e6e73">
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, height: 10, borderRadius: 5, overflow: 'hidden', background: '#F5F5F7' }}>
                {profile.sentimientoAgregado.positivo > 0 && <div style={{ flex: profile.sentimientoAgregado.positivo, background: '#16A34A' }}/>}
                {profile.sentimientoAgregado.neutral > 0 && <div style={{ flex: profile.sentimientoAgregado.neutral, background: '#94A3B8' }}/>}
                {profile.sentimientoAgregado.negativo > 0 && <div style={{ flex: profile.sentimientoAgregado.negativo, background: '#DC2626' }}/>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#16A34A', fontWeight: 700 }}>+{profile.sentimientoAgregado.positivo}</span>
                <span style={{ color: '#94A3B8' }}>={profile.sentimientoAgregado.neutral}</span>
                <span style={{ color: '#DC2626', fontWeight: 700 }}>−{profile.sentimientoAgregado.negativo}</span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 11, textAlign: 'center', color: '#1d1d1f' }}>
                Score <strong style={{ color: partidoColor }}>{profile.sentimientoAgregado.score > 0 ? '+' : ''}{profile.sentimientoAgregado.score}</strong>
                {' · '}
                <strong>{profile.sentimientoAgregado.tendencia === 'up' ? '↑' : profile.sentimientoAgregado.tendencia === 'down' ? '↓' : '→'}</strong>
              </p>
            </Card>
          )}

          {profile.preocupaciones.length > 0 && (
            <Card titulo={`PREOCUPACIONES DETECTADAS · ${profile.preocupaciones.length}`} color="#DC2626">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {profile.preocupaciones.map(p => (
                  <div key={p} style={{ padding: '5px 9px', fontSize: 11, color: '#1d1d1f', background: 'rgba(220,38,38,0.06)', borderRadius: 6, borderLeft: '2px solid #DC2626' }}>
                    {p}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {profile.tagsCobertura.length > 0 && (
            <Card titulo="TEMAS EN COBERTURA" color={partidoColor}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {profile.tagsCobertura.map(t => (
                  <span key={t} style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, background: `${partidoColor}15`, color: partidoColor, fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function HeroKPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}>
      <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.72, letterSpacing: '0.10em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, lineHeight: 1, marginTop: 3 }}>{value}</div>
    </div>
  )
}

function Card({ titulo, color, children }: { titulo: string; color: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '14px 18px' }}>
      <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color, textTransform: 'uppercase', margin: '0 0 10px' }}>{titulo}</p>
      {children}
    </section>
  )
}
