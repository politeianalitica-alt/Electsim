'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import LegislationMap from '@/components/LegislationMap'
import RegionalNewsMaps from '@/components/RegionalNewsMaps'

// Tipos del feed real del BOE (matchea con /api/legislativo/feed)
type ScoredNorma = {
  id: string; fecha: string; titulo: string; departamento: string
  seccion_codigo: string; seccion_nombre: string; epigrafe: string | null
  url_html: string; url_pdf: string
  tipo: string; materia: string
  importance: number
  components: { section: number; tipo: number; impact: number; recency: number }
  tags: string[]
}
type LegislativoFeed = {
  items: ScoredNorma[]
  summary: {
    total_items: number; returned: number; fetch_ms: number
    top_importance: number; avg_importance: number
    high_impact_count: number; urgent_count: number; eu_count: number
    por_tipo: Record<string, number>
    por_materia: Record<string, number>
  }
}
type LlmAnalysis = {
  id?: string
  resumen?: string
  sectores_afectados?: string[]
  actores_politicos?: string[]
  impacto_politico?: number
  urgencia?: string
  pronostico?: string
  llm_source?: 'ollama' | 'backend' | 'fallback'
  ms?: number
}
import VotacionSimulator from '@/components/VotacionSimulator'
import { HParty } from '@/components/HemicycleAdvanced'

// Composición real del Congreso tras las generales del 23-jul-2023 (350 escaños)
const HEMI_CONGRESO: HParty[] = [
  { id:'pp',    name:'PP',       color:'#1F4E8C', seats:137 },
  { id:'psoe',  name:'PSOE',     color:'#E1322D', seats:121 },
  { id:'vox',   name:'VOX',      color:'#5BA02E', seats: 33 },
  { id:'sumar', name:'Sumar',    color:'#D43F8D', seats: 31 },
  { id:'erc',   name:'ERC',      color:'#E8A030', seats:  7 },
  { id:'junts', name:'Junts',    color:'#1FA89B', seats:  7 },
  { id:'bildu', name:'EH Bildu', color:'#3F7A3A', seats:  6 },
  { id:'pnv',   name:'PNV',      color:'#7DB94B', seats:  5 },
  { id:'cc',    name:'CC',       color:'#F2C43A', seats:  1 },
  { id:'bng',   name:'BNG',      color:'#5BB3D9', seats:  1 },
  { id:'upn',   name:'UPN',      color:'#0E7D8C', seats:  1 },
]

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────
type Tipo = 'PL' | 'PPL' | 'RDL' | 'RD'
type Fase = 'registrado' | 'comision' | 'pleno-congreso' | 'senado' | 'devuelto' | 'aprobado' | 'rechazado'
type Pronostico = 'alta' | 'media' | 'baja' | 'rechazo'
type Materia = 'Económica' | 'Social' | 'Justicia' | 'Educación' | 'Sanidad' | 'Territorial' | 'Energía' | 'Defensa'

const TIPO_META: Record<Tipo, { label: string; color: string }> = {
  'PL':  { label:'Proyecto de Ley',     color:'#1F4E8C' },
  'PPL': { label:'Proposición de Ley',  color:'#5B21B6' },
  'RDL': { label:'Real Decreto-Ley',    color:'#DC2626' },
  'RD':  { label:'Real Decreto',        color:'#0F766E' },
}

const FASE_META: Record<Fase, { label: string; color: string; pct: number }> = {
  'registrado':     { label:'Registrado',        color:'#6e6e73', pct: 10 },
  'comision':       { label:'En comisión',       color:'#F97316', pct: 35 },
  'pleno-congreso': { label:'Pleno · Congreso',  color:'#1F4E8C', pct: 60 },
  'senado':         { label:'Senado',            color:'#5B21B6', pct: 80 },
  'devuelto':       { label:'Devuelto · enmiendas', color:'#EAB308', pct: 70 },
  'aprobado':       { label:'Ley aprobada',      color:'#16A34A', pct: 100 },
  'rechazado':      { label:'Rechazado',         color:'#DC2626', pct: 100 },
}

const PRON_META: Record<Pronostico, { label: string; color: string }> = {
  'alta':    { label:'Aprobación probable',  color:'#16A34A' },
  'media':   { label:'Margen estrecho',      color:'#F97316' },
  'baja':    { label:'Difícil aprobación',   color:'#EAB308' },
  'rechazo': { label:'Rechazo previsible',   color:'#DC2626' },
}

type Norma = {
  id: string
  exp: string
  title: string
  tipo: Tipo
  promotor: string
  materia: Materia
  fase: Fase
  proxTram: string
  proxFecha: string
  pronostico: Pronostico
  apoyo: string
  registro: string
}

const NORMAS: Norma[] = [
  { id:'n01', exp:'121/000034', title:'Reforma del IRPF y rentas del capital · ejercicio 2026', tipo:'PL',  promotor:'Gobierno (Hacienda)',  materia:'Económica',
    fase:'pleno-congreso', proxTram:'Votación enmiendas', proxFecha:'06/05/2026', pronostico:'media', apoyo:'PSOE+Sumar+ERC+Bildu+PNV', registro:'12/03/2026' },

  { id:'n02', exp:'121/000037', title:'Decreto-ley 4/2026 · ayudas al sector agroalimentario', tipo:'RDL', promotor:'Gobierno (Agricultura)', materia:'Económica',
    fase:'pleno-congreso', proxTram:'Convalidación', proxFecha:'03/05/2026', pronostico:'media', apoyo:'PSOE+Sumar+PNV+CC · Junts ABS', registro:'18/04/2026' },

  { id:'n03', exp:'122/000019', title:'Reforma constitucional · supresión aforamientos', tipo:'PPL', promotor:'GP Sumar',                materia:'Justicia',
    fase:'comision', proxTram:'Toma en consideración', proxFecha:'12/05/2026', pronostico:'rechazo', apoyo:'PSOE+Sumar (insuficiente)', registro:'25/03/2026' },

  { id:'n04', exp:'121/000041', title:'Ley de Vivienda · ampliación zonas tensionadas', tipo:'PL', promotor:'Gobierno (Vivienda)',     materia:'Social',
    fase:'senado', proxTram:'Dictamen Comisión General CCAA', proxFecha:'15/05/2026', pronostico:'alta', apoyo:'PSOE+Sumar+ERC+Bildu+BNG', registro:'04/02/2026' },

  { id:'n05', exp:'121/000044', title:'Ley Orgánica de Universidades · revisión LOSU', tipo:'PL', promotor:'Gobierno (Educación)',     materia:'Educación',
    fase:'comision', proxTram:'Cierre plazo enmiendas', proxFecha:'10/05/2026', pronostico:'baja', apoyo:'PSOE+Sumar (faltan 8 esc)', registro:'01/04/2026' },

  { id:'n06', exp:'122/000022', title:'Proposición de Ley para reformar el CGPJ', tipo:'PPL', promotor:'GP Popular',                  materia:'Justicia',
    fase:'comision', proxTram:'Debate enmiendas totalidad', proxFecha:'08/05/2026', pronostico:'baja', apoyo:'PP+VOX+UPN (171 esc)', registro:'15/04/2026' },

  { id:'n07', exp:'121/000027', title:'Ley de Movilidad Sostenible y Transporte', tipo:'PL', promotor:'Gobierno (Transportes)',     materia:'Energía',
    fase:'aprobado', proxTram:'BOE', proxFecha:'28/04/2026', pronostico:'alta', apoyo:'Aprobada · 184 votos a favor', registro:'10/01/2026' },

  { id:'n08', exp:'121/000040', title:'Decreto-ley 3/2026 · medidas energéticas', tipo:'RDL', promotor:'Gobierno (Transición Eco.)',  materia:'Energía',
    fase:'devuelto', proxTram:'Senado · enmiendas', proxFecha:'07/05/2026', pronostico:'media', apoyo:'Mayoría simple · disputa enmiendas', registro:'02/04/2026' },

  { id:'n09', exp:'122/000025', title:'Proposición de Ley · derecho a la desconexión digital', tipo:'PPL', promotor:'GP Sumar',     materia:'Social',
    fase:'registrado', proxTram:'Calificación Mesa', proxFecha:'09/05/2026', pronostico:'alta', apoyo:'PSOE+Sumar+ERC+Bildu+PNV+BNG', registro:'29/04/2026' },

  { id:'n10', exp:'121/000050', title:'Ley de Defensa Nacional · actualización marco', tipo:'PL', promotor:'Gobierno (Defensa)',     materia:'Defensa',
    fase:'registrado', proxTram:'Calificación Mesa', proxFecha:'14/05/2026', pronostico:'alta', apoyo:'Bipartidismo PP+PSOE', registro:'01/05/2026' },

  { id:'n11', exp:'121/000045', title:'Ley de Sanidad Universal · cobertura migrantes', tipo:'PL', promotor:'Gobierno (Sanidad)',     materia:'Sanidad',
    fase:'comision', proxTram:'Comparecencias', proxFecha:'13/05/2026', pronostico:'media', apoyo:'PSOE+Sumar+nacionalistas (179)', registro:'08/04/2026' },

  { id:'n12', exp:'121/000048', title:'Ley de Financiación Autonómica · reforma art. 156', tipo:'PL', promotor:'Gobierno (Hacienda)', materia:'Territorial',
    fase:'comision', proxTram:'Ponencia', proxFecha:'20/05/2026', pronostico:'rechazo', apoyo:'Sin acuerdo PSOE-PP-Junts', registro:'20/04/2026' },
]

const TIPOS = ['Todos','PL','PPL','RDL','RD'] as const
const MATERIAS = ['Todas','Económica','Social','Justicia','Educación','Sanidad','Territorial','Energía','Defensa'] as const

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────
export default function MonitorLegislativoPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // Feed REAL del BOE (últimos 7 días) · auto-refresh 5min
  const { data: feed, source, updatedAt, refresh } = useApi<LegislativoFeed>(
    '/api/legislativo/feed?days=7&limit=15',
    { refreshInterval: 300_000 }
  )
  const boeItems = feed?.items || []

  // Estado de análisis IA por id de norma
  const [analyses, setAnalyses] = useState<Record<string, LlmAnalysis>>({})
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({})

  async function analyze(item: ScoredNorma) {
    if (analyzing[item.id] || analyses[item.id]) return
    setAnalyzing(a => ({ ...a, [item.id]: true }))
    try {
      const res = await fetch('/api/legislativo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          titulo: item.titulo,
          departamento: item.departamento,
          tipo: item.tipo,
          materia: item.materia,
        }),
      })
      const json: LlmAnalysis = await res.json()
      setAnalyses(a => ({ ...a, [item.id]: json }))
    } catch {
      setAnalyses(a => ({ ...a, [item.id]: { id: item.id, llm_source: 'fallback', resumen: 'Error al analizar' } }))
    } finally {
      setAnalyzing(a => ({ ...a, [item.id]: false }))
    }
  }

  const [filterFase, setFilterFase] = useState<Fase | 'todas'>('todas')
  const [filterPron, setFilterPron] = useState<Pronostico | 'todos'>('todos')
  const [filterTipo, setFilterTipo] = useState<typeof TIPOS[number]>('Todos')
  const [filterMat, setFilterMat]   = useState<typeof MATERIAS[number]>('Todas')

  const counts = useMemo(() => {
    const tramite = NORMAS.filter(n => n.fase !== 'aprobado' && n.fase !== 'rechazado').length
    const aprobados30 = NORMAS.filter(n => n.fase === 'aprobado').length
    const proxima = [...NORMAS].sort((a,b) => parseDate(a.proxFecha).getTime() - parseDate(b.proxFecha).getTime())[0]
    return { tramite, aprobados30, proxima, total: NORMAS.length }
  }, [])

  const filtered = useMemo(() => {
    return NORMAS.filter(n =>
      (filterFase === 'todas' || n.fase === filterFase) &&
      (filterPron === 'todos' || n.pronostico === filterPron) &&
      (filterTipo === 'Todos' || n.tipo === filterTipo) &&
      (filterMat  === 'Todas' || n.materia === filterMat)
    ).sort((a,b) => parseDate(a.proxFecha).getTime() - parseDate(b.proxFecha).getTime())
  }, [filterFase, filterPron, filterTipo, filterMat])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:18,
          padding:'24px 32px', marginBottom:18, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', color:'#6e6e73', textTransform:'uppercase', margin:'0 0 8px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <span>RADAR LEGISLATIVO · MONITOR EN TIEMPO REAL</span>
              <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={300} onRefresh={refresh}/>
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:28, letterSpacing:'-0.022em', margin:'0 0 6px', lineHeight:1.1 }}>
              {counts.tramite} normas <em style={{ fontWeight:300, fontStyle:'italic', color:'#5B21B6' }}>en tramitación</em>
            </h1>
            <p style={{ fontSize:13, color:'#6e6e73', margin:0 }}>
              {counts.total} expedientes monitorizados · próxima votación clave: <strong style={{ color:'#1d1d1f' }}>{counts.proxima.proxFecha}</strong> · {counts.aprobados30} aprobadas últimos 30 días
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            <KPI label="EN TRÁMITE" value={String(counts.tramite)} color="#5B21B6"/>
            <KPI label="APROBADAS (30D)" value={String(counts.aprobados30)} color="#16A34A"/>
            <KPI label="ESCALADAS" value={String(NORMAS.filter(n => n.pronostico === 'media').length)} color="#F97316"/>
          </div>
        </section>

        {/* Mapa legislativo · Impacto territorial */}
        <LegislationMap/>

        {/* ═════════════════════════════════════════════════════════════════
            MAPAS DE NOTICIAS EN TIEMPO REAL · CCAA y Europa
            Calor de sentiment por región · alimentado por /api/noticias/feed
            y los 219 medios con RSS configurada.
            ═════════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#0F766E', textTransform: 'uppercase', margin: 0 }}>
              MAPAS DE COBERTURA · TIEMPO REAL
            </p>
            <span style={{
              fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: 'rgba(15,118,110,0.10)', color: '#0F766E',
              border: '1px solid rgba(15,118,110,0.30)', letterSpacing: '0.06em',
            }}>RSS · 219 medios</span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600,
            letterSpacing: '-0.020em', margin: '0 0 4px', color: '#1d1d1f',
          }}>
            Sentiment regional <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: '#515154', fontWeight: 500 }}>en vivo.</span>
          </h2>
          <p style={{ fontSize: 12, color: '#6e6e73', margin: '0 0 14px', maxWidth: 720 }}>
            Mapa de calor por Comunidad Autónoma y por país europeo basado en el volumen
            y tono de las noticias publicadas en las últimas horas. Datos derivados del
            agregador RSS y scoring de importancia.
          </p>
          <RegionalNewsMaps/>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            BOE EN VIVO · Disposiciones generales últimos 7 días
            Datos REALES de la API de Datos Abiertos del BOE.
            Botón "Analizar con IA" envía cada disposición a Ollama.
            ═════════════════════════════════════════════════════════════════ */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:18,
          padding:'22px 28px', marginBottom:18, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:14, flexWrap:'wrap', marginBottom:14 }}>
            <div>
              <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', color:'#0F766E', textTransform:'uppercase', margin:'0 0 6px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span>BOE · DISPOSICIONES EN VIVO · ÚLTIMOS 7 DÍAS</span>
              </p>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, letterSpacing:'-0.018em', margin:'0 0 4px', color:'#1d1d1f' }}>
                {feed?.summary.total_items || 0} disposiciones · {boeItems.length} mostradas · scoring por importancia
              </h2>
              <p style={{ fontSize:12, color:'#6e6e73', margin:0, lineHeight:1.45 }}>
                Datos reales del Boletín Oficial del Estado · clasificación heurística por tipo y materia ·
                pulsa &quot;Analizar con IA&quot; para enviar la disposición a Ollama (resumen, sectores, impacto político, pronóstico).
              </p>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <KPI label="ALTO IMPACTO" value={String(feed?.summary.high_impact_count || 0)} color="#DC2626"/>
              <KPI label="URGENTES" value={String(feed?.summary.urgent_count || 0)} color="#F97316"/>
              <KPI label="UE" value={String(feed?.summary.eu_count || 0)} color="#0F766E"/>
            </div>
          </div>

          {boeItems.length === 0 ? (
            <div style={{ padding:'30px', textAlign:'center', color:'#6e6e73', fontSize:13 }}>
              {feed ? 'Sin disposiciones recientes en BOE.' : 'Cargando feed del BOE…'}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {boeItems.map(it => {
                const an = analyses[it.id]
                const busy = analyzing[it.id]
                const impColor = it.importance >= 70 ? '#DC2626' : it.importance >= 50 ? '#F97316' : it.importance >= 30 ? '#5B21B6' : '#9CA3AF'
                return (
                  <div key={it.id} style={{
                    padding:'14px 16px', borderRadius:12,
                    background:'#fafafa', border:'1px solid #ECECEF',
                    borderLeft:`3px solid ${impColor}`,
                  }}>
                    <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:14, alignItems:'flex-start' }}>
                      {/* Score badge */}
                      <div style={{
                        background: impColor, color:'#fff', borderRadius:10, padding:'10px 14px',
                        textAlign:'center', minWidth:54, flexShrink:0,
                      }}>
                        <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, lineHeight:1 }}>{it.importance}</div>
                        <div style={{ fontSize:9, marginTop:2, opacity:0.85, fontWeight:700, letterSpacing:'0.08em' }}>SCORE</div>
                      </div>

                      {/* Cuerpo */}
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
                          <span style={{ fontSize:9.5, fontWeight:800, padding:'2px 7px', borderRadius:4, background:'#1F4E8C', color:'#fff', letterSpacing:'0.05em' }}>{it.tipo}</span>
                          <span style={{ fontSize:9.5, fontWeight:700, padding:'2px 7px', borderRadius:4, background:'#0F766E15', color:'#0F766E', border:'1px solid #0F766E40' }}>{it.materia}</span>
                          <span style={{ fontSize:10.5, color:'#6e6e73' }}>{it.fecha}</span>
                          <span style={{ fontSize:10.5, color:'#6e6e73' }}>· {it.id}</span>
                        </div>
                        <a href={it.url_html} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none', color:'#1d1d1f' }}>
                          <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:600, lineHeight:1.35 }}>{it.titulo}</p>
                        </a>
                        <p style={{ margin:'0 0 6px', fontSize:11, color:'#6e6e73' }}>{it.departamento}</p>
                        {it.tags.length > 0 && (
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                            {it.tags.map(t => <span key={t} style={{ fontSize:9.5, fontWeight:700, padding:'2px 6px', borderRadius:3, background:'rgba(0,0,0,0.04)', color:'#3a3a3d' }}>{t}</span>)}
                          </div>
                        )}

                        {/* Análisis IA cuando llegue */}
                        {an && (
                          <div style={{ marginTop:10, padding:'10px 12px', borderRadius:8, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.20)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                              <span style={{ fontSize:9.5, fontWeight:800, color:'#fff', background:an.llm_source==='ollama'?'#7C3AED':an.llm_source==='backend'?'#10b981':'#9CA3AF', padding:'2px 7px', borderRadius:4, letterSpacing:'0.04em' }}>
                                {an.llm_source === 'ollama' ? 'OLLAMA' : an.llm_source === 'backend' ? 'BACKEND' : 'FALLBACK'}
                              </span>
                              {an.urgencia && <span style={{ fontSize:10, fontWeight:600, color:'#7C3AED' }}>Urgencia: {an.urgencia}</span>}
                              {typeof an.impacto_politico === 'number' && (
                                <span style={{ fontSize:10, fontWeight:600, color: an.impacto_politico < -10 ? '#DC2626' : an.impacto_politico > 10 ? '#16A34A' : '#6e6e73' }}>
                                  Impacto político: {an.impacto_politico > 0 ? '+' : ''}{an.impacto_politico}
                                </span>
                              )}
                              {an.pronostico && <span style={{ fontSize:10, color:'#6e6e73' }}>· Pronóstico: <strong style={{ color:'#1d1d1f' }}>{an.pronostico}</strong></span>}
                              {an.ms && <span style={{ fontSize:9.5, color:'#9CA3AF', marginLeft:'auto' }}>{(an.ms/1000).toFixed(1)}s</span>}
                            </div>
                            {an.resumen && <p style={{ margin:'0 0 6px', fontSize:12, lineHeight:1.45, color:'#1d1d1f' }}>{an.resumen}</p>}
                            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                              {(an.sectores_afectados || []).map(s => <span key={s} style={{ fontSize:9.5, padding:'1px 6px', borderRadius:3, background:'#0F766E15', color:'#0F766E' }}>{s}</span>)}
                              {(an.actores_politicos || []).map(s => <span key={s} style={{ fontSize:9.5, padding:'1px 6px', borderRadius:3, background:'#5B21B615', color:'#5B21B6' }}>{s}</span>)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botón Analizar IA */}
                      <button onClick={() => analyze(it)} disabled={busy || !!an} style={{
                        background: an ? '#16A34A' : busy ? '#9CA3AF' : 'linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)',
                        color:'#fff', border:'none', borderRadius:8, padding:'8px 14px',
                        fontSize:11.5, fontWeight:700, cursor: busy || an ? 'default' : 'pointer',
                        fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0, transition:'opacity 160ms',
                      }}>
                        {an ? 'Analizado' : busy ? 'Analizando…' : 'Analizar con IA'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ───── Simulador de votación ───── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:18,
          padding:'22px 28px', marginBottom:18, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:14, flexWrap:'wrap', marginBottom:14 }}>
            <div>
              <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', color:'#5B21B6', textTransform:'uppercase', margin:'0 0 6px' }}>
                SIMULADOR DE VOTACIÓN · CONGRESO 350 ESCAÑOS
              </p>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, letterSpacing:'-0.018em', margin:'0 0 4px', color:'#1d1d1f' }}>
                Calcula sumas por tipo de mayoría
              </h2>
              <p style={{ fontSize:12, color:'#6e6e73', margin:0, lineHeight:1.45 }}>
                Asigna SÍ / NO / ABSTENCIÓN a cada grupo y comprueba si la ley sale adelante.
                Selecciona el umbral según la naturaleza de la norma:
                <strong style={{ color:'#1d1d1f' }}> mayoría simple</strong> (leyes ordinarias),
                <strong style={{ color:'#1d1d1f' }}> absoluta 176</strong> (leyes orgánicas, investidura, censura),
                <strong style={{ color:'#1d1d1f' }}> 3/5 = 210</strong> (CGPJ, reforma constitucional ordinaria) o
                <strong style={{ color:'#1d1d1f' }}> 2/3 = 234</strong> (reformas reforzadas).
              </p>
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(31,78,140,0.08)', fontSize:10.5, fontWeight:700, color:'#1F4E8C', letterSpacing:'0.04em' }}>176 = absoluta</span>
              <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(91,33,182,0.08)', fontSize:10.5, fontWeight:700, color:'#5B21B6', letterSpacing:'0.04em' }}>210 = 3/5</span>
              <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(220,38,38,0.08)', fontSize:10.5, fontWeight:700, color:'#DC2626', letterSpacing:'0.04em' }}>234 = 2/3</span>
            </div>
          </div>
          <VotacionSimulator parties={HEMI_CONGRESO}/>
        </section>

        {/* Filtros */}
        <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', marginBottom:18 }}>
          <FilterGroup label="Fase">
            {(['todas','registrado','comision','pleno-congreso','senado','devuelto','aprobado','rechazado'] as const).map(f => {
              const active = filterFase === f
              const m = f !== 'todas' ? FASE_META[f as Fase] : null
              return (
                <Pill key={f} active={active} onClick={()=>setFilterFase(f)} color={m?.color}>
                  {f === 'todas' ? 'Todas' : m?.label}
                </Pill>
              )
            })}
          </FilterGroup>
          <Sep/>
          <FilterGroup label="Pronóstico">
            {(['todos','alta','media','baja','rechazo'] as const).map(p => {
              const active = filterPron === p
              const m = p !== 'todos' ? PRON_META[p as Pronostico] : null
              return (
                <Pill key={p} active={active} onClick={()=>setFilterPron(p)} color={m?.color}>
                  {p === 'todos' ? 'Todos' : m?.label}
                </Pill>
              )
            })}
          </FilterGroup>
          <Sep/>
          <FilterGroup label="Tipo">
            {TIPOS.map(t => (
              <BoxBtn key={t} active={filterTipo === t} onClick={()=>setFilterTipo(t)}>{t}</BoxBtn>
            ))}
          </FilterGroup>
          <Sep/>
          <FilterGroup label="Materia">
            {MATERIAS.map(m => (
              <BoxBtn key={m} active={filterMat === m} onClick={()=>setFilterMat(m)}>{m}</BoxBtn>
            ))}
          </FilterGroup>
          <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{filtered.length} resultados</span>
        </div>

        {/* Lista */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.length === 0 && (
            <div style={{ padding:30, textAlign:'center', color:'#6e6e73', fontSize:13, background:'#fff', borderRadius:14, border:'1px solid #ECECEF' }}>
              Sin normas que coincidan con el filtro.
            </div>
          )}
          {filtered.map(n => {
            const t = TIPO_META[n.tipo]
            const f = FASE_META[n.fase]
            const p = PRON_META[n.pronostico]
            const final = n.fase === 'aprobado' || n.fase === 'rechazado'
            return (
              <article key={n.id} style={{
                display:'grid', gridTemplateColumns:'4px 1fr 240px 180px', alignItems:'stretch',
                background:'#fff', border:'1px solid #ECECEF', borderRadius:14, overflow:'hidden',
                boxShadow:'0 1px 2px rgba(0,0,0,0.03)',
                opacity: final ? 0.85 : 1,
              }}>
                <div style={{ background:f.color }}/>
                <div style={{ padding:'14px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{
                      fontSize:9.5, fontWeight:800, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:6,
                      background:t.color, color:'#fff',
                    }}>{n.tipo}</span>
                    <span style={{
                      fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${f.color}15`, color:f.color, border:`1px solid ${f.color}40`,
                    }}>{f.label.toUpperCase()}</span>
                    <span style={{
                      fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${p.color}15`, color:p.color, border:`1px solid ${p.color}40`,
                    }}>{p.label.toUpperCase()}</span>
                    <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>· {n.materia}</span>
                  </div>
                  <h3 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, letterSpacing:'-0.012em', color:'#1d1d1f' }}>{n.title}</h3>
                  <div style={{ marginTop:6, display:'flex', gap:14, fontSize:11, color:'#6e6e73', flexWrap:'wrap' }}>
                    <span><strong style={{color:'#1d1d1f'}}>Exp.</strong> {n.exp}</span>
                    <span><strong style={{color:'#1d1d1f'}}>Promotor</strong> {n.promotor}</span>
                    <span><strong style={{color:'#1d1d1f'}}>Registro</strong> {n.registro}</span>
                  </div>
                  <div style={{ marginTop:8, padding:'7px 10px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8, fontSize:11.5, color:'#3a3a3d' }}>
                    <strong style={{color:'#1d1d1f',fontSize:10.5,letterSpacing:'0.06em',textTransform:'uppercase',marginRight:6}}>Apoyos</strong>
                    {n.apoyo}
                  </div>
                </div>

                {/* Fase + progreso */}
                <div style={{ padding:'14px 18px', borderLeft:'1px solid #ECECEF', display:'flex', flexDirection:'column', justifyContent:'center', gap:6 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:10, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Próximo trámite</span>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:f.color }}>{f.pct}%</span>
                  </div>
                  <div style={{ height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:`${f.pct}%`, height:'100%', background:f.color, borderRadius:3, transition:'width 280ms' }}/>
                  </div>
                  <div style={{ fontSize:11.5, color:'#1d1d1f', fontWeight:500, marginTop:2 }}>{n.proxTram}</div>
                  <div style={{ fontSize:10.5, color:'#6e6e73' }}>{n.proxFecha}</div>
                </div>

                {/* Acciones */}
                <div style={{ padding:'14px 16px', borderLeft:'1px solid #ECECEF', display:'flex', flexDirection:'column', justifyContent:'center', gap:6 }}>
                  <button style={{
                    background:'#5B21B6', color:'#fff', border:'none',
                    borderRadius:8, padding:'7px 12px',
                    fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  }}>Ver expediente →</button>
                  <button style={{
                    background:'#fff', color:'#3a3a3d', border:'1px solid #ECECEF',
                    borderRadius:8, padding:'7px 12px',
                    fontSize:11, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
                  }}>Simular votación</button>
                </div>
              </article>
            )
          })}
        </div>
      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Radar Legislativo · Monitor · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function KPI({ label, value, color }: { label:string, value:string, color:string }) {
  return (
    <div style={{ textAlign:'center', padding:'12px 8px', borderRadius:12, background:'#FAFAFB', border:`1px solid ${color}33` }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, lineHeight:1, color }}>{value}</div>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6e6e73', marginTop:4 }}>{label}</div>
    </div>
  )
}

function FilterGroup({ label, children }: { label:string, children:React.ReactNode }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>{label}:</span>
      <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3 }}>{children}</div>
    </div>
  )
}

function Pill({ active, onClick, color, children }: { active:boolean, onClick:()=>void, color?:string, children:React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#fff' : 'transparent',
      color: active ? (color || '#1d1d1f') : '#6e6e73',
      border:'none', borderRadius:999, padding:'5px 11px',
      fontSize:11.5, fontWeight: active ? 700 : 500, cursor:'pointer',
      fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
      whiteSpace:'nowrap',
    }}>{children}</button>
  )
}

function BoxBtn({ active, onClick, children }: { active:boolean, onClick:()=>void, children:React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#1F4E8C' : '#fff',
      color: active ? '#fff' : '#3a3a3d',
      border:'1px solid '+(active ? '#1F4E8C' : '#ECECEF'),
      borderRadius:8, padding:'4px 10px',
      fontSize:11.5, fontWeight: active ? 600 : 500, cursor:'pointer',
      fontFamily:'inherit',
    }}>{children}</button>
  )
}

function Sep() {
  return <span style={{ width:1, height:22, background:'#ECECEF', margin:'0 4px' }}/>
}

// dd/mm/yyyy → Date
function parseDate(s: string): Date {
  const [d,m,y] = s.split('/').map(Number)
  return new Date(y, m-1, d)
}
