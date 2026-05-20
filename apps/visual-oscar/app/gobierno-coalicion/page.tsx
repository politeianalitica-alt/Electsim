'use client'
import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useGobiernoCoalicion } from '@/hooks/useGobiernoCoalicion'
import type { Ministro, Apoyo, Hito, Partido } from '@/data/gobierno-coalicion-fixture'

// ─────────────────────────────────────────────────────────────────────────
// UI maps · colores y etiquetas (no son datos, viven en la página)
// ─────────────────────────────────────────────────────────────────────────
const COLOR: Record<Partido, string> = { 'PSOE':'#E1322D', 'Sumar':'#D43F8D' }

const HITO_META: Record<Hito['tipo'], { label: string; color: string }> = {
 'Ley':     { label:'LEY',      color:'#1F4E8C' },
 'RDL':     { label:'RDL',      color:'#DC2626' },
 'Acuerdo': { label:'ACUERDO',  color:'#16A34A' },
 'Crisis':  { label:'CRISIS',   color:'#F97316' },
 'Cumbre':  { label:'CUMBRE',   color:'#5B21B6' },
}
const HITO_RES: Record<Hito['resultado'], string> = { 'aprobado':'#16A34A', 'pendiente':'#F97316', 'rechazado':'#DC2626' }

const RIESGO_C: Record<Apoyo['riesgo'], string> = { 'bajo':'#16A34A','medio':'#F97316','alto':'#DC2626' }
const ROL_META: Record<Apoyo['rol'], { label:string; color:string }> = {
 'gobierno':    { label:'Gobierno',    color:'#E1322D' },
 'investidura': { label:'Investidura', color:'#7DB94B' },
 'situacional': { label:'Situacional', color:'#F97316' },
 'oposicion':   { label:'Oposición',   color:'#1F4E8C' },
}

// Helpers
function initials(name: string) {
  return name.split(/[\s.·]+/).filter(Boolean).slice(0, 2).map(n => n[0]?.toUpperCase()).join('')
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────
export default function GobiernoCoalicionPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { presidente, vicepresidencias, ministros, apoyos, hitos, loading } = useGobiernoCoalicion()

  const stats = useMemo(() => {
    const psoeMin = ministros.filter(m => m.partido === 'PSOE').length + vicepresidencias.filter(v=>v.partido==='PSOE').length
    const sumarMin = ministros.filter(m => m.partido === 'Sumar').length + vicepresidencias.filter(v=>v.partido==='Sumar').length
    const totalMin = psoeMin + sumarMin + (presidente ? 1 : 0)
    const escGob = apoyos.filter(a => a.rol === 'gobierno').reduce((s,a)=>s+a.escanos, 0)
    const escInv = apoyos.filter(a => a.rol === 'investidura').reduce((s,a)=>s+a.escanos, 0)
    const escSit = apoyos.filter(a => a.rol === 'situacional').reduce((s,a)=>s+a.escanos, 0)
    const escOpos= apoyos.filter(a => a.rol === 'oposicion').reduce((s,a)=>s+a.escanos, 0)
    return { psoeMin, sumarMin, totalMin, escGob, escInv, escSit, escOpos, mayoria:176 }
  }, [ministros, vicepresidencias, presidente, apoyos])

  const apoyoTotal = stats.escGob + stats.escInv  // bloque de investidura estable
  const juntsApoyo = apoyos.find(a=>a.partido==='Junts')
  const condDeJunts = stats.escGob + stats.escInv + (juntsApoyo?.escanos ?? 0)

  if (loading && !presidente) {
    return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
 <p style={{ color:'#6e6e73', fontSize:13 }}>Cargando composición del Gobierno…</p>
 </main>
 </div>
    )
  }

  return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* ───── Hero ───── */}
 <section style={{
          background:'linear-gradient(135deg,#B45309 0%,#5C2310 100%)',
          borderRadius:22, padding:'34px 40px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.7fr 1fr', gap:32, alignItems:'center',
        }}>
 <div>
 <p style={{ fontSize:10.5, fontWeight:600, letterSpacing:'0.14em', textTransform:'uppercase', opacity:0.7, margin:'0 0 8px' }}>
              MAPA DE PODER · GOBIERNO Y COALICIÓN
 </p>
 <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:32, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              Gobierno de coalición <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.75)' }}>PSOE-Sumar</em>
 </h1>
 <p style={{ fontSize:13.5, opacity:0.7, margin:0 }}>
              {stats.totalMin} carteras · {stats.psoeMin} PSOE · {stats.sumarMin} Sumar · investido el 16 de noviembre de 2023
 </p>
 </div>
 <div style={{ textAlign:'right', borderLeft:'1px solid rgba(255,255,255,0.18)', paddingLeft:32 }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:64, fontWeight:700, letterSpacing:'-0.04em', lineHeight:0.95 }}>
              {apoyoTotal}<span style={{ fontSize:30, opacity:0.6 }}>/{stats.mayoria}</span>
 </div>
 <div style={{ fontSize:12, opacity:0.7, marginTop:6 }}>Bloque de investidura · faltan {stats.mayoria - apoyoTotal} para mayoría absoluta</div>
 <div style={{ fontSize:11.5, marginTop:6, color:'rgba(255,255,255,0.85)' }}>Con Junts: <strong>{condDeJunts}</strong> escaños</div>
 </div>
 </section>

        {/* ───── Presidente ───── */}
        {presidente && (
 <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:18, padding:'22px 26px', marginBottom:14,
            boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
            display:'grid', gridTemplateColumns:'auto 1fr auto', gap:24, alignItems:'center',
          }}>
 <Avatar name={presidente.nombre} color={COLOR[presidente.partido]} size={70}/>
 <div>
 <div style={{ fontSize:10.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2 }}>Presidente del Gobierno</div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, letterSpacing:'-0.018em', color:'#1d1d1f' }}>{presidente.nombre}</div>
 <div style={{ fontSize:13, color:'#3a3a3d', marginTop:3 }}>
 <span style={{ fontWeight:600, color:COLOR[presidente.partido] }}>{presidente.partido}</span> · en el cargo desde {presidente.desde}
 </div>
 </div>
 <div style={{ textAlign:'right' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'#1d1d1f' }}>3,8<span style={{ fontSize:13, color:'#6e6e73' }}>/10</span></div>
 <div style={{ fontSize:10.5, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:700 }}>Valoración CIS</div>
 </div>
 </section>
        )}

        {/* ───── Vicepresidencias ───── */}
        {vicepresidencias.length > 0 && (
 <section style={{ marginBottom:14 }}>
 <SectionTitle>Vicepresidencias</SectionTitle>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {vicepresidencias.map(v => <MinisterioCard key={v.nombre} m={v} highlight/>)}
 </div>
 </section>
        )}

        {/* ───── Resto de ministros ───── */}
        {ministros.length > 0 && (
 <section style={{ marginBottom:14 }}>
 <SectionTitle>Consejo de Ministros · {ministros.length} carteras</SectionTitle>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))', gap:12 }}>
              {ministros.map(m => <MinisterioCard key={m.nombre} m={m}/>)}
 </div>
 </section>
        )}

        {/* ───── Distribución del poder ───── */}
 <section style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
 <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <SectionTitle>Distribución de carteras</SectionTitle>
 <div style={{ display:'flex', height:14, borderRadius:7, overflow:'hidden', marginBottom:10 }}>
 <div style={{ width:`${stats.totalMin > 0 ? (stats.psoeMin/stats.totalMin)*100 : 0}%`, background:COLOR.PSOE }}/>
 <div style={{ width:`${stats.totalMin > 0 ? (stats.sumarMin/stats.totalMin)*100 : 0}%`, background:COLOR.Sumar }}/>
 </div>
 <div style={{ display:'flex', justifyContent:'space-between' }}>
 <div style={{ display:'flex', alignItems:'center', gap:6 }}>
 <span style={{ width:11, height:11, borderRadius:3, background:COLOR.PSOE }}/>
 <strong style={{ fontSize:13, color:COLOR.PSOE }}>PSOE</strong>
 <span style={{ fontSize:13, color:'#6e6e73' }}>· {stats.psoeMin} carteras ({stats.totalMin > 0 ? Math.round((stats.psoeMin/stats.totalMin)*100) : 0}%)</span>
 </div>
 <div style={{ display:'flex', alignItems:'center', gap:6 }}>
 <span style={{ width:11, height:11, borderRadius:3, background:COLOR.Sumar }}/>
 <strong style={{ fontSize:13, color:COLOR.Sumar }}>Sumar</strong>
 <span style={{ fontSize:13, color:'#6e6e73' }}>· {stats.sumarMin} carteras ({stats.totalMin > 0 ? Math.round((stats.sumarMin/stats.totalMin)*100) : 0}%)</span>
 </div>
 </div>
 </div>
 <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <SectionTitle>Apoyo en el hemiciclo</SectionTitle>
 <div style={{ display:'flex', height:14, borderRadius:7, overflow:'hidden', marginBottom:10 }}>
 <div style={{ width:`${(stats.escGob/350)*100}%`, background:'#E1322D', boxShadow:'inset 0 0 0 1px rgba(0,0,0,0.05)' }}/>
 <div style={{ width:`${(stats.escInv/350)*100}%`, background:'#7DB94B' }}/>
 <div style={{ width:`${(stats.escSit/350)*100}%`, background:'#F97316' }}/>
 <div style={{ width:`${(stats.escOpos/350)*100}%`, background:'#1F4E8C' }}/>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px', fontSize:12 }}>
 <Leg color="#E1322D" label="Gobierno" n={stats.escGob}/>
 <Leg color="#7DB94B" label="Bloque investidura" n={stats.escInv}/>
 <Leg color="#F97316" label="Situacional" n={stats.escSit}/>
 <Leg color="#1F4E8C" label="Oposición" n={stats.escOpos}/>
 </div>
 </div>
 </section>

        {/* ───── Hitos clave del Gobierno ───── */}
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:14 }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
 <h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>
              Hitos clave del Gobierno · XV Legislatura
 </h2>
 <span style={{ fontSize:11, color:'#6e6e73' }}>{hitos.length} eventos</span>
 </div>
 <div style={{ position:'relative' }}>
 <div style={{ position:'absolute', left:75, top:6, bottom:6, width:2, background:'#ECECEF' }}/>
            {hitos.map((h, i) => {
              const tm = HITO_META[h.tipo]
              const rc = HITO_RES[h.resultado]
              return (
 <div key={i} style={{
                  display:'grid', gridTemplateColumns:'70px 18px 1fr',
                  gap:8, alignItems:'flex-start',
                  padding: i === 0 ? '0 0 14px 0' : '14px 0',
                  borderTop: i === 0 ? 'none' : '1px solid #FAFAFB',
                }}>
 <span style={{ fontFamily:'var(--font-display)', fontSize:11.5, fontWeight:700, color:'#1d1d1f', textAlign:'right' }}>{h.fecha}</span>
 <div style={{ position:'relative', width:18, height:18 }}>
 <div style={{
                      width:14, height:14, borderRadius:'50%', background:'#fff',
                      border:`3px solid ${tm.color}`, boxShadow:`0 0 0 3px ${tm.color}22`,
                      position:'absolute', top:3, left:2, zIndex:1,
                    }}/>
 </div>
 <div style={{ minWidth:0 }}>
 <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
 <span style={{
                        fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                        padding:'2px 7px', borderRadius:4,
                        background:tm.color, color:'#fff',
                      }}>{tm.label}</span>
 <span style={{
                        fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                        padding:'2px 7px', borderRadius:999,
                        background:`${rc}15`, color:rc, border:`1px solid ${rc}40`,
                      }}>{h.resultado.toUpperCase()}</span>
 </div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color:'#1d1d1f', marginBottom:2, letterSpacing:'-0.012em' }}>{h.titulo}</div>
 <p style={{ margin:0, fontSize:12, color:'#3a3a3d', lineHeight:1.45 }}>{h.detalle}</p>
 </div>
 </div>
              )
            })}
 </div>
 </section>

        {/* ───── Tabla de apoyos ───── */}
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
 <h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Mapa de apoyos parlamentarios</h2>
 <span style={{ fontSize:11, color:'#6e6e73' }}>{apoyos.length} grupos · {apoyos.reduce((s,a)=>s+a.escanos,0)} escaños totales</span>
 </div>
 <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {apoyos.map(a => {
              const rol = ROL_META[a.rol]
              const c = RIESGO_C[a.riesgo]
              return (
 <div key={a.partido} style={{
                  display:'grid', gridTemplateColumns:'12px 100px 80px 1fr 100px 90px', gap:12, alignItems:'center',
                  padding:'10px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                }}>
 <span style={{ width:10, height:10, borderRadius:'50%', background:a.color }}/>
 <span style={{ fontSize:13, fontWeight:700, color:'#1d1d1f' }}>{a.partido}</span>
 <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:a.color, letterSpacing:'-0.018em' }}>{a.escanos}</span>
 <span style={{ fontSize:11.5, color:'#3a3a3d' }}>{a.posicion}</span>
 <span style={{
                    fontSize:9.5, fontWeight:800, letterSpacing:'0.08em', textAlign:'center',
                    padding:'3px 8px', borderRadius:999,
                    background:`${rol.color}15`, color:rol.color, border:`1px solid ${rol.color}40`,
                  }}>{rol.label.toUpperCase()}</span>
 <span style={{
                    fontSize:9.5, fontWeight:800, letterSpacing:'0.08em', textAlign:'center',
                    padding:'3px 8px', borderRadius:999,
                    background:`${c}15`, color:c, border:`1px solid ${c}40`,
                  }}>RIESGO {a.riesgo.toUpperCase()}</span>
 </div>
              )
            })}
 </div>
 </section>
 </main>
 <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Mapa de Poder · Gobierno y Coalición · Politeia Analítica · {new Date().getFullYear()}
 </footer>
 </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function Avatar({ name, color, size }: { name:string, color:string, size:number }) {
  return (
 <div style={{
      width:size, height:size, borderRadius:'50%', background:color, color:'#fff',
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-display)', fontWeight:700, fontSize:size*0.36, letterSpacing:'-0.01em',
      flexShrink:0, boxShadow:`0 2px 8px -2px ${color}66`,
    }}>{initials(name)}</div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
 <h2 style={{ margin:'0 0 10px', fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>{children}</h2>
  )
}

function Leg({ color, label, n }: { color:string, label:string, n:number }) {
  return (
 <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
 <span style={{ width:9, height:9, borderRadius:2, background:color, flexShrink:0 }}/>
 <span style={{ color:'#3a3a3d' }}>{label}</span>
 <strong style={{ color:'#1d1d1f', marginLeft:'auto' }}>{n}</strong>
 </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// MinisterioCard · cabecera + datos clave + enlace a la web
// ─────────────────────────────────────────────────────────────────────────
function MinisterioCard({ m, highlight = false }: { m: Ministro, highlight?: boolean }) {
  const c = COLOR[m.partido]
  const dominio = m.web.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return (
 <article style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
      boxShadow: highlight ? '0 2px 8px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
      overflow:'hidden', display:'flex', flexDirection:'column',
      borderLeft:`${highlight ? 5 : 3}px solid ${c}`,
    }}>
      {/* Cabecera */}
 <header style={{
        display:'grid', gridTemplateColumns:'auto 1fr', gap:12, alignItems:'center',
        padding: highlight ? '14px 16px' : '12px 14px',
        background:`linear-gradient(135deg, ${c}10, ${c}03)`,
      }}>
 <Avatar name={m.nombre} color={c} size={highlight ? 48 : 40}/>
 <div style={{ minWidth:0 }}>
          {m.vicepresidencia && (
 <div style={{ fontSize:9, color:'#6e6e73', fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase' }}>VICEPRESIDENCIA {m.vicepresidencia}ª</div>
          )}
 <div style={{ fontFamily:'var(--font-display)', fontSize: highlight ? 15 : 13.5, fontWeight:700, letterSpacing:'-0.012em', color:'#1d1d1f', lineHeight:1.2 }}>{m.nombre}</div>
 <div style={{ fontSize:11, color:'#3a3a3d', marginTop:1, lineHeight:1.3 }}>{m.cartera}</div>
 <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:3 }}>
 <span style={{
              fontSize:8.5, fontWeight:800, letterSpacing:'0.08em',
              padding:'1px 6px', borderRadius:4,
              background:c, color:'#fff',
            }}>{m.partido}</span>
 <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:600 }}>· desde {m.desde}</span>
 </div>
 </div>
 </header>

      {/* Datos clave */}
 <div style={{ padding:'10px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
 <Mini label="Presup." value={m.presupuesto > 0 ? (m.presupuesto >= 1000 ? `${(m.presupuesto/1000).toFixed(1)}` : `${m.presupuesto}`) : '—'} sub={m.presupuesto >= 1000 ? 'mil M€' : (m.presupuesto > 0 ? 'M€' : '')} color={c}/>
 <Mini label="Plantilla" value={m.funcionarios.toLocaleString('es-ES')} sub="K personas" color="#3a3a3d"/>
 </div>

      {/* Secretarías de Estado clave */}
 <div style={{ padding:'2px 14px 10px' }}>
 <div style={{ fontSize:8.5, fontWeight:800, letterSpacing:'0.08em', color:'#6e6e73', textTransform:'uppercase', marginBottom:4 }}>Secretarías clave</div>
 <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {m.secretarios.slice(0, 3).map(s => (
 <div key={s} style={{ fontSize:10.5, color:'#3a3a3d', lineHeight:1.4, display:'flex', gap:5 }}>
 <span style={{ color:c, fontWeight:700, flexShrink:0 }}>·</span>{s}
 </div>
          ))}
 </div>
 </div>

      {/* Prioridades */}
 <div style={{ padding:'2px 14px 10px' }}>
 <div style={{ fontSize:8.5, fontWeight:800, letterSpacing:'0.08em', color:'#6e6e73', textTransform:'uppercase', marginBottom:4 }}>Prioridades · agenda</div>
 <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {m.prioridades.map(p => (
 <span key={p} style={{
              fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:999,
              background:`${c}10`, color:c, border:`1px solid ${c}30`,
            }}>{p}</span>
          ))}
 </div>
 </div>

      {/* Enlace a la web oficial */}
 <a href={m.web} target="_blank" rel="noopener noreferrer" style={{
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
        padding:'10px 14px', borderTop:'1px solid #ECECEF',
        background:'#FAFAFB', textDecoration:'none',
        fontSize:11, color:'#1d1d1f', fontWeight:600, fontFamily:'inherit',
        transition:'background 160ms',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${c}10` }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#FAFAFB' }}>
 <span style={{ display:'inline-flex', alignItems:'center', gap:6, minWidth:0 }}>
 <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink:0 }}>
 <circle cx="5.5" cy="5.5" r="4.5" stroke={c} strokeWidth="1.2"/>
 <path d="M1 5.5h9M5.5 1c1.5 1.5 1.5 7.5 0 9M5.5 1c-1.5 1.5-1.5 7.5 0 9" stroke={c} strokeWidth="1" fill="none"/>
 </svg>
 <span style={{ color:c, fontFamily:'var(--font-display)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{dominio}</span>
 </span>
 <span style={{ color:c, display:'inline-flex', alignItems:'center', gap:3 }}>
          Visitar
 <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
 <path d="M2 2h6v6M2 8L8 2" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
 </span>
 </a>
 </article>
  )
}

function Mini({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
 <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8, padding:'7px 9px' }}>
 <div style={{ fontSize:8.5, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{label}</div>
 <div style={{ display:'flex', alignItems:'baseline', gap:3, marginTop:2 }}>
 <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color, letterSpacing:'-0.012em', lineHeight:1 }}>{value}</span>
        {sub && <span style={{ fontSize:9, color:'#86868b', fontWeight:600 }}>{sub}</span>}
 </div>
 </div>
  )
}
