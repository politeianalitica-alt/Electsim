'use client'

/**
 * /instituciones — Inteligencia territorial completa de las 19 CCAA + 8.132 municipios.
 *
 * Cada ficha incluye 8+ bloques de información dinámica:
 *   - HERO con foto del presidente/alcalde (Wikidata), KPIs en vivo
 *   - HISTORIA Wikipedia
 *   - GOBIERNO con foto + partido (Wikidata SPARQL)
 *   - RESUMEN IA + score estabilidad
 *   - NARRATIVAS dominantes (clustering ligero sobre noticias)
 *   - PREOCUPACIONES detectadas
 *   - DEMOGRAFÍA (INE: pirámide, renta media, extranjeros) — sólo municipios
 *   - INICIATIVAS legislativas (CCAA)
 *   - NOTICIAS RSS con sentiment
 *   - TAGS clave de cobertura
 *   - ECONOMÍA y sectores (CCAA)
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ─── Tipos ────────────────────────────────────────────────────────────────

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
  alcalde?: string | null; partidoAlcalde?: string | null
  webAyuntamiento?: string | null; wikipedia?: string
}

interface Gobernante {
  qid: string; nombre: string; partidoQid?: string; partidoNombre?: string; inicioCargo?: string
  cargoTipo: 'alcalde' | 'presidente'
}

interface Narrativa {
  nombre: string; fuerza: number; sentimiento: number; tono: string
  ejemplos: Array<{ titulo: string; medio: string; url: string }>
  tags: string[]
}

interface SentimientoAgregado {
  positivo: number; negativo: number; neutral: number
  score: number; tendencia: 'up' | 'down' | 'stable'
}

interface Estabilidad { score: number; banda: 'baja' | 'media' | 'alta'; razones: string[] }

interface ResultadoPartido { partido: string; pct: number; color: string }
interface ResultadoEleccion {
  tipo: 'generales' | 'autonomica'
  etiqueta: string; fecha: string
  resultados: ResultadoPartido[]
  ganador: ResultadoPartido
  fuente: string
  competitividad: number
}
interface EnlacesElectorales { consultaMir: string; wikipedia: string; junta: string; cpro: string }

interface EscañoPartido { partido: string; escaños: number; pct: number; color: string }
interface ComposicionParlamento {
  totalEscaños: number; fecha: string
  partidos: EscañoPartido[]
  mayoriaAbsoluta: number
  ganador: EscañoPartido
}

interface CCAAProfile {
  meta: CCAA
  bio: { extract: string; sourceUrl: string | null }
  presidente: Gobernante | null
  presidenteFoto: string | null
  noticias: Array<{ titulo: string; medio: string; fecha: string | null; url: string; sentiment: string; sentiment_score: number; descripcion: string }>
  iniciativas: Array<{ titulo: string; expediente: string; materia: string; promotor: string; stage: string; fechaRegistro: string | null; url: string | null }>
  sentimientoAgregado: SentimientoAgregado
  narrativas: Narrativa[]
  estabilidad: Estabilidad
  tagsCobertura: string[]
  preocupaciones: string[]
  resumenIA: string
  historicoElectoral: ResultadoEleccion[]
  parlamento: ComposicionParlamento | null
  metrics: { nNoticias7d: number; nIniciativas: number; pibMillonesEuros: number; densidadHabKm2: number }
  updatedAt: string
  error?: string
}

interface INEPiramide {
  hombres: Record<string, number>; mujeres: Record<string, number>
  totalHombres: number; totalMujeres: number
}
interface INERentaMedia { rentaMediaHogar: number | null; rentaMediaPersona: number | null; ginis: number | null; año: number | null }
interface INEExtranjeros { totalExtranjeros: number; porcentaje: number; topNacionalidades: Array<{ nacionalidad: string; total: number; porcentaje: number }> }

interface MunicipioProfile {
  meta: Municipio
  ccaaNombre: string; ccaaColor: string
  bio: { extract: string; sourceUrl: string | null }
  alcalde: Gobernante | null
  alcaldeFoto: string | null
  noticias: Array<{ titulo: string; medio: string; fecha: string | null; url: string; sentiment: string; sentiment_score: number; descripcion: string }>
  sentimientoAgregado: SentimientoAgregado
  narrativas: Narrativa[]
  estabilidad: Estabilidad
  tagsCobertura: string[]
  preocupaciones: string[]
  resumenIA: string
  enlacesElectorales: EnlacesElectorales
  piramide: INEPiramide | null
  rentaMedia: INERentaMedia | null
  extranjeros: INEExtranjeros | null
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
  'Foro Asturias': '#9333EA', 'IU': '#A02525',
}

const SENT_COLOR = (s: string) => s === 'positive' || s === 'positivo' ? '#16A34A' : s === 'negative' || s === 'negativo' ? '#DC2626' : '#94A3B8'
const ESTAB_COLOR = (b: string) => b === 'alta' ? '#16A34A' : b === 'media' ? '#F97316' : '#DC2626'

type SubTab = 'ccaa' | 'municipios'

export default function InstitucionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])
  const [tab, setTab] = useState<SubTab>('ccaa')

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        <section style={{ background: 'linear-gradient(135deg,#0F766E 0%,#054742 100%)', borderRadius: 22, padding: '28px 36px', marginBottom: 16, color: '#fff' }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.78, margin: '0 0 6px', textTransform: 'uppercase' }}>
            INSTITUCIONES LOCALES Y REGIONALES · INTELIGENCIA TERRITORIAL EN VIVO
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1 }}>
            19 CCAA + 8.132 municipios · fichas ricas con IA
          </h1>
          <p style={{ fontSize: 13, opacity: 0.85, margin: 0, lineHeight: 1.5 }}>
            Bio Wikipedia + foto del alcalde/presidente (Wikidata) + noticias 50 medios RSS + narrativas IA + preocupaciones detectadas
            + iniciativas legislativas + INE demografía/renta/extranjeros + score de estabilidad + resumen ejecutivo automático.
          </p>
        </section>

        <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ECECEF', marginBottom: 16 }}>
          {([
            { id: 'ccaa', label: 'Comunidades Autónomas', glyph: '◉' },
            { id: 'municipios', label: 'Municipios y ciudades (8.132)', glyph: '⊞' },
          ] as Array<{ id: SubTab; label: string; glyph: string }>).map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: 'transparent', color: active ? '#0F766E' : '#6e6e73', border: 0,
                borderBottom: active ? '2px solid #0F766E' : '2px solid transparent',
                padding: '10px 16px', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
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

// ═══ TAB CCAA ═══════════════════════════════════════════════════════════════

function CCAATab() {
  const [list, setList] = useState<CCAA[]>([])
  const [selected, setSelected] = useState<string>('madrid')
  const [profile, setProfile] = useState<CCAAProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => { fetch('/api/ccaa/list').then(r => r.json()).then(d => setList(d.items || [])) }, [])
  useEffect(() => {
    if (!selected) return
    setLoading(true); setProfile(null)
    fetch(`/api/ccaa/profile/${selected}`)
      .then(r => r.json()).then(setProfile)
      .catch(e => setProfile({ error: String(e) } as CCAAProfile))
      .finally(() => setLoading(false))
  }, [selected])

  const filtered = q ? list.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase()) || c.capital.toLowerCase().includes(q.toLowerCase())) : list

  return (
    <div>
      <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar comunidad o capital…"
        style={{ width: '100%', padding: '10px 14px', fontSize: 13, borderRadius: 10, border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit', marginBottom: 14 }}/>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {filtered.map(c => {
          const active = selected === c.slug
          return (
            <button key={c.slug} onClick={() => setSelected(c.slug)} style={{
              background: active ? c.color : '#fff', color: active ? '#fff' : '#3a3a3d',
              border: '1px solid ' + (active ? c.color : '#ECECEF'),
              borderRadius: 999, padding: '6px 12px',
              fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>{c.nombreCorto} <span style={{ opacity: 0.7, marginLeft: 4 }}>{c.poblacion}k</span></button>
          )
        })}
      </div>

      {loading && <Loading text="Cargando perfil CCAA · Wikipedia + Wikidata + RSS + Open Data + IA…"/>}
      {profile && profile.meta && <CCAAView profile={profile}/>}
    </div>
  )
}

function CCAAView({ profile }: { profile: CCAAProfile }) {
  const c = profile.meta
  return (
    <>
      {/* HERO */}
      <Hero color={c.color}
        eyebrow={`${c.partidoGobierno} · ${c.presidente}`}
        nombre={c.nombre}
        subtitulo={`Capital ${c.capital} · ${c.provincias.length} provincia(s) · fundación ${c.fundacion}`}
        foto={profile.presidenteFoto}
        partidoLabel={profile.presidente?.partidoNombre || c.partidoGobierno}
        kpis={[
          { label: 'Población', value: `${c.poblacion}k`, color: '#fff' },
          { label: 'PIB', value: `${(profile.metrics.pibMillonesEuros/1000).toFixed(0)}B €`, color: '#fff' },
          { label: 'Densidad', value: `${profile.metrics.densidadHabKm2}/km²`, color: '#fff' },
          { label: 'Estabilidad', value: profile.estabilidad.score.toFixed(1), color: ESTAB_COLOR(profile.estabilidad.banda) },
          { label: 'Sent. score', value: (profile.sentimientoAgregado.score>0?'+':'')+profile.sentimientoAgregado.score, color: '#fff' },
          { label: 'Tendencia', value: profile.sentimientoAgregado.tendencia==='up'?'↑':profile.sentimientoAgregado.tendencia==='down'?'↓':'→', color: '#fff' },
        ]}
      />

      {/* RESUMEN IA */}
      <Card titulo="✦ RESUMEN EJECUTIVO IA" color="#7C3AED" highlight>
        <p style={{ margin: 0, fontSize: 13, color: '#1d1d1f', lineHeight: 1.6 }}>{profile.resumenIA}</p>
        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {profile.estabilidad.razones.map((r, i) => (
            <span key={i} style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, background: `${ESTAB_COLOR(profile.estabilidad.banda)}15`, color: ESTAB_COLOR(profile.estabilidad.banda), fontWeight: 600 }}>{r}</span>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginTop: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {profile.bio.extract && (
            <Card titulo="HISTORIA · WIKIPEDIA" color="#525258">
              <p style={{ margin: 0, fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.55 }}>{profile.bio.extract}</p>
              {profile.bio.sourceUrl && <SmallLink href={profile.bio.sourceUrl} color={c.color}>Wikipedia completa ↗</SmallLink>}
            </Card>
          )}

          {profile.narrativas.length > 0 && (
            <Card titulo={`✦ NARRATIVAS DOMINANTES · ${profile.narrativas.length}`} color="#7C3AED">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profile.narrativas.map((n, i) => (
                  <NarrativaCard key={i} narrativa={n}/>
                ))}
              </div>
            </Card>
          )}

          {profile.historicoElectoral.length > 0 && (
            <Card titulo={`🗳 HISTÓRICO ELECTORAL · ${profile.historicoElectoral.length} elecciones`} color="#9333EA">
              {profile.historicoElectoral.map((e, i) => <ResultadosCard key={i} eleccion={e}/>)}
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6e6e73' }}>
                Fuente: Junta Electoral Central + Ministerio del Interior. Última actualización del snapshot: jul 2024.
              </p>
            </Card>
          )}

          {profile.parlamento && (
            <Card titulo={`🏛 PARLAMENTO AUTONÓMICO · ${profile.parlamento.totalEscaños} escaños`} color="#1F4E8C">
              <HemicicloSVG parlamento={profile.parlamento}/>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3px 12px', marginTop: 10 }}>
                {profile.parlamento.partidos.map(p => (
                  <div key={p.partido} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                    <span style={{ width: 10, height: 10, background: p.color, borderRadius: 2, flexShrink: 0 }}/>
                    <span style={{ color: '#1d1d1f', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.partido}</span>
                    <span style={{ fontWeight: 700, color: '#1d1d1f' }}>{p.escaños}</span>
                  </div>
                ))}
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 10.5, color: '#6e6e73', lineHeight: 1.5 }}>
                Aproximación con D&apos;Hondt sobre últimas autonómicas ({profile.parlamento.fecha}). Mayoría absoluta: <strong>{profile.parlamento.mayoriaAbsoluta}</strong>.
                Ganador: <strong style={{ color: profile.parlamento.ganador.color }}>{profile.parlamento.ganador.partido} ({profile.parlamento.ganador.escaños} escaños)</strong>.
              </p>
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
                {profile.noticias.map((n, i) => <NewsRow key={i} n={n}/>)}
              </div>
            </Card>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Gobierno */}
          <Card titulo="GOBIERNO Y CARGOS" color="#1F4E8C">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              {profile.presidenteFoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.presidenteFoto} alt={profile.presidente?.nombre || c.presidente} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${c.color}` }}/>
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {(profile.presidente?.nombre || c.presidente).split(' ').map(w => w[0]).slice(0,2).join('')}
                </div>
              )}
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{profile.presidente?.nombre || c.presidente}</p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
                  Presidente/a · {profile.presidente?.partidoNombre || c.partidoGobierno}
                </p>
                {profile.presidente?.inicioCargo && <p style={{ margin: '3px 0 0', fontSize: 10, color: '#9ca3af' }}>Desde {profile.presidente.inicioCargo}</p>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11 }}>
              <a href={c.gobiernoUrl} target="_blank" rel="noopener noreferrer" style={{ color: c.color, textDecoration: 'none', fontWeight: 600 }}>🏛 Gobierno {c.nombreCorto} ↗</a>
              <a href={c.parlamentoUrl} target="_blank" rel="noopener noreferrer" style={{ color: c.color, textDecoration: 'none', fontWeight: 600 }}>⚖ {c.parlamento} ↗</a>
              <a href={c.boletinUrl} target="_blank" rel="noopener noreferrer" style={{ color: c.color, textDecoration: 'none', fontWeight: 600 }}>📋 Boletín {c.boletin} ↗</a>
            </div>
          </Card>

          <SentimientoCard sentimiento={profile.sentimientoAgregado} color={c.color}/>

          {profile.preocupaciones.length > 0 && (
            <Card titulo={`PREOCUPACIONES DETECTADAS · ${profile.preocupaciones.length}`} color="#DC2626">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {profile.preocupaciones.map(p => (
                  <div key={p} style={{ padding: '5px 9px', fontSize: 11, color: '#1d1d1f', background: 'rgba(220,38,38,0.06)', borderRadius: 6, borderLeft: '2px solid #DC2626' }}>{p}</div>
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
            <p style={{ margin: '0 0 8px', fontSize: 11.5, color: '#1d1d1f' }}>PIB anual: <strong>{c.pibMillones.toLocaleString('es-ES')} M€</strong></p>
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

// ═══ TAB MUNICIPIOS ════════════════════════════════════════════════════════

function MunicipiosTab() {
  const [list, setList] = useState<Municipio[]>([])
  const [grandTotal, setGrandTotal] = useState(0)
  const [selected, setSelected] = useState<string>('madrid')
  const [profile, setProfile] = useState<MunicipioProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [ccaaFilter, setCcaaFilter] = useState<string>('')
  const [ccaaList, setCcaaList] = useState<CCAA[]>([])

  useEffect(() => { fetch('/api/ccaa/list').then(r => r.json()).then(d => setCcaaList(d.items || [])) }, [])
  useEffect(() => {
    if (!selected) return
    setLoading(true); setProfile(null)
    fetch(`/api/municipios/profile/${selected}`)
      .then(r => r.json()).then(setProfile)
      .catch(e => setProfile({ error: String(e) } as MunicipioProfile))
      .finally(() => setLoading(false))
  }, [selected])

  useEffect(() => {
    const tm = setTimeout(() => {
      const params = new URLSearchParams({ limit: '300' })
      if (q) params.set('q', q)
      if (ccaaFilter) params.set('ccaa', ccaaFilter)
      fetch(`/api/municipios/list?${params}`).then(r => r.json()).then(d => {
        setList(d.items || [])
        if (d.grandTotal) setGrandTotal(d.grandTotal)
      })
    }, 200)
    return () => clearTimeout(tm)
  }, [q, ccaaFilter])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16 }}>
      <aside style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: 12, maxHeight: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
        <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar entre 8.132 municipios…" autoFocus
          style={{ padding: '8px 12px', fontSize: 12, borderRadius: 8, border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit', marginBottom: 8 }}/>
        <select value={ccaaFilter} onChange={e => setCcaaFilter(e.target.value)} style={{ padding: '7px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit', marginBottom: 8 }}>
          <option value="">Todas las CCAA</option>
          {ccaaList.map(c => <option key={c.slug} value={c.slug}>{c.nombreCorto}</option>)}
        </select>
        <p style={{ fontSize: 10, color: '#6e6e73', margin: '0 0 8px' }}>
          {grandTotal > 0 && `${grandTotal.toLocaleString('es-ES')} totales · `}mostrando {list.length}
        </p>
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {list.map(m => {
            const active = selected === m.slug
            const partidoColor = m.partidoAlcalde ? (PARTY_COLOR[m.partidoAlcalde] || '#525258') : '#0F766E'
            return (
              <button key={m.slug + m.ine} onClick={() => setSelected(m.slug)} style={{
                textAlign: 'left', padding: '6px 9px', borderRadius: 6,
                background: active ? `${partidoColor}10` : '#fff',
                border: '1px solid ' + (active ? partidoColor : '#F0F0F3'),
                borderLeft: `3px solid ${partidoColor}`,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <strong style={{ fontSize: 11.5, color: '#1d1d1f' }}>{m.nombre}</strong>
                  <span style={{ marginLeft: 'auto', fontSize: 9.5, color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>
                    {m.poblacion > 1000000 ? `${(m.poblacion/1000000).toFixed(1)}M` : m.poblacion > 1000 ? `${(m.poblacion/1000).toFixed(0)}k` : m.poblacion}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#6e6e73' }}>{m.provincia}</p>
              </button>
            )
          })}
          {list.length === 0 && q && <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: 20 }}>Sin coincidencias para "{q}"</p>}
        </div>
      </aside>

      <section>
        {loading && <Loading text="Cargando ficha · Wikipedia + Wikidata + INE + 50 medios RSS + IA…"/>}
        {profile && profile.meta && <MunicipioView profile={profile}/>}
      </section>
    </div>
  )
}

function MunicipioView({ profile }: { profile: MunicipioProfile }) {
  const m = profile.meta
  const partido = profile.alcalde?.partidoNombre || m.partidoAlcalde
  const partidoColor = partido ? (PARTY_COLOR[partido] || '#525258') : profile.ccaaColor

  return (
    <>
      <Hero color={partidoColor}
        eyebrow={`${profile.ccaaNombre} · ${m.provincia} · INE ${m.ine}`}
        nombre={m.nombre}
        subtitulo={profile.alcalde ? `${profile.alcalde.nombre}${profile.alcalde.partidoNombre ? ` (${profile.alcalde.partidoNombre})` : ''}${profile.alcalde.inicioCargo ? ` · desde ${profile.alcalde.inicioCargo}` : ''}` : 'Alcalde no detectado en Wikidata'}
        foto={profile.alcaldeFoto}
        partidoLabel={partido || ''}
        kpis={[
          { label: 'Población', value: m.poblacion.toLocaleString('es-ES'), color: '#fff' },
          { label: 'Densidad', value: profile.metrics.densidadHabKm2 > 0 ? `${profile.metrics.densidadHabKm2}/km²` : '—', color: '#fff' },
          { label: 'Estabilidad', value: profile.estabilidad.score.toFixed(1), color: ESTAB_COLOR(profile.estabilidad.banda) },
          { label: 'Sent. score', value: (profile.sentimientoAgregado.score>0?'+':'')+profile.sentimientoAgregado.score, color: '#fff' },
          { label: 'Noticias 7d', value: profile.metrics.nNoticias7d, color: '#fff' },
          ...(profile.rentaMedia?.rentaMediaHogar ? [{ label: 'Renta hogar', value: `${(profile.rentaMedia.rentaMediaHogar/1000).toFixed(1)}k€`, color: '#fff' }] : []),
        ]}
      />

      <Card titulo="✦ RESUMEN EJECUTIVO IA" color="#7C3AED" highlight>
        <p style={{ margin: 0, fontSize: 13, color: '#1d1d1f', lineHeight: 1.6 }}>{profile.resumenIA}</p>
        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {profile.estabilidad.razones.map((r, i) => (
            <span key={i} style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, background: `${ESTAB_COLOR(profile.estabilidad.banda)}15`, color: ESTAB_COLOR(profile.estabilidad.banda), fontWeight: 600 }}>{r}</span>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginTop: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {profile.bio.extract && (
            <Card titulo="WIKIPEDIA" color="#525258">
              <p style={{ margin: 0, fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.55 }}>{profile.bio.extract}</p>
              {profile.bio.sourceUrl && <SmallLink href={profile.bio.sourceUrl} color={partidoColor}>Wikipedia completa ↗</SmallLink>}
            </Card>
          )}

          {profile.narrativas.length > 0 && (
            <Card titulo={`✦ NARRATIVAS LOCALES · ${profile.narrativas.length}`} color="#7C3AED">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profile.narrativas.map((n, i) => <NarrativaCard key={i} narrativa={n}/>)}
              </div>
            </Card>
          )}

          {profile.noticias.length > 0 && (
            <Card titulo={`NOTICIAS LOCALES · ${profile.noticias.length}`} color="#0F766E">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 480, overflowY: 'auto' }}>
                {profile.noticias.map((n, i) => <NewsRow key={i} n={n}/>)}
              </div>
            </Card>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {profile.alcalde && (
            <Card titulo="GOBIERNO MUNICIPAL · WIKIDATA" color="#1F4E8C">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {profile.alcaldeFoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.alcaldeFoto} alt={profile.alcalde.nombre} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${partidoColor}` }}/>
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: partidoColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
                    {profile.alcalde.nombre.split(' ').map(w => w[0]).slice(0,2).join('')}
                  </div>
                )}
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{profile.alcalde.nombre}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#6e6e73' }}>Alcalde/sa{profile.alcalde.partidoNombre ? ` · ${profile.alcalde.partidoNombre}` : ''}</p>
                  {profile.alcalde.inicioCargo && <p style={{ margin: '3px 0 0', fontSize: 10, color: '#9ca3af' }}>Desde {profile.alcalde.inicioCargo}</p>}
                </div>
              </div>
            </Card>
          )}

          {(profile.rentaMedia || profile.extranjeros || profile.piramide) && (
            <Card titulo="DEMOGRAFÍA Y ECONOMÍA · INE" color="#0F766E">
              {profile.rentaMedia?.rentaMediaHogar && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>RENTA MEDIA HOGAR {profile.rentaMedia.año}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 18, fontWeight: 700, color: '#0F766E', fontFamily: 'var(--font-display)' }}>
                    {profile.rentaMedia.rentaMediaHogar.toLocaleString('es-ES')} €
                  </p>
                  {profile.rentaMedia.rentaMediaPersona && <p style={{ margin: 0, fontSize: 10, color: '#6e6e73' }}>{profile.rentaMedia.rentaMediaPersona.toLocaleString('es-ES')} €/persona</p>}
                  {profile.rentaMedia.ginis && <p style={{ margin: 0, fontSize: 10, color: '#6e6e73' }}>Gini: {profile.rentaMedia.ginis}</p>}
                </div>
              )}
              {profile.extranjeros && profile.extranjeros.totalExtranjeros > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>POBLACIÓN EXTRANJERA</p>
                  <p style={{ margin: '3px 0 0', fontSize: 14, color: '#1d1d1f' }}>
                    <strong>{profile.extranjeros.totalExtranjeros.toLocaleString('es-ES')}</strong> ({profile.extranjeros.porcentaje}%)
                  </p>
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {profile.extranjeros.topNacionalidades.slice(0, 5).map(n => (
                      <div key={n.nacionalidad} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                        <span>{n.nacionalidad}</span>
                        <span style={{ color: '#6e6e73' }}>{n.total.toLocaleString('es-ES')} ({n.porcentaje}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {profile.piramide && (
                <>
                  <PiramideMini piramide={profile.piramide} color={partidoColor}/>
                  <IndicadoresDemograficos piramide={profile.piramide}/>
                </>
              )}
              {!profile.rentaMedia?.rentaMediaHogar && !profile.extranjeros?.totalExtranjeros && !profile.piramide && (
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>INE no expone datos detallados de este municipio (consulta directa al INE para más).</p>
              )}
            </Card>
          )}

          <SentimientoCard sentimiento={profile.sentimientoAgregado} color={partidoColor}/>

          {profile.preocupaciones.length > 0 && (
            <Card titulo={`PREOCUPACIONES DETECTADAS · ${profile.preocupaciones.length}`} color="#DC2626">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {profile.preocupaciones.map(p => (
                  <div key={p} style={{ padding: '5px 9px', fontSize: 11, color: '#1d1d1f', background: 'rgba(220,38,38,0.06)', borderRadius: 6, borderLeft: '2px solid #DC2626' }}>{p}</div>
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

          <Card titulo="🗳 RESULTADOS ELECTORALES OFICIALES" color="#9333EA">
            <p style={{ margin: 0, fontSize: 11.5, color: '#1d1d1f', lineHeight: 1.5 }}>
              Resultados desagregados por mesa, sección y municipio en el portal oficial del Ministerio del Interior
              (todas las convocatorias desde 1977).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11.5, marginTop: 10 }}>
              <a href={profile.enlacesElectorales.consultaMir} target="_blank" rel="noopener noreferrer" style={{ color: '#9333EA', textDecoration: 'none', fontWeight: 600 }}>
                🗳 InfoElectoral · Ministerio del Interior ↗
              </a>
              <a href={profile.enlacesElectorales.wikipedia} target="_blank" rel="noopener noreferrer" style={{ color: '#9333EA', textDecoration: 'none', fontWeight: 600 }}>
                📖 Elecciones municipales · Wikipedia ↗
              </a>
              <a href={profile.enlacesElectorales.junta} target="_blank" rel="noopener noreferrer" style={{ color: '#9333EA', textDecoration: 'none', fontWeight: 600 }}>
                ⚖ Junta Electoral Central ↗
              </a>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 10, color: '#9ca3af' }}>
              INE {profile.meta.ine} · provincia {profile.enlacesElectorales.cpro}
            </p>
          </Card>

          <Card titulo="ENLACES OFICIALES" color={partidoColor}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11.5 }}>
              {m.webAyuntamiento && <a href={m.webAyuntamiento} target="_blank" rel="noopener noreferrer" style={{ color: partidoColor, textDecoration: 'none', fontWeight: 600 }}>🏛 Ayuntamiento ↗</a>}
              {m.wikipedia && <a href={m.wikipedia} target="_blank" rel="noopener noreferrer" style={{ color: partidoColor, textDecoration: 'none', fontWeight: 600 }}>📖 Wikipedia ↗</a>}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

// ═══ COMPONENTES VISUALES ═══════════════════════════════════════════════════

function Hero({ color, eyebrow, nombre, subtitulo, foto, kpis }: {
  color: string; eyebrow: string; nombre: string; subtitulo: string
  foto: string | null; partidoLabel: string; kpis: Array<{ label: string; value: string | number; color: string }>
}) {
  return (
    <section style={{
      background: `linear-gradient(135deg,${color}EE,${color}99)`, borderRadius: 16, padding: '24px 30px', marginBottom: 14, color: '#fff',
      display: 'grid', gridTemplateColumns: foto ? 'auto 1.5fr 1fr' : '2fr 1fr', gap: 20, alignItems: 'center',
    }}>
      {foto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt={nombre} style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.6)' }}/>
      )}
      <div>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.85, margin: '0 0 4px', textTransform: 'uppercase' }}>{eyebrow}</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.022em', margin: '0 0 4px' }}>{nombre}</h2>
        <p style={{ fontSize: 12.5, opacity: 0.85, margin: 0 }}>{subtitulo}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ padding: '10px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.74, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, lineHeight: 1.1, marginTop: 3, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Card({ titulo, color, children, highlight }: { titulo: string; color: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <section style={{
      background: highlight ? `${color}06` : '#fff',
      borderRadius: 14, border: '1px solid ' + (highlight ? `${color}40` : '#ECECEF'),
      padding: '14px 18px',
      borderLeft: highlight ? `4px solid ${color}` : undefined,
    }}>
      <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color, textTransform: 'uppercase', margin: '0 0 10px' }}>{titulo}</p>
      {children}
    </section>
  )
}

function SmallLink({ href, color, children }: { href: string; color: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color, textDecoration: 'none', marginTop: 6, display: 'inline-block', fontWeight: 600 }}>{children}</a>
}

function NewsRow({ n }: { n: { titulo: string; medio: string; fecha: string | null; url: string; sentiment: string; descripcion?: string } }) {
  const sc = SENT_COLOR(n.sentiment)
  return (
    <a href={n.url} target="_blank" rel="noopener noreferrer" style={{
      padding: '7px 10px', borderRadius: 7, fontSize: 11.5,
      background: '#FAFAFB', border: '1px solid #ECECEF', borderLeft: `3px solid ${sc}`,
      textDecoration: 'none', color: '#1d1d1f',
    }}>
      <div style={{ display: 'flex', gap: 6, fontSize: 9.5, color: '#6e6e73', marginBottom: 2 }}>
        <span style={{ color: sc, fontWeight: 700 }}>{n.medio}</span>
        {n.fecha && <span>· {n.fecha.slice(0, 10)}</span>}
      </div>
      {n.titulo}
    </a>
  )
}

function NarrativaCard({ narrativa }: { narrativa: Narrativa }) {
  const color = SENT_COLOR(narrativa.tono)
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FAFAFB', border: '1px solid #ECECEF', borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <strong style={{ fontSize: 12.5, color: '#1d1d1f' }}>{narrativa.nombre}</strong>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color, padding: '2px 7px', borderRadius: 999, background: `${color}15` }}>
          {narrativa.fuerza} art.
        </span>
        <span style={{ fontSize: 10, color }}>{narrativa.sentimiento > 0 ? '+' : ''}{narrativa.sentimiento}</span>
      </div>
      {narrativa.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 5 }}>
          {narrativa.tags.map(t => <span key={t} style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 3, background: 'rgba(0,0,0,0.04)', color: '#525258' }}>{t}</span>)}
        </div>
      )}
      {narrativa.ejemplos.length > 0 && (
        <a href={narrativa.ejemplos[0].url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: '#525258', textDecoration: 'none', fontStyle: 'italic' }}>
          ‟{narrativa.ejemplos[0].titulo.slice(0, 100)}” · {narrativa.ejemplos[0].medio}
        </a>
      )}
    </div>
  )
}

function SentimientoCard({ sentimiento, color }: { sentimiento: SentimientoAgregado; color: string }) {
  return (
    <Card titulo="SENTIMIENTO MEDIÁTICO" color="#6e6e73">
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, height: 12, borderRadius: 6, overflow: 'hidden', background: '#F5F5F7' }}>
        {sentimiento.positivo > 0 && <div style={{ flex: sentimiento.positivo, background: '#16A34A' }}/>}
        {sentimiento.neutral > 0 && <div style={{ flex: sentimiento.neutral, background: '#94A3B8' }}/>}
        {sentimiento.negativo > 0 && <div style={{ flex: sentimiento.negativo, background: '#DC2626' }}/>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
        <span style={{ color: '#16A34A', fontWeight: 700 }}>+{sentimiento.positivo}</span>
        <span style={{ color: '#94A3B8' }}>={sentimiento.neutral}</span>
        <span style={{ color: '#DC2626', fontWeight: 700 }}>−{sentimiento.negativo}</span>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#1d1d1f', textAlign: 'center' }}>
        Score <strong style={{ color, fontSize: 18 }}>{sentimiento.score > 0 ? '+' : ''}{sentimiento.score}</strong>
        {' · '}
        <strong>{sentimiento.tendencia === 'up' ? '↑ mejora' : sentimiento.tendencia === 'down' ? '↓ empeora' : '→ estable'}</strong>
      </p>
    </Card>
  )
}

function IndicadoresDemograficos({ piramide }: { piramide: INEPiramide }) {
  // Calcular agregados por grupo de edad
  const sumar = (rec: Record<string, number>, predicate: (a: number) => boolean): number => {
    let s = 0
    for (const [g, v] of Object.entries(rec)) {
      const edadMin = parseInt(g.split('-')[0]) || 0
      if (predicate(edadMin)) s += v
    }
    return s
  }
  const menores16  = sumar(piramide.hombres, x => x < 16)  + sumar(piramide.mujeres, x => x < 16)
  const mayores64  = sumar(piramide.hombres, x => x >= 65) + sumar(piramide.mujeres, x => x >= 65)
  const edadActiva = sumar(piramide.hombres, x => x >= 16 && x < 65) + sumar(piramide.mujeres, x => x >= 16 && x < 65)
  const total      = menores16 + mayores64 + edadActiva
  if (total === 0) return null

  const envejecimiento = menores16 > 0 ? +((mayores64 / menores16) * 100).toFixed(0) : 0
  const dependencia    = edadActiva > 0 ? +(((menores16 + mayores64) / edadActiva) * 100).toFixed(0) : 0
  const feminidad      = piramide.totalHombres > 0 ? +((piramide.totalMujeres / piramide.totalHombres) * 100).toFixed(0) : 0
  const pctJoven       = total > 0 ? +((menores16 / total) * 100).toFixed(1) : 0
  const pctMayor       = total > 0 ? +((mayores64 / total) * 100).toFixed(1) : 0

  const interpretacion =
    envejecimiento > 200 ? '☉ Municipio muy envejecido — riesgo demográfico' :
    envejecimiento > 130 ? '◐ Envejecimiento alto — necesita políticas activas' :
    envejecimiento >  80 ? '◉ Equilibrado generacionalmente' :
                           '★ Municipio joven con dinamismo demográfico'

  return (
    <div style={{ marginTop: 10, padding: 10, background: 'rgba(15,118,110,0.04)', borderRadius: 8, borderLeft: '3px solid #0F766E' }}>
      <p style={{ margin: 0, fontSize: 10, color: '#0F766E', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        INDICADORES SOCIALES DERIVADOS
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '4px 12px', marginTop: 6, fontSize: 11 }}>
        <div>♔ Envejecimiento: <strong>{envejecimiento}</strong></div>
        <div>⚖ Dependencia: <strong>{dependencia}%</strong></div>
        <div>♀ Feminidad: <strong>{feminidad}</strong></div>
        <div>↓16: <strong>{pctJoven}%</strong> · ↑65: <strong>{pctMayor}%</strong></div>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#1d1d1f', fontStyle: 'italic' }}>{interpretacion}</p>
    </div>
  )
}

function PiramideMini({ piramide, color }: { piramide: INEPiramide; color: string }) {
  const grupos = Array.from(new Set([...Object.keys(piramide.hombres), ...Object.keys(piramide.mujeres)]))
    .sort((a, b) => parseInt(a) - parseInt(b))
  const maxVal = Math.max(...Object.values(piramide.hombres), ...Object.values(piramide.mujeres))
  return (
    <div style={{ marginTop: 6 }}>
      <p style={{ margin: 0, fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>PIRÁMIDE POBLACIÓN</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {grupos.map(g => {
          const h = piramide.hombres[g] || 0
          const m = piramide.mujeres[g] || 0
          return (
            <div key={g} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 1fr', gap: 4, alignItems: 'center', fontSize: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: '#1F4E8C', height: 8, width: `${(h / maxVal) * 100}%` }} title={`Hombres ${g}: ${h}`}/>
              </div>
              <span style={{ textAlign: 'center', color: '#6e6e73' }}>{g}</span>
              <div>
                <div style={{ background: '#DC2626', height: 8, width: `${(m / maxVal) * 100}%` }} title={`Mujeres ${g}: ${m}`}/>
              </div>
            </div>
          )
        })}
      </div>
      <p style={{ margin: '5px 0 0', fontSize: 9.5, color: '#6e6e73', textAlign: 'center' }}>
        ♂ {piramide.totalHombres.toLocaleString('es-ES')} · ♀ {piramide.totalMujeres.toLocaleString('es-ES')}
      </p>
    </div>
  )
}

function HemicicloSVG({ parlamento }: { parlamento: ComposicionParlamento }) {
  // Generar puntos del hemiciclo: filas concéntricas en semicírculo de π a 2π
  const total = parlamento.totalEscaños
  // Asignar escaños a cada diputado en orden por columna (de izquierda a derecha)
  // Generamos asientos en filas concéntricas
  const filas = Math.max(4, Math.ceil(Math.sqrt(total / Math.PI)))
  const seats: Array<{ x: number; y: number; partido: string; color: string }> = []
  let asignados = 0
  for (let fila = 0; fila < filas && asignados < total; fila++) {
    const radio = 100 + fila * 18
    const circunferencia = Math.PI * radio
    const numEnFila = Math.min(total - asignados, Math.max(1, Math.floor(circunferencia / 14)))
    for (let i = 0; i < numEnFila && asignados < total; i++) {
      const ang = Math.PI + (Math.PI * (i + 0.5)) / numEnFila
      seats.push({
        x: 220 + radio * Math.cos(ang),
        y: 195 + radio * Math.sin(ang),
        partido: '', color: '#000',
      })
      asignados++
    }
  }

  // Ordenar asientos de izquierda a derecha (por su ángulo) para asignar partidos
  const seatsOrdenados = [...seats].sort((a, b) => {
    const angA = Math.atan2(a.y - 195, a.x - 220)
    const angB = Math.atan2(b.y - 195, b.x - 220)
    return angA - angB
  })

  // Asignar partidos según escaños — primero partidos "izquierda" → "derecha"
  // Convención política: izquierda en pantalla = izquierda política
  const ordenPolitico = (p: string): number => {
    const orden: Record<string, number> = {
      'CUP': -10, 'EH-Bildu': -9, 'IU': -8, 'BNG': -7, 'UE': -7,
      'Sumar': -6, 'SUMAR': -6, 'Mas-Madrid': -6, 'Comuns-Sumar': -6, 'Podemos': -7,
      'Adelante-A': -6, 'Por-Andalucia': -6, 'Compromis': -5,
      'PSC': -3, 'PSOE': -3, 'PSPV-PSOE': -3, 'PSdeG-PSOE': -3, 'PSOE-A': -3,
      'PSN-PSOE': -3, 'PSN': -3, 'PSIB': -3, 'PSE-EE': -3,
      'ERC': -4, 'Junts': 0, 'PNV': 1, 'CCa': 1, 'PRC': 0, 'Geroa-Bai': -2,
      'PP': 4, 'CS': 3, 'UPN': 4, 'Foro': 4, 'VOX': 8, 'CHA': -1, 'PAR': 3,
      'Soria-Ya': 2, 'Teruel-Existe': 2, 'TERUEL-Existe': 2, 'UPL': 3,
      'MES': -2, 'NC-bc': -2, 'El-Pi': 0, 'ASG': 0, 'DO': 4, 'CSpor': 3, 'AC': 0,
      'OTROS': 6, 'Contigo-N': -4,
    }
    return orden[p] ?? 0
  }
  const partidosOrdenados = [...parlamento.partidos].sort((a, b) => ordenPolitico(a.partido) - ordenPolitico(b.partido))
  let seatIdx = 0
  for (const p of partidosOrdenados) {
    for (let i = 0; i < p.escaños && seatIdx < seatsOrdenados.length; i++) {
      seatsOrdenados[seatIdx].partido = p.partido
      seatsOrdenados[seatIdx].color = p.color
      seatIdx++
    }
  }

  return (
    <svg viewBox="0 0 440 220" style={{ width: '100%', maxWidth: 440, display: 'block', margin: '0 auto' }}>
      {seatsOrdenados.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={5.5} fill={s.color} stroke="#fff" strokeWidth={0.5}>
          <title>{s.partido}</title>
        </circle>
      ))}
      {/* Linea de mayoría absoluta */}
      <line x1="220" y1="200" x2="220" y2="80" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="3,3"/>
      <text x="220" y="73" textAnchor="middle" fontSize="9" fill="#6e6e73" fontWeight="700">
        Mayoría: {parlamento.mayoriaAbsoluta}
      </text>
    </svg>
  )
}

function ResultadosCard({ eleccion }: { eleccion: ResultadoEleccion }) {
  // Barra horizontal stacked + tabla de top 6 partidos
  const top = eleccion.resultados.slice(0, 6)
  const restoPct = eleccion.resultados.slice(6).reduce((s, r) => s + r.pct, 0)
  const competLabel = eleccion.competitividad < 25 ? '⚖ Muy competido' : eleccion.competitividad < 50 ? '◐ Competido' : eleccion.competitividad < 75 ? '◉ Cómodo' : '★ Hegemónico'
  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{eleccion.tipo === 'generales' ? '🗳 GENERALES' : '🏛 AUTONÓMICAS'}</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{eleccion.etiqueta}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 10, color: '#6e6e73' }}>{competLabel}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: eleccion.ganador.color }}>{eleccion.ganador.partido} {eleccion.ganador.pct.toFixed(1)}%</p>
        </div>
      </div>

      {/* Barra horizontal */}
      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: '#F5F5F7', marginBottom: 10 }}>
        {top.map((r, i) => <div key={i} style={{ flex: r.pct, background: r.color }} title={`${r.partido}: ${r.pct}%`}/>)}
        {restoPct > 0 && <div style={{ flex: restoPct, background: '#E0E0E0' }} title={`Otros: ${restoPct.toFixed(1)}%`}/>}
      </div>

      {/* Tabla compacta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px' }}>
        {top.map(r => (
          <div key={r.partido} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <span style={{ width: 10, height: 10, background: r.color, borderRadius: 2, flexShrink: 0 }}/>
            <span style={{ color: '#1d1d1f', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.partido}</span>
            <span style={{ fontWeight: 700, color: '#1d1d1f' }}>{r.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 9, color: '#9ca3af' }}>{eleccion.fuente}</p>
    </div>
  )
}

function Loading({ text }: { text: string }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', background: '#fff', borderRadius: 14, border: '1px solid #ECECEF' }}>
      {text}
    </div>
  )
}
