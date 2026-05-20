'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useCrisis } from '@/hooks/useCrisis'
import type { Severidad, Fase, TipoCrisis, StakePos } from '@/data/crisis-fixture'

// ─────────────────────────────────────────────────────────────────────────
// UI maps (colores / metadatos visuales)
// ─────────────────────────────────────────────────────────────────────────
const SEV_META: Record<Severidad, { color: string }> = {
 'CRÍTICA': { color:'#DC2626' },
 'ALTA':    { color:'#F97316' },
 'MEDIA':   { color:'#EAB308' },
 'BAJA':    { color:'#0EA5E9' },
}

const TIPO_META: Record<TipoCrisis, { color: string }> = {
 'Política':    { color:'#1F4E8C' },
 'Económica':   { color:'#16A34A' },
 'Sanitaria':   { color:'#0EA5E9' },
 'Mediática':   { color:'#7C3AED' },
 'Tecnológica': { color:'#5B21B6' },
 'Climática':   { color:'#0F766E' },
 'Diplomática': { color:'#B45309' },
 'Social':      { color:'#DC2626' },
 'Energética':  { color:'#F97316' },
 'Migratoria':  { color:'#9333EA' },
}

const FASE_META: Record<Fase, { color: string; pct: number }> = {
 'Detección':   { color:'#0EA5E9', pct: 15 },
 'Activa':      { color:'#DC2626', pct: 40 },
 'Contención':  { color:'#F97316', pct: 65 },
 'Resolución':  { color:'#16A34A', pct: 85 },
 'Cerrada':     { color:'#525258', pct: 100 },
}

const POS_COLOR: Record<StakePos, string> = {
 'aliado': '#16A34A',
 'neutral': '#6e6e73',
 'opositor': '#DC2626',
}

const IMP_COLOR = { 'positivo':'#16A34A', 'neutral':'#6e6e73', 'negativo':'#DC2626' } as const
const ACC_META = { 'Pendiente': '#6e6e73', 'En curso':'#5B21B6', 'Completada':'#16A34A' } as const


// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function CrisisPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { crisis: CRISIS, playbooks: PLAYBOOKS } = useCrisis()

  const [selectedId, setSelectedId] = useState<string>('')
  const [tab, setTab] = useState<'timeline' | 'stakeholders' | 'acciones' | 'metricas' | 'playbook'>('timeline')
  const [filterSev, setFilterSev] = useState<Severidad | 'Todas'>('Todas')

  useEffect(() => {
    if (!selectedId && CRISIS.length > 0) setSelectedId(CRISIS[0].id)
  }, [selectedId, CRISIS])

  const selected = useMemo(
    () => CRISIS.find(c => c.id === selectedId) ?? CRISIS[0],
    [CRISIS, selectedId],
  )

  const totals = useMemo(() => {
    const cri = CRISIS.filter(c => c.severidad === 'CRÍTICA').length
    const alt = CRISIS.filter(c => c.severidad === 'ALTA').length
    const activas = CRISIS.filter(c => c.fase === 'Activa' || c.fase === 'Detección' || c.fase === 'Contención').length
    const accionesAbiertas = CRISIS.reduce((s, c) => s + c.acciones.filter(a => a.estado !== 'Completada').length, 0)
    return { total: CRISIS.length, cri, alt, activas, accionesAbiertas }
  }, [CRISIS])

  const visibles = useMemo(() => CRISIS.filter(c => filterSev === 'Todas' || c.severidad === filterSev), [CRISIS, filterSev])

  if (!selected) {
    return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>
 <p style={{ fontSize:13, color:'#6e6e73' }}>Cargando crisis…</p>
 </main>
 </div>
    )
  }

  return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* Cross-reference to the structural risk engine */}
 <RiskContextStrip/>

        {/* ───── Hero ───── */}
 <section style={{
          background:'linear-gradient(135deg,#7F1D1D 0%,#1A0202 100%)',
          borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
          position:'relative', overflow:'hidden',
        }}>
          {/* Pulso decorativo */}
 <div style={{
            position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%',
            background:'radial-gradient(circle, #DC2626aa 0%, transparent 60%)',
            animation:'none',
          }}/>
 <div style={{ position:'relative' }}>
 <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
 <span style={{ color:'#FCA5A5', marginRight:6 }}>●</span> RIESGO · CRISIS INTELLIGENCE EN TIEMPO REAL
 </p>
 <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
           {totals.activas} crisis activas <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>requieren atención</em>
 </h1>
 <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              {totals.cri} {totals.cri === 1 ? 'crítica' : 'críticas'} · {totals.alt} {totals.alt === 1 ? 'alta' : 'altas'} · {totals.accionesAbiertas} acciones abiertas pendientes de ejecución.
              Monitorización 24/7 con alertas automáticas, gestión de stakeholders y playbooks por tipo de crisis.
 </p>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, position:'relative' }}>
 <HeroKPI label="Crisis" value={String(totals.total)} accent="#FCA5A5"/>
 <HeroKPI label="Críticas" value={String(totals.cri)}   accent="#DC2626"/>
 <HeroKPI label="Activas" value={String(totals.activas)} accent="#F97316"/>
 <HeroKPI label="Acciones" value={String(totals.accionesAbiertas)} accent="#EAB308"/>
 </div>
 </section>

        {/* ───── Filtro y selector de crisis (cards) ───── */}
 <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap' }}>
 <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Severidad:</span>
 <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3 }}>
            {(['Todas','CRÍTICA','ALTA','MEDIA','BAJA'] as const).map(s => {
              const active = filterSev === s
              const col = s === 'Todas' ? '#1d1d1f' : SEV_META[s].color
              return (
 <button key={s} onClick={() => setFilterSev(s)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? col : '#6e6e73',
                  border:'none', borderRadius:999, padding:'4px 12px',
                  fontSize:11, fontWeight: active ? 700 : 500, cursor:'pointer',
                  fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>{s}</button>
              )
            })}
 </div>
 <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{visibles.length} crisis visibles</span>
 </div>

 <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))', gap:10, marginBottom:18 }}>
          {visibles.map(c => {
            const sev = SEV_META[c.severidad]
            const tm = TIPO_META[c.tipo]
            const fm = FASE_META[c.fase]
            const active = c.id === selectedId
            const sentColor = c.metricas.sentimiento >= 0 ? '#16A34A' : c.metricas.sentimiento >= -0.2 ? '#F97316' : '#DC2626'
            return (
 <button key={c.id} onClick={() => setSelectedId(c.id)} style={{
                textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                background:'#fff', border:`1px solid ${active ? sev.color : '#ECECEF'}`,
                borderRadius:14, overflow:'hidden',
                boxShadow: active ? `0 0 0 3px ${sev.color}22` : '0 1px 3px rgba(0,0,0,0.04)',
                borderLeft:`4px solid ${sev.color}`,
                padding:0, transition:'box-shadow 200ms',
              }}>
 <header style={{ padding:'12px 14px 8px', borderBottom:'1px solid #F5F5F7' }}>
 <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, flexWrap:'wrap' }}>
 <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:4,
                      background:sev.color, color:'#fff',
                    }}>● {c.severidad}</span>
 <span style={{
                      fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:4,
                      background:`${tm.color}15`, color:tm.color, border:`1px solid ${tm.color}40`,
                    }}>{c.tipo.toUpperCase()}</span>
 <span style={{
                      fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${fm.color}15`, color:fm.color, border:`1px solid ${fm.color}40`,
                    }}>{c.fase.toUpperCase()}</span>
 </div>
 <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, letterSpacing:'-0.012em', color:'#1d1d1f', lineHeight:1.25 }}>{c.titulo}</h3>
 <div style={{ fontSize:10.5, color:'#6e6e73' }}>{c.ubicacion}</div>
 </header>
 <div style={{ padding:'10px 14px 12px' }}>
 <p style={{ margin:'0 0 8px', fontSize:11.5, color:'#3a3a3d', lineHeight:1.45,
                              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{c.resumen}</p>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
 <Mini label="Impacto" value={`${c.metricas.impactoMediatico}`} sub="/100" color={sev.color}/>
 <Mini label="Sent." value={`${c.metricas.sentimiento >= 0 ? '+' : ''}${c.metricas.sentimiento.toFixed(2)}`} sub="" color={sentColor}/>
 <Mini label="Spike" value={`+${c.metricas.spike}%`} sub="24h" color="#5B21B6"/>
 </div>
 </div>
 </button>
            )
          })}
 </section>

        {/* ───── Cabecera del expediente seleccionado ───── */}
 <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'18px 24px', marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          borderLeft:`5px solid ${SEV_META[selected.severidad].color}`,
        }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:18, flexWrap:'wrap', marginBottom:10 }}>
 <div style={{ flex:'1 1 460px', minWidth:0 }}>
 <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
 <span style={{
                  fontSize:9.5, fontWeight:800, letterSpacing:'0.08em',
                  padding:'3px 8px', borderRadius:6,
                  background:SEV_META[selected.severidad].color, color:'#fff',
                }}>● {selected.severidad}</span>
 <span style={{
                  fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                  padding:'3px 8px', borderRadius:6,
                  background:`${TIPO_META[selected.tipo].color}15`, color:TIPO_META[selected.tipo].color, border:`1px solid ${TIPO_META[selected.tipo].color}40`,
                }}>{selected.tipo.toUpperCase()}</span>
 <span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>· INICIO: {selected.inicio}</span>
 <span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>· ÚLT: {selected.actualizacion}</span>
 </div>
 <h2 style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:600, letterSpacing:'-0.018em', margin:'0 0 4px', color:'#1d1d1f', lineHeight:1.2 }}>
                {selected.titulo}
 </h2>
 <p style={{ margin:'0 0 6px', fontSize:11.5, color:'#6e6e73' }}>{selected.ubicacion}</p>
 <p style={{ margin:0, fontSize:13, color:'#3a3a3d', lineHeight:1.5 }}>{selected.resumen}</p>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(2,auto)', gap:8 }}>
 <CardKPI label="Impacto" value={`${selected.metricas.impactoMediatico}`} sub="/100" color={SEV_META[selected.severidad].color}/>
 <CardKPI label="Sentim." value={`${selected.metricas.sentimiento >= 0 ? '+' : ''}${selected.metricas.sentimiento.toFixed(2)}`} sub="-1..+1" color={selected.metricas.sentimiento >= 0 ? '#16A34A' : '#DC2626'}/>
 <CardKPI label="Audien." value={selected.metricas.audienciaPotencial} sub="potencial" color="#5B21B6"/>
 <CardKPI label="Mencs." value={`${selected.metricas.menciones24h}K`} sub="24 h" color="#0EA5E9"/>
 </div>
 </div>
          {/* Barra de progreso de fase */}
 <div style={{ marginTop:14 }}>
 <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>
 <span>Fase: <span style={{ color:FASE_META[selected.fase].color }}>{selected.fase}</span></span>
 <span>{FASE_META[selected.fase].pct}% del ciclo</span>
 </div>
 <div style={{ display:'flex', height:8, background:'#F5F5F7', borderRadius:4, overflow:'hidden' }}>
              {(['Detección','Activa','Contención','Resolución','Cerrada'] as Fase[]).map(f => {
                const isPast = FASE_META[f].pct <= FASE_META[selected.fase].pct
                return (
 <div key={f} style={{ flex:1, background: isPast ? FASE_META[selected.fase].color : 'transparent', borderRight: f !== 'Cerrada' ? '2px solid #fff' : 'none' }}/>
                )
              })}
 </div>
 </div>
 </section>

        {/* ───── Tabs ───── */}
 <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'timeline',     label:'Timeline',         count: selected.hitos.length },
            { k:'stakeholders', label:'Stakeholders',     count: selected.stakeholders.length },
            { k:'acciones',     label:'Plan de acción',   count: selected.acciones.length },
            { k:'metricas',     label:'Métricas y riesgos', count: selected.riesgos.length },
            { k:'playbook',     label:'Playbook',         count: PLAYBOOKS.find(p => p.tipo === selected.tipo) ? 1 : 0 },
          ] as const).map(t => {
            const active = tab === t.k
            return (
 <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border:'none', borderRadius:999, padding:'7px 14px',
                fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer',
                fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>
                {t.label} <span style={{ marginLeft:5, color: active ? SEV_META[selected.severidad].color : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
 </button>
            )
          })}
 </div>

        {/* ───── TAB · Timeline ───── */}
        {tab === 'timeline' && (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <div style={{ position:'relative' }}>
 <div style={{ position:'absolute', left:55, top:6, bottom:6, width:2, background:'#ECECEF' }}/>
              {[...selected.hitos].reverse().map((h, i) => (
 <div key={i} style={{
                  display:'grid', gridTemplateColumns:'42px 18px 1fr 70px',
                  gap:12, alignItems:'flex-start',
                  padding: i === 0 ? '0 0 14px 0' : '14px 0',
                  borderTop: i === 0 ? 'none' : '1px solid #FAFAFB',
                }}>
 <div style={{ textAlign:'right' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:'#1d1d1f' }}>{h.fecha.slice(0,5)}</div>
 <div style={{ fontSize:10, color:'#6e6e73', fontWeight:600 }}>{h.hora}</div>
 </div>
 <div style={{ position:'relative', width:18, height:18 }}>
 <div style={{
                      width:14, height:14, borderRadius:'50%', background:'#fff',
                      border:`3px solid ${IMP_COLOR[h.impacto]}`,
                      boxShadow:`0 0 0 3px ${IMP_COLOR[h.impacto]}22`,
                      position:'absolute', top:3, left:2, zIndex:1,
                    }}/>
 </div>
 <div style={{ minWidth:0 }}>
 <p style={{ margin:0, fontSize:12.5, color:'#1d1d1f', fontWeight:500, lineHeight:1.4 }}>{h.evento}</p>
 <div style={{ fontSize:10.5, color:'#6e6e73', marginTop:3, fontWeight:600 }}>· {h.fuente}</div>
 </div>
 <span style={{
                    fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                    padding:'2px 7px', borderRadius:999, alignSelf:'center', textAlign:'center',
                    background:`${IMP_COLOR[h.impacto]}15`, color:IMP_COLOR[h.impacto], border:`1px solid ${IMP_COLOR[h.impacto]}40`,
                  }}>{h.impacto.toUpperCase()}</span>
 </div>
              ))}
 </div>
 </section>
        )}

        {/* ───── TAB · Stakeholders ───── */}
        {tab === 'stakeholders' && (
 <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:10 }}>
            {selected.stakeholders.map((s, i) => (
 <article key={i} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                padding:'12px 14px', display:'grid', gridTemplateColumns:'auto 1fr', gap:11, alignItems:'center',
                borderLeft:`3px solid ${POS_COLOR[s.posicion]}`,
              }}>
 <div style={{
                  width:38, height:38, borderRadius:'50%', background:POS_COLOR[s.posicion], color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, flexShrink:0,
                }}>{s.nombre.split(/[\s·]+/).filter(Boolean).slice(0,2).map(n => n[0]).join('').toUpperCase()}</div>
 <div style={{ minWidth:0 }}>
 <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.nombre}</div>
 <div style={{ fontSize:10.5, color:'#6e6e73', marginTop:1 }}>{s.rol}</div>
 <div style={{ marginTop:5 }}>
 <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${POS_COLOR[s.posicion]}15`, color:POS_COLOR[s.posicion], border:`1px solid ${POS_COLOR[s.posicion]}40`,
                    }}>{s.posicion.toUpperCase()}</span>
 </div>
 </div>
 </article>
            ))}
 </section>
        )}

        {/* ───── TAB · Plan de acción ───── */}
        {tab === 'acciones' && (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
 <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:760 }}>
 <thead>
 <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['Acción','Responsable','Plazo','Estado'].map(h => (
 <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
 </tr>
 </thead>
 <tbody>
                  {selected.acciones.map((a, i) => (
 <tr key={i} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
 <td style={{ padding:'10px 14px', fontWeight:600, color:'#1d1d1f' }}>{a.accion}</td>
 <td style={{ padding:'10px 14px', color:'#3a3a3d' }}>{a.responsable}</td>
 <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', color:'#1d1d1f', whiteSpace:'nowrap' }}>{a.plazo}</td>
 <td style={{ padding:'10px 14px' }}>
 <span style={{
                          fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                          padding:'2px 8px', borderRadius:999,
                          background:`${ACC_META[a.estado]}15`, color:ACC_META[a.estado], border:`1px solid ${ACC_META[a.estado]}40`,
                        }}>
                          {a.estado.toUpperCase()}
 </span>
 </td>
 </tr>
                  ))}
 </tbody>
 </table>
 </div>
 </section>
        )}

        {/* ───── TAB · Métricas y riesgos ───── */}
        {tab === 'metricas' && (
 <section style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
 <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <h3 style={{ margin:'0 0 14px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Métricas mediáticas</h3>
 <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
 <Metric label="Impacto mediático" value={selected.metricas.impactoMediatico} max={100} unit="/100" color={SEV_META[selected.severidad].color}/>
 <Metric label="Sentimiento (−1..+1)" value={Math.round((selected.metricas.sentimiento + 1) * 50)} max={100} unit={`${selected.metricas.sentimiento >= 0 ? '+' : ''}${selected.metricas.sentimiento.toFixed(2)}`} color={selected.metricas.sentimiento >= 0 ? '#16A34A' : '#DC2626'}/>
 <Metric label="Spike de menciones 24h" value={Math.min(100, selected.metricas.spike)} max={100} unit={`+${selected.metricas.spike}%`} color="#5B21B6"/>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:6 }}>
 <Mini label="Audien. potencial" value={selected.metricas.audienciaPotencial}        sub="alcance" color="#5B21B6"/>
 <Mini label="Menciones 24h" value={`${selected.metricas.menciones24h}K`}        sub="vol. total" color="#0EA5E9"/>
 </div>
 </div>
 </div>
 <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <h3 style={{ margin:'0 0 14px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em', color:'#DC2626' }}>Riesgos identificados</h3>
 <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {selected.riesgos.map(r => (
 <div key={r} style={{
                    background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10,
                    padding:'10px 12px', display:'flex', gap:9, alignItems:'flex-start',
                  }}>
 <span style={{ color:'#DC2626', fontWeight:800, flexShrink:0, fontSize:14, lineHeight:1.2 }}>!</span>
 <span style={{ fontSize:12.5, color:'#7F1D1D', lineHeight:1.4 }}>{r}</span>
 </div>
                ))}
 </div>
 </div>
 </section>
        )}

        {/* ───── TAB · Playbook ───── */}
        {tab === 'playbook' && (() => {
          const pb = PLAYBOOKS.find(p => p.tipo === selected.tipo)
          if (!pb) return (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'30px', textAlign:'center', color:'#6e6e73', fontSize:13 }}>
              No hay playbook específico para crisis de tipo <strong>{selected.tipo}</strong>.
 </section>
          )
          const tm = TIPO_META[pb.tipo]
          return (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
 <span style={{ width:4, height:22, borderRadius:2, background:tm.color, display:'inline-block' }}/>
 <h3 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, letterSpacing:'-0.014em' }}>{pb.nombre}</h3>
 </div>
 <p style={{ margin:'0 0 16px', fontSize:12.5, color:'#3a3a3d', lineHeight:1.5 }}>{pb.descripcion}</p>
 <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {pb.pasos.map((p, i) => (
 <div key={i} style={{
                    display:'grid', gridTemplateColumns:'auto 1fr', gap:12, alignItems:'center',
                    padding:'12px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                  }}>
 <div style={{
                      width:32, height:32, borderRadius:'50%', background:tm.color, color:'#fff',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, flexShrink:0,
                    }}>{i+1}</div>
 <span style={{ fontSize:12.5, color:'#1d1d1f', fontWeight:500, lineHeight:1.45 }}>{p}</span>
 </div>
                ))}
 </div>
 </section>
          )
        })()}

        {/* ───── Biblioteca de playbooks ───── */}
 <section style={{ marginTop:18 }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
 <h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>
              Biblioteca de playbooks · protocolos por tipo de crisis
 </h2>
 <span style={{ fontSize:11, color:'#6e6e73' }}>{PLAYBOOKS.length} playbooks</span>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:10 }}>
            {PLAYBOOKS.map(pb => {
              const tm = TIPO_META[pb.tipo]
              return (
 <article key={pb.id} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
                  padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`3px solid ${tm.color}`,
                }}>
 <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
 <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:4,
                      background:tm.color, color:'#fff',
                    }}>{pb.tipo.toUpperCase()}</span>
 </div>
 <h4 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:13.5, fontWeight:600, color:'#1d1d1f', letterSpacing:'-0.012em' }}>{pb.nombre}</h4>
 <p style={{ margin:'0 0 8px', fontSize:11, color:'#6e6e73', lineHeight:1.45 }}>{pb.descripcion}</p>
 <div style={{ fontSize:11, color:'#3a3a3d' }}>
 <strong style={{ color:'#1d1d1f' }}>{pb.pasos.length}</strong> pasos protocolizados
 </div>
 </article>
              )
            })}
 </div>
 </section>

 </main>
 <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Crisis Intelligence · Politeia Analítica · {new Date().getFullYear()}
 </footer>
 </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value, accent }: { label:string, value:string, accent:string }) {
  return (
 <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:`1px solid ${accent}55` }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.018em' }}>{value}</div>
 <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.75, marginTop:4, color:accent }}>{label}</div>
 </div>
  )
}

function CardKPI({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
 <div style={{ textAlign:'center', minWidth:80, padding:'8px 12px', background:'#FAFAFB', borderRadius:10, border:'1px solid #ECECEF' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, lineHeight:1, color, letterSpacing:'-0.018em' }}>{value}</div>
 <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6e6e73', marginTop:3 }}>{label}</div>
      {sub && <div style={{ fontSize:8.5, color:'#86868b', marginTop:1 }}>{sub}</div>}
 </div>
  )
}

function Mini({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
 <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8, padding:'7px 8px', textAlign:'center' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color, lineHeight:1 }}>{value}{sub && <span style={{ fontSize:9, color:'#86868b', marginLeft:1, fontWeight:600 }}>{sub}</span>}</div>
 <div style={{ fontSize:8.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.04em', textTransform:'uppercase', marginTop:3 }}>{label}</div>
 </div>
  )
}

function RiskContextStrip() {
  const [indices, setIndices] = useState<Array<{ index_id: string; display_name: string; icon: string; score: number; label: string; colors: { low: string; medium: string; high: string; critical: string } }>>([])
  const [alerts, setAlerts] = useState<number>(0)
  useEffect(() => {
    Promise.all([
      fetch('/api/risk-v2/indices?country=ES').then(r => r.json()).catch(() => null),
      fetch('/api/risk-v2/alerts?country=ES&days=7').then(r => r.json()).catch(() => null),
    ]).then(([iR, aR]) => {
      if (iR?.indices) setIndices(iR.indices)
      if (aR?.n_active != null) setAlerts(aR.n_active)
    })
  }, [])
  if (indices.length === 0) return null
  const colorFor = (label: string, c: { low: string; medium: string; high: string; critical: string }) => {
    if (label === 'BAJO') return c.low
    if (label === 'MEDIO') return c.medium
    if (label === 'ALTO') return c.high
    return c.critical
  }
  return (
 <section style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
      padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center',
      gap:14, flexWrap:'wrap', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
    }}>
 <div style={{ fontSize:10, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
         Contexto · Riesgo estructural
 </div>
 <div style={{ display:'flex', gap:6, flex:1, flexWrap:'wrap' }}>
        {indices.map(idx => (
 <span key={idx.index_id} style={{
            fontSize:10.5, fontWeight:700, color:'#fff',
            background: colorFor(idx.label, idx.colors), padding:'3px 8px', borderRadius:5,
          }}>
            {idx.icon} {idx.display_name.replace('Riesgo ','').replace('Estabilidad ','Est. ')} {idx.score}
 </span>
        ))}
 </div>
      {alerts > 0 && (
 <span style={{
          fontSize:11, fontWeight:700, color:'#DC2626',
          padding:'3px 9px', background:'#FEE2E2', border:'1px solid #FECACA', borderRadius:6,
        }}>
           {alerts} alertas estructurales activas
 </span>
      )}
 <a href="/riesgo" style={{
        fontSize:11, fontWeight:600, color:'#0c4a6e', textDecoration:'none',
      }}>Ver termómetro completo →</a>
 </section>
  )
}

function Metric({ label, value, max, unit, color }: { label:string, value:number, max:number, unit:string, color:string }) {
  const pct = (value / max) * 100
  return (
 <div>
 <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
 <span style={{ fontSize:11, color:'#3a3a3d', fontWeight:600 }}>{label}</span>
 <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color }}>{unit}</span>
 </div>
 <div style={{ height:8, background:'#F5F5F7', borderRadius:4, overflow:'hidden' }}>
 <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4, transition:'width 320ms' }}/>
 </div>
 </div>
  )
}
