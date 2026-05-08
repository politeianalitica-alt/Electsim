'use client'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import LiveTicker from '@/components/LiveTicker'
import { useState } from 'react'


const FACTORES = [
  {titulo:'Guerra Ucrania — impacto energético',region:'Europa del Este',nivel:'ALTO',c:'#c42c2c',
   desc:'Presión al alza en precio de energía. España depende 18% gas argelino. Refuerza narrativa VOX sobre soberanía energética.',
   tend:'Estable',afecta:['Macro','Riesgo','Prensa']},
  {titulo:'Tensiones comerciales EE.UU.–UE',region:'Atlántico Norte',nivel:'MEDIO',c:'#b25000',
   desc:'Aranceles 10% a exportaciones españolas (autos, aceite). Exposición estimada: ~12.000M€.',
   tend:'Empeorando',afecta:['Macro','Escenarios']},
  {titulo:'Elecciones Francia — efecto Le Pen',region:'Europa Occidental',nivel:'MEDIO',c:'#b25000',
   desc:'Victoria Le Pen reforzaría narrativa VOX y debilitaría flanco europeo de Sánchez en Bruselas.',
   tend:'Vigilancia',afecta:['Escenarios','Agentes']},
  {titulo:'Crisis migratoria — Canarias',region:'Mediterráneo / Atlántico',nivel:'ALTO',c:'#c42c2c',
   desc:'Llegadas irregulares +34% en 2026. Principal vector de agenda VOX. Tensión en pacto migratorio UE.',
   tend:'Empeorando',afecta:['Prensa','Riesgo']},
  {titulo:'Ciclo BCE — tipos al 2.5%',region:'Zona Euro',nivel:'POSITIVO',c:'#2d8a39',
   desc:'Bajada de tipos facilita financiación pública. Alivia prima de riesgo. Impacto positivo en euríbor hipotecario.',
   tend:'Mejorando',afecta:['Macro','Riesgo']},
  {titulo:'OTAN — gasto defensa 2% PIB',region:'Atlántico Norte',nivel:'BAJO',c:'#6e6e73',
   desc:'España comprometida en hoja de ruta 2030. Gasto actual 1.26% PIB. Presión presupuestaria moderada.',
   tend:'Estable',afecta:['Macro','Congreso']},
]

const ALIADOS = [
  {pais:'Alemania',rel:72,nota:'Socio clave en Consejo Europeo. Sintonía en política climática. Tensión en competencia industrial.'},
  {pais:'Francia',  rel:68,nota:'Relación fluida. Preocupación por eventual giro Le Pen. Acuerdos fronterizos estables.'},
  {pais:'Marruecos',rel:61,nota:'Normalizada tras crisis 2021. Clave en control migratorio y gas. Sensible políticamente.'},
  {pais:'EE.UU.',  rel:58,nota:'Correcta pero tensa por posición en Gaza y aranceles. Acuerdos bases militares vigentes.'},
  {pais:'Argelia', rel:49,nota:'Proveedor estratégico de gas. Relación mejorable. Competencia con Marruecos en agenda española.'},
  {pais:'México',  rel:44,nota:'Ruptura diplomática por declaraciones sobre política interna. Recuperación lenta.'},
]

const RIESGOS = [
  {ev:'Recrudecimiento crisis migratoria',prob:58,imp:'Medio'},
  {ev:'Victoria ultraderecha en Francia',prob:41,imp:'Alto'},
  {ev:'Escalada militar Oriente Medio',prob:31,imp:'Alto'},
  {ev:'Recesión zona euro',prob:22,imp:'Muy alto'},
  {ev:'Crisis deuda italiana (spread >250 pb)',prob:18,imp:'Muy alto'},
  {ev:'Corte suministro gas argelino',prob:12,imp:'Muy alto'},
]

function TabBar({items,active,onChange}:{items:string[],active:number,onChange:(i:number)=>void}) {
  return (
    <div style={{display:'flex',borderBottom:'1px solid #e8e8ed',marginBottom:28}}>
      {items.map((t,i)=>(
        <button key={t} onClick={()=>onChange(i)} style={{border:'none',borderBottom:active===i?'2px solid #1d1d1f':'2px solid transparent',background:'transparent',padding:'12px 20px',marginBottom:-1,fontSize:13,fontWeight:active===i?600:400,color:active===i?'#1d1d1f':'#6e6e73',cursor:'pointer',fontFamily:'inherit'}}>{t}</button>
      ))}
    </div>
  )
}

export default function GeopoliticaPage() {
  const [tab,setTab]=useState(0)
  return (
    <div style={{minHeight:'100vh',background:'#fbfbfd',color:'#1d1d1f',fontFamily:'var(--font-body,system-ui)'}}>
      <AppHeader/>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'20px 24px 40px'}}>

        <LiveTicker/>

        <TabBar items={['Factores externos','Relaciones bilaterales','Riesgos cuantificados']} active={tab} onChange={setTab}/>

        {tab===0 && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            {FACTORES.map(f=>(
              <div key={f.titulo} style={{background:'#fff',border:'1px solid #e8e8ed',borderRadius:22,padding:'24px 28px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <span style={{fontSize:11,color:'#6e6e73',fontWeight:500}}>{f.region}</span>
                  <span style={{padding:'3px 10px',borderRadius:999,background:`${f.c}12`,color:f.c,fontSize:10,fontWeight:700,letterSpacing:'0.06em'}}>{f.nivel}</span>
                </div>
                <h3 style={{margin:'0 0 10px',fontSize:14,fontWeight:600}}>{f.titulo}</h3>
                <p style={{fontSize:12,color:'#424245',margin:'0 0 14px',lineHeight:1.6}}>{f.desc}</p>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {f.afecta.map((a:string)=>(
                      <span key={a} style={{padding:'3px 9px',borderRadius:999,background:'rgba(0,0,0,0.045)',fontSize:11,fontWeight:500,color:'#6e6e73'}}>{a}</span>
                    ))}
                  </div>
                  <span style={{fontSize:11,fontWeight:600,color:f.tend==='Mejorando'?'#2d8a39':f.tend==='Empeorando'?'#c42c2c':'#6e6e73',flexShrink:0,marginLeft:8}}>
                    {f.tend==='Mejorando'?'↑ ':f.tend==='Empeorando'?'↓ ':'→ '}{f.tend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab===1 && (
          <div style={{background:'#fff',border:'1px solid #e8e8ed',borderRadius:22,padding:'24px 28px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
              <h2 style={{margin:0,fontSize:14,fontWeight:600}}>Índice de relación bilateral</h2>
              <span style={{padding:'4px 10px',borderRadius:999,background:'rgba(0,0,0,0.045)',fontSize:11,fontWeight:500,color:'#6e6e73'}}>6 socios</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {ALIADOS.map((a,i)=>(
                <div key={a.pais} style={{display:'flex',gap:20,alignItems:'center',padding:'16px 0',borderTop:i>0?'1px solid #f5f5f7':'none'}}>
                  <div style={{width:100,flexShrink:0}}>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:6}}>{a.pais}</div>
                    <div style={{fontSize:22,fontWeight:700,fontFamily:'var(--font-display,system-ui)',letterSpacing:'-0.02em',color:a.rel>=65?'#2d8a39':a.rel>=50?'#b25000':'#c42c2c'}}>{a.rel}</div>
                  </div>
                  <div style={{width:140,flexShrink:0}}>
                    <div style={{height:6,background:'#f5f5f7',borderRadius:3}}>
                      <div style={{width:`${a.rel}%`,height:6,borderRadius:3,background:a.rel>=65?'#2d8a39':a.rel>=50?'#b25000':'#c42c2c'}}/>
                    </div>
                  </div>
                  <p style={{fontSize:12,color:'#424245',margin:0,lineHeight:1.6}}>{a.nota}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab===2 && (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{background:'#fff',border:'1px solid #e8e8ed',borderRadius:22,padding:'20px 28px',marginBottom:4}}>
              <p style={{fontSize:13,color:'#424245',margin:0,lineHeight:1.6}}>Probabilidades estimadas por el modelo ElectSim de riesgo geopolítico con incidencia directa en el sistema político español. Horizonte 12 meses.</p>
            </div>
            {RIESGOS.map(r=>(
              <div key={r.ev} style={{background:'#fff',border:'1px solid #e8e8ed',borderRadius:18,padding:'18px 24px',display:'flex',alignItems:'center',gap:20}}>
                <div style={{flex:1,fontWeight:600,fontSize:14}}>{r.ev}</div>
                <div style={{width:180,flexShrink:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                    <span style={{fontSize:11,color:'#6e6e73'}}>Probabilidad</span>
                    <span style={{fontSize:13,fontWeight:700,color:r.prob>=50?'#c42c2c':r.prob>=30?'#b25000':'#2d8a39'}}>{r.prob}%</span>
                  </div>
                  <div style={{height:5,background:'#f5f5f7',borderRadius:3}}>
                    <div style={{width:`${r.prob}%`,height:5,borderRadius:3,background:r.prob>=50?'#c42c2c':r.prob>=30?'#b25000':'#2d8a39'}}/>
                  </div>
                </div>
                <span style={{fontSize:11,fontWeight:600,color:'#6e6e73',width:64,textAlign:'right',flexShrink:0}}>{r.imp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
