'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import ContratosLiveFeed from '@/components/ContratosLiveFeed'

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────
type Sector = 'Sanidad' | 'Defensa' | 'Infraestructuras' | 'TIC' | 'Energía' | 'Educación' | 'Servicios sociales' | 'Cultura' | 'Otros'
type Tipo = 'Servicios' | 'Suministro' | 'Obras' | 'Concesión' | 'Mixto'
type Procedimiento = 'Abierto' | 'Restringido' | 'Negociado' | 'Diálogo competitivo' | 'Acuerdo marco' | 'Simplificado'
type Estado = 'Anuncio previo' | 'En plazo' | 'En estudio' | 'Adjudicación' | 'Cerrado'
type Fuente = 'PLACSP' | 'BOE' | 'TED (UE)' | 'BOCG' | 'Generalitat' | 'Junta Andalucía' | 'C. Madrid' | 'Ayto. Madrid' | 'Ayto. Barcelona' | 'Otros'
type Match = 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO'

type Licitacion = {
  id: string
  exp: string
  titulo: string
  organismo: string
  ccaa: string
  sector: Sector
  tipo: Tipo
  procedimiento: Procedimiento
  estado: Estado
  fuente: Fuente
  importeBase: number     // €
  cpv: string             // código CPV
  publicacion: string     // dd/mm/yyyy
  fechaLimite: string
  diasRestantes: number   // negativo si ya cerrada
  pliegos: number         // nº de documentos
  match: Match
  matchScore: number      // 0-100
  keywords: string[]
  region: string
  duracion: string
}

const SECTOR_COLOR: Record<Sector, string> = {
  'Sanidad':'#0EA5E9', 'Defensa':'#525258', 'Infraestructuras':'#F97316',
  'TIC':'#5B21B6', 'Energía':'#16A34A', 'Educación':'#1F4E8C',
  'Servicios sociales':'#D43F8D', 'Cultura':'#7C3AED', 'Otros':'#6e6e73',
}
const TIPO_COLOR: Record<Tipo, string> = {
  'Servicios':'#1F4E8C', 'Suministro':'#16A34A', 'Obras':'#F97316',
  'Concesión':'#7C3AED', 'Mixto':'#525258',
}
const ESTADO_COLOR: Record<Estado, string> = {
  'Anuncio previo':'#0EA5E9', 'En plazo':'#16A34A', 'En estudio':'#F97316',
  'Adjudicación':'#5B21B6', 'Cerrado':'#525258',
}
const MATCH_COLOR: Record<Match, string> = {
  'CRÍTICO':'#DC2626', 'ALTO':'#F97316', 'MEDIO':'#EAB308', 'BAJO':'#0EA5E9',
}
const FUENTE_COLOR: Record<Fuente, string> = {
  'PLACSP':'#1F4E8C', 'BOE':'#5B21B6', 'TED (UE)':'#0EA5E9', 'BOCG':'#7C3AED',
  'Generalitat':'#F97316', 'Junta Andalucía':'#16A34A', 'C. Madrid':'#DC2626',
  'Ayto. Madrid':'#0F766E', 'Ayto. Barcelona':'#525258', 'Otros':'#6e6e73',
}

// ─────────────────────────────────────────────────────────────────────────
// Datos · 18 licitaciones agregadas (mock)
// ─────────────────────────────────────────────────────────────────────────
const LICITACIONES: Licitacion[] = [
  { id:'l01', exp:'2026/HM-AVE-LOTE-3', titulo:'Mantenimiento integral · línea AVE Madrid-Levante (lote 3)',
    organismo:'ADIF Alta Velocidad', ccaa:'Estatal', region:'Madrid · Cuenca · Valencia',
    sector:'Infraestructuras', tipo:'Servicios', procedimiento:'Abierto', estado:'En plazo', fuente:'PLACSP',
    importeBase:218_400_000, cpv:'50225000-8', publicacion:'02/05/2026', fechaLimite:'12/06/2026', diasRestantes:36,
    pliegos:14, match:'CRÍTICO', matchScore:94, duracion:'48 meses',
    keywords:['AVE','mantenimiento','infraestructura ferroviaria','catenaria'] },

  { id:'l02', exp:'2026/MISAN-RT-022', titulo:'Suministro de equipos de radioterapia · 12 hospitales SNS',
    organismo:'INGESA · Ministerio de Sanidad', ccaa:'Estatal', region:'Multi-CCAA',
    sector:'Sanidad', tipo:'Suministro', procedimiento:'Acuerdo marco', estado:'En plazo', fuente:'PLACSP',
    importeBase:148_200_000, cpv:'33150000-6', publicacion:'29/04/2026', fechaLimite:'09/06/2026', diasRestantes:33,
    pliegos:11, match:'ALTO', matchScore:82, duracion:'36 meses',
    keywords:['oncología','radioterapia','equipos médicos','hospitales'] },

  { id:'l03', exp:'2026/MIN-DEF-CIBER', titulo:'Plataforma integral de ciberdefensa · operaciones',
    organismo:'Ministerio de Defensa · INTA', ccaa:'Estatal', region:'Madrid',
    sector:'Defensa', tipo:'Servicios', procedimiento:'Restringido', estado:'En plazo', fuente:'PLACSP',
    importeBase:84_500_000, cpv:'72222300-0', publicacion:'25/04/2026', fechaLimite:'18/06/2026', diasRestantes:42,
    pliegos:18, match:'CRÍTICO', matchScore:91, duracion:'24 meses',
    keywords:['ciberdefensa','SIEM','SOC','operaciones militares'] },

  { id:'l04', exp:'2026/CAT-SAL-ATEN', titulo:'Externalización servicios de atención primaria · Generalitat',
    organismo:'CatSalut · Generalitat de Catalunya', ccaa:'Cataluña', region:'Barcelona · Lleida · Girona · Tarragona',
    sector:'Sanidad', tipo:'Servicios', procedimiento:'Abierto', estado:'En plazo', fuente:'Generalitat',
    importeBase:312_000_000, cpv:'85100000-0', publicacion:'22/04/2026', fechaLimite:'05/06/2026', diasRestantes:29,
    pliegos:22, match:'ALTO', matchScore:78, duracion:'48 meses',
    keywords:['atención primaria','salud','externalización','centros médicos'] },

  { id:'l05', exp:'2026/MAD-EDU-DIG', titulo:'Renovación digital aulas · 412 centros públicos',
    organismo:'Consejería Educación · Comunidad de Madrid', ccaa:'Madrid', region:'Madrid',
    sector:'Educación', tipo:'Suministro', procedimiento:'Abierto', estado:'En plazo', fuente:'C. Madrid',
    importeBase:62_800_000, cpv:'30236000-2', publicacion:'18/04/2026', fechaLimite:'02/06/2026', diasRestantes:26,
    pliegos:9, match:'MEDIO', matchScore:64, duracion:'18 meses',
    keywords:['educación','digitalización','equipos','aulas'] },

  { id:'l06', exp:'2026/IDAE-H2V-04', titulo:'Subvención capacidad hidrógeno verde · 4ª subasta',
    organismo:'IDAE · Ministerio de Transición Ecológica', ccaa:'Estatal', region:'Multi-CCAA',
    sector:'Energía', tipo:'Concesión', procedimiento:'Restringido', estado:'En plazo', fuente:'BOE',
    importeBase:480_000_000, cpv:'09134000-7', publicacion:'15/04/2026', fechaLimite:'15/06/2026', diasRestantes:39,
    pliegos:24, match:'ALTO', matchScore:74, duracion:'120 meses',
    keywords:['hidrógeno verde','renovables','subasta','capacidad'] },

  { id:'l07', exp:'2026/AND-ATG-INF', titulo:'Conservación carreteras autonómicas Andalucía · 2026-2030',
    organismo:'Junta de Andalucía · Consejería Fomento', ccaa:'Andalucía', region:'8 provincias',
    sector:'Infraestructuras', tipo:'Obras', procedimiento:'Abierto', estado:'En plazo', fuente:'Junta Andalucía',
    importeBase:182_000_000, cpv:'45233140-2', publicacion:'12/04/2026', fechaLimite:'30/05/2026', diasRestantes:23,
    pliegos:16, match:'ALTO', matchScore:80, duracion:'48 meses',
    keywords:['carreteras','conservación','obras','Andalucía'] },

  { id:'l08', exp:'2026/AYT-MAD-LIM', titulo:'Recogida residuos · Distrito Centro y Salamanca',
    organismo:'Ayuntamiento de Madrid', ccaa:'Madrid', region:'Madrid · Distrito Centro y Salamanca',
    sector:'Servicios sociales', tipo:'Servicios', procedimiento:'Abierto', estado:'En estudio', fuente:'Ayto. Madrid',
    importeBase:142_400_000, cpv:'90511000-2', publicacion:'08/04/2026', fechaLimite:'27/05/2026', diasRestantes:20,
    pliegos:13, match:'MEDIO', matchScore:58, duracion:'48 meses',
    keywords:['residuos','limpieza','servicios urbanos'] },

  { id:'l09', exp:'2026/UE-DIGI-CLOUD', titulo:'Cloud sovereign · servicios infraestructura crítica',
    organismo:'Comisión Europea · DG DIGIT', ccaa:'UE', region:'EU-27',
    sector:'TIC', tipo:'Servicios', procedimiento:'Abierto', estado:'En plazo', fuente:'TED (UE)',
    importeBase:1_240_000_000, cpv:'72611000-6', publicacion:'05/04/2026', fechaLimite:'20/06/2026', diasRestantes:44,
    pliegos:32, match:'ALTO', matchScore:72, duracion:'60 meses',
    keywords:['cloud soberano','infraestructura crítica','UE','GAIA-X'] },

  { id:'l10', exp:'2026/MIN-VIV-ASEQ', titulo:'Construcción 4.500 viviendas asequibles · plan estatal',
    organismo:'Ministerio de Vivienda y Agenda Urbana', ccaa:'Estatal', region:'Multi-CCAA',
    sector:'Servicios sociales', tipo:'Obras', procedimiento:'Diálogo competitivo', estado:'Anuncio previo', fuente:'BOE',
    importeBase:680_000_000, cpv:'45211000-9', publicacion:'02/04/2026', fechaLimite:'25/06/2026', diasRestantes:49,
    pliegos:8, match:'CRÍTICO', matchScore:88, duracion:'42 meses',
    keywords:['vivienda asequible','construcción','plan estatal','SEPES'] },

  { id:'l11', exp:'2026/MIN-CULT-MUS', titulo:'Reforma integral del Museo del Prado · Edificio Villanueva',
    organismo:'Ministerio de Cultura · Patrimonio Nacional', ccaa:'Estatal', region:'Madrid',
    sector:'Cultura', tipo:'Obras', procedimiento:'Restringido', estado:'En plazo', fuente:'BOE',
    importeBase:32_000_000, cpv:'45454100-5', publicacion:'30/03/2026', fechaLimite:'22/05/2026', diasRestantes:15,
    pliegos:18, match:'BAJO', matchScore:42, duracion:'30 meses',
    keywords:['museo','patrimonio','restauración','Madrid'] },

  { id:'l12', exp:'2026/SERMAS-ONCO', titulo:'Suministro fármacos oncológicos · 24 hospitales Madrid',
    organismo:'SERMAS · Comunidad de Madrid', ccaa:'Madrid', region:'Madrid',
    sector:'Sanidad', tipo:'Suministro', procedimiento:'Acuerdo marco', estado:'En plazo', fuente:'C. Madrid',
    importeBase:124_500_000, cpv:'33652000-5', publicacion:'28/03/2026', fechaLimite:'19/05/2026', diasRestantes:12,
    pliegos:7, match:'ALTO', matchScore:76, duracion:'24 meses',
    keywords:['fármacos','oncología','hospitales','SERMAS'] },

  { id:'l13', exp:'2026/AYT-BCN-T1', titulo:'Operación tranvía conexión T1-T2 · Diagonal Mar',
    organismo:'Ayuntamiento de Barcelona · TMB', ccaa:'Cataluña', region:'Barcelona',
    sector:'Infraestructuras', tipo:'Concesión', procedimiento:'Diálogo competitivo', estado:'En plazo', fuente:'Ayto. Barcelona',
    importeBase:340_000_000, cpv:'60112000-6', publicacion:'25/03/2026', fechaLimite:'10/06/2026', diasRestantes:34,
    pliegos:21, match:'MEDIO', matchScore:62, duracion:'180 meses',
    keywords:['tranvía','transporte','concesión','Barcelona'] },

  { id:'l14', exp:'2026/MIN-DEF-FCH', titulo:'Modernización flota de helicópteros · 28 unidades',
    organismo:'Ministerio de Defensa · DGAM', ccaa:'Estatal', region:'Múltiples bases',
    sector:'Defensa', tipo:'Suministro', procedimiento:'Restringido', estado:'En plazo', fuente:'PLACSP',
    importeBase:540_000_000, cpv:'34711200-6', publicacion:'22/03/2026', fechaLimite:'08/06/2026', diasRestantes:32,
    pliegos:28, match:'ALTO', matchScore:78, duracion:'60 meses',
    keywords:['helicópteros','defensa','flota','modernización'] },

  { id:'l15', exp:'2026/RTVE-ESTU', titulo:'Renovación equipos estudios · servicios audiovisuales',
    organismo:'Corporación RTVE', ccaa:'Estatal', region:'Madrid · Barcelona · Sevilla',
    sector:'TIC', tipo:'Suministro', procedimiento:'Abierto', estado:'En plazo', fuente:'PLACSP',
    importeBase:18_400_000, cpv:'32320000-2', publicacion:'18/03/2026', fechaLimite:'14/05/2026', diasRestantes:7,
    pliegos:9, match:'BAJO', matchScore:38, duracion:'24 meses',
    keywords:['audiovisual','equipos','TV','radio'] },

  { id:'l16', exp:'2026/CCAA-DEP-AGU', titulo:'Saneamiento integral · río Llobregat (depuradoras)',
    organismo:'ACA · Generalitat de Catalunya', ccaa:'Cataluña', region:'Cuenca Llobregat',
    sector:'Infraestructuras', tipo:'Obras', procedimiento:'Abierto', estado:'En plazo', fuente:'Generalitat',
    importeBase:268_000_000, cpv:'45252100-9', publicacion:'14/03/2026', fechaLimite:'02/06/2026', diasRestantes:26,
    pliegos:24, match:'MEDIO', matchScore:64, duracion:'42 meses',
    keywords:['agua','depuradoras','saneamiento','Llobregat'] },

  { id:'l17', exp:'2026/MISAN-VAC-26', titulo:'Suministro vacunas calendario sistemático 2026-2027',
    organismo:'INGESA · Ministerio de Sanidad', ccaa:'Estatal', region:'Multi-CCAA',
    sector:'Sanidad', tipo:'Suministro', procedimiento:'Acuerdo marco', estado:'Adjudicación', fuente:'PLACSP',
    importeBase:248_000_000, cpv:'33651600-4', publicacion:'10/03/2026', fechaLimite:'12/04/2026', diasRestantes:-25,
    pliegos:6, match:'BAJO', matchScore:48, duracion:'24 meses',
    keywords:['vacunas','sanidad','suministro'] },

  { id:'l18', exp:'2026/UE-EOR-IBE', titulo:'Conexión eólica marina · Atlántico ibérico (offshore)',
    organismo:'Comisión Europea · BEI · MITECO', ccaa:'UE', region:'Galicia · Asturias · Portugal',
    sector:'Energía', tipo:'Mixto', procedimiento:'Diálogo competitivo', estado:'Anuncio previo', fuente:'TED (UE)',
    importeBase:2_400_000_000, cpv:'09320000-8', publicacion:'05/03/2026', fechaLimite:'30/06/2026', diasRestantes:54,
    pliegos:38, match:'CRÍTICO', matchScore:96, duracion:'180 meses',
    keywords:['eólica marina','offshore','Atlántico','renovables','BEI'] },
]

// Próximos plazos (ordenados por urgencia)
const ALERTAS_PLAZOS = [
  { exp:'2026/RTVE-ESTU',       dias: 7, importe: 18.4, titulo:'Equipos estudios RTVE' },
  { exp:'2026/SERMAS-ONCO',     dias:12, importe:124.5, titulo:'Fármacos oncológicos Madrid' },
  { exp:'2026/MIN-CULT-MUS',    dias:15, importe: 32.0, titulo:'Reforma Museo del Prado' },
  { exp:'2026/AYT-MAD-LIM',     dias:20, importe:142.4, titulo:'Recogida residuos Madrid Centro' },
  { exp:'2026/AND-ATG-INF',     dias:23, importe:182.0, titulo:'Carreteras Andalucía' },
  { exp:'2026/MAD-EDU-DIG',     dias:26, importe: 62.8, titulo:'Aulas digitales Madrid' },
]

// Watchlist · sectores y palabras clave del cliente
const WATCHLIST = [
  { sector:'Infraestructuras', activos: 5, importe: 850, color:SECTOR_COLOR['Infraestructuras'] },
  { sector:'Sanidad',           activos: 4, importe: 832, color:SECTOR_COLOR['Sanidad'] },
  { sector:'Defensa',           activos: 2, importe: 624, color:SECTOR_COLOR['Defensa'] },
  { sector:'Energía',           activos: 2, importe:2880, color:SECTOR_COLOR['Energía'] },
  { sector:'TIC',               activos: 2, importe:1258, color:SECTOR_COLOR['TIC'] },
  { sector:'Servicios sociales',activos: 2, importe: 822, color:SECTOR_COLOR['Servicios sociales'] },
  { sector:'Educación',         activos: 1, importe:  62, color:SECTOR_COLOR['Educación'] },
  { sector:'Cultura',           activos: 1, importe:  32, color:SECTOR_COLOR['Cultura'] },
]

// Top organismos por número de licitaciones publicadas
const TOP_ORG = [
  { org:'PLACSP (AGE)',          n: 6, importe:1129 },
  { org:'TED · Comisión Europea', n: 2, importe:3640 },
  { org:'INGESA',                  n: 2, importe: 396 },
  { org:'Generalitat Catalunya', n: 2, importe: 580 },
  { org:'Comunidad de Madrid',    n: 2, importe: 187 },
]

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function LicitacionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [tab, setTab] = useState<'feed' | 'watchlist' | 'alertas' | 'fuentes'>('feed')
  const [filterSector, setFilterSector] = useState<Sector | 'Todos'>('Todos')
  const [filterEstado, setFilterEstado] = useState<Estado | 'Todos'>('Todos')
  const [filterMatch,  setFilterMatch]  = useState<Match | 'Todos'>('Todos')
  const [query, setQuery] = useState('')

  const totals = useMemo(() => {
    const importe = LICITACIONES.reduce((s, l) => s + l.importeBase, 0) / 1_000_000
    const enPlazo = LICITACIONES.filter(l => l.estado === 'En plazo' || l.estado === 'Anuncio previo').length
    const criticos = LICITACIONES.filter(l => l.match === 'CRÍTICO').length
    const cerrandoSemana = LICITACIONES.filter(l => l.diasRestantes >= 0 && l.diasRestantes <= 7).length
    return { total: LICITACIONES.length, importe, enPlazo, criticos, cerrandoSemana }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return LICITACIONES
      .filter(l => filterSector === 'Todos' || l.sector === filterSector)
      .filter(l => filterEstado === 'Todos' || l.estado === filterEstado)
      .filter(l => filterMatch  === 'Todos' || l.match  === filterMatch)
      .filter(l => !q || l.titulo.toLowerCase().includes(q) || l.organismo.toLowerCase().includes(q) || l.exp.toLowerCase().includes(q) || l.keywords.some(k => k.toLowerCase().includes(q)))
      .sort((a,b) => b.matchScore - a.matchScore)
  }, [filterSector, filterEstado, filterMatch, query])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#1F4E8C 0%,#0d1b2e 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              LICITACIONES Y CONTRATACIÓN PÚBLICA · AGREGADOR EN TIEMPO REAL
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              {totals.total} licitaciones activas · {totals.importe >= 1000 ? (totals.importe/1000).toFixed(1) + ' mil M€' : totals.importe.toFixed(0) + ' M€'} <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>en juego</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              Feed unificado PLACSP · BOE · TED · BOCG · 17 portales autonómicos y locales. Matching automático con keywords del cliente · alertas por plazo · CPV · regiones · presupuestos.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            <HeroKPI label="Activas"   value={String(totals.enPlazo)}        accent="#86EFAC"/>
            <HeroKPI label="Críticas"  value={String(totals.criticos)}       accent="#FCA5A5"/>
            <HeroKPI label="Cierran 7d" value={String(totals.cerrandoSemana)} accent="#FCD34D"/>
            <HeroKPI label="∑ Importe"  value={`${(totals.importe/1000).toFixed(1)}B€`} accent="#7DD3FC"/>
          </div>
        </section>

        {/* ═══ PLACSP en vivo · datos reales del estado ═══ */}
        <ContratosLiveFeed
          tipo="licitacion"
          limit={12}
          titulo="LICITACIONES PLACSP · ÚLTIMAS PUBLICADAS"
        />

        {/* ───── Snapshot del feed ───── */}
        <section style={{ marginBottom:18 }}>
          <SectionHeader label="Snapshot del agregador" count="Datos en tiempo real · 17 fuentes" accent="#1F4E8C"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            <SKpi label="Nuevas hoy"             value="18" sub="últimas 24 h"   delta="+6 vs ayer"    pos color="#1F4E8C"/>
            <SKpi label="Nuevas esta semana"     value="84" sub="lun-dom"         delta="+22%"          pos color="#5B21B6"/>
            <SKpi label="Pendientes de revisar"  value="12" sub="match alto+"     delta="3 sin abrir"  color="#F97316"/>
            <SKpi label="Match medio del feed"   value="68" sub="/100 score"      delta="+4 pp"        pos color="#0F766E"/>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'feed',      label:'Feed unificado',      count: LICITACIONES.length },
            { k:'watchlist', label:'Watchlist por sector', count: WATCHLIST.length },
            { k:'alertas',   label:'Próximos cierres',     count: ALERTAS_PLAZOS.length },
            { k:'fuentes',   label:'Fuentes y orígenes',   count: 17 },
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
                {t.label} <span style={{ marginLeft:5, color: active ? '#1F4E8C' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Feed unificado ───── */}
        {tab === 'feed' && (
          <>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:12 }}>
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por título, organismo, expediente o palabra clave…"
                style={{ flex:'1 1 260px', maxWidth:360, padding:'9px 14px', borderRadius:10, border:'1px solid #ECECEF', background:'#fff', fontSize:13, fontFamily:'inherit', outline:'none', color:'#1d1d1f' }}/>
              <Selector label="Sector" value={filterSector} options={['Todos','Sanidad','Defensa','Infraestructuras','TIC','Energía','Educación','Servicios sociales','Cultura','Otros']} onChange={v => setFilterSector(v as Sector | 'Todos')}/>
              <Selector label="Estado" value={filterEstado} options={['Todos','Anuncio previo','En plazo','En estudio','Adjudicación','Cerrado']} onChange={v => setFilterEstado(v as Estado | 'Todos')}/>
              <Selector label="Match"  value={filterMatch}  options={['Todos','CRÍTICO','ALTO','MEDIO','BAJO']} onChange={v => setFilterMatch(v as Match | 'Todos')}/>
              <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{filtered.length} licitaciones · ordenadas por match</span>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filtered.map(l => {
                const cierreColor = l.diasRestantes < 0 ? '#525258' : l.diasRestantes <= 7 ? '#DC2626' : l.diasRestantes <= 21 ? '#F97316' : '#16A34A'
                return (
                  <article key={l.id} style={{
                    background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                    boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
                    borderLeft:`4px solid ${MATCH_COLOR[l.match]}`,
                  }}>
                    <header style={{ padding:'12px 16px', display:'grid', gridTemplateColumns:'1fr auto', gap:10, borderBottom:'1px solid #F5F5F7' }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
                          <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:4, background:MATCH_COLOR[l.match], color:'#fff' }}>MATCH {l.match}</span>
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:`${SECTOR_COLOR[l.sector]}15`, color:SECTOR_COLOR[l.sector], border:`1px solid ${SECTOR_COLOR[l.sector]}40` }}>{l.sector.toUpperCase()}</span>
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:4, background:`${TIPO_COLOR[l.tipo]}15`, color:TIPO_COLOR[l.tipo], border:`1px solid ${TIPO_COLOR[l.tipo]}40` }}>{l.tipo.toUpperCase()}</span>
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:999, background:`${ESTADO_COLOR[l.estado]}15`, color:ESTADO_COLOR[l.estado], border:`1px solid ${ESTADO_COLOR[l.estado]}40` }}>{l.estado.toUpperCase()}</span>
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 7px', borderRadius:999, background:`${FUENTE_COLOR[l.fuente]}15`, color:FUENTE_COLOR[l.fuente], border:`1px solid ${FUENTE_COLOR[l.fuente]}40` }}>{l.fuente.toUpperCase()}</span>
                          <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:600 }}>· EXP. {l.exp} · CPV {l.cpv}</span>
                        </div>
                        <h3 style={{ margin:'0 0 3px', fontFamily:'var(--font-display)', fontSize:14.5, fontWeight:600, letterSpacing:'-0.012em', color:'#1d1d1f', lineHeight:1.3 }}>{l.titulo}</h3>
                        <div style={{ fontSize:11.5, color:'#3a3a3d' }}>{l.organismo} · <span style={{ color:'#6e6e73' }}>{l.region}</span></div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, minWidth:140 }}>
                        <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'#1F4E8C', letterSpacing:'-0.018em', lineHeight:1 }}>
                          {(l.importeBase / 1_000_000).toFixed(1)}<span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>M€</span>
                        </div>
                        <div style={{ fontSize:9.5, color:'#86868b', marginTop:2 }}>importe base · {l.duracion}</div>
                      </div>
                    </header>
                    <div style={{ padding:'12px 16px', display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 1fr', gap:14, alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>Keywords detectadas</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                          {l.keywords.map(k => (
                            <span key={k} style={{ fontSize:10, padding:'2px 7px', borderRadius:999, background:'#F5F5F7', color:'#3a3a3d', fontWeight:600 }}>{k}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>Match score</div>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <div style={{ flex:1, height:6, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ width:`${l.matchScore}%`, height:'100%', background:MATCH_COLOR[l.match] }}/>
                          </div>
                          <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:MATCH_COLOR[l.match] }}>{l.matchScore}</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>Plazo</div>
                        <div style={{ fontSize:12.5, fontWeight:700, color:cierreColor }}>
                          {l.diasRestantes < 0 ? `Cerrada hace ${Math.abs(l.diasRestantes)}d` : `${l.diasRestantes} días restantes`}
                        </div>
                        <div style={{ fontSize:10, color:'#86868b' }}>fin: {l.fechaLimite}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>Procedimiento</div>
                        <div style={{ fontSize:12, fontWeight:600, color:'#1d1d1f' }}>{l.procedimiento}</div>
                        <div style={{ fontSize:10, color:'#86868b' }}>{l.pliegos} documentos</div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}

        {/* ───── TAB · Watchlist ───── */}
        {tab === 'watchlist' && (
          <>
            <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:10, marginBottom:14 }}>
              {WATCHLIST.map(w => (
                <article key={w.sector} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
                  padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`3px solid ${w.color}`,
                  display:'grid', gridTemplateColumns:'1fr auto', gap:10, alignItems:'center',
                }}>
                  <div>
                    <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:4,
                      background:w.color, color:'#fff',
                    }}>{w.sector.toUpperCase()}</span>
                    <h4 style={{ margin:'6px 0 2px', fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, color:'#1d1d1f', letterSpacing:'-0.013em' }}>{w.activos} licitaciones activas</h4>
                    <p style={{ margin:0, fontSize:11, color:'#6e6e73' }}>importe en juego: {w.importe}M€</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:w.color, letterSpacing:'-0.018em', lineHeight:1 }}>{w.activos}</div>
                  </div>
                </article>
              ))}
            </section>
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 6px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Configuración de la watchlist</h3>
              <p style={{ margin:'0 0 12px', fontSize:11.5, color:'#6e6e73' }}>Palabras clave, sectores y umbrales que dispararan alertas automáticas</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Keywords activas</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {['hidrógeno verde','ciberdefensa','SOC','vivienda asequible','AVE','radioterapia','cloud soberano','eólica marina','plan estatal'].map(k => (
                      <span key={k} style={{ fontSize:11, padding:'3px 9px', borderRadius:999, background:'#FAFAFB', border:'1px solid #ECECEF', color:'#1d1d1f', fontWeight:600 }}>{k}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Umbrales</div>
                  <ul style={{ margin:0, paddingLeft:18, fontSize:11.5, color:'#3a3a3d', lineHeight:1.7 }}>
                    <li>Importe mínimo: <strong>5 M€</strong></li>
                    <li>Plazo máximo cierre: <strong>60 días</strong></li>
                    <li>Match score mínimo: <strong>50</strong></li>
                    <li>CPV objetivo: <strong>33xxxx, 45xxxx, 72xxxx, 09xxxx</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ───── TAB · Próximos cierres ───── */}
        {tab === 'alertas' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Calendario de cierre · próximos 30 días</h3>
            <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>Licitaciones con mayor urgencia · 6 expedientes ordenados por días restantes</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {ALERTAS_PLAZOS.map((a, i) => {
                const c = a.dias <= 7 ? '#DC2626' : a.dias <= 14 ? '#F97316' : '#EAB308'
                return (
                  <div key={a.exp} style={{
                    display:'grid', gridTemplateColumns:'70px 1fr auto auto', gap:12, alignItems:'center',
                    padding:'12px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                    borderLeft:`3px solid ${c}`,
                  }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:c, lineHeight:1 }}>{a.dias}</div>
                      <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginTop:2 }}>días</div>
                    </div>
                    <div>
                      <div style={{ fontSize:9.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em' }}>EXP. {a.exp}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', marginTop:1 }}>{a.titulo}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#1F4E8C' }}>{a.importe.toFixed(1)}M€</div>
                    </div>
                    <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'3px 9px', borderRadius:999, textAlign:'center',
                      background:`${c}15`, color:c, border:`1px solid ${c}40`,
                    }}>{a.dias <= 7 ? 'URGENTE' : a.dias <= 14 ? 'PRÓXIMO' : 'PROGRAMADO'}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ───── TAB · Fuentes ───── */}
        {tab === 'fuentes' && (
          <section style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Top 5 organismos por volumen</h3>
              <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>Importe total publicado en últimas 6 semanas</p>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {TOP_ORG.map((o, i) => (
                  <div key={o.org} style={{ display:'grid', gridTemplateColumns:'24px 1fr 70px', gap:10, alignItems:'center' }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:800, color:'#1d1d1f' }}>{i+1}</span>
                    <div>
                      <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f' }}>{o.org}</div>
                      <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden', marginTop:3 }}>
                        <div style={{ width:`${(o.importe / 4000) * 100}%`, height:'100%', background:'#1F4E8C', borderRadius:3 }}/>
                      </div>
                      <div style={{ fontSize:10, color:'#86868b', marginTop:3 }}>{o.n} licitaciones</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1F4E8C' }}>{o.importe.toLocaleString('es-ES')}M€</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Fuentes de datos integradas</h3>
              <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>17 portales sincronizados · actualización cada 30 minutos</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[
                  { f:'PLACSP',           cat:'Estatal',     ok:true },
                  { f:'BOE',               cat:'Estatal',     ok:true },
                  { f:'TED · DOUE',        cat:'UE',          ok:true },
                  { f:'BOCG (Cortes)',     cat:'Estatal',     ok:true },
                  { f:'Generalitat Cat.',  cat:'CCAA',        ok:true },
                  { f:'Junta Andalucía',   cat:'CCAA',        ok:true },
                  { f:'C. Madrid',         cat:'CCAA',        ok:true },
                  { f:'Govern Valencià',   cat:'CCAA',        ok:true },
                  { f:'Xunta de Galicia',   cat:'CCAA',        ok:true },
                  { f:'Gob. Vasco',        cat:'CCAA',        ok:true },
                  { f:'Junta CyL',         cat:'CCAA',        ok:true },
                  { f:'Gob. Canarias',     cat:'CCAA',        ok:true },
                  { f:'Ayto. Madrid',      cat:'Local',       ok:true },
                  { f:'Ayto. Barcelona',   cat:'Local',       ok:true },
                  { f:'Ayto. València',    cat:'Local',       ok:true },
                  { f:'Diputaciones',      cat:'Local',       ok:true },
                  { f:'EU Funding & Tenders',cat:'UE',         ok:true },
                ].map(s => (
                  <div key={s.f} style={{
                    display:'grid', gridTemplateColumns:'auto 1fr auto', gap:6, alignItems:'center',
                    padding:'6px 9px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8,
                  }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background: s.ok ? '#16A34A' : '#DC2626' }}/>
                    <span style={{ fontSize:11, fontWeight:600, color:'#1d1d1f' }}>{s.f}</span>
                    <span style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em' }}>{s.cat.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Agregador de Licitaciones · Politeia Analítica · {new Date().getFullYear()}
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
        <span style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color, letterSpacing:'-0.022em', lineHeight:1 }}>{value}</span>
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

function Selector({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>{label}:</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        padding:'6px 28px 6px 12px', borderRadius:999, border:'1px solid #ECECEF', background:'#fff',
        fontSize:11.5, fontFamily:'inherit', fontWeight:600, color:'#1d1d1f', cursor:'pointer', appearance:'none',
        backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
        backgroundRepeat:'no-repeat', backgroundPosition:'right 9px center',
      }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
