'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────
type Componente = {
  id: string
  area: string
  nombre: string
  asignado: number
  ejecutado: number
  hitos: number
  hitosCumplidos: number
  ministerio: string
  color: string
}
type Perte = {
  id: string
  nombre: string
  fase: 'Activo' | 'En despliegue' | 'Cerrado'
  asignado: number
  ejecutado: number
  empresas: number
  empleos: string
  ministerio: string
  color: string
}
type Convocatoria = {
  id: string
  titulo: string
  organismo: string
  ccaa: string
  fondo: string
  importe: number
  beneficiarios: 'Empresas' | 'Pymes' | 'Investigadores' | 'Mixto' | 'Entidades sociales' | 'Administraciones'
  diasRestantes: number
  fechaCierre: string
  match: 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO'
}
type Hito = {
  fecha: string
  tipo: 'Desembolso' | 'Solicitud' | 'Evaluación' | 'Hito' | 'Inversión' | 'Reforma'
  importe?: number
  titulo: string
  estado: 'Pendiente' | 'Completado' | 'En revisión'
  detalle: string
}
type Beneficiario = {
  nombre: string
  tipo: 'Gran empresa' | 'Pyme' | 'CCAA' | 'Ayuntamiento' | 'Investigación' | 'Tercer sector'
  totalRecibido: number
  proyectos: number
  estado: 'Activo' | 'Cerrado'
  sectores: string[]
}

const FASE_COLOR: Record<string, string> = { 'Activo':'#16A34A', 'En despliegue':'#F97316', 'Cerrado':'#6e6e73' }
const ESTADO_HITO: Record<string, string> = { 'Pendiente':'#F97316', 'Completado':'#16A34A', 'En revisión':'#5B21B6' }
const TIPO_HITO_COLOR: Record<string, string> = {
  'Desembolso':'#16A34A', 'Solicitud':'#5B21B6', 'Evaluación':'#F97316',
  'Hito':'#0EA5E9', 'Inversión':'#1F4E8C', 'Reforma':'#DC2626',
}
const MATCH_COLOR: Record<string, string> = { 'CRÍTICO':'#DC2626', 'ALTO':'#F97316', 'MEDIO':'#EAB308', 'BAJO':'#0EA5E9' }

// ─────────────────────────────────────────────────────────────────────────
// Datos
// ─────────────────────────────────────────────────────────────────────────
const COMPONENTES: Componente[] = [
  { id:'c01', area:'I.   Movilidad sostenible',     nombre:'Plan choque movilidad sostenible',     asignado:13_200, ejecutado: 9_400, hitos:42, hitosCumplidos:35, ministerio:'Transportes',          color:'#1F4E8C' },
  { id:'c02', area:'II.  Vivienda',                  nombre:'Vivienda y regeneración urbana',       asignado: 6_820, ejecutado: 4_120, hitos:28, hitosCumplidos:21, ministerio:'Vivienda',             color:'#7C3AED' },
  { id:'c03', area:'III. Modernización industrial', nombre:'Transformación industrial y pyme',    asignado: 9_400, ejecutado: 7_280, hitos:35, hitosCumplidos:28, ministerio:'Industria',            color:'#F97316' },
  { id:'c04', area:'IV.  Cohesión social',           nombre:'Inclusión social y servicios',          asignado: 4_850, ejecutado: 3_120, hitos:24, hitosCumplidos:18, ministerio:'Derechos Sociales',    color:'#D43F8D' },
  { id:'c05', area:'V.   I+D+I',                    nombre:'Modernización del sistema científico',  asignado: 4_580, ejecutado: 3_580, hitos:32, hitosCumplidos:25, ministerio:'Ciencia',              color:'#5B21B6' },
  { id:'c06', area:'VI.  Energía',                  nombre:'Energías renovables y descarbonización', asignado: 8_440, ejecutado: 6_280, hitos:38, hitosCumplidos:31, ministerio:'Transición Ecológica', color:'#16A34A' },
  { id:'c07', area:'VII. Educación',                nombre:'Modernización del sistema educativo',   asignado: 4_120, ejecutado: 2_840, hitos:22, hitosCumplidos:18, ministerio:'Educación',            color:'#1F4E8C' },
  { id:'c08', area:'VIII.Sanidad',                  nombre:'Modernización sistema sanitario',       asignado: 1_680, ejecutado: 1_240, hitos:18, hitosCumplidos:14, ministerio:'Sanidad',              color:'#0EA5E9' },
  { id:'c09', area:'IX.  Transformación digital',   nombre:'Plan España Digital y conectividad',    asignado:11_580, ejecutado: 8_740, hitos:48, hitosCumplidos:38, ministerio:'Transformación Digital',color:'#0F766E' },
  { id:'c10', area:'X.   Justicia',                 nombre:'Modernización Justicia y AAPP',          asignado: 2_240, ejecutado: 1_180, hitos:18, hitosCumplidos:12, ministerio:'Justicia',             color:'#525258' },
  { id:'c11', area:'XI.  Hidrógeno verde',          nombre:'Hoja de ruta del hidrógeno renovable',  asignado: 1_555, ejecutado:   720, hitos:14, hitosCumplidos: 9, ministerio:'Transición Ecológica', color:'#16A34A' },
  { id:'c12', area:'XII. Almacenamiento',           nombre:'Estrategia de almacenamiento energ.',    asignado:   840, ejecutado:   420, hitos:11, hitosCumplidos: 7, ministerio:'Transición Ecológica', color:'#16A34A' },
]

const PERTES: Perte[] = [
  { id:'p01', nombre:'PERTE VEC · Vehículo eléctrico y conectado',           fase:'Activo',        asignado:4_295, ejecutado:2_840, empresas:144, empleos:'14.000+', ministerio:'Industria', color:'#1F4E8C' },
  { id:'p02', nombre:'PERTE Salud de Vanguardia',                            fase:'Activo',        asignado:1_469, ejecutado:  890, empresas: 96, empleos: '9.300+', ministerio:'Sanidad',   color:'#0EA5E9' },
  { id:'p03', nombre:'PERTE ERHA · Energías, hidrógeno y almacenamiento',    fase:'Activo',        asignado:6_920, ejecutado:4_240, empresas:182, empleos:'17.500+', ministerio:'Transición',color:'#16A34A' },
  { id:'p04', nombre:'PERTE Agroalimentario',                                fase:'En despliegue', asignado:1_002, ejecutado:  580, empresas: 72, empleos: '7.200+', ministerio:'Agricultura',color:'#F97316' },
  { id:'p05', nombre:'PERTE Nueva Economía de la Lengua',                    fase:'En despliegue', asignado:1_100, ejecutado:  320, empresas: 48, empleos: '5.400+', ministerio:'Cultura',   color:'#7C3AED' },
  { id:'p06', nombre:'PERTE Aeroespacial',                                   fase:'Activo',        asignado:2_193, ejecutado:1_420, empresas: 64, empleos: '8.800+', ministerio:'Industria', color:'#525258' },
  { id:'p07', nombre:'PERTE Economía circular',                              fase:'En despliegue', asignado:  492, ejecutado:  240, empresas: 48, empleos: '4.500+', ministerio:'Transición',color:'#16A34A' },
  { id:'p08', nombre:'PERTE Naval',                                          fase:'Activo',        asignado:1_460, ejecutado:  920, empresas: 38, empleos: '6.200+', ministerio:'Industria', color:'#0EA5E9' },
  { id:'p09', nombre:'PERTE Microelectrónica y semiconductores',             fase:'Activo',        asignado:12_250,ejecutado:5_840, empresas: 28, empleos: '4.800+', ministerio:'Transformación',color:'#0F766E' },
  { id:'p10', nombre:'PERTE Digitalización del agua',                        fase:'En despliegue', asignado:3_060, ejecutado:1_240, empresas: 42, empleos: '5.000+', ministerio:'Transición',color:'#0EA5E9' },
  { id:'p11', nombre:'PERTE Industria descarbonizada',                       fase:'En despliegue', asignado:3_140, ejecutado:1_680, empresas: 56, empleos: '7.800+', ministerio:'Industria', color:'#F97316' },
  { id:'p12', nombre:'PERTE Social y de los Cuidados',                       fase:'Activo',        asignado:2_492, ejecutado:1_320, empresas: 88, empleos:'12.000+', ministerio:'D. Sociales',color:'#D43F8D' },
]

const CONVOCATORIAS: Convocatoria[] = [
  { id:'cv1', titulo:'Subvenciones PERTE Microelectrónica · línea 2 (frontend)', organismo:'SETELECO · Min. Transformación Digital', ccaa:'Estatal', fondo:'PRTR · MRR', importe:1_240, beneficiarios:'Empresas',         diasRestantes:42, fechaCierre:'17/06/2026', match:'CRÍTICO' },
  { id:'cv2', titulo:'Ayudas Industria Manufacturera · transformación verde',     organismo:'Min. Industria y Turismo',                 ccaa:'Estatal', fondo:'PRTR · MRR', importe: 850, beneficiarios:'Empresas',         diasRestantes:28, fechaCierre:'04/06/2026', match:'CRÍTICO' },
  { id:'cv3', titulo:'Renovación flota vehículos eléctricos · MOVES IV',          organismo:'IDAE · Min. Transición Ecológica',         ccaa:'Estatal', fondo:'PRTR · MRR', importe: 280, beneficiarios:'Mixto',            diasRestantes:18, fechaCierre:'25/05/2026', match:'ALTO' },
  { id:'cv4', titulo:'Programa investigación COVID-X · respuesta pandemias',      organismo:'ISCIII · Min. Sanidad',                    ccaa:'Estatal', fondo:'PRTR · MRR', importe: 124, beneficiarios:'Investigadores',  diasRestantes: 9, fechaCierre:'16/05/2026', match:'MEDIO' },
  { id:'cv5', titulo:'Vivienda asequible · Plan Estatal 2026-2030 · 1ª convoc.',  organismo:'Min. Vivienda y Agenda Urbana',            ccaa:'Estatal', fondo:'PRTR · MRR', importe: 680, beneficiarios:'Administraciones',diasRestantes:54, fechaCierre:'30/06/2026', match:'CRÍTICO' },
  { id:'cv6', titulo:'Hidrógeno verde · Subasta capacidad 4ª edición',            organismo:'IDAE · Transición Ecológica',              ccaa:'Estatal', fondo:'PRTR · MRR', importe: 480, beneficiarios:'Empresas',         diasRestantes:39, fechaCierre:'15/06/2026', match:'ALTO' },
  { id:'cv7', titulo:'FEDER · Investigación e Innovación Andalucía',              organismo:'Junta Andalucía',                          ccaa:'Andalucía', fondo:'MFP · FEDER', importe: 380, beneficiarios:'Mixto',          diasRestantes:60, fechaCierre:'05/07/2026', match:'MEDIO' },
  { id:'cv8', titulo:'FSE+ · Empleo juvenil garantía',                            organismo:'SEPE · Ministerio Trabajo',                ccaa:'Estatal', fondo:'MFP · FSE+', importe: 720, beneficiarios:'Entidades sociales',diasRestantes:32, fechaCierre:'08/06/2026', match:'ALTO' },
  { id:'cv9', titulo:'CDTI · Misiones Ciencia · Innovación 2026',                organismo:'CDTI · Ministerio Ciencia',                ccaa:'Estatal', fondo:'PRTR · MRR', importe: 320, beneficiarios:'Empresas',         diasRestantes:14, fechaCierre:'21/05/2026', match:'ALTO' },
  { id:'cv10',titulo:'Plan Choque Modernización servicios sociales',              organismo:'Min. Derechos Sociales',                   ccaa:'Estatal', fondo:'PRTR · MRR', importe: 184, beneficiarios:'Administraciones',diasRestantes:46, fechaCierre:'22/06/2026', match:'MEDIO' },
]

const HITOS: Hito[] = [
  { fecha:'15/05/2026', tipo:'Solicitud',  importe:13_500, titulo:'5ª solicitud de pago al MRR',                                           estado:'Pendiente',  detalle:'Cumplimiento de 65 hitos · evaluación CE prevista junio 2026' },
  { fecha:'12/05/2026', tipo:'Hito',                       titulo:'Aprobación Reforma fiscal · capítulo IV',                                estado:'Pendiente',  detalle:'Hito CID-13 · vinculado al desembolso 5' },
  { fecha:'09/05/2026', tipo:'Inversión',                  titulo:'Cierre 2ª convocatoria PERTE Industria descarbonizada',                  estado:'Completado', detalle:'412 M€ adjudicados · 38 proyectos seleccionados' },
  { fecha:'05/05/2026', tipo:'Reforma',                    titulo:'Aprobación Ley Vivienda · ampliación zonas tensionadas',                 estado:'Completado', detalle:'Hito CID-08 cumplido · pendiente notificación CE' },
  { fecha:'25/06/2026', tipo:'Desembolso',  importe:13_500, titulo:'Recepción 5ª transferencia MRR',                                          estado:'Pendiente',  detalle:'Si CE valida positivamente la solicitud · transferencia a Hacienda' },
  { fecha:'15/04/2026', tipo:'Desembolso',  importe:11_040, titulo:'4ª transferencia MRR recibida',                                            estado:'Completado', detalle:'Total recibido España: 60.0 mil M€ · 73% del total' },
  { fecha:'02/05/2026', tipo:'Evaluación',                  titulo:'Evaluación intermedia MRR por la Comisión Europea',                       estado:'En revisión', detalle:'Auditoría sobre uso e impacto · informe esperado julio' },
]

const BENEFICIARIOS: Beneficiario[] = [
  { nombre:'SEAT-Volkswagen Group',     tipo:'Gran empresa',  totalRecibido: 580, proyectos: 6, estado:'Activo', sectores:['Movilidad','Industria'] },
  { nombre:'Iberdrola',                 tipo:'Gran empresa',  totalRecibido: 480, proyectos: 8, estado:'Activo', sectores:['Energía','I+D'] },
  { nombre:'Indra Sistemas',            tipo:'Gran empresa',  totalRecibido: 320, proyectos:12, estado:'Activo', sectores:['Defensa','TIC'] },
  { nombre:'Repsol',                    tipo:'Gran empresa',  totalRecibido: 285, proyectos: 5, estado:'Activo', sectores:['Energía','Hidrógeno'] },
  { nombre:'Stellantis',                tipo:'Gran empresa',  totalRecibido: 248, proyectos: 4, estado:'Activo', sectores:['Movilidad'] },
  { nombre:'Junta de Andalucía',        tipo:'CCAA',          totalRecibido: 412, proyectos:24, estado:'Activo', sectores:['Energía','Empleo'] },
  { nombre:'Generalitat de Catalunya',  tipo:'CCAA',          totalRecibido: 380, proyectos:22, estado:'Activo', sectores:['Industria','Vivienda','I+D'] },
  { nombre:'Ayuntamiento de Madrid',    tipo:'Ayuntamiento',  totalRecibido: 215, proyectos:18, estado:'Activo', sectores:['Movilidad','Vivienda'] },
  { nombre:'Telefónica',                tipo:'Gran empresa',  totalRecibido: 198, proyectos: 6, estado:'Activo', sectores:['TIC','Conectividad'] },
  { nombre:'CSIC · Investigación',      tipo:'Investigación', totalRecibido: 165, proyectos:48, estado:'Activo', sectores:['I+D'] },
  { nombre:'Acciona',                   tipo:'Gran empresa',  totalRecibido: 142, proyectos: 5, estado:'Activo', sectores:['Energía','Infraestructuras'] },
  { nombre:'Cáritas Española',          tipo:'Tercer sector', totalRecibido:  68, proyectos:14, estado:'Activo', sectores:['Servicios sociales'] },
]

const MFP_FONDOS = [
  { fondo:'FEDER',         desc:'Fondo Europeo de Desarrollo Regional', asignado:24_500, ejecutado:11_400, color:'#1F4E8C' },
  { fondo:'FSE+',          desc:'Fondo Social Europeo Plus',             asignado:11_200, ejecutado: 5_280, color:'#D43F8D' },
  { fondo:'FEADER',        desc:'Desarrollo Rural · PAC II Pilar',       asignado: 8_810, ejecutado: 4_120, color:'#16A34A' },
  { fondo:'FEMPA',         desc:'Marítimo, Pesca y Acuicultura',         asignado: 1_120, ejecutado:   420, color:'#0EA5E9' },
  { fondo:'FAMI',          desc:'Asilo, Migración e Integración',        asignado:   840, ejecutado:   312, color:'#7C3AED' },
  { fondo:'Fondo Cohesión',desc:'Cohesión territorial 2021-2027',        asignado: 4_120, ejecutado: 1_840, color:'#5B21B6' },
]

const PRTR_TOTAL_ASIG = 163_000
const PRTR_TOTAL_EJEC =  60_000
const PRTR_TRANSF     =  92_400
const PRTR_HITOS_T    =     595
const PRTR_HITOS_C    =     412

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function FondosEuropeosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [tab, setTab] = useState<'prtr' | 'pertes' | 'mfp' | 'convocatorias' | 'hitos' | 'beneficiarios'>('prtr')

  const totals = useMemo(() => {
    const totalAsig = COMPONENTES.reduce((s, c) => s + c.asignado, 0)
    const totalEjec = COMPONENTES.reduce((s, c) => s + c.ejecutado, 0)
    const proxCierre = CONVOCATORIAS.filter(c => c.diasRestantes <= 30).length
    const totalAsigPertes = PERTES.reduce((s, p) => s + p.asignado, 0)
    const totalEjecPertes = PERTES.reduce((s, p) => s + p.ejecutado, 0)
    return { totalAsig, totalEjec, proxCierre, totalAsigPertes, totalEjecPertes }
  }, [])

  const ejecPct = Math.round((PRTR_TOTAL_EJEC / PRTR_TOTAL_ASIG) * 100)
  const transfPct = Math.round((PRTR_TRANSF / PRTR_TOTAL_ASIG) * 100)
  const hitosPct = Math.round((PRTR_HITOS_C / PRTR_HITOS_T) * 100)

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#003399 0%,#001F5C 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
          position:'relative', overflow:'hidden',
        }}>
          {/* Estrellas UE decorativas */}
          <div style={{ position:'absolute', top:30, right:60, opacity:0.18, pointerEvents:'none', width:160, height:160 }}>
            {[0, 60, 120, 180, 240, 300].map(deg => (
              <div key={deg} style={{
                position:'absolute', top:80, left:80, width:14, height:14,
                transform:`translate(${Math.cos(deg * Math.PI / 180) * 60 - 7}px, ${Math.sin(deg * Math.PI / 180) * 60 - 7}px)`,
                background:'#FFCC00',
                clipPath:'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
              }}/>
            ))}
          </div>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              LICITACIONES Y CONTRATACIÓN PÚBLICA · FONDOS EUROPEOS Y PRTR
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              España · {(PRTR_TOTAL_ASIG/1000).toFixed(0)} mil M€ <em style={{ fontWeight:300, fontStyle:'italic', color:'#FFCC00' }}>del Plan de Recuperación</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              {ejecPct}% recibido por España ({(PRTR_TOTAL_EJEC/1000).toFixed(0)} mil M€) · {transfPct}% transferido a beneficiarios · {hitosPct}% de hitos CID cumplidos. Seguimiento integrado de PRTR (NextGen) y MFP 2021-2027.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, position:'relative' }}>
            <HeroKPI label="PRTR total"   value={`${(PRTR_TOTAL_ASIG/1000).toFixed(0)}B€`} accent="#FFCC00"/>
            <HeroKPI label="Recibido"      value={`${(PRTR_TOTAL_EJEC/1000).toFixed(0)}B€`} accent="#86EFAC"/>
            <HeroKPI label="Transferido"   value={`${(PRTR_TRANSF/1000).toFixed(0)}B€`}     accent="#FCD34D"/>
            <HeroKPI label="Hitos cumpl."  value={`${PRTR_HITOS_C}/${PRTR_HITOS_T}`}          accent="#7DD3FC"/>
          </div>
        </section>

        {/* ───── Snapshot · KPIs financieros ───── */}
        <section style={{ marginBottom:18 }}>
          <SectionHeader label="Snapshot Plan de Recuperación · cierre Q1-2026" count="MRR · NextGenerationEU" accent="#003399"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            <SKpi label="∑ Asignado España"      value={`${(PRTR_TOTAL_ASIG/1000).toFixed(0)}.0`} sub="mil M€" color="#003399"/>
            <SKpi label="Recibido del MRR"       value={`${(PRTR_TOTAL_EJEC/1000).toFixed(0)}.0`} sub="mil M€" delta={`${ejecPct}% · 5 desembolsos`} pos color="#16A34A"/>
            <SKpi label="Transferido benefic."   value={`${(PRTR_TRANSF/1000).toFixed(1)}`}        sub="mil M€" delta={`${transfPct}% comprometido`} pos color="#0F766E"/>
            <SKpi label="Pendiente de recibir"   value={`${((PRTR_TOTAL_ASIG - PRTR_TOTAL_EJEC)/1000).toFixed(0)}.0`} sub="mil M€" color="#F97316"/>
            <SKpi label="Hitos CID cumplidos"    value={`${hitosPct}%`} sub={`${PRTR_HITOS_C}/${PRTR_HITOS_T}`} pos color="#5B21B6"/>
            <SKpi label="Componentes seguidos"   value={String(COMPONENTES.length)} sub="de 30 totales" color="#7C3AED"/>
            <SKpi label="PERTEs estratégicos"    value={String(PERTES.length)}      sub="proyectos"     color="#DC2626"/>
            <SKpi label="Convocatorias abiertas" value={String(CONVOCATORIAS.length)} sub={`${totals.proxCierre} cierran 30d`} color="#EAB308"/>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'prtr',         label:'PRTR · Componentes',     count: COMPONENTES.length },
            { k:'pertes',       label:'PERTEs estratégicos',    count: PERTES.length },
            { k:'mfp',          label:'MFP 2021-2027',          count: MFP_FONDOS.length },
            { k:'convocatorias',label:'Convocatorias abiertas', count: CONVOCATORIAS.length },
            { k:'hitos',        label:'Hitos UE y desembolsos', count: HITOS.length },
            { k:'beneficiarios',label:'Beneficiarios',           count: BENEFICIARIOS.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: active ? '#fff' : 'transparent', color: active ? '#1d1d1f' : '#6e6e73',
                border:'none', borderRadius:999, padding:'7px 14px',
                fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer',
                fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>
                {t.label} <span style={{ marginLeft:5, color: active ? '#003399' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · PRTR Componentes ───── */}
        {tab === 'prtr' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:1080 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['#','Área','Componente','Ministerio','Asignado','Ejecutado','% Ejec.','Hitos CID'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPONENTES.map((c, i) => {
                    const pctEj = (c.ejecutado / c.asignado) * 100
                    const pctHi = (c.hitosCumplidos / c.hitos) * 100
                    return (
                      <tr key={c.id} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:800, color:'#1d1d1f' }}>{i+1}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:`${c.color}15`, color:c.color, border:`1px solid ${c.color}40` }}>{c.area}</span>
                        </td>
                        <td style={{ padding:'10px 12px', fontWeight:600, color:'#1d1d1f' }}>{c.nombre}</td>
                        <td style={{ padding:'10px 12px', color:'#3a3a3d', fontSize:11 }}>{c.ministerio}</td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:c.color }}>{c.asignado.toLocaleString('es-ES')}M€</td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:600, color:'#16A34A' }}>{c.ejecutado.toLocaleString('es-ES')}M€</td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                              <div style={{ width:`${pctEj}%`, height:'100%', background:c.color }}/>
                            </div>
                            <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:c.color, minWidth:32, textAlign:'right' }}>{pctEj.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ fontSize:10, fontWeight:700, color: pctHi >= 80 ? '#16A34A' : pctHi >= 60 ? '#F97316' : '#DC2626', fontFamily:'var(--font-display)' }}>
                            {c.hitosCumplidos}/{c.hitos} <span style={{ fontSize:9, color:'#86868b' }}>· {pctHi.toFixed(0)}%</span>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · PERTEs ───── */}
        {tab === 'pertes' && (
          <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))', gap:10 }}>
            {[...PERTES].sort((a,b) => b.asignado - a.asignado).map(p => {
              const pctEj = (p.ejecutado / p.asignado) * 100
              return (
                <article key={p.id} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                  padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`3px solid ${p.color}`,
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                    <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${FASE_COLOR[p.fase]}15`, color:FASE_COLOR[p.fase], border:`1px solid ${FASE_COLOR[p.fase]}40`,
                    }}>{p.fase.toUpperCase()}</span>
                    <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>{p.ministerio}</span>
                  </div>
                  <h3 style={{ margin:'0 0 8px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em', color:'#1d1d1f', lineHeight:1.3 }}>{p.nombre}</h3>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:5 }}>
                    <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>Ejecución</span>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:p.color }}>{p.ejecutado.toLocaleString('es-ES')}M€ <span style={{ color:'#86868b', fontWeight:600 }}>/ {p.asignado.toLocaleString('es-ES')}M€ · {pctEj.toFixed(0)}%</span></span>
                  </div>
                  <div style={{ height:7, background:'#F5F5F7', borderRadius:3, overflow:'hidden', marginBottom:10 }}>
                    <div style={{ width:`${pctEj}%`, height:'100%', background:p.color }}/>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    <Mini label="Empresas" value={String(p.empresas)} sub="participan" color={p.color}/>
                    <Mini label="Empleos"  value={p.empleos}          sub="generados"  color="#16A34A"/>
                  </div>
                </article>
              )
            })}
          </section>
        )}

        {/* ───── TAB · MFP ───── */}
        {tab === 'mfp' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Marco Financiero Plurianual 2021-2027 · fondos estructurales</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Asignación a España y nivel de ejecución por fondo · datos al cierre Q1-2026</p>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {MFP_FONDOS.map(f => {
                const pctEj = (f.ejecutado / f.asignado) * 100
                return (
                  <div key={f.fondo} style={{
                    display:'grid', gridTemplateColumns:'120px 1fr 200px', gap:14, alignItems:'center',
                    padding:'12px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                    borderLeft:`3px solid ${f.color}`,
                  }}>
                    <div>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:800, color:f.color }}>{f.fondo}</div>
                      <div style={{ fontSize:10, color:'#6e6e73', marginTop:2, lineHeight:1.3 }}>{f.desc}</div>
                    </div>
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:11 }}>
                        <span style={{ color:'#6e6e73' }}>Asignado: <strong style={{ color:'#1d1d1f' }}>{f.asignado.toLocaleString('es-ES')}M€</strong></span>
                        <span style={{ color:'#16A34A', fontWeight:700 }}>Ejec: {f.ejecutado.toLocaleString('es-ES')}M€</span>
                      </div>
                      <div style={{ height:10, background:'#fff', borderRadius:5, overflow:'hidden', border:'1px solid #ECECEF' }}>
                        <div style={{ width:`${pctEj}%`, height:'100%', background:f.color, borderRadius:5 }}/>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:f.color, lineHeight:1 }}>{pctEj.toFixed(0)}<span style={{ fontSize:14, color:'#6e6e73', fontWeight:600 }}>%</span></div>
                      <div style={{ fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginTop:3 }}>Ejecutado</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop:16, padding:'12px 14px', background:'#003399', borderRadius:10, color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'baseline', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.7 }}>∑ TOTAL MFP 2021-2027</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, marginTop:3 }}>{MFP_FONDOS.reduce((s,f) => s + f.asignado, 0).toLocaleString('es-ES')}<span style={{ fontSize:14, opacity:0.65 }}> M€</span></div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.7 }}>EJECUTADO</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, marginTop:3, color:'#FFCC00' }}>{Math.round((MFP_FONDOS.reduce((s,f) => s + f.ejecutado, 0) / MFP_FONDOS.reduce((s,f) => s + f.asignado, 0)) * 100)}<span style={{ fontSize:14, opacity:0.65 }}>%</span></div>
              </div>
            </div>
          </section>
        )}

        {/* ───── TAB · Convocatorias ───── */}
        {tab === 'convocatorias' && (
          <section style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[...CONVOCATORIAS].sort((a,b) => a.diasRestantes - b.diasRestantes).map(c => {
              const cierreColor = c.diasRestantes <= 14 ? '#DC2626' : c.diasRestantes <= 30 ? '#F97316' : '#16A34A'
              return (
                <article key={c.id} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                  padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`4px solid ${MATCH_COLOR[c.match]}`,
                  display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:14, alignItems:'center',
                }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:4, background:MATCH_COLOR[c.match], color:'#fff' }}>MATCH {c.match}</span>
                      <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:'#003399', color:'#fff' }}>{c.fondo.toUpperCase()}</span>
                      <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:600 }}>· {c.beneficiarios.toUpperCase()} · {c.ccaa}</span>
                    </div>
                    <h3 style={{ margin:'0 0 3px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{c.titulo}</h3>
                    <div style={{ fontSize:11, color:'#6e6e73' }}>{c.organismo}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#003399', lineHeight:1 }}>{c.importe}<span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>M€</span></div>
                    <div style={{ fontSize:9.5, color:'#86868b', marginTop:2 }}>importe convocatoria</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:cierreColor, lineHeight:1 }}>{c.diasRestantes}<span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>d</span></div>
                    <div style={{ fontSize:9.5, color:'#86868b', marginTop:2 }}>{c.fechaCierre}</div>
                  </div>
                  <button style={{
                    background:'#003399', color:'#fff', border:'none',
                    borderRadius:8, padding:'8px 16px',
                    fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
                  }}>Ver bases →</button>
                </article>
              )
            })}
          </section>
        )}

        {/* ───── TAB · Hitos ───── */}
        {tab === 'hitos' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600 }}>Calendario de hitos y desembolsos · UE-España</h3>
            <p style={{ margin:'0 0 18px', fontSize:11.5, color:'#6e6e73' }}>Solicitudes de pago, desembolsos del MRR, hitos CID y reformas vinculadas</p>
            <div style={{ position:'relative' }}>
              <div style={{ position:'absolute', left:55, top:6, bottom:6, width:2, background:'#ECECEF' }}/>
              {[...HITOS].sort((a,b) => parseDate(b.fecha).getTime() - parseDate(a.fecha).getTime()).map((h, i) => (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'70px 18px 1fr auto',
                  gap:8, alignItems:'flex-start',
                  padding: i === 0 ? '0 0 14px 0' : '14px 0',
                  borderTop: i === 0 ? 'none' : '1px solid #FAFAFB',
                }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:'#1d1d1f', textAlign:'right' }}>{h.fecha}</span>
                  <div style={{ position:'relative', width:18, height:18 }}>
                    <div style={{
                      width:14, height:14, borderRadius:'50%', background:'#fff',
                      border:`3px solid ${TIPO_HITO_COLOR[h.tipo]}`, boxShadow:`0 0 0 3px ${TIPO_HITO_COLOR[h.tipo]}22`,
                      position:'absolute', top:3, left:2, zIndex:1,
                    }}/>
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
                      <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:4, background:TIPO_HITO_COLOR[h.tipo], color:'#fff' }}>{h.tipo.toUpperCase()}</span>
                      <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:999, background:`${ESTADO_HITO[h.estado]}15`, color:ESTADO_HITO[h.estado], border:`1px solid ${ESTADO_HITO[h.estado]}40` }}>{h.estado.toUpperCase()}</span>
                    </div>
                    <h4 style={{ margin:'0 0 3px', fontFamily:'var(--font-display)', fontSize:13, fontWeight:600, color:'#1d1d1f', letterSpacing:'-0.012em' }}>{h.titulo}</h4>
                    <p style={{ margin:0, fontSize:11, color:'#3a3a3d', lineHeight:1.45 }}>{h.detalle}</p>
                  </div>
                  {h.importe && (
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#003399' }}>{(h.importe/1000).toFixed(1)}<span style={{ fontSize:10, color:'#6e6e73' }}>B€</span></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── TAB · Beneficiarios ───── */}
        {tab === 'beneficiarios' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:880 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['#','Beneficiario','Tipo','Total recibido','Proyectos','Sectores','Estado'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...BENEFICIARIOS].sort((a,b) => b.totalRecibido - a.totalRecibido).map((b, i) => {
                    const tipoColor = b.tipo === 'Gran empresa' ? '#1F4E8C' : b.tipo === 'Pyme' ? '#F97316' : b.tipo === 'CCAA' ? '#5B21B6' : b.tipo === 'Ayuntamiento' ? '#16A34A' : b.tipo === 'Investigación' ? '#0EA5E9' : '#D43F8D'
                    return (
                      <tr key={b.nombre} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:800, color:'#1d1d1f' }}>{i+1}</td>
                        <td style={{ padding:'10px 12px', fontWeight:600, color:'#1d1d1f' }}>{b.nombre}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:tipoColor, color:'#fff' }}>{b.tipo.toUpperCase()}</span>
                        </td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#003399' }}>{b.totalRecibido}M€</td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>{b.proyectos}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                            {b.sectores.map(s => (
                              <span key={s} style={{ fontSize:9, padding:'2px 7px', borderRadius:999, background:'#F5F5F7', color:'#3a3a3d', fontWeight:600 }}>{s}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{
                            fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                            padding:'2px 7px', borderRadius:999,
                            background: b.estado === 'Activo' ? '#16A34A15' : '#6e6e7315',
                            color:     b.estado === 'Activo' ? '#16A34A' : '#6e6e73',
                            border:    `1px solid ${b.estado === 'Activo' ? '#16A34A40' : '#6e6e7340'}`,
                          }}>{b.estado.toUpperCase()}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Fondos Europeos y PRTR · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value, accent }: { label:string, value:string, accent:string }) {
  return (
    <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:`1px solid ${accent}55` }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.018em' }}>{value}</div>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.75, marginTop:4, color:accent }}>{label}</div>
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

function SKpi({ label, value, sub, delta, pos, color }: { label:string, value:string, sub?:string, delta?:string, pos?:boolean, color:string }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:5, marginTop:4 }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color, letterSpacing:'-0.022em', lineHeight:1 }}>{value}</span>
        {sub && <span style={{ fontSize:10, color:'#86868b', fontWeight:600 }}>{sub}</span>}
      </div>
      {delta && (
        <div style={{ fontSize:10, fontWeight:700, color: pos ? '#16A34A' : color, marginTop:5 }}>
          {pos ? '▲ ' : ''}{delta}
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8, padding:'7px 9px', textAlign:'center' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:9, color:'#86868b', fontWeight:600, marginTop:3 }}>{sub}</div>
      <div style={{ fontSize:8.5, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginTop:3 }}>{label}</div>
    </div>
  )
}

function parseDate(s: string): Date {
  const [d, m, y] = s.split('/').map(Number)
  return new Date(y, m - 1, d)
}
