'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ─────────────────────────────────────────────────────────────────────────
// Datos macro · 2026
// ─────────────────────────────────────────────────────────────────────────
type Dir = 'up' | 'down' | 'flat'
type Indic = {
  id: string
  l: string
  v: string
  unidad: string
  delta: string
  dir: Dir
  good: 'up' | 'down'   // qué dirección es buena
  c: string
  serie: number[]        // 12 puntos · evolución 12 meses
  fuente: string
  fecha: string
  comentario: string
}

const KPIS: Indic[] = [
  { id:'pib',     l:'PIB Q1 2026 (interanual)', v:'+2.7%',  unidad:'tasa interanual',     delta:'+0.3 pp',  dir:'up',   good:'up',   c:'#16A34A',
    serie:[2.0,2.1,2.2,2.2,2.3,2.4,2.5,2.6,2.6,2.7,2.7,2.7], fuente:'INE · CNT',  fecha:'29 abr',
    comentario:'Mejor de lo esperado · revisión al alza del 0.3 pp · sigue por encima de la media UE.' },
  { id:'paro',    l:'Paro EPA Q1',              v:'11.4%',  unidad:'tasa de paro',         delta:'−0.4 pp',  dir:'down', good:'down', c:'#16A34A',
    serie:[12.0,11.9,11.8,11.7,11.7,11.6,11.5,11.5,11.4,11.4,11.4,11.4], fuente:'INE · EPA', fecha:'25 abr',
    comentario:'En mínimos desde 2008 · paro juvenil aún en 24% · nuevo mínimo previsto en T2.' },
  { id:'ipc',     l:'IPC general',              v:'2.9%',   unidad:'tasa interanual',     delta:'−0.2 pp',  dir:'down', good:'down', c:'#16A34A',
    serie:[3.5,3.4,3.3,3.2,3.1,3.1,3.0,3.0,2.9,2.9,2.9,2.9], fuente:'INE',          fecha:'15 abr',
    comentario:'Subyacente 2.7% · alimentación se modera · vivienda y alquileres siguen tensionados.' },
  { id:'prima',   l:'Prima de riesgo',          v:'102 pb', unidad:'spread Bund 10Y',     delta:'+10 pb',   dir:'up',   good:'down', c:'#DC2626',
    serie:[82,85,88,92,95,98,94,90,93,96,98,102], fuente:'Bloomberg', fecha:'06 may',
    comentario:'Tres días seguidos > 100 pb · ruido político y déficit pesan · BdE alerta.' },
  { id:'euribor', l:'Euríbor 12M',              v:'2.84%',  unidad:'referencia hipot.',   delta:'−0.11 pp', dir:'down', good:'down', c:'#16A34A',
    serie:[2.95,2.92,2.90,2.88,2.87,2.86,2.86,2.85,2.85,2.84,2.84,2.84], fuente:'EBF',         fecha:'05 may',
    comentario:'Bajada continua · alivio para 4.2M de hipotecas variables · ahorro medio 80€/mes.' },
  { id:'deuda',   l:'Deuda pública / PIB',      v:'107.4%', unidad:'fin Q4 2025',         delta:'−0.7 pp',  dir:'down', good:'down', c:'#F97316',
    serie:[108.0,108.1,108.2,108.0,107.8,107.6,107.5,107.5,107.4,107.4,107.4,107.4], fuente:'BdE',         fecha:'30 abr',
    comentario:'Trayectoria descendente desde el pico 2020 · UE pide nueva senda fiscal.' },
  { id:'tipos',   l:'Tipos BCE (depo)',         v:'2.00%',  unidad:'facilidad depósito',  delta:'−0.25 pp', dir:'down', good:'down', c:'#16A34A',
    serie:[3.50,3.50,3.25,3.00,3.00,2.75,2.75,2.50,2.50,2.25,2.00,2.00], fuente:'BCE',          fecha:'17 abr',
    comentario:'Lagarde recorta · próxima reunión junio · mercados descuentan otro recorte.' },
  { id:'deficit', l:'Déficit / PIB',            v:'−2.9%',  unidad:'objetivo 2026',       delta:'+0.3 pp',  dir:'up',   good:'down', c:'#16A34A',
    serie:[-3.5,-3.4,-3.3,-3.2,-3.2,-3.1,-3.1,-3.0,-3.0,-2.9,-2.9,-2.9], fuente:'IGAE',          fecha:'30 abr',
    comentario:'Por debajo del 3% por primera vez desde 2019 · objetivo UE cumplido.' },
  { id:'ibex',    l:'IBEX 35',                  v:'11.240', unidad:'puntos',              delta:'+1.2%',     dir:'up',   good:'up',   c:'#16A34A',
    serie:[10900,11050,10980,11100,11080,11150,11200,11180,11220,11240,11240,11240], fuente:'BME',          fecha:'06 may',
    comentario:'8 sesiones consecutivas en verde · banca tira del índice · Iberdrola y Telefónica débiles.' },
  { id:'turismo', l:'Turistas internacionales', v:'94.5 M', unidad:'acum. 12 meses',      delta:'+8.4%',     dir:'up',   good:'up',   c:'#16A34A',
    serie:[78,82,84,86,88,90,91,92,93,94,94.2,94.5], fuente:'INE · Frontur', fecha:'01 may',
    comentario:'Récord histórico · gasto turístico +12% · presión sobre vivienda en zonas tensionadas.' },
  { id:'sentim',  l:'Sentim. CIS Gobierno',     v:'42/100', unidad:'panel mayo',          delta:'+1.8',      dir:'up',   good:'up',   c:'#16A34A',
    serie:[36,38,38,39,40,40,41,40,41,42,42,42], fuente:'CIS',          fecha:'02 may',
    comentario:'Recupera tras DANA · sigue por debajo de 50 · valoración Sánchez 3.8/10.' },
  { id:'salario', l:'Salario medio bruto',      v:'2.214 €',unidad:'mensual ene 2026',    delta:'+3.2%',     dir:'up',   good:'up',   c:'#16A34A',
    serie:[2150,2160,2168,2175,2182,2188,2192,2198,2202,2206,2210,2214], fuente:'INE · ETCL',  fecha:'29 abr',
    comentario:'Ganancia real +0.3 pp tras inflación · convenios firmados +3.5% medio.' },
]

// Comparativa UE
const COMPARATIVA = [
  { pais:'España',     pib:2.7, paro:11.4, ipc:2.9,  deuda:107.4, deficit:-2.9, c:'#1F4E8C', flag:'ES' },
  { pais:'Francia',    pib:1.2, paro: 7.4, ipc:2.0,  deuda:111.6, deficit:-5.4, c:'#3B82F6', flag:'FR' },
  { pais:'Italia',     pib:0.8, paro: 6.2, ipc:1.7,  deuda:138.3, deficit:-3.4, c:'#16A34A', flag:'IT' },
  { pais:'Alemania',   pib:0.4, paro: 3.5, ipc:2.2,  deuda: 63.6, deficit:-2.1, c:'#525258', flag:'DE' },
  { pais:'Portugal',   pib:1.9, paro: 6.8, ipc:2.4,  deuda: 92.1, deficit:-0.4, c:'#7DB94B', flag:'PT' },
  { pais:'Eurozona',   pib:1.1, paro: 6.5, ipc:2.4,  deuda: 88.0, deficit:-3.0, c:'#9333EA', flag:'EZ' },
]

// IPC por componentes
const IPC_COMP = [
  { cat:'Vivienda y alquiler',  val:5.8, peso:14.2 },
  { cat:'Alimentación',          val:4.2, peso:18.0 },
  { cat:'Restauración y hoteles',val:3.8, peso:12.4 },
  { cat:'Transporte',            val:3.1, peso:13.8 },
  { cat:'Salud',                 val:2.7, peso: 4.0 },
  { cat:'Educación',             val:2.4, peso: 1.5 },
  { cat:'Vestido y calzado',     val:2.1, peso: 5.5 },
  { cat:'Ocio y cultura',         val:1.6, peso: 6.4 },
  { cat:'Energía',               val:1.8, peso: 5.0 },
  { cat:'Comunicaciones',        val:0.9, peso: 3.0 },
]

// Vivienda
const VIVIENDA = [
  { l:'Precio vivienda',      v:'+8.4%', sub:'interanual Q1', c:'#DC2626', dir:'up'   },
  { l:'Esfuerzo hipotecario', v:'34.8%', sub:'% renta bruta', c:'#F97316', dir:'up'   },
  { l:'Compraventas',         v:'682K',  sub:'12 m móviles',  c:'#16A34A', dir:'up'   },
  { l:'Alquiler medio',       v:'13.4€', sub:'€/m² ago 2026', c:'#DC2626', dir:'up'   },
  { l:'Hipoteca media nueva', v:'162K€', sub:'capital medio', c:'#5B21B6', dir:'up'   },
  { l:'Stock vivienda nueva', v:'320K',  sub:'sin vender',     c:'#0EA5E9', dir:'down' },
]

// Mercados
const MERCADOS = [
  { l:'IBEX 35',         v:'11.240', delta:'+1.2%',    color:'#16A34A', serie:[10900,11050,10980,11100,11080,11150,11200,11180,11220,11240] },
  { l:'Bono 10Y',        v:'3.24%',  delta:'+0.04 pp', color:'#DC2626', serie:[3.18,3.20,3.19,3.22,3.21,3.23,3.20,3.22,3.24,3.24] },
  { l:'EUR/USD',         v:'1.084',  delta:'+0.6%',    color:'#16A34A', serie:[1.072,1.075,1.073,1.078,1.076,1.080,1.079,1.082,1.083,1.084] },
  { l:'Brent ($/barril)', v:'84.20', delta:'−1.1%',     color:'#0EA5E9', serie:[86.5,86.0,85.8,85.4,85.1,84.9,84.7,84.5,84.4,84.2] },
  { l:'Oro ($/onza)',    v:'2.430',  delta:'+0.8%',    color:'#F59E0B', serie:[2380,2390,2400,2395,2405,2410,2415,2420,2425,2430] },
  { l:'Bitcoin',         v:'68.4K',  delta:'+2.4%',    color:'#5B21B6', serie:[64,65,63,66,65,67,66,68,67,68.4] },
]

// Salarios y poder adquisitivo
const SALARIOS = [
  { l:'SMI 2026',           v:'1.184€', sub:'14 pagas · subida +5.0%',      c:'#1F4E8C' },
  { l:'Salario mediano',     v:'1.890€', sub:'mensual neto',                   c:'#16A34A' },
  { l:'Salario medio bruto', v:'2.214€', sub:'mensual · crece +3.2%',          c:'#16A34A' },
  { l:'Brecha salarial',    v:'17.4%',  sub:'mujer vs hombre · −1.2 pp',      c:'#DC2626' },
  { l:'Convenios firmados', v:'+3.5%',  sub:'subida media salarial 2026',     c:'#16A34A' },
  { l:'Pérdida de poder',   v:'−4.1%',  sub:'acumulada 2020-2025 vs IPC',     c:'#DC2626' },
]

// Calendario macro · próximas publicaciones
const CALENDARIO = [
  { fecha:'09/05/2026', org:'INE',    publi:'EPA T1 2026 detallada',          impacto:'ALTO',    color:'#DC2626' },
  { fecha:'15/05/2026', org:'INE',    publi:'IPC abril definitivo',           impacto:'MEDIO',   color:'#F97316' },
  { fecha:'22/05/2026', org:'BdE',    publi:'Proyecciones macroeconómicas',   impacto:'ALTO',    color:'#DC2626' },
  { fecha:'29/05/2026', org:'INE',    publi:'Avance PIB Q1 2026',              impacto:'CRÍTICO', color:'#DC2626' },
  { fecha:'30/05/2026', org:'IGAE',   publi:'Déficit AAPP abril',              impacto:'MEDIO',   color:'#F97316' },
  { fecha:'02/06/2026', org:'M.Trab.', publi:'Paro registrado mayo',          impacto:'ALTO',    color:'#DC2626' },
  { fecha:'05/06/2026', org:'INE',    publi:'IPI marzo · industria',           impacto:'MEDIO',   color:'#F97316' },
  { fecha:'12/06/2026', org:'BCE',    publi:'Reunión política monetaria',      impacto:'CRÍTICO', color:'#DC2626' },
]

// Sectores PIB · % del total
const SECTORES = [
  { sector:'Servicios',         pct:74.2, color:'#1F4E8C' },
  { sector:'Industria',          pct:14.8, color:'#5B21B6' },
  { sector:'Construcción',       pct: 6.2, color:'#F97316' },
  { sector:'Agricultura, pesca', pct: 2.6, color:'#16A34A' },
  { sector:'Energía',            pct: 2.2, color:'#0EA5E9' },
]

// Perfiles votante · sensibilidad económica
const VOTER_PROFILES = [
  { nombre:'Izquierda urbana joven',  renta:22.0, alquiler:'35%', hipoteca:'—',     ahorro:180,
    sens:{ euribor:3, inflacion:8, desempleo:9, impuestos:4, vivienda:10 }, c:'#D43F8D' },
  { nombre:'Centro pragmático',         renta:32.0, alquiler:'—',   hipoteca:'650€', ahorro:420,
    sens:{ euribor:8, inflacion:7, desempleo:6, impuestos:7, vivienda:6  }, c:'#7C3AED' },
  { nombre:'Derecha tradicional',       renta:38.0, alquiler:'—',   hipoteca:'820€', ahorro:680,
    sens:{ euribor:9, inflacion:5, desempleo:4, impuestos:10, vivienda:3 }, c:'#1F4E8C' },
  { nombre:'Voto rural',                renta:19.0, alquiler:'—',   hipoteca:'280€', ahorro:190,
    sens:{ euribor:5, inflacion:9, desempleo:8, impuestos:6, vivienda:4  }, c:'#F59E0B' },
  { nombre:'Joven abstencionista',     renta:16.0, alquiler:'42%', hipoteca:'—',     ahorro: 50,
    sens:{ euribor:2, inflacion:7, desempleo:10, impuestos:3, vivienda:10 },c:'#9E9E9E' },
]

// Ciclos electorales históricos
const HIST_CYCLES = [
  { elec:'1982', paro:16.3, ipc:14.4, pib: 1.2, gobernante:'UCD',  ganador:'PSOE', escanos:202, leccion:'Inflación + paro = derrota UCD · mayoría absoluta socialista' },
  { elec:'1996', paro:23.8, ipc: 3.6, pib: 2.4, gobernante:'PSOE', ganador:'PP',   escanos:156, leccion:'Prima alta + corrupción → alternancia bipartidista' },
  { elec:'2000', paro:14.1, ipc: 2.9, pib: 5.0, gobernante:'PP',   ganador:'PP',   escanos:183, leccion:'Auge económico = mayoría absoluta del PP' },
  { elec:'2011', paro:22.9, ipc: 3.1, pib:-0.8, gobernante:'PSOE', ganador:'PP',   escanos:186, leccion:'Rescate y desempleo = derrota histórica del PSOE' },
  { elec:'2015', paro:21.0, ipc: 0.5, pib: 3.4, gobernante:'PP',   ganador:'PP',   escanos:123, leccion:'Recuperación frágil = fragmentación 4 partidos' },
  { elec:'2019', paro:14.0, ipc: 0.7, pib: 2.0, gobernante:'PSOE', ganador:'PSOE', escanos:120, leccion:'Crecimiento moderado = bloqueo + repetición electoral' },
  { elec:'2023', paro:11.8, ipc: 3.5, pib: 2.5, gobernante:'PSOE', ganador:'PP',   escanos:137, leccion:'Inflación modera votos del Gobierno · empate técnico' },
]

// Impacto político de las variables
const IMPACTO_POLITICO = [
  { var:'IPC sube',          psoe:-1.2, pp:+0.8,  vox:+0.5, sumar:-0.3, c:'#DC2626' },
  { var:'Paro baja',         psoe:+1.5, pp:-0.6,  vox:-0.4, sumar:+0.2, c:'#16A34A' },
  { var:'PIB > 2.5%',         psoe:+1.0, pp:-0.5,  vox:-0.3, sumar:+0.4, c:'#16A34A' },
  { var:'Prima > 100 pb',    psoe:-0.8, pp:+0.5,  vox:+0.3, sumar:-0.2, c:'#DC2626' },
  { var:'Vivienda sube',     psoe:-1.5, pp:-0.2,  vox:+0.2, sumar:+1.0, c:'#DC2626' },
  { var:'Salario medio +3%', psoe:+0.8, pp:-0.4,  vox:-0.2, sumar:+0.5, c:'#16A34A' },
]

// ─────────────────────────────────────────────────────────────────────────
// Termómetro macro-político · score 0-100
// ─────────────────────────────────────────────────────────────────────────
function calcTermometro() {
  // Cada indicador suma o resta puntos según si va en buena o mala dirección
  let score = 50
  for (const k of KPIS) {
    const isGood = k.dir === k.good || k.dir === 'flat'
    score += isGood ? 4 : -3
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

export default function MacroPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const termometro = useMemo(() => calcTermometro(), [])
  const [tab, setTab] = useState<'comp' | 'mercados' | 'vivienda' | 'salarios' | 'calend' | 'votantes' | 'ciclos' | 'impacto'>('comp')

  // KPI seleccionado para mostrar serie y comentario
  const [kpiSel, setKpiSel] = useState<string>(KPIS[0].id)
  const kpiActivo = KPIS.find(k => k.id === kpiSel)!

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero · termómetro macro-político ───── */}
        <section style={{
          background:'linear-gradient(135deg,#0E2A1F 0%,#052016 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.7fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              MACRO-POLITICAL & ECONOMIC INTELLIGENCE
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              España crece +2.7% · prima en 102 pb <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>y déficit por debajo del 3%</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              12 indicadores con sparklines · comparativa UE · vivienda · mercados · salarios · calendario macro · perfiles de votante · ciclos electorales históricos · impacto político por variable.
            </p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <Termometro value={termometro}/>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', opacity:0.7, marginTop:6 }}>Termómetro macro-político</div>
            <div style={{ fontSize:10.5, opacity:0.65, marginTop:2 }}>{termometro >= 70 ? 'Coyuntura favorable' : termometro >= 55 ? 'Coyuntura mixta' : termometro >= 40 ? 'Tensiones crecientes' : 'Coyuntura adversa'}</div>
          </div>
        </section>

        {/* ───── KPIs principales (12) con sparklines ───── */}
        <section style={{ marginBottom:18 }}>
          <SectionHeader label="Indicadores clave" count={`${KPIS.length} variables · datos abril-mayo 2026`} accent="#0F766E"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {KPIS.map(k => {
              const isGood = (k.dir === k.good)
              const deltaCol = isGood ? '#16A34A' : '#DC2626'
              const isSelected = k.id === kpiSel
              return (
                <button key={k.id} onClick={() => setKpiSel(k.id)} style={{
                  background:'#fff', border:`1px solid ${isSelected ? k.c : '#ECECEF'}`, borderRadius:14,
                  padding:'14px 14px 10px', boxShadow: isSelected ? `0 0 0 3px ${k.c}22, 0 1px 3px rgba(0,0,0,0.04)` : '0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`3px solid ${k.c}`, textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                  transition:'box-shadow 200ms',
                }}>
                  <p style={{ margin:'0 0 6px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{k.l}</p>
                  <div style={{ display:'flex', alignItems:'baseline', gap:5, marginBottom:3 }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:k.c, letterSpacing:'-0.02em', lineHeight:1 }}>{k.v}</span>
                    <span style={{
                      marginLeft:'auto', fontSize:10.5, fontWeight:700, color:deltaCol,
                    }}>{k.dir === 'up' ? '▲' : k.dir === 'down' ? '▼' : '→'} {k.delta}</span>
                  </div>
                  <Sparkline data={k.serie} color={k.c} h={26}/>
                  <div style={{ fontSize:9.5, color:'#86868b', marginTop:5, lineHeight:1.3 }}>{k.unidad} · {k.fecha}</div>
                </button>
              )
            })}
          </div>
          {/* Detalle del KPI seleccionado */}
          <div style={{
            marginTop:10, background:'#fff', border:`1px solid ${kpiActivo.c}40`, borderRadius:14,
            padding:'14px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap',
          }}>
            <span style={{
              fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 8px', borderRadius:4,
              background:kpiActivo.c, color:'#fff',
            }}>{kpiActivo.l.toUpperCase()}</span>
            <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:kpiActivo.c }}>{kpiActivo.v}</span>
            <span style={{ fontSize:11, color:'#3a3a3d', flex:1, minWidth:200 }}>{kpiActivo.comentario}</span>
            <span style={{ fontSize:10, color:'#86868b', fontWeight:600 }}>Fuente: {kpiActivo.fuente}</span>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'comp',     label:'Comparativa UE',         count: COMPARATIVA.length },
            { k:'mercados', label:'Mercados',                count: MERCADOS.length },
            { k:'vivienda', label:'Vivienda',                count: VIVIENDA.length },
            { k:'salarios', label:'Salarios y poder adq.',  count: SALARIOS.length },
            { k:'calend',   label:'Calendario macro',        count: CALENDARIO.length },
            { k:'votantes', label:'Perfiles votante',       count: VOTER_PROFILES.length },
            { k:'ciclos',   label:'Ciclos históricos',      count: HIST_CYCLES.length },
            { k:'impacto',  label:'Impacto político',        count: IMPACTO_POLITICO.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border:'none', borderRadius:999, padding:'7px 14px',
                fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer',
                fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>
                {t.label} <span style={{ marginLeft:5, color: active ? '#0F766E' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── Tab · Comparativa UE ───── */}
        {tab === 'comp' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>España vs principales economías UE</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Datos comparados Q1 2026 · fuentes Eurostat e institutos nacionales</p>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['País','PIB %','Paro %','IPC %','Deuda/PIB','Déficit/PIB','Score relativo'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARATIVA.map((c, i) => {
                    // score sintético: pib alto + paro bajo + ipc cerca de 2 + deuda baja + déficit cerca de 0
                    const score = Math.round(50 + c.pib * 6 - c.paro * 2 - Math.abs(c.ipc - 2) * 4 - (c.deuda - 60) * 0.2 + (c.deficit) * 4)
                    const sCol = score >= 60 ? '#16A34A' : score >= 40 ? '#F97316' : '#DC2626'
                    return (
                      <tr key={c.pais} style={{ borderBottom:'1px solid #ECECEF', background: c.pais === 'España' ? '#FAFAFB' : i%2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ width:28, height:20, borderRadius:3, background:c.c, color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, letterSpacing:'0.06em', flexShrink:0 }}>{c.flag}</span>
                            <strong style={{ fontWeight: c.pais === 'España' ? 800 : 600, color:'#1d1d1f' }}>{c.pais}</strong>
                          </div>
                        </td>
                        <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', fontWeight:700, color: c.pib > 1.5 ? '#16A34A' : c.pib > 0.5 ? '#F97316' : '#DC2626' }}>+{c.pib.toFixed(1)}%</td>
                        <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', fontWeight:700, color: c.paro > 8 ? '#DC2626' : '#16A34A' }}>{c.paro.toFixed(1)}%</td>
                        <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', fontWeight:700, color: Math.abs(c.ipc - 2) < 0.5 ? '#16A34A' : '#F97316' }}>{c.ipc.toFixed(1)}%</td>
                        <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', fontWeight:700, color: c.deuda > 100 ? '#DC2626' : c.deuda > 80 ? '#F97316' : '#16A34A' }}>{c.deuda.toFixed(1)}%</td>
                        <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', fontWeight:700, color: c.deficit > -3 ? '#16A34A' : '#DC2626' }}>{c.deficit.toFixed(1)}%</td>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:7, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:80 }}>
                              <div style={{ width:`${Math.max(0, Math.min(100, score))}%`, height:'100%', background:sCol }}/>
                            </div>
                            <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:sCol, minWidth:24, textAlign:'right' }}>{score}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* IPC Components + Sectores PIB */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginTop:24 }}>
              <div>
                <h4 style={{ margin:'0 0 12px', fontFamily:'var(--font-display)', fontSize:13, fontWeight:600, letterSpacing:'-0.012em' }}>IPC por componentes · marzo 2026</h4>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[...IPC_COMP].sort((a,b) => b.val - a.val).map(c => {
                    const col = c.val >= 4 ? '#DC2626' : c.val >= 2.5 ? '#F97316' : '#16A34A'
                    return (
                      <div key={c.cat} style={{ display:'grid', gridTemplateColumns:'140px 1fr 50px 30px', gap:10, alignItems:'center' }}>
                        <span style={{ fontSize:11, color:'#3a3a3d', fontWeight:600 }}>{c.cat}</span>
                        <div style={{ height:9, background:'#F5F5F7', borderRadius:5, overflow:'hidden' }}>
                          <div style={{ width:`${(c.val / 7) * 100}%`, height:'100%', background:col, borderRadius:5 }}/>
                        </div>
                        <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:col, textAlign:'right' }}>{c.val.toFixed(1)}%</span>
                        <span style={{ fontSize:10, color:'#86868b', textAlign:'right' }}>{c.peso}</span>
                      </div>
                    )
                  })}
                  <div style={{ display:'grid', gridTemplateColumns:'140px 1fr 50px 30px', gap:10, alignItems:'center', marginTop:5, paddingTop:5, borderTop:'1px dashed #ECECEF' }}>
                    <span style={{ fontSize:9.5, color:'#86868b', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Variación</span>
                    <span/>
                    <span/>
                    <span style={{ fontSize:9, color:'#86868b', fontWeight:700, letterSpacing:'0.04em' }}>peso</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 style={{ margin:'0 0 12px', fontFamily:'var(--font-display)', fontSize:13, fontWeight:600, letterSpacing:'-0.012em' }}>Estructura del PIB por sectores</h4>
                <div style={{ display:'flex', height:32, borderRadius:6, overflow:'hidden', marginBottom:12 }}>
                  {SECTORES.map(s => (
                    <div key={s.sector} title={`${s.sector}: ${s.pct}%`} style={{
                      width:`${s.pct}%`, background:s.color,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontFamily:'var(--font-display)', fontWeight:700, fontSize:10.5,
                    }}>{s.pct >= 8 ? `${s.pct}%` : ''}</div>
                  ))}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {SECTORES.map(s => (
                    <div key={s.sector} style={{ display:'grid', gridTemplateColumns:'12px 1fr auto', gap:8, alignItems:'center' }}>
                      <span style={{ width:10, height:10, borderRadius:2, background:s.color, display:'inline-block' }}/>
                      <span style={{ fontSize:11.5, color:'#1d1d1f', fontWeight:600 }}>{s.sector}</span>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:s.color }}>{s.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ───── Tab · Mercados ───── */}
        {tab === 'mercados' && (
          <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
            {MERCADOS.map(m => {
              const isPos = m.delta.startsWith('+')
              return (
                <article key={m.l} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                  padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`3px solid ${m.color}`,
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                    <span style={{ fontSize:9.5, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{m.l}</span>
                    <span style={{ fontSize:10.5, fontWeight:700, color: isPos ? '#16A34A' : '#DC2626' }}>{isPos ? '▲' : '▼'} {m.delta}</span>
                  </div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:m.color, letterSpacing:'-0.022em', lineHeight:1, marginBottom:6 }}>{m.v}</div>
                  <Sparkline data={m.serie} color={m.color} h={32}/>
                </article>
              )
            })}
          </section>
        )}

        {/* ───── Tab · Vivienda ───── */}
        {tab === 'vivienda' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Mercado de la vivienda · 2026</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Precios, esfuerzo, hipotecas y oferta · fuentes BdE, Tinsa, INE y Fotocasa</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {VIVIENDA.map(v => (
                <div key={v.l} style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'14px 16px' }}>
                  <p style={{ margin:'0 0 5px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>{v.l}</p>
                  <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:v.c, letterSpacing:'-0.022em' }}>{v.v}</span>
                  </div>
                  <p style={{ margin:'5px 0 0', fontSize:10.5, color:'#6e6e73' }}>{v.sub}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── Tab · Salarios ───── */}
        {tab === 'salarios' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Salarios y poder adquisitivo</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>SMI, mediano, brecha de género y pérdida acumulada · fuentes INE, Hacienda y Trabajo</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {SALARIOS.map(s => (
                <div key={s.l} style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'14px 16px' }}>
                  <p style={{ margin:'0 0 5px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>{s.l}</p>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:s.c, letterSpacing:'-0.022em' }}>{s.v}</div>
                  <p style={{ margin:'5px 0 0', fontSize:10.5, color:'#6e6e73' }}>{s.sub}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── Tab · Calendario macro ───── */}
        {tab === 'calend' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Calendario macro · próximas publicaciones</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Datos económicos relevantes en los próximos 30 días</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {CALENDARIO.map((c, i) => (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'80px 1fr 100px 120px', gap:14, alignItems:'center',
                  padding:'12px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                  borderLeft:`3px solid ${c.color}`,
                }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:'#1d1d1f' }}>{c.fecha}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f' }}>{c.publi}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#3a3a3d' }}>{c.org}</div>
                  <span style={{
                    fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                    padding:'2px 8px', borderRadius:999, textAlign:'center',
                    background:`${c.color}15`, color:c.color, border:`1px solid ${c.color}40`,
                  }}>IMPACTO {c.impacto}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── Tab · Perfiles votante ───── */}
        {tab === 'votantes' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Perfiles de votante · sensibilidad económica</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Cómo afectan las variables económicas a cada arquetipo</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
              {VOTER_PROFILES.map(p => (
                <article key={p.nombre} style={{
                  background:'#FAFAFB', border:`1px solid ${p.c}40`, borderRadius:12,
                  padding:'14px 16px', borderLeft:`3px solid ${p.c}`,
                }}>
                  <div style={{ fontSize:13, fontWeight:700, color:p.c, marginBottom:10 }}>{p.nombre}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 10px', marginBottom:10, fontSize:11 }}>
                    <span style={{ color:'#6e6e73' }}>Renta</span>
                    <span style={{ color:'#1d1d1f', fontWeight:600, textAlign:'right' }}>{p.renta}K€</span>
                    <span style={{ color:'#6e6e73' }}>Alquiler</span>
                    <span style={{ color:'#1d1d1f', fontWeight:600, textAlign:'right' }}>{p.alquiler}</span>
                    <span style={{ color:'#6e6e73' }}>Hipoteca</span>
                    <span style={{ color:'#1d1d1f', fontWeight:600, textAlign:'right' }}>{p.hipoteca}</span>
                    <span style={{ color:'#6e6e73' }}>Ahorro/mes</span>
                    <span style={{ color:'#1d1d1f', fontWeight:600, textAlign:'right' }}>{p.ahorro}€</span>
                  </div>
                  <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>Sensibilidad (1-10)</div>
                  {Object.entries(p.sens).map(([k, v]) => (
                    <div key={k} style={{ display:'grid', gridTemplateColumns:'80px 1fr 18px', gap:6, alignItems:'center', marginBottom:3, fontSize:10.5 }}>
                      <span style={{ color:'#3a3a3d', textTransform:'capitalize' }}>{k}</span>
                      <div style={{ height:6, background:'#fff', borderRadius:3, overflow:'hidden', border:'1px solid #ECECEF' }}>
                        <div style={{ width:`${v * 10}%`, height:'100%', background:p.c, borderRadius:3 }}/>
                      </div>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:10.5, fontWeight:700, color:p.c, textAlign:'right' }}>{v}</span>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ───── Tab · Ciclos históricos ───── */}
        {tab === 'ciclos' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Ciclos electorales históricos · economía y resultado</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Lecciones empíricas de la relación entre coyuntura económica y voto</p>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['Elec.','Paro %','IPC %','PIB %','Gobernante','Ganador','Esc.','Lección'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HIST_CYCLES.map((c, i) => (
                    <tr key={c.elec} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:800, color:'#1d1d1f' }}>{c.elec}</td>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color: c.paro > 15 ? '#DC2626' : '#16A34A' }}>{c.paro}%</td>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color: c.ipc > 5 ? '#DC2626' : '#3a3a3d' }}>{c.ipc}%</td>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color: c.pib > 0 ? '#16A34A' : '#DC2626' }}>{c.pib > 0 ? '+' : ''}{c.pib}%</td>
                      <td style={{ padding:'9px 12px', color:'#3a3a3d' }}>{c.gobernante}</td>
                      <td style={{ padding:'9px 12px', fontWeight:700, color:'#1d1d1f' }}>{c.ganador}</td>
                      <td style={{ padding:'9px 12px', color:'#6e6e73' }}>{c.escanos}</td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'#3a3a3d' }}>{c.leccion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── Tab · Impacto político ───── */}
        {tab === 'impacto' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Impacto político por variable económica</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Variación estimada de intención de voto (pp) ante cada cambio · modelo Politeia</p>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                  {['Variable','PSOE','PP','VOX','Sumar','Tendencia neta'].map(h => (
                    <th key={h} style={{ textAlign:'center', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {IMPACTO_POLITICO.map((row, i) => {
                  const valencia = (row.psoe + row.sumar) - (row.pp + row.vox)
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'10px 12px', fontWeight:700, color:'#1d1d1f', textAlign:'left' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:row.c }}/>
                          {row.var}
                        </span>
                      </td>
                      <DeltaCell v={row.psoe} color="#E1322D"/>
                      <DeltaCell v={row.pp}   color="#1F4E8C"/>
                      <DeltaCell v={row.vox}  color="#5BA02E"/>
                      <DeltaCell v={row.sumar}color="#D43F8D"/>
                      <td style={{ padding:'10px 12px', textAlign:'center' }}>
                        <span style={{
                          fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                          padding:'3px 9px', borderRadius:999,
                          background: valencia > 0 ? '#16A34A15' : '#DC262615',
                          color: valencia > 0 ? '#16A34A' : '#DC2626',
                          border:`1px solid ${valencia > 0 ? '#16A34A40' : '#DC262640'}`,
                        }}>{valencia > 0 ? 'FAVORECE GOBIERNO' : 'FAVORECE OPOSICIÓN'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Macro-Political &amp; Economic · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function Termometro({ value }: { value: number }) {
  // Gauge semicircular
  const cx = 90, cy = 80, r = 60
  const t = Math.max(0, Math.min(1, value / 100))
  const angleEnd = Math.PI * t
  const xEnd = cx - r * Math.cos(angleEnd)
  const yEnd = cy - r * Math.sin(angleEnd)
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${xEnd} ${yEnd}`
  const arcBg = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const color = value >= 70 ? '#86EFAC' : value >= 55 ? '#FCD34D' : value >= 40 ? '#FDBA74' : '#FCA5A5'
  return (
    <div style={{ textAlign:'center' }}>
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path d={arcBg} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" strokeLinecap="round"/>
        <path d={arc} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"/>
        <circle cx={xEnd} cy={yEnd} r="6" fill={color}/>
      </svg>
      <div style={{ marginTop:-10, fontFamily:'var(--font-display)', fontSize:36, fontWeight:700, color, letterSpacing:'-0.024em', lineHeight:1 }}>{value}<span style={{ fontSize:18, color:'rgba(255,255,255,0.6)', fontWeight:600 }}>/100</span></div>
    </div>
  )
}

function SectionHeader({ label, count, accent }: { label: string, count: string, accent: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
      <h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#3a3a3d', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ width:3, height:14, borderRadius:2, background:accent, display:'inline-block' }}/>
        {label}
      </h2>
      <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>{count}</span>
    </div>
  )
}

function Sparkline({ data, color, h = 30 }: { data: number[], color: string, h?: number }) {
  const w = 100
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return `${x},${y}`
  }).join(' ')
  const area = `0,${h} ${pts} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:h, display:'block' }} preserveAspectRatio="none">
      <polyline points={area} fill={`${color}20`} stroke="none"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={w} cy={h - 4 - ((data[data.length - 1] - min) / range) * (h - 8)} r="2" fill={color}/>
    </svg>
  )
}

function DeltaCell({ v, color }: { v: number, color: string }) {
  const pos = v >= 0
  const txtColor = pos ? '#16A34A' : '#DC2626'
  return (
    <td style={{ padding:'10px 12px', textAlign:'center' }}>
      <div style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
        <span style={{ width:8, height:8, borderRadius:2, background:color, display:'inline-block' }}/>
        <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:txtColor }}>
          {pos ? '+' : ''}{v.toFixed(1)}
        </span>
      </div>
    </td>
  )
}
