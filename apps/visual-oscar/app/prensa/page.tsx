'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { useRouter } from 'next/navigation'
import { clearTokens, isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'

// ─────────────────────────────────────────────────────────────────────
// Tipos de la respuesta de /api/noticias/feed
// ─────────────────────────────────────────────────────────────────────
type ScoredArticle = {
  medio_id: string
  medio_nombre: string
  medio_tipo: string
  medio_ambito: string
  medio_ccaa: string | null
  ideologia: number
  title: string
  link: string
  pub_date: string | null
  description: string
  importance: number
  components: { source: number; recency: number; politics: number; crisis: number; cluster: number }
  tags: string[]
}
type FeedResponse = {
  articles: ScoredArticle[]
  summary: {
    total_articles: number; returned: number;
    avg_importance: number; top_importance: number;
    distribucion_ideologica: { izquierda: number; centro: number; derecha: number }
    breaking_news: number; cluster_alerts: number;
  }
  fetch_stats: { sources_attempted: number; sources_ok: number; raw_items: number; fetch_ms: number }
}

const NOTICIAS_FALLBACK=[
  {id:1,titulo:'PP propone rebaja del IRPF para rentas medias en la próxima legislatura',fuente:'El Mundo',fecha:'30 abr',partidos:['PP'],sent:0.32,label:'Positivo'},
  {id:2,titulo:'Tensión en el Congreso tras debate sobre ley de amnistía',fuente:'El País',fecha:'30 abr',partidos:['PSOE','PP','Junts'],sent:-0.41,label:'Negativo'},
  {id:3,titulo:'VOX presenta moción de censura parcial contra gobierno de coalición',fuente:'ABC',fecha:'29 abr',partidos:['VOX','PSOE'],sent:-0.62,label:'Negativo'},
  {id:4,titulo:'Sumar y PSOE acuerdan ampliación del permiso de paternidad a 20 semanas',fuente:'La Vanguardia',fecha:'29 abr',partidos:['PSOE','Sumar'],sent:0.54,label:'Positivo'},
  {id:5,titulo:'El Banco de España revisa al alza el crecimiento a 2.9% para 2026',fuente:'Expansión',fecha:'28 abr',partidos:[],sent:0.41,label:'Positivo'},
  {id:6,titulo:'ERC exige nuevo referéndum como condición para investidura',fuente:'La Vanguardia',fecha:'28 abr',partidos:['ERC','PSOE'],sent:-0.28,label:'Neutro'},
  {id:7,titulo:'Huelga de funcionarios afecta a 14 ministerios en Madrid',fuente:'El Confidencial',fecha:'27 abr',partidos:['PSOE'],sent:-0.51,label:'Negativo'},
  {id:8,titulo:'PNV y PSOE cierran acuerdo sobre concierto económico vasco',fuente:'El Correo',fecha:'27 abr',partidos:['PSOE','PNV'],sent:0.22,label:'Neutro'},
]

const SENT_PARTIDOS=[
  {s:'Sumar',    v: 0.38,c:'#E4007C'},{s:'PNV',      v: 0.22,c:'#007A3D'},
  {s:'PSOE',     v: 0.04,c:'#E30613'},{s:'ERC',      v:-0.08,c:'#F4B20A'},
  {s:'PP',       v:-0.12,c:'#009FDB'},{s:'Junts',    v:-0.24,c:'#00AEEF'},
  {s:'EH Bildu', v:-0.31,c:'#A9C55A'},{s:'VOX',      v:-0.58,c:'#63BE21'},
]

const HOAXES=[
  {titulo:'El gobierno sube el IVA de los alimentos básicos al 21%',fecha:'25 abr',veredicto:'FALSO',partidos:['PSOE'],origen:'Telegram',explicacion:'El IVA de alimentos básicos permanece al 0% desde la prórroga de enero 2024.',c:'#EF4444'},
  {titulo:'PP planea privatizar la sanidad en tres comunidades autónomas',fecha:'22 abr',veredicto:'ENGAÑOSO',partidos:['PP'],origen:'Twitter/X',explicacion:'La noticia mezcla datos de 2012 con propuestas actuales. No hay plan formal de privatización.',c:'#F59E0B'},
  {titulo:'VOX afirma que el 90% de los delitos los cometen inmigrantes',fecha:'18 abr',veredicto:'FALSO',partidos:['VOX'],origen:'Discurso parlamentario',explicacion:'Según el INE 2023, los extranjeros representan el 28% de los condenados, no el 90%.',c:'#EF4444'},
  {titulo:'El déficit público supera el 8% del PIB',fecha:'15 abr',veredicto:'SIN VERIFICAR',partidos:[],origen:'WhatsApp',explicacion:'El dato oficial de AIREF para 2025 es -3.2%. No hay fuente primaria que avale el 8%.',c:'#F59E0B'},
  {titulo:'Sumar propone jornada laboral de 28 horas semanales',fecha:'10 abr',veredicto:'ENGAÑOSO',partidos:['Sumar'],origen:'Redes sociales',explicacion:'La propuesta oficial de Sumar es de 32 horas, no 28. El dato fue distorsionado.',c:'#F59E0B'},
  {titulo:'España tiene la mayor tasa de paro juvenil del mundo',fecha:'5 abr',veredicto:'ENGAÑOSO',partidos:[],origen:'Prensa internacional',explicacion:'España tiene alta tasa (27%) pero no es la mayor global. Grecia y varios países africanos la superan.',c:'#F59E0B'},
]

const AGENDA=[
  {tema:'Economía',n:42,sent:0.15,c:'#22C55E'},{tema:'Cataluña',n:38,sent:-0.28,c:'#F59E0B'},
  {tema:'Empleo',n:31,sent:-0.12,c:'#60a5fa'},{tema:'Parlamento',n:28,sent:-0.35,c:'#a78bfa'},
  {tema:'Vivienda',n:24,sent:-0.45,c:'#EF4444'},{tema:'Internacional',n:19,sent:0.08,c:'#34d399'},
  {tema:'Sanidad',n:17,sent:-0.18,c:'#fb923c'},{tema:'Educación',n:14,sent:0.05,c:'#a3e635'},
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

export default function PrensaPage(){
  const router=useRouter()
  const currentPath='/prensa'
  useEffect(()=>{if(!isAuthenticated())router.push('/login')},[router])
  function logout(){clearTokens();router.push('/login')}

  // Feed dinámico de RSS · auto-refresh cada 60s
  const { data: feed, source, updatedAt, refresh, loading } = useApi<FeedResponse>(
    '/api/noticias/feed?limit=24&sources=30&since_hours=72',
    { refreshInterval: 60_000 }
  )
  const articles = feed?.articles || []
  const totalArticles = feed?.summary.total_articles || 0
  const breakingCount = feed?.summary.breaking_news || 0
  const sourcesOk = feed?.fetch_stats.sources_ok || 0
  const sourcesAttempted = feed?.fetch_stats.sources_attempted || 0
  const avgSent=(NOTICIAS_FALLBACK.reduce((s,n)=>s+n.sent,0)/NOTICIAS_FALLBACK.length).toFixed(2)
  const negPct=Math.round(NOTICIAS_FALLBACK.filter(n=>n.sent<0).length/NOTICIAS_FALLBACK.length*100)
  return(
    <div style={{background:'var(--bg)',minHeight:'100vh',fontFamily:'var(--font-body)'}}>
      <AppHeader/>
      <main style={{maxWidth:1600,margin:'0 auto',padding:'0 28px 80px'}}>
        <section style={{background:'linear-gradient(135deg,#4c1d95 0%,#1e1b4b 100%)',borderRadius:'0 0 24px 24px',padding:'36px 48px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22,color:'#fff'}}>
          <div>
            <p style={{fontSize:10.5,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',opacity:0.65,margin:'0 0 8px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <span>Prensa & Agenda · Monitorización en vivo</span>
              <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={60} onRefresh={refresh}/>
            </p>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:700,letterSpacing:'-0.024em',margin:'0 0 6px',lineHeight:1.1}}>{totalArticles > 0 ? `${totalArticles} noticias` : 'Cargando…'} <em style={{fontWeight:300}}>de {sourcesOk}/{sourcesAttempted} medios</em></h1>
            <p style={{fontSize:13,opacity:0.65,margin:0}}>Scoring por importancia · {breakingCount} última hora · auto-refresh 60s</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,flexShrink:0}}>
            {[{l:'Noticias',v:totalArticles>0?String(totalArticles):'…'},{l:'Top score',v:String(feed?.summary.top_importance||0)},{l:'Última hora',v:String(breakingCount)},{l:'Medios OK',v:`${sourcesOk}/${sourcesAttempted}`}].map(k=>(
              <div key={k.l} style={{textAlign:'center'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:700,color:'#c4b5fd',lineHeight:1}}>{k.v}</div>
                <div style={{fontSize:11,opacity:0.6,marginTop:3}}>{k.l}</div>
              </div>
            ))}
          </div>
        </section>

        <div style={{display:'grid',gridTemplateColumns:'6fr 6fr',gap:18,marginBottom:20}}>
          <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 16px'}}>Agenda del día · Temas por volumen</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {AGENDA.map(t=>(
                <div key={t.tema} style={{padding:'12px 14px',borderRadius:12,background:`${t.c}14`,border:`1px solid ${t.c}30`,textAlign:'center'}}>
                  <div style={{fontSize:13,fontWeight:700,color:t.c,marginBottom:4}}>{t.tema}</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:700}}>{t.n}</div>
                  <div style={{fontSize:10.5,color:'var(--ink-4)',marginTop:2}}>artículos</div>
                  <div style={{fontSize:10.5,marginTop:4,color:t.sent>0?'#16A34A':t.sent<-0.2?'#DC2626':'var(--ink-4)',fontWeight:600}}>{t.sent>0?'↑':t.sent<-0.1?'↓':'→'} {t.sent.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 16px'}}>Sentimiento por partido</h2>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {SENT_PARTIDOS.map(p=>{
                const pct=((p.v+1)/2)*100
                return(
                  <div key={p.s} style={{display:'grid',gridTemplateColumns:'72px 1fr 52px',gap:10,alignItems:'center'}}>
                    <span style={{fontSize:12,fontWeight:600,color:p.c}}>{p.s}</span>
                    <div style={{height:20,background:'var(--bg-soft)',borderRadius:5,overflow:'hidden',position:'relative'}}>
                      <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:'var(--hairline)'}}/>
                      {p.v>=0?(
                        <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:`${(p.v/1)*50}%`,background:p.c,opacity:0.75,borderRadius:'0 5px 5px 0'}}/>
                      ):(
                        <div style={{position:'absolute',right:'50%',top:0,bottom:0,width:`${(Math.abs(p.v)/1)*50}%`,background:p.c,opacity:0.75,borderRadius:'5px 0 0 5px'}}/>
                      )}
                    </div>
                    <span style={{fontFamily:'var(--font-display)',fontSize:12,fontWeight:700,color:p.v>0?'#16A34A':p.v<0?'#DC2626':'var(--ink-4)',textAlign:'right'}}>{p.v>0?'+':''}{p.v.toFixed(2)}</span>
                  </div>
                )
              })}
              <div style={{fontSize:10.5,color:'var(--ink-4)',marginTop:4,textAlign:'center'}}>Escala: −1 (muy negativo) → 0 → +1 (muy positivo)</div>
            </div>
          </div>
        </div>

        <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Últimas noticias · ranking por importancia</h2>
            <span style={{fontSize:10.5,color:'var(--ink-3)',background:'var(--bg-soft)',borderRadius:999,padding:'4px 10px',border:'1px solid var(--hairline)'}}>
              {loading && articles.length === 0 ? 'cargando feeds…' : `${articles.length} artículos · puntuados 0-100`}
            </span>
          </div>
          {articles.length === 0 && !loading ? (
            <div style={{padding:'30px',textAlign:'center',color:'var(--ink-4)',fontSize:13}}>
              Sin noticias disponibles · pulsa la píldora &quot;DATOS DE DEMO&quot; para reintentar.
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {articles.map(a=>{
                // Color por importancia: verde alto · amarillo medio · gris bajo
                const impColor = a.importance >= 70 ? '#DC2626' : a.importance >= 50 ? '#F59E0B' : a.importance >= 30 ? '#6366F1' : '#9CA3AF'
                const ideoColor = a.ideologia < -20 ? '#E30613' : a.ideologia > 20 ? '#1F4E8C' : '#9E9E9E'
                const ideoLabel = a.ideologia < -20 ? 'IZQ' : a.ideologia > 20 ? 'DER' : 'CTR'
                const fecha = a.pub_date ? new Date(a.pub_date).toLocaleString('es-ES', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : 'sin fecha'
                return (
                  <a key={`${a.medio_id}-${a.link}`} href={a.link} target="_blank" rel="noopener noreferrer" style={{padding:'14px 16px',borderRadius:14,background:'var(--bg-soft)',border:'1px solid var(--hairline)',borderLeft:`3px solid ${impColor}`,textDecoration:'none',color:'inherit',display:'block',transition:'transform 120ms,box-shadow 120ms'}}
                     onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-1px)';(e.currentTarget as HTMLElement).style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'}}
                     onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.boxShadow=''}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8,gap:8}}>
                      <p style={{margin:0,fontSize:13,fontWeight:600,lineHeight:1.35,flex:1}}>{a.title}</p>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3,flexShrink:0}}>
                        <span style={{fontFamily:'var(--font-display)',fontSize:14,fontWeight:800,padding:'2px 8px',borderRadius:999,background:impColor,color:'#fff',lineHeight:1.2}}>{a.importance}</span>
                      </div>
                    </div>
                    {a.tags.length > 0 && (
                      <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:6}}>
                        {a.tags.map(t=><span key={t} style={{fontSize:9.5,fontWeight:700,padding:'2px 6px',borderRadius:4,background:'rgba(0,0,0,0.04)',color:'var(--ink-2)'}}>{t}</span>)}
                      </div>
                    )}
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      <span style={{fontSize:11,fontWeight:600,color:'var(--ink-2)'}}>{a.medio_nombre}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:'1px 5px',borderRadius:3,background:`${ideoColor}20`,color:ideoColor}}>{ideoLabel}</span>
                      <span style={{fontSize:10.5,color:'var(--ink-4)'}}>· {fecha}</span>
                      {a.medio_ccaa && <span style={{fontSize:10.5,padding:'1px 5px',borderRadius:3,background:'var(--hairline)',color:'var(--ink-3)'}}>{a.medio_ccaa}</span>}
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>

        <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Verificación de bulos · Fact-checking</h2>
            <span style={{fontSize:10.5,fontWeight:600,color:'#DC2626',background:'#fef2f2',borderRadius:999,padding:'3px 10px',border:'1px solid #fecaca'}}>{HOAXES.length} bulos detectados</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {HOAXES.map((h,i)=>(
              <div key={i} style={{padding:'14px 16px',borderRadius:14,background:h.c==='#EF4444'?'rgba(239,68,68,0.05)':'rgba(245,158,11,0.05)',border:`1px solid ${h.c}30`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8,gap:8}}>
                  <p style={{margin:0,fontSize:12.5,fontWeight:600,lineHeight:1.35,flex:1}}>{h.titulo}</p>
                  <span style={{fontSize:9.5,fontWeight:700,padding:'2px 7px',borderRadius:999,flexShrink:0,background:h.c,color:'#fff',letterSpacing:'0.03em'}}>{h.veredicto}</span>
                </div>
                <p style={{margin:'0 0 8px',fontSize:11.5,color:'var(--ink-3)',lineHeight:1.4}}>{h.explicacion}</p>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <span style={{fontSize:10.5,color:'var(--ink-4)'}}>{h.fecha} · {h.origen}</span>
                  {h.partidos.map(p=><span key={p} style={{fontSize:10.5,padding:'1px 6px',borderRadius:999,background:'var(--hairline)',color:'var(--ink-3)'}}>{p}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <footer style={{borderTop:'1px solid var(--hairline)',padding:'20px 28px',textAlign:'center',color:'var(--ink-4)',fontSize:11.5}}>
        Datos ficticios · Prensa & Agenda · ElectSim · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
