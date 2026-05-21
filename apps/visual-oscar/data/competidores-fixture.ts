/**
 * FIXTURE — Competidores (inteligencia competitiva · contratación pública).
 *
 * Estos son datos curados que sirven como fallback cuando el backend
 * `/api/crm/organizations?type=competidor` no está disponible o no tiene
 * datasets enriquecidos (totalAdj12m, fortalezas/debilidades, etc.). El
 * route handler `app/api/competidores/route.ts` los devuelve con
 * `_meta.source='mock'`.
 *
 * Cuando el módulo de Competitive Intelligence esté operativo en el backend,
 * este fixture pasará a ser meramente referencia y se eliminará.
 */

export type Sector =
  | 'Sanidad' | 'Defensa' | 'Infraestructuras' | 'TIC'
  | 'Energía' | 'Educación' | 'Servicios sociales'
export type Amenaza = 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA'

export type Competidor = {
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

export type TipoInforme =
  | 'Strategic Profile' | 'Due Diligence' | 'Win/Loss Analysis'
  | 'Bid Intelligence' | 'Executive Briefing'

export type InformeGenerado = {
  id: string
  competidor: string
  tipo: TipoInforme
  fecha: string
  paginas: number
  autor: string
  estado: 'Generado' | 'En revisión' | 'Compartido' | 'Borrador'
}

export type WinLossEntry = {
  exp: string
  titulo: string
  ganador: string
  nuestro: string
  bajaGanador: number
  bajaNuestra: number
}

// ─────────────────────────────────────────────────────────────────────────
// Datos · 6 competidores principales
// ─────────────────────────────────────────────────────────────────────────
export const COMPETIDORES: Competidor[] = [
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
export const WIN_LOSS: WinLossEntry[] = [
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
export const INFORMES_HISTORICO: InformeGenerado[] = [
  { id:'rep-001', competidor:'ACS Group',         tipo:'Strategic Profile',  fecha:'05/05/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Compartido' },
  { id:'rep-002', competidor:'Indra Sistemas',    tipo:'Bid Intelligence',   fecha:'04/05/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Generado' },
  { id:'rep-003', competidor:'Ferrovial',         tipo:'Win/Loss Analysis',  fecha:'02/05/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Compartido' },
  { id:'rep-004', competidor:'Sacyr Construcción',tipo:'Due Diligence',      fecha:'30/04/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'En revisión' },
  { id:'rep-005', competidor:'FCC Aqualia',       tipo:'Executive Briefing', fecha:'28/04/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Compartido' },
  { id:'rep-006', competidor:'Acciona',           tipo:'Strategic Profile',  fecha:'25/04/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Compartido' },
  { id:'rep-007', competidor:'ACS Group',         tipo:'Bid Intelligence',   fecha:'22/04/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Generado' },
  { id:'rep-008', competidor:'Indra Sistemas',    tipo:'Strategic Profile',  fecha:'18/04/2026', paginas:2, autor:'Politeia AI · v3.2', estado:'Compartido' },
]
