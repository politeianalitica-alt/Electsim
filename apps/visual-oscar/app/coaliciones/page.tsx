'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { useRouter } from 'next/navigation'
import { clearTokens, isAuthenticated } from '@/lib/auth'
import PropensityPanel from '@/components/PropensityPanel'
import AdversarioPanel from '@/components/AdversarioPanel'
import CampanaPanel from '@/components/CampanaPanel'
import VotoBlandoPanel from '@/components/VotoBlandoPanel'
import AnalogiasPanel from '@/components/AnalogiasPanel'
import MarketPanel from '@/components/MarketPanel'
import OntologyPanel from '@/components/OntologyPanel'
import GrafoRelacionesPartidos, { type GrafoParty, type GrafoLink } from '@/components/GrafoRelacionesPartidos'

// ─────────────────────────────────────────────────────────────────────────
// Datos del grafo de relaciones · alineados con el diseño Apple-Newsroom
// (Grafo Relaciones.html del design-system)
// ─────────────────────────────────────────────────────────────────────────
const GRAFO_PARTIES: GrafoParty[] = [
  { id:'psoe',  name:'PSOE',     color:'#E1322D', seats:124, block:'izq' },
  { id:'pp',    name:'PP',       color:'#1F4E8C', seats:137, block:'der' },
  { id:'vox',   name:'VOX',      color:'#5BA02E', seats: 35, block:'der' },
  { id:'sumar', name:'Sumar',    color:'#D43F8D', seats: 22, block:'izq' },
  { id:'erc',   name:'ERC',      color:'#E8A030', seats:  8, block:'izq' },
  { id:'junts', name:'Junts',    color:'#1FA89B', seats:  7, block:'centro' },
  { id:'bildu', name:'EH Bildu', color:'#3F7A3A', seats:  6, block:'izq' },
  { id:'pnv',   name:'PNV',      color:'#7DB94B', seats:  5, block:'centro' },
  { id:'bng',   name:'BNG',      color:'#5BB3D9', seats:  2, block:'izq' },
  { id:'cc',    name:'CC',       color:'#F2C43A', seats:  2, block:'centro' },
  { id:'upn',   name:'UPN',      color:'#0E7D8C', seats:  1, block:'der' },
]
const GRAFO_LINKS: GrafoLink[] = [
  { a:'psoe',  b:'sumar', val:+88, label:'Coalición de gobierno' },
  { a:'psoe',  b:'erc',   val:+62, label:'Apoyo parlamentario' },
  { a:'psoe',  b:'bildu', val:+54, label:'Apoyo puntual' },
  { a:'psoe',  b:'pnv',   val:+58, label:'Pactos territoriales' },
  { a:'psoe',  b:'bng',   val:+52, label:'Apoyo puntual' },
  { a:'psoe',  b:'junts', val:+22, label:'Negociación condicionada' },
  { a:'psoe',  b:'cc',    val:+30, label:'Acuerdos sectoriales' },
  { a:'sumar', b:'erc',   val:+60, label:'Eje progresista' },
  { a:'sumar', b:'bildu', val:+58, label:'Eje progresista' },
  { a:'sumar', b:'bng',   val:+55, label:'Eje progresista' },
  { a:'pp',    b:'vox',   val:+72, label:'Coalición autonómica' },
  { a:'pp',    b:'upn',   val:+68, label:'Alianza estable' },
  { a:'pp',    b:'cc',    val:+38, label:'Acuerdos puntuales' },
  { a:'pp',    b:'junts', val:-18, label:'Distancia' },
  { a:'pp',    b:'pnv',   val:+10, label:'Diálogo formal' },
  { a:'pp',    b:'psoe',  val:-65, label:'Bloque opuesto' },
  { a:'vox',   b:'psoe',  val:-92, label:'Confrontación' },
  { a:'vox',   b:'sumar', val:-95, label:'Confrontación' },
  { a:'vox',   b:'erc',   val:-90, label:'Veto mutuo' },
  { a:'vox',   b:'bildu', val:-94, label:'Veto mutuo' },
  { a:'vox',   b:'pnv',   val:-70, label:'Veto' },
  { a:'vox',   b:'upn',   val:+40, label:'Afinidad parcial' },
  { a:'junts', b:'erc',   val:-25, label:'Rivalidad catalana' },
  { a:'pnv',   b:'bildu', val:-30, label:'Rivalidad vasca' },
]

type HubTab = 'resumen' | 'propensity' | 'adversario' | 'campana' | 'voto' | 'analogias' | 'mercado' | 'ontologia'
const HUB_TABS: { v: HubTab; l: string }[] = [
  { v: 'resumen', l: 'Resumen' },
  { v: 'propensity', l: 'Propensity' },
  { v: 'adversario', l: 'Adversario' },
  { v: 'campana', l: 'Campaña' },
  { v: 'voto', l: 'Voto blando' },
  { v: 'analogias', l: 'Analogías' },
  { v: 'mercado', l: 'Mercado' },
  { v: 'ontologia', l: 'Ontología' },
]

const PARTIES_KEY = ['PP','PSOE','VOX','Sumar','PNV','Junts','ERC','EH Bildu']
const COLORS: Record<string,string> = {PP:'#009FDB',PSOE:'#E30613',VOX:'#63BE21',Sumar:'#E4007C',PNV:'#007A3D',Junts:'#00AEEF',ERC:'#F4B20A','EH Bildu':'#A9C55A'}
const COMPAT: Record<string,Record<string,number>> = {
  PP:        {PSOE:-1,VOX:+1,Sumar:-2,PNV: 0,Junts:-1,ERC:-2,'EH Bildu':-2},
  PSOE:      {PP:-1, VOX:-2,Sumar:+2,PNV:+1,Junts: 0,ERC:+1,'EH Bildu':+1},
  VOX:       {PP:+1, PSOE:-2,Sumar:-2,PNV:-2,Junts:-2,ERC:-2,'EH Bildu':-2},
  Sumar:     {PP:-2, PSOE:+2,VOX:-2, PNV: 0,Junts:-1,ERC:+1,'EH Bildu':+2},
  PNV:       {PP: 0, PSOE:+1,VOX:-2, Sumar:0,Junts:0, ERC:0, 'EH Bildu':-1},
  Junts:     {PP:-1, PSOE: 0,VOX:-2, Sumar:-1,PNV:0, ERC:+1,'EH Bildu': 0},
  ERC:       {PP:-2, PSOE:+1,VOX:-2, Sumar:+1,PNV:0, Junts:+1,'EH Bildu':+1},
  'EH Bildu':{PP:-2, PSOE:+1,VOX:-2, Sumar:+2,PNV:-1,Junts:0, ERC:+1},
}
const FORTALEZA=[
  {s:'PP',v:85,c:'#009FDB'},{s:'PSOE',v:80,c:'#E30613'},{s:'PNV',v:78,c:'#007A3D'},
  {s:'Junts',v:72,c:'#00AEEF'},{s:'ERC',v:65,c:'#F4B20A'},{s:'EH Bildu',v:62,c:'#A9C55A'},
  {s:'VOX',v:60,c:'#63BE21'},{s:'Sumar',v:55,c:'#E4007C'},
]
const ESCENARIOS_COA=[
  {nombre:'PP + VOX + CC',partidos:[{s:'PP',c:'#009FDB'},{s:'VOX',c:'#63BE21'},{s:'CC',c:'#FFC107'}],seats:176,prob:38,viable:true},
  {nombre:'PP en minoría',partidos:[{s:'PP',c:'#009FDB'}],seats:132,prob:18,viable:false},
  {nombre:'Bloqueo / repetición',partidos:[],seats:0,prob:22,viable:false},
  {nombre:'PSOE + bloque izquierda',partidos:[{s:'PSOE',c:'#E30613'},{s:'Sumar',c:'#E4007C'},{s:'ERC',c:'#F4B20A'},{s:'EH Bildu',c:'#A9C55A'},{s:'BNG',c:'#73C6EE'}],seats:161,prob:13,viable:false},
  {nombre:'Gran coalición PP + PSOE',partidos:[{s:'PP',c:'#009FDB'},{s:'PSOE',c:'#E30613'}],seats:242,prob:4,viable:true},
]
const PERFILES=[
  {s:'PP',      obj:'Acceder a La Moncloa con estabilidad fiscal',    rojas:'Referéndum, políticas de género expansivas',    c:'#009FDB'},
  {s:'PSOE',    obj:'Mantener gobierno progresista de coalición',      rojas:'Privatización sanidad, recorte de derechos',    c:'#E30613'},
  {s:'VOX',     obj:'Implementar agenda soberanista conservadora',     rojas:'Independentistas, ley trans y de género',       c:'#63BE21'},
  {s:'Sumar',   obj:'Transformación social y ecológica profunda',      rojas:'Pacto con derecha, privatizaciones',            c:'#E4007C'},
  {s:'PNV',     obj:'Avanzar en autogobierno vasco',                   rojas:'Reforma federal sin concierto económico',       c:'#007A3D'},
  {s:'Junts',   obj:'Amnistía e independencia de Cataluña',            rojas:'Gobierno sin amnistía ni referéndum',           c:'#00AEEF'},
  {s:'ERC',     obj:'Referéndum pactado de autodeterminación',         rojas:'Centralización y supresión autogobierno',       c:'#F4B20A'},
  {s:'EH Bildu',obj:'Soberanía vasca y justicia social avanzada',      rojas:'Agenda de derechas, militarismo y OTAN',       c:'#A9C55A'},
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
function cColor(v:number){
  if(v===2) return {bg:'#166534',tx:'#dcfce7'}
  if(v===1) return {bg:'rgba(22,163,74,0.2)',tx:'#16a34a'}
  if(v===0) return {bg:'var(--bg-soft)',tx:'var(--ink-4)'}
  if(v===-1) return {bg:'rgba(220,38,38,0.14)',tx:'#dc2626'}
  return {bg:'#7f1d1d',tx:'#fee2e2'}
}

export default function CoalicionesPage(){
  const router=useRouter()
  const currentPath='/coaliciones'
  const [tab, setTab] = useState<HubTab>('resumen')
  useEffect(()=>{if(!isAuthenticated())router.push('/login')},[router])
  function logout(){clearTokens();router.push('/login')}
  return(
    <div style={{background:'var(--bg)',minHeight:'100vh',fontFamily:'var(--font-body)'}}>
      <AppHeader/>
      <main style={{maxWidth:1600,margin:'0 auto',padding:'0 28px 80px'}}>
        <section style={{background:'linear-gradient(135deg,#134e4a 0%,#042f2e 100%)',borderRadius:'0 0 24px 24px',padding:'36px 48px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22,color:'#fff'}}>
          <div>
            <p style={{fontSize:10.5,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',opacity:0.65,margin:'0 0 8px'}}>Análisis de Coaliciones · 8 partidos</p>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:700,letterSpacing:'-0.024em',margin:'0 0 6px',lineHeight:1.1}}>Derecha lidera con <em style={{fontWeight:300}}>mayoría exacta</em></h1>
            <p style={{fontSize:13,opacity:0.65,margin:0}}>5 escenarios · Matriz de compatibilidad · Perfiles negociadores</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,flexShrink:0}}>
            {[{l:'P(Derecha)',v:'38%',c:'#5eead4'},{l:'P(Izquierda)',v:'18%',c:'#f87171'},{l:'P(Bloqueo)',v:'22%',c:'#d1d5db'}].map(k=>(
              <div key={k.l} style={{textAlign:'center'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:36,fontWeight:700,color:k.c,lineHeight:1}}>{k.v}</div>
                <div style={{fontSize:11,opacity:0.6,marginTop:3}}>{k.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, padding: 5, background: '#fff', border: '1px solid #e8e8ed', borderRadius: 999, marginBottom: 18, width: 'fit-content', overflowX: 'auto', maxWidth: '100%' }}>
          {HUB_TABS.map(t => (
            <button key={t.v} onClick={() => setTab(t.v)} style={{
              padding: '7px 16px', borderRadius: 999, border: 'none',
              background: tab === t.v ? '#1d1d1f' : 'transparent',
              color: tab === t.v ? '#fff' : '#6e6e73',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>{t.l}</button>
          ))}
        </div>

        {tab === 'resumen' && (<>
        {/* ═══ Grafo de relaciones · diseño Apple-Newsroom ═══ */}
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', color:'#6e6e73', textTransform:'uppercase', margin:'0 0 8px' }}>
            Grafo de relaciones · Afinidad parlamentaria
          </p>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:600, letterSpacing:'-0.028em', margin:'4px 0 6px', lineHeight:1.05, color:'#1d1d1f' }}>
            Quién pacta con <span style={{ fontFamily:'var(--font-serif)', fontStyle:'italic', color:'#515154', fontWeight:500 }}>quién.</span>
          </h2>
          <p style={{ fontSize:13, color:'#515154', margin:'0 0 18px', maxWidth:640 }}>
            Cada arco representa una relación bilateral. Grosor proporcional a la afinidad. Pulsa un partido para aislar sus vínculos.
          </p>
          <GrafoRelacionesPartidos parties={GRAFO_PARTIES} links={GRAFO_LINKS}/>
        </div>

        <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',marginBottom:20}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 16px'}}>Escenarios de coalición</h2>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {ESCENARIOS_COA.map((e,i)=>(
              <div key={i} style={{padding:'14px 18px',borderRadius:14,background:'var(--bg-soft)',border:'1px solid var(--hairline)',display:'grid',gridTemplateColumns:'1fr 80px 150px',gap:16,alignItems:'center'}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <span style={{fontSize:13,fontWeight:600}}>{e.nombre}</span>
                    <span style={{fontSize:9.5,fontWeight:700,padding:'2px 7px',borderRadius:999,background:e.viable?'#16A34A':'var(--hairline)',color:e.viable?'#fff':'var(--ink-4)'}}>{e.viable?'VIABLE':'INVIABLE'}</span>
                  </div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                    {e.partidos.map(p=><span key={p.s} style={{fontSize:11,fontWeight:600,padding:'2px 7px',borderRadius:999,background:`${p.c}18`,color:p.c,border:`1px solid ${p.c}3a`}}>{p.s}</span>)}
                    {e.partidos.length===0&&<span style={{fontSize:11,color:'var(--ink-4)'}}>Sin coalición posible</span>}
                  </div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:700}}>{e.seats||'—'}</div>
                  <div style={{fontSize:10.5,color:'var(--ink-4)'}}>escaños</div>
                </div>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:10.5,color:'var(--ink-4)'}}>Probabilidad</span>
                    <span style={{fontFamily:'var(--font-display)',fontSize:13,fontWeight:700}}>{e.prob}%</span>
                  </div>
                  <div style={{height:7,background:'var(--hairline)',borderRadius:999,overflow:'hidden'}}>
                    <div style={{width:`${e.prob}%`,height:'100%',background:e.viable?'#16A34A':'#9E9E9E',borderRadius:999}}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'7fr 5fr',gap:18,marginBottom:20}}>
          <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 16px'}}>Matriz de compatibilidad</h2>
            <div style={{overflowX:'auto'}}>
              <table style={{borderCollapse:'collapse',fontSize:11.5,width:'100%'}}>
                <thead><tr>
                  <th style={{padding:'6px 8px',width:72}}/>
                  {PARTIES_KEY.map(p=><th key={p} style={{padding:'6px 8px',fontWeight:700,color:COLORS[p],textAlign:'center',fontSize:11}}>{p}</th>)}
                </tr></thead>
                <tbody>
                  {PARTIES_KEY.map(row=>(
                    <tr key={row}>
                      <td style={{padding:'4px 8px',fontWeight:700,color:COLORS[row],fontSize:11}}>{row}</td>
                      {PARTIES_KEY.map(col=>{
                        if(row===col) return <td key={col} style={{padding:'4px',textAlign:'center'}}><div style={{width:40,height:30,borderRadius:6,background:'var(--hairline)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-4)',fontSize:12}}>—</div></td>
                        const v=COMPAT[row]?.[col]??0
                        const {bg,tx}=cColor(v)
                        return(
                          <td key={col} style={{padding:'4px',textAlign:'center'}}>
                            <div style={{width:40,height:30,borderRadius:6,background:bg,display:'flex',alignItems:'center',justifyContent:'center',color:tx,fontWeight:700,fontSize:13}}>
                              {v>0?'+':''}{v}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap',fontSize:10.5,color:'var(--ink-3)'}}>
              {[{v:'+2',bg:'#166534',tx:'#dcfce7',l:'Muy compatible'},{v:'+1',bg:'rgba(22,163,74,0.2)',tx:'#16a34a',l:'Compatible'},{v:'0',bg:'var(--bg-soft)',tx:'var(--ink-4)',l:'Neutral'},{v:'−1',bg:'rgba(220,38,38,0.14)',tx:'#dc2626',l:'Incompatible'},{v:'−2',bg:'#7f1d1d',tx:'#fee2e2',l:'Muy incompatible'}].map(l=>(
                <span key={l.v} style={{display:'inline-flex',alignItems:'center',gap:5}}>
                  <span style={{width:20,height:16,borderRadius:3,background:l.bg,color:l.tx,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9.5,fontWeight:700}}>{l.v}</span>
                  {l.l}
                </span>
              ))}
            </div>
          </div>

          <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 16px'}}>Fuerza negociadora</h2>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {FORTALEZA.map(p=>(
                <div key={p.s}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:600,color:p.c}}>{p.s}</span>
                    <span style={{fontFamily:'var(--font-display)',fontSize:13,fontWeight:700}}>{p.v}/100</span>
                  </div>
                  <div style={{height:10,background:'var(--bg-soft)',borderRadius:999,overflow:'hidden'}}>
                    <div style={{width:`${p.v}%`,height:'100%',background:p.c,borderRadius:999}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 16px'}}>Perfiles negociadores</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {PERFILES.map(p=>(
              <div key={p.s} style={{padding:'14px 16px',borderRadius:14,background:'var(--bg-soft)',border:`1px solid ${p.c}28`}}>
                <div style={{fontSize:14,fontWeight:700,color:p.c,marginBottom:8}}>{p.s}</div>
                <div style={{fontSize:11.5,color:'var(--ink-2)',marginBottom:8,lineHeight:1.4}}><strong>Objetivo:</strong> {p.obj}</div>
                <div style={{fontSize:11,color:'#DC2626',lineHeight:1.4}}><strong>Líneas rojas:</strong> {p.rojas}</div>
              </div>
            ))}
          </div>
        </div>
        </>)}

        {tab === 'propensity' && <PropensityPanel/>}
        {tab === 'adversario' && <AdversarioPanel/>}
        {tab === 'campana' && <CampanaPanel/>}
        {tab === 'voto' && <VotoBlandoPanel/>}
        {tab === 'analogias' && <AnalogiasPanel/>}
        {tab === 'mercado' && <MarketPanel/>}
        {tab === 'ontologia' && <OntologyPanel/>}

      </main>
      <footer style={{borderTop:'1px solid var(--hairline)',padding:'20px 28px',textAlign:'center',color:'var(--ink-4)',fontSize:11.5}}>
        Datos ficticios · Análisis de Coaliciones · ElectSim · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
