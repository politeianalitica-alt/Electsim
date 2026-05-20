'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useFondosEuropeos } from '@/hooks/useFondosEuropeos'

// ─────────────────────────────────────────────────────────────────────────
// UI maps · se quedan en la página (color/estado/match son decisiones de UI)
// ─────────────────────────────────────────────────────────────────────────
const FASE_COLOR: Record<string, string> = { 'Activo':'#16A34A', 'En despliegue':'#F97316', 'Cerrado':'#6e6e73' }
const ESTADO_HITO: Record<string, string> = { 'Pendiente':'#F97316', 'Completado':'#16A34A', 'En revisión':'#5B21B6' }
const TIPO_HITO_COLOR: Record<string, string> = {
 'Desembolso':'#16A34A', 'Solicitud':'#5B21B6', 'Evaluación':'#F97316',
 'Hito':'#0EA5E9', 'Inversión':'#1F4E8C', 'Reforma':'#DC2626',
}
const MATCH_COLOR: Record<string, string> = { 'CRÍTICO':'#DC2626', 'ALTO':'#F97316', 'MEDIO':'#EAB308', 'BAJO':'#0EA5E9' }

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function FondosEuropeosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const {
    componentes: COMPONENTES,
    pertes: PERTES,
    convocatorias: CONVOCATORIAS,
    hitos: HITOS,
    beneficiarios: BENEFICIARIOS,
    mfpFondos: MFP_FONDOS,
    prtrTotals,
  } = useFondosEuropeos()

  const PRTR_TOTAL_ASIG = prtrTotals.total_asignado
  const PRTR_TOTAL_EJEC = prtrTotals.total_ejecutado
  const PRTR_TRANSF = prtrTotals.transferido
  const PRTR_HITOS_T = prtrTotals.hitos_total
  const PRTR_HITOS_C = prtrTotals.hitos_cumplidos

  const [tab, setTab] = useState<'prtr' | 'pertes' | 'mfp' | 'convocatorias' | 'hitos' | 'beneficiarios'>('prtr')

  const totals = useMemo(() => {
    const totalAsig = COMPONENTES.reduce((s, c) => s + c.asignado, 0)
    const totalEjec = COMPONENTES.reduce((s, c) => s + c.ejecutado, 0)
    const proxCierre = CONVOCATORIAS.filter(c => c.diasRestantes <= 30).length
    const totalAsigPertes = PERTES.reduce((s, p) => s + p.asignado, 0)
    const totalEjecPertes = PERTES.reduce((s, p) => s + p.ejecutado, 0)
    return { totalAsig, totalEjec, proxCierre, totalAsigPertes, totalEjecPertes }
  }, [COMPONENTES, CONVOCATORIAS, PERTES])

  const ejecPct = PRTR_TOTAL_ASIG > 0 ? Math.round((PRTR_TOTAL_EJEC / PRTR_TOTAL_ASIG) * 100) : 0
  const transfPct = PRTR_TOTAL_ASIG > 0 ? Math.round((PRTR_TRANSF / PRTR_TOTAL_ASIG) * 100) : 0
  const hitosPct = PRTR_HITOS_T > 0 ? Math.round((PRTR_HITOS_C / PRTR_HITOS_T) * 100) : 0

  return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
 <section style={{
          background:'linear-gradient(135deg,#003399 0%,#001F5C 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
          position:'relative', overflow:'hidden',
        }}>
          {/* Estrellas UE decorativas */}
 <div style={{ position:'absolute', top:30, right:60, opacity:0.18, pointerEvents:'none', width:160, height:160 }}>
            {[0, 60, 120, 180, 240, 300].map(deg => (
 <div key={deg} style={{
                position:'absolute', top:80, left:80, width:14, height:14,
                transform:`translate(${Math.cos(deg * Math.PI / 180) * 60 - 7}px, ${Math.sin(deg * Math.PI / 180) * 60 - 7}px)`,
                background:'#FFCC00',
                clipPath:'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
              }}/>
            ))}
 </div>
 <div>
 <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              LICITACIONES Y CONTRATACIÓN PÚBLICA · FONDOS EUROPEOS Y PRTR
 </p>
 <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              España · {(PRTR_TOTAL_ASIG/1000).toFixed(0)} mil M€ <em style={{ fontWeight:300, fontStyle:'italic', color:'#FFCC00' }}>del Plan de Recuperación</em>
 </h1>
 <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              {ejecPct}% recibido por España ({(PRTR_TOTAL_EJEC/1000).toFixed(0)} mil M€) · {transfPct}% transferido a beneficiarios · {hitosPct}% de hitos CID cumplidos. Seguimiento integrado de PRTR (NextGen) y MFP 2021-2027.
 </p>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, position:'relative' }}>
 <HeroKPI label="PRTR total" value={`${(PRTR_TOTAL_ASIG/1000).toFixed(0)}B€`} accent="#FFCC00"/>
 <HeroKPI label="Recibido" value={`${(PRTR_TOTAL_EJEC/1000).toFixed(0)}B€`} accent="#86EFAC"/>
 <HeroKPI label="Transferido" value={`${(PRTR_TRANSF/1000).toFixed(0)}B€`}     accent="#FCD34D"/>
 <HeroKPI label="Hitos cumpl." value={`${PRTR_HITOS_C}/${PRTR_HITOS_T}`}          accent="#7DD3FC"/>
 </div>
 </section>

        {/* ───── Snapshot · KPIs financieros ───── */}
 <section style={{ marginBottom:18 }}>
 <SectionHeader label="Snapshot Plan de Recuperación · cierre Q1-2026" count="MRR · NextGenerationEU" accent="#003399"/>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
 <SKpi label="∑ Asignado España" value={`${(PRTR_TOTAL_ASIG/1000).toFixed(0)}.0`} sub="mil M€" color="#003399"/>
 <SKpi label="Recibido del MRR" value={`${(PRTR_TOTAL_EJEC/1000).toFixed(0)}.0`} sub="mil M€" delta={`${ejecPct}% · 5 desembolsos`} pos color="#16A34A"/>
 <SKpi label="Transferido benefic." value={`${(PRTR_TRANSF/1000).toFixed(1)}`}        sub="mil M€" delta={`${transfPct}% comprometido`} pos color="#0F766E"/>
 <SKpi label="Pendiente de recibir" value={`${((PRTR_TOTAL_ASIG - PRTR_TOTAL_EJEC)/1000).toFixed(0)}.0`} sub="mil M€" color="#F97316"/>
 <SKpi label="Hitos CID cumplidos" value={`${hitosPct}%`} sub={`${PRTR_HITOS_C}/${PRTR_HITOS_T}`} pos color="#5B21B6"/>
 <SKpi label="Componentes seguidos" value={String(COMPONENTES.length)} sub="de 30 totales" color="#7C3AED"/>
 <SKpi label="PERTEs estratégicos" value={String(PERTES.length)}      sub="proyectos" color="#DC2626"/>
 <SKpi label="Convocatorias abiertas" value={String(CONVOCATORIAS.length)} sub={`${totals.proxCierre} cierran 30d`} color="#EAB308"/>
 </div>
 </section>

        {/* ───── Tabs ───── */}
 <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'prtr',         label:'PRTR · Componentes',     count: COMPONENTES.length },
            { k:'pertes',       label:'PERTEs estratégicos',    count: PERTES.length },
            { k:'mfp',          label:'MFP 2021-2027',          count: MFP_FONDOS.length },
            { k:'convocatorias',label:'Convocatorias abiertas', count: CONVOCATORIAS.length },
            { k:'hitos',        label:'Hitos UE y desembolsos', count: HITOS.length },
            { k:'beneficiarios',label:'Beneficiarios',           count: BENEFICIARIOS.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
 <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: active ? '#fff' : 'transparent', color: active ? '#1d1d1f' : '#6e6e73',
                border:'none', borderRadius:999, padding:'7px 14px',
                fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer',
                fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>
                {t.label} <span style={{ marginLeft:5, color: active ? '#003399' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
 </button>
            )
          })}
 </div>

        {/* ───── TAB · PRTR Componentes ───── */}
        {tab === 'prtr' && (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
 <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:1080 }}>
 <thead>
 <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['#','Área','Componente','Ministerio','Asignado','Ejecutado','% Ejec.','Hitos CID'].map(h => (
 <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
 </tr>
 </thead>
 <tbody>
                  {COMPONENTES.map((c, i) => {
                    const pctEj = (c.ejecutado / c.asignado) * 100
                    const pctHi = (c.hitosCumplidos / c.hitos) * 100
                    return (
 <tr key={c.id} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
 <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:800, color:'#1d1d1f' }}>{i+1}</td>
 <td style={{ padding:'10px 12px' }}>
 <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:`${c.color}15`, color:c.color, border:`1px solid ${c.color}40` }}>{c.area}</span>
 </td>
 <td style={{ padding:'10px 12px', fontWeight:600, color:'#1d1d1f' }}>{c.nombre}</td>
 <td style={{ padding:'10px 12px', color:'#3a3a3d', fontSize:11 }}>{c.ministerio}</td>
 <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:c.color }}>{c.asignado.toLocaleString('es-ES')}M€</td>
 <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:600, color:'#16A34A' }}>{c.ejecutado.toLocaleString('es-ES')}M€</td>
 <td style={{ padding:'10px 12px' }}>
 <div style={{ display:'flex', alignItems:'center', gap:8 }}>
 <div style={{ flex:1, height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:60 }}>
 <div style={{ width:`${pctEj}%`, height:'100%', background:c.color }}/>
 </div>
 <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:c.color, minWidth:32, textAlign:'right' }}>{pctEj.toFixed(0)}%</span>
 </div>
 </td>
 <td style={{ padding:'10px 12px' }}>
 <span style={{ fontSize:10, fontWeight:700, color: pctHi >= 80 ? '#16A34A' : pctHi >= 60 ? '#F97316' : '#DC2626', fontFamily:'var(--font-display)' }}>
                            {c.hitosCumplidos}/{c.hitos} <span style={{ fontSize:9, color:'#86868b' }}>· {pctHi.toFixed(0)}%</span>
 </span>
 </td>
 </tr>
                    )
                  })}
 </tbody>
 </table>
 </div>
 </section>
        )}

        {/* ───── TAB · PERTEs ───── */}
        {tab === 'pertes' && (
 <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))', gap:10 }}>
            {[...PERTES].sort((a,b) => b.asignado - a.asignado).map(p => {
              const pctEj = (p.ejecutado / p.asignado) * 100
              return (
 <article key={p.id} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                  padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`3px solid ${p.color}`,
                }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
 <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${FASE_COLOR[p.fase]}15`, color:FASE_COLOR[p.fase], border:`1px solid ${FASE_COLOR[p.fase]}40`,
                    }}>{p.fase.toUpperCase()}</span>
 <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>{p.ministerio}</span>
 </div>
 <h3 style={{ margin:'0 0 8px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em', color:'#1d1d1f', lineHeight:1.3 }}>{p.nombre}</h3>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:5 }}>
 <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>Ejecución</span>
 <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:p.color }}>{p.ejecutado.toLocaleString('es-ES')}M€ <span style={{ color:'#86868b', fontWeight:600 }}>/ {p.asignado.toLocaleString('es-ES')}M€ · {pctEj.toFixed(0)}%</span></span>
 </div>
 <div style={{ height:7, background:'#F5F5F7', borderRadius:3, overflow:'hidden', marginBottom:10 }}>
 <div style={{ width:`${pctEj}%`, height:'100%', background:p.color }}/>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
 <Mini label="Empresas" value={String(p.empresas)} sub="participan" color={p.color}/>
 <Mini label="Empleos" value={p.empleos}          sub="generados" color="#16A34A"/>
 </div>
 </article>
              )
            })}
 </section>
        )}

        {/* ───── TAB · MFP ───── */}
        {tab === 'mfp' && (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Marco Financiero Plurianual 2021-2027 · fondos estructurales</h3>
 <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Asignación a España y nivel de ejecución por fondo · datos al cierre Q1-2026</p>
 <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {MFP_FONDOS.map(f => {
                const pctEj = (f.ejecutado / f.asignado) * 100
                return (
 <div key={f.fondo} style={{
                    display:'grid', gridTemplateColumns:'120px 1fr 200px', gap:14, alignItems:'center',
                    padding:'12px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                    borderLeft:`3px solid ${f.color}`,
                  }}>
 <div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:800, color:f.color }}>{f.fondo}</div>
 <div style={{ fontSize:10, color:'#6e6e73', marginTop:2, lineHeight:1.3 }}>{f.desc}</div>
 </div>
 <div>
 <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:11 }}>
 <span style={{ color:'#6e6e73' }}>Asignado: <strong style={{ color:'#1d1d1f' }}>{f.asignado.toLocaleString('es-ES')}M€</strong></span>
 <span style={{ color:'#16A34A', fontWeight:700 }}>Ejec: {f.ejecutado.toLocaleString('es-ES')}M€</span>
 </div>
 <div style={{ height:10, background:'#fff', borderRadius:5, overflow:'hidden', border:'1px solid #ECECEF' }}>
 <div style={{ width:`${pctEj}%`, height:'100%', background:f.color, borderRadius:5 }}/>
 </div>
 </div>
 <div style={{ textAlign:'right' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:f.color, lineHeight:1 }}>{pctEj.toFixed(0)}<span style={{ fontSize:14, color:'#6e6e73', fontWeight:600 }}>%</span></div>
 <div style={{ fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginTop:3 }}>Ejecutado</div>
 </div>
 </div>
                )
              })}
 </div>
            {MFP_FONDOS.length > 0 && (
 <div style={{ marginTop:16, padding:'12px 14px', background:'#003399', borderRadius:10, color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'baseline', flexWrap:'wrap', gap:8 }}>
 <div>
 <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.7 }}>∑ TOTAL MFP 2021-2027</div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, marginTop:3 }}>{MFP_FONDOS.reduce((s,f) => s + f.asignado, 0).toLocaleString('es-ES')}<span style={{ fontSize:14, opacity:0.65 }}> M€</span></div>
 </div>
 <div style={{ textAlign:'right' }}>
 <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.7 }}>EJECUTADO</div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, marginTop:3, color:'#FFCC00' }}>{Math.round((MFP_FONDOS.reduce((s,f) => s + f.ejecutado, 0) / MFP_FONDOS.reduce((s,f) => s + f.asignado, 0)) * 100)}<span style={{ fontSize:14, opacity:0.65 }}>%</span></div>
 </div>
 </div>
            )}
 </section>
        )}

        {/* ───── TAB · Convocatorias ───── */}
        {tab === 'convocatorias' && (
 <section style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[...CONVOCATORIAS].sort((a,b) => a.diasRestantes - b.diasRestantes).map(c => {
              const cierreColor = c.diasRestantes <= 14 ? '#DC2626' : c.diasRestantes <= 30 ? '#F97316' : '#16A34A'
              return (
 <article key={c.id} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                  padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`4px solid ${MATCH_COLOR[c.match]}`,
                  display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:14, alignItems:'center',
                }}>
 <div style={{ minWidth:0 }}>
 <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
 <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:4, background:MATCH_COLOR[c.match], color:'#fff' }}>MATCH {c.match}</span>
 <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:'#003399', color:'#fff' }}>{c.fondo.toUpperCase()}</span>
 <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:600 }}>· {c.beneficiarios.toUpperCase()} · {c.ccaa}</span>
 </div>
 <h3 style={{ margin:'0 0 3px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{c.titulo}</h3>
 <div style={{ fontSize:11, color:'#6e6e73' }}>{c.organismo}</div>
 </div>
 <div style={{ textAlign:'right' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#003399', lineHeight:1 }}>{c.importe}<span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>M€</span></div>
 <div style={{ fontSize:9.5, color:'#86868b', marginTop:2 }}>importe convocatoria</div>
 </div>
 <div style={{ textAlign:'right' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:cierreColor, lineHeight:1 }}>{c.diasRestantes}<span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>d</span></div>
 <div style={{ fontSize:9.5, color:'#86868b', marginTop:2 }}>{c.fechaCierre}</div>
 </div>
 <button style={{
                    background:'#003399', color:'#fff', border:'none',
                    borderRadius:8, padding:'8px 16px',
                    fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
                  }}>Ver bases →</button>
 </article>
              )
            })}
 </section>
        )}

        {/* ───── TAB · Hitos ───── */}
        {tab === 'hitos' && (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600 }}>Calendario de hitos y desembolsos · UE-España</h3>
 <p style={{ margin:'0 0 18px', fontSize:11.5, color:'#6e6e73' }}>Solicitudes de pago, desembolsos del MRR, hitos CID y reformas vinculadas</p>
 <div style={{ position:'relative' }}>
 <div style={{ position:'absolute', left:55, top:6, bottom:6, width:2, background:'#ECECEF' }}/>
              {[...HITOS].sort((a,b) => parseDate(b.fecha).getTime() - parseDate(a.fecha).getTime()).map((h, i) => (
 <div key={i} style={{
                  display:'grid', gridTemplateColumns:'70px 18px 1fr auto',
                  gap:8, alignItems:'flex-start',
                  padding: i === 0 ? '0 0 14px 0' : '14px 0',
                  borderTop: i === 0 ? 'none' : '1px solid #FAFAFB',
                }}>
 <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:'#1d1d1f', textAlign:'right' }}>{h.fecha}</span>
 <div style={{ position:'relative', width:18, height:18 }}>
 <div style={{
                      width:14, height:14, borderRadius:'50%', background:'#fff',
                      border:`3px solid ${TIPO_HITO_COLOR[h.tipo]}`, boxShadow:`0 0 0 3px ${TIPO_HITO_COLOR[h.tipo]}22`,
                      position:'absolute', top:3, left:2, zIndex:1,
                    }}/>
 </div>
 <div style={{ minWidth:0 }}>
 <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
 <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:4, background:TIPO_HITO_COLOR[h.tipo], color:'#fff' }}>{h.tipo.toUpperCase()}</span>
 <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:999, background:`${ESTADO_HITO[h.estado]}15`, color:ESTADO_HITO[h.estado], border:`1px solid ${ESTADO_HITO[h.estado]}40` }}>{h.estado.toUpperCase()}</span>
 </div>
 <h4 style={{ margin:'0 0 3px', fontFamily:'var(--font-display)', fontSize:13, fontWeight:600, color:'#1d1d1f', letterSpacing:'-0.012em' }}>{h.titulo}</h4>
 <p style={{ margin:0, fontSize:11, color:'#3a3a3d', lineHeight:1.45 }}>{h.detalle}</p>
 </div>
                  {h.importe && (
 <div style={{ textAlign:'right' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#003399' }}>{(h.importe/1000).toFixed(1)}<span style={{ fontSize:10, color:'#6e6e73' }}>B€</span></div>
 </div>
                  )}
 </div>
              ))}
 </div>
 </section>
        )}

        {/* ───── TAB · Beneficiarios ───── */}
        {tab === 'beneficiarios' && (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
 <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:880 }}>
 <thead>
 <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['#','Beneficiario','Tipo','Total recibido','Proyectos','Sectores','Estado'].map(h => (
 <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
 </tr>
 </thead>
 <tbody>
                  {[...BENEFICIARIOS].sort((a,b) => b.totalRecibido - a.totalRecibido).map((b, i) => {
                    const tipoColor = b.tipo === 'Gran empresa' ? '#1F4E8C' : b.tipo === 'Pyme' ? '#F97316' : b.tipo === 'CCAA' ? '#5B21B6' : b.tipo === 'Ayuntamiento' ? '#16A34A' : b.tipo === 'Investigación' ? '#0EA5E9' : '#D43F8D'
                    return (
 <tr key={b.nombre} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
 <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:800, color:'#1d1d1f' }}>{i+1}</td>
 <td style={{ padding:'10px 12px', fontWeight:600, color:'#1d1d1f' }}>{b.nombre}</td>
 <td style={{ padding:'10px 12px' }}>
 <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:tipoColor, color:'#fff' }}>{b.tipo.toUpperCase()}</span>
 </td>
 <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#003399' }}>{b.totalRecibido}M€</td>
 <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>{b.proyectos}</td>
 <td style={{ padding:'10px 12px' }}>
 <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                            {b.sectores.map(s => (
 <span key={s} style={{ fontSize:9, padding:'2px 7px', borderRadius:999, background:'#F5F5F7', color:'#3a3a3d', fontWeight:600 }}>{s}</span>
                            ))}
 </div>
 </td>
 <td style={{ padding:'10px 12px' }}>
 <span style={{
                            fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                            padding:'2px 7px', borderRadius:999,
                            background: b.estado === 'Activo' ? '#16A34A15' : '#6e6e7315',
                            color:     b.estado === 'Activo' ? '#16A34A' : '#6e6e73',
                            border: `1px solid ${b.estado === 'Activo' ? '#16A34A40' : '#6e6e7340'}`,
                          }}>{b.estado.toUpperCase()}</span>
 </td>
 </tr>
                    )
                  })}
 </tbody>
 </table>
 </div>
 </section>
        )}

 </main>
 <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Fondos Europeos y PRTR · Politeia Analítica · {new Date().getFullYear()}
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

function SectionHeader({ label, count, accent }: { label: string, count: string, accent: string }) {
  return (
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
 <h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#3a3a3d', display:'flex', alignItems:'center', gap:8 }}>
 <span style={{ width:3, height:14, borderRadius:2, background:accent, display:'inline-block' }}/>
        {label}
 </h2>
 <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>{count}</span>
 </div>
  )
}

function SKpi({ label, value, sub, delta, pos, color }: { label:string, value:string, sub?:string, delta?:string, pos?:boolean, color:string }) {
  return (
 <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>{label}</div>
 <div style={{ display:'flex', alignItems:'baseline', gap:5, marginTop:4 }}>
 <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color, letterSpacing:'-0.022em', lineHeight:1 }}>{value}</span>
        {sub && <span style={{ fontSize:10, color:'#86868b', fontWeight:600 }}>{sub}</span>}
 </div>
      {delta && (
 <div style={{ fontSize:10, fontWeight:700, color: pos ? '#16A34A' : color, marginTop:5 }}>
          {pos ? '▲ ' : ''}{delta}
 </div>
      )}
 </div>
  )
}

function Mini({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
 <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8, padding:'7px 9px', textAlign:'center' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color, lineHeight:1 }}>{value}</div>
 <div style={{ fontSize:9, color:'#86868b', fontWeight:600, marginTop:3 }}>{sub}</div>
 <div style={{ fontSize:8.5, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginTop:3 }}>{label}</div>
 </div>
  )
}

function parseDate(s: string): Date {
  const [d, m, y] = s.split('/').map(Number)
  return new Date(y, m - 1, d)
}
