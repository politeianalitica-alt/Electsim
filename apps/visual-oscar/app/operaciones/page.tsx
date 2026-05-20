'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ─────────────────────────────────────────────────────────────────────────
// Datos demo
// ─────────────────────────────────────────────────────────────────────────
const MARKETS = [
  { label:'IBEX 35',     value:'11.040', delta:-1.8, dir:'down', spark:[10980,11020,11050,11080,11100,11080,11050,11020,11000,11020,11040] },
  { label:'Prima riesgo',value:'112 pb', delta:+8,   dir:'up',   spark:[ 96, 98, 99,100,102,104,105,107,109,111,112] },
  { label:'Euríbor 12m', value:'2,84%',  delta:-0.06,dir:'down', spark:[2.92,2.91,2.90,2.89,2.88,2.87,2.86,2.85,2.85,2.84,2.84] },
  { label:'Brent',       value:'$84,2',  delta:-1.1, dir:'down', spark:[ 86, 86, 86, 85, 85, 85, 85, 85, 85, 84, 84] },
]

const FEED = [
  { t:'18:42', tag:'CRÍTICA',  c:'#7F1D1D', txt:'Tesoro convoca reunión extraordinaria por prima de riesgo' },
  { t:'17:15', tag:'CRÍTICA',  c:'#7F1D1D', txt:'Junts retira apoyo a la legislatura — comunicado oficial' },
  { t:'17:35', tag:'MERCADOS', c:'#DC2626', txt:'IBEX 35 cierra −1,8% en 11.040 — bancos lideran caídas' },
  { t:'16:30', tag:'CONGRESO', c:'#5B21B6', txt:'Decreto-ley 4/2026 a votación mañana 11:00h · margen ±2 escaños' },
  { t:'14:00', tag:'ENCUESTAS',c:'#0E7490', txt:'Sigma Dos: PP 33,2% (+0,4) · PSOE 26,1% (-0,3)' },
  { t:'13:20', tag:'EXTERIOR', c:'#F97316', txt:'EE.UU. anuncia aranceles 12% al aceite de oliva y vino' },
  { t:'12:30', tag:'MEDIOS',   c:'#EAB308', txt:'#MociónCensura · top trending nacional · 56k tweets/4h' },
  { t:'11:00', tag:'MONCLOA',  c:'#1F4E8C', txt:'Portavoz descarta elecciones anticipadas' },
  { t:'09:30', tag:'BCE',      c:'#0F766E', txt:'Actas abril publicadas · tono moderadamente hawkish' },
  { t:'08:15', tag:'INE',      c:'#059669', txt:'IPC abril 2026 · general 2,9% (+0,1 pp)' },
]

const SERVICES = [
  { name:'API electoral',    status:'ok',    latency: 38 },
  { name:'Ingesta encuestas',status:'ok',    latency: 92 },
  { name:'Politeia IA',      status:'ok',    latency:144 },
  { name:'Monitor RRSS',     status:'warn',  latency:312 },
  { name:'Datos macro (BdE)',status:'ok',    latency: 76 },
  { name:'Scraper BOE',      status:'ok',    latency:118 },
]

const PROXIMA_VOTACION = {
  ley:'Convalidación decreto-ley 4/2026',
  fecha: new Date(Date.now() + 1000*60*60*15 + 1000*60*30), // ~15h30 desde ahora
  prediccion:'Margen ±2 escaños',
  riesgo: 'ALTO',
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
function Sparkline({ data, color, width=92, height=24 }: { data: number[], color: string, width?: number, height?: number }) {
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1
  const pts = data.map((v, i) => `${(i/(data.length-1))*width},${height - ((v-min)/rng)*height}`).join(' ')
  return (
 <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display:'block' }}>
 <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
  )
}

function useNow() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function useCountdown(target: Date) {
  const [diff, setDiff] = useState<number>(0)
  useEffect(() => {
    setDiff(target.getTime() - Date.now())
    const id = setInterval(() => setDiff(target.getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])
  const total = Math.max(0, diff)
  const h = Math.floor(total/3600000)
  const m = Math.floor((total%3600000)/60000)
  const s = Math.floor((total%60000)/1000)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────
export default function OperacionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const now = useNow()
  const countdown = useCountdown(PROXIMA_VOTACION.fecha)
  const fmtTime = now ? now.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '--:--:--'
  const fmtDate = now ? now.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : ''

  return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-body)', color:'#1d1d1f' }}>
 <AppHeader/>

 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── COMMAND BAR (reloj + estado) ───── */}
 <section style={{
          background:'#fff', border:'1px solid #ECECEF',
          borderRadius:18, padding:'20px 28px', marginBottom:18,
          boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:32, alignItems:'center',
        }}>
 <div>
 <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.16em', color:'#16A34A', margin:'0 0 4px', display:'inline-flex', alignItems:'center', gap:8 }}>
 <span style={{ width:7, height:7, borderRadius:'50%', background:'#16A34A', boxShadow:'0 0 8px rgba(22,163,74,0.6)', animation:'opPulse 1.6s ease-in-out infinite' }}/>
              SISTEMA OPERATIVO · MONITORIZACIÓN ACTIVA
 </p>
 <h1 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, letterSpacing:'-0.018em', margin:0, color:'#1d1d1f' }}>
              Centro de Operaciones
 </h1>
 <p style={{ fontSize:12, color:'#6e6e73', margin:'3px 0 0', textTransform:'capitalize' }}>{fmtDate}</p>
 </div>
 <Stat label="Hora · Madrid" value={fmtTime} mono accent="#1d1d1f"/>
 <Stat label="Alertas críticas" value="2" accent="#7F1D1D" pulse/>
 <Stat label="Próxima votación" value={countdown} mono accent="#5B21B6"/>
 </section>

        {/* ───── KPIS MERCADOS ───── */}
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
          {MARKETS.map(m => {
            const isUp = m.dir === 'up'
            return (
 <div key={m.label} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'14px 16px',
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                display:'grid', gridTemplateColumns:'1fr auto', gap:14, alignItems:'center',
              }}>
 <div>
 <div style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600, letterSpacing:'0.04em', textTransform:'uppercase' }}>{m.label}</div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, letterSpacing:'-0.018em', color:'#1d1d1f', lineHeight:1.1 }}>{m.value}</div>
 <div style={{ fontSize:11, color: isUp ? '#DC2626' : '#16A34A', marginTop:1, fontWeight:600 }}>
                    {isUp ? '▲' : '▼'} {Math.abs(m.delta)}{typeof m.delta === 'number' && Number.isInteger(m.delta) ? ' pb' : ''}
 </div>
 </div>
 <Sparkline data={m.spark} color={isUp ? '#DC2626' : '#16A34A'}/>
 </div>
            )
          })}
 </div>

        {/* ───── GRID PRINCIPAL ───── */}
 <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:14, marginBottom:14 }}>

          {/* Feed eventos en vivo */}
 <Card title="Feed de eventos · en vivo" extra={<LiveDot/>}>
 <div style={{ display:'flex', flexDirection:'column', gap:1, maxHeight:380, overflowY:'auto' }}>
              {FEED.map((e,i) => (
 <div key={i} style={{
                  display:'grid', gridTemplateColumns:'48px 92px 1fr', gap:10, alignItems:'center',
                  padding:'9px 4px', borderBottom:i<FEED.length-1 ? '1px solid #ECECEF' : 'none',
                }}>
 <span style={{ fontFamily:'ui-monospace,monospace', fontSize:11, color:'#6e6e73', fontWeight:600 }}>{e.t}</span>
 <span style={{
                    fontSize:9.5, fontWeight:800, letterSpacing:'0.08em',
                    padding:'2px 7px', borderRadius:999, background:`${e.c}15`, color:e.c,
                    border:`1px solid ${e.c}40`, textAlign:'center', whiteSpace:'nowrap',
                  }}>{e.tag}</span>
 <span style={{ fontSize:12, color:'#1d1d1f', lineHeight:1.4 }}>{e.txt}</span>
 </div>
              ))}
 </div>
 </Card>

          {/* Próxima votación */}
 <Card title="Próxima votación · Congreso" extra={<Pill text="ALTO" color="#DC2626"/>}>
 <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
 <div>
 <div style={{ fontSize:11, color:'#6e6e73', letterSpacing:'0.04em', textTransform:'uppercase', fontWeight:600, marginBottom:4 }}>Ley</div>
 <div style={{ fontSize:14, fontWeight:600, color:'#1d1d1f', lineHeight:1.35 }}>{PROXIMA_VOTACION.ley}</div>
 </div>
 <div style={{
                background:'linear-gradient(135deg,#5B21B6 0%,#2E1065 100%)', borderRadius:12, padding:'18px 16px', textAlign:'center', color:'#fff',
              }}>
 <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, marginBottom:4 }}>FALTAN</div>
 <div style={{ fontFamily:'ui-monospace,monospace', fontSize:32, fontWeight:700, letterSpacing:'0.02em', color:'#fff' }}>{countdown}</div>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
 <Box label="Predicción" value={PROXIMA_VOTACION.prediccion}/>
 <Box label="Riesgo" value={PROXIMA_VOTACION.riesgo} valueColor="#DC2626"/>
 </div>
 <Link href="/congreso" style={{ fontSize:11.5, color:'#5B21B6', textDecoration:'none', fontWeight:600, textAlign:'right' }}>Abrir simulador →</Link>
 </div>
 </Card>

          {/* Estado servicios */}
 <Card title="Estado de servicios" extra={<span style={{ fontSize:10.5, color:'#16A34A', fontWeight:600 }}>{SERVICES.filter(s=>s.status==='ok').length}/{SERVICES.length} OK</span>}>
 <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {SERVICES.map(s => {
                const c = s.status === 'ok' ? '#16A34A' : s.status === 'warn' ? '#EAB308' : '#DC2626'
                return (
 <div key={s.name} style={{ display:'grid', gridTemplateColumns:'12px 1fr auto', gap:10, alignItems:'center' }}>
 <span style={{ width:8, height:8, borderRadius:'50%', background:c, boxShadow:`0 0 6px ${c}66` }}/>
 <span style={{ fontSize:12, color:'#1d1d1f' }}>{s.name}</span>
 <span style={{ fontFamily:'ui-monospace,monospace', fontSize:11, color:'#6e6e73', fontWeight:600 }}>{s.latency} ms</span>
 </div>
                )
              })}
 </div>
 </Card>
 </div>

        {/* ───── ATAJOS ───── */}
 <Card title="Atajos rápidos">
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { label:'Ver alertas',         to:'/alertas',     hint:'2 críticas activas',   c:'#7F1D1D' },
              { label:'Mapa Provincial',     to:'/mapa',        hint:'52 circunscripciones', c:'#1F4E8C' },
              { label:'Simulador votación',  to:'/congreso',    hint:'Ley 4/2026 mañana',    c:'#5B21B6' },
              { label:'Agente IA',           to:'/agente-ia',   hint:'Pregunta sobre los datos', c:'#0F766E' },
            ].map(a => (
 <Link key={a.to} href={a.to} style={{
                display:'block', textDecoration:'none', color:'inherit',
                background:`linear-gradient(135deg,${a.c} 0%,${a.c}aa 100%)`,
                borderRadius:12, padding:'16px 18px',
                transition:'transform 160ms',
              }}>
 <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:3 }}>{a.label} →</div>
 <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)' }}>{a.hint}</div>
 </Link>
            ))}
 </div>
 </Card>

 <style>{`
          @keyframes opPulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
 `}</style>
 </main>

 <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Sala de Control · Centro de Operaciones · Politeia Analítica · {new Date().getFullYear()}
 </footer>
 </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────────
function Stat({ label, value, mono, accent='#1d1d1f', pulse }: { label:string, value:string, mono?:boolean, accent?:string, pulse?:boolean }) {
  return (
 <div style={{ textAlign:'right', borderLeft:'1px solid #ECECEF', paddingLeft:24 }}>
 <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#6e6e73' }}>{label}</div>
 <div style={{
        fontFamily: mono ? 'ui-monospace,monospace' : 'var(--font-display)',
        fontSize: mono ? 22 : 26, fontWeight:700, letterSpacing: mono ? '0.02em' : '-0.018em',
        color: accent, lineHeight:1.1, marginTop:3,
        animation: pulse ? 'opPulse 1.4s ease-in-out infinite' : undefined,
      }}>{value}</div>
 </div>
  )
}

function Card({ title, extra, children }: { title:string, extra?:React.ReactNode, children:React.ReactNode }) {
  return (
 <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'16px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
 <h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>{title}</h2>
        {extra}
 </div>
      {children}
 </section>
  )
}

function LiveDot() {
  return (
 <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:10.5, color:'#16A34A', fontWeight:600 }}>
 <span style={{ width:6, height:6, borderRadius:'50%', background:'#16A34A', boxShadow:'0 0 6px rgba(22,163,74,0.6)', animation:'opPulse 1.4s ease-in-out infinite' }}/>
      LIVE
 </span>
  )
}

function Pill({ text, color }: { text:string, color:string }) {
  return (
 <span style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.1em', padding:'2px 8px', borderRadius:999, background:`${color}15`, color, border:`1px solid ${color}40` }}>{text}</span>
  )
}

function Box({ label, value, valueColor='#1d1d1f' }: { label:string, value:string, valueColor?:string }) {
  return (
 <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'10px 12px' }}>
 <div style={{ fontSize:9.5, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:700 }}>{label}</div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:valueColor, marginTop:2 }}>{value}</div>
 </div>
  )
}
