'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useInstituciones } from '@/hooks/useInstituciones'
import type {
  Signo,
  SignoBloque,
  CCAA,
  Diputacion,
  Capital,
  Insular,
} from '@/data/instituciones-fixture'

// ─────────────────────────────────────────────────────────────────────────
// UI maps · se quedan en la página
// ─────────────────────────────────────────────────────────────────────────
const COLOR: Record<Signo, string> = {
 'PP':'#1F4E8C', 'PSOE':'#E1322D', 'PSC':'#C5152D',
 'PNV':'#7DB94B', 'PSE':'#E1322D',
 'CC':'#F2C43A', 'NC':'#00A0DC',
 'ERC':'#E8A030', 'Junts':'#1FA89B', 'Bildu':'#3F7A3A', 'BNG':'#5BB3D9',
 'CUP':'#F0DD2A', 'Sumar':'#D43F8D', 'Foro':'#002757',
 'ASG':'#0E7D8C', 'DO':'#9333EA', 'PRC':'#008C46',
 'TpT':'#7C2D92', 'Sa Unió':'#0E7490', 'Independiente':'#6e6e73',
}

const BLOQUE_META: Record<SignoBloque, { label: string; color: string }> = {
 'derecha':     { label:'CENTRO-DERECHA', color:'#1F4E8C' },
 'izquierda':   { label:'CENTRO-IZQUIERDA', color:'#E1322D' },
 'territorial': { label:'TERRITORIAL', color:'#7C3AED' },
}

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function InstitucionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const {
    ccaas: CCAAS,
    diputaciones: DIPUTACIONES,
    capitales: CAPITALES,
    insulares: INSULARES,
  } = useInstituciones()

  const [tab, setTab] = useState<'ccaa' | 'diputaciones' | 'capitales' | 'insulares'>('ccaa')
  const [filterBloque, setFilterBloque] = useState<SignoBloque | 'Todos'>('Todos')
  const [query, setQuery] = useState('')

  // Totales para el hero
  const totals = useMemo(() => {
    const presupTotal = CCAAS.reduce((s, c) => s + c.presup, 0)
    const ccaaPP = CCAAS.filter(c => c.bloque === 'derecha').length
    const ccaaPSOE = CCAAS.filter(c => c.bloque === 'izquierda').length
    const ccaaTerr = CCAAS.filter(c => c.bloque === 'territorial').length
    return { ccaa: CCAAS.length, dip: DIPUTACIONES.length, capitales: CAPITALES.length, insulares: INSULARES.length, presup: presupTotal, ccaaPP, ccaaPSOE, ccaaTerr }
  }, [CCAAS, DIPUTACIONES, CAPITALES, INSULARES])

  return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
 <section style={{
          background:'linear-gradient(135deg,#7C3AED 0%,#3B0764 100%)',
          borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
 <div>
 <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              INTELIGENCIA POLÍTICA · INSTITUCIONES LOCALES Y REGIONALES
 </p>
 <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              17 CCAA, 38 diputaciones <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>y 8 131 municipios</em>
 </h1>
 <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              Mapa de poder territorial: Comunidades Autónomas, Diputaciones provinciales y forales, capitales con &gt; 75k habitantes y cabildos / consells insulares.
              Presupuesto agregado autonómico: <strong style={{ color:'#fff' }}>{totals.presup.toFixed(1)} mil M€</strong>.
 </p>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
 <HeroKPI label="CCAA" value={String(totals.ccaa)}/>
 <HeroKPI label="Diput." value={String(totals.dip)}/>
 <HeroKPI label="Capitales" value={String(totals.capitales)}/>
 <HeroKPI label="Insul." value={String(totals.insulares)}/>
 </div>
 </section>

        {/* ───── Mapa de poder político (CCAA) ───── */}
 <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:14,
        }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
 <div>
 <h3 style={{ margin:'0 0 3px', fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, letterSpacing:'-0.013em' }}>Mapa de poder autonómico</h3>
 <p style={{ margin:0, fontSize:11.5, color:'#6e6e73' }}>{totals.ccaaPP} CCAA centro-derecha · {totals.ccaaPSOE} centro-izquierda · {totals.ccaaTerr} territorial</p>
 </div>
 <div style={{ display:'flex', gap:14, fontSize:11, color:'#3a3a3d' }}>
 <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span style={{ width:11, height:11, borderRadius:3, background:'#1F4E8C', display:'inline-block' }}/>Centro-derecha</span>
 <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span style={{ width:11, height:11, borderRadius:3, background:'#E1322D', display:'inline-block' }}/>Centro-izquierda</span>
 <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span style={{ width:11, height:11, borderRadius:3, background:'#7C3AED', display:'inline-block' }}/>Territorial</span>
 </div>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(78px,1fr))', gap:5 }}>
            {CCAAS.map(c => (
 <div key={c.id} title={`${c.nombre} · ${c.presidente} (${c.partido})`} style={{
                background: BLOQUE_META[c.bloque].color, color:'#fff',
                borderRadius:8, padding:'10px 6px', textAlign:'center',
                cursor:'help', minHeight:54,
                display:'flex', flexDirection:'column', justifyContent:'center',
              }}>
 <div style={{ fontSize:10, fontWeight:700, lineHeight:1.2, opacity:0.95 }}>{c.nombre.length > 14 ? c.nombre.slice(0,13)+'…' : c.nombre}</div>
 <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.04em', marginTop:3, opacity:0.85 }}>{c.partido}</div>
 </div>
            ))}
 </div>
 </section>

        {/* ───── Tabs ───── */}
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom:14 }}>
 <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, flexWrap:'wrap' }}>
            {([
              { k:'ccaa',         label:'Comunidades Autónomas', count: totals.ccaa },
              { k:'diputaciones', label:'Diputaciones',          count: totals.dip },
              { k:'capitales',    label:'Capitales y ciudades',  count: totals.capitales },
              { k:'insulares',    label:'Cabildos / Consells',   count: totals.insulares },
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
                  {t.label} <span style={{ marginLeft:5, color: active ? '#7C3AED' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
 </button>
              )
            })}
 </div>
 </div>

        {/* Filtro común para listas */}
 <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:14 }}>
 <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar institución, presidente o partido…"
            style={{
              flex:'1 1 280px', maxWidth:380,
              padding:'9px 14px', borderRadius:10,
              border:'1px solid #ECECEF', background:'#fff',
              fontSize:13, fontFamily:'inherit', outline:'none', color:'#1d1d1f',
            }}
          />
 <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Bloque:</span>
 <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3 }}>
            {(['Todos','derecha','izquierda','territorial'] as const).map(b => {
              const active = filterBloque === b
              const col = b === 'Todos' ? '#1d1d1f' : BLOQUE_META[b].color
              const lbl = b === 'Todos' ? 'Todos' : BLOQUE_META[b].label
              return (
 <button key={b} onClick={() => setFilterBloque(b)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? col : '#6e6e73',
                  border:'none', borderRadius:999, padding:'4px 10px',
                  fontSize:11, fontWeight: active ? 700 : 500, cursor:'pointer',
                  fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>{lbl}</button>
              )
            })}
 </div>
 </div>

        {/* ───── Tab CCAA ───── */}
        {tab === 'ccaa' && <TabCCAA query={query} bloque={filterBloque} data={CCAAS}/>}

        {/* ───── Tab Diputaciones ───── */}
        {tab === 'diputaciones' && <TabDiputaciones query={query} bloque={filterBloque} data={DIPUTACIONES}/>}

        {/* ───── Tab Capitales ───── */}
        {tab === 'capitales' && <TabCapitales query={query} bloque={filterBloque} data={CAPITALES}/>}

        {/* ───── Tab Insulares ───── */}
        {tab === 'insulares' && <TabInsulares query={query} bloque={filterBloque} data={INSULARES}/>}

 </main>
 <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Instituciones Locales y Regionales · Politeia Analítica · {new Date().getFullYear()}
 </footer>
 </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-tabs
// ─────────────────────────────────────────────────────────────────────────
function TabCCAA({ query, bloque, data }: { query: string, bloque: SignoBloque | 'Todos', data: CCAA[] }) {
  const q = query.trim().toLowerCase()
  const list = data.filter(c => bloque === 'Todos' || c.bloque === bloque)
                    .filter(c => !q || c.nombre.toLowerCase().includes(q) || c.presidente.toLowerCase().includes(q) || c.partido.toLowerCase().includes(q))
  return (
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))', gap:12 }}>
      {list.map(c => {
        const col = COLOR[c.partido] || '#6e6e73'
        const pctEsc = (c.escPdte / c.esc) * 100
        return (
 <article key={c.id} style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
          }}>
 <header style={{
              display:'grid', gridTemplateColumns:'1fr auto', gap:10, alignItems:'center',
              padding:'14px 16px',
              background:`linear-gradient(135deg, ${col}10, ${col}03)`,
              borderBottom:`2px solid ${col}`,
            }}>
 <div style={{ minWidth:0 }}>
 <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
 <span style={{
                    fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                    padding:'2px 7px', borderRadius:4,
                    background:col, color:'#fff',
                  }}>{c.partido}</span>
 <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em' }}>· DESDE {c.desde} · CAP. {c.capital}</span>
 </div>
 <h3 style={{ margin:'0 0 2px', fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, letterSpacing:'-0.014em', color:'#1d1d1f' }}>{c.nombre}</h3>
 <p style={{ margin:0, fontSize:11.5, color:'#3a3a3d', fontWeight:600 }}>{c.presidente}</p>
 </div>
 <div style={{ textAlign:'right', flexShrink:0 }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:col, letterSpacing:'-0.018em', lineHeight:1 }}>{c.escPdte}<span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>/{c.esc}</span></div>
 <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase', marginTop:2 }}>esc. del Pdte.</div>
 </div>
 </header>
 <div style={{ padding:'14px 16px' }}>
 <div style={{
                background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:9,
                padding:'8px 11px', marginBottom:10,
              }}>
 <div style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>Apoyo parlamentario</div>
 <div style={{ fontSize:12, color:'#1d1d1f', fontWeight:600, lineHeight:1.4 }}>{c.apoyo}</div>
 </div>
 <div style={{ marginBottom:10 }}>
 <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
 <span style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>% escaños propios</span>
 <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:col }}>{pctEsc.toFixed(1)}%</span>
 </div>
 <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
 <div style={{ width:`${pctEsc}%`, height:'100%', background:col, borderRadius:3 }}/>
 </div>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:10 }}>
 <Mini label="Población" value={`${c.pob.toFixed(1)}M`}            color="#3a3a3d"/>
 <Mini label="Presup." value={`${c.presup.toFixed(1)} mM€`}     color="#16A34A"/>
 <Mini label="Próx. elec." value={c.proxElec}                       color="#5B21B6"/>
 </div>
              {/* Consejerías clave */}
 <div style={{ marginBottom:10 }}>
 <div style={{ fontSize:8.5, fontWeight:800, letterSpacing:'0.08em', color:'#6e6e73', textTransform:'uppercase', marginBottom:5 }}>Consejerías clave</div>
 <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                  {c.consejerias.slice(0, 4).map(s => (
 <div key={s} style={{ fontSize:10.5, color:'#3a3a3d', lineHeight:1.4, display:'flex', gap:5 }}>
 <span style={{ color:col, fontWeight:700, flexShrink:0 }}>·</span>{s}
 </div>
                  ))}
 </div>
 </div>
 </div>
            {/* Enlace a la web oficial */}
 <WebLink web={c.web} color={col}/>
 </article>
        )
      })}
      {list.length === 0 && <EmptyState/>}
 </div>
  )
}

function TabDiputaciones({ query, bloque, data }: { query: string, bloque: SignoBloque | 'Todos', data: Diputacion[] }) {
  const q = query.trim().toLowerCase()
  const list = data.filter(d => bloque === 'Todos' || d.bloque === bloque)
                            .filter(d => !q || d.prov.toLowerCase().includes(q) || d.presidente.toLowerCase().includes(q) || d.partido.toLowerCase().includes(q) || d.ccaa.toLowerCase().includes(q))
                            .sort((a,b) => b.pob - a.pob)
  return (
 <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
 <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
 <thead>
 <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
              {[
                { l:'Provincia', a:'left' },
                { l:'CCAA',      a:'left' },
                { l:'Presidente',a:'left' },
                { l:'Partido',   a:'left' },
                { l:'Bloque',    a:'left' },
                { l:'Régimen',   a:'left' },
                { l:'Población', a:'right' },
                { l:'Web',       a:'center' },
              ].map(h => (
 <th key={h.l} style={{ textAlign:h.a as 'left'|'right'|'center', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h.l}</th>
              ))}
 </tr>
 </thead>
 <tbody>
            {list.map((d, i) => {
              const col = COLOR[d.partido] || '#6e6e73'
              return (
 <tr key={`${d.prov}-${i}`} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
 <td style={{ padding:'9px 12px', fontWeight:600, color:'#1d1d1f' }}>{d.prov}</td>
 <td style={{ padding:'9px 12px', color:'#6e6e73', fontSize:11 }}>{d.ccaa}</td>
 <td style={{ padding:'9px 12px', fontWeight:600, color:'#1d1d1f' }}>{d.presidente}</td>
 <td style={{ padding:'9px 12px' }}>
 <span style={{
                      fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:4,
                      background:col, color:'#fff',
                    }}>{d.partido}</span>
 </td>
 <td style={{ padding:'9px 12px' }}>
 <span style={{
                      fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${BLOQUE_META[d.bloque].color}15`,
                      color:BLOQUE_META[d.bloque].color,
                      border:`1px solid ${BLOQUE_META[d.bloque].color}40`,
                    }}>{BLOQUE_META[d.bloque].label}</span>
 </td>
 <td style={{ padding:'9px 12px', fontSize:11, color: d.forall ? '#5B21B6' : '#6e6e73', fontWeight: d.forall ? 700 : 500 }}>
                    {d.forall ? 'FORAL' : 'Ordinaria'}
 </td>
 <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>
                    {d.pob.toLocaleString('es-ES')}<span style={{ fontSize:9, color:'#86868b', marginLeft:2 }}>k</span>
 </td>
 <td style={{ padding:'9px 12px', textAlign:'center' }}>
 <WebIcon web={d.web} color={col}/>
 </td>
 </tr>
              )
            })}
            {list.length === 0 && (
 <tr><td colSpan={8} style={{ padding:30, textAlign:'center', color:'#6e6e73', fontSize:13 }}>Sin coincidencias.</td></tr>
            )}
 </tbody>
 </table>
 </div>
 </div>
  )
}

function TabCapitales({ query, bloque, data }: { query: string, bloque: SignoBloque | 'Todos', data: Capital[] }) {
  const q = query.trim().toLowerCase()
  const list = data.filter(c => bloque === 'Todos' || c.bloque === bloque)
                         .filter(c => !q || c.ciudad.toLowerCase().includes(q) || c.alcalde.toLowerCase().includes(q) || c.partido.toLowerCase().includes(q) || c.prov.toLowerCase().includes(q))
                         .sort((a,b) => b.pob - a.pob)
  return (
 <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
 <div style={{ overflowX:'auto' }}>
 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
 <thead>
 <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
              {[
                { l:'Ciudad',    a:'left' },
                { l:'Provincia', a:'left' },
                { l:'Alcalde/sa',a:'left' },
                { l:'Partido',   a:'left' },
                { l:'Bloque',    a:'left' },
                { l:'Desde',     a:'right' },
                { l:'Población', a:'right' },
                { l:'Web',       a:'center' },
              ].map(h => (
 <th key={h.l} style={{ textAlign:h.a as 'left'|'right'|'center', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h.l}</th>
              ))}
 </tr>
 </thead>
 <tbody>
            {list.map((c, i) => {
              const col = COLOR[c.partido] || '#6e6e73'
              return (
 <tr key={c.id} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
 <td style={{ padding:'9px 12px' }}>
 <div style={{ display:'flex', alignItems:'center', gap:8 }}>
 <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1d1d1f', minWidth:24 }}>{i+1}</span>
 <span style={{ width:3, height:18, background:col, borderRadius:1 }}/>
 <span style={{ fontWeight:600, color:'#1d1d1f' }}>{c.ciudad}</span>
 </div>
 </td>
 <td style={{ padding:'9px 12px', color:'#6e6e73', fontSize:11 }}>{c.prov}</td>
 <td style={{ padding:'9px 12px', fontWeight:600, color:'#1d1d1f' }}>{c.alcalde}</td>
 <td style={{ padding:'9px 12px' }}>
 <span style={{
                      fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:4,
                      background:col, color:'#fff',
                    }}>{c.partido}</span>
 </td>
 <td style={{ padding:'9px 12px' }}>
 <span style={{
                      fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${BLOQUE_META[c.bloque].color}15`,
                      color:BLOQUE_META[c.bloque].color,
                      border:`1px solid ${BLOQUE_META[c.bloque].color}40`,
                    }}>{BLOQUE_META[c.bloque].label}</span>
 </td>
 <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', color:'#3a3a3d' }}>{c.desde}</td>
 <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>
                    {c.pob.toLocaleString('es-ES')}<span style={{ fontSize:9, color:'#86868b', marginLeft:2 }}>k</span>
 </td>
 <td style={{ padding:'9px 12px', textAlign:'center' }}>
 <WebIcon web={c.web} color={col}/>
 </td>
 </tr>
              )
            })}
            {list.length === 0 && (
 <tr><td colSpan={8} style={{ padding:30, textAlign:'center', color:'#6e6e73', fontSize:13 }}>Sin coincidencias.</td></tr>
            )}
 </tbody>
 </table>
 </div>
 </div>
  )
}

function TabInsulares({ query, bloque, data }: { query: string, bloque: SignoBloque | 'Todos', data: Insular[] }) {
  const q = query.trim().toLowerCase()
  const list = data.filter(i => bloque === 'Todos' || i.bloque === bloque)
                         .filter(i => !q || i.nombre.toLowerCase().includes(q) || i.presidente.toLowerCase().includes(q) || i.partido.toLowerCase().includes(q))
  const canarias = list.filter(i => i.archipielago === 'Canarias')
  const baleares = list.filter(i => i.archipielago === 'Baleares')

  return (
 <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {canarias.length > 0 && (
 <div>
 <h3 style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em', margin:'0 0 8px', color:'#1d1d1f' }}>
            Cabildos canarios <span style={{ color:'#6e6e73', fontWeight:500, fontSize:11 }}>· {canarias.length} cabildos · 2.2M habitantes</span>
 </h3>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:10 }}>
            {canarias.map(i => <InsularCard key={i.id} ins={i}/>)}
 </div>
 </div>
      )}
      {baleares.length > 0 && (
 <div>
 <h3 style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em', margin:'0 0 8px', color:'#1d1d1f' }}>
            Consells insulars baleàrics <span style={{ color:'#6e6e73', fontWeight:500, fontSize:11 }}>· {baleares.length} consells · 1.2M habitantes</span>
 </h3>
 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:10 }}>
            {baleares.map(i => <InsularCard key={i.id} ins={i}/>)}
 </div>
 </div>
      )}
      {list.length === 0 && <EmptyState/>}
 </div>
  )
}

function InsularCard({ ins }: { ins: Insular }) {
  const col = COLOR[ins.partido] || '#6e6e73'
  return (
 <article style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
      boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
      borderLeft:`3px solid ${col}`,
      display:'flex', flexDirection:'column',
    }}>
 <div style={{
        display:'grid', gridTemplateColumns:'auto 1fr auto', gap:11, alignItems:'center',
        padding:'12px 14px',
      }}>
 <div style={{
          width:42, height:42, borderRadius:'50%', background:col, color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--font-display)', fontWeight:800, fontSize:11, flexShrink:0,
        }}>{ins.partido}</div>
 <div style={{ minWidth:0 }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, letterSpacing:'-0.012em', color:'#1d1d1f', lineHeight:1.2 }}>{ins.nombre}</div>
 <div style={{ fontSize:11, color:'#3a3a3d', fontWeight:600 }}>{ins.presidente}</div>
 </div>
 <div style={{ textAlign:'right', flexShrink:0 }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#1d1d1f', letterSpacing:'-0.014em', lineHeight:1 }}>
            {ins.pob.toLocaleString('es-ES')}<span style={{ fontSize:9, color:'#86868b', marginLeft:1, fontWeight:600 }}>k hab.</span>
 </div>
 <div style={{ fontSize:9, fontWeight:700, color:BLOQUE_META[ins.bloque].color, letterSpacing:'0.06em', marginTop:2 }}>{BLOQUE_META[ins.bloque].label}</div>
 </div>
 </div>
 <WebLink web={ins.web} color={col} compact/>
 </article>
  )
}

function EmptyState() {
  return (
 <div style={{ padding:30, textAlign:'center', color:'#6e6e73', fontSize:13, background:'#fff', borderRadius:14, border:'1px solid #ECECEF' }}>
      Sin coincidencias.
 </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value }: { label:string, value:string }) {
  return (
 <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.018em' }}>{value}</div>
 <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.7, marginTop:4, color:'#fff' }}>{label}</div>
 </div>
  )
}

function Mini({ label, value, color }: { label:string, value:string, color:string }) {
  return (
 <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8, padding:'7px 6px', textAlign:'center' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color, lineHeight:1, letterSpacing:'-0.012em' }}>{value}</div>
 <div style={{ fontSize:8.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.04em', textTransform:'uppercase', marginTop:3 }}>{label}</div>
 </div>
  )
}

// Enlace inferior a la web oficial (banda completa)
function WebLink({ web, color, compact = false }: { web: string, color: string, compact?: boolean }) {
  if (!web) return null
  const dominio = web.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return (
 <a href={web} target="_blank" rel="noopener noreferrer" style={{
      display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
      padding: compact ? '8px 14px' : '10px 16px',
      borderTop:'1px solid #ECECEF',
      background:'#FAFAFB', textDecoration:'none',
      fontSize: compact ? 10.5 : 11, color:'#1d1d1f', fontWeight:600, fontFamily:'inherit',
      transition:'background 160ms',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${color}10` }}
    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#FAFAFB' }}>
 <span style={{ display:'inline-flex', alignItems:'center', gap:6, minWidth:0 }}>
 <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink:0 }}>
 <circle cx="5.5" cy="5.5" r="4.5" stroke={color} strokeWidth="1.2"/>
 <path d="M1 5.5h9M5.5 1c1.5 1.5 1.5 7.5 0 9M5.5 1c-1.5 1.5-1.5 7.5 0 9" stroke={color} strokeWidth="1" fill="none"/>
 </svg>
 <span style={{ color, fontFamily:'var(--font-display)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{dominio}</span>
 </span>
 <span style={{ color, display:'inline-flex', alignItems:'center', gap:3 }}>
        Visitar
 <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
 <path d="M2 2h6v6M2 8L8 2" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
 </span>
 </a>
  )
}

// Icono pequeño para tablas (un solo botón redondo con flecha de salida)
function WebIcon({ web, color }: { web: string, color: string }) {
  if (!web) return <span style={{ color:'#c5c5cb', fontSize:11 }}>—</span>
  return (
 <a href={web} target="_blank" rel="noopener noreferrer" title={web.replace(/^https?:\/\//, '').replace(/\/$/, '')} style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:24, height:24, borderRadius:6,
      background:`${color}12`, border:`1px solid ${color}40`,
      color, textDecoration:'none', transition:'all 160ms',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = color; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${color}12`; (e.currentTarget as HTMLAnchorElement).style.color = color }}>
 <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
 <path d="M3 3h5v5M3 8L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
 </a>
  )
}
