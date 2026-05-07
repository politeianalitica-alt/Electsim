'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import ContratosLiveFeed from '@/components/ContratosLiveFeed'

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────
type Procedimiento = 'Abierto' | 'Restringido' | 'Negociado' | 'Diálogo competitivo' | 'Emergencia' | 'Acuerdo marco' | 'Concursal'
type Sector = 'Sanidad' | 'Defensa' | 'Infraestructuras' | 'TIC' | 'Energía' | 'Educación' | 'Servicios sociales' | 'Otros'
type RiesgoAlerta = 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO'
type EstadoExp = 'Adjudicado' | 'En licitación' | 'Recurrido' | 'Anulado' | 'Modificado'

type Adjudicacion = {
  id: string
  exp: string
  titulo: string
  organismo: string
  ccaa: string
  sector: Sector
  procedimiento: Procedimiento
  importeBase: number      // €
  importeAdj: number        // €
  baja: number              // % baja vs base
  fechaAdj: string
  duracion: string
  adjudicatario: string
  numLicit: number          // nº de licitadores
  estado: EstadoExp
  riesgo: RiesgoAlerta
  alertas: string[]
}

type Organismo = {
  nombre: string
  tipo: 'AGE' | 'CCAA' | 'Local' | 'Empresa pública'
  totalAdj: number       // M€ último año
  numAdj: number
  bajaMedia: number      // %
  concentracion: number  // % top-1 adjudicatario
  modificacionesPct: number // % modificadas
}

type Empresa = {
  nombre: string
  cif: string
  sectores: Sector[]
  totalAdj: number      // M€ último año
  numAdj: number
  vinculacion: 'Ninguna' | 'Mediática' | 'Política' | 'Investigada'
  paisMatriz: string
  empleados: string
  webOk: boolean
}

type CasoMediatico = {
  caso: string
  estado: 'En instrucción' | 'Sumario abierto' | 'Sentencia' | 'Archivado'
  importe: number  // M€
  protag: string
  detalle: string
  severidad: RiesgoAlerta
}

const SECTOR_COLOR: Record<Sector, string> = {
  'Sanidad':'#0EA5E9', 'Defensa':'#525258', 'Infraestructuras':'#F97316',
  'TIC':'#5B21B6', 'Energía':'#16A34A', 'Educación':'#1F4E8C',
  'Servicios sociales':'#D43F8D', 'Otros':'#6e6e73',
}
const PROC_COLOR: Record<Procedimiento, string> = {
  'Abierto':'#16A34A', 'Restringido':'#0EA5E9', 'Negociado':'#F97316',
  'Diálogo competitivo':'#5B21B6', 'Emergencia':'#DC2626',
  'Acuerdo marco':'#7C3AED', 'Concursal':'#525258',
}
const RIESGO_C: Record<RiesgoAlerta, string> = {
  'CRÍTICO':'#DC2626', 'ALTO':'#F97316', 'MEDIO':'#EAB308', 'BAJO':'#0EA5E9',
}
const EST_C: Record<EstadoExp, string> = {
  'Adjudicado':'#16A34A', 'En licitación':'#5B21B6', 'Recurrido':'#F97316',
  'Anulado':'#DC2626', 'Modificado':'#EAB308',
}

// ─────────────────────────────────────────────────────────────────────────
// Datos · 12 adjudicaciones recientes
// ─────────────────────────────────────────────────────────────────────────
const ADJUDICACIONES: Adjudicacion[] = [
  {
    id:'a1', exp:'2026/HM-AVE-014',
    titulo:'Mantenimiento integral · línea AVE Madrid-Sevilla 2026-2030',
    organismo:'ADIF Alta Velocidad', ccaa:'Estatal', sector:'Infraestructuras', procedimiento:'Abierto',
    importeBase:412_500_000, importeAdj:387_900_000, baja:5.96, fechaAdj:'02/05/2026',
    duracion:'48 meses', adjudicatario:'ACS Servicios Industriales', numLicit:7,
    estado:'Adjudicado', riesgo:'BAJO', alertas:['Concentración del 32% del lote en ACS Group · 5º contrato consecutivo'],
  },
  {
    id:'a2', exp:'2026/MISAN-3T-008',
    titulo:'Suministro de oncológicos · hospitales del SNS',
    organismo:'INGESA · Ministerio de Sanidad', ccaa:'Estatal', sector:'Sanidad', procedimiento:'Acuerdo marco',
    importeBase:184_200_000, importeAdj:184_200_000, baja:0.0, fechaAdj:'30/04/2026',
    duracion:'24 meses', adjudicatario:'UTE Roche-Pfizer-Novartis', numLicit:4,
    estado:'Adjudicado', riesgo:'MEDIO', alertas:['UTE de las 3 grandes farmacéuticas · sin baja','Acuerdo marco con dependencia crítica'],
  },
  {
    id:'a3', exp:'2026/MIN-DEF-RAD',
    titulo:'Sistema integrado radar costero · 4ª fase',
    organismo:'Ministerio de Defensa', ccaa:'Estatal', sector:'Defensa', procedimiento:'Restringido',
    importeBase:268_000_000, importeAdj:266_400_000, baja:0.6, fechaAdj:'28/04/2026',
    duracion:'30 meses', adjudicatario:'Indra Sistemas', numLicit:3,
    estado:'Adjudicado', riesgo:'ALTO', alertas:['3 licitadores · pliego con requisitos muy específicos','Modificado +15% sobre presupuesto inicial'],
  },
  {
    id:'a4', exp:'2026/MAD-HOS-015',
    titulo:'Construcción nuevo Hospital Universitario · Vallecas Sur',
    organismo:'SERMAS · Comunidad de Madrid', ccaa:'Madrid', sector:'Sanidad', procedimiento:'Diálogo competitivo',
    importeBase:328_000_000, importeAdj:319_200_000, baja:2.68, fechaAdj:'25/04/2026',
    duracion:'42 meses', adjudicatario:'Acciona Construcción + Sacyr', numLicit:5,
    estado:'En licitación', riesgo:'MEDIO', alertas:['Recurso pendiente de Ferrovial ante TACP','Adenda de 24M€ por sobrecostes ya prevista'],
  },
  {
    id:'a5', exp:'2026/AND-ESC-022',
    titulo:'Comedores escolares de Andalucía · 2026-2028',
    organismo:'Consejería Educación · Junta de Andalucía', ccaa:'Andalucía', sector:'Educación', procedimiento:'Abierto',
    importeBase:124_500_000, importeAdj:118_900_000, baja:4.50, fechaAdj:'22/04/2026',
    duracion:'24 meses', adjudicatario:'Serunion + Aramark + Mediterránea Catering', numLicit:9,
    estado:'Adjudicado', riesgo:'BAJO', alertas:[],
  },
  {
    id:'a6', exp:'2026/IND-CIBER-002',
    titulo:'Servicios de ciberseguridad · administraciones públicas',
    organismo:'Ministerio de Transformación Digital', ccaa:'Estatal', sector:'TIC', procedimiento:'Acuerdo marco',
    importeBase:98_000_000, importeAdj:98_000_000, baja:0.0, fechaAdj:'18/04/2026',
    duracion:'36 meses', adjudicatario:'Telefónica Tech (Tribu Cybersec)', numLicit:6,
    estado:'Adjudicado', riesgo:'MEDIO', alertas:['Ampliación a 200M€ prevista en cláusulas de revisión'],
  },
  {
    id:'a7', exp:'2026/CAT-EDU-031',
    titulo:'Renovación equipos digitales · escuelas Cataluña',
    organismo:'Departament d\'Educació · Generalitat', ccaa:'Cataluña', sector:'Educación', procedimiento:'Abierto',
    importeBase:62_300_000, importeAdj:55_800_000, baja:10.4, fechaAdj:'15/04/2026',
    duracion:'18 meses', adjudicatario:'HP Iberia · UTE con APD', numLicit:11,
    estado:'Adjudicado', riesgo:'BAJO', alertas:[],
  },
  {
    id:'a8', exp:'2026/VAL-DANA-EMG',
    titulo:'Reconstrucción carreteras tras DANA · L\'Horta Sud',
    organismo:'Generalitat Valenciana', ccaa:'C. Valenciana', sector:'Infraestructuras', procedimiento:'Emergencia',
    importeBase:142_000_000, importeAdj:142_000_000, baja:0.0, fechaAdj:'10/04/2026',
    duracion:'12 meses', adjudicatario:'Sacyr Construcción + 3 UTE locales', numLicit:0,
    estado:'Modificado', riesgo:'CRÍTICO', alertas:['Procedimiento de emergencia sin licitación pública','3 modificados ya · +28M€ sobre importe inicial','Investigación abierta de la Sindicatura de Comptes'],
  },
  {
    id:'a9', exp:'2026/MIN-ENE-017',
    titulo:'Hidrógeno verde · subasta capacidad reservada',
    organismo:'IDAE · Ministerio de Transición Ecológica', ccaa:'Estatal', sector:'Energía', procedimiento:'Restringido',
    importeBase:240_000_000, importeAdj:215_200_000, baja:10.3, fechaAdj:'08/04/2026',
    duracion:'60 meses', adjudicatario:'Iberdrola + Repsol Renovables (UTE)', numLicit:8,
    estado:'Adjudicado', riesgo:'BAJO', alertas:[],
  },
  {
    id:'a10', exp:'2026/MUR-AGUA-005',
    titulo:'Desaladoras Costa Cálida · expansión capacidad',
    organismo:'Mancomunidad de los Canales del Taibilla', ccaa:'Murcia', sector:'Infraestructuras', procedimiento:'Negociado',
    importeBase:185_000_000, importeAdj:184_500_000, baja:0.27, fechaAdj:'05/04/2026',
    duracion:'36 meses', adjudicatario:'FCC Aqualia', numLicit:2,
    estado:'Recurrido', riesgo:'ALTO', alertas:['Procedimiento negociado · 2 licitadores','Recurso especial de Veolia ante el TACRC','Importe muy próximo al base · sin competencia real'],
  },
  {
    id:'a11', exp:'2026/MIN-RTVE-INF',
    titulo:'Cobertura informativa especial · elecciones generales 2026',
    organismo:'Corporación RTVE', ccaa:'Estatal', sector:'TIC', procedimiento:'Abierto',
    importeBase:18_400_000, importeAdj:17_800_000, baja:3.26, fechaAdj:'02/04/2026',
    duracion:'8 meses', adjudicatario:'Mediapro + Atresmedia Servicios + Localia Audiovisual', numLicit:7,
    estado:'Adjudicado', riesgo:'MEDIO', alertas:['Adjudicación durante período preelectoral · vigilancia JEC'],
  },
  {
    id:'a12', exp:'2026/AYT-MAD-LIM',
    titulo:'Limpieza viaria zona centro · Ayuntamiento Madrid',
    organismo:'Ayuntamiento de Madrid', ccaa:'Madrid', sector:'Servicios sociales', procedimiento:'Abierto',
    importeBase:512_000_000, importeAdj:478_400_000, baja:6.56, fechaAdj:'28/03/2026',
    duracion:'48 meses', adjudicatario:'FCC Servicios Medio Ambiente', numLicit:6,
    estado:'En licitación', riesgo:'MEDIO', alertas:['Recurso pendiente · alegación de OHLA por exclusión técnica'],
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Datos · ranking organismos contratantes
// ─────────────────────────────────────────────────────────────────────────
const ORGANISMOS: Organismo[] = [
  { nombre:'Ministerio de Defensa',           tipo:'AGE',            totalAdj:1820, numAdj:418, bajaMedia: 4.2, concentracion:38, modificacionesPct:18 },
  { nombre:'ADIF · Renfe',                    tipo:'Empresa pública',totalAdj:1450, numAdj:362, bajaMedia: 6.8, concentracion:24, modificacionesPct:14 },
  { nombre:'INGESA · Sanidad',                 tipo:'AGE',           totalAdj: 980, numAdj:286, bajaMedia: 3.5, concentracion:42, modificacionesPct:11 },
  { nombre:'SERMAS · C. Madrid',               tipo:'CCAA',          totalAdj: 920, numAdj:312, bajaMedia: 5.4, concentracion:35, modificacionesPct: 9 },
  { nombre:'Generalitat de Catalunya',         tipo:'CCAA',          totalAdj: 880, numAdj:298, bajaMedia: 7.1, concentracion:22, modificacionesPct: 8 },
  { nombre:'Junta de Andalucía',               tipo:'CCAA',          totalAdj: 780, numAdj:268, bajaMedia: 5.8, concentracion:28, modificacionesPct:10 },
  { nombre:'Ayuntamiento de Madrid',           tipo:'Local',         totalAdj: 720, numAdj:188, bajaMedia: 4.9, concentracion:32, modificacionesPct:12 },
  { nombre:'Generalitat Valenciana',           tipo:'CCAA',          totalAdj: 540, numAdj:162, bajaMedia: 3.2, concentracion:48, modificacionesPct:22 },
  { nombre:'IDAE · Transición Ecológica',     tipo:'AGE',           totalAdj: 420, numAdj: 78, bajaMedia: 8.4, concentracion:18, modificacionesPct: 6 },
  { nombre:'Ayuntamiento de Barcelona',        tipo:'Local',         totalAdj: 380, numAdj:142, bajaMedia: 6.2, concentracion:25, modificacionesPct: 7 },
]

// ─────────────────────────────────────────────────────────────────────────
// Datos · ranking empresas adjudicatarias
// ─────────────────────────────────────────────────────────────────────────
const EMPRESAS: Empresa[] = [
  { nombre:'ACS Group',                cif:'A28015890', sectores:['Infraestructuras','Energía','TIC'],   totalAdj:1820, numAdj:284, vinculacion:'Mediática', paisMatriz:'España', empleados:'120K', webOk:true },
  { nombre:'Ferrovial',                cif:'A81939209', sectores:['Infraestructuras','Servicios sociales'],totalAdj:1240, numAdj:198, vinculacion:'Política',   paisMatriz:'Países Bajos', empleados:'82K', webOk:true },
  { nombre:'Indra Sistemas',           cif:'A28599033', sectores:['Defensa','TIC'],                       totalAdj:1080, numAdj:212, vinculacion:'Mediática', paisMatriz:'España', empleados:'58K', webOk:true },
  { nombre:'Sacyr Construcción',       cif:'A83829658', sectores:['Infraestructuras','Energía'],          totalAdj: 920, numAdj:168, vinculacion:'Política',   paisMatriz:'España', empleados:'48K', webOk:true },
  { nombre:'Telefónica Tech',          cif:'B62647011', sectores:['TIC'],                                 totalAdj: 780, numAdj:156, vinculacion:'Ninguna',    paisMatriz:'España', empleados:'18K', webOk:true },
  { nombre:'FCC Aqualia',              cif:'A26019992', sectores:['Infraestructuras','Servicios sociales'],totalAdj: 740, numAdj:188, vinculacion:'Mediática', paisMatriz:'España', empleados:'42K', webOk:true },
  { nombre:'Acciona',                  cif:'A95346790', sectores:['Infraestructuras','Energía'],          totalAdj: 680, numAdj:124, vinculacion:'Ninguna',    paisMatriz:'España', empleados:'40K', webOk:true },
  { nombre:'Iberdrola Renovables',     cif:'A95075028', sectores:['Energía'],                             totalAdj: 540, numAdj: 88, vinculacion:'Ninguna',    paisMatriz:'España', empleados:'45K', webOk:true },
  { nombre:'Roche Farma',              cif:'A28028920', sectores:['Sanidad'],                             totalAdj: 480, numAdj: 62, vinculacion:'Ninguna',    paisMatriz:'Suiza', empleados:'8K', webOk:true },
  { nombre:'Serunion',                 cif:'A98003792', sectores:['Educación','Servicios sociales'],     totalAdj: 320, numAdj:142, vinculacion:'Ninguna',    paisMatriz:'Francia', empleados:'18K', webOk:true },
  { nombre:'Atos Spain',               cif:'A28240752', sectores:['TIC'],                                 totalAdj: 280, numAdj: 96, vinculacion:'Ninguna',    paisMatriz:'Francia', empleados:'12K', webOk:true },
  { nombre:'Aldesa',                   cif:'A78005138', sectores:['Infraestructuras'],                    totalAdj: 220, numAdj: 78, vinculacion:'Investigada',paisMatriz:'España', empleados:'4K', webOk:true },
]

// ─────────────────────────────────────────────────────────────────────────
// Datos · casos mediáticos / investigaciones
// ─────────────────────────────────────────────────────────────────────────
const CASOS: CasoMediatico[] = [
  { caso:'Caso Koldo · mascarillas COVID',     estado:'Sumario abierto',  importe:53.7, protag:'Ex-asesor Min. Transportes',   detalle:'Comisiones por adjudicaciones de mascarillas durante 2020-2021. Trama investigada por TS · 4 detenciones.', severidad:'CRÍTICO' },
  { caso:'Caso DANA emergencias Valencia',     estado:'En instrucción',   importe:142.0, protag:'Generalitat Valenciana',       detalle:'3 modificados sobre contratos de emergencia post-DANA. Sindicatura de Comptes y TVCP investigan.', severidad:'ALTO' },
  { caso:'Caso Aldesa · pliegos a medida',     estado:'En instrucción',   importe:38.4, protag:'Aldesa',                         detalle:'Sospecha de pliegos diseñados para favorecer concesiones · investigado por la Audiencia Nacional.', severidad:'ALTO' },
  { caso:'Caso ITV Madrid',                    estado:'Sentencia',        importe:124.0, protag:'Comunidad de Madrid (cerrado)', detalle:'Reversión de concesión a favor del operador histórico · multa 18M€ · sentencia firme TSJM.',     severidad:'MEDIO' },
  { caso:'Caso radar costero Defensa',         estado:'En instrucción',   importe:266.4, protag:'Indra Sistemas',                detalle:'Pliego con requisitos muy específicos · 3 licitadores · denuncia de competencia desleal.', severidad:'ALTO' },
  { caso:'Caso ferries Baleares',              estado:'Archivado',        importe: 88.0, protag:'Conselleria Mar Govern',        detalle:'Investigación sobre prórrogas sin licitación · archivado por falta de pruebas.',                  severidad:'BAJO' },
]

// Series temporales · adjudicaciones por mes
const SERIE_MENSUAL = {
  meses: ['Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb','Mar','Abr','May'],
  numero:[ 248, 198, 312, 318, 342, 358, 396, 412, 442, 468, 285 ],
  importe:[ 4.2, 3.5, 5.8, 6.2, 7.1, 7.8, 8.4, 9.1, 9.8, 10.4, 6.2 ], // mil M€
}

// Distribución por tipo de procedimiento
const POR_PROC = [
  { p:'Abierto',              n:42.4 },
  { p:'Acuerdo marco',         n:18.6 },
  { p:'Restringido',          n:14.2 },
  { p:'Negociado',            n:10.8 },
  { p:'Diálogo competitivo',  n: 6.4 },
  { p:'Emergencia',           n: 4.8 },
  { p:'Concursal',            n: 2.8 },
] as { p: Procedimiento; n: number }[]

// Distribución por sector (% del importe total)
const POR_SECTOR = [
  { s:'Infraestructuras',    n:28.4 },
  { s:'Sanidad',              n:18.6 },
  { s:'Defensa',              n:14.2 },
  { s:'TIC',                  n:12.8 },
  { s:'Servicios sociales',   n:10.5 },
  { s:'Energía',              n: 8.2 },
  { s:'Educación',            n: 5.1 },
  { s:'Otros',                n: 2.2 },
] as { s: Sector; n: number }[]

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function AdjudicacionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [tab, setTab] = useState<'recientes' | 'organismos' | 'empresas' | 'casos' | 'series' | 'distribucion'>('recientes')
  const [filterRiesgo, setFilterRiesgo] = useState<RiesgoAlerta | 'Todos'>('Todos')
  const [query, setQuery] = useState('')

  const totals = useMemo(() => {
    const totalImporte = ADJUDICACIONES.reduce((s, a) => s + a.importeAdj, 0) / 1_000_000
    const bajaMedia = ADJUDICACIONES.reduce((s, a) => s + a.baja, 0) / ADJUDICACIONES.length
    const numEmergencia = ADJUDICACIONES.filter(a => a.procedimiento === 'Emergencia').length
    const conAlertas = ADJUDICACIONES.filter(a => a.alertas.length > 0).length
    const criticos = ADJUDICACIONES.filter(a => a.riesgo === 'CRÍTICO' || a.riesgo === 'ALTO').length
    return { total: ADJUDICACIONES.length, totalImporte, bajaMedia, numEmergencia, conAlertas, criticos }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ADJUDICACIONES
      .filter(a => filterRiesgo === 'Todos' || a.riesgo === filterRiesgo)
      .filter(a => !q || a.titulo.toLowerCase().includes(q) || a.organismo.toLowerCase().includes(q) || a.adjudicatario.toLowerCase().includes(q) || a.exp.toLowerCase().includes(q))
      .sort((a,b) => parseDate(b.fechaAdj).getTime() - parseDate(a.fechaAdj).getTime())
  }, [filterRiesgo, query])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#0F766E 0%,#042F2E 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              LICITACIONES Y CONTRATACIÓN PÚBLICA · INTELIGENCIA DE ADJUDICACIONES
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              {totals.totalImporte.toFixed(0)} M€ adjudicados <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>en últimas 6 semanas</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              {totals.total} expedientes monitorizados · {totals.criticos} con riesgo alto o crítico · {totals.numEmergencia} por emergencia · {totals.conAlertas} con alertas activas. Cruce con BOE, PLACSP, FNMT y datos abiertos del Tribunal de Cuentas.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            <HeroKPI label="Expedientes" value={String(totals.total)}                 accent="#86EFAC"/>
            <HeroKPI label="∑ Importe"   value={`${totals.totalImporte.toFixed(0)}M€`} accent="#7DD3FC"/>
            <HeroKPI label="Baja media"   value={`${totals.bajaMedia.toFixed(1)}%`}    accent="#FCD34D"/>
            <HeroKPI label="Críticos"     value={String(totals.criticos)}              accent="#FCA5A5"/>
          </div>
        </section>

        {/* ═══ PLACSP · adjudicaciones reales en vivo ═══ */}
        <ContratosLiveFeed
          tipo="both"
          estado="ADJ"
          limit={12}
          titulo="ADJUDICACIONES RECIENTES · PLACSP"
        />

        {/* ───── Snapshot · 8 KPIs detallados ───── */}
        <section style={{ marginBottom:18 }}>
          <SectionHeader label="Snapshot del mercado" count="2026 · ene-may" accent="#0F766E"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            <SKpi label="Total adjudicado 2026"     value="68.4"    sub="mil M€"   delta="+12.4%"  pos color="#0F766E"/>
            <SKpi label="Nº de expedientes"          value="9.842"   sub="acum."    delta="+8.5%"  pos color="#5B21B6"/>
            <SKpi label="Importe medio"              value="6.95"    sub="M€/exp"   delta="+3.2%"  pos color="#1F4E8C"/>
            <SKpi label="Baja media"                  value="5.8"    sub="% global" delta="−0.4 pp" color="#F97316"/>
            <SKpi label="% emergencia"                value="4.8"    sub="% del €"  delta="+0.6 pp" color="#DC2626"/>
            <SKpi label="% modificados"               value="11.2"   sub="vs base"  delta="−0.8 pp" pos color="#16A34A"/>
            <SKpi label="Conc. top-10 empresas"      value="38.4"    sub="% del €"  delta="+1.4 pp" color="#EAB308"/>
            <SKpi label="Recursos ante TACRC"        value="284"    sub="enero-mayo" delta="+18.4%" color="#DC2626"/>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'recientes',     label:'Adjudicaciones recientes', count: ADJUDICACIONES.length },
            { k:'organismos',    label:'Organismos contratantes',  count: ORGANISMOS.length },
            { k:'empresas',      label:'Empresas adjudicatarias',  count: EMPRESAS.length },
            { k:'casos',         label:'Casos e investigaciones',  count: CASOS.length },
            { k:'series',        label:'Evolución temporal',        count: SERIE_MENSUAL.meses.length },
            { k:'distribucion',  label:'Distribución por sector',  count: POR_SECTOR.length },
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

        {/* ───── TAB · Recientes ───── */}
        {tab === 'recientes' && (
          <>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:12 }}>
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por título, organismo, empresa o expediente…"
                style={{ flex:'1 1 280px', maxWidth:380, padding:'9px 14px', borderRadius:10, border:'1px solid #ECECEF', background:'#fff', fontSize:13, fontFamily:'inherit', outline:'none', color:'#1d1d1f' }}/>
              <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Riesgo:</span>
              <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3 }}>
                {(['Todos','CRÍTICO','ALTO','MEDIO','BAJO'] as const).map(r => {
                  const active = filterRiesgo === r
                  const col = r === 'Todos' ? '#1d1d1f' : RIESGO_C[r as RiesgoAlerta]
                  return (
                    <button key={r} onClick={() => setFilterRiesgo(r)} style={{
                      background: active ? '#fff' : 'transparent',
                      color: active ? col : '#6e6e73',
                      border:'none', borderRadius:999, padding:'4px 12px',
                      fontSize:11, fontWeight: active ? 700 : 500, cursor:'pointer',
                      fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}>{r}</button>
                  )
                })}
              </div>
              <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{filtered.length} expedientes visibles</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filtered.map(a => (
                <article key={a.id} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                  boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
                  borderLeft:`4px solid ${RIESGO_C[a.riesgo]}`,
                }}>
                  <header style={{ padding:'12px 16px', display:'grid', gridTemplateColumns:'1fr auto', gap:10, borderBottom:'1px solid #F5F5F7' }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
                        <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:4, background:RIESGO_C[a.riesgo], color:'#fff' }}>RIESGO {a.riesgo}</span>
                        <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:`${SECTOR_COLOR[a.sector]}15`, color:SECTOR_COLOR[a.sector], border:`1px solid ${SECTOR_COLOR[a.sector]}40` }}>{a.sector.toUpperCase()}</span>
                        <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:`${PROC_COLOR[a.procedimiento]}15`, color:PROC_COLOR[a.procedimiento], border:`1px solid ${PROC_COLOR[a.procedimiento]}40` }}>{a.procedimiento.toUpperCase()}</span>
                        <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:999, background:`${EST_C[a.estado]}15`, color:EST_C[a.estado], border:`1px solid ${EST_C[a.estado]}40` }}>{a.estado.toUpperCase()}</span>
                        <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:600 }}>· EXP. {a.exp}</span>
                      </div>
                      <h3 style={{ margin:'0 0 3px', fontFamily:'var(--font-display)', fontSize:14.5, fontWeight:600, letterSpacing:'-0.012em', color:'#1d1d1f', lineHeight:1.3 }}>{a.titulo}</h3>
                      <div style={{ fontSize:11.5, color:'#3a3a3d' }}>{a.organismo} · <span style={{ color:'#6e6e73' }}>{a.ccaa}</span></div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0, minWidth:140 }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'#0F766E', letterSpacing:'-0.018em', lineHeight:1 }}>
                        {(a.importeAdj / 1_000_000).toFixed(1)}<span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>M€</span>
                      </div>
                      <div style={{ fontSize:9.5, color:'#86868b', marginTop:2 }}>vs base {(a.importeBase / 1_000_000).toFixed(1)}M€</div>
                      <div style={{ fontSize:10.5, fontWeight:700, color: a.baja >= 5 ? '#16A34A' : a.baja > 0 ? '#F97316' : '#DC2626', marginTop:3 }}>
                        {a.baja > 0 ? '▼' : '→'} baja {a.baja.toFixed(1)}%
                      </div>
                    </div>
                  </header>
                  <div style={{ padding:'12px 16px', display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:14, alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>Adjudicatario</div>
                      <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f' }}>{a.adjudicatario}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>Licitadores</div>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color: a.numLicit >= 5 ? '#16A34A' : a.numLicit >= 3 ? '#F97316' : '#DC2626' }}>{a.numLicit > 0 ? a.numLicit : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>Duración</div>
                      <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f' }}>{a.duracion}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>Adjudicación</div>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:12.5, fontWeight:700, color:'#1d1d1f' }}>{a.fechaAdj}</div>
                    </div>
                  </div>
                  {a.alertas.length > 0 && (
                    <div style={{ background:'#FEF2F2', borderTop:'1px solid #FECACA', padding:'8px 16px' }}>
                      <div style={{ fontSize:9, fontWeight:800, color:'#DC2626', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:3 }}>Alertas</div>
                      {a.alertas.map((al, i) => (
                        <div key={i} style={{ fontSize:11, color:'#7F1D1D', display:'flex', gap:6, lineHeight:1.4, marginBottom:2 }}>
                          <span style={{ color:'#DC2626', fontWeight:800, flexShrink:0 }}>!</span>{al}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}

        {/* ───── TAB · Organismos ───── */}
        {tab === 'organismos' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:980 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['#','Organismo','Tipo','∑ Adjudicado','Nº exp.','Baja media','Conc. top-1','% modific.','Salud licitadora'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...ORGANISMOS].sort((a,b) => b.totalAdj - a.totalAdj).map((o, i) => {
                    // Salud licitadora: alta baja media + baja concentración + bajo % modificados
                    const salud = Math.round((o.bajaMedia * 6) + (100 - o.concentracion) * 0.4 + (100 - o.modificacionesPct * 2) * 0.3)
                    const sCol = salud >= 70 ? '#16A34A' : salud >= 50 ? '#F97316' : '#DC2626'
                    return (
                      <tr key={o.nombre} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:800, color:'#1d1d1f' }}>{i+1}</td>
                        <td style={{ padding:'10px 12px', fontWeight:600, color:'#1d1d1f' }}>{o.nombre}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{
                            fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                            padding:'2px 7px', borderRadius:4,
                            background: o.tipo === 'AGE' ? '#1F4E8C' : o.tipo === 'CCAA' ? '#5B21B6' : o.tipo === 'Local' ? '#16A34A' : '#525258',
                            color:'#fff',
                          }}>{o.tipo.toUpperCase()}</span>
                        </td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#0F766E' }}>{o.totalAdj.toLocaleString('es-ES')}M€</td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>{o.numAdj}</td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color: o.bajaMedia >= 6 ? '#16A34A' : o.bajaMedia >= 3 ? '#F97316' : '#DC2626' }}>{o.bajaMedia.toFixed(1)}%</td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                              <div style={{ width:`${o.concentracion}%`, height:'100%', background: o.concentracion >= 40 ? '#DC2626' : o.concentracion >= 25 ? '#F97316' : '#16A34A' }}/>
                            </div>
                            <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:'#1d1d1f', minWidth:28, textAlign:'right' }}>{o.concentracion}%</span>
                          </div>
                        </td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color: o.modificacionesPct >= 15 ? '#DC2626' : o.modificacionesPct >= 10 ? '#F97316' : '#16A34A' }}>{o.modificacionesPct}%</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{
                            fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                            padding:'3px 8px', borderRadius:999,
                            background:`${sCol}15`, color:sCol, border:`1px solid ${sCol}40`,
                          }}>{salud}/100</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Empresas ───── */}
        {tab === 'empresas' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:980 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['#','Empresa','CIF','Sectores','∑ Adjudicado','Nº exp.','Empleados','Vinculación','País matriz'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...EMPRESAS].sort((a,b) => b.totalAdj - a.totalAdj).map((e, i) => {
                    const vincCol = e.vinculacion === 'Investigada' ? '#DC2626' : e.vinculacion === 'Política' ? '#F97316' : e.vinculacion === 'Mediática' ? '#EAB308' : '#16A34A'
                    return (
                      <tr key={e.cif} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:800, color:'#1d1d1f' }}>{i+1}</td>
                        <td style={{ padding:'10px 12px', fontWeight:600, color:'#1d1d1f' }}>{e.nombre}</td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', color:'#6e6e73', fontSize:11 }}>{e.cif}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                            {e.sectores.map(s => (
                              <span key={s} style={{
                                fontSize:8.5, fontWeight:800, letterSpacing:'0.06em',
                                padding:'1px 6px', borderRadius:4,
                                background:`${SECTOR_COLOR[s]}15`, color:SECTOR_COLOR[s], border:`1px solid ${SECTOR_COLOR[s]}40`,
                              }}>{s.toUpperCase()}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#0F766E' }}>{e.totalAdj.toLocaleString('es-ES')}M€</td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>{e.numAdj}</td>
                        <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', color:'#3a3a3d' }}>{e.empleados}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{
                            fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                            padding:'2px 7px', borderRadius:999,
                            background:`${vincCol}15`, color:vincCol, border:`1px solid ${vincCol}40`,
                          }}>{e.vinculacion.toUpperCase()}</span>
                        </td>
                        <td style={{ padding:'10px 12px', color:'#3a3a3d', fontSize:11 }}>{e.paisMatriz}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Casos ───── */}
        {tab === 'casos' && (
          <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))', gap:10 }}>
            {[...CASOS].sort((a,b) => {
              const order = { 'CRÍTICO':0, 'ALTO':1, 'MEDIO':2, 'BAJO':3 } as Record<RiesgoAlerta, number>
              return order[a.severidad] - order[b.severidad]
            }).map((c, i) => {
              const estCol = c.estado === 'Sumario abierto' ? '#DC2626' : c.estado === 'En instrucción' ? '#F97316' : c.estado === 'Sentencia' ? '#5B21B6' : '#525258'
              return (
                <article key={i} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                  padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`3px solid ${RIESGO_C[c.severidad]}`,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:4, background:RIESGO_C[c.severidad], color:'#fff' }}>{c.severidad}</span>
                    <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:999, background:`${estCol}15`, color:estCol, border:`1px solid ${estCol}40` }}>{c.estado.toUpperCase()}</span>
                    <span style={{ marginLeft:'auto', fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#0F766E' }}>{c.importe.toFixed(1)}M€</span>
                  </div>
                  <h4 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color:'#1d1d1f', letterSpacing:'-0.012em' }}>{c.caso}</h4>
                  <div style={{ fontSize:10.5, color:'#6e6e73', marginBottom:8 }}>{c.protag}</div>
                  <p style={{ margin:0, fontSize:11.5, color:'#3a3a3d', lineHeight:1.45 }}>{c.detalle}</p>
                </article>
              )
            })}
          </section>
        )}

        {/* ───── TAB · Series ───── */}
        {tab === 'series' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Evolución mensual de las adjudicaciones · 11 meses</h3>
            <p style={{ margin:'0 0 18px', fontSize:11.5, color:'#6e6e73' }}>Volumen total y número de expedientes · 2025 · primera mitad de 2026</p>
            <BigSeries meses={SERIE_MENSUAL.meses} importe={SERIE_MENSUAL.importe} numero={SERIE_MENSUAL.numero}/>
            <div style={{ marginTop:18, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
              <Mini label="Mejor mes (importe)" value="10.4 mil M€" sub="abril 2026" color="#0F766E"/>
              <Mini label="Mejor mes (volumen)" value="468"          sub="abril 2026"   color="#5B21B6"/>
              <Mini label="Crecimiento YoY"     value="+18.4%"       sub="vs mismo periodo 2025" color="#16A34A"/>
            </div>
          </section>
        )}

        {/* ───── TAB · Distribución ───── */}
        {tab === 'distribucion' && (
          <section style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {/* Por sector */}
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Por sector · % del importe total</h3>
              <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Reparto sectorial de los 68.4 mil M€ adjudicados</p>
              <div style={{ display:'flex', height:34, borderRadius:8, overflow:'hidden', marginBottom:14 }}>
                {POR_SECTOR.map(s => (
                  <div key={s.s} title={`${s.s}: ${s.n}%`} style={{
                    width:`${s.n}%`, background:SECTOR_COLOR[s.s],
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'#fff', fontFamily:'var(--font-display)', fontWeight:700, fontSize:10,
                  }}>{s.n >= 8 ? `${s.n}%` : ''}</div>
                ))}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {POR_SECTOR.map(s => (
                  <div key={s.s} style={{ display:'grid', gridTemplateColumns:'12px 1fr auto', gap:8, alignItems:'center' }}>
                    <span style={{ width:10, height:10, borderRadius:2, background:SECTOR_COLOR[s.s], display:'inline-block' }}/>
                    <span style={{ fontSize:11.5, color:'#1d1d1f', fontWeight:600 }}>{s.s}</span>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:SECTOR_COLOR[s.s] }}>{s.n}%</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Por procedimiento */}
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Por procedimiento · % del nº de expedientes</h3>
              <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Tipos de procedimiento usados · vigilar emergencia y negociado</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {POR_PROC.map(p => (
                  <div key={p.p}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:600, color:'#1d1d1f' }}>
                        <span style={{ width:9, height:9, borderRadius:2, background:PROC_COLOR[p.p], display:'inline-block' }}/>
                        {p.p}
                      </span>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:12.5, fontWeight:700, color:PROC_COLOR[p.p] }}>{p.n}%</span>
                    </div>
                    <div style={{ height:7, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${(p.n / 50) * 100}%`, height:'100%', background:PROC_COLOR[p.p], borderRadius:3 }}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14, padding:'10px 12px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8 }}>
                <div style={{ fontSize:9, fontWeight:800, color:'#DC2626', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:3 }}>Bandera roja</div>
                <p style={{ margin:0, fontSize:11.5, color:'#7F1D1D', lineHeight:1.4 }}>El 4.8% del importe va por <strong>emergencia</strong> sin licitación pública (DANA). Aumentó +1.2 pp vs 2025 · vigilar concentración de adjudicatarios y modificados.</p>
              </div>
            </div>
          </section>
        )}

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Inteligencia de Adjudicaciones · Politeia Analítica · {new Date().getFullYear()}
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
        <span style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color, letterSpacing:'-0.022em', lineHeight:1 }}>{value}</span>
        {sub && <span style={{ fontSize:10, color:'#86868b', fontWeight:600 }}>{sub}</span>}
      </div>
      {delta && (
        <div style={{ fontSize:10, fontWeight:700, color: pos ? '#16A34A' : '#DC2626', marginTop:5 }}>
          {pos ? '▲' : '▼'} {delta}
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:9.5, color:'#86868b', fontWeight:600, marginTop:3 }}>{sub}</div>
      <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase', marginTop:5 }}>{label}</div>
    </div>
  )
}

function BigSeries({ meses, importe, numero }: { meses: string[], importe: number[], numero: number[] }) {
  const w = 800, h = 220, padL = 40, padR = 40, padT = 14, padB = 26
  const maxImp = Math.max(...importe) * 1.1
  const maxNum = Math.max(...numero) * 1.1
  const xs = meses.map((_, i) => padL + (i / (meses.length - 1)) * (w - padL - padR))
  const ysImp = importe.map(v => h - padB - (v / maxImp) * (h - padT - padB))
  const ysNum = numero.map(v => h - padB - (v / maxNum) * (h - padT - padB))
  const lineImp = ysImp.map((y, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]} ${y}`).join(' ')
  const areaImp = `M ${xs[0]} ${h - padB} L ${xs[0]} ${ysImp[0]} ` + ysImp.map((y, i) => `L ${xs[i]} ${y}`).join(' ') + ` L ${xs[xs.length-1]} ${h - padB} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:h, display:'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="g-adj" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F766E" stopOpacity="0.32"/>
          <stop offset="100%" stopColor="#0F766E" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(p => (
        <line key={p} x1={padL} y1={(h-padB) - p * (h - padT - padB)} x2={w - padR} y2={(h-padB) - p * (h - padT - padB)} stroke="#ECECEF" strokeDasharray="2 4" strokeWidth="1"/>
      ))}
      <path d={areaImp} fill="url(#g-adj)"/>
      <path d={lineImp} fill="none" stroke="#0F766E" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/>
      {/* Barras de número (eje secundario) */}
      {numero.map((v, i) => {
        const yTop = h - padB - (v / maxNum) * (h - padT - padB) * 0.5
        const bw = 8
        return <rect key={i} x={xs[i] - bw/2} y={yTop} width={bw} height={h - padB - yTop} fill="#5B21B6" opacity="0.4" rx="2"/>
      })}
      {/* Puntos de importe */}
      {ysImp.map((y, i) => <circle key={i} cx={xs[i]} cy={y} r="3" fill="#0F766E"/>)}
      {/* Etiquetas mes */}
      {meses.map((m, i) => (
        <text key={m} x={xs[i]} y={h - 6} textAnchor="middle" fontSize="10" fontWeight="600" fill="#6e6e73">{m}</text>
      ))}
      {/* Eje izq (importe) */}
      <text x={padL - 6} y={padT + 4} textAnchor="end" fontSize="9" fill="#0F766E" fontWeight="700">mil M€</text>
      <text x={padL - 6} y={h - padB + 3} textAnchor="end" fontSize="9" fill="#6e6e73">0</text>
      <text x={padL - 6} y={padT + 12} textAnchor="end" fontSize="10" fill="#0F766E" fontWeight="700">{maxImp.toFixed(0)}</text>
      {/* Eje dcha (número) */}
      <text x={w - padR + 6} y={padT + 4} textAnchor="start" fontSize="9" fill="#5B21B6" fontWeight="700">nº exp.</text>
      <text x={w - padR + 6} y={padT + 12} textAnchor="start" fontSize="10" fill="#5B21B6" fontWeight="700">{maxNum.toFixed(0)}</text>
    </svg>
  )
}

// dd/mm/yyyy → Date
function parseDate(s: string): Date {
  const [d, m, y] = s.split('/').map(Number)
  return new Date(y, m - 1, d)
}
