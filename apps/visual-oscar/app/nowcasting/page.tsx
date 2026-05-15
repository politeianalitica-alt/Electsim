'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { useRouter } from 'next/navigation'
import { clearTokens, isAuthenticated } from '@/lib/auth'
import HemicycleAdvanced, { HParty } from '@/components/HemicycleAdvanced'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'

type Party = {
  siglas: string; nombre: string; pct: number;
  ci_inf: number; ci_sup: number;
  seats: number; seats_low: number; seats_high: number;
  color: string; bloque: 'derecha' | 'izquierda' | 'otros';
  delta: number; n_enc: number;
}
type Transfer = { partido: string; delta: number; fuente: string; dir: 'up' | 'down'; color: string }

// Datos iniciales · sustituidos por la respuesta de /api/analytics/nowcast
// INITIAL_PARTIES sincronizadas con el sistema D'Hondt provincial calibrado
// (lib/sources/dhondt-provincial.ts) · estos valores se usan como
// initialData hasta que llega el primer fetch de /api/analytics/nowcast.
const INITIAL_PARTIES: Party[] = [
  { siglas:'PP',       nombre:'Partido Popular',            pct:32.47, ci_inf:30.5, ci_sup:34.4, seats:136, seats_low:130, seats_high:142, color:'#009FDB', bloque:'derecha',   delta:-0.6, n_enc:12 },
  { siglas:'PSOE',     nombre:'PSOE',                       pct:26.90, ci_inf:25.1, ci_sup:28.7, seats:101, seats_low: 95, seats_high:107, color:'#E30613', bloque:'izquierda', delta:-4.8, n_enc:12 },
  { siglas:'VOX',      nombre:'VOX',                        pct:12.79, ci_inf:11.4, ci_sup:14.2, seats: 46, seats_low: 41, seats_high: 51, color:'#63BE21', bloque:'derecha',   delta:+0.4, n_enc:12 },
  { siglas:'Sumar',    nombre:'Sumar',                      pct:10.03, ci_inf: 8.7, ci_sup:11.4, seats: 28, seats_low: 23, seats_high: 33, color:'#E4007C', bloque:'izquierda', delta:-2.3, n_enc:12 },
  { siglas:'Junts',    nombre:'Junts per Catalunya',        pct: 2.65, ci_inf: 2.1, ci_sup: 3.2, seats: 11, seats_low:  9, seats_high: 13, color:'#00AEEF', bloque:'otros',     delta:+1.0, n_enc: 8 },
  { siglas:'ERC',      nombre:'Esquerra Republicana',       pct: 3.05, ci_inf: 2.4, ci_sup: 3.7, seats: 10, seats_low:  8, seats_high: 12, color:'#F4B20A', bloque:'izquierda', delta:+1.1, n_enc: 8 },
  { siglas:'EH Bildu', nombre:'EH Bildu',                   pct: 1.99, ci_inf: 1.5, ci_sup: 2.5, seats:  8, seats_low:  6, seats_high: 10, color:'#A9C55A', bloque:'izquierda', delta:+0.6, n_enc: 6 },
  { siglas:'PNV',      nombre:'Partido Nacionalista Vasco', pct: 1.77, ci_inf: 1.4, ci_sup: 2.2, seats:  6, seats_low:  5, seats_high:  7, color:'#007A3D', bloque:'otros',     delta:+0.6, n_enc: 6 },
  { siglas:'CC',       nombre:'Coalición Canaria',          pct: 1.07, ci_inf: 0.8, ci_sup: 1.4, seats:  3, seats_low:  2, seats_high:  4, color:'#FFC107', bloque:'derecha',   delta:+0.8, n_enc: 5 },
  { siglas:'BNG',      nombre:'Bloque Nacionalista Galego', pct: 0.81, ci_inf: 0.6, ci_sup: 1.0, seats:  1, seats_low:  1, seats_high:  2, color:'#73C6EE', bloque:'izquierda', delta:+0.2, n_enc: 4 },
]

const INITIAL_TRANSFERS: Transfer[] = [
  { partido:'PP',    delta:+4, fuente:'PSOE (+2) · Sumar (+2)',  dir:'up',   color:'#009FDB' },
  { partido:'PSOE',  delta:-6, fuente:'PP (-2) · VOX (-1) · Sumar (-3)', dir:'down', color:'#E30613' },
  { partido:'VOX',   delta:+2, fuente:'PSOE (+2)',               dir:'up',   color:'#63BE21' },
  { partido:'Sumar', delta:-1, fuente:'PP (-1)',                 dir:'down', color:'#E4007C' },
]

const NAV=[
  {label:'Resumen',href:'/dashboard'},{label:'Mapa',href:'/mapa'},
  {label:'Nowcasting',href:'/nowcasting'},{label:'Escenarios',href:'/escenarios'},
  {label:'Coaliciones',href:'/coaliciones'},{label:'Riesgo',href:'/riesgo'},
  {label:'Macro',href:'/macro'},{label:'Prensa',href:'/prensa'},
  {label:'Congreso',href:'/congreso'},{label:'Briefing',href:'/briefing'},
  {label:'Microdatos',href:'/microdatos'},{label:'Índices',href:'/indices'},
  {label:'Agentes',href:'/agentes'},{label:'Geopolítica',href:'/geopolitica'},
]

function CIChart({parties}:{parties:Party[]}){
  const W=820,rowH=34,padL=88,padR=160,maxPct=38
  const barW=W-padL-padR
  const H=rowH*parties.length+8
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
      {parties.map((p,i)=>{
        const y=i*rowH+rowH/2
        const bx=padL+(p.pct/maxPct)*barW
        const ci0=padL+(p.ci_inf/maxPct)*barW
        const ci1=padL+(p.ci_sup/maxPct)*barW
        return(
          <g key={p.siglas}>
            <text x={padL-8} y={y+4} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--ink-2)">{p.siglas}</text>
            <rect x={padL} y={y-8} width={(p.pct/maxPct)*barW} height={16} rx="4" fill={p.color} opacity="0.85"/>
            <line x1={ci0} y1={y-10} x2={ci0} y2={y+10} stroke={p.color} strokeWidth="1.5" opacity="0.5"/>
            <line x1={ci1} y1={y-10} x2={ci1} y2={y+10} stroke={p.color} strokeWidth="1.5" opacity="0.5"/>
            <line x1={ci0} y1={y} x2={ci1} y2={y} stroke={p.color} strokeWidth="1" opacity="0.4" strokeDasharray="2 2"/>
            <text x={bx+6} y={y+4} fontSize="12" fontWeight="700" fill={p.color}>{p.pct}%</text>
            <text x={W-padR+8} y={y+4} fontSize="11" fill="var(--ink-4)">[{p.ci_inf}–{p.ci_sup}]</text>
            <text x={W-8} y={y+4} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--ink-2)">{p.seats}e</text>
          </g>
        )
      })}
    </svg>
  )
}

function SeatsChart({parties}:{parties:Party[]}){
  const main=parties.filter(p=>p.seats>0&&p.siglas!=='Otros')
  const W=820,rowH=38,padL=72,padR=80,maxSeats=160
  const barW=W-padL-padR,H=rowH*main.length+24
  const majX=padL+(176/maxSeats)*barW
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
      <line x1={majX} y1={0} x2={majX} y2={H-10} stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="4 3"/>
      <text x={majX} y={H-2} textAnchor="middle" fontSize="10" fill="var(--ink-4)">Mayoría</text>
      {main.map((p,i)=>{
        const y=i*rowH+rowH/2
        const rangW=(p.seats_high/maxSeats)*barW
        const cenW=(p.seats/maxSeats)*barW
        return(
          <g key={p.siglas}>
            <text x={padL-8} y={y+4} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--ink-2)">{p.siglas}</text>
            <rect x={padL+(p.seats_low/maxSeats)*barW} y={y-9} width={((p.seats_high-p.seats_low)/maxSeats)*barW} height={18} rx="4" fill={p.color} opacity="0.18"/>
            <rect x={padL} y={y-7} width={cenW} height={14} rx="3" fill={p.color} opacity="0.85"/>
            <text x={padL+cenW+5} y={y+4} fontSize="12" fontWeight="700" fill={p.color}>{p.seats}</text>
            <text x={W-padR+4} y={y+4} fontSize="10.5" fill="var(--ink-4)">{p.seats_low}–{p.seats_high}</text>
          </g>
        )
      })}
    </svg>
  )
}

type NowcastResponse = {
  parties: Party[];
  transfers?: Transfer[];
  n_polls?: number;
  pedersen?: number;
  last_update?: string;
}

export default function NowcastingPage(){
  const router=useRouter()
  const currentPath='/nowcasting'
  useEffect(()=>{if(!isAuthenticated())router.push('/login')},[router])
  function logout(){clearTokens();router.push('/login')}

  // Fetch en vivo del nowcasting · auto-refresh 30s
  const { data, source, updatedAt, refresh } = useApi<NowcastResponse>(
    '/api/analytics/nowcast',
    { initialData: { parties: INITIAL_PARTIES, transfers: INITIAL_TRANSFERS }, refreshInterval: 30_000 },
  )
  const PARTIES: Party[] = data?.parties && data.parties.length > 0 ? data.parties : INITIAL_PARTIES
  const TRANSFERS: Transfer[] = data?.transfers && data.transfers.length > 0 ? data.transfers : INITIAL_TRANSFERS
  const N_POLLS = data?.n_polls ?? 12

  const der=PARTIES.filter(p=>p.bloque==='derecha').reduce((s,p)=>s+p.seats,0)
  const izq=PARTIES.filter(p=>p.bloque==='izquierda').reduce((s,p)=>s+p.seats,0)
  const hemParties: HParty[] = PARTIES.filter(p=>p.seats>0).map(p=>({
    id: p.siglas.toLowerCase().replace(/\s/g,'').replace('eh','').replace('bildu','bildu'),
    name: p.siglas,
    color: p.color,
    seats: p.seats,
  }))
  // Mapear ids al sistema unificado del hemiciclo
  const idMap: Record<string,string> = {pp:'pp',psoe:'psoe',vox:'vox',sumar:'sumar',erc:'erc',junts:'junts',pnv:'pnv',bildu:'bildu',cc:'cc',bng:'bng',otros:'otros'}
  const hemPartiesNorm: HParty[] = PARTIES.filter(p=>p.seats>0).map(p=>{
    const key = p.siglas.toLowerCase().replace(/\s/g,'').replace('ehbildu','bildu')
    return { id: idMap[key] || 'otros', name: p.siglas, color: p.color, seats: p.seats }
  })

  return(
    <div style={{background:'var(--bg)',minHeight:'100vh',fontFamily:'var(--font-body)'}}>
      <AppHeader/>

      <main style={{maxWidth:1600,margin:'0 auto',padding:'0 28px 80px'}}>
        <section style={{background:'linear-gradient(135deg,#1e3a5f 0%,#0a1628 100%)',borderRadius:'0 0 24px 24px',padding:'36px 48px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22,color:'#fff'}}>
          <div>
            <p style={{fontSize:10.5,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',opacity:0.65,margin:'0 0 8px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <span>Nowcasting Electoral · Tiempo real</span>
              <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={30} onRefresh={refresh}/>
            </p>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:700,letterSpacing:'-0.024em',margin:'0 0 6px',lineHeight:1.1}}>{PARTIES[0]?.siglas || 'PP'} mantiene <em style={{fontWeight:300}}>ventaja sólida</em></h1>
            <p style={{fontSize:13,opacity:0.65,margin:0}}>Media de {N_POLLS} encuestas · 350 escaños · D'Hondt</p>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:64,fontWeight:700,letterSpacing:'-0.05em',lineHeight:1,color:'#60a5fa'}}>{(PARTIES[0]?.pct ?? 32.1).toFixed(1)}<span style={{fontSize:28}}>%</span></div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:4}}>{PARTIES[0]?.siglas || 'PP'} · IC 95%: [{PARTIES[0]?.ci_inf ?? 30.2} – {PARTIES[0]?.ci_sup ?? 34.0}]</div>
          </div>
        </section>

        {/* KPI cards top 6 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:20}}>
          {PARTIES.slice(0,6).map(p=>(
            <div key={p.siglas} style={{background:'#fff',borderRadius:16,padding:'14px 16px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderTop:`3px solid ${p.color}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:700,color:p.color}}>{p.siglas}</span>
                <span style={{fontSize:10.5,color:p.delta>0?'#16A34A':p.delta<0?'#DC2626':'var(--ink-4)',fontWeight:600}}>{p.delta>0?'+':''}{p.delta!==0?p.delta:'-'}</span>
              </div>
              <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:700,letterSpacing:'-0.025em',lineHeight:1}}>{p.pct}%</div>
              <div style={{fontSize:10.5,color:'var(--ink-4)',marginTop:3}}>[{p.ci_inf}–{p.ci_sup}]</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:p.color,marginTop:4}}>{p.seats}<span style={{fontSize:11,color:'var(--ink-4)',fontWeight:400}}> esc</span></div>
            </div>
          ))}
        </div>

        {/* CI chart + Bloques */}
        <div style={{display:'grid',gridTemplateColumns:'8fr 4fr',gap:18,marginBottom:20}}>
          <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Estimación de voto con IC 95%</h2>
              <span style={{fontSize:10.5,color:'var(--ink-3)',background:'var(--bg-soft)',borderRadius:999,padding:'3px 10px',border:'1px solid var(--hairline)'}}>{N_POLLS} encuestas</span>
            </div>
            <CIChart parties={PARTIES}/>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#fff',borderRadius:16,padding:'20px 22px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',flex:1}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 16px'}}>Bloques parlamentarios</h2>
              {[{label:'Derecha',seats:der,color:'#009FDB',parties:'PP · VOX · CC'},{label:'Izquierda',seats:izq,color:'#E30613',parties:'PSOE · Sumar · ERC · Bildu · BNG'}].map(b=>(
                <div key={b.label} style={{marginBottom:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
                    <span style={{fontSize:12,fontWeight:600,color:b.color}}>{b.label}</span>
                    <span style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:700,color:b.color,letterSpacing:'-0.02em'}}>{b.seats}<span style={{fontSize:12,color:'var(--ink-4)',fontWeight:400}}>/350</span></span>
                  </div>
                  <div style={{height:8,background:'var(--bg-soft)',borderRadius:999,overflow:'hidden',marginBottom:4}}>
                    <div style={{width:`${(b.seats/350)*100}%`,height:'100%',background:b.color,borderRadius:999}}/>
                  </div>
                  <div style={{fontSize:10.5,color:'var(--ink-4)'}}>{b.parties}</div>
                </div>
              ))}
              <div style={{padding:'10px 12px',background:'var(--bg-soft)',borderRadius:10,marginTop:8,textAlign:'center'}}>
                <div style={{fontSize:10.5,color:'var(--ink-4)',marginBottom:2}}>Mayoría absoluta</div>
                <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,letterSpacing:'-0.02em'}}>176 escaños</div>
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:16,padding:'20px 22px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 14px'}}>Transferencias de escaños</h2>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {TRANSFERS.map(t=>(
                  <div key={t.partido} style={{padding:'9px 12px',borderRadius:10,background:'var(--bg-soft)',borderLeft:`3px solid ${t.color}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                      <span style={{fontSize:12,fontWeight:700,color:t.color}}>{t.partido}</span>
                      <span style={{fontSize:13,fontWeight:700,color:t.dir==='up'?'#16A34A':'#DC2626'}}>{t.dir==='up'?'▲':'▼'} {Math.abs(t.delta)}</span>
                    </div>
                    <div style={{fontSize:10.5,color:'var(--ink-4)'}}>{t.fuente}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Seat projection + hemicicle */}
        <div style={{display:'grid',gridTemplateColumns:'7fr 5fr',gap:18,marginBottom:20}}>
          <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Proyección D'Hondt · 350 escaños</h2>
              <span style={{fontSize:10.5,color:'var(--ink-3)',background:'var(--bg-soft)',borderRadius:999,padding:'3px 10px',border:'1px solid var(--hairline)'}}>rango IC 95%</span>
            </div>
            <SeatsChart parties={PARTIES}/>
          </div>
          <div style={{background:'#fff',borderRadius:20,padding:'22px 26px',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',border:'1px solid #ECECEF'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8,gap:10,flexWrap:'wrap'}}>
              <div>
                <h2 style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Hemiciclo · estimación actual</h2>
                <p style={{margin:'3px 0 0',fontSize:11.5,color:'#6e6e73'}}>350 escaños · IC 95% sobre 12 encuestas · activa <strong style={{color:'#1d1d1f'}}>Calcular coalición</strong> para sumar bloques</p>
              </div>
              <span style={{fontSize:11,fontWeight:600,color:'#16A34A',background:'#f0fdf4',borderRadius:999,padding:'4px 10px',border:'1px solid #bbf7d0'}}>EN VIVO</span>
            </div>
            <HemicycleAdvanced parties={hemPartiesNorm}/>
          </div>
        </div>

        {/* Encuestas que alimentan la estimación */}
        <EncuestasPanel/>

        {/* Detail table */}
        <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 18px'}}>Tabla detallada</h2>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--hairline)'}}>
                {['Partido','Estimación','IC 95% Inf','IC 95% Sup','Escaños','Rango','Δ Semana','Encuestas'].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'0 8px 10px',fontWeight:600,color:'var(--ink-3)',fontSize:10.5,letterSpacing:'0.04em',textTransform:'uppercase'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PARTIES.map((p,i)=>(
                <tr key={p.siglas} style={{borderBottom:'1px solid var(--hairline)',background:i%2===0?'transparent':'#fafafa'}}>
                  <td style={{padding:'9px 8px',fontWeight:700,color:p.color}}>{p.siglas}</td>
                  <td style={{padding:'9px 8px',fontWeight:600}}>{p.pct}%</td>
                  <td style={{padding:'9px 8px',color:'var(--ink-3)'}}>{p.ci_inf}%</td>
                  <td style={{padding:'9px 8px',color:'var(--ink-3)'}}>{p.ci_sup}%</td>
                  <td style={{padding:'9px 8px',fontWeight:600,color:p.color}}>{p.seats}</td>
                  <td style={{padding:'9px 8px',color:'var(--ink-4)'}}>{p.seats_low}–{p.seats_high}</td>
                  <td style={{padding:'9px 8px',color:p.delta>0?'#16A34A':p.delta<0?'#DC2626':'var(--ink-4)',fontWeight:600}}>{p.delta>0?'+':''}{p.delta!==0?p.delta:'–'}</td>
                  <td style={{padding:'9px 8px',color:'var(--ink-4)'}}>{p.n_enc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <footer style={{borderTop:'1px solid var(--hairline)',padding:'20px 28px',textAlign:'center',color:'var(--ink-4)',fontSize:11.5}}>
        Estimación basada en encuestas reales · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─── Panel de encuestas que alimentan la estimación ──────────────────────
interface EncuestaApi {
  id: string
  casa: string
  cliente: string
  fecha: string
  fecha_publicacion: string
  muestra: number
  metodo: string
  ambito: string
  partidos: Record<string, number>
  peso: number
  peso_breakdown: { calidad: number; recencia: number; muestra_factor: number }
  source: 'curado' | 'electocracia'
}
interface ReferenciaApi {
  id: string
  casa: string
  cliente?: string
  fecha?: string
  fecha_publicacion: string
  tipo: string
  ambito?: string
  link: string
  title: string
}
interface EncuestasResp {
  encuestas: EncuestaApi[]
  referencias_sin_cifras: ReferenciaApi[]
  meta: { n_curadas: number; n_referencias: number; ambito: string; fuente_principal: string; ponderacion: string }
}
function EncuestasPanel() {
  const [data, setData] = useState<EncuestasResp | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/electoral/encuestas?ambito=general&limit=30')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ background:'#fff', borderRadius:16, padding:'22px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', marginBottom:16, fontSize:12, color:'#86868b' }}>
        Cargando catálogo de encuestas…
      </div>
    )
  }
  if (!data) return null

  const partyOrder = ['PP', 'PSOE', 'VOX', 'SUMAR', 'ERC', 'JUNTS', 'PNV', 'BILDU', 'CC', 'BNG', 'OTROS']
  const partyColors: Record<string, string> = {
    PP:'#1F4E8C', PSOE:'#E1322D', VOX:'#5BA02E', SUMAR:'#D43F8D',
    ERC:'#E8A030', JUNTS:'#1FA89B', PNV:'#7DB94B', BILDU:'#3F7A3A',
    CC:'#F2C43A', BNG:'#5BB3D9', OTROS:'#9E9E9E',
  }

  const maxPeso = Math.max(...data.encuestas.map(e => e.peso))

  return (
    <div style={{ background:'#fff', borderRadius:16, padding:'22px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', marginBottom:16 }}>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, letterSpacing:'-0.015em', margin:0 }}>
            Encuestas que alimentan la estimación
          </h2>
          <p style={{ fontSize:11.5, color:'#6e6e73', margin:'3px 0 0' }}>
            {data.meta.n_curadas} sondeos con cifras · {data.meta.n_referencias} referencias adicionales en electocracia.com · ponderación: {data.meta.ponderacion}
          </p>
        </div>
        <a href="https://electocracia.com" target="_blank" rel="noreferrer" style={{
          fontSize:11, fontWeight:600, color:'#1F4E8C', textDecoration:'none',
          padding:'4px 10px', borderRadius:999, border:'1px solid #D8E5F4', background:'#F5F8FC',
        }}>Fuente · electocracia.com ↗</a>
      </header>

      <div style={{ overflowX:'auto', maxHeight: 480, overflowY:'auto', border:'1px solid #ECECEF', borderRadius:10 }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
          <thead style={{ position:'sticky', top:0, background:'#FAFAFA', zIndex:1 }}>
            <tr style={{ borderBottom:'1px solid #ECECEF' }}>
              <th style={{ padding:'8px 10px', textAlign:'left', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>Casa · cliente</th>
              <th style={{ padding:'8px 10px', textAlign:'left', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>Fecha</th>
              <th style={{ padding:'8px 10px', textAlign:'right', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>Muestra</th>
              {partyOrder.slice(0, 6).map(p => (
                <th key={p} style={{ padding:'8px 6px', textAlign:'right', fontSize:9.5, fontWeight:800, color: partyColors[p], letterSpacing:'0.04em' }}>{p}</th>
              ))}
              <th style={{ padding:'8px 10px', textAlign:'right', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>Peso</th>
            </tr>
          </thead>
          <tbody>
            {data.encuestas.map(e => (
              <tr key={e.id} style={{ borderBottom:'1px solid #F5F5F7' }}>
                <td style={{ padding:'7px 10px' }}>
                  <div style={{ fontWeight:700, color:'#1d1d1f' }}>{e.casa}</div>
                  <div style={{ fontSize:9.5, color:'#86868b' }}>{e.cliente}</div>
                </td>
                <td style={{ padding:'7px 10px', color:'#3a3a3d', fontSize:10.5 }}>
                  {new Date(e.fecha).toLocaleDateString('es-ES', { day:'2-digit', month:'short' })}
                </td>
                <td style={{ padding:'7px 10px', textAlign:'right', color:'#3a3a3d', fontSize:10.5 }}>
                  {e.muestra.toLocaleString('es-ES')}
                </td>
                {partyOrder.slice(0, 6).map(p => (
                  <td key={p} style={{ padding:'7px 6px', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>
                    {e.partidos[p]?.toFixed(1) || '—'}
                  </td>
                ))}
                <td style={{ padding:'7px 10px', textAlign:'right', minWidth:90 }}>
                  <div title={`Calidad ${e.peso_breakdown.calidad} × Recencia ${e.peso_breakdown.recencia} × Muestra ${e.peso_breakdown.muestra_factor}`} style={{
                    display:'inline-flex', alignItems:'center', gap:5,
                  }}>
                    <div style={{ width:50, height:6, background:'#ECECEF', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${(e.peso/maxPeso)*100}%`, height:'100%', background:'#16A34A' }}/>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, color:'#1d1d1f', fontFamily:'var(--font-display)' }}>
                      {e.peso.toFixed(2)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.referencias_sin_cifras.length > 0 && (
        <details style={{ marginTop:14, fontSize:11.5 }}>
          <summary style={{ cursor:'pointer', color:'#1F4E8C', fontWeight:600 }}>
            + {data.referencias_sin_cifras.length} encuestas adicionales detectadas en electocracia.com (ver enlaces)
          </summary>
          <ul style={{ listStyle:'none', margin:'10px 0 0', padding:0, display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:6 }}>
            {data.referencias_sin_cifras.map(r => (
              <li key={r.id} style={{ padding:'6px 10px', background:'#FAFAFA', borderRadius:6, border:'1px solid #ECECEF' }}>
                <a href={r.link} target="_blank" rel="noreferrer" style={{ color:'#1d1d1f', textDecoration:'none', fontSize:11 }}>
                  <strong>{r.casa}</strong>
                  {r.cliente && <span style={{ color:'#6e6e73' }}> · {r.cliente}</span>}
                  {r.fecha && <span style={{ color:'#6e6e73', fontSize:10 }}> · {new Date(r.fecha).toLocaleDateString('es-ES')}</span>}
                  {r.ambito && r.ambito !== 'España' && <span style={{ marginLeft:4, fontSize:9, padding:'1px 5px', background:'#F5F5F7', borderRadius:4, color:'#3a3a3d' }}>{r.ambito}</span>}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
