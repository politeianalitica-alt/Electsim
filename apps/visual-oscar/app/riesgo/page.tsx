'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { useRouter } from 'next/navigation'
import { clearTokens, isAuthenticated } from '@/lib/auth'

const D = {
  meta: { updated:"Hace 2 min", value:25.8, delta:-2.2, level:"Bajo - Tendencia" },
  topKpis:[
    {id:"tasa", label:"Tasa de Riesgo",    value:"25.8",   sub:"Bajo · Tendencia",           accent:"#F59E0B"},
    {id:"score",label:"Scoring KRI",       value:"43/100", sub:"Posicionado: gobierno",       accent:"#22C55E"},
    {id:"tens", label:"Tensión Pol.",       value:"19/100", sub:"Etiqueta parlamentaria",     accent:"#A78BFA"},
    {id:"alert",label:"Alertas mediáticas",value:"1/100",  sub:"Activad: agitativa crítica", accent:"#F472B6"},
  ],
  intelKpis:[
    {label:"Investigación",value:0},{label:"Acta cumplimiento",value:0},
    {label:"Empresas KRI",value:0},{label:"Seguimiento",value:0},
  ],
  components:[
    {id:"estab",name:"Estabilidad Gubernamental",value:43,color:"#F59E0B",desc:"Posición política favorable"},
    {id:"tens", name:"Tensión Parlamentaria",    value:19,color:"#22C55E",desc:"Funcionamiento parlamentario estable"},
    {id:"med",  name:"Presión Mediática",        value:43,color:"#F59E0B",desc:"Cobertura mediática neutra"},
    {id:"soc",  name:"Activación Social",        value:43,color:"#F472B6",desc:"Movilización ciudadana baja"},
  ],
  parlAlert:{title:"Actividad legislativa de agencia detectada",desc:"Reciente actividad de comisiones de investigación"},
  ccaa:[
    {name:"Valencia",value:41,color:"#F59E0B"},{name:"Cantabria",value:38,color:"#F59E0B"},
    {name:"Navarra",value:35,color:"#F59E0B"},{name:"Castilla-Mancha",value:32,color:"#F59E0B"},
    {name:"Aragón",value:30,color:"#F59E0B"},{name:"La Rioja",value:28,color:"#F59E0B"},
    {name:"Galicia",value:26,color:"#F59E0B"},{name:"Asturias",value:24,color:"#F59E0B"},
    {name:"País Vasco",value:22,color:"#F59E0B"},{name:"Cataluña",value:20,color:"#22C55E"},
    {name:"Murcia",value:18,color:"#22C55E"},{name:"Baleares",value:16,color:"#22C55E"},
    {name:"Andalucía",value:14,color:"#22C55E"},{name:"Canarias",value:12,color:"#22C55E"},
    {name:"Extremadura",value:10,color:"#22C55E"},{name:"Madrid",value:8,color:"#22C55E"},
    {name:"Castilla y León",value:6,color:"#22C55E"},
  ],
  radar:{
    axes:["Tensión Parl.","Estabilidad Gob.","Amenaza Externa","Riesgo Económ.","Activ. Social","Presión Mediá."],
    levels:[
      {label:"Nivel 3 · Vigilancia",color:"#22C55E",values:[22,30,18,25,26,28]},
      {label:"Nivel 2 · Alerta",    color:"#F59E0B",values:[40,50,35,42,45,48]},
      {label:"Nivel 1 · Crítico",   color:"#EF4444",values:[60,72,55,65,70,68]},
    ],
  },
  semantic:[8,12,9,15,18,14,22,19,24,28,25,31,28,33,36,32,38,41,38,44,46,43,48,51],
  protocols:[
    {lvl:"NIVEL 1 — CRÍTICO",   color:"#EF4444",trigger:"Riesgo ≥ 60 · Actual 26",active:false,
     items:["Activar comité de crisis","Respuesta ejecutiva en ≤ 2 horas","Monitorización cada 15 min","Briefing urgente a portavoces"]},
    {lvl:"NIVEL 2 — ALERTA",    color:"#F59E0B",trigger:"Riesgo 40-60 · Actual 26",active:false,
     items:["Reforzar líneas narrativas","Revisión de agenda parlamentaria","Rastreo de noticias cada 30 min","Declaraciones preventivas"]},
    {lvl:"NIVEL 3 — VIGILANCIA",color:"#22C55E",trigger:"Riesgo < 40 · Actual 26",active:true,
     items:["Monitorización estándar (2x/día)","Revisión semanal de indicadores","Sin acciones extraordinarias"]},
  ],
  scenarios:["Crisis de gobierno","Moción de censura","Escándalo mediático","Movilización ciudadana masiva","Crisis económica"],
  protocolGen:["Activar sala de crisis en ≤ 1 h.","Emitir declaración institucional breve.","Monitorizar cobertura mediática.","Preparar respuesta parlamentaria.","Evaluar escalada cada 4 h."],
  trend:{
    history: [19,36,33,17,29,31,24,19,27,33,19,29,31,17,24,32,28,22,30,27,19,32,35,23,17,31,34,20,27,33],
    forecast:[23,21,22,20,21,23,26,28,27,30,28,29,28,28],
    forecastLow: [16,14,14,12,12,14,16,17,16,18,16,17,16,16],
    forecastHigh:[30,28,30,28,30,32,36,39,38,42,40,41,40,40],
    kpis:[
      {label:"Cambio 7 días",    value:"23.4",delta:-4.6,dir:"down"},
      {label:"Máximo 30D",       value:"37.3",delta:undefined,dir:undefined},
      {label:"Mínimo 30D",       value:"14.1",delta:undefined,dir:undefined},
      {label:"Previsión día +14",value:"27.6",delta:1.8,dir:"up"},
    ],
  },
  brain:{
    modules:[
      {id:"risk",title:"Evaluación de Riesgo IA",  placeholder:"Inicia Ollama para activar el análisis IA"},
      {id:"stab",title:"Estabilidad del gobierno", placeholder:"Inicia Ollama para activar el análisis IA"},
    ],
    suggestions:["¿Qué podría elevar el riesgo?","Probabilidad de moción de censura en 30 días","¿Cuáles son los vectores de riesgo dominantes?"],
    inputPlaceholder:"¿Cuándo podría subir el riesgo político?",
  },
}

const NAV=[
  {label:'Resumen',href:'/dashboard'},{label:'Mapa',href:'#'},
  {label:'Nowcasting',href:'#'},{label:'Escenarios',href:'/escenarios'},
  {label:'Coaliciones',href:'/coaliciones'},{label:'Riesgo',href:'/riesgo'},
  {label:'Macro',href:'/macro'},{label:'Prensa',href:'/prensa'},
  {label:'Congreso',href:'/congreso'},{label:'Briefing',href:'/briefing'},
  {label:'Microdatos',href:'/microdatos'},{label:'Índices',href:'/indices'},
  {label:'Agentes',href:'/agentes'},{label:'Geopolítica',href:'/geopolitica'},
]
const TABS=[
  {id:"term",label:"Termómetro"},{id:"intel",label:"Inteligencia de crisis"},
  {id:"trend",label:"Tendencia"},{id:"cerebral",label:"Riesgo cerebral"},
]

function Gauge({value,delta}:{value:number;delta:number}){
  const W=360,H=220,cx=180,cy=187,r=130
  const segs=[{from:180,to:216,color:"#22C55E"},{from:216,to:252,color:"#84CC16"},{from:252,to:288,color:"#F59E0B"},{from:288,to:324,color:"#EF4444"},{from:324,to:360,color:"#7C2D12"}]
  const arc=(a1:number,a2:number,rad:number)=>{
    const x1=cx+Math.cos(a1*Math.PI/180)*rad,y1=cy+Math.sin(a1*Math.PI/180)*rad
    const x2=cx+Math.cos(a2*Math.PI/180)*rad,y2=cy+Math.sin(a2*Math.PI/180)*rad
    return `M ${x1} ${y1} A ${rad} ${rad} 0 0 1 ${x2} ${y2}`
  }
  const na=180+(value/100)*180
  const nx=cx+Math.cos(na*Math.PI/180)*(r-18),ny=cy+Math.sin(na*Math.PI/180)*(r-18)
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
      {segs.map((s,i)=><path key={i} d={arc(s.from,s.to,r)} stroke={s.color} strokeWidth="22" fill="none" strokeLinecap="butt" opacity="0.92"/>)}
      <text x={cx} y={cy-56} textAnchor="middle" fontFamily="var(--font-display)" fontSize="48" fontWeight="600" letterSpacing="-0.03em" fill="#1d1d1f">{value.toString().replace(".",",")}</text>
      <text x={cx} y={cy-36} textAnchor="middle" fontSize="12" fill="#16A34A" fontWeight="600">▼ {Math.abs(delta).toFixed(1).replace(".",",")}</text>
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="6" fill="#1d1d1f"/>
      <text x={cx} y={H*0.16} textAnchor="middle" fontSize="10.5" fill="#86868b" letterSpacing="0.1em" fontWeight="600">RIESGO POLÍTICO</text>
    </svg>
  )
}

function RadarChart({data}:{data:typeof D.radar}){
  const W=860,H=420,R=160,cx=W/2,cy=H/2,N=data.axes.length
  const angle=(i:number)=>-Math.PI/2+(i*2*Math.PI/N)
  const pt=(i:number,v:number):[number,number]=>{const r=(v/100)*R;return[cx+Math.cos(angle(i))*r,cy+Math.sin(angle(i))*r]}
  const poly=(vals:number[])=>vals.map((v,i)=>pt(i,v).join(",")).join(" ")
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
      {[20,40,60,80,100].map(r=><polygon key={r} points={Array.from({length:N},(_,i)=>pt(i,r).join(",")).join(" ")} fill="none" stroke="var(--hairline)" strokeWidth="1"/>)}
      {Array.from({length:N},(_,i)=>{const[x,y]=pt(i,100);return<line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--hairline)" strokeWidth="1"/>})}
      {[...data.levels].reverse().map(l=><polygon key={l.label} points={poly(l.values)} fill={l.color} fillOpacity="0.18" stroke={l.color} strokeWidth="1.5"/>)}
      {data.levels[2].values.map((v,i)=>{const[x,y]=pt(i,v);return<circle key={i} cx={x} cy={y} r="4" fill="#EF4444"/>})}
      {data.axes.map((a,i)=>{const[x,y]=pt(i,130);return<text key={a} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="var(--ink-3)" fontWeight="500">{a}</text>})}
    </svg>
  )
}

function SemCurve({points}:{points:number[]}){
  const W=700,H=160,padL=28,padR=8,padT=10,padB=20
  const max=Math.max(...points)*1.1,stepX=(W-padL-padR)/(points.length-1)
  const xy=(i:number):[number,number]=>[padL+i*stepX,padT+(1-points[i]/max)*(H-padT-padB)]
  const path=points.map((_,i)=>{const[x,y]=xy(i);return(i===0?"M":"L")+x+" "+y}).join(" ")
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C3AED" stopOpacity="0.22"/><stop offset="100%" stopColor="#7C3AED" stopOpacity="0"/></linearGradient></defs>
      <path d={path+` L ${padL+(points.length-1)*stepX} ${H-padB} L ${padL} ${H-padB} Z`} fill="url(#sg)"/>
      <path d={path} fill="none" stroke="#7C3AED" strokeWidth="2"/>
      {points.map((_,i)=>{const[x,y]=xy(i);return<circle key={i} cx={x} cy={y} r="2.5" fill="#7C3AED"/>})}
    </svg>
  )
}

function TrendChart({trend}:{trend:typeof D.trend}){
  const W=900,H=280,padL=40,padR=16,padT=14,padB=30,max=100,last=trend.history.length-1
  const total=trend.history.length+trend.forecast.length
  const stepX=(W-padL-padR)/(total-1)
  const x=(i:number)=>padL+i*stepX,y=(v:number)=>padT+(1-v/max)*(H-padT-padB)
  const histPath=trend.history.map((v,i)=>(i===0?"M":"L")+x(i)+" "+y(v)).join(" ")
  const fcPath=[`M ${x(last)} ${y(trend.history[last])}`,...trend.forecast.map((v,i)=>`L ${x(last+1+i)} ${y(v)}`)].join(" ")
  const bandTop=trend.forecastHigh.map((v,i)=>`${x(last+1+i)},${y(v)}`).join(" ")
  const bandBot=[...trend.forecastLow].reverse().map((v,i)=>`${x(last+trend.forecastLow.length-i)},${y(v)}`).join(" ")
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
      <defs><linearGradient id="hf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.18"/><stop offset="100%" stopColor="#0EA5E9" stopOpacity="0"/></linearGradient></defs>
      {[0,20,40,60,80,100].map(t=><g key={t}><line x1={padL} y1={y(t)} x2={W-padR} y2={y(t)} stroke="var(--hairline)" strokeDasharray={t===0?"":"2 4"}/><text x={padL-8} y={y(t)+3} textAnchor="end" fontSize="10" fill="var(--ink-4)">{t}</text></g>)}
      <line x1={x(last)} y1={padT} x2={x(last)} y2={H-padB} stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="3 4"/>
      <text x={x(last)} y={padT-3} textAnchor="middle" fontSize="10" fill="var(--ink-3)" fontWeight="500">Hoy</text>
      <polygon points={bandTop+" "+bandBot} fill="#F59E0B" fillOpacity="0.16"/>
      <path d={histPath+` L ${x(last)} ${H-padB} L ${x(0)} ${H-padB} Z`} fill="url(#hf)"/>
      <path d={histPath} fill="none" stroke="#0EA5E9" strokeWidth="2"/>
      {trend.history.map((v,i)=><circle key={i} cx={x(i)} cy={y(v)} r="2.2" fill="#0EA5E9"/>)}
      <path d={fcPath} fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="5 4"/>
      {trend.forecast.map((v,i)=><circle key={i} cx={x(last+1+i)} cy={y(v)} r="2.4" fill="#F59E0B"/>)}
    </svg>
  )
}

function TabTermometro(){
  return(<>
    <div style={{display:'grid',gridTemplateColumns:'4fr 8fr',gap:16,marginBottom:14}}>
      <div style={{background:'#fff',borderRadius:16,padding:'22px 18px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',display:'flex',flexDirection:'column',alignItems:'center'}}>
        <p style={{fontSize:10.5,color:'var(--ink-4)',letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:600,margin:'0 0 8px',width:'100%',textAlign:'center'}}>Principio de calibración</p>
        <Gauge value={D.meta.value} delta={D.meta.delta}/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4,width:'100%',marginTop:14,fontSize:9.5,textAlign:'center'}}>
          {[{r:"0–20",c:"#22C55E",l:"Verde"},{r:"20–40",c:"#84CC16",l:"Amarillo"},{r:"40–60",c:"#F59E0B",l:"Naranja"},{r:"60–80",c:"#EF4444",l:"Rojo"},{r:"80–100",c:"#7C2D12",l:"Negro"}].map(s=>(
            <div key={s.l}><div style={{color:'var(--ink-4)'}}>{s.r}</div><div style={{color:s.c,fontWeight:600,marginTop:2}}>{s.l}</div></div>
          ))}
        </div>
      </div>
      <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Sub-componentes del riesgo</h2>
          <span style={{fontSize:10.5,color:'var(--ink-3)',background:'var(--bg-soft)',borderRadius:999,padding:'3px 10px',border:'1px solid var(--hairline)'}}>4 índices</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,columnGap:28}}>
          {D.components.map(c=>(
            <div key={c.id}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,gap:10}}>
                <div><div style={{fontSize:13,fontWeight:600}}>{c.name}</div><div style={{fontSize:11,color:'var(--ink-4)',marginTop:2}}>{c.desc}</div></div>
                <div style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:24,color:c.color,lineHeight:1}}>{c.value}</div>
              </div>
              <div style={{height:5,background:'var(--bg-soft)',borderRadius:999,overflow:'hidden'}}>
                <div style={{width:`${c.value}%`,height:'100%',background:c.color,borderRadius:999}}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{padding:'12px 14px',background:'var(--bg-soft)',borderRadius:12,marginTop:16,display:'flex',gap:10,alignItems:'center'}}>
          <div style={{width:26,height:26,borderRadius:8,background:'#22C55E',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,flexShrink:0}}>1</div>
          <div><div style={{fontSize:12,fontWeight:600}}>{D.parlAlert.title}</div><div style={{fontSize:11,color:'var(--ink-4)',marginTop:2}}>{D.parlAlert.desc}</div></div>
        </div>
      </div>
    </div>
    <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Intensidad de riesgo por CC.AA.</h2>
        <span style={{fontSize:10.5,color:'var(--ink-3)',background:'var(--bg-soft)',borderRadius:999,padding:'3px 10px',border:'1px solid var(--hairline)'}}>17 CC.AA.</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {D.ccaa.map(r=>(
          <div key={r.name} style={{display:'grid',gridTemplateColumns:'110px 1fr 36px',gap:12,alignItems:'center'}}>
            <span style={{fontSize:12,color:'var(--ink-2)',fontWeight:500}}>{r.name}</span>
            <div style={{height:14,background:'var(--bg-soft)',borderRadius:6,overflow:'hidden'}}>
              <div style={{width:`${(r.value/45)*100}%`,height:'100%',background:r.color,borderRadius:6}}/>
            </div>
            <span style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:12.5,color:r.color,textAlign:'right'}}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  </>)
}

function TabIntel(){
  const [scenario,setScenario]=useState(D.scenarios[0])
  const [generated,setGenerated]=useState(true)
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Radar de amenazas · 3 niveles</h2>
          <div style={{display:'flex',gap:10,fontSize:11}}>
            {D.radar.levels.map(l=><span key={l.label} style={{display:'inline-flex',alignItems:'center',gap:5,color:'var(--ink-3)'}}><span style={{width:10,height:10,borderRadius:2,background:l.color}}/>{l.label}</span>)}
          </div>
        </div>
        <RadarChart data={D.radar}/>
      </div>
      <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 14px'}}>Protocolo de respuesta</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {D.protocols.map(p=>(
            <div key={p.lvl} style={{borderRadius:14,padding:'14px 16px',background:p.color==='#22C55E'?'rgba(34,197,94,0.07)':p.color==='#F59E0B'?'rgba(245,158,11,0.07)':'rgba(239,68,68,0.07)',border:`1px solid ${p.color}38`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontSize:11,fontWeight:700,color:p.color}}>{p.lvl}</span>
                {p.active&&<span style={{fontSize:9.5,fontWeight:700,padding:'2px 7px',borderRadius:999,background:p.color,color:'#fff'}}>ACTIVO</span>}
              </div>
              <div style={{fontSize:11,color:'var(--ink-4)',marginBottom:10}}>Disparador: {p.trigger}</div>
              <ul style={{margin:0,paddingLeft:22,fontSize:12,color:'var(--ink-2)',lineHeight:1.55}}>
                {p.items.map((it,i)=><li key={i} style={{marginBottom:2}}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 14px'}}>Curva de propagación semántica</h2>
        <SemCurve points={D.semantic}/>
      </div>
      <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 14px'}}>Generador IA de protocolo</h2>
        <div style={{display:'grid',gridTemplateColumns:'320px 1fr',gap:24,alignItems:'start'}}>
          <div>
            <label style={{display:'block',fontSize:11,color:'var(--ink-3)',marginBottom:6,fontWeight:500}}>Escenario de crisis</label>
            <div style={{position:'relative',marginBottom:14}}>
              <select value={scenario} onChange={e=>setScenario(e.target.value)} style={{width:'100%',appearance:'none',background:'#fff',border:'1px solid var(--hairline)',borderRadius:10,padding:'10px 14px',fontFamily:'inherit',fontSize:13,color:'var(--ink)',cursor:'pointer'}}>
                {D.scenarios.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'var(--ink-4)',pointerEvents:'none'}}>▾</span>
            </div>
            <button onClick={()=>setGenerated(true)} style={{background:'var(--ink)',color:'#fff',border:'none',padding:'10px 20px',borderRadius:10,fontFamily:'inherit',fontSize:13,fontWeight:500,cursor:'pointer'}}>Generar protocolo</button>
          </div>
          {generated&&(
            <div style={{padding:'18px 20px',background:'var(--bg-soft)',borderRadius:14,border:'1px solid var(--hairline)'}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Protocolo automático — {scenario}</div>
              <ol style={{margin:0,paddingLeft:20,fontSize:12.5,color:'var(--ink-2)',lineHeight:1.7}}>
                {D.protocolGen.map((s,i)=><li key={i} style={{marginBottom:3}}>{s}</li>)}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TabTendencia(){
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 14px'}}>Serie histórica · 30 días + previsión 14 días</h2>
        <TrendChart trend={D.trend}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {D.trend.kpis.map(k=>(
          <div key={k.label} style={{background:'#fff',borderRadius:16,padding:'18px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
            <p style={{fontSize:10.5,color:'var(--ink-4)',letterSpacing:'0.06em',textTransform:'uppercase',margin:'0 0 8px',fontWeight:500}}>{k.label}</p>
            <div style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:32,letterSpacing:'-0.028em',lineHeight:1}}>{k.value}</div>
            {k.delta!=null&&<div style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:10,fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:999,background:k.dir==='up'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',color:k.dir==='up'?'#16A34A':'#DC2626'}}>{k.dir==='up'?'↑':'↓'} {k.delta}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function TabBrain(){
  const [input,setInput]=useState('')
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div><p style={{fontSize:10.5,color:'var(--ink-4)',letterSpacing:'0.08em',textTransform:'uppercase',fontWeight:600,margin:'0 0 6px'}}>Politeia — Evaluación de riesgo con IA</p>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:600,letterSpacing:'-0.024em',margin:0}}>Análisis cognitivo <em style={{fontWeight:300}}>asistido</em></h2>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        {D.brain.modules.map(m=>(
          <div key={m.id} style={{background:'#fff',borderRadius:16,padding:'18px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h3 style={{margin:0,fontSize:14,fontWeight:600,color:'#0EA5E9'}}>{m.title}</h3>
              <button style={{display:'inline-flex',alignItems:'center',gap:5,background:'#fff',border:'1px solid var(--hairline)',borderRadius:10,padding:'6px 12px',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:500}}>
                Analizar
              </button>
            </div>
            <div style={{padding:'12px 14px',border:'1px dashed var(--hairline)',borderRadius:12,fontSize:12,color:'var(--ink-4)',display:'flex',alignItems:'center',gap:8,background:'var(--bg-soft)'}}>● {m.placeholder}</div>
          </div>
        ))}
      </div>
      <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <p style={{fontSize:10.5,color:'var(--ink-3)',letterSpacing:'0.06em',textTransform:'uppercase',margin:'0 0 12px',fontWeight:500}}>Preguntas sugeridas</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
          {D.brain.suggestions.map((s,i)=><button key={i} onClick={()=>setInput(s)} style={{background:'#fff',border:'1px solid var(--hairline)',borderRadius:10,padding:'10px 12px',cursor:'pointer',fontFamily:'inherit',fontSize:12,color:'var(--ink-2)',textAlign:'left'}}>{s}</button>)}
        </div>
        <div style={{display:'flex',gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} placeholder={D.brain.inputPlaceholder} style={{flex:1,background:'#fff',border:'1px solid var(--hairline)',borderRadius:12,padding:'11px 14px',fontFamily:'inherit',fontSize:13,outline:'none'}}/>
          <button style={{background:'var(--ink)',color:'#fff',border:'none',borderRadius:12,padding:'0 18px',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>Enviar</button>
        </div>
      </div>
    </div>
  )
}

export default function RiesgoPage(){
  const router=useRouter()
  const [tab,setTab]=useState('term')
  const currentPath='/riesgo'
  useEffect(()=>{if(!isAuthenticated())router.push('/login')},[router])
  function logout(){clearTokens();router.push('/login')}
  return(
    <div style={{background:'var(--bg)',minHeight:'100vh',fontFamily:'var(--font-body)'}}>
      <AppHeader/>
      <main style={{maxWidth:1600,margin:'0 auto',padding:'0 28px 80px'}}>
        <section style={{background:'linear-gradient(135deg,#92400e 0%,#451a03 100%)',borderRadius:'0 0 24px 24px',padding:'36px 48px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22,color:'#fff'}}>
          <div>
            <p style={{fontSize:10.5,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',opacity:0.65,margin:'0 0 8px'}}>Termómetro de Riesgo · Tiempo real</p>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:700,letterSpacing:'-0.024em',margin:'0 0 6px',lineHeight:1.1}}>Riesgo político <em style={{fontWeight:300}}>en mínimos.</em></h1>
            <p style={{fontSize:13,opacity:0.65,margin:0}}>Índice agregado · 4 componentes · 17 territorios</p>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:64,fontWeight:700,letterSpacing:'-0.05em',lineHeight:1,color:'#FCD34D'}}>25,8</div>
            <div style={{fontSize:13,color:'#86efac',marginTop:6,fontWeight:600}}>▼ {Math.abs(D.meta.delta).toFixed(1).replace(".",",")} · {D.meta.level}</div>
          </div>
        </section>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:16}}>
          {D.topKpis.map(k=>(
            <div key={k.id} style={{background:'#fff',borderRadius:16,padding:'16px 18px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderLeft:`3px solid ${k.accent}`}}>
              <p style={{fontSize:10.5,color:'var(--ink-4)',fontWeight:500,letterSpacing:'0.04em',textTransform:'uppercase',margin:'0 0 6px'}}>{k.label}</p>
              <div style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:600,color:k.accent,lineHeight:1}}>{k.value}</div>
              <p style={{fontSize:11,color:'var(--ink-3)',margin:'4px 0 0'}}>{k.sub}</p>
            </div>
          ))}
        </div>
        <div style={{background:'#fff',borderRadius:16,padding:'16px 22px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:14,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Inteligencia local · KRI sentinel</h2>
            <span style={{fontSize:10.5,color:'var(--ink-3)',background:'var(--bg-soft)',borderRadius:999,padding:'3px 10px',border:'1px solid var(--hairline)'}}>tiempo real</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
            {D.intelKpis.map((k,i)=>(
              <div key={i} style={{borderLeft:'2px solid var(--hairline)',paddingLeft:12}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:28,letterSpacing:'-0.028em',lineHeight:1}}>{k.value}</div>
                <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      <AppHeader/>
        {tab==='term'     && <TabTermometro/>}
        {tab==='intel'    && <TabIntel/>}
        {tab==='trend'    && <TabTendencia/>}
        {tab==='cerebral' && <TabBrain/>}
      </main>
      <footer style={{borderTop:'1px solid var(--hairline)',padding:'20px 28px',textAlign:'center',color:'var(--ink-4)',fontSize:11.5}}>
        Datos ficticios · Termómetro de Riesgo · ElectSim · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
