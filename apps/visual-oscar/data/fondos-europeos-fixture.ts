/**
 * FIXTURE — Fondos Europeos y PRTR.
 *
 * Datos curados que sirven como fallback cuando el backend
 * `/api/opendata/datasets?q=PRTR` (o endpoint definitivo) no devuelve aún
 * los datasets completos. El route handler `app/api/fondos-europeos/route.ts`
 * los devuelve con `_meta.source='mock'`.
 */

export type Componente = {
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

export type Perte = {
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

export type Convocatoria = {
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

export type Hito = {
  fecha: string
  tipo: 'Desembolso' | 'Solicitud' | 'Evaluación' | 'Hito' | 'Inversión' | 'Reforma'
  importe?: number
  titulo: string
  estado: 'Pendiente' | 'Completado' | 'En revisión'
  detalle: string
}

export type Beneficiario = {
  nombre: string
  tipo: 'Gran empresa' | 'Pyme' | 'CCAA' | 'Ayuntamiento' | 'Investigación' | 'Tercer sector'
  totalRecibido: number
  proyectos: number
  estado: 'Activo' | 'Cerrado'
  sectores: string[]
}

export type MfpFondo = {
  fondo: string
  desc: string
  asignado: number
  ejecutado: number
  color: string
}

export type PrtrTotals = {
  total_asignado: number
  total_ejecutado: number
  transferido: number
  hitos_total: number
  hitos_cumplidos: number
}

export const COMPONENTES: Componente[] = [
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

export const PERTES: Perte[] = [
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

export const CONVOCATORIAS: Convocatoria[] = [
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

export const HITOS: Hito[] = [
  { fecha:'15/05/2026', tipo:'Solicitud',  importe:13_500, titulo:'5ª solicitud de pago al MRR',                                           estado:'Pendiente',  detalle:'Cumplimiento de 65 hitos · evaluación CE prevista junio 2026' },
  { fecha:'12/05/2026', tipo:'Hito',                       titulo:'Aprobación Reforma fiscal · capítulo IV',                                estado:'Pendiente',  detalle:'Hito CID-13 · vinculado al desembolso 5' },
  { fecha:'09/05/2026', tipo:'Inversión',                  titulo:'Cierre 2ª convocatoria PERTE Industria descarbonizada',                  estado:'Completado', detalle:'412 M€ adjudicados · 38 proyectos seleccionados' },
  { fecha:'05/05/2026', tipo:'Reforma',                    titulo:'Aprobación Ley Vivienda · ampliación zonas tensionadas',                 estado:'Completado', detalle:'Hito CID-08 cumplido · pendiente notificación CE' },
  { fecha:'25/06/2026', tipo:'Desembolso',  importe:13_500, titulo:'Recepción 5ª transferencia MRR',                                          estado:'Pendiente',  detalle:'Si CE valida positivamente la solicitud · transferencia a Hacienda' },
  { fecha:'15/04/2026', tipo:'Desembolso',  importe:11_040, titulo:'4ª transferencia MRR recibida',                                            estado:'Completado', detalle:'Total recibido España: 60.0 mil M€ · 73% del total' },
  { fecha:'02/05/2026', tipo:'Evaluación',                  titulo:'Evaluación intermedia MRR por la Comisión Europea',                       estado:'En revisión', detalle:'Auditoría sobre uso e impacto · informe esperado julio' },
]

export const BENEFICIARIOS: Beneficiario[] = [
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

export const MFP_FONDOS: MfpFondo[] = [
  { fondo:'FEDER',         desc:'Fondo Europeo de Desarrollo Regional', asignado:24_500, ejecutado:11_400, color:'#1F4E8C' },
  { fondo:'FSE+',          desc:'Fondo Social Europeo Plus',             asignado:11_200, ejecutado: 5_280, color:'#D43F8D' },
  { fondo:'FEADER',        desc:'Desarrollo Rural · PAC II Pilar',       asignado: 8_810, ejecutado: 4_120, color:'#16A34A' },
  { fondo:'FEMPA',         desc:'Marítimo, Pesca y Acuicultura',         asignado: 1_120, ejecutado:   420, color:'#0EA5E9' },
  { fondo:'FAMI',          desc:'Asilo, Migración e Integración',        asignado:   840, ejecutado:   312, color:'#7C3AED' },
  { fondo:'Fondo Cohesión',desc:'Cohesión territorial 2021-2027',        asignado: 4_120, ejecutado: 1_840, color:'#5B21B6' },
]

export const PRTR_TOTALS: PrtrTotals = {
  total_asignado: 163_000,
  total_ejecutado: 60_000,
  transferido: 92_400,
  hitos_total: 595,
  hitos_cumplidos: 412,
}
