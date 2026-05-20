'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { useRouter } from 'next/navigation'
import { clearTokens, isAuthenticated } from '@/lib/auth'
import HemicycleAdvanced, { HParty } from '@/components/HemicycleAdvanced'
import MapaPoliticoEspana from '@/components/MapaPoliticoEspana'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import {
  computeScenarios,
  probMayoriaDerecha,
  type ScenarioComputed,
} from '@/lib/escenarios/compute'
import { computeMonteCarlo, type McRow } from '@/lib/escenarios/montecarlo'

// Shape del nowcast en vivo (igual al que usa /nowcasting)
interface NowcastParty {
  siglas: string; nombre: string; pct: number; seats: number;
  color: string; bloque: 'izquierda' | 'derecha' | 'otros'; delta: number;
}
interface NowcastResponse { parties?: NowcastParty[]; n_polls?: number }

// Respuesta del endpoint /api/escenarios/explain (análisis IA)
interface ScenarioAnalysis {
  factores_favorables: string[]
  factores_desfavorables: string[]
  sucesos_pivote: string[]
  analista_note: string
  model: string
  ms: number
  source: string
}

// Paleta unificada con /mapa (incluye históricos UCD/CiU)
const PC = {
  pp:'#1F4E8C', psoe:'#E1322D', vox:'#5BA02E', sumar:'#D43F8D',
  erc:'#E8A030', junts:'#1FA89B', pnv:'#7DB94B', bildu:'#3F7A3A',
  cc:'#F2C43A', bng:'#5BB3D9', upn:'#0E7D8C', ucd:'#F2A825', ciu:'#0091C8',
  otros:'#9E9E9E',
}

// Datasets de hemiciclo: estimación + 14 elecciones históricas (1977-2023)
const HEMI_DATASETS: Record<string, HParty[]> = {
  // Datos sincronizados con el sistema D'Hondt provincial calibrado
  // (lib/sources/dhondt-provincial.ts). Si /api/analytics/nowcast cae,
  // el hemiciclo muestra estos números (no los antiguos PP132/PSOE110).
  estimacion: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:136 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:101 },
    { id:'vox',   name:'VOX',      color:PC.vox,   seats: 46 },
    { id:'sumar', name:'Sumar',    color:PC.sumar, seats: 28 },
    { id:'junts', name:'Junts',    color:PC.junts, seats: 11 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats: 10 },
    { id:'bildu', name:'EH Bildu', color:PC.bildu, seats:  8 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  6 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  3 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  1 },
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

// ARRAYS ANTIGUOS (ESCENARIOS, MC_SIMS) ELIMINADOS · ahora se calculan
// dinámicamente desde el nowcast en lib/escenarios/compute.ts y
// lib/escenarios/montecarlo.ts

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

function MCChart({ rows }: { rows: McRow[] }) {
  // Calcula maxS dinámicamente para que el bar más alto siempre quepa
  // (mín. 160 para que la línea de 176 nunca quede fuera del view).
  const maxS = Math.max(160, ...rows.map(r => r.ic95h + 4))
  const W = 820, rowH = 32, padL = 76, padR = 98, barW = W - padL - padR
  const H = rowH * Math.max(rows.length, 1) + 16
  const majX = padL + (176 / maxS) * barW
  if (rows.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-4)', fontSize: 12 }}>
        Datos de nowcast no disponibles. Reintentando…
      </div>
    )
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 1040, display: 'block', margin: '0 auto' }}>
      <line x1={majX} y1={0} x2={majX} y2={H - 8} stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="3 4"/>
      <text x={majX} y={H - 1} textAnchor="middle" fontSize="9.5" fill="var(--ink-4)">Mayoría 176</text>
      {rows.map((p, i) => {
        const y = i * rowH + rowH / 2 + 3
        const x95l = padL + (p.ic95l / maxS) * barW, x95h = padL + (p.ic95h / maxS) * barW
        const x80l = padL + (p.ic80l / maxS) * barW, x80h = padL + (p.ic80h / maxS) * barW
        const xm = padL + (p.mean / maxS) * barW
        return (
          <g key={p.siglas}>
            <text x={padL - 7} y={y + 3} textAnchor="end" fontSize="11.5" fontWeight="600" fill="var(--ink-2)">{p.siglas}</text>
            <rect x={x95l} y={y - 7.5} width={x95h - x95l} height={15} rx="3" fill={p.color} opacity="0.14"/>
            <rect x={x80l} y={y - 5.5} width={x80h - x80l} height={11.5} rx="2" fill={p.color} opacity="0.30"/>
            <rect x={xm - 3.5} y={y - 7.5} width={7} height={15} rx="2" fill={p.color}/>
            <text x={x95h + 4} y={y + 3} fontSize="10" fill="var(--ink-4)">[{p.ic95l}–{p.ic95h}]</text>
            <text x={W - padR + 8} y={y + 3} fontSize="11.5" fontWeight="700" fill={p.color}>{p.mean}</text>
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
  // Dataset compartido entre Mapa provincial (cuadrícula) y Mapa burbujas v2
  const [provDataset, setProvDataset] = useState<string>('estimacion')
  useEffect(()=>{if(!isAuthenticated())router.push('/login')},[router])
  function logout(){clearTokens();router.push('/login')}

  // Datos LIVE del nowcasting (auto-refresh 30s) — sustituyen al hardcodeado
  // HEMI_DATASETS.estimacion cuando el dataset activo es 'estimacion'.
  const { data: nowcast, source: nowcastSource, updatedAt: nowcastUpdated, refresh: refreshNowcast } =
    useApi<NowcastResponse>('/api/analytics/nowcast', { refreshInterval: 30_000 })

  // Convertimos NowcastParty[] → HParty[] (siglas → id estable, mismos colores)
  const liveEstimacion: HParty[] | null = useMemo(() => {
    if (!nowcast?.parties || nowcast.parties.length === 0) return null
    const idMap: Record<string, string> = {
      pp:'pp', psoe:'psoe', vox:'vox', sumar:'sumar',
      erc:'erc', junts:'junts', pnv:'pnv', bildu:'bildu',
      cc:'cc', bng:'bng', upn:'upn', otros:'otros',
    }
    return nowcast.parties
      .filter(p => p.seats > 0)
      .map(p => {
        const key = (p.siglas || '').toLowerCase().replace(/\s/g, '').replace('ehbildu', 'bildu')
        return { id: idMap[key] || 'otros', name: p.siglas, color: p.color, seats: p.seats }
      })
  }, [nowcast])

  // 'estimacion' viene del back electoral (/api/analytics/nowcast).
  // Aceptamos tanto 'backend' (FastAPI conectado) como 'mock' (fallback
  // del propio endpoint con jitter realista). El badge LiveStatusBadge
  // del header indica al usuario el origen exacto.
  // Las claves históricas (g2023, g2019, …) sí salen del dataset local.
  const activeHemi: HParty[] | null = hemiDataset === 'estimacion'
    ? liveEstimacion
    : (HEMI_DATASETS[hemiDataset] || null)

  // ─── Escenarios + Monte Carlo computados desde nowcast ───────────────
  // Reemplaza los arrays hardcoded ESCENARIOS y MC_SIMS con cálculo en
  // vivo a partir de los escaños reales del nowcasting.
  const liveScenarios = useMemo(() => {
    if (!nowcast?.parties) return []
    return computeScenarios(nowcast.parties)
  }, [nowcast])

  const liveMC = useMemo(() => {
    if (!nowcast?.parties) return []
    return computeMonteCarlo(nowcast.parties, 8)
  }, [nowcast])

  const probDerecha = useMemo(() => probMayoriaDerecha(liveScenarios), [liveScenarios])

  // Escenario seleccionado para mostrar análisis de factores (Claude)
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [scenarioAnalysis, setScenarioAnalysis] = useState<Record<string, ScenarioAnalysis | 'loading' | 'error'>>({})

  // Toggle expansión + lazy-fetch de análisis
  const toggleScenario = async (sc: ScenarioComputed) => {
    if (selectedScenario === sc.id) {
      setSelectedScenario(null)
      return
    }
    setSelectedScenario(sc.id)
    if (scenarioAnalysis[sc.id] && scenarioAnalysis[sc.id] !== 'error') return // ya cacheado
    setScenarioAnalysis(prev => ({ ...prev, [sc.id]: 'loading' }))
    try {
      const res = await fetch('/api/escenarios/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: sc.id,
          scenario_nombre: sc.nombre,
          composition: sc.composition,
          seats: sc.seats,
          viable: sc.viable,
          prob: sc.prob,
          tipo: sc.tipo,
        }),
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const data = await res.json() as ScenarioAnalysis
      setScenarioAnalysis(prev => ({ ...prev, [sc.id]: data }))
    } catch {
      setScenarioAnalysis(prev => ({ ...prev, [sc.id]: 'error' }))
    }
  }
  return(
    <div style={{background:'var(--bg)',minHeight:'100vh',fontFamily:'var(--font-body)'}}>
      <AppHeader/>
      <main style={{maxWidth:1600,margin:'0 auto',padding:'0 28px 80px'}}>
        <section style={{background:'linear-gradient(135deg,#2e1065 0%,#0f0a2e 100%)',borderRadius:'0 0 24px 24px',padding:'36px 48px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22,color:'#fff'}}>
          <div>
            <p style={{fontSize:10.5,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',opacity:0.65,margin:'0 0 8px'}}>Simulador de Escenarios · live · nowcast electoral</p>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:700,letterSpacing:'-0.024em',margin:'0 0 6px',lineHeight:1.1}}>
              {liveScenarios[0]
                ? <>{liveScenarios[0].nombre} <em style={{fontWeight:300}}>la más probable</em></>
                : <>Calculando escenarios…</>}
            </h1>
            <p style={{fontSize:13,opacity:0.65,margin:0}}>D'Hondt provincial · Incertidumbre por tamaño de partido · Datos del nowcast en vivo</p>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:64,fontWeight:700,letterSpacing:'-0.05em',lineHeight:1,color:'#c4b5fd'}}>{probDerecha}<span style={{fontSize:28}}>%</span></div>
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
          {/* Hemiciclo (con cálculo de coalición + selector con históricas)
              · Header con título a la izquierda y selector SIEMPRE pegado
              a la derecha (sin flex-wrap, sin que se baje a otra línea). */}
          <div style={{background:'#fff',borderRadius:16,padding:'16px 18px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0,flex:'1 1 auto'}}>
                <h2 style={{fontFamily:'var(--font-display)',fontSize:14.5,fontWeight:600,letterSpacing:'-0.013em',margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Hemiciclo · coaliciones</h2>
                {hemiDataset === 'estimacion' && (
                  <LiveStatusBadge updatedAt={nowcastUpdated} source={nowcastSource} refreshIntervalSec={30} onRefresh={refreshNowcast}/>
                )}
              </div>
              <div style={{display:'inline-flex',alignItems:'center',gap:5,flex:'0 0 auto',marginLeft:'auto'}}>
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
              {activeHemi ? (
                <HemicycleAdvanced
                  parties={activeHemi}
                  belowLegend={<HemiTable parties={activeHemi}/>}
                />
              ) : (
                /* Cargando · primera petición todavía en vuelo */
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',padding:'40px 20px',color:'#86868b',fontSize:12,gap:8}}>
                  <div style={{width:18,height:18,borderRadius:'50%',border:'2px solid #ECECEF',borderTopColor:'#1d1d1f',animation:'spin 0.8s linear infinite'}}/>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontWeight:600,color:'#1d1d1f',marginBottom:2}}>Cargando estimación electoral…</div>
                    <div>Conectando con el back de nowcast</div>
                  </div>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              )}
            </div>
          </div>

          {/* Mapa político REALISTA de España con geografía de provincias
              (sustituye al mapa de cuadrícula y al mapa de burbujas que
              estaban antes en una sección separada). */}
          <div style={{background:'#fff',borderRadius:16,padding:'16px 18px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',display:'flex',flexDirection:'column'}}>
            <div style={{marginBottom:10}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:14.5,fontWeight:600,letterSpacing:'-0.013em',margin:'0 0 3px'}}>Mapa político · provincias de España</h2>
              <p style={{fontSize:11,color:'var(--ink-4)',margin:0}}>50 provincias + Ceuta y Melilla · cada provincia coloreada según el partido ganador.</p>
            </div>
            <div style={{flex:1,minHeight:0}}>
              <MapaPoliticoEspana compact dataset={provDataset} onDatasetChange={setProvDataset} liveData/>
            </div>
          </div>
        </div>

        <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',marginBottom:20}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:14,gap:12,flexWrap:'wrap'}}>
            <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Escenarios de gobierno</h2>
            <div style={{display:'flex',alignItems:'center',gap:10,fontSize:11,color:'var(--ink-3)'}}>
              <span>Calculado desde nowcast en vivo · click en un escenario para análisis IA</span>
              <LiveStatusBadge updatedAt={nowcastUpdated} source={nowcastSource} refreshIntervalSec={30} onRefresh={refreshNowcast}/>
            </div>
          </div>
          {liveScenarios.length === 0 ? (
            <div style={{padding:'28px 0',textAlign:'center',color:'var(--ink-4)',fontSize:13}}>
              Cargando nowcast electoral…
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {liveScenarios.map((e) => {
                const isOpen = selectedScenario === e.id
                const analysis = scenarioAnalysis[e.id]
                return (
                  <div key={e.id} id={e.id} style={{
                    borderRadius:14,
                    background: isOpen ? 'linear-gradient(180deg,#fafafa 0%,#fff 100%)' : 'var(--bg-soft)',
                    border: isOpen ? '1px solid #c4b5fd' : '1px solid var(--hairline)',
                    overflow:'hidden',
                    transition:'all 180ms',
                    scrollMarginTop:60,
                  }}>
                    <button
                      type="button"
                      onClick={() => toggleScenario(e)}
                      style={{
                        width:'100%',
                        padding:'14px 18px',
                        background:'transparent',
                        border:'none',
                        cursor:'pointer',
                        display:'grid',
                        gridTemplateColumns:'1fr 80px 150px 24px',
                        gap:16,
                        alignItems:'center',
                        textAlign:'left',
                        fontFamily:'inherit',
                        color:'inherit',
                      }}
                    >
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                          <span style={{fontSize:13,fontWeight:600}}>{e.nombre}</span>
                          <span style={{fontSize:9.5,fontWeight:700,padding:'2px 7px',borderRadius:999,background:e.viable?'#16A34A':'var(--hairline)',color:e.viable?'#fff':'var(--ink-4)'}}>{e.viable?'VIABLE':'INVIABLE'}</span>
                          {!isOpen && (
                            <span style={{fontSize:10,color:'var(--ink-4)',fontStyle:'italic'}}>· click para detalles</span>
                          )}
                        </div>
                        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                          {e.partidos.map(p=><span key={p.s} style={{fontSize:11,fontWeight:600,padding:'2px 7px',borderRadius:999,background:`${p.c}18`,color:p.c,border:`1px solid ${p.c}3a`}}>{p.s}</span>)}
                          {e.partidos.length===0&&<span style={{fontSize:11,color:'var(--ink-4)'}}>Sin coalición posible</span>}
                        </div>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:700}}>{e.seats||'—'}</div>
                        <div style={{fontSize:10.5,color:'var(--ink-4)'}}>escaños{e.viable ? ` (+${e.gap})` : e.gap !== 0 ? ` (${e.gap})` : ''}</div>
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
                      <div style={{textAlign:'center',color:'var(--ink-4)',fontSize:14,transition:'transform 180ms',transform:isOpen?'rotate(180deg)':'rotate(0deg)'}}>⌄</div>
                    </button>

                    {/* Panel expandible · análisis IA */}
                    {isOpen && (
                      <div style={{padding:'4px 22px 18px',borderTop:'1px solid #ECECEF'}}>
                        {analysis === 'loading' && (
                          <div style={{padding:'24px 0',textAlign:'center',color:'var(--ink-4)',fontSize:12.5,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                            <div style={{width:12,height:12,borderRadius:'50%',border:'2px solid #c4b5fd',borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
                            Analizando escenario con Claude Sonnet…
                          </div>
                        )}
                        {analysis === 'error' && (
                          <div style={{padding:'16px 0',color:'#dc2626',fontSize:12}}>
                            No se pudo cargar el análisis. <button type="button" onClick={() => toggleScenario(e)} style={{background:'none',border:'none',color:'#1F4E8C',cursor:'pointer',textDecoration:'underline',fontFamily:'inherit',fontSize:12}}>Reintentar</button>
                          </div>
                        )}
                        {analysis && typeof analysis === 'object' && (
                          <ScenarioAnalysisPanel analysis={analysis}/>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
            </div>
          )}
        </div>

        <div style={{background:'#fff',borderRadius:16,padding:'20px 24px 18px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',marginBottom:20,maxWidth:1120,margin:'0 auto 20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:12,flexWrap:'wrap'}}>
            <div>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:15.5,fontWeight:600,letterSpacing:'-0.014em',margin:0}}>Distribución Monte Carlo</h2>
              <p style={{fontSize:11,color:'var(--ink-4)',margin:'3px 0 0'}}>
                Bandas IC calculadas desde nowcast actual con σ por tamaño de partido · {nowcast?.n_polls ?? '?'} encuestas
              </p>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{display:'flex',gap:12,fontSize:11,color:'var(--ink-3)'}}>
                <span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:16,height:7,borderRadius:2,background:'#888',opacity:0.14,display:'inline-block'}}/>IC 95%</span>
                <span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:16,height:7,borderRadius:2,background:'#888',opacity:0.30,display:'inline-block'}}/>IC 80%</span>
                <span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:7,height:11,borderRadius:1.5,background:'#666',display:'inline-block'}}/>Media</span>
              </div>
              <LiveStatusBadge updatedAt={nowcastUpdated} source={nowcastSource} refreshIntervalSec={30} onRefresh={refreshNowcast}/>
            </div>
          </div>
          <MCChart rows={liveMC}/>
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
        Estimación en vivo · sondeos publicados (Wikipedia · electocracia.com) + D'Hondt provincial · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// ScenarioAnalysisPanel · render de la respuesta de Claude para un escenario
// Muestra factores favorables/desfavorables/sucesos pivote/nota analista
// ─────────────────────────────────────────────────────────────────────────
function ScenarioAnalysisPanel({ analysis }: { analysis: ScenarioAnalysis }) {
  const Section = ({
    title,
    items,
    color,
    icon,
  }: {
    title: string
    items: string[]
    color: string
    icon: string
  }) => {
    if (!items || items.length === 0) return null
    return (
      <div>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: color,
          textTransform: 'uppercase',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}>
          <span>{icon}</span>{title}
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((it, i) => (
            <li key={i} style={{
              fontSize: 12.5,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
              paddingLeft: 14,
              position: 'relative',
            }}>
              <span style={{
                position: 'absolute',
                left: 0,
                top: 7,
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: color,
              }}/>
              {it}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Section
          title="Factores favorables"
          items={analysis.factores_favorables}
          color="#16A34A"
          icon="✓"
        />
        <Section
          title="Factores desfavorables"
          items={analysis.factores_desfavorables}
          color="#DC2626"
          icon="✗"
        />
      </div>
      {analysis.sucesos_pivote && analysis.sucesos_pivote.length > 0 && (
        <Section
          title="Sucesos pivote · eventos que decidirían"
          items={analysis.sucesos_pivote}
          color="#9333EA"
          icon="◆"
        />
      )}
      {analysis.analista_note && (
        <div style={{
          marginTop: 4,
          padding: '12px 14px',
          borderRadius: 10,
          background: 'rgba(139,92,246,0.06)',
          border: '1px solid rgba(139,92,246,0.20)',
          fontSize: 12.5,
          color: 'var(--ink-2)',
          lineHeight: 1.5,
        }}>
          <div style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#7C3AED',
            textTransform: 'uppercase',
            marginBottom: 5,
          }}>
            NOTA DEL ANALISTA
          </div>
          {analysis.analista_note}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: -6 }}>
        {analysis.source === 'anthropic' && (
          <span style={{
            fontSize: 9.5,
            padding: '1px 6px',
            borderRadius: 4,
            background: 'rgba(16,185,129,0.15)',
            color: '#059669',
            border: '1px solid rgba(16,185,129,0.3)',
            letterSpacing: '0.02em',
          }}>
            Claude {analysis.model?.includes('haiku') ? 'Haiku' : 'Sonnet'}
          </span>
        )}
        {analysis.ms > 0 && (
          <span style={{ fontSize: 9.5, color: 'var(--ink-4)' }}>
            {analysis.ms < 1000 ? `${analysis.ms}ms` : `${(analysis.ms / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>
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
