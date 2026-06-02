'use client'

import './instituciones.css'

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
import { NarrativasRadarChart } from './_components/NarrativasRadar'
import { EmpresasTreemap } from './_components/EmpresasTreemap'
import { TimelineAlcaldes } from './_components/TimelineAlcaldes'
import { EvolucionPoblacionChart } from './_components/EvolucionPoblacion'
import { PresupuestoMunicipalCard } from './_components/PresupuestoMunicipal'

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

interface TejidoEmpresarial {
  totalEmpresas: number; año: number; densidad: number
  sectores: Array<{ sector: string; empresas: number; pct: number; color: string }>
  comparativa: { vsMediaNacional: number; ranking: string }
  fuente: string
}

interface BienCultural {
  qid: string; nombre: string; tipo: string
  imagen: string | null; esUnesco: boolean; wikipediaUrl: string | null
}
interface PatrimonioCultural {
  total: number; bienes: BienCultural[]; unesco: BienCultural[]
  estadisticas: { porTipo: Record<string, number>; conImagen: number }
  fuente: string
}

interface EventoAgenda {
  tipo: 'eleccion' | 'pleno' | 'boletín' | 'fiesta' | 'iniciativa' | 'celebración'
  titulo: string; fecha: string; diasRestantes: number | null
  descripcion: string; url?: string | null
  importancia: 'alta' | 'media' | 'baja'
}

interface AnalisisIntegral {
  scoreRiesgoPolitico: number
  bandaRiesgo: 'baja' | 'media' | 'alta' | 'crítica'
  oportunidades: string[]
  amenazas: string[]
  prioridadesEstrategicas: string[]
  contextoMacro: string
  alertasSituacionales: string[]
}

interface CondicionMeteo {
  temperatura: number; sensacionTermica: number
  weatherCode: number; weatherLabel: string
  precip: number; viento: number
  hora: string; alertaCalor: boolean; alertaFrio: boolean
}

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
  patrimonio: PatrimonioCultural | null
  agenda: EventoAgenda[]
  analisisIntegral: AnalisisIntegral
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
  analisisIntegral: AnalisisIntegral
  enlacesElectorales: EnlacesElectorales
  coords: { lat: number; lon: number } | null
  tiempo: CondicionMeteo | null
  piramide: INEPiramide | null
  rentaMedia: INERentaMedia | null
  extranjeros: INEExtranjeros | null
  empresas: TejidoEmpresarial | null
  patrimonio: PatrimonioCultural | null
  agenda: EventoAgenda[]
  historicoAlcaldes: Array<{ qid: string; nombre: string; partido: string | null; inicio: string | null; fin: string | null; fotoUrl: string | null; wikipediaUrl: string | null }>
  seriePoblacion: { puntos: Array<{ año: number; poblacion: number; variacion_pct?: number }>; añoMin: number; añoMax: number; poblacionMin: number; poblacionMax: number; cagr_pct: number; variacionTotal_pct: number; banda: string } | null
  presupuesto: { presupuesto_total_M: number; presupuesto_per_capita_eur: number; composicion: Array<{ capitulo: string; pct: number; importe_M: number; color: string }>; deuda_viva_M: number | null; deuda_per_capita_eur: number | null; ratio_solvencia: string; año: number; metodologia: string; url_oficial: string } | null
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
    <div className="inst-root">
      <AppHeader/>
      <main className="inst-main">

        <section className="inst-page-hero">
          <p className="inst-page-hero-eyebrow">
            INSTITUCIONES LOCALES Y REGIONALES · INTELIGENCIA TERRITORIAL EN VIVO
          </p>
          <h1 className="inst-page-hero-title">
            19 CCAA + 8.132 municipios · fichas ricas con IA
          </h1>
          <p className="inst-page-hero-subtitle">
            Bio Wikipedia + foto del alcalde/presidente (Wikidata) + noticias 50 medios RSS + narrativas IA + preocupaciones detectadas
            + iniciativas legislativas + INE demografía/renta/extranjeros + score de estabilidad + resumen ejecutivo automático.
          </p>
        </section>

        <nav className="inst-tabs-nav">
          {([
            { id: 'ccaa', label: 'Comunidades Autónomas', glyph: '' },
            { id: 'municipios', label: 'Municipios y ciudades (8.132)', glyph: '' },
          ] as Array<{ id: SubTab; label: string; glyph: string }>).map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`inst-tab-btn${active ? ' inst-tab-btn--active' : ''}`}>
                <span className="inst-tab-glyph">{t.glyph}</span>
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
        className="inst-search-input"/>

      <div className="inst-ccaa-chips">
        {filtered.map(c => {
          const active = selected === c.slug
          return (
            <button key={c.slug} onClick={() => setSelected(c.slug)}
              className={`inst-ccaa-chip${active ? ' inst-ccaa-chip--active' : ''}`}
              style={{
                background: active ? c.color : undefined,
                border: '1px solid ' + (active ? c.color : 'var(--color-hairline-soft)'),
              }}>{c.nombreCorto} <span className="inst-ccaa-chip-pop">{c.poblacion}k</span></button>
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
      <Card titulo="RESUMEN EJECUTIVO IA" color="#7C3AED" highlight>
        <p className="inst-paragraph">{profile.resumenIA}</p>
        <div className="inst-razones-row">
          {profile.estabilidad.razones.map((r, i) => (
            <span key={i} className="inst-razon-chip" style={{ background: `${ESTAB_COLOR(profile.estabilidad.banda)}15`, color: ESTAB_COLOR(profile.estabilidad.banda) }}>{r}</span>
          ))}
        </div>
      </Card>

      {/* ANÁLISIS IA INTEGRAL */}
      <div className="inst-mt-14">
        <AnalisisIntegralCard analisis={profile.analisisIntegral}/>
      </div>

      <div className="inst-main-grid">
        <div className="inst-col-stack">
          {profile.bio.extract && (
            <Card titulo="HISTORIA · WIKIPEDIA" color="#525258">
              <p className="inst-paragraph--bio">{profile.bio.extract}</p>
              {profile.bio.sourceUrl && <SmallLink href={profile.bio.sourceUrl} color={c.color}>Wikipedia completa ↗</SmallLink>}
            </Card>
          )}

          {profile.narrativas.length > 0 && (
            <>
              <Card titulo={`NARRATIVAS DOMINANTES · ${profile.narrativas.length}`} color="#7C3AED">
                <div className="inst-narrativas-stack">
                  {profile.narrativas.map((n, i) => (
                    <NarrativaCard key={i} narrativa={n}/>
                  ))}
                </div>
              </Card>
              <Card titulo="RADAR DE NARRATIVAS · 6 EJES TEMÁTICOS" color="#7C3AED">
                <NarrativasRadarChart narrativas={profile.narrativas}/>
              </Card>
            </>
          )}

          {profile.historicoElectoral.length > 0 && (
            <Card titulo={`HISTÓRICO ELECTORAL · ${profile.historicoElectoral.length} elecciones`} color="#9333EA">
              {profile.historicoElectoral.map((e, i) => <ResultadosCard key={i} eleccion={e}/>)}
              <p className="inst-card-source">
                Fuente: Junta Electoral Central + Ministerio del Interior. Última actualización del snapshot: jul 2024.
              </p>
            </Card>
          )}

          {profile.parlamento && (
            <Card titulo={`PARLAMENTO AUTONÓMICO · ${profile.parlamento.totalEscaños} escaños`} color="#1F4E8C">
              <HemicicloSVG parlamento={profile.parlamento}/>
              <div className="inst-parlamento-legend">
                {profile.parlamento.partidos.map(p => (
                  <div key={p.partido} className="inst-parlamento-row">
                    <span className="inst-parlamento-swatch" style={{ background: p.color }}/>
                    <span className="inst-parlamento-name">{p.partido}</span>
                    <span className="inst-parlamento-seats">{p.escaños}</span>
                  </div>
                ))}
              </div>
              <p className="inst-parlamento-note">
                Aproximación con D&apos;Hondt sobre últimas autonómicas ({profile.parlamento.fecha}). Mayoría absoluta: <strong>{profile.parlamento.mayoriaAbsoluta}</strong>.
                Ganador: <strong style={{ color: profile.parlamento.ganador.color }}>{profile.parlamento.ganador.partido} ({profile.parlamento.ganador.escaños} escaños)</strong>.
              </p>
            </Card>
          )}

          {profile.iniciativas.length > 0 && (
            <Card titulo={`INICIATIVAS DEL PARLAMENTO · ${profile.iniciativas.length}`} color="#5B21B6">
              <div className="inst-iniciativas-list">
                {profile.iniciativas.map((it, i) => (
                  <a key={i} href={it.url || '#'} target="_blank" rel="noopener noreferrer"
                    className="inst-iniciativa-row"
                    style={{ borderLeft: `3px solid ${c.color}` }}>
                    <div className="inst-iniciativa-meta">
                      <span className="inst-iniciativa-promotor" style={{ color: c.color }}>{it.promotor}</span>
                      <span>· {it.materia}</span>
                      {it.fechaRegistro && <span>· {it.fechaRegistro.slice(0, 10)}</span>}
                    </div>
                    <p className="inst-iniciativa-title">{it.titulo.slice(0, 180)}</p>
                  </a>
                ))}
              </div>
            </Card>
          )}

          {profile.noticias.length > 0 && (
            <Card titulo={`NOTICIAS 7D · ${profile.noticias.length}`} color="#0F766E">
              <div className="inst-noticias-list">
                {profile.noticias.map((n, i) => <NewsRow key={i} n={n}/>)}
              </div>
            </Card>
          )}
        </div>

        <div className="inst-col-stack">
          {/* Gobierno */}
          <Card titulo="GOBIERNO Y CARGOS" color="#1F4E8C">
            <div className="inst-gob-head">
              {profile.presidenteFoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.presidenteFoto} alt={profile.presidente?.nombre || c.presidente} className="inst-gob-foto" style={{ border: `2px solid ${c.color}` }}/>
              ) : (
                <div className="inst-gob-initials" style={{ background: c.color }}>
                  {(profile.presidente?.nombre || c.presidente).split(' ').map(w => w[0]).slice(0,2).join('')}
                </div>
              )}
              <div>
                <p className="inst-gob-name">{profile.presidente?.nombre || c.presidente}</p>
                <p className="inst-gob-role">
                  Presidente/a · {profile.presidente?.partidoNombre || c.partidoGobierno}
                </p>
                {profile.presidente?.inicioCargo && <p className="inst-gob-since">Desde {profile.presidente.inicioCargo}</p>}
              </div>
            </div>
            <div className="inst-gob-links">
              <a href={c.gobiernoUrl} target="_blank" rel="noopener noreferrer" className="inst-gob-link" style={{ color: c.color }}>Gobierno {c.nombreCorto} ↗</a>
              <a href={c.parlamentoUrl} target="_blank" rel="noopener noreferrer" className="inst-gob-link" style={{ color: c.color }}> {c.parlamento} ↗</a>
              <a href={c.boletinUrl} target="_blank" rel="noopener noreferrer" className="inst-gob-link" style={{ color: c.color }}>Boletín {c.boletin} ↗</a>
            </div>
          </Card>

          <SentimientoCard sentimiento={profile.sentimientoAgregado} color={c.color}/>

          {profile.preocupaciones.length > 0 && (
            <Card titulo={`PREOCUPACIONES DETECTADAS · ${profile.preocupaciones.length}`} color="#DC2626">
              <div className="inst-preocupaciones-list">
                {profile.preocupaciones.map(p => (
                  <div key={p} className="inst-preocupacion">{p}</div>
                ))}
              </div>
            </Card>
          )}

          {profile.tagsCobertura.length > 0 && (
            <Card titulo="TEMAS EN COBERTURA" color={c.color}>
              <div className="inst-tags-wrap">
                {profile.tagsCobertura.map(t => (
                  <span key={t} className="inst-tag-pill" style={{ background: `${c.color}15`, color: c.color }}>{t}</span>
                ))}
              </div>
            </Card>
          )}

          <Card titulo="ECONOMÍA Y SECTORES" color="#0F766E">
            <p className="inst-economia-pib">PIB anual: <strong>{c.pibMillones.toLocaleString('es-ES')} M€</strong></p>
            <div className="inst-tags-wrap">
              {c.sectoresClave.map(s => (
                <span key={s} className="inst-sector-pill">{s}</span>
              ))}
            </div>
          </Card>

          <Card titulo="PROVINCIAS" color="#525258">
            <div className="inst-tags-wrap">
              {c.provincias.map(p => (
                <span key={p} className="inst-provincia-pill">{p}</span>
              ))}
            </div>
          </Card>

          {profile.patrimonio && profile.patrimonio.total > 0 && (
            <Card titulo={`PATRIMONIO CULTURAL · ${profile.patrimonio.total} bienes`} color="#5D4037">
              <PatrimonioCard patrimonio={profile.patrimonio}/>
            </Card>
          )}

          {profile.agenda.length > 0 && (
            <Card titulo={`AGENDA · ${profile.agenda.length} próximas citas`} color="#7C3AED">
              <AgendaCard agenda={profile.agenda}/>
            </Card>
          )}
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
    <div className="inst-municipios-layout">
      <aside className="inst-municipios-aside">
        <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar entre 8.132 municipios…" autoFocus
          className="inst-municipios-search"/>
        <select value={ccaaFilter} onChange={e => setCcaaFilter(e.target.value)} className="inst-municipios-select">
          <option value="">Todas las CCAA</option>
          {ccaaList.map(c => <option key={c.slug} value={c.slug}>{c.nombreCorto}</option>)}
        </select>
        <p className="inst-municipios-count">
          {grandTotal > 0 && `${grandTotal.toLocaleString('es-ES')} totales · `}mostrando {list.length}
        </p>
        <div className="inst-municipios-list">
          {list.map(m => {
            const active = selected === m.slug
            const partidoColor = m.partidoAlcalde ? (PARTY_COLOR[m.partidoAlcalde] || '#525258') : '#0F766E'
            return (
              <button key={m.slug + m.ine} onClick={() => setSelected(m.slug)} className="inst-municipio-row" style={{
                background: active ? `${partidoColor}10` : undefined,
                border: '1px solid ' + (active ? partidoColor : '#F0F0F3'),
                borderLeft: `3px solid ${partidoColor}`,
              }}>
                <div className="inst-municipio-row-head">
                  <strong className="inst-municipio-row-name">{m.nombre}</strong>
                  <span className="inst-municipio-row-pop">
                    {m.poblacion > 1000000 ? `${(m.poblacion/1000000).toFixed(1)}M` : m.poblacion > 1000 ? `${(m.poblacion/1000).toFixed(0)}k` : m.poblacion}
                  </span>
                </div>
                <p className="inst-municipio-row-provincia">{m.provincia}</p>
              </button>
            )
          })}
          {list.length === 0 && q && <p className="inst-municipios-empty">Sin coincidencias para "{q}"</p>}
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

      <Card titulo="RESUMEN EJECUTIVO IA" color="#7C3AED" highlight>
        <p className="inst-paragraph">{profile.resumenIA}</p>
        <div className="inst-razones-row">
          {profile.estabilidad.razones.map((r, i) => (
            <span key={i} className="inst-razon-chip" style={{ background: `${ESTAB_COLOR(profile.estabilidad.banda)}15`, color: ESTAB_COLOR(profile.estabilidad.banda) }}>{r}</span>
          ))}
        </div>
      </Card>

      <div className="inst-mt-14">
        <AnalisisIntegralCard analisis={profile.analisisIntegral}/>
      </div>

      <div className="inst-main-grid">
        <div className="inst-col-stack">
          {profile.bio.extract && (
            <Card titulo="WIKIPEDIA" color="#525258">
              <p className="inst-paragraph--bio">{profile.bio.extract}</p>
              {profile.bio.sourceUrl && <SmallLink href={profile.bio.sourceUrl} color={partidoColor}>Wikipedia completa ↗</SmallLink>}
            </Card>
          )}

          {profile.coords && (
            <Card titulo={`UBICACIÓN · ${profile.coords.lat.toFixed(3)}, ${profile.coords.lon.toFixed(3)}`} color="#0F766E">
              <MapaEmbed lat={profile.coords.lat} lon={profile.coords.lon} nombre={profile.meta.nombre}/>
              {profile.tiempo && <TiempoCard tiempo={profile.tiempo} color={partidoColor}/>}
            </Card>
          )}

          {profile.narrativas.length > 0 && (
            <>
              <Card titulo={`NARRATIVAS LOCALES · ${profile.narrativas.length}`} color="#7C3AED">
                <div className="inst-narrativas-stack">
                  {profile.narrativas.map((n, i) => <NarrativaCard key={i} narrativa={n}/>)}
                </div>
              </Card>
              <Card titulo="RADAR DE NARRATIVAS · 6 EJES TEMÁTICOS" color="#7C3AED">
                <NarrativasRadarChart narrativas={profile.narrativas}/>
              </Card>
            </>
          )}

          {profile.noticias.length > 0 && (
            <Card titulo={`NOTICIAS LOCALES · ${profile.noticias.length}`} color="#0F766E">
              <div className="inst-noticias-list">
                {profile.noticias.map((n, i) => <NewsRow key={i} n={n}/>)}
              </div>
            </Card>
          )}
        </div>

        <div className="inst-col-stack">
          {profile.historicoAlcaldes.length > 0 && (
            <Card titulo={`HISTÓRICO DE ALCALDES · ${profile.historicoAlcaldes.length}`} color="#1F4E8C">
              <TimelineAlcaldes alcaldes={profile.historicoAlcaldes}/>
              <p className="inst-card-source-alc">
                Fuente: Wikidata SPARQL · P6 (head of government) por código INE
              </p>
            </Card>
          )}

          {profile.seriePoblacion && profile.seriePoblacion.puntos.length > 3 && (
            <Card titulo={`EVOLUCIÓN POBLACIONAL · ${profile.seriePoblacion.añoMin}-${profile.seriePoblacion.añoMax}`} color="#0F766E">
              <EvolucionPoblacionChart serie={profile.seriePoblacion}/>
              <p className="inst-card-source-pob">
                Fuente: INE · Padrón Municipal Continuo
              </p>
            </Card>
          )}

          {profile.presupuesto && (
            <Card titulo={`PRESUPUESTO MUNICIPAL · ${profile.presupuesto.año}`} color="#5B21B6">
              <PresupuestoMunicipalCard p={profile.presupuesto}/>
            </Card>
          )}

          {profile.alcalde && (
            <Card titulo="GOBIERNO MUNICIPAL · WIKIDATA" color="#1F4E8C">
              <div className="inst-alcalde-head">
                {profile.alcaldeFoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.alcaldeFoto} alt={profile.alcalde.nombre} className="inst-alcalde-foto" style={{ border: `2px solid ${partidoColor}` }}/>
                ) : (
                  <div className="inst-alcalde-initials" style={{ background: partidoColor }}>
                    {profile.alcalde.nombre.split(' ').map(w => w[0]).slice(0,2).join('')}
                  </div>
                )}
                <div>
                  <p className="inst-alcalde-name">{profile.alcalde.nombre}</p>
                  <p className="inst-alcalde-role">Alcalde/sa{profile.alcalde.partidoNombre ? ` · ${profile.alcalde.partidoNombre}` : ''}</p>
                  {profile.alcalde.inicioCargo && <p className="inst-alcalde-since">Desde {profile.alcalde.inicioCargo}</p>}
                </div>
              </div>
            </Card>
          )}

          {(profile.rentaMedia || profile.extranjeros || profile.piramide) && (
            <Card titulo="DEMOGRAFÍA Y ECONOMÍA · INE" color="#0F766E">
              {profile.rentaMedia?.rentaMediaHogar && (
                <div className="inst-demo-block">
                  <p className="inst-demo-label">RENTA MEDIA HOGAR {profile.rentaMedia.año}</p>
                  <p className="inst-demo-value-big">
                    {profile.rentaMedia.rentaMediaHogar.toLocaleString('es-ES')} €
                  </p>
                  {profile.rentaMedia.rentaMediaPersona && <p className="inst-demo-meta">{profile.rentaMedia.rentaMediaPersona.toLocaleString('es-ES')} €/persona</p>}
                  {profile.rentaMedia.ginis && <p className="inst-demo-meta">Gini: {profile.rentaMedia.ginis}</p>}
                </div>
              )}
              {profile.extranjeros && profile.extranjeros.totalExtranjeros > 0 && (
                <div className="inst-demo-block">
                  <p className="inst-demo-label">POBLACIÓN EXTRANJERA</p>
                  <p className="inst-demo-value-mid">
                    <strong>{profile.extranjeros.totalExtranjeros.toLocaleString('es-ES')}</strong> ({profile.extranjeros.porcentaje}%)
                  </p>
                  <div className="inst-demo-nacionalidades">
                    {profile.extranjeros.topNacionalidades.slice(0, 5).map(n => (
                      <div key={n.nacionalidad} className="inst-demo-nac-row">
                        <span>{n.nacionalidad}</span>
                        <span className="inst-demo-nac-meta">{n.total.toLocaleString('es-ES')} ({n.porcentaje}%)</span>
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
                <p className="inst-demo-empty">INE no expone datos detallados de este municipio (consulta directa al INE para más).</p>
              )}
            </Card>
          )}

          <SentimientoCard sentimiento={profile.sentimientoAgregado} color={partidoColor}/>

          {profile.preocupaciones.length > 0 && (
            <Card titulo={`PREOCUPACIONES DETECTADAS · ${profile.preocupaciones.length}`} color="#DC2626">
              <div className="inst-preocupaciones-list">
                {profile.preocupaciones.map(p => (
                  <div key={p} className="inst-preocupacion">{p}</div>
                ))}
              </div>
            </Card>
          )}

          {profile.tagsCobertura.length > 0 && (
            <Card titulo="TEMAS EN COBERTURA" color={partidoColor}>
              <div className="inst-tags-wrap">
                {profile.tagsCobertura.map(t => (
                  <span key={t} className="inst-tag-pill" style={{ background: `${partidoColor}15`, color: partidoColor }}>{t}</span>
                ))}
              </div>
            </Card>
          )}

          {profile.empresas && (
            <>
              <Card titulo={`TEJIDO EMPRESARIAL · ${profile.empresas.totalEmpresas.toLocaleString('es-ES')} empresas`} color="#0F766E">
                <EmpresasCard empresas={profile.empresas}/>
              </Card>
              {profile.empresas.sectores.length > 0 && (
                <Card titulo="DISTRIBUCIÓN POR SECTOR · TREEMAP" color="#0F766E">
                  <EmpresasTreemap sectores={profile.empresas.sectores}/>
                </Card>
              )}
            </>
          )}

          {profile.patrimonio && profile.patrimonio.total > 0 && (
            <Card titulo={`PATRIMONIO Y CULTURA · ${profile.patrimonio.total} bienes`} color="#5D4037">
              <PatrimonioCard patrimonio={profile.patrimonio}/>
            </Card>
          )}

          {profile.agenda.length > 0 && (
            <Card titulo={`AGENDA · ${profile.agenda.length} citas`} color="#7C3AED">
              <AgendaCard agenda={profile.agenda}/>
            </Card>
          )}

          <Card titulo="RESULTADOS ELECTORALES OFICIALES" color="#9333EA">
            <p className="inst-res-paragraph">
              Resultados desagregados por mesa, sección y municipio en el portal oficial del Ministerio del Interior
              (todas las convocatorias desde 1977).
            </p>
            <div className="inst-res-links">
              <a href={profile.enlacesElectorales.consultaMir} target="_blank" rel="noopener noreferrer" className="inst-res-link">
                InfoElectoral · Ministerio del Interior ↗
              </a>
              <a href={profile.enlacesElectorales.wikipedia} target="_blank" rel="noopener noreferrer" className="inst-res-link">
                Elecciones municipales · Wikipedia ↗
              </a>
              <a href={profile.enlacesElectorales.junta} target="_blank" rel="noopener noreferrer" className="inst-res-link">
                Junta Electoral Central ↗
              </a>
            </div>
            <p className="inst-res-meta">
              INE {profile.meta.ine} · provincia {profile.enlacesElectorales.cpro}
            </p>
          </Card>

          <Card titulo="ENLACES OFICIALES" color={partidoColor}>
            <div className="inst-enlaces-list">
              {m.webAyuntamiento && <a href={m.webAyuntamiento} target="_blank" rel="noopener noreferrer" className="inst-enlaces-link" style={{ color: partidoColor }}>Ayuntamiento ↗</a>}
              {m.wikipedia && <a href={m.wikipedia} target="_blank" rel="noopener noreferrer" className="inst-enlaces-link" style={{ color: partidoColor }}>Wikipedia ↗</a>}
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
    <section
      className={`inst-hero ${foto ? 'inst-hero--with-foto' : 'inst-hero--no-foto'}`}
      style={{ background: `linear-gradient(135deg,${color}EE,${color}99)` }}
    >
      {foto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt={nombre} className="inst-hero-foto"/>
      )}
      <div>
        <p className="inst-hero-eyebrow">{eyebrow}</p>
        <h2 className="inst-hero-name">{nombre}</h2>
        <p className="inst-hero-subtitle">{subtitulo}</p>
      </div>
      <div className="inst-hero-kpis">
        {kpis.map((k, i) => (
          <div key={i} className="inst-hero-kpi">
            <div className="inst-hero-kpi-label">{k.label}</div>
            <div className="inst-hero-kpi-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Card({ titulo, color, children, highlight }: { titulo: string; color: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <section className="inst-card" style={{
      background: highlight ? `${color}06` : undefined,
      border: '1px solid ' + (highlight ? `${color}40` : 'var(--color-hairline-soft)'),
      borderLeft: highlight ? `4px solid ${color}` : undefined,
    }}>
      <p className="inst-card-title" style={{ color }}>{titulo}</p>
      {children}
    </section>
  )
}

function SmallLink({ href, color, children }: { href: string; color: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="inst-small-link" style={{ color }}>{children}</a>
}

function NewsRow({ n }: { n: { titulo: string; medio: string; fecha: string | null; url: string; sentiment: string; descripcion?: string } }) {
  const sc = SENT_COLOR(n.sentiment)
  return (
    <a href={n.url} target="_blank" rel="noopener noreferrer" className="inst-news-row" style={{ borderLeft: `3px solid ${sc}` }}>
      <div className="inst-news-meta">
        <span className="inst-news-medio" style={{ color: sc }}>{n.medio}</span>
        {n.fecha && <span>· {n.fecha.slice(0, 10)}</span>}
      </div>
      {n.titulo}
    </a>
  )
}

function NarrativaCard({ narrativa }: { narrativa: Narrativa }) {
  const color = SENT_COLOR(narrativa.tono)
  return (
    <div className="inst-narrativa-card" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="inst-narrativa-head">
        <strong className="inst-narrativa-title">{narrativa.nombre}</strong>
        <span className="inst-narrativa-fuerza" style={{ color, background: `${color}15` }}>
          {narrativa.fuerza} art.
        </span>
        <span className="inst-narrativa-sent" style={{ color }}>{narrativa.sentimiento > 0 ? '+' : ''}{narrativa.sentimiento}</span>
      </div>
      {narrativa.tags.length > 0 && (
        <div className="inst-narrativa-tags">
          {narrativa.tags.map(t => <span key={t} className="inst-narrativa-tag">{t}</span>)}
        </div>
      )}
      {narrativa.ejemplos.length > 0 && (
        <a href={narrativa.ejemplos[0].url} target="_blank" rel="noopener noreferrer" className="inst-narrativa-example">
          ‟{narrativa.ejemplos[0].titulo.slice(0, 100)}” · {narrativa.ejemplos[0].medio}
        </a>
      )}
    </div>
  )
}

function SentimientoCard({ sentimiento, color }: { sentimiento: SentimientoAgregado; color: string }) {
  return (
    <Card titulo="SENTIMIENTO MEDIÁTICO" color="#6e6e73">
      <div className="inst-sent-bar">
        {sentimiento.positivo > 0 && <div className="inst-sent-bar-pos" style={{ flex: sentimiento.positivo }}/>}
        {sentimiento.neutral > 0 && <div className="inst-sent-bar-neutral" style={{ flex: sentimiento.neutral }}/>}
        {sentimiento.negativo > 0 && <div className="inst-sent-bar-neg" style={{ flex: sentimiento.negativo }}/>}
      </div>
      <div className="inst-sent-counts">
        <span className="inst-sent-count-pos">+{sentimiento.positivo}</span>
        <span className="inst-sent-count-neutral">={sentimiento.neutral}</span>
        <span className="inst-sent-count-neg">−{sentimiento.negativo}</span>
      </div>
      <p className="inst-sent-score-row">
        Score <strong className="inst-sent-score-num" style={{ color }}>{sentimiento.score > 0 ? '+' : ''}{sentimiento.score}</strong>
        {' · '}
        <strong>{sentimiento.tendencia === 'up' ? '↑ mejora' : sentimiento.tendencia === 'down' ? '↓ empeora' : '→ estable'}</strong>
      </p>
    </Card>
  )
}

function EmpresasCard({ empresas }: { empresas: TejidoEmpresarial }) {
  const top = empresas.sectores.slice(0, 6)
  const restoPct = empresas.sectores.slice(6).reduce((s, x) => s + x.pct, 0)
  return (
    <div>
      <div className="inst-emp-head">
        <div>
          <p className="inst-emp-num-big">
            {empresas.totalEmpresas.toLocaleString('es-ES')}
          </p>
          <p className="inst-emp-num-sub">empresas registradas · {empresas.año}</p>
        </div>
        <div className="inst-emp-right">
          <p className="inst-emp-densidad-num">
            {empresas.densidad}
          </p>
          <p className="inst-emp-densidad-sub">empresas / 1.000 hab</p>
        </div>
      </div>

      {/* Barra stacked sectores */}
      <div className="inst-emp-stack">
        {top.map((r, i) => <div key={i} style={{ flex: r.pct, background: r.color }} title={`${r.sector}: ${r.pct}%`}/>)}
        {restoPct > 0 && <div className="inst-emp-stack-rest" style={{ flex: restoPct }} title={`Otros: ${restoPct.toFixed(1)}%`}/>}
      </div>

      {/* Lista sectores top */}
      <div className="inst-emp-list">
        {top.map(r => (
          <div key={r.sector} className="inst-emp-row">
            <span className="inst-emp-row-swatch" style={{ background: r.color }}/>
            <span className="inst-emp-row-name">{r.sector}</span>
            <span className="inst-emp-row-count">{r.empresas.toLocaleString('es-ES')}</span>
            <span className="inst-emp-row-pct">{r.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      <p className="inst-emp-comparativa">
        {empresas.comparativa.ranking} · ratio {empresas.comparativa.vsMediaNacional}× la media nacional
      </p>
      <p className="inst-emp-fuente">{empresas.fuente}</p>
    </div>
  )
}

function PatrimonioCard({ patrimonio }: { patrimonio: PatrimonioCultural }) {
  const conImagen = patrimonio.bienes.filter(b => b.imagen).slice(0, 6)
  return (
    <div>
      <div className="inst-pat-head">
        <span className="inst-pat-total">{patrimonio.total}</span>
        <span className="inst-pat-total-label">BIC + monumentos catalogados</span>
        {patrimonio.unesco.length > 0 && (
          <span className="inst-pat-unesco-badge">
            {patrimonio.unesco.length} UNESCO
          </span>
        )}
      </div>

      {/* Galería miniaturas */}
      {conImagen.length > 0 && (
        <div className="inst-pat-gallery">
          {conImagen.map(b => (
            <a key={b.qid} href={b.wikipediaUrl || `https://www.wikidata.org/wiki/${b.qid}`} target="_blank" rel="noopener noreferrer"
               className="inst-pat-thumb-link">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imagen!} alt={b.nombre} className="inst-pat-thumb-img"/>
              <p className="inst-pat-thumb-name">{b.nombre}</p>
            </a>
          ))}
        </div>
      )}

      {/* Distribución por tipo */}
      <div className="inst-tags-wrap">
        {Object.entries(patrimonio.estadisticas.porTipo).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tipo, n]) => (
          <span key={tipo} className="inst-pat-tipo">
            {tipo} · {n}
          </span>
        ))}
      </div>

      {/* Lista compacta */}
      {patrimonio.bienes.length > 0 && (
        <ul className="inst-pat-list">
          {patrimonio.bienes.slice(0, 6).map(b => (
            <li key={b.qid}>
              {b.wikipediaUrl ? (
                <a href={b.wikipediaUrl} target="_blank" rel="noopener noreferrer" className="inst-pat-list-link">{b.nombre}</a>
              ) : b.nombre}
              {b.esUnesco && <span className="inst-pat-unesco-star">★</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="inst-pat-fuente">{patrimonio.fuente}</p>
    </div>
  )
}

function AgendaCard({ agenda }: { agenda: EventoAgenda[] }) {
  const TIPO_GLYPH: Record<string, string> = { eleccion: '*', pleno: '·', 'boletín': '§', fiesta: '+', iniciativa: '~', celebración: '+' }
  return (
    <ul className="inst-agenda-list">
      {agenda.map((e, i) => {
        const dias = e.diasRestantes
        const color = e.importancia === 'alta' ? '#DC2626' : e.importancia === 'media' ? '#F97316' : '#9CA3AF'
        const proxima = dias !== null && dias >= 0 && dias < 365
        return (
          <li key={i} className="inst-agenda-item" style={{ background: proxima ? `${color}08` : '#FAFAFB', borderLeft: `3px solid ${color}` }}>
            <div className="inst-agenda-item-row">
              <p className="inst-agenda-title">
                <span className="inst-agenda-glyph">{TIPO_GLYPH[e.tipo] || '·'}</span>{e.titulo}
              </p>
              {dias !== null && (
                <span className="inst-agenda-dias" style={{ color }}>
                  {dias > 0 ? `en ${dias}d` : 'hoy'}
                </span>
              )}
            </div>
            <p className="inst-agenda-desc">{e.descripcion}</p>
            {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer" className="inst-agenda-link" style={{ color }}>Acceder ↗</a>}
          </li>
        )
      })}
    </ul>
  )
}

function AnalisisIntegralCard({ analisis }: { analisis: AnalisisIntegral }) {
  const colorRiesgo = analisis.bandaRiesgo === 'crítica' ? '#7F1D1D'
                    : analisis.bandaRiesgo === 'alta'    ? '#DC2626'
                    : analisis.bandaRiesgo === 'media'   ? '#F97316'
                    :                                      '#16A34A'

  return (
    <div className="inst-analisis-card">
      <div className="inst-analisis-head">
        <p className="inst-analisis-eyebrow">
          ANÁLISIS IA INTEGRAL
        </p>
        <div className="inst-analisis-riesgo-row">
          <span className="inst-analisis-riesgo-label">Riesgo político</span>
          <span className="inst-analisis-riesgo-score" style={{ color: colorRiesgo }}>{analisis.scoreRiesgoPolitico}</span>
          <span className="inst-analisis-riesgo-banda" style={{ color: colorRiesgo }}>{analisis.bandaRiesgo}</span>
        </div>
      </div>

      {analisis.alertasSituacionales.length > 0 && (
        <div className="inst-analisis-alertas">
          {analisis.alertasSituacionales.map((a, i) => (
            <p key={i} className={`inst-analisis-alerta ${i === 0 ? 'inst-analisis-alerta--first' : 'inst-analisis-alerta--rest'}`}>{a}</p>
          ))}
        </div>
      )}

      <div className="inst-analisis-cols">
        <div>
          <p className="inst-analisis-col-label inst-analisis-col-label--op">OPORTUNIDADES</p>
          <ul className="inst-analisis-list">
            {analisis.oportunidades.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
        <div>
          <p className="inst-analisis-col-label inst-analisis-col-label--am">▲ AMENAZAS</p>
          <ul className="inst-analisis-list">
            {analisis.amenazas.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      </div>

      <div className="inst-analisis-prioridades">
        <p className="inst-analisis-col-label inst-analisis-col-label--pri">TOP 3 PRIORIDADES ESTRATÉGICAS</p>
        <ol className="inst-analisis-prioridades-list">
          {analisis.prioridadesEstrategicas.map((p, i) => <li key={i}>{p}</li>)}
        </ol>
      </div>

      <p className="inst-analisis-contexto">
        Contexto: {analisis.contextoMacro}
      </p>
    </div>
  )
}

function MapaEmbed({ lat, lon, nombre }: { lat: number; lon: number; nombre: string }) {
  const delta = 0.025
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`
  return (
    <div className="inst-mapa-wrap">
      <iframe
        title={`Mapa OSM ${nombre}`}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`}
        className="inst-mapa-iframe"
        loading="lazy"
      />
      <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`}
         target="_blank" rel="noopener noreferrer"
         className="inst-mapa-zoom">
        Ampliar mapa ↗
      </a>
    </div>
  )
}

function TiempoCard({ tiempo, color }: { tiempo: CondicionMeteo; color: string }) {
  return (
    <div className="inst-tiempo" style={{
      background: tiempo.alertaCalor ? 'rgba(220,38,38,0.06)' : tiempo.alertaFrio ? 'rgba(31,78,140,0.06)' : '#FAFAFB',
      borderLeft: `3px solid ${tiempo.alertaCalor ? '#DC2626' : tiempo.alertaFrio ? '#1F4E8C' : color}`,
    }}>
      <div className="inst-tiempo-head">
        <div>
          <p className="inst-tiempo-temp">
            {tiempo.temperatura.toFixed(0)}°
          </p>
          <p className="inst-tiempo-label">{tiempo.weatherLabel}</p>
        </div>
        <div className="inst-tiempo-right">
          <p>Sensación <strong className="inst-tiempo-sensacion-strong">{tiempo.sensacionTermica.toFixed(0)}°</strong></p>
          {tiempo.viento > 0 && <p className="inst-tiempo-extra">~ {tiempo.viento.toFixed(0)} km/h</p>}
          {tiempo.precip > 0 && <p className="inst-tiempo-extra">mm {tiempo.precip.toFixed(1)} mm</p>}
        </div>
      </div>
      {(tiempo.alertaCalor || tiempo.alertaFrio) && (
        <p className="inst-tiempo-alerta" style={{ color: tiempo.alertaCalor ? '#DC2626' : '#1F4E8C' }}>
          Alerta {tiempo.alertaCalor ? 'calor extremo' : 'frío severo'}
        </p>
      )}
    </div>
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
    envejecimiento >  80 ? 'Equilibrado generacionalmente' :
                           'Municipio joven con dinamismo demográfico'

  return (
    <div className="inst-indi">
      <p className="inst-indi-label">
        INDICADORES SOCIALES DERIVADOS
      </p>
      <div className="inst-indi-grid">
        <div>♔ Envejecimiento: <strong>{envejecimiento}</strong></div>
        <div> Dependencia: <strong>{dependencia}%</strong></div>
        <div>♀ Feminidad: <strong>{feminidad}</strong></div>
        <div>↓16: <strong>{pctJoven}%</strong> · ↑65: <strong>{pctMayor}%</strong></div>
      </div>
      <p className="inst-indi-interp">{interpretacion}</p>
    </div>
  )
}

function PiramideMini({ piramide, color }: { piramide: INEPiramide; color: string }) {
  const grupos = Array.from(new Set([...Object.keys(piramide.hombres), ...Object.keys(piramide.mujeres)]))
    .sort((a, b) => parseInt(a) - parseInt(b))
  const maxVal = Math.max(...Object.values(piramide.hombres), ...Object.values(piramide.mujeres))
  return (
    <div className="inst-pir-wrap">
      <p className="inst-pir-label">PIRÁMIDE POBLACIÓN</p>
      <div className="inst-pir-rows">
        {grupos.map(g => {
          const h = piramide.hombres[g] || 0
          const m = piramide.mujeres[g] || 0
          return (
            <div key={g} className="inst-pir-row">
              <div className="inst-pir-left">
                <div className="inst-pir-bar-h" style={{ width: `${(h / maxVal) * 100}%` }} title={`Hombres ${g}: ${h}`}/>
              </div>
              <span className="inst-pir-grupo">{g}</span>
              <div>
                <div className="inst-pir-bar-m" style={{ width: `${(m / maxVal) * 100}%` }} title={`Mujeres ${g}: ${m}`}/>
              </div>
            </div>
          )
        })}
      </div>
      <p className="inst-pir-totals">
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
    <svg viewBox="0 0 440 220" className="inst-hemiciclo-svg">
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
  const competLabel = eleccion.competitividad < 25 ? ' Muy competido' : eleccion.competitividad < 50 ? '◐ Competido' : eleccion.competitividad < 75 ? 'Cómodo' : 'Hegemónico'
  return (
    <div className="inst-res-card">
      <div className="inst-res-head">
        <div>
          <p className="inst-res-tipo">{eleccion.tipo === 'generales' ? 'GENERALES' : 'AUTONÓMICAS'}</p>
          <p className="inst-res-etiqueta">{eleccion.etiqueta}</p>
        </div>
        <div className="inst-emp-right">
          <p className="inst-res-compet-label">{competLabel}</p>
          <p className="inst-res-compet-ganador" style={{ color: eleccion.ganador.color }}>{eleccion.ganador.partido} {eleccion.ganador.pct.toFixed(1)}%</p>
        </div>
      </div>

      {/* Barra horizontal */}
      <div className="inst-res-bar">
        {top.map((r, i) => <div key={i} style={{ flex: r.pct, background: r.color }} title={`${r.partido}: ${r.pct}%`}/>)}
        {restoPct > 0 && <div className="inst-res-rest" style={{ flex: restoPct }} title={`Otros: ${restoPct.toFixed(1)}%`}/>}
      </div>

      {/* Tabla compacta */}
      <div className="inst-res-table">
        {top.map(r => (
          <div key={r.partido} className="inst-res-row">
            <span className="inst-res-swatch" style={{ background: r.color }}/>
            <span className="inst-res-partido">{r.partido}</span>
            <span className="inst-res-pct">{r.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <p className="inst-res-fuente">{eleccion.fuente}</p>
    </div>
  )
}

function Loading({ text }: { text: string }) {
  return (
    <div className="inst-loading">
      {text}
    </div>
  )
}
