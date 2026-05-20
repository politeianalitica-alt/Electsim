'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useHuellaLegislativa } from '@/hooks/useHuellaLegislativa'
import type { TipoOrg, Posicion, Resultado } from '@/data/huella-legislativa-fixture'

const TIPO_COLOR: Record<TipoOrg, string> = {
 'Patronal': '#0E7490',
 'Sindicato': '#A02525',
 'Empresa': '#1F4E8C',
 'Asociación': '#7C3AED',
 'Think tank': '#5B21B6',
 'ONG': '#16A34A',
 'Colegio profesional': '#0F766E',
 'Cámara': '#B45309',
 'Universidad': '#9333EA',
 'Administración': '#525258',
 'Consultora': '#0369A1',
}

const POS_COLOR: Record<Posicion, string> = {
 'A favor': '#16A34A',
 'En contra':'#DC2626',
 'Neutral': '#6e6e73',
 'Mixta': '#F97316',
}

const RES_COLOR: Record<Resultado, string> = {
 'Recogida': '#16A34A',
 'Parcial': '#F97316',
 'No recogida': '#DC2626',
 'Pendiente': '#5B21B6',
}

const REC_COLOR: Record<'Sí' | 'Parcial' | 'No', string> = {
 'Sí': '#16A34A',
 'Parcial': '#F97316',
 'No': '#DC2626',
}


// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function HuellaLegislativaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // Fuente única: backend `/api/legislative/lobby-trace` (con fallback al fixture).
  const { expedientes: EXPEDIENTES, topOrgs: TOP_ORGS, registro: REGISTRO } = useHuellaLegislativa()

  const [selectedId, setSelectedId] = useState<string>('')
  const [tab, setTab] = useState<'reuniones' | 'aportaciones' | 'comparecencias' | 'mapa'>('reuniones')

  // Cuando llegan los datos, seleccionar el primer expediente por defecto.
  useEffect(() => {
    if (!selectedId && EXPEDIENTES.length > 0) setSelectedId(EXPEDIENTES[0].id)
  }, [selectedId, EXPEDIENTES])

  const selected = useMemo(
    () => EXPEDIENTES.find(e => e.id === selectedId) ?? EXPEDIENTES[0],
    [EXPEDIENTES, selectedId],
  )

  const totals = useMemo(() => {
    const reuniones = EXPEDIENTES.reduce((s, e) => s + e.reuniones.length, 0)
    const aportaciones = EXPEDIENTES.reduce((s, e) => s + e.aportaciones.length, 0)
    const aceptadas = EXPEDIENTES.reduce((s, e) => s + e.aportaciones.filter(a => a.recogida === 'Sí' || a.recogida === 'Parcial').length, 0)
    const tasaAceptacion = aportaciones > 0 ? Math.round((aceptadas / aportaciones) * 100) : 0
    const orgs = new Set<string>()
    for (const e of EXPEDIENTES) for (const r of e.reuniones) orgs.add(r.org)
    return { expedientes: EXPEDIENTES.length, reuniones, aportaciones, tasaAceptacion, orgs: orgs.size }
  }, [EXPEDIENTES])

  // Loading state: hasta que llegan los datos del hook (SSR + primer fetch)
  if (!selected) {
    return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth:1500, margin:'0 auto', padding:'80px 28px', textAlign:'center', color:'#6e6e73' }}>
          Cargando huella legislativa…
 </main>
 </div>
    )
  }

  return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
 <section style={{
          background:'linear-gradient(135deg,#5B21B6 0%,#1e0a4a 100%)',
          borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
 <div>
 <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              MONITOR LEGISLATIVO · HUELLA E INFLUENCIA EXTERNA
 </p>
 <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              Quién ha influido <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>en cada norma</em>
 </h1>
 <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              {totals.expedientes} expedientes con huella documentada · {totals.orgs} organizaciones implicadas · seguimiento de reuniones bilaterales,
              aportaciones por escrito, comparecencias parlamentarias y mapa de influencia agregado.
 </p>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
 <HeroKPI label="Expedientes" value={String(totals.expedientes)}/>
 <HeroKPI label="Reuniones" value={String(totals.reuniones)}/>
 <HeroKPI label="Aportaciones" value={String(totals.aportaciones)}/>
 <HeroKPI label="% Aceptadas" value={`${totals.tasaAceptacion}%`}/>
 </div>
 </section>

        {/* ───── Selector de expediente ───── */}
 <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'14px 18px', marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
 <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
 <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Expediente:</span>
 <span style={{ fontSize:11.5, color:'#3a3a3d' }}>Selecciona una norma para ver su huella legislativa</span>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:8 }}>
            {EXPEDIENTES.map(e => {
              const active = e.id === selectedId
              return (
 <button key={e.id} onClick={() => setSelectedId(e.id)} style={{
                  textAlign:'left', cursor:'pointer',
                  background: active ? '#FAFAFB' : '#fff',
                  border:`1px solid ${active ? '#5B21B6' : '#ECECEF'}`,
                  borderRadius:10, padding:'10px 12px',
                  fontFamily:'inherit',
                  boxShadow: active ? '0 0 0 3px rgba(91,33,182,0.10)' : 'none',
                  transition:'box-shadow 200ms',
                }}>
 <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
 <span style={{ fontSize:9.5, fontWeight:700, color:'#5B21B6', letterSpacing:'0.06em' }}>{e.exp}</span>
 <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:600 }}>· {e.ministerio}</span>
 </div>
 <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f', lineHeight:1.3, marginBottom:3 }}>{e.title}</div>
 <div style={{ fontSize:10.5, color:'#6e6e73' }}>
                    {e.reuniones.length} reuniones · {e.aportaciones.length} aportaciones · {e.comparecencias.length} comparecencias
 </div>
 </button>
              )
            })}
 </div>
 </section>

        {/* ───── Cabecera del expediente seleccionado ───── */}
 <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'18px 24px', marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:18, flexWrap:'wrap' }}>
 <div style={{ flex:'1 1 480px', minWidth:0 }}>
 <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
 <span style={{
                  fontSize:9.5, fontWeight:800, letterSpacing:'0.08em',
                  padding:'3px 8px', borderRadius:6,
                  background:'#5B21B6', color:'#fff',
                }}>EXP. {selected.exp}</span>
 <span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>· {selected.ministerio} · {selected.ministra}</span>
 <span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>· Registro: {selected.fechaRegistro}</span>
 </div>
 <h2 style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:600, letterSpacing:'-0.018em', margin:'0 0 4px', color:'#1d1d1f', lineHeight:1.2 }}>
                {selected.title}
 </h2>
 <p style={{ margin:0, fontSize:11.5, color:'#6e6e73' }}>{selected.fase}</p>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,auto)', gap:14 }}>
 <CardKPI label="Reuniones" value={String(selected.reuniones.length)}     color="#5B21B6"/>
 <CardKPI label="Aportac." value={String(selected.aportaciones.length)} color="#1F4E8C"/>
 <CardKPI label="Compareciencias" value={String(selected.comparecencias.length)} color="#16A34A"/>
 <CardKPI label="Lobbies" value={String(selected.lobbies.length)}      color="#DC2626"/>
 </div>
 </div>
 </section>

        {/* ───── Tabs ───── */}
 <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14 }}>
          {([
            { k:'reuniones',     label:'Reuniones bilaterales',  count: selected.reuniones.length },
            { k:'aportaciones',  label:'Aportaciones escritas',  count: selected.aportaciones.length },
            { k:'comparecencias',label:'Comparecencias',         count: selected.comparecencias.length },
            { k:'mapa',          label:'Mapa de influencia',     count: selected.lobbies.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
 <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border:'none', borderRadius:999, padding:'7px 16px',
                fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer',
                fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>
                {t.label} <span style={{ marginLeft:5, color: active ? '#5B21B6' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
 </button>
            )
          })}
 </div>

        {/* ───── TAB · Reuniones bilaterales ───── */}
        {tab === 'reuniones' && (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
 <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:1000 }}>
 <thead>
 <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['Fecha','Organización','Tipo','Asistentes','Posición','Resultado','Resumen'].map(h => (
 <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
 </tr>
 </thead>
 <tbody>
                  {selected.reuniones.map((r, i) => (
 <tr key={i} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
 <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f', whiteSpace:'nowrap' }}>{r.fecha}</td>
 <td style={{ padding:'9px 12px', fontWeight:600, color:'#1d1d1f' }}>{r.org}</td>
 <td style={{ padding:'9px 12px' }}>
 <span style={{
                          fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:4,
                          background: TIPO_COLOR[r.tipoOrg], color:'#fff',
                        }}>{r.tipoOrg.toUpperCase()}</span>
 </td>
 <td style={{ padding:'9px 12px', fontSize:11, color:'#3a3a3d' }}>{r.asistentes}</td>
 <td style={{ padding:'9px 12px' }}>
 <span style={{
                          fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:999,
                          background:`${POS_COLOR[r.posicion]}15`, color:POS_COLOR[r.posicion],
                          border:`1px solid ${POS_COLOR[r.posicion]}40`,
                        }}>{r.posicion.toUpperCase()}</span>
 </td>
 <td style={{ padding:'9px 12px' }}>
 <span style={{
                          fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:999,
                          background:`${RES_COLOR[r.resultado]}15`, color:RES_COLOR[r.resultado],
                          border:`1px solid ${RES_COLOR[r.resultado]}40`,
                        }}>{r.resultado.toUpperCase()}</span>
 </td>
 <td style={{ padding:'9px 12px', fontSize:11.5, color:'#3a3a3d', maxWidth:380, lineHeight:1.4 }}>{r.resumen}</td>
 </tr>
                  ))}
 </tbody>
 </table>
 </div>
 </section>
        )}

        {/* ───── TAB · Aportaciones escritas ───── */}
        {tab === 'aportaciones' && (
 <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))', gap:10 }}>
            {selected.aportaciones.map((a, i) => (
 <article key={i} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
                borderLeft:`3px solid ${REC_COLOR[a.recogida]}`,
              }}>
 <header style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap',
                  padding:'12px 14px', background:'#FAFAFB', borderBottom:'1px solid #ECECEF',
                }}>
 <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
 <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:4,
                      background:TIPO_COLOR[a.tipoOrg], color:'#fff',
                    }}>{a.tipoOrg.toUpperCase()}</span>
 <strong style={{ fontSize:13, color:'#1d1d1f' }}>{a.org}</strong>
 </div>
 <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:'#1d1d1f' }}>{a.fecha}</span>
 </header>
 <div style={{ padding:'12px 14px' }}>
 <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6, flexWrap:'wrap' }}>
 <span style={{
                      fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:'#5B21B615', color:'#5B21B6', border:'1px solid #5B21B640',
                    }}>{a.forma.toUpperCase()}</span>
 <span style={{
                      fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${REC_COLOR[a.recogida]}15`, color:REC_COLOR[a.recogida],
                      border:`1px solid ${REC_COLOR[a.recogida]}40`,
                    }}>RECOGIDA: {a.recogida.toUpperCase()}</span>
                    {a.articulo && (
 <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>· {a.articulo}</span>
                    )}
 </div>
 <p style={{ margin:0, fontSize:12.5, color:'#3a3a3d', lineHeight:1.45 }}>{a.resumen}</p>
 </div>
 </article>
            ))}
 </section>
        )}

        {/* ───── TAB · Comparecencias ───── */}
        {tab === 'comparecencias' && (
 <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:10 }}>
            {selected.comparecencias.map((c, i) => (
 <article key={i} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                padding:'14px 16px', display:'grid', gridTemplateColumns:'auto 1fr', gap:12, alignItems:'center',
                borderLeft:`3px solid ${TIPO_COLOR[c.tipoOrg]}`,
              }}>
 <div style={{
                  width:42, height:42, borderRadius:'50%', background:TIPO_COLOR[c.tipoOrg], color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, flexShrink:0,
                }}>{c.compareciente.split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase()}</div>
 <div style={{ minWidth:0 }}>
 <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
 <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                      padding:'1px 6px', borderRadius:4,
                      background:TIPO_COLOR[c.tipoOrg], color:'#fff',
                    }}>{c.rol.toUpperCase()}</span>
 <span style={{ fontFamily:'var(--font-display)', fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>· {c.fecha}</span>
 </div>
 <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', lineHeight:1.2 }}>{c.compareciente}</div>
 <div style={{ fontSize:11, color:'#3a3a3d', marginTop:1 }}>{c.org}</div>
 <div style={{ marginTop:5 }}>
 <span style={{
                      fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${POS_COLOR[c.posicion]}15`, color:POS_COLOR[c.posicion],
                      border:`1px solid ${POS_COLOR[c.posicion]}40`,
                    }}>{c.posicion.toUpperCase()}</span>
 </div>
 </div>
 </article>
            ))}
 </section>
        )}

        {/* ───── TAB · Mapa de influencia ───── */}
        {tab === 'mapa' && (
 <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
 <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, letterSpacing:'-0.013em' }}>Intensidad de influencia · {selected.lobbies.length} actores</h3>
 <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Estimación basada en número de reuniones, aportaciones y eco mediático generado durante la tramitación.</p>
 <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {selected.lobbies.sort((a,b) => b.intensidad - a.intensidad).map(l => (
 <div key={l.org} style={{
                  display:'grid', gridTemplateColumns:'180px 80px 1fr 100px 80px', gap:12, alignItems:'center',
                  padding:'10px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                }}>
 <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
 <span style={{ width:8, height:8, borderRadius:'50%', background:TIPO_COLOR[l.tipoOrg], flexShrink:0 }}/>
 <strong style={{ fontSize:12.5, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{l.org}</strong>
 </div>
 <span style={{
                    fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                    padding:'2px 7px', borderRadius:4, textAlign:'center',
                    background:TIPO_COLOR[l.tipoOrg], color:'#fff',
                  }}>{l.tipoOrg.toUpperCase()}</span>
 <div style={{ position:'relative' }}>
 <div style={{ height:14, background:'#fff', borderRadius:7, overflow:'hidden', border:'1px solid #ECECEF' }}>
 <div style={{ width:`${l.intensidad}%`, height:'100%', background:POS_COLOR[l.posicion], borderRadius:7 }}/>
 </div>
 <span style={{ position:'absolute', right:8, top:-1, fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:'#1d1d1f' }}>{l.intensidad}</span>
 </div>
 <span style={{
                    fontSize:9.5, fontWeight:700, letterSpacing:'0.06em', textAlign:'center',
                    padding:'2px 7px', borderRadius:999,
                    background:`${POS_COLOR[l.posicion]}15`, color:POS_COLOR[l.posicion],
                    border:`1px solid ${POS_COLOR[l.posicion]}40`,
                  }}>{l.posicion.toUpperCase()}</span>
 <span style={{ fontSize:11, color:'#6e6e73', textAlign:'right' }}><strong>{l.reuniones}</strong> reun.</span>
 </div>
              ))}
 </div>
 </section>
        )}

        {/* ───── Top organizaciones más activas ───── */}
 <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginTop:18,
        }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8, marginBottom:14 }}>
 <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, letterSpacing:'-0.014em', color:'#1d1d1f' }}>
              Organizaciones más activas <span style={{ color:'#6e6e73', fontWeight:500, fontSize:12 }}>· agregado de los {EXPEDIENTES.length} expedientes</span>
 </h2>
 <span style={{ fontSize:11, color:'#6e6e73' }}>{TOP_ORGS.length} organizaciones</span>
 </div>
 <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
 <thead>
 <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                  {[
                    { l:'#',           a:'left' },
                    { l:'Organización',a:'left' },
                    { l:'Tipo',        a:'left' },
                    { l:'Expedientes', a:'right' },
                    { l:'Reuniones',   a:'right' },
                    { l:'Aportac.',    a:'right' },
                    { l:'% Aceptación',a:'left' },
                    { l:'Web',         a:'center'},
                  ].map(h => (
 <th key={h.l} style={{ textAlign:h.a as 'left'|'right'|'center', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h.l}</th>
                  ))}
 </tr>
 </thead>
 <tbody>
                {[...TOP_ORGS].sort((a,b) => b.reuniones - a.reuniones).map((o, i) => {
                  const accColor = o.aceptacion >= 60 ? '#16A34A' : o.aceptacion >= 30 ? '#F97316' : '#DC2626'
                  return (
 <tr key={o.org} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
 <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{i+1}</td>
 <td style={{ padding:'9px 12px' }}>
 <div style={{ display:'flex', alignItems:'center', gap:8 }}>
 <span style={{ width:3, height:18, background:TIPO_COLOR[o.tipoOrg], borderRadius:1 }}/>
 <span style={{ fontWeight:600, color:'#1d1d1f' }}>{o.org}</span>
 </div>
 </td>
 <td style={{ padding:'9px 12px' }}>
 <span style={{
                          fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:4,
                          background:TIPO_COLOR[o.tipoOrg], color:'#fff',
                        }}>{o.tipoOrg.toUpperCase()}</span>
 </td>
 <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:700, color:'#5B21B6' }}>{o.expedientes}</td>
 <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{o.reuniones}</td>
 <td style={{ padding:'9px 12px', textAlign:'right', color:'#3a3a3d' }}>{o.aportaciones}</td>
 <td style={{ padding:'9px 12px' }}>
 <div style={{ display:'flex', alignItems:'center', gap:8 }}>
 <div style={{ flex:1, height:7, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:60 }}>
 <div style={{ width:`${o.aceptacion}%`, height:'100%', background:accColor }}/>
 </div>
 <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:accColor, minWidth:34, textAlign:'right' }}>{o.aceptacion}%</span>
 </div>
 </td>
 <td style={{ padding:'9px 12px', textAlign:'center' }}>
 <a href={o.web} target="_blank" rel="noopener noreferrer" title={o.web.replace(/^https?:\/\//, '').replace(/\/$/, '')} style={{
                          display:'inline-flex', alignItems:'center', justifyContent:'center',
                          width:24, height:24, borderRadius:6,
                          background:`${TIPO_COLOR[o.tipoOrg]}12`, border:`1px solid ${TIPO_COLOR[o.tipoOrg]}40`,
                          color:TIPO_COLOR[o.tipoOrg], textDecoration:'none',
                        }}>
 <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
 <path d="M3 3h5v5M3 8L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
 </a>
 </td>
 </tr>
                  )
                })}
 </tbody>
 </table>
 </div>
 </section>

        {/* ───── Registro de grupos de interés ───── */}
 <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginTop:14,
        }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8, marginBottom:6 }}>
 <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, letterSpacing:'-0.014em', color:'#1d1d1f' }}>
              Registro de grupos de interés <span style={{ color:'#6e6e73', fontWeight:500, fontSize:12 }}>· inscritos en el Ministerio</span>
 </h2>
 <span style={{ fontSize:11, color:'#6e6e73' }}>{REGISTRO.length} entidades</span>
 </div>
 <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>Listado público con identidad, intereses representados y rango presupuestario destinado a actividades de incidencia política.</p>
 <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
 <thead>
 <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                  {['Núm.','Entidad','Tipo','Intereses representados','Presupuesto anual','Estado'].map(h => (
 <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
 </tr>
 </thead>
 <tbody>
                {REGISTRO.map((r, i) => (
 <tr key={r.num} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
 <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#5B21B6' }}>{r.num}</td>
 <td style={{ padding:'9px 12px', fontWeight:600, color:'#1d1d1f' }}>{r.nombre}</td>
 <td style={{ padding:'9px 12px' }}>
 <span style={{
                        fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                        padding:'2px 7px', borderRadius:4,
                        background:TIPO_COLOR[r.tipoOrg], color:'#fff',
                      }}>{r.tipoOrg.toUpperCase()}</span>
 </td>
 <td style={{ padding:'9px 12px', color:'#3a3a3d', fontSize:11.5 }}>{r.intereses}</td>
 <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>{r.presupuesto}</td>
 <td style={{ padding:'9px 12px' }}>
 <span style={{
                        fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                        padding:'2px 7px', borderRadius:999,
                        background: r.activo ? '#16A34A15' : '#6e6e7315',
                        color: r.activo ? '#16A34A' : '#6e6e73',
                        border:`1px solid ${r.activo ? '#16A34A40' : '#6e6e7340'}`,
                      }}>{r.activo ? 'ACTIVO' : 'INACTIVO'}</span>
 </td>
 </tr>
                ))}
 </tbody>
 </table>
 </div>
 </section>

 </main>
 <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Huella Legislativa · Politeia Analítica · {new Date().getFullYear()}
 </footer>
 </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value }: { label:string, value:string }) {
  return (
 <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.018em' }}>{value}</div>
 <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.7, marginTop:4, color:'#fff' }}>{label}</div>
 </div>
  )
}

function CardKPI({ label, value, color }: { label:string, value:string, color:string }) {
  return (
 <div style={{ textAlign:'center', minWidth:75 }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, lineHeight:1, color, letterSpacing:'-0.022em' }}>{value}</div>
 <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6e6e73', marginTop:3 }}>{label}</div>
 </div>
  )
}
