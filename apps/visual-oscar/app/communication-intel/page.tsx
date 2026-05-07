'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

type Plataforma = 'X (Twitter)' | 'TikTok' | 'Instagram' | 'YouTube' | 'Facebook' | 'Threads'
const PLAT_COLOR: Record<Plataforma, string> = {
  'X (Twitter)':'#1d1d1f', 'TikTok':'#FE2C55', 'Instagram':'#E4405F',
  'YouTube':'#FF0000', 'Facebook':'#1877F2', 'Threads':'#000000',
}

type Crisis = { id:string; level:'alta'|'media'|'baja'; actor:string; partido:string; partidoColor:string; evento:string; alcance:string; ts:string; tendencia:'+'|'-'|'=' }
const CRISIS: Crisis[] = [
  { id:'cr01', level:'alta',  actor:'Gobierno', partido:'PSOE',  partidoColor:'#E1322D',
    evento:'Crisis "Caso Koldo": filtraciones diarias y pérdida de control narrativo',
    alcance:'4,8M impresiones · 24h', ts:'hoy', tendencia:'+' },
  { id:'cr02', level:'alta',  actor:'Junts',    partido:'Junts', partidoColor:'#1FA89B',
    evento:'Comunicado de ruptura interpretado como ultimátum · viralización en derecha',
    alcance:'3,2M impresiones · 12h', ts:'hoy', tendencia:'+' },
  { id:'cr03', level:'media', actor:'Pedro Sánchez', partido:'PSOE', partidoColor:'#E1322D',
    evento:'Rueda de prensa con declaraciones contradictorias sobre PNV (deepfake denunciado)',
    alcance:'1,4M impresiones · 36h', ts:'ayer', tendencia:'-' },
  { id:'cr04', level:'media', actor:'Ayuso',    partido:'PP',    partidoColor:'#1F4E8C',
    evento:'Comparativa fact-checked con datos del INE; respuesta defensiva',
    alcance:'860K impresiones · 24h', ts:'ayer', tendencia:'=' },
  { id:'cr05', level:'baja',  actor:'VOX',      partido:'VOX',   partidoColor:'#5BA02E',
    evento:'Tensión interna entre baronías por estrategia europea',
    alcance:'420K impresiones · 48h', ts:'hace 2d', tendencia:'-' },
]

type Trending = { hashtag:string; plataforma:Plataforma; menciones:number; variacion:number; tono:number; partido:string; partidoColor:string; ranking:number }
const TRENDING: Trending[] = [
  { hashtag:'#MociónCensura',   plataforma:'X (Twitter)', menciones:56.4, variacion:+220, tono:-0.42, partido:'PP',    partidoColor:'#1F4E8C', ranking:1 },
  { hashtag:'#JuntsRompe',      plataforma:'X (Twitter)', menciones:38.1, variacion:+185, tono:-0.18, partido:'Junts', partidoColor:'#1FA89B', ranking:2 },
  { hashtag:'#PrimaRiesgo',     plataforma:'X (Twitter)', menciones:21.7, variacion: +84, tono:-0.36, partido:'PP',    partidoColor:'#1F4E8C', ranking:5 },
  { hashtag:'#AmnistiaJa',      plataforma:'TikTok',      menciones:18.2, variacion: +44, tono:+0.12, partido:'ERC',   partidoColor:'#E8A030', ranking:8 },
  { hashtag:'#CasoKoldo',       plataforma:'X (Twitter)', menciones:16.5, variacion: +62, tono:-0.48, partido:'PP',    partidoColor:'#1F4E8C', ranking:11 },
  { hashtag:'#AyusoPresidenta', plataforma:'X (Twitter)', menciones:12.8, variacion: +18, tono:+0.22, partido:'PP',    partidoColor:'#1F4E8C', ranking:14 },
  { hashtag:'#VivaEspaña',      plataforma:'TikTok',      menciones:11.4, variacion: +32, tono:-0.06, partido:'VOX',   partidoColor:'#5BA02E', ranking:17 },
  { hashtag:'#SumarVivienda',   plataforma:'Instagram',   menciones: 8.6, variacion: -12, tono:+0.28, partido:'Sumar', partidoColor:'#D43F8D', ranking:23 },
]

type Mensaje = { autor:string; partido:string; partidoColor:string; texto:string; plataforma:Plataforma; views:string; likes:string; shares:string; replies:string; ts:string; sentimiento:number }
const MENSAJES: Mensaje[] = [
  { autor:'Alberto Núñez Feijóo', partido:'PP', partidoColor:'#1F4E8C',
    texto:'Pedro Sánchez ha convertido España en un caos jurídico, económico y diplomático. Este Gobierno no aguanta hasta el verano. La moción de censura es ya una cuestión de cuándo, no de si.',
    plataforma:'X (Twitter)', views:'2.4M', likes:'127K', shares:'48K', replies:'18K', ts:'hoy 14:18', sentimiento:-0.62 },
  { autor:'Yolanda Díaz', partido:'Sumar', partidoColor:'#D43F8D',
    texto:'La reducción de jornada a 37,5 horas no es un capricho ideológico: es justicia social, salud mental y productividad. La derecha del miedo no quiere entenderlo.',
    plataforma:'X (Twitter)', views:'1.8M', likes:'92K', shares:'34K', replies:'12K', ts:'hoy 11:42', sentimiento:+0.34 },
  { autor:'Santiago Abascal', partido:'VOX', partidoColor:'#5BA02E',
    texto:'Hoy, mientras el Gobierno reparte ayudas a los sindicatos cómplices, miles de españoles no llegan a fin de mes. Es vergonzoso. Es inadmisible. Es España.',
    plataforma:'X (Twitter)', views:'1.5M', likes:'74K', shares:'41K', replies:'9K', ts:'hoy 09:30', sentimiento:-0.48 },
  { autor:'Pedro Sánchez', partido:'PSOE', partidoColor:'#E1322D',
    texto:'Este Gobierno seguirá trabajando por una España más justa, más verde y más europea. Nadie nos va a sacar del rumbo del progreso.',
    plataforma:'X (Twitter)', views:'1.2M', likes:'58K', shares:'19K', replies:'14K', ts:'ayer 19:55', sentimiento:+0.18 },
  { autor:'Carles Puigdemont', partido:'Junts', partidoColor:'#1FA89B',
    texto:'Ningún acuerdo se ha cumplido. Ninguna palabra dada se ha respetado. Junts no puede sostener una legislatura que ha incumplido sistemáticamente sus compromisos con Catalunya.',
    plataforma:'X (Twitter)', views:'940K', likes:'52K', shares:'27K', replies:'8K', ts:'hoy 17:15', sentimiento:-0.32 },
  { autor:'Isabel Díaz Ayuso', partido:'PP', partidoColor:'#1F4E8C',
    texto:'Madrid baja impuestos, mejora servicios y atrae inversión. Lo demás son cuentos. Lo demás es Sánchez.',
    plataforma:'X (Twitter)', views:'1.1M', likes:'68K', shares:'22K', replies:'11K', ts:'ayer 16:00', sentimiento:+0.14 },
]

type SentLider = { nombre:string; partido:string; color:string; sent:number; menciones:number; delta:number }
const SENT: SentLider[] = [
  { nombre:'Pedro Sánchez',     partido:'PSOE',  color:'#E1322D', sent:-0.18, menciones:184, delta:-0.06 },
  { nombre:'A. Núñez Feijóo',   partido:'PP',    color:'#1F4E8C', sent:+0.12, menciones:142, delta:+0.04 },
  { nombre:'Yolanda Díaz',      partido:'Sumar', color:'#D43F8D', sent:+0.22, menciones: 96, delta:+0.02 },
  { nombre:'Santiago Abascal',  partido:'VOX',   color:'#5BA02E', sent:-0.34, menciones:118, delta:-0.10 },
  { nombre:'Isabel Díaz Ayuso', partido:'PP',    color:'#1F4E8C', sent:+0.18, menciones:124, delta:+0.08 },
  { nombre:'Carles Puigdemont', partido:'Junts', color:'#1FA89B', sent:-0.22, menciones: 88, delta:-0.18 },
]

type Influencer = { handle:string; nombre:string; plataforma:Plataforma; seguidores:string; eng:string; afinidad:string; afinidadColor:string }
const INFLUENCERS: Influencer[] = [
  { handle:'@iescolar',           nombre:'Ignacio Escolar',     plataforma:'X (Twitter)', seguidores:'1,8M', eng:'4,2%', afinidad:'Centro-izq.',   afinidadColor:'#E1322D' },
  { handle:'@CarlosHerreraCOPE',  nombre:'Carlos Herrera',      plataforma:'X (Twitter)', seguidores:'1,2M', eng:'2,8%', afinidad:'Centro-dcha.',  afinidadColor:'#1F4E8C' },
  { handle:'@anairissimon',       nombre:'Ana Iris Simón',      plataforma:'TikTok',      seguidores:'920K', eng:'8,1%', afinidad:'Heterodoxa',    afinidadColor:'#7C3AED' },
  { handle:'@VictorAmela',        nombre:'Víctor Amela',        plataforma:'X (Twitter)', seguidores:'480K', eng:'3,4%', afinidad:'Centro',        afinidadColor:'#6e6e73' },
  { handle:'@AntonLosada',        nombre:'Antón Losada',        plataforma:'X (Twitter)', seguidores:'420K', eng:'5,8%', afinidad:'Izquierda',     afinidadColor:'#A02525' },
  { handle:'@CristinaSeguiVox',   nombre:'Cristina Seguí',      plataforma:'X (Twitter)', seguidores:'380K', eng:'6,2%', afinidad:'Derecha',       afinidadColor:'#1F4E8C' },
  { handle:'@JuanCMonedero',      nombre:'Juan Carlos Monedero',plataforma:'X (Twitter)', seguidores:'620K', eng:'7,1%', afinidad:'Izquierda',     afinidadColor:'#A02525' },
  { handle:'@miquelmacia',        nombre:'Miquel Macià',        plataforma:'TikTok',      seguidores:'1,4M', eng:'9,2%', afinidad:'Independentista', afinidadColor:'#1FA89B' },
]

const LEVEL_META: Record<Crisis['level'], { label:string; color:string; pulse?:boolean }> = {
  'alta':  { label:'CRISIS ALTA',  color:'#DC2626', pulse:true },
  'media': { label:'CRISIS MEDIA', color:'#F97316' },
  'baja':  { label:'CRISIS BAJA',  color:'#EAB308' },
}

const PLATAFORMAS = ['Todas','X (Twitter)','TikTok','Instagram','YouTube','Facebook','Threads'] as const

export default function CommunicationIntelPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [filterPlat, setFilterPlat] = useState<typeof PLATAFORMAS[number]>('Todas')

  const trendingFilt = useMemo(
    () => filterPlat === 'Todas' ? TRENDING : TRENDING.filter(t => t.plataforma === filterPlat),
    [filterPlat]
  )

  const totalImpr = '12,8M'
  const sentAgreg = +(SENT.reduce((s, x) => s + x.sent, 0) / SENT.length).toFixed(2)
  const crisisAlta = CRISIS.filter(c => c.level === 'alta').length

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-body)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* Hero */}
        <section style={{
          background:'linear-gradient(135deg,#7C2D92 0%,#3B0764 100%)',
          borderRadius:22, padding:'30px 38px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.7fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:600, letterSpacing:'0.14em', textTransform:'uppercase', opacity:0.7, margin:'0 0 8px' }}>
              NARRATIVA PÚBLICA · COMMUNICATION INTEL
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:30, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              {crisisAlta} crisis activas, <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.75)' }}>conversación pública monitorizada</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0 }}>
              Detección de crisis · trending en redes · sentimiento por líder · mensajes virales · top influencers
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            <MiniK label="IMPRESIONES 24H" v={totalImpr}/>
            <MiniK label="TONO MEDIO" v={`${sentAgreg > 0 ? '+' : ''}${sentAgreg}`} c={sentAgreg >= 0 ? '#16A34A' : '#ef4444'}/>
            <MiniK label="CRISIS ALTAS" v={String(crisisAlta)} c="#ef4444" pulse/>
          </div>
        </section>

        {/* Crisis */}
        <section style={{ marginBottom:14 }}>
          <SectionTitle>Crisis reputacionales activas</SectionTitle>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {CRISIS.map(c => {
              const m = LEVEL_META[c.level]
              return (
                <article key={c.id} style={{
                  display:'grid', gridTemplateColumns:'4px 110px 1fr 130px', alignItems:'stretch',
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:14, overflow:'hidden',
                  boxShadow:'0 1px 2px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ background:m.color }}/>
                  <div style={{ padding:'12px 16px', borderRight:'1px solid #ECECEF', display:'flex', flexDirection:'column', justifyContent:'center', gap:4 }}>
                    <span style={{
                      fontSize:9.5, fontWeight:800, letterSpacing:'0.08em',
                      padding:'3px 7px', borderRadius:999, color:'#fff', background:m.color,
                      animation: m.pulse ? 'ciBlink 1.4s ease-in-out infinite' : undefined,
                      boxShadow: m.pulse ? `0 0 10px ${m.color}` : undefined, textAlign:'center',
                    }}>{m.label}</span>
                    <span style={{ fontSize:10.5, color:'#6e6e73', textAlign:'center' }}>{c.ts}</span>
                  </div>
                  <div style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                      <span style={{ width:10, height:10, borderRadius:'50%', background:c.partidoColor }}/>
                      <span style={{ fontSize:13, fontWeight:700, color:'#1d1d1f' }}>{c.actor}</span>
                      <span style={{ fontSize:11, color:c.partidoColor, fontWeight:600 }}>· {c.partido}</span>
                    </div>
                    <div style={{ fontSize:13, color:'#3a3a3d', lineHeight:1.45 }}>{c.evento}</div>
                  </div>
                  <div style={{ padding:'12px 14px', borderLeft:'1px solid #ECECEF', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-end', gap:3 }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#1d1d1f' }}>{c.alcance}</span>
                    <span style={{ fontSize:11, color: c.tendencia === '+' ? '#DC2626' : c.tendencia === '-' ? '#16A34A' : '#6e6e73', fontWeight:600 }}>
                      {c.tendencia === '+' ? '▲ creciendo' : c.tendencia === '-' ? '▼ decreciendo' : '= estable'}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* Sentimiento por líder */}
        <section style={{ marginBottom:14 }}>
          <SectionTitle>Sentimiento por líder · últimas 24h</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
            {SENT.map(s => {
              const c = s.sent >= 0 ? '#16A34A' : '#DC2626'
              const pct = (s.sent + 1) / 2 * 100
              return (
                <div key={s.nombre} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:12, padding:'12px 14px',
                  borderLeft:`3px solid ${s.color}`,
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                    <div>
                      <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f' }}>{s.nombre}</div>
                      <div style={{ fontSize:10.5, color:s.color, fontWeight:700 }}>{s.partido}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:c, lineHeight:1 }}>
                        {s.sent > 0 ? '+' : ''}{s.sent.toFixed(2)}
                      </div>
                      <div style={{ fontSize:9.5, color: s.delta >= 0 ? '#16A34A' : '#DC2626', fontWeight:700, marginTop:1 }}>
                        {s.delta > 0 ? '▲' : '▼'} {Math.abs(s.delta).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div style={{ position:'relative', height:5, background:'#F5F5F7', borderRadius:3 }}>
                    <div style={{ position:'absolute', left:'50%', top:-2, bottom:-2, width:1, background:'#1d1d1f', opacity:0.4 }}/>
                    <div style={{
                      position:'absolute', top:0, bottom:0,
                      left: s.sent < 0 ? `${pct}%` : '50%',
                      width: `${Math.abs(s.sent)*50}%`,
                      background: c, borderRadius:3,
                    }}/>
                  </div>
                  <div style={{ fontSize:10.5, color:'#6e6e73', marginTop:5 }}>{s.menciones}K menciones</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Trending + Mensajes */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:14, marginBottom:14 }}>

          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, gap:10, flexWrap:'wrap' }}>
              <h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Trending en redes</h2>
              <select value={filterPlat} onChange={e=>setFilterPlat(e.target.value as typeof PLATAFORMAS[number])} style={{
                fontFamily:'inherit', fontSize:11.5, fontWeight:500, padding:'4px 24px 4px 10px', borderRadius:999,
                border:'1px solid #ECECEF', background:'#fff', color:'#3a3a3d', cursor:'pointer', appearance:'none',
                backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center',
              }}>
                {PLATAFORMAS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {trendingFilt.length === 0 && (
                <div style={{ padding:14, textAlign:'center', color:'#6e6e73', fontSize:12, background:'#FAFAFB', borderRadius:10 }}>Sin trending en esta plataforma.</div>
              )}
              {trendingFilt.map(t => (
                <div key={t.hashtag} style={{
                  display:'grid', gridTemplateColumns:'30px 1fr 60px 60px', gap:10, alignItems:'center',
                  padding:'9px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:PLAT_COLOR[t.plataforma], lineHeight:1 }}>#{t.ranking}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f' }}>{t.hashtag}</div>
                    <div style={{ fontSize:10.5, color:'#6e6e73', display:'flex', alignItems:'center', gap:6, marginTop:1 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:PLAT_COLOR[t.plataforma] }}/>{t.plataforma}
                      <span style={{ width:7, height:7, borderRadius:'50%', background:t.partidoColor, marginLeft:5 }}/>{t.partido}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1d1d1f' }}>{t.menciones.toFixed(1)}K</div>
                    <div style={{ fontSize:9.5, color: t.variacion > 0 ? '#16A34A' : '#DC2626', fontWeight:700 }}>{t.variacion > 0 ? '▲' : '▼'} {Math.abs(t.variacion)}%</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12, fontWeight:700, color: t.tono >= 0 ? '#16A34A' : '#DC2626' }}>{t.tono > 0 ? '+' : ''}{t.tono.toFixed(2)}</div>
                    <div style={{ fontSize:9.5, color:'#6e6e73', letterSpacing:'0.04em', textTransform:'uppercase', fontWeight:700 }}>tono</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Mensajes virales</h2>
              <span style={{ fontSize:11, color:'#6e6e73' }}>{MENSAJES.length} declaraciones · ranking por views</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:600, overflowY:'auto', paddingRight:4 }}>
              {[...MENSAJES].sort((a,b)=> parseFloat(b.views) - parseFloat(a.views)).map((m, i) => (
                <div key={i} style={{
                  background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'12px 14px',
                  borderLeft:`3px solid ${m.partidoColor}`,
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{
                        width:30, height:30, borderRadius:'50%', background:m.partidoColor,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color:'#fff', fontWeight:700, fontSize:11, fontFamily:'var(--font-display)',
                      }}>{m.autor.split(' ').filter((_,i)=>i>0).map(w=>w[0]).join('').slice(0,2)}</div>
                      <div>
                        <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f' }}>{m.autor}</div>
                        <div style={{ fontSize:10.5, color:'#6e6e73' }}>
                          <span style={{ color:m.partidoColor, fontWeight:600 }}>{m.partido}</span> · {m.plataforma} · {m.ts}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize:9.5, fontWeight:700, padding:'2px 7px', borderRadius:999,
                      background: m.sentimiento >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                      color: m.sentimiento >= 0 ? '#16A34A' : '#DC2626',
                      border:`1px solid ${m.sentimiento >= 0 ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
                    }}>{m.sentimiento > 0 ? '+' : ''}{m.sentimiento.toFixed(2)}</span>
                  </div>
                  <p style={{ margin:'6px 0 8px', fontSize:12.5, color:'#1d1d1f', lineHeight:1.5, fontStyle:'italic', borderLeft:`2px solid ${m.partidoColor}33`, paddingLeft:10 }}>
                    “{m.texto}”
                  </p>
                  <div style={{ display:'flex', gap:14, fontSize:10.5, color:'#6e6e73', flexWrap:'wrap' }}>
                    <span><strong style={{ color:'#1d1d1f' }}>{m.views}</strong> views</span>
                    <span><strong style={{ color:'#1d1d1f' }}>{m.likes}</strong> likes</span>
                    <span><strong style={{ color:'#1d1d1f' }}>{m.shares}</strong> shares</span>
                    <span><strong style={{ color:'#1d1d1f' }}>{m.replies}</strong> replies</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Influencers */}
        <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Top influencers políticos</h2>
            <span style={{ fontSize:11, color:'#6e6e73' }}>Por engagement y alcance · análisis semanal</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:8 }}>
            {INFLUENCERS.map(i => (
              <div key={i.handle + i.nombre} style={{
                display:'grid', gridTemplateColumns:'auto 1fr auto', gap:11, alignItems:'center',
                padding:'10px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
              }}>
                <div style={{
                  width:34, height:34, borderRadius:'50%', background:PLAT_COLOR[i.plataforma], color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:700, fontSize:11, fontFamily:'var(--font-display)',
                }}>{i.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')}</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f' }}>{i.nombre}</div>
                  <div style={{ fontSize:10.5, color:'#6e6e73' }}>{i.handle} · {i.plataforma}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1d1d1f', lineHeight:1 }}>{i.seguidores}</div>
                  <div style={{ fontSize:10, color:'#6e6e73', fontWeight:600 }}>eng {i.eng}</div>
                  <div style={{ fontSize:9.5, color:i.afinidadColor, fontWeight:700, marginTop:2 }}>{i.afinidad}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <style>{`
          @keyframes ciBlink { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        `}</style>
      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Narrativa Pública · Communication Intel · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

function MiniK({ label, v, c='#fff', pulse }: { label:string, v:string, c?:string, pulse?:boolean }) {
  return (
    <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, lineHeight:1, color:c, animation: pulse ? 'ciBlink 1.5s ease-in-out infinite' : undefined }}>{v}</div>
      <div style={{ fontSize:8.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.7, marginTop:3, color:'#fff' }}>{label}</div>
    </div>
  )
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ margin:'0 0 10px', fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>{children}</h2>
}
