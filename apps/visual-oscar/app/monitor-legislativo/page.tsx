'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import LegislationMap from '@/components/LegislationMap'
import VotacionSimulator from '@/components/VotacionSimulator'
import { HParty } from '@/components/HemicycleAdvanced'
import type { Iniciativa } from '../api/legislativo/iniciativas/route'
import type { AgendaItem } from '../api/legislativo/agenda/route'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Hemicycle composition ────────────────────────────────────────────────────

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

// ─── Kanban column definitions ────────────────────────────────────────────────

type KanbanCol = {
  id: string
  label: string
  color: string
  test: (i: Iniciativa) => boolean
}

const KANBAN_COLS: KanbanCol[] = [
  {
    id: 'presentadas',
    label: 'Presentadas',
    color: '#6e6e73',
    test: i => {
      const f = (i.fase_actual || '').toLowerCase()
      const e = (i.estado || '').toLowerCase()
      return e === 'en_tramitacion' && !f.includes('comis') && !f.includes('pleno') && !f.includes('senado')
    },
  },
  {
    id: 'comision',
    label: 'En Comisión',
    color: '#F97316',
    test: i => {
      const f = (i.fase_actual || '').toLowerCase()
      return f.includes('comis') || f.includes('ponencia')
    },
  },
  {
    id: 'pleno',
    label: 'En Pleno',
    color: '#1F4E8C',
    test: i => (i.fase_actual || '').toLowerCase().includes('pleno'),
  },
  {
    id: 'senado',
    label: 'En Senado',
    color: '#5B21B6',
    test: i => (i.fase_actual || '').toLowerCase().includes('senado'),
  },
  {
    id: 'aprobadas',
    label: 'Aprobadas',
    color: '#16A34A',
    test: i => (i.estado || '').toLowerCase() === 'aprobada',
  },
]

const TIPO_COLOR: Record<string, string> = {
  proyecto_ley: '#1F4E8C',
  decreto_ley: '#DC2626',
  proposicion_ley: '#5B21B6',
  reforma_estatuto: '#0F766E',
  otro: '#9CA3AF',
}
const TIPO_LABEL: Record<string, string> = {
  proyecto_ley: 'PL',
  decreto_ley: 'RDL',
  proposicion_ley: 'PPL',
  reforma_estatuto: 'RE',
  otro: 'OTRO',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MonitorLegislativoPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data: feed, source, updatedAt, refresh } = useApi<LegislativoFeed>(
    '/api/legislativo/feed?days=7&limit=20',
    { refreshInterval: 300_000 }
  )
  const { data: iniciativasData } = useApi<{ items: Iniciativa[] }>('/api/legislativo/iniciativas', { refreshInterval: 600_000 })
  const { data: agendaData }     = useApi<{ items: AgendaItem[] }>('/api/legislativo/agenda', { refreshInterval: 600_000 })

  const boeItems    = feed?.items || []
  const iniciativas = iniciativasData?.items || []
  const agendaItems = agendaData?.items || []

  // ─── AI analysis state ───────────────────────────────────────────────────

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
          id: item.id, titulo: item.titulo,
          departamento: item.departamento,
          tipo: item.tipo, materia: item.materia,
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

  // ─── BOE filters ─────────────────────────────────────────────────────────

  const [boeSearch, setBoeSearch]   = useState('')
  const [boeTipo, setBoeTipo]       = useState('Todos')
  const [boeMinScore, setBoeMinScore] = useState(0)

  const boeTipos = useMemo(() => {
    const all = new Set(boeItems.map(i => i.tipo))
    return ['Todos', ...Array.from(all).sort()]
  }, [boeItems])

  const filteredBoe = useMemo(() => {
    return boeItems.filter(it => {
      if (boeTipo !== 'Todos' && it.tipo !== boeTipo) return false
      if (it.importance < boeMinScore) return false
      if (boeSearch) {
        const q = boeSearch.toLowerCase()
        if (!it.titulo.toLowerCase().includes(q) && !it.departamento.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [boeItems, boeTipo, boeMinScore, boeSearch])

  // ─── KPIs ────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => ({
    en_tramite:  iniciativas.filter(i => i.estado !== 'aprobada' && i.estado !== 'rechazada').length,
    boe_hoy:     feed?.summary?.total_items ?? 0,
    urgentes:    agendaItems.filter(a => a.tipo === 'votacion' && a.dias_hasta <= 7).length,
    alto_impacto: feed?.summary?.high_impact_count ?? 0,
    decreto_ley: iniciativas.filter(i => i.tipo === 'decreto_ley').length,
  }), [iniciativas, agendaItems, feed])

  // ─── Sorted agenda ───────────────────────────────────────────────────────

  const sortedAgenda = useMemo(() =>
    [...agendaItems].sort((a, b) => a.dias_hasta - b.dias_hasta),
    [agendaItems]
  )

  // ─── Kanban ──────────────────────────────────────────────────────────────

  const kanban = useMemo(() => {
    return KANBAN_COLS.map(col => {
      const cards = iniciativas.filter(col.test)
      return { ...col, cards }
    })
  }, [iniciativas])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* ─── Hero bar ─────────────────────────────────────────────────── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:18,
          padding:'20px 28px', marginBottom:18, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ marginBottom:14 }}>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', color:'#6e6e73', textTransform:'uppercase', margin:'0 0 6px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <span>RADAR LEGISLATIVO · MONITOR EN TIEMPO REAL</span>
              <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={300} onRefresh={refresh}/>
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:26, letterSpacing:'-0.022em', margin:0, lineHeight:1.1 }}>
              Monitor Legislativo · <em style={{ fontWeight:300, fontStyle:'italic', color:'#5B21B6' }}>{kpis.en_tramite} iniciativas en tramitación</em>
            </h1>
          </div>

          {/* ─── KPI Strip ─────────────────────────────────────────────── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
            <KpiCard label="EN TRÁMITE"    value={kpis.en_tramite}    color="#5B21B6" live/>
            <KpiCard label="BOE (7 DÍAS)"  value={kpis.boe_hoy}       color="#0F766E" live/>
            <KpiCard label="VOTACIONES 7D" value={kpis.urgentes}      color="#DC2626" live={kpis.urgentes > 0}/>
            <KpiCard label="ALTO IMPACTO"  value={kpis.alto_impacto}  color="#F97316"/>
            <KpiCard label="DECRETOS-LEY"  value={kpis.decreto_ley}   color="#1F4E8C"/>
          </div>
        </section>

        {/* ─── Legislation Map ──────────────────────────────────────────── */}
        <LegislationMap/>

        {/* ─── Section B: BOE Feed ──────────────────────────────────────── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:18,
          padding:'22px 28px', marginBottom:18, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14, flexWrap:'wrap', marginBottom:14 }}>
            <div>
              <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', color:'#0F766E', textTransform:'uppercase', margin:'0 0 4px' }}>
                BOE · DISPOSICIONES EN VIVO · ÚLTIMOS 7 DÍAS
              </p>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, letterSpacing:'-0.018em', margin:'0 0 4px', color:'#1d1d1f' }}>
                {feed?.summary.total_items || 0} disposiciones · {filteredBoe.length} mostradas · scoring por importancia
              </h2>
            </div>
            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              <SmallKPI label="ALTO IMP." value={String(feed?.summary.high_impact_count || 0)} color="#DC2626"/>
              <SmallKPI label="URGENTES"  value={String(feed?.summary.urgent_count || 0)}     color="#F97316"/>
              <SmallKPI label="UE"        value={String(feed?.summary.eu_count || 0)}          color="#0F766E"/>
            </div>
          </div>

          {/* Filter bar */}
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:14, padding:'10px 12px', background:'#FAFAFB', borderRadius:10, border:'1px solid #ECECEF' }}>
            <select
              value={boeTipo}
              onChange={e => setBoeTipo(e.target.value)}
              style={{ fontSize:12, padding:'5px 8px', borderRadius:7, border:'1px solid #ECECEF', background:'#fff', color:'#1d1d1f', fontFamily:'inherit', cursor:'pointer' }}
            >
              {boeTipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, whiteSpace:'nowrap' }}>Score ≥ {boeMinScore}</span>
              <input
                type="range" min={0} max={90} step={10} value={boeMinScore}
                onChange={e => setBoeMinScore(Number(e.target.value))}
                style={{ width:80, cursor:'pointer' }}
              />
            </div>
            <input
              type="text" placeholder="Buscar…" value={boeSearch}
              onChange={e => setBoeSearch(e.target.value)}
              style={{ fontSize:12, padding:'5px 10px', borderRadius:7, border:'1px solid #ECECEF', background:'#fff', color:'#1d1d1f', fontFamily:'inherit', minWidth:160, flex:'1 1 auto' }}
            />
          </div>

          {filteredBoe.length === 0 ? (
            <div style={{ padding:'30px', textAlign:'center', color:'#6e6e73', fontSize:13 }}>
              {feed ? 'Sin disposiciones con esos filtros.' : 'Cargando feed del BOE…'}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filteredBoe.map(it => {
                const an = analyses[it.id]
                const busy = analyzing[it.id]
                const impColor = it.importance >= 80 ? '#DC2626' : it.importance >= 60 ? '#F97316' : it.importance >= 35 ? '#1F4E8C' : '#9CA3AF'
                return (
                  <div key={it.id} style={{
                    padding:'12px 16px', borderRadius:12,
                    background:'#fafafa', border:'1px solid #ECECEF',
                    borderLeft:`3px solid ${impColor}`,
                  }}>
                    <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:12, alignItems:'flex-start' }}>
                      {/* Score badge */}
                      <div style={{
                        background: impColor, color:'#fff', borderRadius:9, padding:'8px 12px',
                        textAlign:'center', minWidth:50, flexShrink:0,
                      }}>
                        <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, lineHeight:1 }}>{it.importance}</div>
                        <div style={{ fontSize:8.5, marginTop:2, opacity:0.85, fontWeight:700, letterSpacing:'0.08em' }}>SCORE</div>
                      </div>

                      {/* Body */}
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                          <span style={{ fontSize:9.5, fontWeight:800, padding:'2px 7px', borderRadius:4, background:'#1F4E8C', color:'#fff', letterSpacing:'0.05em' }}>{it.tipo}</span>
                          <span style={{ fontSize:9.5, fontWeight:700, padding:'2px 7px', borderRadius:4, background:'#0F766E15', color:'#0F766E', border:'1px solid #0F766E40' }}>{it.materia}</span>
                          <span style={{ fontSize:10.5, color:'#6e6e73' }}>{it.fecha}</span>
                        </div>
                        <a href={it.url_html} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none', color:'#1d1d1f' }}>
                          <p style={{ margin:'0 0 3px', fontSize:13, fontWeight:600, lineHeight:1.3 }}>
                            {it.titulo.length > 80 ? it.titulo.slice(0, 80) + '…' : it.titulo}
                          </p>
                        </a>
                        <p style={{ margin:'0 0 5px', fontSize:11, color:'#6e6e73' }}>{it.departamento}</p>
                        {it.tags.length > 0 && (
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                            {it.tags.map(t => <span key={t} style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:3, background:'rgba(0,0,0,0.04)', color:'#3a3a3d' }}>{t}</span>)}
                          </div>
                        )}
                        {an && (
                          <div style={{ marginTop:8, padding:'8px 10px', borderRadius:8, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.18)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5, flexWrap:'wrap' }}>
                              <span style={{ fontSize:9, fontWeight:800, color:'#fff', background: an.llm_source==='ollama'?'#7C3AED': an.llm_source==='backend'?'#10b981':'#9CA3AF', padding:'2px 6px', borderRadius:3, letterSpacing:'0.04em' }}>
                                {an.llm_source === 'ollama' ? 'OLLAMA' : an.llm_source === 'backend' ? 'BACKEND' : 'FALLBACK'}
                              </span>
                              {an.urgencia && <span style={{ fontSize:10, fontWeight:600, color:'#7C3AED' }}>Urgencia: {an.urgencia}</span>}
                              {typeof an.impacto_politico === 'number' && (
                                <span style={{ fontSize:10, fontWeight:600, color: an.impacto_politico < -10 ? '#DC2626' : an.impacto_politico > 10 ? '#16A34A' : '#6e6e73' }}>
                                  Impacto político: {an.impacto_politico > 0 ? '+' : ''}{an.impacto_politico}
                                </span>
                              )}
                              {an.pronostico && <span style={{ fontSize:10, color:'#6e6e73' }}>· Pronóstico: <strong style={{ color:'#1d1d1f' }}>{an.pronostico}</strong></span>}
                            </div>
                            {an.resumen && <p style={{ margin:'0 0 5px', fontSize:11.5, lineHeight:1.4, color:'#1d1d1f' }}>{an.resumen}</p>}
                            <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                              {(an.sectores_afectados || []).map(s => <span key={s} style={{ fontSize:9, padding:'1px 5px', borderRadius:3, background:'#0F766E15', color:'#0F766E' }}>{s}</span>)}
                              {(an.actores_politicos || []).map(s => <span key={s} style={{ fontSize:9, padding:'1px 5px', borderRadius:3, background:'#5B21B615', color:'#5B21B6' }}>{s}</span>)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
                        <button onClick={() => analyze(it)} disabled={busy || !!an} style={{
                          background: an ? '#16A34A' : busy ? '#9CA3AF' : 'linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)',
                          color:'#fff', border:'none', borderRadius:8, padding:'7px 12px',
                          fontSize:11, fontWeight:700, cursor: busy || an ? 'default' : 'pointer',
                          fontFamily:'inherit', whiteSpace:'nowrap', transition:'opacity 160ms',
                        }}>
                          {an ? 'Analizado' : busy ? 'Analizando…' : 'Analizar con IA'}
                        </button>
                        {it.url_pdf && (
                          <a href={it.url_pdf} target="_blank" rel="noopener noreferrer" style={{
                            background:'#fff', color:'#3a3a3d', border:'1px solid #ECECEF',
                            borderRadius:8, padding:'5px 10px',
                            fontSize:10.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
                            textDecoration:'none', textAlign:'center', whiteSpace:'nowrap',
                          }}>PDF →</a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ─── Two column layout: Agenda + Kanban ───────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:16, marginBottom:18 }}>

          {/* ─── Section C: Agenda ──────────────────────────────────────── */}
          <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:18,
            padding:'20px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', color:'#5B21B6', textTransform:'uppercase', margin:'0 0 4px' }}>
              AGENDA PARLAMENTARIA
            </p>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, letterSpacing:'-0.016em', margin:'0 0 14px', color:'#1d1d1f' }}>
              Próximas sesiones
            </h2>
            {sortedAgenda.length === 0 ? (
              <div style={{ padding:'20px 0', textAlign:'center', color:'#6e6e73', fontSize:12 }}>
                Cargando agenda…
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {sortedAgenda.slice(0, 8).map(item => {
                  const dateColor = item.dias_hasta <= 3 ? '#DC2626'
                    : item.dias_hasta <= 7 ? '#F97316' : '#1F4E8C'
                  const tipoColor: Record<string, string> = {
                    votacion: '#DC2626', debate: '#1F4E8C',
                    comparecencia: '#F97316', sesion: '#6e6e73',
                  }
                  return (
                    <div key={item.id} style={{
                      padding:'10px 12px', borderRadius:10, border:'1px solid #ECECEF',
                      borderLeft:`3px solid ${dateColor}`, background:'#FAFAFB',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{
                          fontSize:10.5, fontWeight:700, color:'#fff',
                          background: dateColor, padding:'2px 8px', borderRadius:999,
                        }}>
                          {item.dias_hasta <= 0 ? 'HOY' : item.dias_hasta === 1 ? 'MAÑANA' : `+${item.dias_hasta}d`}
                        </span>
                        <span style={{
                          fontSize:9.5, fontWeight:700, padding:'2px 6px', borderRadius:4,
                          background:`${tipoColor[item.tipo] || '#6e6e73'}15`,
                          color: tipoColor[item.tipo] || '#6e6e73',
                          border:`1px solid ${tipoColor[item.tipo] || '#6e6e73'}40`,
                          textTransform:'uppercase', letterSpacing:'0.04em',
                        }}>{item.tipo}</span>
                      </div>
                      <p style={{ margin:'0 0 3px', fontSize:12, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>
                        {item.organo}
                      </p>
                      <p style={{ margin:'0 0 5px', fontSize:11, color:'#6e6e73', lineHeight:1.35 }}>
                        {item.asunto.length > 100 ? item.asunto.slice(0, 100) + '…' : item.asunto}
                      </p>
                      {item.expedientes_relacionados.length > 0 && (
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                          {item.expedientes_relacionados.map(exp => (
                            <span key={exp} style={{
                              fontSize:9.5, fontWeight:700, padding:'1px 5px', borderRadius:3,
                              background:'rgba(91,33,182,0.08)', color:'#5B21B6',
                              border:'1px solid rgba(91,33,182,0.15)', cursor:'pointer',
                            }}>{exp}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ─── Section D: Kanban ──────────────────────────────────────── */}
          <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:18,
            padding:'20px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
            overflow:'hidden',
          }}>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', color:'#F97316', textTransform:'uppercase', margin:'0 0 4px' }}>
              KANBAN DE TRAMITACIÓN
            </p>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, letterSpacing:'-0.016em', margin:'0 0 14px', color:'#1d1d1f' }}>
              Estado de las iniciativas
            </h2>
            {iniciativas.length === 0 ? (
              <div style={{ padding:'20px 0', textAlign:'center', color:'#6e6e73', fontSize:12 }}>
                Cargando iniciativas…
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, overflowX:'auto' }}>
                {kanban.map(col => (
                  <div key={col.id} style={{ minWidth:130 }}>
                    {/* Column header */}
                    <div style={{
                      padding:'6px 10px', borderRadius:8, marginBottom:8,
                      background:`${col.color}15`, border:`1px solid ${col.color}30`,
                      textAlign:'center',
                    }}>
                      <div style={{ fontSize:9.5, fontWeight:800, color: col.color, letterSpacing:'0.06em', textTransform:'uppercase' }}>{col.label}</div>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color: col.color, lineHeight:1.1, marginTop:2 }}>{col.cards.length}</div>
                    </div>

                    {/* Cards */}
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {col.cards.slice(0, 4).map(ini => (
                        <div key={ini.id} style={{
                          padding:'8px 9px', borderRadius:8, border:'1px solid #ECECEF',
                          background:'#FAFAFB', position:'relative',
                        }}>
                          <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:4 }}>
                            <span style={{
                              fontSize:8.5, fontWeight:800, padding:'1px 5px', borderRadius:3,
                              background: TIPO_COLOR[ini.tipo] || '#9CA3AF', color:'#fff',
                              letterSpacing:'0.04em',
                            }}>{TIPO_LABEL[ini.tipo] || 'OTRO'}</span>
                            <span style={{
                              marginLeft:'auto', fontSize:9.5, fontWeight:800,
                              color: ini.score_importancia >= 8.5 ? '#DC2626' : ini.score_importancia >= 7 ? '#F97316' : '#5B21B6',
                            }}>{ini.score_importancia}</span>
                          </div>
                          <p style={{ margin:'0 0 3px', fontSize:10.5, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>
                            {ini.titulo_corto}
                          </p>
                          {ini.comision && (
                            <p style={{ margin:0, fontSize:9, color:'#86868b', lineHeight:1.2 }}>
                              {ini.comision.length > 28 ? ini.comision.slice(0, 28) + '…' : ini.comision}
                            </p>
                          )}
                          {ini.url_congreso && (
                            <a href={ini.url_congreso} target="_blank" rel="noopener noreferrer" style={{
                              display:'inline-block', marginTop:4, fontSize:9, color:'#5B21B6', fontWeight:600,
                              textDecoration:'none',
                            }}>Ver →</a>
                          )}
                        </div>
                      ))}
                      {col.cards.length > 4 && (
                        <div style={{
                          padding:'6px', borderRadius:8, border:'1px dashed #ECECEF',
                          textAlign:'center', fontSize:10.5, color:'#6e6e73', fontWeight:600,
                        }}>
                          +{col.cards.length - 4} más
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ─── Section E: Hemicycle + Simulator ────────────────────────── */}
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
                <strong style={{ color:'#1d1d1f' }}> Mayoría simple</strong> (leyes ordinarias) ·
                <strong style={{ color:'#1d1d1f' }}> 176</strong> (orgánicas, investidura) ·
                <strong style={{ color:'#1d1d1f' }}> 210 (3/5)</strong> ·
                <strong style={{ color:'#1d1d1f' }}> 234 (2/3)</strong>
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

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Radar Legislativo · Monitor · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, live }: { label: string; value: number; color: string; live?: boolean }) {
  return (
    <div style={{
      textAlign:'center', padding:'14px 10px', borderRadius:12,
      background:'#FAFAFB', border:`1px solid ${color}30`,
      position:'relative',
    }}>
      {live && (
        <span style={{
          position:'absolute', top:8, right:10,
          width:7, height:7, borderRadius:'50%',
          background:'#16A34A',
          boxShadow:'0 0 0 2px rgba(22,163,74,0.25)',
          animation:'pulse 2s infinite',
        }}/>
      )}
      <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, lineHeight:1, color }}>
        {value}
      </div>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6e6e73', marginTop:5 }}>
        {label}
      </div>
    </div>
  )
}

function SmallKPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign:'center', padding:'8px 10px', borderRadius:10, background:'#FAFAFB', border:`1px solid ${color}25`, minWidth:60 }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, lineHeight:1, color }}>{value}</div>
      <div style={{ fontSize:8.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6e6e73', marginTop:3 }}>{label}</div>
    </div>
  )
}
