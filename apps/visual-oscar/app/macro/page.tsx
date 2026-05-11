'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useMacroDataset } from '@/hooks/useMacroDataset'
import type { Indic } from '@/data/macro-fixture'

// ─────────────────────────────────────────────────────────────────────────
// Termómetro macro-político · score 0-100
// ─────────────────────────────────────────────────────────────────────────
function calcTermometro(kpis: Indic[]) {
  // Cada indicador suma o resta puntos según si va en buena o mala dirección
  let score = 50
  for (const k of kpis) {
    const isGood = k.dir === k.good || k.dir === 'flat'
    score += isGood ? 4 : -3
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

export default function MacroPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const {
    kpis,
    comparativa,
    ipcComp,
    vivienda,
    mercados,
    salarios,
    calendario,
    sectores,
    voterProfiles,
    histCycles,
    impactoPolitico,
    loading,
  } = useMacroDataset()

  const termometro = useMemo(() => calcTermometro(kpis), [kpis])
  const [tab, setTab] = useState<'comp' | 'mercados' | 'vivienda' | 'salarios' | 'calend' | 'votantes' | 'ciclos' | 'impacto'>('comp')

  // KPI seleccionado para mostrar serie y comentario
  const [kpiSel, setKpiSel] = useState<string | null>(null)
  const kpiActivo = useMemo(() => {
    if (kpis.length === 0) return null
    const selected = kpiSel ? kpis.find(k => k.id === kpiSel) : null
    return selected ?? kpis[0]
  }, [kpis, kpiSel])

  if (loading && kpis.length === 0) {
    return (
      <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
        <AppHeader/>
        <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>
          <p style={{ color:'#6e6e73', fontSize:13 }}>Cargando indicadores macroeconómicos…</p>
        </main>
      </div>
    )
  }

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero · termómetro macro-político ───── */}
        <section style={{
          background:'linear-gradient(135deg,#0E2A1F 0%,#052016 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.7fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              MACRO-POLITICAL & ECONOMIC INTELLIGENCE
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              España crece +2.7% · prima en 102 pb <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>y déficit por debajo del 3%</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              12 indicadores con sparklines · comparativa UE · vivienda · mercados · salarios · calendario macro · perfiles de votante · ciclos electorales históricos · impacto político por variable.
            </p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <Termometro value={termometro}/>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', opacity:0.7, marginTop:6 }}>Termómetro macro-político</div>
            <div style={{ fontSize:10.5, opacity:0.65, marginTop:2 }}>{termometro >= 70 ? 'Coyuntura favorable' : termometro >= 55 ? 'Coyuntura mixta' : termometro >= 40 ? 'Tensiones crecientes' : 'Coyuntura adversa'}</div>
          </div>
        </section>

        {/* ───── KPIs principales (12) con sparklines ───── */}
        {kpis.length > 0 && (
          <section style={{ marginBottom:18 }}>
            <SectionHeader label="Indicadores clave" count={`${kpis.length} variables · datos abril-mayo 2026`} accent="#0F766E"/>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              {kpis.map(k => {
                const isGood = (k.dir === k.good)
                const deltaCol = isGood ? '#16A34A' : '#DC2626'
                const isSelected = kpiActivo?.id === k.id
                return (
                  <button key={k.id} onClick={() => setKpiSel(k.id)} style={{
                    background:'#fff', border:`1px solid ${isSelected ? k.c : '#ECECEF'}`, borderRadius:14,
                    padding:'14px 14px 10px', boxShadow: isSelected ? `0 0 0 3px ${k.c}22, 0 1px 3px rgba(0,0,0,0.04)` : '0 1px 3px rgba(0,0,0,0.04)',
                    borderLeft:`3px solid ${k.c}`, textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                    transition:'box-shadow 200ms',
                  }}>
                    <p style={{ margin:'0 0 6px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{k.l}</p>
                    <div style={{ display:'flex', alignItems:'baseline', gap:5, marginBottom:3 }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:k.c, letterSpacing:'-0.02em', lineHeight:1 }}>{k.v}</span>
                      <span style={{
                        marginLeft:'auto', fontSize:10.5, fontWeight:700, color:deltaCol,
                      }}>{k.dir === 'up' ? '▲' : k.dir === 'down' ? '▼' : '→'} {k.delta}</span>
                    </div>
                    <Sparkline data={k.serie} color={k.c} h={26}/>
                    <div style={{ fontSize:9.5, color:'#86868b', marginTop:5, lineHeight:1.3 }}>{k.unidad} · {k.fecha}</div>
                  </button>
                )
              })}
            </div>
            {/* Detalle del KPI seleccionado */}
            {kpiActivo && (
              <div style={{
                marginTop:10, background:'#fff', border:`1px solid ${kpiActivo.c}40`, borderRadius:14,
                padding:'14px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap',
              }}>
                <span style={{
                  fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 8px', borderRadius:4,
                  background:kpiActivo.c, color:'#fff',
                }}>{kpiActivo.l.toUpperCase()}</span>
                <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:kpiActivo.c }}>{kpiActivo.v}</span>
                <span style={{ fontSize:11, color:'#3a3a3d', flex:1, minWidth:200 }}>{kpiActivo.comentario}</span>
                <span style={{ fontSize:10, color:'#86868b', fontWeight:600 }}>Fuente: {kpiActivo.fuente}</span>
              </div>
            )}
          </section>
        )}

        {/* ───── Tabs ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'comp',     label:'Comparativa UE',         count: comparativa.length },
            { k:'mercados', label:'Mercados',                count: mercados.length },
            { k:'vivienda', label:'Vivienda',                count: vivienda.length },
            { k:'salarios', label:'Salarios y poder adq.',  count: salarios.length },
            { k:'calend',   label:'Calendario macro',        count: calendario.length },
            { k:'votantes', label:'Perfiles votante',       count: voterProfiles.length },
            { k:'ciclos',   label:'Ciclos históricos',      count: histCycles.length },
            { k:'impacto',  label:'Impacto político',        count: impactoPolitico.length },
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
                {t.label} <span style={{ marginLeft:5, color: active ? '#0F766E' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── Tab · Comparativa UE ───── */}
        {tab === 'comp' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>España vs principales economías UE</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Datos comparados Q1 2026 · fuentes Eurostat e institutos nacionales</p>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['País','PIB %','Paro %','IPC %','Deuda/PIB','Déficit/PIB','Score relativo'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparativa.map((c, i) => {
                    // score sintético: pib alto + paro bajo + ipc cerca de 2 + deuda baja + déficit cerca de 0
                    const score = Math.round(50 + c.pib * 6 - c.paro * 2 - Math.abs(c.ipc - 2) * 4 - (c.deuda - 60) * 0.2 + (c.deficit) * 4)
                    const sCol = score >= 60 ? '#16A34A' : score >= 40 ? '#F97316' : '#DC2626'
                    return (
                      <tr key={c.pais} style={{ borderBottom:'1px solid #ECECEF', background: c.pais === 'España' ? '#FAFAFB' : i%2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ width:28, height:20, borderRadius:3, background:c.c, color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, letterSpacing:'0.06em', flexShrink:0 }}>{c.flag}</span>
                            <strong style={{ fontWeight: c.pais === 'España' ? 800 : 600, color:'#1d1d1f' }}>{c.pais}</strong>
                          </div>
                        </td>
                        <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', fontWeight:700, color: c.pib > 1.5 ? '#16A34A' : c.pib > 0.5 ? '#F97316' : '#DC2626' }}>+{c.pib.toFixed(1)}%</td>
                        <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', fontWeight:700, color: c.paro > 8 ? '#DC2626' : '#16A34A' }}>{c.paro.toFixed(1)}%</td>
                        <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', fontWeight:700, color: Math.abs(c.ipc - 2) < 0.5 ? '#16A34A' : '#F97316' }}>{c.ipc.toFixed(1)}%</td>
                        <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', fontWeight:700, color: c.deuda > 100 ? '#DC2626' : c.deuda > 80 ? '#F97316' : '#16A34A' }}>{c.deuda.toFixed(1)}%</td>
                        <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', fontWeight:700, color: c.deficit > -3 ? '#16A34A' : '#DC2626' }}>{c.deficit.toFixed(1)}%</td>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:7, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:80 }}>
                              <div style={{ width:`${Math.max(0, Math.min(100, score))}%`, height:'100%', background:sCol }}/>
                            </div>
                            <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:sCol, minWidth:24, textAlign:'right' }}>{score}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* IPC Components + Sectores PIB */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginTop:24 }}>
              <div>
                <h4 style={{ margin:'0 0 12px', fontFamily:'var(--font-display)', fontSize:13, fontWeight:600, letterSpacing:'-0.012em' }}>IPC por componentes · marzo 2026</h4>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[...ipcComp].sort((a,b) => b.val - a.val).map(c => {
                    const col = c.val >= 4 ? '#DC2626' : c.val >= 2.5 ? '#F97316' : '#16A34A'
                    return (
                      <div key={c.cat} style={{ display:'grid', gridTemplateColumns:'140px 1fr 50px 30px', gap:10, alignItems:'center' }}>
                        <span style={{ fontSize:11, color:'#3a3a3d', fontWeight:600 }}>{c.cat}</span>
                        <div style={{ height:9, background:'#F5F5F7', borderRadius:5, overflow:'hidden' }}>
                          <div style={{ width:`${(c.val / 7) * 100}%`, height:'100%', background:col, borderRadius:5 }}/>
                        </div>
                        <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:col, textAlign:'right' }}>{c.val.toFixed(1)}%</span>
                        <span style={{ fontSize:10, color:'#86868b', textAlign:'right' }}>{c.peso}</span>
                      </div>
                    )
                  })}
                  <div style={{ display:'grid', gridTemplateColumns:'140px 1fr 50px 30px', gap:10, alignItems:'center', marginTop:5, paddingTop:5, borderTop:'1px dashed #ECECEF' }}>
                    <span style={{ fontSize:9.5, color:'#86868b', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Variación</span>
                    <span/>
                    <span/>
                    <span style={{ fontSize:9, color:'#86868b', fontWeight:700, letterSpacing:'0.04em' }}>peso</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 style={{ margin:'0 0 12px', fontFamily:'var(--font-display)', fontSize:13, fontWeight:600, letterSpacing:'-0.012em' }}>Estructura del PIB por sectores</h4>
                <div style={{ display:'flex', height:32, borderRadius:6, overflow:'hidden', marginBottom:12 }}>
                  {sectores.map(s => (
                    <div key={s.sector} title={`${s.sector}: ${s.pct}%`} style={{
                      width:`${s.pct}%`, background:s.color,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontFamily:'var(--font-display)', fontWeight:700, fontSize:10.5,
                    }}>{s.pct >= 8 ? `${s.pct}%` : ''}</div>
                  ))}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {sectores.map(s => (
                    <div key={s.sector} style={{ display:'grid', gridTemplateColumns:'12px 1fr auto', gap:8, alignItems:'center' }}>
                      <span style={{ width:10, height:10, borderRadius:2, background:s.color, display:'inline-block' }}/>
                      <span style={{ fontSize:11.5, color:'#1d1d1f', fontWeight:600 }}>{s.sector}</span>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:s.color }}>{s.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ───── Tab · Mercados ───── */}
        {tab === 'mercados' && (
          <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
            {mercados.map(m => {
              const isPos = m.delta.startsWith('+')
              return (
                <article key={m.l} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                  padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`3px solid ${m.color}`,
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                    <span style={{ fontSize:9.5, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{m.l}</span>
                    <span style={{ fontSize:10.5, fontWeight:700, color: isPos ? '#16A34A' : '#DC2626' }}>{isPos ? '▲' : '▼'} {m.delta}</span>
                  </div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:m.color, letterSpacing:'-0.022em', lineHeight:1, marginBottom:6 }}>{m.v}</div>
                  <Sparkline data={m.serie} color={m.color} h={32}/>
                </article>
              )
            })}
          </section>
        )}

        {/* ───── Tab · Vivienda ───── */}
        {tab === 'vivienda' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Mercado de la vivienda · 2026</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Precios, esfuerzo, hipotecas y oferta · fuentes BdE, Tinsa, INE y Fotocasa</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {vivienda.map(v => (
                <div key={v.l} style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'14px 16px' }}>
                  <p style={{ margin:'0 0 5px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>{v.l}</p>
                  <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:v.c, letterSpacing:'-0.022em' }}>{v.v}</span>
                  </div>
                  <p style={{ margin:'5px 0 0', fontSize:10.5, color:'#6e6e73' }}>{v.sub}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── Tab · Salarios ───── */}
        {tab === 'salarios' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Salarios y poder adquisitivo</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>SMI, mediano, brecha de género y pérdida acumulada · fuentes INE, Hacienda y Trabajo</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {salarios.map(s => (
                <div key={s.l} style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'14px 16px' }}>
                  <p style={{ margin:'0 0 5px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>{s.l}</p>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:s.c, letterSpacing:'-0.022em' }}>{s.v}</div>
                  <p style={{ margin:'5px 0 0', fontSize:10.5, color:'#6e6e73' }}>{s.sub}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── Tab · Calendario macro ───── */}
        {tab === 'calend' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Calendario macro · próximas publicaciones</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Datos económicos relevantes en los próximos 30 días</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {calendario.map((c, i) => (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'80px 1fr 100px 120px', gap:14, alignItems:'center',
                  padding:'12px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                  borderLeft:`3px solid ${c.color}`,
                }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:'#1d1d1f' }}>{c.fecha}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f' }}>{c.publi}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#3a3a3d' }}>{c.org}</div>
                  <span style={{
                    fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                    padding:'2px 8px', borderRadius:999, textAlign:'center',
                    background:`${c.color}15`, color:c.color, border:`1px solid ${c.color}40`,
                  }}>IMPACTO {c.impacto}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── Tab · Perfiles votante ───── */}
        {tab === 'votantes' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Perfiles de votante · sensibilidad económica</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Cómo afectan las variables económicas a cada arquetipo</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
              {voterProfiles.map(p => (
                <article key={p.nombre} style={{
                  background:'#FAFAFB', border:`1px solid ${p.c}40`, borderRadius:12,
                  padding:'14px 16px', borderLeft:`3px solid ${p.c}`,
                }}>
                  <div style={{ fontSize:13, fontWeight:700, color:p.c, marginBottom:10 }}>{p.nombre}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 10px', marginBottom:10, fontSize:11 }}>
                    <span style={{ color:'#6e6e73' }}>Renta</span>
                    <span style={{ color:'#1d1d1f', fontWeight:600, textAlign:'right' }}>{p.renta}K€</span>
                    <span style={{ color:'#6e6e73' }}>Alquiler</span>
                    <span style={{ color:'#1d1d1f', fontWeight:600, textAlign:'right' }}>{p.alquiler}</span>
                    <span style={{ color:'#6e6e73' }}>Hipoteca</span>
                    <span style={{ color:'#1d1d1f', fontWeight:600, textAlign:'right' }}>{p.hipoteca}</span>
                    <span style={{ color:'#6e6e73' }}>Ahorro/mes</span>
                    <span style={{ color:'#1d1d1f', fontWeight:600, textAlign:'right' }}>{p.ahorro}€</span>
                  </div>
                  <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>Sensibilidad (1-10)</div>
                  {Object.entries(p.sens).map(([k, v]) => (
                    <div key={k} style={{ display:'grid', gridTemplateColumns:'80px 1fr 18px', gap:6, alignItems:'center', marginBottom:3, fontSize:10.5 }}>
                      <span style={{ color:'#3a3a3d', textTransform:'capitalize' }}>{k}</span>
                      <div style={{ height:6, background:'#fff', borderRadius:3, overflow:'hidden', border:'1px solid #ECECEF' }}>
                        <div style={{ width:`${v * 10}%`, height:'100%', background:p.c, borderRadius:3 }}/>
                      </div>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:10.5, fontWeight:700, color:p.c, textAlign:'right' }}>{v}</span>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ───── Tab · Ciclos históricos ───── */}
        {tab === 'ciclos' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Ciclos electorales históricos · economía y resultado</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Lecciones empíricas de la relación entre coyuntura económica y voto</p>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['Elec.','Paro %','IPC %','PIB %','Gobernante','Ganador','Esc.','Lección'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {histCycles.map((c, i) => (
                    <tr key={c.elec} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:800, color:'#1d1d1f' }}>{c.elec}</td>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color: c.paro > 15 ? '#DC2626' : '#16A34A' }}>{c.paro}%</td>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color: c.ipc > 5 ? '#DC2626' : '#3a3a3d' }}>{c.ipc}%</td>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color: c.pib > 0 ? '#16A34A' : '#DC2626' }}>{c.pib > 0 ? '+' : ''}{c.pib}%</td>
                      <td style={{ padding:'9px 12px', color:'#3a3a3d' }}>{c.gobernante}</td>
                      <td style={{ padding:'9px 12px', fontWeight:700, color:'#1d1d1f' }}>{c.ganador}</td>
                      <td style={{ padding:'9px 12px', color:'#6e6e73' }}>{c.escanos}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'#3a3a3d' }}>{c.leccion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── Tab · Impacto político ───── */}
        {tab === 'impacto' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Impacto político por variable económica</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Variación estimada de intención de voto (pp) ante cada cambio · modelo Politeia</p>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                  {['Variable','PSOE','PP','VOX','Sumar','Tendencia neta'].map(h => (
                    <th key={h} style={{ textAlign:'center', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {impactoPolitico.map((row, i) => {
                  const valencia = (row.psoe + row.sumar) - (row.pp + row.vox)
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'10px 12px', fontWeight:700, color:'#1d1d1f', textAlign:'left' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:row.c }}/>
                          {row.var}
                        </span>
                      </td>
                      <DeltaCell v={row.psoe} color="#E1322D"/>
                      <DeltaCell v={row.pp}   color="#1F4E8C"/>
                      <DeltaCell v={row.vox}  color="#5BA02E"/>
                      <DeltaCell v={row.sumar}color="#D43F8D"/>
                      <td style={{ padding:'10px 12px', textAlign:'center' }}>
                        <span style={{
                          fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                          padding:'3px 9px', borderRadius:999,
                          background: valencia > 0 ? '#16A34A15' : '#DC262615',
                          color: valencia > 0 ? '#16A34A' : '#DC2626',
                          border:`1px solid ${valencia > 0 ? '#16A34A40' : '#DC262640'}`,
                        }}>{valencia > 0 ? 'FAVORECE GOBIERNO' : 'FAVORECE OPOSICIÓN'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Macro-Political &amp; Economic · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function Termometro({ value }: { value: number }) {
  // Gauge semicircular
  const cx = 90, cy = 80, r = 60
  const t = Math.max(0, Math.min(1, value / 100))
  const angleEnd = Math.PI * t
  const xEnd = cx - r * Math.cos(angleEnd)
  const yEnd = cy - r * Math.sin(angleEnd)
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${xEnd} ${yEnd}`
  const arcBg = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const color = value >= 70 ? '#86EFAC' : value >= 55 ? '#FCD34D' : value >= 40 ? '#FDBA74' : '#FCA5A5'
  return (
    <div style={{ textAlign:'center' }}>
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path d={arcBg} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" strokeLinecap="round"/>
        <path d={arc} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"/>
        <circle cx={xEnd} cy={yEnd} r="6" fill={color}/>
      </svg>
      <div style={{ marginTop:-10, fontFamily:'var(--font-display)', fontSize:36, fontWeight:700, color, letterSpacing:'-0.024em', lineHeight:1 }}>{value}<span style={{ fontSize:18, color:'rgba(255,255,255,0.6)', fontWeight:600 }}>/100</span></div>
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

function Sparkline({ data, color, h = 30 }: { data: number[], color: string, h?: number }) {
  const w = 100
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return `${x},${y}`
  }).join(' ')
  const area = `0,${h} ${pts} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:h, display:'block' }} preserveAspectRatio="none">
      <polyline points={area} fill={`${color}20`} stroke="none"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={w} cy={h - 4 - ((data[data.length - 1] - min) / range) * (h - 8)} r="2" fill={color}/>
    </svg>
  )
}

function DeltaCell({ v, color }: { v: number, color: string }) {
  const pos = v >= 0
  const txtColor = pos ? '#16A34A' : '#DC2626'
  return (
    <td style={{ padding:'10px 12px', textAlign:'center' }}>
      <div style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
        <span style={{ width:8, height:8, borderRadius:2, background:color, display:'inline-block' }}/>
        <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:txtColor }}>
          {pos ? '+' : ''}{v.toFixed(1)}
        </span>
      </div>
    </td>
  )
}
