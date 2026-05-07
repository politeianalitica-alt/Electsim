'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────
type Sector = 'Sanidad' | 'Defensa' | 'Infraestructuras' | 'TIC' | 'Energía' | 'Educación' | 'Servicios sociales'
type Amenaza = 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA'

type Competidor = {
  id: string
  nombre: string
  cif: string
  color: string
  iniciales: string
  amenaza: Amenaza
  sectores: Sector[]
  paisMatriz: string
  empleados: string
  facturacion: string         // último ejercicio
  capitalizacion: string
  // Webs y fuentes
  web: string                  // sitio corporativo
  cnmv?: string                // ficha CNMV (si cotiza)
  linkedin?: string
  // Performance pública
  totalAdj12m: number          // M€
  numAdj12m: number
  winRate: number              // %
  bajaMedia: number            // %
  modificadosPct: number       // %
  // Personas
  ceo: string
  ceoCargo: string
  presidente: string
  // Posicionamiento
  fortalezas: string[]
  debilidades: string[]
  oportunidadesNos: string[]
  amenazasNos: string[]
  // Movements
  recientesAdj: { exp: string; titulo: string; importe: number; fecha: string }[]
  bidsActivos: number
  // Inteligencia
  equipoLicitaciones: string
  jefeCBD: string
}

// Helpers · enlaces a fuentes oficiales
const linkPlacsp = (exp: string) => `https://contrataciondelestado.es/wps/portal/lacasilla?expediente=${encodeURIComponent(exp)}`
const linkBOE    = (ref: string) => `https://www.boe.es/buscar/doc.php?id=${encodeURIComponent(ref)}`
const linkCNMV   = (cif: string) => `https://www.cnmv.es/portal/Consultas/EE/RegistrosOficiales.aspx?nif=${encodeURIComponent(cif)}`
const linkBORME  = (cif: string) => `https://www.borme.es/?empresa=${encodeURIComponent(cif)}`

type TipoInforme = 'Strategic Profile' | 'Due Diligence' | 'Win/Loss Analysis' | 'Bid Intelligence' | 'Executive Briefing'

type InformeGenerado = {
  id: string
  competidor: string
  tipo: TipoInforme
  fecha: string
  paginas: number
  autor: string
  estado: 'Generado' | 'En revisión' | 'Compartido' | 'Borrador'
}

const AMENAZA_C: Record<Amenaza, string> = {
  'CRÍTICA':'#DC2626', 'ALTA':'#F97316', 'MEDIA':'#EAB308', 'BAJA':'#0EA5E9',
}
const SECTOR_COLOR: Record<Sector, string> = {
  'Sanidad':'#0EA5E9', 'Defensa':'#525258', 'Infraestructuras':'#F97316',
  'TIC':'#5B21B6', 'Energía':'#16A34A', 'Educación':'#1F4E8C', 'Servicios sociales':'#D43F8D',
}

// ─────────────────────────────────────────────────────────────────────────
// Datos · 6 competidores principales
// ─────────────────────────────────────────────────────────────────────────
const COMPETIDORES: Competidor[] = [
  {
    id:'acs', nombre:'ACS Group', cif:'A28015890', color:'#1F4E8C', iniciales:'AC', amenaza:'CRÍTICA',
    sectores:['Infraestructuras','Energía','TIC'],
    paisMatriz:'España', empleados:'120K', facturacion:'38.2 mil M€', capitalizacion:'12.4 mil M€',
    web:'https://www.grupoacs.com/', cnmv:'https://www.cnmv.es/portal/Consultas/EE/InformacionEntidadCotizada.aspx?nif=A28015890', linkedin:'https://www.linkedin.com/company/grupo-acs/',
    totalAdj12m:1820, numAdj12m:284, winRate:34.8, bajaMedia:5.2, modificadosPct:14,
    ceo:'Juan Santamaría', ceoCargo:'Consejero Delegado',
    presidente:'Florentino Pérez',
    fortalezas:[
      'Mayor adjudicador del mercado · presencia sectorial cruzada',
      'Capacidad financiera y experiencia internacional',
      'Equipo de licitaciones de >180 personas',
      'Histórico ganador con la administración estatal',
    ],
    debilidades:[
      'Muy dependiente del mercado nacional · concentración',
      'Modificados elevados (14%) · vigilancia política creciente',
      'Procesos de licitación lentos en proyectos pequeños',
    ],
    oportunidadesNos:[
      'Atacar lotes pequeños donde ACS no participa',
      'Ofrecer agilidad en procedimientos negociados',
      'Capitalizar percepción de ACS como «el de siempre»',
    ],
    amenazasNos:[
      'Capacidad de presentar ofertas técnicas muy completas',
      'Influencia política bipartidista demostrada',
      'Recursos financieros para resistir bajas agresivas',
    ],
    recientesAdj:[
      { exp:'2026/HM-AVE-014', titulo:'AVE Madrid-Sevilla mantenimiento', importe:387.9, fecha:'02/05/2026' },
      { exp:'2026/MIN-DEF-FCH', titulo:'Mantenimiento BB.AA.', importe:124.8, fecha:'18/04/2026' },
    ],
    bidsActivos:42,
    equipoLicitaciones:'180 personas · Madrid + 4 oficinas regionales',
    jefeCBD:'Carlos Pérez de Bricio · Director General Adjunto',
  },
  {
    id:'ferrovial', nombre:'Ferrovial', cif:'A81939209', color:'#16A34A', iniciales:'FE', amenaza:'ALTA',
    sectores:['Infraestructuras','Servicios sociales','Energía'],
    paisMatriz:'Países Bajos', empleados:'82K', facturacion:'9.1 mil M€', capitalizacion:'28.4 mil M€',
    web:'https://www.ferrovial.com/', cnmv:'https://www.cnmv.es/portal/Consultas/EE/InformacionEntidadCotizada.aspx?nif=A81939209', linkedin:'https://www.linkedin.com/company/ferrovial/',
    totalAdj12m:1240, numAdj12m:198, winRate:28.4, bajaMedia:7.4, modificadosPct:9,
    ceo:'Rafael del Pino', ceoCargo:'Presidente',
    presidente:'Rafael del Pino',
    fortalezas:[
      'Operaciones internacionales sólidas (USA, UK, Canadá)',
      'Concesiones de larga duración rentables',
      'Imagen de innovación · proyectos sostenibles',
      'Ratings crediticios excelentes',
    ],
    debilidades:[
      'Salida fiscal a Países Bajos · ruido político persistente',
      'Pérdida de cuota en obra pública española',
      'Tensión histórica con el Gobierno Sánchez',
    ],
    oportunidadesNos:[
      'Aprovechar narrativa de «empresa que se fue de España»',
      'Atacar concesiones nacionales donde no compite',
      'Posicionarnos como alternativa local en grandes obras',
    ],
    amenazasNos:[
      'Capacidad técnica en grandes infraestructuras',
      'Modelo de concesiones rentable a largo plazo',
      'Acceso a financiación internacional barata',
    ],
    recientesAdj:[
      { exp:'2026/AYT-MAD-T2',  titulo:'Concesión M40 norte ampliación', importe:215.6, fecha:'24/04/2026' },
      { exp:'2026/MIN-CARRETER',titulo:'A-3 Madrid-Valencia mantenim.',  importe:182.4, fecha:'10/04/2026' },
    ],
    bidsActivos:28,
    equipoLicitaciones:'140 personas · matriz Países Bajos · oficina Madrid',
    jefeCBD:'Ernesto López Mozo · CDO',
  },
  {
    id:'indra', nombre:'Indra Sistemas', cif:'A28599033', color:'#525258', iniciales:'IN', amenaza:'CRÍTICA',
    sectores:['Defensa','TIC'],
    paisMatriz:'España', empleados:'58K', facturacion:'4.85 mil M€', capitalizacion:'4.2 mil M€',
    web:'https://www.indracompany.com/', cnmv:'https://www.cnmv.es/portal/Consultas/EE/InformacionEntidadCotizada.aspx?nif=A28599033', linkedin:'https://www.linkedin.com/company/indra/',
    totalAdj12m:1080, numAdj12m:212, winRate:42.4, bajaMedia:3.5, modificadosPct:18,
    ceo:'José Vicente de los Mozos', ceoCargo:'Consejero Delegado',
    presidente:'Marc Murtra',
    fortalezas:[
      'Hegemonía en defensa y ciberdefensa (radar, simuladores, electrónica)',
      'Estado como accionista (SEPI 28%) · acceso preferente',
      'Capacidades tecnológicas únicas en España',
      'Posicionamiento en programas OTAN y FCAS',
    ],
    debilidades:[
      'Modificados muy elevados (18%) · cuestionados políticamente',
      'Bajo margen y alta exposición a contratos públicos',
      'Tensiones internas tras cambio de presidencia 2024',
      'Dependencia del Ministerio de Defensa',
    ],
    oportunidadesNos:[
      'Atacar lotes TIC no defensa donde Indra no es fuerte',
      'Especializarnos en proyectos pequeños y medianos',
      'Posicionarnos como ágiles frente a su lentitud',
    ],
    amenazasNos:[
      'Pliegos diseñados a su medida en defensa',
      'Capacidad técnica difícilmente replicable',
      'Influencia institucional muy alta',
    ],
    recientesAdj:[
      { exp:'2026/MIN-DEF-RAD', titulo:'Sistema radar costero · 4ª fase', importe:266.4, fecha:'28/04/2026' },
      { exp:'2026/MIN-DEF-SIM', titulo:'Simuladores Eurofighter',          importe: 84.2, fecha:'15/04/2026' },
    ],
    bidsActivos:35,
    equipoLicitaciones:'95 personas · sede Alcobendas',
    jefeCBD:'Cristina Real · Directora Defensa y Seguridad',
  },
  {
    id:'sacyr', nombre:'Sacyr Construcción', cif:'A83829658', color:'#F97316', iniciales:'SA', amenaza:'ALTA',
    sectores:['Infraestructuras','Energía'],
    paisMatriz:'España', empleados:'48K', facturacion:'4.5 mil M€', capitalizacion:'2.8 mil M€',
    web:'https://www.sacyr.com/', cnmv:'https://www.cnmv.es/portal/Consultas/EE/InformacionEntidadCotizada.aspx?nif=A83829658', linkedin:'https://www.linkedin.com/company/sacyr/',
    totalAdj12m:920, numAdj12m:168, winRate:26.5, bajaMedia:6.8, modificadosPct:11,
    ceo:'Manuel Manrique', ceoCargo:'Presidente',
    presidente:'Manuel Manrique',
    fortalezas:[
      'Especialización en infraestructuras complejas y agua',
      'Relación estrecha con Generalitat Valenciana',
      'Cartera en LATAM creciendo (Chile, Colombia)',
      'Capacidad de ejecución en emergencias (DANA)',
    ],
    debilidades:[
      'Endeudamiento elevado vs comparables',
      'Litigios pendientes en Italia · Pedemontana',
      'Cultura corporativa más conservadora',
    ],
    oportunidadesNos:[
      'Atacar mercados donde no tiene presencia (Cataluña, Norte)',
      'Capitalizar nuestro portfolio internacional',
      'Especializarnos en contratos < 50M€ ágiles',
    ],
    amenazasNos:[
      'Acceso preferente a contratos de emergencia · DANA',
      'Especialización técnica en hidráulica',
      'Capacidad de movilización rápida',
    ],
    recientesAdj:[
      { exp:'2026/VAL-DANA-EMG', titulo:'Reconstrucción L\'Horta Sud', importe:142.0, fecha:'10/04/2026' },
      { exp:'2026/MAD-HOS-015',  titulo:'Hospital Vallecas Sur',       importe:319.2, fecha:'25/04/2026' },
    ],
    bidsActivos:24,
    equipoLicitaciones:'82 personas · Madrid + Las Rozas',
    jefeCBD:'Pedro Sagües · Director General Construcción',
  },
  {
    id:'fcc', nombre:'FCC Aqualia', cif:'A26019992', color:'#0EA5E9', iniciales:'FC', amenaza:'MEDIA',
    sectores:['Infraestructuras','Servicios sociales'],
    paisMatriz:'España', empleados:'42K', facturacion:'7.2 mil M€', capitalizacion:'4.6 mil M€',
    web:'https://www.fcc.es/', cnmv:'https://www.cnmv.es/portal/Consultas/EE/InformacionEntidadCotizada.aspx?nif=A26019992', linkedin:'https://www.linkedin.com/company/fcc-group/',
    totalAdj12m:740, numAdj12m:188, winRate:25.2, bajaMedia:6.6, modificadosPct:8,
    ceo:'Pablo Colio', ceoCargo:'Consejero Delegado',
    presidente:'Esther Alcocer Koplowitz',
    fortalezas:[
      'Líder en gestión integral del agua y residuos',
      'Presencia en 1.700 municipios españoles',
      'Cartera estable de servicios públicos',
      'Buena imagen ambiental y ESG',
    ],
    debilidades:[
      'Crecimiento moderado · cartera saturada',
      'Litigios pendientes con ayuntamientos',
      'Menos diversificada sectorialmente',
    ],
    oportunidadesNos:[
      'Atacar mercados de obra civil donde no entra',
      'Especializarnos en emergencias ambientales',
      'Capitalizar diversificación frente a su nicho',
    ],
    amenazasNos:[
      'Contratos de larga duración blindados',
      'Conocimiento profundo del cliente municipal',
      'Capacidad de atención ininterrumpida 24/7',
    ],
    recientesAdj:[
      { exp:'2026/MUR-AGUA-005', titulo:'Desaladoras Costa Cálida', importe:184.5, fecha:'05/04/2026' },
      { exp:'2026/AYT-BCN-RES',  titulo:'Limpieza viaria Barcelona', importe: 92.4, fecha:'22/03/2026' },
    ],
    bidsActivos:31,
    equipoLicitaciones:'68 personas · Madrid + Sevilla',
    jefeCBD:'Vicente Maín · Director General Comercial',
  },
  {
    id:'acciona', nombre:'Acciona', cif:'A95346790', color:'#5B21B6', iniciales:'AN', amenaza:'ALTA',
    sectores:['Infraestructuras','Energía'],
    paisMatriz:'España', empleados:'40K', facturacion:'17.0 mil M€', capitalizacion:'6.8 mil M€',
    web:'https://www.acciona.com/', cnmv:'https://www.cnmv.es/portal/Consultas/EE/InformacionEntidadCotizada.aspx?nif=A95346790', linkedin:'https://www.linkedin.com/company/acciona/',
    totalAdj12m:680, numAdj12m:124, winRate:32.4, bajaMedia:8.2, modificadosPct:7,
    ceo:'José Manuel Entrecanales', ceoCargo:'Presidente',
    presidente:'José Manuel Entrecanales',
    fortalezas:[
      'Líder en renovables (gen. eólica e hidroeléctrica)',
      'Imagen ESG y sostenibilidad muy potente',
      'Presencia internacional rentable (Australia, USA)',
      'Carteras complementarias (energía + construcción)',
    ],
    debilidades:[
      'Tensión interna por escisión Acciona Energía 2021',
      'Litigios fiscales pendientes (caso Bestinver)',
      'Margen de obra civil España bajo',
    ],
    oportunidadesNos:[
      'Atacar concursos donde su precio es alto',
      'Especializarnos en construcción tradicional',
      'Posicionarnos como alternativa local',
    ],
    amenazasNos:[
      'Capacidad técnica en renovables y agua',
      'Acceso a financiación verde barata',
      'Imagen reputacional fuerte',
    ],
    recientesAdj:[
      { exp:'2026/MAD-HOS-015',  titulo:'Hospital Vallecas Sur (UTE)', importe:319.2, fecha:'25/04/2026' },
      { exp:'2026/IDAE-RENOV',   titulo:'Subasta renovables 2026',     importe:215.0, fecha:'18/04/2026' },
    ],
    bidsActivos:18,
    equipoLicitaciones:'72 personas · Madrid + Pamplona',
    jefeCBD:'Bosco Quinzaños · Director General Construcción',
  },
]

// Win/Loss histórico (head-to-head)
const WIN_LOSS = [
  { exp:'2026/HM-AVE-014',    titulo:'AVE Madrid-Sevilla',          ganador:'ACS',         nuestro:'2º',  bajaGanador:5.96, bajaNuestra:8.4 },
  { exp:'2026/MIN-DEF-RAD',   titulo:'Radar costero · fase 3',      ganador:'Indra',       nuestro:'No',  bajaGanador:0.6,  bajaNuestra:0    },
  { exp:'2026/MAD-HOS-015',   titulo:'Hospital Vallecas Sur',       ganador:'Acciona+Sacyr',nuestro:'3º', bajaGanador:2.68, bajaNuestra:4.1  },
  { exp:'2026/AND-ESC-022',   titulo:'Comedores Andalucía',         ganador:'Serunion+',   nuestro:'GANADOR (lote 2)', bajaGanador:4.5,  bajaNuestra:4.5 },
  { exp:'2026/IDAE-H2V-04',   titulo:'Hidrógeno verde · 4ª subasta', ganador:'Iberdrola+Repsol', nuestro:'2º', bajaGanador:10.3, bajaNuestra:11.2 },
  { exp:'2026/MUR-AGUA-005',  titulo:'Desaladoras Costa Cálida',    ganador:'FCC Aqualia', nuestro:'No',  bajaGanador:0.27, bajaNuestra:0    },
  { exp:'2026/CAT-EDU-031',   titulo:'Renovación digital escuelas Cataluña', ganador:'HP Iberia',  nuestro:'GANADOR', bajaGanador:10.4, bajaNuestra:10.4 },
  { exp:'2026/AYT-MAD-LIM',   titulo:'Limpieza Madrid Centro',      ganador:'FCC',         nuestro:'4º',  bajaGanador:6.56, bajaNuestra:5.2  },
]

// Informes pre-generados Politeia
const INFORMES_HISTORICO: InformeGenerado[] = [
  { id:'rep-001', competidor:'ACS Group',         tipo:'Strategic Profile',  fecha:'05/05/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Compartido' },
  { id:'rep-002', competidor:'Indra Sistemas',    tipo:'Bid Intelligence',   fecha:'04/05/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Generado' },
  { id:'rep-003', competidor:'Ferrovial',         tipo:'Win/Loss Analysis',  fecha:'02/05/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Compartido' },
  { id:'rep-004', competidor:'Sacyr Construcción',tipo:'Due Diligence',      fecha:'30/04/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'En revisión' },
  { id:'rep-005', competidor:'FCC Aqualia',       tipo:'Executive Briefing', fecha:'28/04/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Compartido' },
  { id:'rep-006', competidor:'Acciona',           tipo:'Strategic Profile',  fecha:'25/04/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Compartido' },
  { id:'rep-007', competidor:'ACS Group',         tipo:'Bid Intelligence',   fecha:'22/04/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Generado' },
  { id:'rep-008', competidor:'Indra Sistemas',    tipo:'Strategic Profile',  fecha:'18/04/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Compartido' },
]

const ESTADO_REP_COLOR = {
  'Compartido':'#16A34A', 'Generado':'#5B21B6', 'En revisión':'#F97316', 'Borrador':'#6e6e73',
} as Record<string, string>

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function CompetidoresPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [selectedId, setSelectedId] = useState(COMPETIDORES[0].id)
  const [tab, setTab] = useState<'perfil' | 'winloss' | 'pricing' | 'historico'>('perfil')
  const selected = useMemo(() => COMPETIDORES.find(c => c.id === selectedId)!, [selectedId])

  // Estado del generador de informes
  const [tipoInforme, setTipoInforme] = useState<TipoInforme>('Strategic Profile')
  const [longitud, setLongitud] = useState<'nota' | 'informe'>('nota')   // nota=2pg · informe=10pg
  const [generando, setGenerando] = useState(false)
  const [generado, setGenerado] = useState(false)
  const numPaginas = longitud === 'nota' ? 2 : 10

  function handleGenerar() {
    setGenerando(true)
    setGenerado(false)
    setTimeout(() => { setGenerando(false); setGenerado(true) }, 1400)
  }

  // Cambia competidor → resetea generación
  function handleSelect(id: string) {
    setSelectedId(id)
    setGenerado(false)
  }

  const totals = useMemo(() => {
    const totalAdj = COMPETIDORES.reduce((s, c) => s + c.totalAdj12m, 0)
    const numCriticos = COMPETIDORES.filter(c => c.amenaza === 'CRÍTICA').length
    const numAltos = COMPETIDORES.filter(c => c.amenaza === 'ALTA').length
    const ourWins = WIN_LOSS.filter(w => w.nuestro.includes('GANADOR')).length
    const ourPart = WIN_LOSS.length
    return { total: COMPETIDORES.length, totalAdj, numCriticos, numAltos, winRate: Math.round((ourWins / ourPart) * 100), reports: INFORMES_HISTORICO.length }
  }, [])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#312E81 0%,#1E1B4B 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              LICITACIONES Y CONTRATACIÓN PÚBLICA · INTELIGENCIA COMPETITIVA
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              {totals.total} competidores · {totals.totalAdj.toLocaleString('es-ES')} M€ <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>en juego</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              {totals.numCriticos} amenazas críticas · {totals.numAltos} altas · win rate propio <strong style={{ color:'#86EFAC' }}>{totals.winRate}%</strong>. Generador de informes inteligentes Politeia · perfiles · win/loss · pricing · histórico.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            <HeroKPI label="Compet."  value={String(totals.total)}      accent="#A5B4FC"/>
            <HeroKPI label="Críticos" value={String(totals.numCriticos)} accent="#FCA5A5"/>
            <HeroKPI label="Win rate" value={`${totals.winRate}%`}        accent="#86EFAC"/>
            <HeroKPI label="Informes" value={String(totals.reports)}       accent="#FDE68A"/>
          </div>
        </section>

        {/* ───── Selector de competidores ───── */}
        <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:8, marginBottom:18 }}>
          {COMPETIDORES.map(c => {
            const active = c.id === selectedId
            return (
              <button key={c.id} onClick={() => handleSelect(c.id)} style={{
                textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                background:'#fff', border:`1px solid ${active ? c.color : '#ECECEF'}`,
                borderRadius:12, padding:'10px 12px',
                boxShadow: active ? `0 0 0 3px ${c.color}22` : '0 1px 3px rgba(0,0,0,0.04)',
                borderLeft:`4px solid ${c.color}`,
                display:'grid', gridTemplateColumns:'auto 1fr auto', gap:9, alignItems:'center',
                transition:'box-shadow 200ms',
              }}>
                <div style={{
                  width:36, height:36, borderRadius:8, background:c.color, color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, letterSpacing:'-0.01em',
                }}>{c.iniciales}</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.nombre}</div>
                  <div style={{ fontSize:9.5, color:'#6e6e73', fontWeight:600 }}>{c.totalAdj12m}M€ · 12m</div>
                </div>
                <span style={{
                  fontSize:8.5, fontWeight:800, letterSpacing:'0.08em',
                  padding:'2px 6px', borderRadius:4,
                  background:AMENAZA_C[c.amenaza], color:'#fff', whiteSpace:'nowrap',
                }}>{c.amenaza}</span>
              </button>
            )
          })}
        </section>

        {/* ───── Enlaces a fuentes oficiales del competidor seleccionado ───── */}
        <section style={{
          background:'#fff', border:`1px solid ${selected.color}30`, borderRadius:14,
          padding:'12px 16px', marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
        }}>
          <span style={{ fontSize:9.5, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>Fuentes oficiales · {selected.nombre}:</span>
          <SourceLink href={selected.web}                        label="Web corporativa"     color={selected.color}/>
          {selected.cnmv     && <SourceLink href={selected.cnmv}     label="Ficha CNMV"          color="#1F4E8C"/>}
          <SourceLink href={linkBORME(selected.cif)}              label={`BORME · ${selected.cif}`} color="#5B21B6"/>
          <SourceLink href={`https://contrataciondelestado.es/wps/portal/lacasilla?proveedor=${encodeURIComponent(selected.cif)}`} label="PLACSP · histórico"   color="#0F766E"/>
          {selected.linkedin && <SourceLink href={selected.linkedin} label="LinkedIn"            color="#0EA5E9"/>}
          <SourceLink href={`https://www.google.com/search?q=${encodeURIComponent(selected.nombre + ' adjudicaciones')}&tbm=nws`} label="Prensa · Google News" color="#525258"/>
        </section>

        {/* ───── Generador de informes Politeia (módulo principal) ───── */}
        <section style={{
          background:'linear-gradient(135deg,#1E1B4B 0%,#0F0E2C 100%)',
          borderRadius:18, padding:'22px 28px', marginBottom:14, color:'#fff',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', inset:0, opacity:0.10, pointerEvents:'none',
            background:'radial-gradient(circle at 90% 20%, #A78BFA 0%, transparent 55%)' }}/>
          <div style={{ position:'relative' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:14, marginBottom:14 }}>
              <div>
                <p style={{ fontSize:9.5, fontWeight:800, letterSpacing:'0.16em', opacity:0.75, textTransform:'uppercase', margin:'0 0 4px', color:'#FBBF24' }}>
                  GENERADOR POLITEIA · INFORMES DE 2 PÁGINAS
                </p>
                <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, letterSpacing:'-0.018em' }}>
                  Inteligencia automatizada sobre <span style={{ color:'#FBBF24' }}>{selected.nombre}</span>
                </h2>
                <p style={{ margin:'4px 0 0', fontSize:11.5, opacity:0.65 }}>Briefing táctico generado en menos de 30 segundos · listo para imprimir o compartir</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.14em', opacity:0.55, textTransform:'uppercase' }}>Modelo activo</span>
                <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#A78BFA' }}>Politeia AI · v3.2</span>
              </div>
            </div>

            {/* Selector longitud · NOTA vs INFORME */}
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:10 }}>
              <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', opacity:0.75, textTransform:'uppercase' }}>Longitud:</span>
              <div style={{ display:'inline-flex', background:'rgba(255,255,255,0.08)', borderRadius:999, padding:3 }}>
                {[
                  { k:'nota'    as const, label:'NOTA',    pages:'2 páginas',  desc:'Briefing táctico' },
                  { k:'informe' as const, label:'INFORME', pages:'10 páginas', desc:'Análisis completo' },
                ].map(o => {
                  const active = longitud === o.k
                  return (
                    <button key={o.k} onClick={() => { setLongitud(o.k); setGenerado(false) }} style={{
                      background: active ? '#FBBF24' : 'transparent',
                      color: active ? '#1E1B4B' : '#fff',
                      border:'none', borderRadius:999, padding:'7px 16px',
                      fontSize:11.5, fontWeight: active ? 800 : 500, cursor:'pointer',
                      fontFamily:'inherit',
                      display:'inline-flex', alignItems:'center', gap:7,
                    }}>
                      <span>{o.label}</span>
                      <span style={{ fontSize:9.5, fontWeight:700, opacity: active ? 0.75 : 0.6 }}>· {o.pages}</span>
                    </button>
                  )
                })}
              </div>
              <span style={{ fontSize:10.5, color:'rgba(255,255,255,0.6)', fontWeight:500 }}>
                {longitud === 'nota' ? 'Resumen ejecutivo en 2 páginas — listo para imprimir' : 'Análisis profundo en 10 páginas — financiero, equipo, riesgos y estrategia'}
              </span>
            </div>

            {/* Selector tipo + botón */}
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', opacity:0.75, textTransform:'uppercase' }}>Tipo:</span>
              <div style={{ display:'inline-flex', background:'rgba(255,255,255,0.08)', borderRadius:999, padding:3, flexWrap:'wrap' }}>
                {(['Strategic Profile','Due Diligence','Win/Loss Analysis','Bid Intelligence','Executive Briefing'] as TipoInforme[]).map(t => {
                  const active = tipoInforme === t
                  return (
                    <button key={t} onClick={() => { setTipoInforme(t); setGenerado(false) }} style={{
                      background: active ? '#FBBF24' : 'transparent',
                      color: active ? '#1E1B4B' : '#fff',
                      border:'none', borderRadius:999, padding:'6px 14px',
                      fontSize:11, fontWeight: active ? 800 : 500, cursor:'pointer',
                      fontFamily:'inherit',
                    }}>{t}</button>
                  )
                })}
              </div>
              <button
                onClick={handleGenerar}
                disabled={generando}
                style={{
                  marginLeft:'auto',
                  background: generando ? 'rgba(251,191,36,0.55)' : '#FBBF24', color:'#1E1B4B', border:'none',
                  borderRadius:999, padding:'9px 22px', fontSize:12.5, fontWeight:800,
                  cursor: generando ? 'wait' : 'pointer', fontFamily:'inherit', letterSpacing:'0.04em',
                }}>
                {generando ? 'GENERANDO…' : generado ? 'REGENERAR' : `GENERAR ${longitud === 'nota' ? 'NOTA' : 'INFORME'}`}
              </button>
              <button style={{
                background:'rgba(255,255,255,0.08)', color:'#fff', border:'1px solid rgba(255,255,255,0.18)',
                borderRadius:999, padding:'9px 18px', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              }}>Descargar PDF · {numPaginas}p</button>
            </div>
          </div>
        </section>

        {/* ───── Preview del informe (2 o 10 páginas) ───── */}
        {(generado || generando) && (
          <section style={{ marginBottom:18 }}>
            <SectionHeader
              label={`Preview · ${numPaginas} páginas`}
              count={`${tipoInforme} · ${selected.nombre}`}
              accent="#5B21B6"
            />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {generando ? (
                Array.from({ length: numPaginas }).map((_, i) => <SkeletonPage key={i} num={i+1} total={numPaginas}/>)
              ) : longitud === 'nota' ? (
                <>
                  <ReportPage1 selected={selected} tipo={tipoInforme} total={numPaginas}/>
                  <ReportPage2 selected={selected} tipo={tipoInforme} total={numPaginas}/>
                </>
              ) : (
                <>
                  <ReportPage1 selected={selected} tipo={tipoInforme} total={numPaginas}/>
                  <ReportPage2 selected={selected} tipo={tipoInforme} total={numPaginas}/>
                  <ReportPage3 selected={selected}/>
                  <ReportPage4 selected={selected}/>
                  <ReportPage5 selected={selected}/>
                  <ReportPage6 selected={selected}/>
                  <ReportPage7 selected={selected}/>
                  <ReportPage8 selected={selected}/>
                  <ReportPage9 selected={selected}/>
                  <ReportPage10 selected={selected}/>
                </>
              )}
            </div>
          </section>
        )}

        {/* ───── Tabs analíticas ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'perfil',    label:'Perfil completo',         count:0 },
            { k:'winloss',   label:'Win/Loss tracker',         count: WIN_LOSS.length },
            { k:'pricing',   label:'Pricing intelligence',    count: COMPETIDORES.length },
            { k:'historico', label:'Histórico de informes',  count: INFORMES_HISTORICO.length },
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
                {t.label} {t.count > 0 && <span style={{ marginLeft:5, color: active ? '#5B21B6' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>}
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Perfil completo ───── */}
        {tab === 'perfil' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
              <div>
                <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em', color:'#16A34A' }}>Fortalezas</h3>
                <ul style={{ margin:'0 0 18px', padding:'0 0 0 18px', fontSize:12, color:'#3a3a3d', lineHeight:1.6 }}>
                  {selected.fortalezas.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em', color:'#DC2626' }}>Debilidades</h3>
                <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:12, color:'#3a3a3d', lineHeight:1.6 }}>
                  {selected.debilidades.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
              <div>
                <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em', color:'#5B21B6' }}>Oportunidades para nosotros</h3>
                <ul style={{ margin:'0 0 18px', padding:'0 0 0 18px', fontSize:12, color:'#3a3a3d', lineHeight:1.6 }}>
                  {selected.oportunidadesNos.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em', color:'#F97316' }}>Amenazas que plantean</h3>
                <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:12, color:'#3a3a3d', lineHeight:1.6 }}>
                  {selected.amenazasNos.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            </div>
            <div style={{ marginTop:24, padding:'14px 16px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10 }}>
              <h3 style={{ margin:'0 0 8px', fontFamily:'var(--font-display)', fontSize:13, fontWeight:600, letterSpacing:'-0.012em' }}>Adjudicaciones recientes</h3>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #ECECEF' }}>
                    {['Fecha','Expediente','Título','Importe','Fuente'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'7px 8px', fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.recientesAdj.map((r, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #F5F5F7' }}>
                      <td style={{ padding:'8px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{r.fecha}</td>
                      <td style={{ padding:'8px', fontFamily:'var(--font-display)', color:'#6e6e73', fontSize:11 }}>{r.exp}</td>
                      <td style={{ padding:'8px', color:'#1d1d1f', fontWeight:600 }}>{r.titulo}</td>
                      <td style={{ padding:'8px', fontFamily:'var(--font-display)', fontWeight:700, color:selected.color, textAlign:'right' }}>{r.importe.toFixed(1)}M€</td>
                      <td style={{ padding:'8px' }}>
                        <SourceIcon href={linkPlacsp(r.exp)} label="PLACSP" color={selected.color}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Win/Loss ───── */}
        {tab === 'winloss' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #ECECEF', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:14, fontWeight:600 }}>Histórico head-to-head · últimas 8 licitaciones</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>Win rate propio: <strong style={{ color:'#16A34A' }}>{totals.winRate}%</strong></span>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['Expediente','Licitación','Ganador','Posición nuestra','Baja ganador','Baja nuestra','Diff','Fuente'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WIN_LOSS.map((w, i) => {
                    const won = w.nuestro.includes('GANADOR')
                    const diff = w.bajaNuestra - w.bajaGanador
                    return (
                      <tr key={i} style={{ borderBottom:'1px solid #ECECEF', background: won ? '#F0FDF4' : i%2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', color:'#6e6e73', fontSize:11 }}>{w.exp}</td>
                        <td style={{ padding:'10px 12px', fontWeight:600, color:'#1d1d1f' }}>{w.titulo}</td>
                        <td style={{ padding:'10px 12px', fontWeight:600, color: won ? '#16A34A' : '#1d1d1f' }}>{w.ganador}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{
                            fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                            padding:'2px 8px', borderRadius:999,
                            background: won ? '#16A34A' : '#FAFAFB',
                            color: won ? '#fff' : '#3a3a3d',
                            border: won ? '1px solid #16A34A' : '1px solid #ECECEF',
                          }}>{w.nuestro.toUpperCase()}</span>
                        </td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{w.bajaGanador.toFixed(2)}%</td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{w.bajaNuestra > 0 ? `${w.bajaNuestra.toFixed(2)}%` : '—'}</td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color: diff > 0 ? '#16A34A' : diff < 0 ? '#DC2626' : '#6e6e73' }}>{w.bajaNuestra > 0 ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)} pp` : '—'}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <SourceIcon href={linkPlacsp(w.exp)} label="PLACSP" color="#5B21B6"/>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Pricing intelligence ───── */}
        {tab === 'pricing' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #ECECEF' }}>
              <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600 }}>Pricing intelligence · estrategia de bajas y modificados</h3>
              <p style={{ margin:0, fontSize:11.5, color:'#6e6e73' }}>Comportamiento histórico de cada competidor para anticipar su oferta</p>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:880 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['#','Competidor','Win rate','Baja media','% Modificados','Estrategia detectada'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...COMPETIDORES].sort((a,b) => b.winRate - a.winRate).map((c, i) => {
                    const estrategia = c.bajaMedia > 7 ? 'Agresiva en precio' : c.bajaMedia > 4 ? 'Moderada' : 'Defensiva precio · alta especialización'
                    const estCol = c.bajaMedia > 7 ? '#16A34A' : c.bajaMedia > 4 ? '#F97316' : '#DC2626'
                    return (
                      <tr key={c.id} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:800, color:'#1d1d1f' }}>{i+1}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                            <span style={{ width:3, height:18, background:c.color, borderRadius:1 }}/>
                            <span style={{ fontWeight:600, color:'#1d1d1f' }}>{c.nombre}</span>
                          </div>
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                              <div style={{ width:`${c.winRate * 2}%`, height:'100%', background: c.winRate >= 35 ? '#DC2626' : c.winRate >= 25 ? '#F97316' : '#16A34A' }}/>
                            </div>
                            <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color: c.winRate >= 35 ? '#DC2626' : c.winRate >= 25 ? '#F97316' : '#16A34A', minWidth:32, textAlign:'right' }}>{c.winRate.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color: c.bajaMedia > 7 ? '#16A34A' : c.bajaMedia > 4 ? '#F97316' : '#DC2626' }}>{c.bajaMedia.toFixed(1)}%</td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color: c.modificadosPct > 12 ? '#DC2626' : '#3a3a3d' }}>{c.modificadosPct}%</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{
                            fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                            padding:'3px 9px', borderRadius:999,
                            background:`${estCol}15`, color:estCol, border:`1px solid ${estCol}40`,
                          }}>{estrategia.toUpperCase()}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Histórico de informes ───── */}
        {tab === 'historico' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
              <h3 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:14, fontWeight:600 }}>Informes generados · biblioteca</h3>
              <span style={{ fontSize:11, color:'#6e6e73' }}>{INFORMES_HISTORICO.length} informes generados con Politeia AI v3.2</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))', gap:10 }}>
              {INFORMES_HISTORICO.map(r => {
                const c = COMPETIDORES.find(x => x.nombre === r.competidor)
                return (
                  <article key={r.id} style={{
                    background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
                    padding:'14px 16px', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:12, alignItems:'center',
                    borderLeft:`3px solid ${c?.color || '#5B21B6'}`,
                  }}>
                    <div style={{
                      width:42, height:48, borderRadius:6, background:`${c?.color || '#5B21B6'}10`, color:c?.color || '#5B21B6', border:`1px solid ${c?.color || '#5B21B6'}40`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, lineHeight:1, flexShrink:0,
                    }}>{r.paginas}p</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                        <span style={{
                          fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                          padding:'1px 6px', borderRadius:4,
                          background:'#5B21B6', color:'#fff',
                        }}>{r.tipo.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#1d1d1f' }}>{r.competidor}</div>
                      <div style={{ fontSize:10.5, color:'#86868b', marginTop:1 }}>{r.fecha} · {r.autor}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
                      <span style={{
                        fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                        padding:'2px 8px', borderRadius:999,
                        background:`${ESTADO_REP_COLOR[r.estado]}15`, color:ESTADO_REP_COLOR[r.estado], border:`1px solid ${ESTADO_REP_COLOR[r.estado]}40`,
                      }}>{r.estado.toUpperCase()}</span>
                      <a href={`#download-${r.id}`} title="Descargar PDF" style={{
                        fontSize:9.5, fontWeight:700, padding:'3px 8px', borderRadius:6,
                        background:`${c?.color || '#5B21B6'}10`, color:c?.color || '#5B21B6',
                        border:`1px solid ${c?.color || '#5B21B6'}40`, textDecoration:'none',
                        display:'inline-flex', alignItems:'center', gap:4,
                      }}>
                        Descargar
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M4.5 1v5m0 0L2 4M4.5 6L7 4M1.5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Inteligencia Competitiva · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Componentes del informe (simulación visual de páginas A4)
// ─────────────────────────────────────────────────────────────────────────
function SkeletonPage({ num, total }: { num: number, total: number }) {
  return (
    <div style={{ aspectRatio:'1 / 1.41', background:'#fff', border:'1px solid #ECECEF', borderRadius:10, padding:'24px 28px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(120deg, transparent 30%, rgba(91,33,182,0.08) 50%, transparent 70%)', animation:'shine 1.5s infinite', backgroundSize:'200% 100%' }}/>
      <div style={{ height:14, width:'70%', background:'#ECECEF', borderRadius:4, marginBottom:18 }}/>
      <div style={{ height:24, width:'90%', background:'#ECECEF', borderRadius:4, marginBottom:18 }}/>
      <div style={{ height:6, width:'100%', background:'#F5F5F7', borderRadius:3, marginBottom:7 }}/>
      <div style={{ height:6, width:'95%', background:'#F5F5F7', borderRadius:3, marginBottom:7 }}/>
      <div style={{ height:6, width:'80%', background:'#F5F5F7', borderRadius:3, marginBottom:18 }}/>
      <div style={{ height:120, width:'100%', background:'#ECECEF', borderRadius:8, marginBottom:14 }}/>
      <div style={{ height:6, width:'70%', background:'#F5F5F7', borderRadius:3 }}/>
      <div style={{ position:'absolute', bottom:14, right:18, fontSize:9, fontWeight:700, color:'#6e6e73' }}>Página {num}/{total}</div>
    </div>
  )
}

function ReportPage1({ selected, tipo, total }: { selected: Competidor, tipo: TipoInforme, total: number }) {
  return (
    <div style={{ aspectRatio:'1 / 1.41', background:'#fff', border:'1px solid #ECECEF', borderRadius:10, padding:'24px 26px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}>
      {/* Cabecera */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingBottom:12, borderBottom:`2px solid ${selected.color}` }}>
        <div>
          <div style={{ fontSize:8, fontWeight:800, letterSpacing:'0.18em', color:selected.color, textTransform:'uppercase' }}>POLITEIA · {tipo.toUpperCase()}</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#1d1d1f', letterSpacing:'-0.014em', marginTop:2 }}>{selected.nombre}</div>
          <div style={{ fontSize:9, color:'#6e6e73', marginTop:2 }}>CIF {selected.cif} · {selected.paisMatriz} · {selected.empleados} empleados</div>
        </div>
        <div style={{
          width:48, height:48, borderRadius:8, background:selected.color, color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:16,
        }}>{selected.iniciales}</div>
      </div>

      {/* Resumen ejecutivo */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Executive summary</div>
        <p style={{ margin:0, fontSize:9.5, color:'#3a3a3d', lineHeight:1.5 }}>
          {selected.nombre} ({selected.paisMatriz}) facturó {selected.facturacion} en el último ejercicio con una capitalización de {selected.capitalizacion}. En los últimos 12 meses ha logrado {selected.numAdj12m} adjudicaciones por {selected.totalAdj12m}M€ con un win rate del {selected.winRate}% y una baja media del {selected.bajaMedia}%. Nivel de amenaza estimado: <strong style={{ color:AMENAZA_C[selected.amenaza] }}>{selected.amenaza}</strong>.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5, marginBottom:12 }}>
        <ReportKpi label="Adjudicado 12m" value={`${selected.totalAdj12m}M€`} color={selected.color}/>
        <ReportKpi label="Win rate"        value={`${selected.winRate}%`}     color="#16A34A"/>
        <ReportKpi label="Baja media"      value={`${selected.bajaMedia}%`}    color="#F97316"/>
        <ReportKpi label="% Modificados"   value={`${selected.modificadosPct}%`} color={selected.modificadosPct >= 12 ? '#DC2626' : '#0EA5E9'}/>
      </div>

      {/* Sectores */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Presencia sectorial</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {selected.sectores.map(s => (
            <span key={s} style={{
              fontSize:8.5, fontWeight:700, padding:'2px 7px', borderRadius:999,
              background:`${SECTOR_COLOR[s]}15`, color:SECTOR_COLOR[s], border:`1px solid ${SECTOR_COLOR[s]}40`,
            }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Equipo directivo y operativo */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Equipo clave</div>
        <table style={{ width:'100%', fontSize:9, borderCollapse:'collapse' }}>
          <tbody>
            <tr><td style={{ padding:'2px 0', color:'#6e6e73' }}>Presidente</td><td style={{ padding:'2px 0', textAlign:'right', fontWeight:600, color:'#1d1d1f' }}>{selected.presidente}</td></tr>
            <tr><td style={{ padding:'2px 0', color:'#6e6e73' }}>{selected.ceoCargo}</td><td style={{ padding:'2px 0', textAlign:'right', fontWeight:600, color:'#1d1d1f' }}>{selected.ceo}</td></tr>
            <tr><td style={{ padding:'2px 0', color:'#6e6e73' }}>Captura de Negocio</td><td style={{ padding:'2px 0', textAlign:'right', fontWeight:600, color:'#1d1d1f', fontSize:8.5 }}>{selected.jefeCBD}</td></tr>
            <tr><td style={{ padding:'2px 0', color:'#6e6e73' }}>Equipo licitaciones</td><td style={{ padding:'2px 0', textAlign:'right', fontWeight:600, color:'#1d1d1f', fontSize:8.5 }}>{selected.equipoLicitaciones}</td></tr>
            <tr><td style={{ padding:'2px 0', color:'#6e6e73' }}>Bids activos</td><td style={{ padding:'2px 0', textAlign:'right', fontWeight:600, color:'#1d1d1f' }}>{selected.bidsActivos} licitaciones</td></tr>
          </tbody>
        </table>
      </div>

      {/* Adjudicaciones recientes */}
      <div style={{ marginTop:'auto' }}>
        <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Adjudicaciones recientes</div>
        {selected.recientesAdj.map((r, i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:8, fontSize:9, padding:'3px 0', borderBottom:'1px dotted #ECECEF', alignItems:'center' }}>
            <span style={{ color:'#1d1d1f', fontWeight:600 }}>{r.titulo}</span>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:selected.color }}>{r.importe.toFixed(1)}M€ · {r.fecha}</span>
            <a href={linkPlacsp(r.exp)} target="_blank" rel="noopener noreferrer" title={`PLACSP ${r.exp}`} style={{
              fontSize:7.5, fontWeight:800, padding:'1px 5px', borderRadius:3,
              background:`${selected.color}15`, color:selected.color, border:`1px solid ${selected.color}40`,
              textDecoration:'none', letterSpacing:'0.04em',
            }}>↗ PLACSP</a>
          </div>
        ))}
      </div>
      <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:4, fontSize:7.5 }}>
        <SourceTag href={selected.web}                    label="web"      color={selected.color}/>
        {selected.cnmv && <SourceTag href={selected.cnmv} label="CNMV"      color="#1F4E8C"/>}
        <SourceTag href={linkBORME(selected.cif)}          label="BORME"    color="#5B21B6"/>
      </div>

      <div style={{ position:'absolute', bottom:14, left:0, right:0, display:'flex', justifyContent:'space-between', padding:'0 26px', fontSize:8, color:'#86868b' }}>
        <span>Politeia AI v3.2 · Generado {new Date().toLocaleDateString('es-ES')}</span>
        <span>Página 1/{total}</span>
      </div>
    </div>
  )
}

function ReportPage2({ selected, tipo, total }: { selected: Competidor, tipo: TipoInforme, total: number }) {
  return (
    <div style={{ aspectRatio:'1 / 1.41', background:'#fff', border:'1px solid #ECECEF', borderRadius:10, padding:'24px 26px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', overflow:'hidden', position:'relative' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingBottom:8, borderBottom:`1px solid ${selected.color}40` }}>
        <div style={{ fontSize:9.5, fontWeight:700, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase' }}>{selected.nombre} · {tipo}</div>
        <div style={{ fontSize:8.5, color:'#6e6e73' }}>cont. página 2</div>
      </div>

      {/* DAFO 2x2 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
        <DAFOBlock label="Fortalezas"   items={selected.fortalezas}        color="#16A34A"/>
        <DAFOBlock label="Debilidades"  items={selected.debilidades}       color="#DC2626"/>
        <DAFOBlock label="Oport. NS"    items={selected.oportunidadesNos}  color="#5B21B6"/>
        <DAFOBlock label="Amenazas"     items={selected.amenazasNos}       color="#F97316"/>
      </div>

      {/* Recomendaciones tácticas */}
      <div style={{
        background:`${selected.color}08`, border:`1px solid ${selected.color}30`, borderRadius:8,
        padding:'10px 12px', marginBottom:10,
      }}>
        <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>Recomendaciones tácticas Politeia</div>
        <ol style={{ margin:0, paddingLeft:16, fontSize:9, color:'#3a3a3d', lineHeight:1.5 }}>
          <li>Enfocar bajas agresivas (&gt;{(selected.bajaMedia + 2).toFixed(1)}%) en lotes donde {selected.iniciales} compite habitualmente.</li>
          <li>Aprovechar su {selected.modificadosPct >= 12 ? 'alto índice de modificados' : 'rigidez en ofertas'} para diferenciar nuestra oferta técnica.</li>
          <li>Posicionar nuestras capacidades sectoriales fuera de su zona de hegemonía: {selected.sectores.join(', ')}.</li>
          <li>Vigilar movimientos de su equipo de licitaciones · {selected.bidsActivos} bids activos detectados.</li>
        </ol>
      </div>

      {/* Pricing matrix */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Análisis de pricing</div>
        <table style={{ width:'100%', fontSize:9, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #ECECEF' }}>
              <th style={{ textAlign:'left', padding:'3px 0', fontSize:8, color:'#6e6e73', fontWeight:700 }}>Métrica</th>
              <th style={{ textAlign:'right', padding:'3px 0', fontSize:8, color:'#6e6e73', fontWeight:700 }}>{selected.iniciales}</th>
              <th style={{ textAlign:'right', padding:'3px 0', fontSize:8, color:'#6e6e73', fontWeight:700 }}>Mercado</th>
              <th style={{ textAlign:'right', padding:'3px 0', fontSize:8, color:'#6e6e73', fontWeight:700 }}>Δ</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ padding:'3px 0', color:'#3a3a3d' }}>Win rate</td><td style={{ padding:'3px 0', textAlign:'right', fontWeight:700, color:selected.color }}>{selected.winRate}%</td><td style={{ padding:'3px 0', textAlign:'right' }}>30%</td><td style={{ padding:'3px 0', textAlign:'right', color: selected.winRate > 30 ? '#DC2626' : '#16A34A', fontWeight:700 }}>{selected.winRate > 30 ? '+' : ''}{(selected.winRate - 30).toFixed(1)}</td></tr>
            <tr><td style={{ padding:'3px 0', color:'#3a3a3d' }}>Baja media</td><td style={{ padding:'3px 0', textAlign:'right', fontWeight:700, color:selected.color }}>{selected.bajaMedia}%</td><td style={{ padding:'3px 0', textAlign:'right' }}>5.8%</td><td style={{ padding:'3px 0', textAlign:'right', color: selected.bajaMedia < 5.8 ? '#DC2626' : '#16A34A', fontWeight:700 }}>{(selected.bajaMedia - 5.8).toFixed(1)}</td></tr>
            <tr><td style={{ padding:'3px 0', color:'#3a3a3d' }}>% Modificados</td><td style={{ padding:'3px 0', textAlign:'right', fontWeight:700, color:selected.color }}>{selected.modificadosPct}%</td><td style={{ padding:'3px 0', textAlign:'right' }}>11.2%</td><td style={{ padding:'3px 0', textAlign:'right', color: selected.modificadosPct > 11.2 ? '#DC2626' : '#16A34A', fontWeight:700 }}>{(selected.modificadosPct - 11.2).toFixed(1)}</td></tr>
          </tbody>
        </table>
      </div>

      <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:6, padding:'8px 10px', fontSize:8.5, color:'#6e6e73', lineHeight:1.4 }}>
        <strong style={{ color:selected.color }}>Nota Politeia:</strong> este informe se ha generado a partir de fuentes públicas (PLACSP, BOE, TED, registros mercantiles, prensa especializada) cruzadas con histórico interno. Recomendamos validar puntos críticos con el equipo de Captura de Negocio antes de tomar decisiones estratégicas.
      </div>

      <div style={{ position:'absolute', bottom:14, left:0, right:0, display:'flex', justifyContent:'space-between', padding:'0 26px', fontSize:8, color:'#86868b' }}>
        <span>Politeia AI v3.2 · Generado {new Date().toLocaleDateString('es-ES')}</span>
        <span>Página 2/{total}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Páginas 3-10 · solo se renderizan en modo INFORME (10 páginas)
// ─────────────────────────────────────────────────────────────────────────
function ReportShell({ selected, num, title, children }: { selected: Competidor, num: number, title: string, children: React.ReactNode }) {
  return (
    <div style={{ aspectRatio:'1 / 1.41', background:'#fff', border:'1px solid #ECECEF', borderRadius:10, padding:'24px 26px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingBottom:8, borderBottom:`1px solid ${selected.color}40` }}>
        <div>
          <div style={{ fontSize:8, fontWeight:800, letterSpacing:'0.18em', color:selected.color, textTransform:'uppercase' }}>POLITEIA · {selected.iniciales} · INFORME EXTENDIDO</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#1d1d1f', letterSpacing:'-0.012em', marginTop:2 }}>{title}</div>
        </div>
        <div style={{
          width:36, height:36, borderRadius:6, background:`${selected.color}10`, color:selected.color, border:`1px solid ${selected.color}40`,
          display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:14,
        }}>{num}</div>
      </div>
      <div style={{ flex:1, fontSize:9.5, color:'#3a3a3d', lineHeight:1.5 }}>{children}</div>
      <div style={{ position:'absolute', bottom:14, left:0, right:0, display:'flex', justifyContent:'space-between', padding:'0 26px', fontSize:8, color:'#86868b' }}>
        <span>Politeia AI v3.2 · Generado {new Date().toLocaleDateString('es-ES')}</span>
        <span>Página {num}/10</span>
      </div>
    </div>
  )
}

function ReportPage3({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={3} title="Análisis financiero detallado">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
        <ReportKpi label="Facturación"        value={selected.facturacion}      color={selected.color}/>
        <ReportKpi label="Capitalización"      value={selected.capitalizacion}  color={selected.color}/>
        <ReportKpi label="Empleados"           value={selected.empleados}        color="#5B21B6"/>
        <ReportKpi label="País matriz"         value={selected.paisMatriz}       color="#0EA5E9"/>
      </div>
      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Estructura de ingresos</div>
      <table style={{ width:'100%', fontSize:9, borderCollapse:'collapse', marginBottom:10 }}>
        <thead><tr style={{ borderBottom:`1px solid ${selected.color}30` }}><th style={{ textAlign:'left', padding:'3px 0', color:'#6e6e73', fontWeight:700 }}>Concepto</th><th style={{ textAlign:'right', padding:'3px 0', color:'#6e6e73', fontWeight:700 }}>%</th><th style={{ textAlign:'right', padding:'3px 0', color:'#6e6e73', fontWeight:700 }}>Tendencia</th></tr></thead>
        <tbody>
          <tr><td style={{ padding:'3px 0' }}>Adjudicaciones públicas España</td><td style={{ padding:'3px 0', textAlign:'right', fontWeight:700, color:selected.color }}>42%</td><td style={{ padding:'3px 0', textAlign:'right', color:'#16A34A', fontWeight:700 }}>▲ +4 pp</td></tr>
          <tr><td style={{ padding:'3px 0' }}>Mercados internacionales</td><td style={{ padding:'3px 0', textAlign:'right', fontWeight:700, color:selected.color }}>32%</td><td style={{ padding:'3px 0', textAlign:'right', color:'#16A34A', fontWeight:700 }}>▲ +2 pp</td></tr>
          <tr><td style={{ padding:'3px 0' }}>Sector privado nacional</td><td style={{ padding:'3px 0', textAlign:'right', fontWeight:700, color:selected.color }}>18%</td><td style={{ padding:'3px 0', textAlign:'right', color:'#DC2626', fontWeight:700 }}>▼ −3 pp</td></tr>
          <tr><td style={{ padding:'3px 0' }}>Concesiones largo plazo</td><td style={{ padding:'3px 0', textAlign:'right', fontWeight:700, color:selected.color }}>8%</td><td style={{ padding:'3px 0', textAlign:'right', color:'#6e6e73', fontWeight:700 }}>→ estable</td></tr>
        </tbody>
      </table>
      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Indicadores financieros clave</div>
      <ul style={{ margin:0, paddingLeft:14, fontSize:9, lineHeight:1.6 }}>
        <li>Margen EBITDA estimado · 8.4% (mediana sector: 7.2%)</li>
        <li>ROE consolidado · 12.6%</li>
        <li>Ratio deuda/EBITDA · 2.1x (zona conservadora)</li>
        <li>Liquidez (cash &amp; equivalentes) · 1.8 mil M€</li>
        <li>Calificación crediticia · BBB+ estable (S&amp;P)</li>
        <li>Dividendo último ejercicio · 0.85 €/acción</li>
      </ul>
    </ReportShell>
  )
}

function ReportPage4({ selected }: { selected: Competidor }) {
  const fakeAdj = [
    ...selected.recientesAdj,
    { exp:'2025/MIN-INF-002', titulo:'Conservación A-2 Madrid-Zaragoza', importe: 84.4, fecha:'12/12/2025' },
    { exp:'2025/AYT-VAL-EDU', titulo:'Modernización colegios Valencia',  importe: 28.6, fecha:'04/11/2025' },
    { exp:'2025/MIN-DEF-LOG', titulo:'Logística operativa militar',       importe: 42.1, fecha:'18/10/2025' },
    { exp:'2025/AND-AGUA',   titulo:'Plan agua reuse Andalucía',          importe: 56.0, fecha:'30/09/2025' },
  ]
  return (
    <ReportShell selected={selected} num={4} title="Histórico de adjudicaciones · 12 meses">
      <table style={{ width:'100%', fontSize:8.5, borderCollapse:'collapse' }}>
        <thead><tr style={{ borderBottom:`1px solid ${selected.color}30` }}>
          <th style={{ textAlign:'left', padding:'4px 0', color:'#6e6e73', fontWeight:700 }}>Fecha</th>
          <th style={{ textAlign:'left', padding:'4px 0', color:'#6e6e73', fontWeight:700 }}>Expediente</th>
          <th style={{ textAlign:'left', padding:'4px 0', color:'#6e6e73', fontWeight:700 }}>Adjudicación</th>
          <th style={{ textAlign:'right', padding:'4px 0', color:'#6e6e73', fontWeight:700 }}>Importe</th>
          <th style={{ textAlign:'center', padding:'4px 0', color:'#6e6e73', fontWeight:700 }}>Fuente</th>
        </tr></thead>
        <tbody>
          {fakeAdj.map((r, i) => (
            <tr key={i} style={{ borderBottom:'1px dotted #ECECEF' }}>
              <td style={{ padding:'5px 0', fontFamily:'var(--font-display)', fontWeight:700 }}>{r.fecha}</td>
              <td style={{ padding:'5px 0', color:'#6e6e73' }}>{r.exp}</td>
              <td style={{ padding:'5px 0', fontWeight:600, color:'#1d1d1f' }}>{r.titulo}</td>
              <td style={{ padding:'5px 0', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:700, color:selected.color }}>{r.importe.toFixed(1)}M€</td>
              <td style={{ padding:'5px 0', textAlign:'center' }}>
                <a href={linkPlacsp(r.exp)} target="_blank" rel="noopener noreferrer" style={{
                  fontSize:7, fontWeight:800, padding:'1px 5px', borderRadius:3,
                  background:`${selected.color}15`, color:selected.color, border:`1px solid ${selected.color}40`,
                  textDecoration:'none', letterSpacing:'0.04em',
                }}>↗</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop:10, padding:'8px 10px', background:`${selected.color}08`, border:`1px solid ${selected.color}30`, borderRadius:6, fontSize:8.5 }}>
        <strong style={{ color:selected.color }}>Análisis Politeia:</strong> {selected.numAdj12m} adjudicaciones en 12 meses por valor de {selected.totalAdj12m}M€. Win rate del {selected.winRate}% confirma posicionamiento top-3 en sus sectores principales. Estrategia agresiva de baja media · {selected.bajaMedia}%.
      </div>
    </ReportShell>
  )
}

function ReportPage5({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={5} title="Mapa de proyectos en ejecución">
      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>{selected.bidsActivos} proyectos en ejecución · distribución geográfica</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
        {[
          { region:'Madrid',       n:Math.round(selected.bidsActivos * 0.32), col:'#1F4E8C' },
          { region:'Cataluña',      n:Math.round(selected.bidsActivos * 0.18), col:'#FBBF24' },
          { region:'Andalucía',     n:Math.round(selected.bidsActivos * 0.16), col:'#16A34A' },
          { region:'C. Valenciana', n:Math.round(selected.bidsActivos * 0.12), col:'#F97316' },
          { region:'País Vasco',    n:Math.round(selected.bidsActivos * 0.08), col:'#525258' },
          { region:'Resto España',  n:Math.round(selected.bidsActivos * 0.14), col:'#7C3AED' },
        ].map(r => (
          <div key={r.region} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:6, alignItems:'center' }}>
            <span style={{ width:8, height:8, borderRadius:2, background:r.col }}/>
            <span style={{ fontSize:9 }}>{r.region}</span>
            <span style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:700, color:r.col }}>{r.n}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Por sector</div>
      <div style={{ display:'flex', height:18, borderRadius:4, overflow:'hidden', marginBottom:6 }}>
        {selected.sectores.map((s, i) => {
          const w = 100 / selected.sectores.length
          const colors = ['#1F4E8C','#16A34A','#F97316','#5B21B6','#0EA5E9']
          return <div key={s} title={s} style={{ width:`${w}%`, background:colors[i % colors.length], display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:7.5, fontWeight:700 }}>{s.slice(0,4)}</div>
        })}
      </div>
      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginTop:10, marginBottom:4 }}>Top 5 mayores contratos en ejecución</div>
      <ul style={{ margin:0, paddingLeft:14, fontSize:9, lineHeight:1.6 }}>
        <li>AVE Madrid-Sevilla mantenimiento · 387.9M€ (48 meses)</li>
        <li>Plataforma ciberdefensa nacional · 268.0M€ (24 meses)</li>
        <li>Concesión M40 norte ampliación · 215.6M€ (180 meses)</li>
        <li>Hospital universitario Vallecas · 319.2M€ (42 meses)</li>
        <li>Hidrógeno verde subasta capacidad · 215.2M€ (60 meses)</li>
      </ul>
    </ReportShell>
  )
}

function ReportPage6({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={6} title="Equipo directivo y operativo">
      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Top management</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
        {[
          { rol:'Presidente / Chairman',     nombre:selected.presidente,     desde:'2018' },
          { rol:selected.ceoCargo,            nombre:selected.ceo,           desde:'2022' },
          { rol:'CFO',                        nombre:'Pedro Esteban (sim.)', desde:'2021' },
          { rol:'COO',                        nombre:'María González (sim.)',desde:'2023' },
          { rol:'Director de Comunicación',   nombre:'Borja Sánchez (sim.)', desde:'2024' },
        ].map((m, i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:8, padding:'5px 8px', background:'#FAFAFB', borderRadius:5, alignItems:'center' }}>
            <span style={{ fontSize:7.5, fontWeight:800, color:'#fff', background:selected.color, padding:'1px 6px', borderRadius:3, letterSpacing:'0.04em' }}>{m.rol.toUpperCase().slice(0,18)}</span>
            <span style={{ fontSize:9.5, fontWeight:600, color:'#1d1d1f' }}>{m.nombre}</span>
            <span style={{ fontSize:8, color:'#86868b', fontWeight:600 }}>desde {m.desde}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Captura de Negocio (Bid &amp; Capture)</div>
      <div style={{ padding:'8px 10px', background:`${selected.color}08`, border:`1px solid ${selected.color}30`, borderRadius:6, marginBottom:8 }}>
        <div style={{ fontSize:9.5, fontWeight:700, color:'#1d1d1f' }}>{selected.jefeCBD}</div>
        <div style={{ fontSize:8.5, color:'#6e6e73', marginTop:3, lineHeight:1.4 }}>{selected.equipoLicitaciones}</div>
      </div>
      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Movimientos recientes (M&amp;A · cambios directivos)</div>
      <ul style={{ margin:0, paddingLeft:14, fontSize:8.5, lineHeight:1.6 }}>
        <li>Mar 2026 · Refuerzo del comité de licitaciones internacionales (+12 personas)</li>
        <li>Ene 2026 · Apertura oficina captación México DF</li>
        <li>Nov 2025 · Cambio de director financiero · transición ordenada</li>
        <li>Sep 2025 · Acuerdo estratégico con grupo Mitsubishi para joint ventures</li>
      </ul>
    </ReportShell>
  )
}

function ReportPage7({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={7} title="Análisis de riesgos">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        {[
          { tipo:'Operacional',   nivel:'MEDIO',   color:'#F97316', det:'Concentración de proyectos en Madrid (32%) puede crear cuellos de botella en pico.' },
          { tipo:'Reputacional',  nivel:selected.modificadosPct >= 12 ? 'ALTO' : 'BAJO', color:selected.modificadosPct >= 12 ? '#DC2626' : '#16A34A', det:`${selected.modificadosPct}% de modificados sobre adjudicaciones · vigilancia política activa.` },
          { tipo:'Financiero',    nivel:'BAJO',    color:'#16A34A', det:'Ratios saneados, liquidez por encima de la mediana del sector.' },
          { tipo:'Regulatorio',   nivel:'MEDIO',   color:'#F97316', det:'Nueva LCSP · aumento de transparencia y requisitos ESG en pliegos.' },
          { tipo:'Geopolítico',   nivel:'ALTO',    color:'#DC2626', det:'Aranceles EEUU-UE · riesgo en cartera latinoamericana y exportación tecnológica.' },
          { tipo:'Cibernético',   nivel:'MEDIO',   color:'#F97316', det:'Aumento de incidentes en sector defensa y AAPP · necesidad de hardening.' },
        ].map((r, i) => (
          <div key={i} style={{ padding:'8px 10px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:6, borderLeft:`3px solid ${r.color}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
              <span style={{ fontSize:8, fontWeight:800, color:'#1d1d1f', letterSpacing:'0.06em', textTransform:'uppercase' }}>{r.tipo}</span>
              <span style={{ fontSize:7.5, fontWeight:800, padding:'1px 6px', borderRadius:3, background:r.color, color:'#fff', letterSpacing:'0.06em' }}>{r.nivel}</span>
            </div>
            <p style={{ margin:0, fontSize:8.5, color:'#3a3a3d', lineHeight:1.4 }}>{r.det}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop:10, padding:'8px 10px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6 }}>
        <div style={{ fontSize:7.5, fontWeight:800, color:'#DC2626', letterSpacing:'0.08em', textTransform:'uppercase' }}>Bandera roja Politeia</div>
        <p style={{ margin:'2px 0 0', fontSize:8.5, color:'#7F1D1D', lineHeight:1.4 }}>
          Vigilar especialmente la evolución del riesgo geopolítico (aranceles) y reputacional. La combinación de un % de modificados elevado con tensión política puede afectar a la imagen del grupo en próximas convocatorias.
        </p>
      </div>
    </ReportShell>
  )
}

function ReportPage8({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={8} title="Sectores objetivo y oportunidades">
      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Sectores donde {selected.iniciales} es fuerte</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
        {selected.sectores.map(s => (
          <span key={s} style={{ fontSize:8.5, fontWeight:700, padding:'3px 9px', borderRadius:999, background:selected.color, color:'#fff' }}>{s}</span>
        ))}
      </div>
      <div style={{ fontSize:8.5, fontWeight:800, color:'#16A34A', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Sectores con baja presencia (oportunidad)</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12 }}>
        {['Sanidad','Defensa','Educación','TIC','Servicios sociales'].filter(s => !selected.sectores.includes(s as any)).map(s => (
          <span key={s} style={{ fontSize:8.5, fontWeight:700, padding:'3px 9px', borderRadius:999, background:'#F0FDF4', color:'#16A34A', border:'1px solid #BBF7D0' }}>{s}</span>
        ))}
      </div>
      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Próximas oportunidades específicas</div>
      <ul style={{ margin:0, paddingLeft:14, fontSize:8.5, lineHeight:1.6 }}>
        <li>Junio 2026 · 5ª subasta de hidrógeno verde · 480 M€</li>
        <li>Julio 2026 · Plan vivienda asequible · 1ª convocatoria · 680 M€</li>
        <li>Septiembre 2026 · PERTE Microelectrónica fase 3 · 1.240 M€</li>
        <li>Octubre 2026 · Renovación carreteras N · 380 M€</li>
        <li>Noviembre 2026 · Servicios cloud sovereign UE · 1.240 M€</li>
      </ul>
      <div style={{ marginTop:10, padding:'8px 10px', background:`${selected.color}08`, border:`1px solid ${selected.color}30`, borderRadius:6 }}>
        <strong style={{ color:selected.color, fontSize:8.5 }}>Recomendación Politeia:</strong> <span style={{ fontSize:8.5, color:'#3a3a3d' }}>posicionar oferta diferenciada en los sectores donde {selected.iniciales} no tiene hegemonía. Priorizar lotes pequeños y medianos donde la agilidad operativa es ventaja competitiva.</span>
      </div>
    </ReportShell>
  )
}

function ReportPage9({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={9} title="Estrategia recomendada · próximos 12 meses">
      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Plan táctico · 4 ejes</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {[
          { num:'1', titulo:'Diferenciación por agilidad', det:'Posicionarnos como alternativa ágil frente a la lentitud de procesos de competidores grandes. Ciclo de oferta < 30 días.', color:'#16A34A' },
          { num:'2', titulo:'Pricing inteligente',         det:`Mantener bajas en torno al ${(selected.bajaMedia + 1.5).toFixed(1)}% en lotes prioritarios · ${(selected.bajaMedia + 0.5).toFixed(1)}% baja media objetivo.`, color:'#5B21B6' },
          { num:'3', titulo:'Alianzas estratégicas',       det:'Buscar UTE con players regionales para ampliar cobertura territorial sin sobrecostes.', color:'#0EA5E9' },
          { num:'4', titulo:'Especialización sectorial',   det:`Reforzar capacidades técnicas en ${['TIC','Sanidad','Educación'].filter(s => !selected.sectores.includes(s as any))[0] || 'TIC'} · espacio infraexplotado por ${selected.iniciales}.`, color:'#F97316' },
        ].map(e => (
          <div key={e.num} style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:8, padding:'7px 9px', background:'#FAFAFB', borderRadius:5, borderLeft:`3px solid ${e.color}` }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:e.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:11, flexShrink:0 }}>{e.num}</div>
            <div>
              <div style={{ fontSize:9.5, fontWeight:700, color:'#1d1d1f' }}>{e.titulo}</div>
              <div style={{ fontSize:8.5, color:'#3a3a3d', marginTop:2, lineHeight:1.4 }}>{e.det}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:10, fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>KPIs objetivo · 12 meses</div>
      <table style={{ width:'100%', fontSize:8.5, borderCollapse:'collapse' }}>
        <thead><tr style={{ borderBottom:'1px solid #ECECEF' }}><th style={{ textAlign:'left', padding:'3px 0', color:'#6e6e73', fontWeight:700 }}>Indicador</th><th style={{ textAlign:'right', padding:'3px 0', color:'#6e6e73', fontWeight:700 }}>Hoy</th><th style={{ textAlign:'right', padding:'3px 0', color:'#6e6e73', fontWeight:700 }}>Objetivo</th></tr></thead>
        <tbody>
          <tr><td style={{ padding:'3px 0' }}>Win rate</td><td style={{ padding:'3px 0', textAlign:'right', fontWeight:700 }}>22%</td><td style={{ padding:'3px 0', textAlign:'right', color:'#16A34A', fontWeight:700 }}>30%</td></tr>
          <tr><td style={{ padding:'3px 0' }}>Total adjudicado anual</td><td style={{ padding:'3px 0', textAlign:'right', fontWeight:700 }}>520M€</td><td style={{ padding:'3px 0', textAlign:'right', color:'#16A34A', fontWeight:700 }}>720M€</td></tr>
          <tr><td style={{ padding:'3px 0' }}>Bids activos</td><td style={{ padding:'3px 0', textAlign:'right', fontWeight:700 }}>18</td><td style={{ padding:'3px 0', textAlign:'right', color:'#16A34A', fontWeight:700 }}>32</td></tr>
        </tbody>
      </table>
    </ReportShell>
  )
}

function ReportPage10({ selected }: { selected: Competidor }) {
  return (
    <ReportShell selected={selected} num={10} title="Anexos · metodología y fuentes">
      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Fuentes consultadas (clicables)</div>
      <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:10, fontSize:8.5 }}>
        {[
          { txt:'PLACSP · Plataforma de Contratación del Sector Público',  url:'https://contrataciondelestado.es/' },
          { txt:'BOE · Boletín Oficial del Estado',                          url:'https://www.boe.es/' },
          { txt:'BOCG · Boletín Oficial Cortes Generales',                   url:'https://www.congreso.es/es/cem/diariobocg' },
          { txt:'TED · Tenders Electronic Daily (UE)',                       url:'https://ted.europa.eu/' },
          { txt:'Registro Mercantil · cuentas anuales · BORME',             url:linkBORME(selected.cif) },
          { txt:'CNMV · información financiera regulatoria',                  url:selected.cnmv || 'https://www.cnmv.es/' },
          { txt:`Sitio corporativo · ${selected.nombre.toLowerCase()}`,      url:selected.web },
          { txt:'Histórico interno Politeia · 12 meses de inteligencia',    url:'#' },
        ].map((f, i) => (
          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'3px 8px', textDecoration:'none',
            color:'#3a3a3d', borderRadius:4,
          }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:selected.color }}/>
              {f.txt}
            </span>
            <span style={{ color:selected.color, fontWeight:700, fontSize:7.5 }}>↗ visitar</span>
          </a>
        ))}
      </div>

      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Metodología</div>
      <p style={{ margin:'0 0 10px', fontSize:8.5, lineHeight:1.5, color:'#3a3a3d' }}>
        Este informe ha sido generado por <strong>Politeia AI v3.2</strong>. Se cruzan datos públicos con histórico interno y análisis cualitativo de equipo. El sistema aplica algoritmos de NLP sobre pliegos, prensa y comunicaciones oficiales para identificar patrones de comportamiento competitivo.
      </p>
      <p style={{ margin:'0 0 10px', fontSize:8.5, lineHeight:1.5, color:'#3a3a3d' }}>
        Los KPIs financieros y de win rate son <strong>estimaciones basadas en fuentes públicas</strong>. Para datos no publicados (márgenes, desglose por contrato), Politeia aplica modelos estadísticos sobre comparables.
      </p>

      <div style={{ fontSize:8.5, fontWeight:800, color:selected.color, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Disclaimer</div>
      <p style={{ margin:0, fontSize:8, lineHeight:1.5, color:'#86868b' }}>
        Este documento es confidencial y de uso exclusivo del cliente. La información que contiene se basa en fuentes públicas y modelos analíticos · puede no reflejar la totalidad de la realidad operativa de la entidad analizada. Politeia Analítica no se hace responsable del uso indebido de esta información para fines no autorizados.
        Validación interna por equipo de Captura de Negocio antes de tomar decisiones críticas. © Politeia Analítica · Todos los derechos reservados.
      </p>
    </ReportShell>
  )
}

function ReportKpi({ label, value, color }: { label:string, value:string, color:string }) {
  return (
    <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:6, padding:'5px 6px', textAlign:'center' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color, lineHeight:1, letterSpacing:'-0.018em' }}>{value}</div>
      <div style={{ fontSize:7, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginTop:3 }}>{label}</div>
    </div>
  )
}

function DAFOBlock({ label, items, color }: { label: string, items: string[], color: string }) {
  return (
    <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:6, padding:'7px 9px', borderTop:`2px solid ${color}` }}>
      <div style={{ fontSize:7.5, fontWeight:800, color, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
      <ul style={{ margin:0, paddingLeft:11, fontSize:8.5, color:'#3a3a3d', lineHeight:1.4 }}>
        {items.slice(0, 3).map((it, i) => <li key={i}>{it}</li>)}
      </ul>
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

// Pill de enlace a fuente (para la fila de fuentes oficiales)
function SourceLink({ href, label, color }: { href: string, label: string, color: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'5px 10px', borderRadius:999, textDecoration:'none',
      background:`${color}10`, border:`1px solid ${color}40`, color,
      fontSize:11, fontWeight:600, fontFamily:'inherit',
      transition:'background 160ms',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = color; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${color}10`; (e.currentTarget as HTMLAnchorElement).style.color = color }}>
      {label}
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <path d="M2 2h5v5M2 7L7 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </a>
  )
}

// Icono pequeño para tablas (botón cuadrado con label corto)
function SourceIcon({ href, label, color }: { href: string, label: string, color: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={label} style={{
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'3px 8px', borderRadius:6, textDecoration:'none',
      background:`${color}12`, border:`1px solid ${color}40`, color,
      fontSize:9.5, fontWeight:700, fontFamily:'inherit', whiteSpace:'nowrap', letterSpacing:'0.04em',
    }}>
      {label}
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path d="M2 2h4v4M2 6L6 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </a>
  )
}

// Tag minúsculo para informes (footer de página 1)
function SourceTag({ href, label, color }: { href: string, label: string, color: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      display:'inline-flex', alignItems:'center', gap:3,
      padding:'1px 5px', borderRadius:3, textDecoration:'none',
      background:`${color}12`, color, border:`1px solid ${color}40`,
      fontSize:7.5, fontWeight:800, letterSpacing:'0.04em',
    }}>↗ {label}</a>
  )
}
