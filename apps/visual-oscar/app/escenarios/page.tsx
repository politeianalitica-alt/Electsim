'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { useRouter } from 'next/navigation'
import { clearTokens, isAuthenticated } from '@/lib/auth'
import HemicycleAdvanced, { HParty } from '@/components/HemicycleAdvanced'
import MapaProvincias from '@/components/MapaProvincias'

// Paleta unificada con /mapa (incluye históricos UCD/CiU)
const PC = {
  pp:'#1F4E8C', psoe:'#E1322D', vox:'#5BA02E', sumar:'#D43F8D',
  erc:'#E8A030', junts:'#1FA89B', pnv:'#7DB94B', bildu:'#3F7A3A',
  cc:'#F2C43A', bng:'#5BB3D9', upn:'#0E7D8C', ucd:'#F2A825', ciu:'#0091C8',
  otros:'#9E9E9E',
}

// Datasets de hemiciclo: estimación + 14 elecciones históricas (1977-2023)
const HEMI_DATASETS: Record<string, HParty[]> = {
  estimacion: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:132 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:110 },
    { id:'vox',   name:'VOX',      color:PC.vox,   seats: 42 },
    { id:'sumar', name:'Sumar',    color:PC.sumar, seats: 35 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats: 11 },
    { id:'junts', name:'Junts',    color:PC.junts, seats:  7 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  5 },
    { id:'bildu', name:'EH Bildu', color:PC.bildu, seats:  4 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  2 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  1 },
    { id:'otros', name:'Otros',    color:PC.otros, seats:  1 },
  ],
  g2023: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:137 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:121 },
    { id:'vox',   name:'VOX',      color:PC.vox,   seats: 33 },
    { id:'sumar', name:'Sumar',    color:PC.sumar, seats: 31 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  7 },
    { id:'junts', name:'Junts',    color:PC.junts, seats:  7 },
    { id:'bildu', name:'EH Bildu', color:PC.bildu, seats:  6 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  5 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  1 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  1 },
    { id:'upn',   name:'UPN',      color:PC.upn,   seats:  1 },
  ],
  g2019: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:120 },
    { id:'pp',    name:'PP',       color:PC.pp,    seats: 89 },
    { id:'vox',   name:'VOX',      color:PC.vox,   seats: 52 },
    { id:'sumar', name:'UP+MP',    color:PC.sumar, seats: 38 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats: 13 },
    { id:'otros', name:'Cs',       color:'#FF8A00',seats: 10 },
    { id:'junts', name:'JxCat',    color:PC.junts, seats:  8 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  6 },
    { id:'bildu', name:'EH Bildu', color:PC.bildu, seats:  5 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  2 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  1 },
    { id:'upn',   name:'Otros',    color:PC.otros, seats:  6 },
  ],
  g2016: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:137 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats: 85 },
    { id:'sumar', name:'UP',       color:PC.sumar, seats: 71 },
    { id:'otros', name:'Cs',       color:'#FF8A00',seats: 32 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  9 },
    { id:'ciu',   name:'CDC',      color:PC.ciu,   seats:  8 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  5 },
    { id:'bildu', name:'EH Bildu', color:PC.bildu, seats:  2 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  1 },
  ],
  g2015: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:123 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats: 90 },
    { id:'sumar', name:'Podemos+IU',color:PC.sumar,seats: 71 },
    { id:'otros', name:'Cs',       color:'#FF8A00',seats: 40 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  9 },
    { id:'ciu',   name:'DiL',      color:PC.ciu,   seats:  8 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  6 },
    { id:'bildu', name:'EH Bildu', color:PC.bildu, seats:  2 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  1 },
  ],
  g2011: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:186 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:110 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 16 },
    { id:'sumar', name:'IU',       color:PC.sumar, seats: 11 },
    { id:'bildu', name:'Amaiur',   color:PC.bildu, seats:  7 },
    { id:'otros', name:'UPyD',     color:'#E91E63',seats:  5 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  5 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  3 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  2 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  2 },
    { id:'upn',   name:'GBai+FAC', color:PC.upn,   seats:  3 },
  ],
  g2008: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:169 },
    { id:'pp',    name:'PP',       color:PC.pp,    seats:154 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 11 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  6 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  3 },
    { id:'sumar', name:'IU',       color:PC.sumar, seats:  2 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  2 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  2 },
    { id:'otros', name:'UPyD',     color:'#E91E63',seats:  1 },
  ],
  g2004: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:164 },
    { id:'pp',    name:'PP',       color:PC.pp,    seats:148 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 10 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  8 },
    { id:'pnv',   name:'PNV+EA',   color:PC.pnv,   seats:  8 },
    { id:'sumar', name:'IU+CHA',   color:PC.sumar, seats:  6 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  3 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  2 },
    { id:'otros', name:'NaBai',    color:PC.otros, seats:  1 },
  ],
  g2000: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:183 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:125 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 15 },
    { id:'sumar', name:'IU+IC+CHA',color:PC.sumar, seats: 10 },
    { id:'pnv',   name:'PNV+EA',   color:PC.pnv,   seats:  8 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  4 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  4 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  1 },
  ],
  g1996: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:156 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:141 },
    { id:'sumar', name:'IU',       color:PC.sumar, seats: 21 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 16 },
    { id:'pnv',   name:'PNV+EA',   color:PC.pnv,   seats:  6 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  4 },
    { id:'bildu', name:'HB',       color:PC.bildu, seats:  2 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  2 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  1 },
    { id:'otros', name:'UV',       color:PC.otros, seats:  1 },
  ],
  g1993: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:159 },
    { id:'pp',    name:'PP',       color:PC.pp,    seats:141 },
    { id:'sumar', name:'IU',       color:PC.sumar, seats: 18 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 17 },
    { id:'pnv',   name:'PNV+EA',   color:PC.pnv,   seats:  6 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  4 },
    { id:'bildu', name:'HB',       color:PC.bildu, seats:  2 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  1 },
    { id:'otros', name:'UV+PAR',   color:PC.otros, seats:  2 },
  ],
  g1989: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:175 },
    { id:'pp',    name:'PP',       color:PC.pp,    seats:107 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 18 },
    { id:'sumar', name:'IU+EE',    color:PC.sumar, seats: 19 },
    { id:'otros', name:'CDS+otros',color:PC.otros, seats: 20 },
    { id:'pnv',   name:'PNV+EA',   color:PC.pnv,   seats:  7 },
    { id:'bildu', name:'HB',       color:PC.bildu, seats:  4 },
  ],
  g1986: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:184 },
    { id:'pp',    name:'AP',       color:PC.pp,    seats:105 },
    { id:'otros', name:'CDS+otros',color:PC.otros, seats: 22 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 18 },
    { id:'sumar', name:'IU+EE',    color:PC.sumar, seats:  9 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  6 },
    { id:'bildu', name:'HB',       color:PC.bildu, seats:  5 },
    { id:'cc',    name:'AIC',      color:PC.cc,    seats:  1 },
  ],
  g1982: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:202 },
    { id:'pp',    name:'AP-PDP',   color:PC.pp,    seats:107 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 12 },
    { id:'ucd',   name:'UCD',      color:PC.ucd,   seats: 11 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  8 },
    { id:'sumar', name:'PCE+EE',   color:PC.sumar, seats:  5 },
    { id:'otros', name:'CDS',      color:PC.otros, seats:  2 },
    { id:'bildu', name:'HB',       color:PC.bildu, seats:  2 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  1 },
  ],
  g1979: [
    { id:'ucd',   name:'UCD',      color:PC.ucd,   seats:168 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:121 },
    { id:'sumar', name:'PCE+EE',   color:PC.sumar, seats: 24 },
    { id:'pp',    name:'CD',       color:PC.pp,    seats:  9 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats:  8 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  7 },
    { id:'bildu', name:'HB',       color:PC.bildu, seats:  3 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  1 },
    { id:'upn',   name:'UPN',      color:PC.upn,   seats:  1 },
    { id:'otros', name:'PSA+otros',color:PC.otros, seats:  8 },
  ],
  g1977: [
    { id:'ucd',   name:'UCD',      color:PC.ucd,   seats:165 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:118 },
    { id:'sumar', name:'PCE+PSP+EE',color:PC.sumar,seats: 27 },
    { id:'pp',    name:'AP',       color:PC.pp,    seats: 16 },
    { id:'ciu',   name:'PDC',      color:PC.ciu,   seats: 11 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  8 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  1 },
    { id:'otros', name:'Otros',    color:PC.otros, seats:  4 },
  ],
}

const HEMI_HISTORIC = [
  { k:'g2019', label:'Generales 2019' }, { k:'g2016', label:'Generales 2016' }, { k:'g2015', label:'Generales 2015' },
  { k:'g2011', label:'Generales 2011' }, { k:'g2008', label:'Generales 2008' }, { k:'g2004', label:'Generales 2004' },
  { k:'g2000', label:'Generales 2000' }, { k:'g1996', label:'Generales 1996' }, { k:'g1993', label:'Generales 1993' },
  { k:'g1989', label:'Generales 1989' }, { k:'g1986', label:'Generales 1986' }, { k:'g1982', label:'Generales 1982' },
  { k:'g1979', label:'Generales 1979' }, { k:'g1977', label:'Generales 1977' },
] as const
const HEMI_HISTORIC_KEYS: readonly string[] = HEMI_HISTORIC.map(o => o.k)

const ESCENARIOS = [
  {id:'pp-vox',         nombre:'PP + VOX + CC (mayoría exacta)',partidos:[{s:'PP',c:'#009FDB'},{s:'VOX',c:'#63BE21'},{s:'CC',c:'#FFC107'}],seats:176,prob:38,viable:true},
  {id:'pp-vox-upn-cc',  nombre:'Bloqueo / repetición electoral',partidos:[],seats:0,prob:22,viable:false},
  {id:'pp-minoria',     nombre:'PP gobierno en minoría',partidos:[{s:'PP',c:'#009FDB'}],seats:132,prob:18,viable:false},
  {id:'psoe-sumar',     nombre:'PSOE + bloque izquierda',partidos:[{s:'PSOE',c:'#E30613'},{s:'Sumar',c:'#E4007C'},{s:'ERC',c:'#F4B20A'},{s:'EH Bildu',c:'#A9C55A'},{s:'BNG',c:'#73C6EE'}],seats:161,prob:13,viable:false},
  {id:'psoe-junts',     nombre:'PSOE + bloque + Junts',partidos:[{s:'PSOE',c:'#E30613'},{s:'Sumar',c:'#E4007C'},{s:'ERC',c:'#F4B20A'},{s:'EH Bildu',c:'#A9C55A'},{s:'Junts',c:'#00AEEF'}],seats:168,prob:5,viable:false},
  {id:'gran-coalicion', nombre:'Gran coalición PP + PSOE',partidos:[{s:'PP',c:'#009FDB'},{s:'PSOE',c:'#E30613'}],seats:242,prob:4,viable:true},
]

const MC_SIMS = [
  {siglas:'PP',      mean:132,ic80l:124,ic80h:140,ic95l:118,ic95h:146,color:'#009FDB'},
  {siglas:'PSOE',    mean:110,ic80l:100,ic80h:120,ic95l: 92,ic95h:128,color:'#E30613'},
  {siglas:'VOX',     mean: 42,ic80l: 36,ic80h: 48,ic95l: 30,ic95h: 54,color:'#63BE21'},
  {siglas:'Sumar',   mean: 35,ic80l: 29,ic80h: 41,ic95l: 23,ic95h: 47,color:'#E4007C'},
  {siglas:'ERC',     mean: 11,ic80l:  9,ic80h: 13,ic95l:  7,ic95h: 15,color:'#F4B20A'},
  {siglas:'Junts',   mean:  7,ic80l:  5,ic80h:  9,ic95l:  3,ic95h: 11,color:'#00AEEF'},
  {siglas:'PNV',     mean:  5,ic80l:  4,ic80h:  6,ic95l:  3,ic95h:  7,color:'#007A3D'},
  {siglas:'EH Bildu',mean:  4,ic80l:  3,ic80h:  5,ic95l:  2,ic95h:  6,color:'#A9C55A'},
]

const MACRO_IMPACT = [
  {v:'Desempleo',      val:'11.4%',  imp:'−0.8% PSOE',dir:'neg'},
  {v:'Inflación CPI',  val:'2.9%',   imp:'−0.5% PSOE',dir:'neg'},
  {v:'Crecim. PIB',    val:'+2.7%',  imp:'+0.4% PSOE',dir:'pos'},
  {v:'Sentim. gobierno',val:'42/100',imp:'−1.2% PSOE',dir:'neg'},
  {v:'Prima de riesgo',val:'98 pb',  imp:'−0.3% PP',  dir:'neg'},
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

function MCChart(){
  // rowH 32 · ~80% del original (36), aún algo más pequeño que el inicial
  const W=820,rowH=32,padL=76,padR=98,barW=W-padL-padR,maxS=160
  const H=rowH*MC_SIMS.length+16
  const majX=padL+(176/maxS)*barW
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:1040,display:'block',margin:'0 auto'}}>
      <line x1={majX} y1={0} x2={majX} y2={H-8} stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="3 4"/>
      <text x={majX} y={H-1} textAnchor="middle" fontSize="9.5" fill="var(--ink-4)">Mayoría 176</text>
      {MC_SIMS.map((p,i)=>{
        const y=i*rowH+rowH/2+3
        const x95l=padL+(p.ic95l/maxS)*barW,x95h=padL+(p.ic95h/maxS)*barW
        const x80l=padL+(p.ic80l/maxS)*barW,x80h=padL+(p.ic80h/maxS)*barW
        const xm=padL+(p.mean/maxS)*barW
        return(
          <g key={p.siglas}>
            <text x={padL-7} y={y+3} textAnchor="end" fontSize="11.5" fontWeight="600" fill="var(--ink-2)">{p.siglas}</text>
            <rect x={x95l} y={y-7.5} width={x95h-x95l} height={15} rx="3"   fill={p.color} opacity="0.14"/>
            <rect x={x80l} y={y-5.5} width={x80h-x80l} height={11.5} rx="2" fill={p.color} opacity="0.30"/>
            <rect x={xm-3.5} y={y-7.5} width={7}      height={15} rx="2"   fill={p.color}/>
            <text x={x95h+4} y={y+3} fontSize="10" fill="var(--ink-4)">[{p.ic95l}–{p.ic95h}]</text>
            <text x={W-padR+8} y={y+3} fontSize="11.5" fontWeight="700" fill={p.color}>{p.mean}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function EscenariosPage(){
  const router=useRouter()
  const currentPath='/escenarios'
  const [hemiDataset, setHemiDataset] = useState<keyof typeof HEMI_DATASETS>('estimacion')
  useEffect(()=>{if(!isAuthenticated())router.push('/login')},[router])
  function logout(){clearTokens();router.push('/login')}
  return(
    <div style={{background:'var(--bg)',minHeight:'100vh',fontFamily:'var(--font-body)'}}>
      <AppHeader/>
      <main style={{maxWidth:1600,margin:'0 auto',padding:'0 28px 80px'}}>
        <section style={{background:'linear-gradient(135deg,#2e1065 0%,#0f0a2e 100%)',borderRadius:'0 0 24px 24px',padding:'36px 48px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22,color:'#fff'}}>
          <div>
            <p style={{fontSize:10.5,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',opacity:0.65,margin:'0 0 8px'}}>Simulador de Escenarios · 5.000 simulaciones</p>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:700,letterSpacing:'-0.024em',margin:'0 0 6px',lineHeight:1.1}}>Mayoría PP-VOX-CC <em style={{fontWeight:300}}>la más probable</em></h1>
            <p style={{fontSize:13,opacity:0.65,margin:0}}>Monte Carlo · D'Hondt · Incertidumbre σ = 2.5</p>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:64,fontWeight:700,letterSpacing:'-0.05em',lineHeight:1,color:'#c4b5fd'}}>38<span style={{fontSize:28}}>%</span></div>
            <div style={{fontSize:13,opacity:0.65,marginTop:4}}>P(Mayoría derecha)</div>
          </div>
        </section>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
          {[{l:'P(Mayoría PP)',v:'38%',c:'#009FDB'},{l:'P(Mayoría PSOE)',v:'5%',c:'#E30613'},{l:'P(Bloqueo)',v:'22%',c:'#9E9E9E'},{l:'P(Repetición)',v:'15%',c:'#F59E0B'}].map(k=>(
            <div key={k.l} style={{background:'#fff',borderRadius:16,padding:'18px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderLeft:`3px solid ${k.c}`}}>
              <p style={{fontSize:10.5,color:'var(--ink-4)',fontWeight:500,letterSpacing:'0.04em',textTransform:'uppercase',margin:'0 0 6px'}}>{k.l}</p>
              <div style={{fontFamily:'var(--font-display)',fontSize:36,fontWeight:700,letterSpacing:'-0.03em',color:k.c,lineHeight:1}}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* ───── Hemiciclo + Mapa provincial · grid 2 columnas compactas ───── */}
        <div style={{display:'grid',gridTemplateColumns:'5fr 7fr',gap:14,marginBottom:20,alignItems:'stretch'}}>
          {/* Hemiciclo (con cálculo de coalición + selector con históricas) */}
          <div style={{background:'#fff',borderRadius:16,padding:'16px 18px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:10}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:14.5,fontWeight:600,letterSpacing:'-0.013em',margin:0}}>Hemiciclo · coaliciones</h2>
              <div style={{display:'inline-flex',alignItems:'center',gap:5}}>
                <div style={{display:'inline-flex',background:'#F5F5F7',borderRadius:999,padding:2}}>
                  {([{k:'estimacion',label:'Est. 2026'},{k:'g2023',label:'2023'}] as const).map(o=>{
                    const active = hemiDataset === o.k
                    return (
                      <button key={o.k} onClick={()=>setHemiDataset(o.k)} style={{
                        background: active ? '#fff' : 'transparent',
                        color: active ? '#1d1d1f' : '#6e6e73',
                        border:'none', borderRadius:999, padding:'4px 10px',
                        fontSize:11, fontWeight: active ? 600 : 500, cursor:'pointer',
                        fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        transition:'all 160ms',
                      }}>{o.label}</button>
                    )
                  })}
                </div>
                <select
                  value={HEMI_HISTORIC_KEYS.includes(hemiDataset) ? hemiDataset : ''}
                  onChange={e => { if (e.target.value) setHemiDataset(e.target.value as keyof typeof HEMI_DATASETS) }}
                  style={{
                    fontFamily:'inherit', fontSize:11,
                    fontWeight: HEMI_HISTORIC_KEYS.includes(hemiDataset) ? 600 : 500,
                    padding:'4px 22px 4px 10px', borderRadius:999,
                    border:'1px solid '+(HEMI_HISTORIC_KEYS.includes(hemiDataset) ? '#1d1d1f' : '#ECECEF'),
                    background:'#fff',
                    color: HEMI_HISTORIC_KEYS.includes(hemiDataset) ? '#1d1d1f' : '#6e6e73',
                    cursor:'pointer', appearance:'none',
                    backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                    backgroundRepeat:'no-repeat', backgroundPosition:'right 7px center',
                  }}>
                  <option value="">Históricas…</option>
                  {HEMI_HISTORIC.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <p style={{fontSize:11,color:'var(--ink-4)',margin:'0 0 8px'}}>Pulsa partidos para sumar escaños y comprobar viabilidad.</p>
            <div style={{flex:1,minHeight:0}}>
              <HemicycleAdvanced
                parties={HEMI_DATASETS[hemiDataset]}
                belowLegend={<HemiTable parties={HEMI_DATASETS[hemiDataset]}/>}
              />
            </div>
          </div>

          {/* Mapa provincial compacto con histórico interno */}
          <div style={{background:'#fff',borderRadius:16,padding:'16px 18px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',display:'flex',flexDirection:'column'}}>
            <div style={{marginBottom:10}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:14.5,fontWeight:600,letterSpacing:'-0.013em',margin:'0 0 3px'}}>Mapa provincial · series históricas</h2>
              <p style={{fontSize:11,color:'var(--ink-4)',margin:0}}>52 provincias · alterna <strong>Ganador / Tamaño</strong>. Click para desglose.</p>
            </div>
            <div style={{flex:1,minHeight:0}}>
              <MapaProvincias compact/>
            </div>
          </div>
        </div>

        <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',marginBottom:20}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 16px'}}>Escenarios de gobierno</h2>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {ESCENARIOS.map((e,i)=>(
              <div key={i} id={e.id} style={{padding:'14px 18px',borderRadius:14,background:'var(--bg-soft)',border:'1px solid var(--hairline)',display:'grid',gridTemplateColumns:'1fr 80px 150px',gap:16,alignItems:'center',scrollMarginTop:60}}>
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

        <div style={{background:'#fff',borderRadius:16,padding:'20px 24px 18px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',marginBottom:20,maxWidth:1120,margin:'0 auto 20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:12,flexWrap:'wrap'}}>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:15.5,fontWeight:600,letterSpacing:'-0.014em',margin:0}}>Distribución Monte Carlo · 5.000 simulaciones</h2>
            <div style={{display:'flex',gap:12,fontSize:11,color:'var(--ink-3)'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:16,height:7,borderRadius:2,background:'#888',opacity:0.14,display:'inline-block'}}/>IC 95%</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:16,height:7,borderRadius:2,background:'#888',opacity:0.30,display:'inline-block'}}/>IC 80%</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:7,height:11,borderRadius:1.5,background:'#666',display:'inline-block'}}/>Media</span>
            </div>
          </div>
          <MCChart/>
        </div>

        <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 16px'}}>Impacto de variables macroeconómicas</h2>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{borderBottom:'1px solid var(--hairline)'}}>
              {['Variable','Valor actual','Impacto estimado','Dir.'].map(h=><th key={h} style={{textAlign:'left',padding:'0 8px 8px',fontWeight:600,color:'var(--ink-3)',fontSize:10.5,letterSpacing:'0.04em',textTransform:'uppercase'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {MACRO_IMPACT.map((m,i)=>(
                <tr key={m.v} style={{borderBottom:'1px solid var(--hairline)',background:i%2?'#fafafa':'transparent'}}>
                  <td style={{padding:'9px 8px',fontWeight:600}}>{m.v}</td>
                  <td style={{padding:'9px 8px',fontFamily:'var(--font-display)',fontWeight:600}}>{m.val}</td>
                  <td style={{padding:'9px 8px',fontWeight:600,color:m.dir==='pos'?'#16A34A':'#DC2626'}}>{m.imp}</td>
                  <td style={{padding:'9px 8px',fontSize:16}}>{m.dir==='pos'?'↑':'↓'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <footer style={{borderTop:'1px solid var(--hairline)',padding:'20px 28px',textAlign:'center',color:'var(--ink-4)',fontSize:11.5}}>
        Datos ficticios · Escenarios Electorales · ElectSim · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// HemiTable · tabla con los datos del hemiciclo activo
// ─────────────────────────────────────────────────────────────────────────
function HemiTable({ parties }: { parties: HParty[] }) {
  const sorted = [...parties].sort((a, b) => b.seats - a.seats)
  const total = sorted.reduce((s, p) => s + p.seats, 0)
  const MAJ = 176
  // Acumulado para detectar dónde se cruza la mayoría absoluta
  let acc = 0
  const rows = sorted.map(p => {
    acc += p.seats
    return { ...p, acc, crossedMaj: acc >= MAJ }
  })
  const firstCross = rows.findIndex(r => r.crossedMaj)
  const maxSeats = sorted[0]?.seats || 1

  return (
    <div style={{
      marginTop:12, maxHeight:240, overflowY:'auto',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>
          Datos del hemiciclo · {sorted.length} formaciones
        </span>
        <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:600 }}>
          Total {total} esc. · mayoría {MAJ}
        </span>
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
        <thead>
          <tr style={{ borderBottom:'1px solid #ECECEF' }}>
            {[
              { l:'Partido', a:'left',  w:'auto' },
              { l:'Esc.',    a:'right', w:'42px' },
              { l:'%',       a:'right', w:'46px' },
              { l:'Acum.',   a:'right', w:'52px' },
              { l:'Distribución', a:'left', w:'auto' },
            ].map(h => (
              <th key={h.l} style={{
                textAlign:h.a as 'left'|'right', padding:'5px 6px',
                fontSize:9, fontWeight:700, color:'#6e6e73',
                letterSpacing:'0.06em', textTransform:'uppercase',
                width:h.w,
              }}>{h.l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const pct = (p.seats / total) * 100
            const barW = (p.seats / maxSeats) * 100
            const isCrossRow = i === firstCross
            return (
              <tr key={p.id} style={{
                borderBottom:'1px solid #F5F5F7',
                background: isCrossRow ? `${p.color}08` : 'transparent',
              }}>
                <td style={{ padding:'6px 6px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ width:10, height:10, borderRadius:2, background:p.color, flexShrink:0, display:'inline-block' }}/>
                    <span style={{ fontWeight:600, color:'#1d1d1f' }}>{p.name}</span>
                    {isCrossRow && (
                      <span style={{
                        fontSize:8, fontWeight:800, letterSpacing:'0.06em',
                        padding:'1px 5px', borderRadius:4, marginLeft:'auto',
                        background:p.color, color:'#fff',
                      }}>176+</span>
                    )}
                  </div>
                </td>
                <td style={{ padding:'6px 6px', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{p.seats}</td>
                <td style={{ padding:'6px 6px', textAlign:'right', color:'#6e6e73' }}>{pct.toFixed(1)}%</td>
                <td style={{ padding:'6px 6px', textAlign:'right', color: p.crossedMaj ? '#16A34A' : '#6e6e73', fontWeight:p.crossedMaj ? 700 : 500 }}>{p.acc}</td>
                <td style={{ padding:'6px 6px', minWidth:80 }}>
                  <div style={{ height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden', position:'relative' }}>
                    <div style={{ height:'100%', width:`${barW}%`, background:p.color, borderRadius:3 }}/>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
