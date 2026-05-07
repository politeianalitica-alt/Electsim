'use client'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { useState } from 'react'
import { HParty } from '@/components/HemicycleAdvanced'
import VotacionSimulator from '@/components/VotacionSimulator'

// Composición real del Congreso tras las generales del 23-jul-2023
const HEMI_2023: HParty[] = [
  { id:'pp',    name:'PP',       color:'#1F4E8C', seats:137 },
  { id:'psoe',  name:'PSOE',     color:'#E1322D', seats:121 },
  { id:'vox',   name:'VOX',      color:'#5BA02E', seats: 33 },
  { id:'sumar', name:'Sumar',    color:'#D43F8D', seats: 31 },
  { id:'erc',   name:'ERC',      color:'#E8A030', seats:  7 },
  { id:'junts', name:'Junts',    color:'#1FA89B', seats:  7 },
  { id:'bildu', name:'EH Bildu', color:'#3F7A3A', seats:  6 },
  { id:'pnv',   name:'PNV',      color:'#7DB94B', seats:  5 },
  { id:'cc',    name:'CC',       color:'#F2C43A', seats:  1 },
  { id:'bng',   name:'BNG',      color:'#5BB3D9', seats:  1 },
  { id:'upn',   name:'UPN',      color:'#0E7D8C', seats:  1 },
]


const PARTIES = [
  {name:'PP',   seats:137,color:'#003A8C',group:'PPE'},
  {name:'PSOE', seats:121,color:'#E4000F',group:'S&D'},
  {name:'VOX',  seats:33, color:'#63BE21',group:'ECR'},
  {name:'Sumar',seats:31, color:'#9B1D20',group:'GUE'},
  {name:'Junts',seats:7,  color:'#00C3B2',group:'NI'},
  {name:'ERC',  seats:7,  color:'#F4B301',group:'G/EFA'},
  {name:'Bildu',seats:6,  color:'#A3C940',group:'G/EFA'},
  {name:'PNV',  seats:5,  color:'#007A33',group:'RE'},
  {name:'CC',   seats:1,  color:'#FF8C00',group:'RE'},
  {name:'Otros',seats:2,  color:'#aaa',   group:'—'},
]

const VOTES = [
  {title:'Presupuestos Generales 2025',date:'2025-11-18',result:'Rechazado',si:171,no:178,abs:1,ok:false},
  {title:'Moción de confianza — Sánchez',date:'2025-09-03',result:'Aprobado',si:178,no:171,abs:1,ok:true},
  {title:'Reforma Ley Amnistía art. 4',date:'2025-07-22',result:'Aprobado',si:180,no:169,abs:1,ok:true},
  {title:'Proposición no de ley VOX energía nuclear',date:'2025-05-14',result:'Rechazado',si:33,no:312,abs:5,ok:false},
  {title:'Techo de deuda 2025',date:'2025-03-10',result:'Aprobado',si:176,no:170,abs:4,ok:true},
]

const AGENDA = [
  {date:'06 May',tema:'Debate RIVA — Infraestructuras Verdes',comision:'Pleno'},
  {date:'13 May',tema:'Comparecencia Ministro Economía — PIB Q1',comision:'Economía'},
  {date:'20 May',tema:'Reforma Financiación Autonómica',comision:'Pleno'},
  {date:'03 Jun',tema:'Votación Ley IA y Regulación Algoritmos',comision:'Digital'},
]

function TabBar({items,active,onChange}:{items:string[],active:number,onChange:(i:number)=>void}) {
  return (
    <div style={{display:'flex',borderBottom:'1px solid #e8e8ed',marginBottom:28}}>
      {items.map((t,i)=>(
        <button key={t} onClick={()=>onChange(i)} style={{
          border:'none',borderBottom:active===i?'2px solid #1d1d1f':'2px solid transparent',
          background:'transparent',padding:'12px 20px',marginBottom:-1,
          fontSize:13,fontWeight:active===i?600:400,color:active===i?'#1d1d1f':'#6e6e73',
          cursor:'pointer',fontFamily:'inherit',transition:'color 150ms',
        }}>{t}</button>
      ))}
    </div>
  )
}

function Hemicicle() {
  const total=350, cx=200,cy=160,r=130,inner=65
  let angle=Math.PI
  return (
    <svg viewBox="0 0 400 175" style={{width:'100%',maxHeight:175}}>
      {PARTIES.map(p=>{
        const span=(p.seats/total)*Math.PI
        const a1=angle,a2=angle+span; angle=a2
        const x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1)
        const x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2)
        const ix1=cx+inner*Math.cos(a1),iy1=cy+inner*Math.sin(a1)
        const ix2=cx+inner*Math.cos(a2),iy2=cy+inner*Math.sin(a2)
        const lg=span>Math.PI?1:0
        return <path key={p.name} fill={p.color} stroke="#fbfbfd" strokeWidth="1.5"
          d={`M${ix1},${iy1}L${x1},${y1}A${r},${r} 0 ${lg},1 ${x2},${y2}L${ix2},${iy2}A${inner},${inner} 0 ${lg},0 ${ix1},${iy1}Z`}/>
      })}
      <text x={cx} y={cy-8} textAnchor="middle" fontSize="22" fontWeight="700" fill="#1d1d1f">350</text>
      <text x={cx} y={cy+10} textAnchor="middle" fontSize="10" fill="#6e6e73">escaños</text>
      <text x={cx} y={cy+24} textAnchor="middle" fontSize="9" fill="#6e6e73">mayoría: 176</text>
    </svg>
  )
}

export default function CongresoPage() {
  const [tab,setTab]=useState(0)
  return (
    <div style={{minHeight:'100vh',background:'#fbfbfd',color:'#1d1d1f',fontFamily:'var(--font-body,system-ui)'}}>
      <AppHeader/>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'20px 24px 40px'}}>

        <TabBar items={['Composición','Votaciones','Agenda']} active={tab} onChange={setTab}/>

        {tab===0 && (
          <div style={{display:'grid',gridTemplateColumns:'1fr',gap:20}}>
            <div style={{background:'#fff',border:'1px solid #e8e8ed',borderRadius:22,padding:'24px 28px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14,gap:10,flexWrap:'wrap'}}>
                <div>
                  <h2 style={{margin:0,fontSize:15,fontWeight:600}}>Simulador de votación</h2>
                  <p style={{margin:'3px 0 0',fontSize:11.5,color:'#6e6e73'}}>Marca el voto de cada grupo (SÍ · Abstención · NO) y comprueba si la ley se aprobaría</p>
                </div>
                <span style={{padding:'4px 10px',borderRadius:999,background:'rgba(31,78,140,0.08)',fontSize:11,fontWeight:600,color:'#1F4E8C'}}>176 = mayoría absoluta</span>
              </div>
              <VotacionSimulator parties={HEMI_2023}/>
            </div>
            <div style={{background:'#fff',border:'1px solid #e8e8ed',borderRadius:22,padding:'24px 28px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
                <h2 style={{margin:0,fontSize:14,fontWeight:600}}>Grupos parlamentarios</h2>
                <span style={{padding:'4px 10px',borderRadius:999,background:'rgba(0,0,0,0.045)',fontSize:11,fontWeight:500,color:'#6e6e73'}}>10 grupos</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {PARTIES.map(p=>(
                  <div key={p.name} style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:p.color,flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:600,width:50,color:'#1d1d1f'}}>{p.name}</span>
                    <div style={{flex:1,background:'#f5f5f7',borderRadius:3,height:6}}>
                      <div style={{width:`${(p.seats/137)*100}%`,height:6,borderRadius:3,background:p.color}}/>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,width:28,textAlign:'right'}}>{p.seats}</span>
                    <span style={{fontSize:11,color:'#6e6e73',width:52}}>{p.group}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{gridColumn:'1/-1',background:'#fff',border:'1px solid #e8e8ed',borderRadius:22,padding:'24px 28px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
                <h2 style={{margin:0,fontSize:14,fontWeight:600}}>Balance de bloques</h2>
                <span style={{padding:'4px 10px',borderRadius:999,background:'rgba(0,0,0,0.045)',fontSize:11,fontWeight:500,color:'#6e6e73'}}>mayoría 176</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                {[{l:'Bloque derecha',s:171,c:'#003A8C',d:'PP + VOX'},{l:'Grupos nacionales',s:27,c:'#6e6e73',d:'Junts · ERC · Bildu · PNV · CC'},{l:'Bloque izquierda',s:152,c:'#E4000F',d:'PSOE + Sumar'}].map(b=>(
                  <div key={b.l} style={{textAlign:'center',padding:'20px 16px',background:'#fbfbfd',borderRadius:14,border:'1px solid #e8e8ed'}}>
                    <div style={{fontSize:40,fontWeight:700,fontFamily:'var(--font-display,system-ui)',letterSpacing:'-0.03em',color:b.c}}>{b.s}</div>
                    <div style={{fontSize:13,fontWeight:600,marginTop:4}}>{b.l}</div>
                    <div style={{fontSize:11,color:'#6e6e73',marginTop:4}}>{b.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {tab===1 && (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {VOTES.map(v=>(
              <div key={v.title} style={{background:'#fff',border:'1px solid #e8e8ed',borderRadius:18,padding:'18px 24px',display:'flex',alignItems:'center',gap:20}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14}}>{v.title}</div>
                  <div style={{fontSize:12,color:'#6e6e73',marginTop:4}}>{v.date}</div>
                </div>
                <div style={{display:'flex',gap:20,fontSize:13}}>
                  <span style={{color:'#2d8a39',fontWeight:700}}>Sí {v.si}</span>
                  <span style={{color:'#c42c2c',fontWeight:700}}>No {v.no}</span>
                  <span style={{color:'#6e6e73'}}>Abs {v.abs}</span>
                </div>
                <span style={{padding:'5px 12px',borderRadius:999,background:v.ok?'rgba(45,138,57,0.1)':'rgba(196,44,44,0.1)',color:v.ok?'#2d8a39':'#c42c2c',fontWeight:600,fontSize:12,flexShrink:0}}>{v.result}</span>
              </div>
            ))}
          </div>
        )}
        {tab===2 && (
          <div style={{background:'#fff',border:'1px solid #e8e8ed',borderRadius:22,padding:'24px 28px'}}>
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {AGENDA.map((a,i)=>(
                <div key={a.tema} style={{display:'flex',gap:20,paddingBottom:i<AGENDA.length-1?20:0,paddingTop:i>0?20:0,borderTop:i>0?'1px solid #e8e8ed':'none'}}>
                  <div style={{background:'#1d1d1f',color:'#fff',borderRadius:10,padding:'8px 14px',textAlign:'center',flexShrink:0,minWidth:56}}>
                    <div style={{fontSize:12,fontWeight:600}}>{a.date}</div>
                  </div>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>{a.tema}</div>
                    <div style={{fontSize:12,color:'#6e6e73',marginTop:4}}>{a.comision}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
