'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────
type Severidad = 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA'
type Fase = 'Detección' | 'Activa' | 'Contención' | 'Resolución' | 'Cerrada'
type TipoCrisis = 'Política' | 'Económica' | 'Sanitaria' | 'Mediática' | 'Tecnológica' | 'Climática' | 'Diplomática' | 'Social' | 'Energética' | 'Migratoria'

type StakePos = 'aliado' | 'neutral' | 'opositor'
type Stakeholder = { nombre: string; rol: string; posicion: StakePos }

type Hito = { fecha: string; hora: string; evento: string; fuente: string; impacto: 'positivo' | 'neutral' | 'negativo' }
type Accion = { accion: string; responsable: string; plazo: string; estado: 'Pendiente' | 'En curso' | 'Completada' }

type Crisis = {
  id: string
  titulo: string
  tipo: TipoCrisis
  severidad: Severidad
  fase: Fase
  inicio: string
  actualizacion: string
  ubicacion: string
  resumen: string
  stakeholders: Stakeholder[]
  hitos: Hito[]
  acciones: Accion[]
  metricas: {
    impactoMediatico: number  // 0-100
    sentimiento: number       // -1 .. +1
    audienciaPotencial: string // p. ej. "12 M personas"
    menciones24h: number       // miles
    spike: number              // % vs media 7d
  }
  riesgos: string[]
}

const SEV_META: Record<Severidad, { color: string }> = {
  'CRÍTICA': { color:'#DC2626' },
  'ALTA':    { color:'#F97316' },
  'MEDIA':   { color:'#EAB308' },
  'BAJA':    { color:'#0EA5E9' },
}

const TIPO_META: Record<TipoCrisis, { color: string }> = {
  'Política':    { color:'#1F4E8C' },
  'Económica':   { color:'#16A34A' },
  'Sanitaria':   { color:'#0EA5E9' },
  'Mediática':   { color:'#7C3AED' },
  'Tecnológica': { color:'#5B21B6' },
  'Climática':   { color:'#0F766E' },
  'Diplomática': { color:'#B45309' },
  'Social':      { color:'#DC2626' },
  'Energética':  { color:'#F97316' },
  'Migratoria':  { color:'#9333EA' },
}

const FASE_META: Record<Fase, { color: string; pct: number }> = {
  'Detección':   { color:'#0EA5E9', pct: 15 },
  'Activa':      { color:'#DC2626', pct: 40 },
  'Contención':  { color:'#F97316', pct: 65 },
  'Resolución':  { color:'#16A34A', pct: 85 },
  'Cerrada':     { color:'#525258', pct: 100 },
}

const POS_COLOR: Record<StakePos, string> = {
  'aliado':   '#16A34A',
  'neutral':  '#6e6e73',
  'opositor': '#DC2626',
}

const IMP_COLOR = { 'positivo':'#16A34A', 'neutral':'#6e6e73', 'negativo':'#DC2626' } as const
const ACC_META = { 'Pendiente': '#6e6e73', 'En curso':'#5B21B6', 'Completada':'#16A34A' } as const

// ─────────────────────────────────────────────────────────────────────────
// Datos · 6 crisis (mix de reales + verosímiles)
// ─────────────────────────────────────────────────────────────────────────
const CRISIS: Crisis[] = [
  {
    id:'dana-valencia',
    titulo:'Reconstrucción tras la DANA · 18 meses después',
    tipo:'Climática', severidad:'ALTA', fase:'Contención',
    inicio:'29/10/2024', actualizacion:'06/05/2026 09:30',
    ubicacion:'C. Valenciana · 75 municipios afectados',
    resumen:'Comisión de investigación abierta · 219 fallecidos · ejecución de ayudas en el 47% · tensión política sobre el reparto. Mazón dimitió en noviembre 2024 · sustituido por Pérez Llorca. Vox rompe el pacto con PP en diciembre 2024.',
    stakeholders:[
      { nombre:'Generalitat Valenciana',      rol:'Gobierno autonómico',     posicion:'opositor' },
      { nombre:'Gobierno central',            rol:'Coordinación · ayudas',    posicion:'aliado'   },
      { nombre:'UME',                          rol:'Operativo emergencias',    posicion:'aliado'   },
      { nombre:'Asoc. Víctimas DANA',          rol:'Sociedad civil',           posicion:'opositor' },
      { nombre:'Diputación Valencia',          rol:'Reconstrucción local',     posicion:'neutral'  },
      { nombre:'Comisión Europea',             rol:'Fondo Solidaridad',        posicion:'aliado'   },
    ],
    hitos:[
      { fecha:'01/05/2026', hora:'10:00', evento:'Comisión investigación retoma testimonios de afectados',                          fuente:'Les Corts Valencianes',  impacto:'negativo' },
      { fecha:'02/05/2026', hora:'18:30', evento:'Manifestación en València · 65k personas · «Mazón dimisión y restitución»',         fuente:'Subdelegación Gobierno', impacto:'negativo' },
      { fecha:'03/05/2026', hora:'12:15', evento:'Sánchez visita Paiporta y anuncia 280 M€ adicionales para reconstrucción',         fuente:'Moncloa',                impacto:'positivo' },
      { fecha:'04/05/2026', hora:'09:00', evento:'Tribunal Suprema admite querella por homicidio imprudente contra ex consellers',   fuente:'CGPJ',                   impacto:'negativo' },
      { fecha:'05/05/2026', hora:'14:00', evento:'Pérez Llorca propone «Plan Levante 2030» de 5.000 M€',                              fuente:'Generalitat',            impacto:'positivo' },
      { fecha:'06/05/2026', hora:'08:45', evento:'Reunión bilateral Sánchez-Pérez Llorca confirmada para el 12 de mayo',              fuente:'EFE',                    impacto:'positivo' },
    ],
    acciones:[
      { accion:'Coordinar visita Sánchez con Generalitat',                       responsable:'Gabinete Presidencia', plazo:'06/05/2026', estado:'Completada' },
      { accion:'Cierre del paquete de 280 M€ · trámite CMin',                     responsable:'Hacienda · Vivienda',  plazo:'13/05/2026', estado:'En curso'   },
      { accion:'Comparecencia ministra Vivienda en comisión Senado',              responsable:'Gabinete Vivienda',    plazo:'15/05/2026', estado:'Pendiente'  },
      { accion:'Plan de comunicación coordinado con Subdelegación',                responsable:'Comunicación PSOE',   plazo:'14/05/2026', estado:'En curso'   },
    ],
    metricas:{ impactoMediatico:88, sentimiento:-0.42, audienciaPotencial:'14 M', menciones24h:42, spike:68 },
    riesgos:['Aumento de movilizaciones en próximas semanas','Veredicto del TS puede acelerar dimisiones','Caída en sondeos PP-CV adicional'],
  },
  {
    id:'aranceles-eeuu',
    titulo:'Aranceles EEUU · vino, aceite y agroalimentación',
    tipo:'Diplomática', severidad:'ALTA', fase:'Activa',
    inicio:'14/03/2026', actualizacion:'06/05/2026 11:00',
    ubicacion:'EEUU vs UE · sector agroalimentario español',
    resumen:'Trump impone aranceles del 25% al sector agroalimentario UE. España es el 4º exportador europeo a EEUU. Sector aceite, vino, aceitunas y queso afectados. Pérdidas estimadas 3.200 M€/año. Conferencia sectorial este mes.',
    stakeholders:[
      { nombre:'Min. Agricultura · Planas',    rol:'Cartera afectada',           posicion:'aliado'   },
      { nombre:'Min. Asuntos Exteriores',      rol:'Negociación con EEUU',       posicion:'aliado'   },
      { nombre:'Comisión Europea',             rol:'Coordinación UE',            posicion:'aliado'   },
      { nombre:'CEOE · sector agro',           rol:'Empresas exportadoras',      posicion:'neutral'  },
      { nombre:'COAG · UPA · ASAJA',           rol:'Sindicatos agrarios',        posicion:'opositor' },
      { nombre:'CCAA productoras (And · CV)',  rol:'Gobiernos regionales',       posicion:'neutral'  },
    ],
    hitos:[
      { fecha:'02/05/2026', hora:'09:00', evento:'Trump confirma aranceles del 25% efectivo el 1 de junio',                       fuente:'Casa Blanca',         impacto:'negativo' },
      { fecha:'03/05/2026', hora:'14:30', evento:'Reunión urgente Sánchez-Cuerpo-Albares-Planas en Moncloa',                       fuente:'Moncloa',             impacto:'neutral'  },
      { fecha:'04/05/2026', hora:'10:00', evento:'COAG anuncia tractoradas en Madrid si no hay plan compensatorio',                fuente:'COAG',                impacto:'negativo' },
      { fecha:'05/05/2026', hora:'16:00', evento:'CE anuncia paquete de respuesta UE de 8.000 M€ · España con 1.200 M€',           fuente:'Comisión Europea',    impacto:'positivo' },
      { fecha:'06/05/2026', hora:'10:30', evento:'Albares anuncia visita a Washington para reunión bilateral',                      fuente:'Exteriores',          impacto:'neutral'  },
    ],
    acciones:[
      { accion:'Reunión Conferencia Sectorial Agro · 8 mayo',                  responsable:'Min. Agricultura',  plazo:'08/05/2026', estado:'En curso' },
      { accion:'Mesa interministerial · plan de ayudas exportadores',          responsable:'Hacienda · Comercio',plazo:'10/05/2026', estado:'En curso' },
      { accion:'Coordinación con CCAA productoras',                             responsable:'Política Territorial',plazo:'11/05/2026', estado:'Pendiente'},
      { accion:'Visita ministerial a Washington',                                responsable:'Asuntos Exteriores', plazo:'15/05/2026', estado:'Pendiente'},
      { accion:'Plan comunicación con sector exportador',                        responsable:'Min. Agricultura',  plazo:'09/05/2026', estado:'Completada'},
    ],
    metricas:{ impactoMediatico:76, sentimiento:-0.31, audienciaPotencial:'18 M', menciones24h:28, spike:42 },
    riesgos:['Tractoradas masivas si tarda el plan compensatorio','Pérdidas de 3.200 M€/año si los aranceles persisten','Tensión con CCAA productoras sin acuerdo previo'],
  },
  {
    id:'apagon-2025',
    titulo:'Investigación del apagón nacional · 28 abril 2025',
    tipo:'Energética', severidad:'MEDIA', fase:'Resolución',
    inicio:'28/04/2025', actualizacion:'05/05/2026 17:00',
    ubicacion:'Toda la Península y Portugal · 50 M afectados',
    resumen:'Investigación del apagón general que dejó sin luz toda la Península 12 horas. Comité técnico final entrega su informe el 15 de mayo. REE bajo escrutinio. Vp Aagesen comparecerá ante la Comisión de Industria.',
    stakeholders:[
      { nombre:'Vp 3ª Aagesen',           rol:'Cartera afectada',          posicion:'aliado'   },
      { nombre:'Red Eléctrica (REE)',     rol:'Operador',                  posicion:'aliado'   },
      { nombre:'CNMC',                    rol:'Regulador',                 posicion:'neutral'  },
      { nombre:'PP · Gº Sánchez Carriedo',rol:'Oposición',                 posicion:'opositor' },
      { nombre:'Comisión Europea',         rol:'Auditoría externa',         posicion:'neutral'  },
      { nombre:'Iberdrola · Endesa · Naturgy', rol:'Compañías eléctricas', posicion:'neutral'  },
    ],
    hitos:[
      { fecha:'30/04/2026', hora:'10:00', evento:'Comité técnico avanza el informe preliminar a Industria',                       fuente:'Min. Transición',     impacto:'positivo' },
      { fecha:'02/05/2026', hora:'12:00', evento:'PP solicita comparecencia de Aagesen y Beatriz Corredor (REE) en Comisión',     fuente:'Congreso',            impacto:'negativo' },
      { fecha:'05/05/2026', hora:'17:00', evento:'Aagesen confirma comparecencia el 22 de mayo',                                  fuente:'Min. Transición',     impacto:'neutral'  },
    ],
    acciones:[
      { accion:'Preparar comparecencia Aagesen · Comisión Industria',          responsable:'Gabinete Aagesen',  plazo:'21/05/2026', estado:'En curso'   },
      { accion:'Cierre del informe técnico final',                             responsable:'CNMC + REE',        plazo:'15/05/2026', estado:'En curso'   },
      { accion:'Plan de comunicación al cierre del informe',                    responsable:'Comunicación Min.', plazo:'16/05/2026', estado:'Pendiente'  },
    ],
    metricas:{ impactoMediatico:48, sentimiento:-0.12, audienciaPotencial:'9 M', menciones24h:14, spike:18 },
    riesgos:['Informe técnico que apunte directamente a REE','Caída de Aagesen en valoración','Demanda colectiva ciudadana'],
  },
  {
    id:'fiscal-general',
    titulo:'Causa contra el Fiscal General del Estado',
    tipo:'Política', severidad:'CRÍTICA', fase:'Activa',
    inicio:'19/03/2024', actualizacion:'06/05/2026 08:15',
    ubicacion:'Tribunal Supremo · proceso penal',
    resumen:'García Ortiz, Fiscal General, encausado por revelación de secretos. La defensa solicita el sobreseimiento. La oposición exige cese inmediato. Sánchez mantiene apoyo. Vista oral pendiente de fecha.',
    stakeholders:[
      { nombre:'Álvaro García Ortiz',       rol:'Fiscal General · investigado', posicion:'neutral'  },
      { nombre:'Tribunal Supremo',          rol:'Sala 2ª',                       posicion:'neutral'  },
      { nombre:'PSOE · Bolaños',             rol:'Defensa institucional',         posicion:'aliado'   },
      { nombre:'PP · Feijóo · Tellado',      rol:'Demanda cese',                  posicion:'opositor' },
      { nombre:'Asoc. Fiscales (AF · UPF)',  rol:'Profesionales fiscales',        posicion:'neutral'  },
      { nombre:'Tribunal Constitucional',    rol:'Recurso pendiente',             posicion:'neutral'  },
    ],
    hitos:[
      { fecha:'29/04/2026', hora:'18:30', evento:'TS rechaza nulidad de actuaciones solicitada por la defensa',                  fuente:'TS Sala 2ª',          impacto:'negativo' },
      { fecha:'02/05/2026', hora:'12:00', evento:'PP registra moción para reprobar al ministro Bolaños',                          fuente:'Congreso',            impacto:'negativo' },
      { fecha:'04/05/2026', hora:'09:30', evento:'Sánchez reitera respaldo público al Fiscal General',                            fuente:'Moncloa',             impacto:'neutral'  },
      { fecha:'06/05/2026', hora:'08:15', evento:'Asoc. de Fiscales debate posición institucional en pleno extraordinario',       fuente:'Asoc. Fiscales',      impacto:'negativo' },
    ],
    acciones:[
      { accion:'Coordinación de declaraciones con Moncloa y Justicia',          responsable:'Gabinete Presidencia',plazo:'07/05/2026', estado:'Completada' },
      { accion:'Preparar respuesta a moción de reprobación de Bolaños',         responsable:'Min. Justicia',      plazo:'09/05/2026', estado:'En curso'   },
      { accion:'Estrategia mediática para defensa institucional',               responsable:'Comunicación PSOE',  plazo:'10/05/2026', estado:'En curso'   },
      { accion:'Análisis de escenarios post-vista',                              responsable:'Asesoría jurídica',  plazo:'15/05/2026', estado:'Pendiente'  },
    ],
    metricas:{ impactoMediatico:92, sentimiento:-0.55, audienciaPotencial:'11 M', menciones24h:36, spike:54 },
    riesgos:['Sentencia condenatoria con impacto institucional','Crisis de Gobierno por gestión Bolaños','Bloqueo institucional Fiscalía'],
  },
  {
    id:'ciberataque-ine',
    titulo:'Ciberataque al INE · brecha de 2.4 M registros',
    tipo:'Tecnológica', severidad:'ALTA', fase:'Contención',
    inicio:'02/05/2026', actualizacion:'06/05/2026 07:00',
    ubicacion:'INE · padrón continuo · datos personales',
    resumen:'Ataque ransomware al INE detectado el 2 de mayo. Brecha confirmada de 2.4 M registros del padrón. CCN-CERT investiga. AEPD abre expediente sancionador. Posible vínculo con grupo APT prorruso.',
    stakeholders:[
      { nombre:'INE',                      rol:'Organismo afectado',     posicion:'aliado'   },
      { nombre:'CCN-CERT · CNI',            rol:'Respuesta técnica',     posicion:'aliado'   },
      { nombre:'AEPD',                     rol:'Regulador protección datos', posicion:'neutral'  },
      { nombre:'Min. Transformación Digital · López', rol:'Cartera afectada', posicion:'aliado'   },
      { nombre:'Asoc. Internautas',         rol:'Sociedad civil afectada',  posicion:'opositor' },
      { nombre:'CCAA y ayuntamientos',      rol:'Padrón compartido',       posicion:'neutral'  },
    ],
    hitos:[
      { fecha:'02/05/2026', hora:'06:30', evento:'INE detecta el ataque y aísla los servidores',                                fuente:'INE · CCN-CERT',     impacto:'neutral'  },
      { fecha:'02/05/2026', hora:'19:00', evento:'Comparecencia urgente de Óscar López y comunicación a AEPD',                  fuente:'Min. T. Digital',    impacto:'positivo' },
      { fecha:'04/05/2026', hora:'10:00', evento:'Datos publicados parcialmente en foro hacker · 2.4 M registros confirmados',  fuente:'CCN-CERT',           impacto:'negativo' },
      { fecha:'05/05/2026', hora:'15:00', evento:'AEPD abre expediente sancionador y procedimiento de investigación',           fuente:'AEPD',               impacto:'negativo' },
      { fecha:'06/05/2026', hora:'07:00', evento:'CCN-CERT atribuye la autoría a grupo APT vinculado a Rusia',                  fuente:'CNI · CCN-CERT',     impacto:'neutral'  },
    ],
    acciones:[
      { accion:'Comunicación oficial a 2.4 M afectados',                        responsable:'INE · AEPD',         plazo:'09/05/2026', estado:'En curso'   },
      { accion:'Auditoría de seguridad externa',                                 responsable:'Min. T. Digital',    plazo:'30/05/2026', estado:'En curso'   },
      { accion:'Refuerzo de los servicios de ciberseguridad',                    responsable:'CCN · INCIBE',       plazo:'15/06/2026', estado:'Pendiente'  },
      { accion:'Comparecencia en Comisión de Interior',                          responsable:'Gabinete López',     plazo:'13/05/2026', estado:'Pendiente'  },
      { accion:'Plan de comunicación a la ciudadanía',                            responsable:'Comunicación Gob.', plazo:'08/05/2026', estado:'Completada' },
    ],
    metricas:{ impactoMediatico:71, sentimiento:-0.35, audienciaPotencial:'24 M', menciones24h:22, spike:38 },
    riesgos:['Multas AEPD hasta 4% facturación','Reacción ciudadana negativa generalizada','Demanda colectiva por filtración de datos'],
  },
  {
    id:'sequia-andalucia',
    titulo:'Sequía severa en Andalucía · restricciones nivel 2',
    tipo:'Climática', severidad:'MEDIA', fase:'Activa',
    inicio:'15/02/2026', actualizacion:'06/05/2026 08:00',
    ubicacion:'Andalucía · 4.2 M habitantes en restricción',
    resumen:'Embalses andaluces al 28% de capacidad. Junta de Andalucía decreta restricciones nivel 2: limitación de riego agrario y consumo doméstico nocturno. Tensión entre Junta y Gobierno por gestión hídrica.',
    stakeholders:[
      { nombre:'Junta de Andalucía',       rol:'Gobierno autonómico',        posicion:'opositor' },
      { nombre:'CHG · MITECO',              rol:'Confederación Hidrográfica', posicion:'aliado'   },
      { nombre:'COAG Andalucía',            rol:'Sector agrario',             posicion:'opositor' },
      { nombre:'Ayuntamientos costa',       rol:'Demanda turística',          posicion:'neutral'  },
      { nombre:'Asoc. Vecinos · Ecologistas Acción', rol:'Sociedad civil',    posicion:'aliado'   },
      { nombre:'Min. Agricultura · Planas',  rol:'Apoyo a agricultores',     posicion:'aliado'   },
    ],
    hitos:[
      { fecha:'01/05/2026', hora:'12:00', evento:'Embalses caen al 28% · CHG confirma situación crítica',                       fuente:'CHG',                 impacto:'negativo' },
      { fecha:'03/05/2026', hora:'09:00', evento:'Junta decreta restricciones nivel 2 con efecto inmediato',                    fuente:'Junta Andalucía',     impacto:'neutral'  },
      { fecha:'04/05/2026', hora:'15:00', evento:'COAG Andalucía convoca tractoradas en Sevilla',                                fuente:'COAG-A',              impacto:'negativo' },
      { fecha:'05/05/2026', hora:'18:00', evento:'Reunión bilateral Aagesen-Moreno Bonilla por situación hídrica',               fuente:'MITECO',              impacto:'positivo' },
      { fecha:'06/05/2026', hora:'08:00', evento:'AEMET prevé lluvias normales en mayo · alivio parcial',                        fuente:'AEMET',               impacto:'positivo' },
    ],
    acciones:[
      { accion:'Coordinar mensaje Aagesen-Moreno tras reunión',                  responsable:'Comunicación Min.',  plazo:'08/05/2026', estado:'En curso'   },
      { accion:'Plan de ayudas a agricultores afectados',                         responsable:'Min. Agricultura',   plazo:'15/05/2026', estado:'En curso'   },
      { accion:'Refuerzo plantas desaladoras',                                    responsable:'MITECO · CHG',       plazo:'30/06/2026', estado:'Pendiente'  },
      { accion:'Campaña de concienciación consumo de agua',                       responsable:'Junta Andalucía',    plazo:'15/05/2026', estado:'Pendiente'  },
    ],
    metricas:{ impactoMediatico:54, sentimiento:-0.21, audienciaPotencial:'10 M', menciones24h:11, spike:24 },
    riesgos:['Movilizaciones del sector agrario','Restricciones nivel 3 si no llueve','Tensión política PP-PSOE por culpas'],
  },
]

// Playbooks de protocolo
type Playbook = { id: string; tipo: TipoCrisis; nombre: string; descripcion: string; pasos: string[] }
const PLAYBOOKS: Playbook[] = [
  {
    id:'pb-climatica', tipo:'Climática', nombre:'Crisis climática · catástrofe natural',
    descripcion:'Protocolo para emergencias climáticas (DANA, sequía, inundación, incendio).',
    pasos:[
      'Activar el comité de crisis interministerial en menos de 4h',
      'Coordinar UME, Protección Civil y CCAA · gabinete único',
      'Comunicación oficial cada 6h durante las primeras 72h',
      'Visita institucional al terreno en menos de 48h',
      'Anuncio de medidas económicas en menos de 7 días',
      'Comisión de seguimiento parlamentaria en 30 días',
    ],
  },
  {
    id:'pb-tecnologica', tipo:'Tecnológica', nombre:'Crisis tecnológica · ciberataque o brecha',
    descripcion:'Protocolo CCN-CERT para incidentes de ciberseguridad y filtraciones de datos.',
    pasos:[
      'Aislar los sistemas afectados en menos de 1h',
      'Notificación a AEPD en menos de 72h (RGPD)',
      'Comunicación pública controlada · evitar pánico',
      'Comparecencia ministerial en menos de 24h',
      'Auditoría externa independiente en menos de 30 días',
      'Plan de refuerzo y informe a la Comisión Europea',
    ],
  },
  {
    id:'pb-politica', tipo:'Política', nombre:'Crisis política · dimisión o corrupción',
    descripcion:'Protocolo para escándalos institucionales y crisis de Gobierno.',
    pasos:[
      'Reunión urgente del Comité Ejecutivo del partido',
      'Decisión sobre cese o respaldo en menos de 48h',
      'Mensaje único coordinado · evitar contradicciones',
      'Búsqueda de aliados parlamentarios para frenar mociones',
      'Plan de contención mediática · briefings off the record',
      'Análisis de escenarios post-resolución (corto y medio plazo)',
    ],
  },
  {
    id:'pb-diplomatica', tipo:'Diplomática', nombre:'Crisis diplomática · conflicto internacional',
    descripcion:'Protocolo para crisis con terceros países (aranceles, expulsiones, sanciones).',
    pasos:[
      'Reunión bilateral Presidencia-Asuntos Exteriores',
      'Coordinación con Comisión Europea y socios UE',
      'Activar canales diplomáticos discretos en paralelo',
      'Plan de respuesta económica para sectores afectados',
      'Comunicación pública medida · sin escalada',
      'Visita ministerial al país concernido si procede',
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function CrisisPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [selectedId, setSelectedId] = useState(CRISIS[0].id)
  const [tab, setTab] = useState<'timeline' | 'stakeholders' | 'acciones' | 'metricas' | 'playbook'>('timeline')
  const [filterSev, setFilterSev] = useState<Severidad | 'Todas'>('Todas')
  const selected = useMemo(() => CRISIS.find(c => c.id === selectedId)!, [selectedId])

  const totals = useMemo(() => {
    const cri = CRISIS.filter(c => c.severidad === 'CRÍTICA').length
    const alt = CRISIS.filter(c => c.severidad === 'ALTA').length
    const activas = CRISIS.filter(c => c.fase === 'Activa' || c.fase === 'Detección' || c.fase === 'Contención').length
    const accionesAbiertas = CRISIS.reduce((s, c) => s + c.acciones.filter(a => a.estado !== 'Completada').length, 0)
    return { total: CRISIS.length, cri, alt, activas, accionesAbiertas }
  }, [])

  const visibles = useMemo(() => CRISIS.filter(c => filterSev === 'Todas' || c.severidad === filterSev), [filterSev])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#7F1D1D 0%,#1A0202 100%)',
          borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
          position:'relative', overflow:'hidden',
        }}>
          {/* Pulso decorativo */}
          <div style={{
            position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%',
            background:'radial-gradient(circle, #DC2626aa 0%, transparent 60%)',
            animation:'none',
          }}/>
          <div style={{ position:'relative' }}>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              <span style={{ color:'#FCA5A5', marginRight:6 }}>●</span> RIESGO · CRISIS INTELLIGENCE EN TIEMPO REAL
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              {totals.activas} crisis activas <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>requieren atención</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              {totals.cri} {totals.cri === 1 ? 'crítica' : 'críticas'} · {totals.alt} {totals.alt === 1 ? 'alta' : 'altas'} · {totals.accionesAbiertas} acciones abiertas pendientes de ejecución.
              Monitorización 24/7 con alertas automáticas, gestión de stakeholders y playbooks por tipo de crisis.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, position:'relative' }}>
            <HeroKPI label="Crisis"     value={String(totals.total)} accent="#FCA5A5"/>
            <HeroKPI label="Críticas"   value={String(totals.cri)}   accent="#DC2626"/>
            <HeroKPI label="Activas"    value={String(totals.activas)} accent="#F97316"/>
            <HeroKPI label="Acciones"   value={String(totals.accionesAbiertas)} accent="#EAB308"/>
          </div>
        </section>

        {/* ───── Filtro y selector de crisis (cards) ───── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Severidad:</span>
          <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3 }}>
            {(['Todas','CRÍTICA','ALTA','MEDIA','BAJA'] as const).map(s => {
              const active = filterSev === s
              const col = s === 'Todas' ? '#1d1d1f' : SEV_META[s].color
              return (
                <button key={s} onClick={() => setFilterSev(s)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? col : '#6e6e73',
                  border:'none', borderRadius:999, padding:'4px 12px',
                  fontSize:11, fontWeight: active ? 700 : 500, cursor:'pointer',
                  fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>{s}</button>
              )
            })}
          </div>
          <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{visibles.length} crisis visibles</span>
        </div>

        <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))', gap:10, marginBottom:18 }}>
          {visibles.map(c => {
            const sev = SEV_META[c.severidad]
            const tm = TIPO_META[c.tipo]
            const fm = FASE_META[c.fase]
            const active = c.id === selectedId
            const sentColor = c.metricas.sentimiento >= 0 ? '#16A34A' : c.metricas.sentimiento >= -0.2 ? '#F97316' : '#DC2626'
            return (
              <button key={c.id} onClick={() => setSelectedId(c.id)} style={{
                textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                background:'#fff', border:`1px solid ${active ? sev.color : '#ECECEF'}`,
                borderRadius:14, overflow:'hidden',
                boxShadow: active ? `0 0 0 3px ${sev.color}22` : '0 1px 3px rgba(0,0,0,0.04)',
                borderLeft:`4px solid ${sev.color}`,
                padding:0, transition:'box-shadow 200ms',
              }}>
                <header style={{ padding:'12px 14px 8px', borderBottom:'1px solid #F5F5F7' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:4,
                      background:sev.color, color:'#fff',
                    }}>● {c.severidad}</span>
                    <span style={{
                      fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:4,
                      background:`${tm.color}15`, color:tm.color, border:`1px solid ${tm.color}40`,
                    }}>{c.tipo.toUpperCase()}</span>
                    <span style={{
                      fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${fm.color}15`, color:fm.color, border:`1px solid ${fm.color}40`,
                    }}>{c.fase.toUpperCase()}</span>
                  </div>
                  <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, letterSpacing:'-0.012em', color:'#1d1d1f', lineHeight:1.25 }}>{c.titulo}</h3>
                  <div style={{ fontSize:10.5, color:'#6e6e73' }}>{c.ubicacion}</div>
                </header>
                <div style={{ padding:'10px 14px 12px' }}>
                  <p style={{ margin:'0 0 8px', fontSize:11.5, color:'#3a3a3d', lineHeight:1.45,
                              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{c.resumen}</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                    <Mini label="Impacto" value={`${c.metricas.impactoMediatico}`} sub="/100" color={sev.color}/>
                    <Mini label="Sent." value={`${c.metricas.sentimiento >= 0 ? '+' : ''}${c.metricas.sentimiento.toFixed(2)}`} sub="" color={sentColor}/>
                    <Mini label="Spike" value={`+${c.metricas.spike}%`} sub="24h" color="#5B21B6"/>
                  </div>
                </div>
              </button>
            )
          })}
        </section>

        {/* ───── Cabecera del expediente seleccionado ───── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'18px 24px', marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          borderLeft:`5px solid ${SEV_META[selected.severidad].color}`,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:18, flexWrap:'wrap', marginBottom:10 }}>
            <div style={{ flex:'1 1 460px', minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                <span style={{
                  fontSize:9.5, fontWeight:800, letterSpacing:'0.08em',
                  padding:'3px 8px', borderRadius:6,
                  background:SEV_META[selected.severidad].color, color:'#fff',
                }}>● {selected.severidad}</span>
                <span style={{
                  fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                  padding:'3px 8px', borderRadius:6,
                  background:`${TIPO_META[selected.tipo].color}15`, color:TIPO_META[selected.tipo].color, border:`1px solid ${TIPO_META[selected.tipo].color}40`,
                }}>{selected.tipo.toUpperCase()}</span>
                <span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>· INICIO: {selected.inicio}</span>
                <span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>· ÚLT: {selected.actualizacion}</span>
              </div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:600, letterSpacing:'-0.018em', margin:'0 0 4px', color:'#1d1d1f', lineHeight:1.2 }}>
                {selected.titulo}
              </h2>
              <p style={{ margin:'0 0 6px', fontSize:11.5, color:'#6e6e73' }}>{selected.ubicacion}</p>
              <p style={{ margin:0, fontSize:13, color:'#3a3a3d', lineHeight:1.5 }}>{selected.resumen}</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,auto)', gap:8 }}>
              <CardKPI label="Impacto" value={`${selected.metricas.impactoMediatico}`} sub="/100" color={SEV_META[selected.severidad].color}/>
              <CardKPI label="Sentim." value={`${selected.metricas.sentimiento >= 0 ? '+' : ''}${selected.metricas.sentimiento.toFixed(2)}`} sub="-1..+1" color={selected.metricas.sentimiento >= 0 ? '#16A34A' : '#DC2626'}/>
              <CardKPI label="Audien." value={selected.metricas.audienciaPotencial} sub="potencial" color="#5B21B6"/>
              <CardKPI label="Mencs." value={`${selected.metricas.menciones24h}K`} sub="24 h" color="#0EA5E9"/>
            </div>
          </div>
          {/* Barra de progreso de fase */}
          <div style={{ marginTop:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>
              <span>Fase: <span style={{ color:FASE_META[selected.fase].color }}>{selected.fase}</span></span>
              <span>{FASE_META[selected.fase].pct}% del ciclo</span>
            </div>
            <div style={{ display:'flex', height:8, background:'#F5F5F7', borderRadius:4, overflow:'hidden' }}>
              {(['Detección','Activa','Contención','Resolución','Cerrada'] as Fase[]).map(f => {
                const isPast = FASE_META[f].pct <= FASE_META[selected.fase].pct
                return (
                  <div key={f} style={{ flex:1, background: isPast ? FASE_META[selected.fase].color : 'transparent', borderRight: f !== 'Cerrada' ? '2px solid #fff' : 'none' }}/>
                )
              })}
            </div>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'timeline',     label:'Timeline',         count: selected.hitos.length },
            { k:'stakeholders', label:'Stakeholders',     count: selected.stakeholders.length },
            { k:'acciones',     label:'Plan de acción',   count: selected.acciones.length },
            { k:'metricas',     label:'Métricas y riesgos', count: selected.riesgos.length },
            { k:'playbook',     label:'Playbook',         count: PLAYBOOKS.find(p => p.tipo === selected.tipo) ? 1 : 0 },
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
                {t.label} <span style={{ marginLeft:5, color: active ? SEV_META[selected.severidad].color : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Timeline ───── */}
        {tab === 'timeline' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ position:'relative' }}>
              <div style={{ position:'absolute', left:55, top:6, bottom:6, width:2, background:'#ECECEF' }}/>
              {[...selected.hitos].reverse().map((h, i) => (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'42px 18px 1fr 70px',
                  gap:12, alignItems:'flex-start',
                  padding: i === 0 ? '0 0 14px 0' : '14px 0',
                  borderTop: i === 0 ? 'none' : '1px solid #FAFAFB',
                }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:'#1d1d1f' }}>{h.fecha.slice(0,5)}</div>
                    <div style={{ fontSize:10, color:'#6e6e73', fontWeight:600 }}>{h.hora}</div>
                  </div>
                  <div style={{ position:'relative', width:18, height:18 }}>
                    <div style={{
                      width:14, height:14, borderRadius:'50%', background:'#fff',
                      border:`3px solid ${IMP_COLOR[h.impacto]}`,
                      boxShadow:`0 0 0 3px ${IMP_COLOR[h.impacto]}22`,
                      position:'absolute', top:3, left:2, zIndex:1,
                    }}/>
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p style={{ margin:0, fontSize:12.5, color:'#1d1d1f', fontWeight:500, lineHeight:1.4 }}>{h.evento}</p>
                    <div style={{ fontSize:10.5, color:'#6e6e73', marginTop:3, fontWeight:600 }}>· {h.fuente}</div>
                  </div>
                  <span style={{
                    fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                    padding:'2px 7px', borderRadius:999, alignSelf:'center', textAlign:'center',
                    background:`${IMP_COLOR[h.impacto]}15`, color:IMP_COLOR[h.impacto], border:`1px solid ${IMP_COLOR[h.impacto]}40`,
                  }}>{h.impacto.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── TAB · Stakeholders ───── */}
        {tab === 'stakeholders' && (
          <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:10 }}>
            {selected.stakeholders.map((s, i) => (
              <article key={i} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                padding:'12px 14px', display:'grid', gridTemplateColumns:'auto 1fr', gap:11, alignItems:'center',
                borderLeft:`3px solid ${POS_COLOR[s.posicion]}`,
              }}>
                <div style={{
                  width:38, height:38, borderRadius:'50%', background:POS_COLOR[s.posicion], color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, flexShrink:0,
                }}>{s.nombre.split(/[\s·]+/).filter(Boolean).slice(0,2).map(n => n[0]).join('').toUpperCase()}</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.nombre}</div>
                  <div style={{ fontSize:10.5, color:'#6e6e73', marginTop:1 }}>{s.rol}</div>
                  <div style={{ marginTop:5 }}>
                    <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${POS_COLOR[s.posicion]}15`, color:POS_COLOR[s.posicion], border:`1px solid ${POS_COLOR[s.posicion]}40`,
                    }}>{s.posicion.toUpperCase()}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ───── TAB · Plan de acción ───── */}
        {tab === 'acciones' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:760 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['Acción','Responsable','Plazo','Estado'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.acciones.map((a, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'10px 14px', fontWeight:600, color:'#1d1d1f' }}>{a.accion}</td>
                      <td style={{ padding:'10px 14px', color:'#3a3a3d' }}>{a.responsable}</td>
                      <td style={{ padding:'10px 14px', fontFamily:'var(--font-display)', color:'#1d1d1f', whiteSpace:'nowrap' }}>{a.plazo}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{
                          fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                          padding:'2px 8px', borderRadius:999,
                          background:`${ACC_META[a.estado]}15`, color:ACC_META[a.estado], border:`1px solid ${ACC_META[a.estado]}40`,
                        }}>
                          {a.estado.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Métricas y riesgos ───── */}
        {tab === 'metricas' && (
          <section style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 14px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Métricas mediáticas</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <Metric label="Impacto mediático"      value={selected.metricas.impactoMediatico} max={100} unit="/100" color={SEV_META[selected.severidad].color}/>
                <Metric label="Sentimiento (−1..+1)"   value={Math.round((selected.metricas.sentimiento + 1) * 50)} max={100} unit={`${selected.metricas.sentimiento >= 0 ? '+' : ''}${selected.metricas.sentimiento.toFixed(2)}`} color={selected.metricas.sentimiento >= 0 ? '#16A34A' : '#DC2626'}/>
                <Metric label="Spike de menciones 24h" value={Math.min(100, selected.metricas.spike)} max={100} unit={`+${selected.metricas.spike}%`} color="#5B21B6"/>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:6 }}>
                  <Mini label="Audien. potencial" value={selected.metricas.audienciaPotencial}        sub="alcance" color="#5B21B6"/>
                  <Mini label="Menciones 24h"     value={`${selected.metricas.menciones24h}K`}        sub="vol. total" color="#0EA5E9"/>
                </div>
              </div>
            </div>
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ margin:'0 0 14px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em', color:'#DC2626' }}>Riesgos identificados</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {selected.riesgos.map(r => (
                  <div key={r} style={{
                    background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10,
                    padding:'10px 12px', display:'flex', gap:9, alignItems:'flex-start',
                  }}>
                    <span style={{ color:'#DC2626', fontWeight:800, flexShrink:0, fontSize:14, lineHeight:1.2 }}>!</span>
                    <span style={{ fontSize:12.5, color:'#7F1D1D', lineHeight:1.4 }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ───── TAB · Playbook ───── */}
        {tab === 'playbook' && (() => {
          const pb = PLAYBOOKS.find(p => p.tipo === selected.tipo)
          if (!pb) return (
            <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'30px', textAlign:'center', color:'#6e6e73', fontSize:13 }}>
              No hay playbook específico para crisis de tipo <strong>{selected.tipo}</strong>.
            </section>
          )
          const tm = TIPO_META[pb.tipo]
          return (
            <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
                <span style={{ width:4, height:22, borderRadius:2, background:tm.color, display:'inline-block' }}/>
                <h3 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, letterSpacing:'-0.014em' }}>{pb.nombre}</h3>
              </div>
              <p style={{ margin:'0 0 16px', fontSize:12.5, color:'#3a3a3d', lineHeight:1.5 }}>{pb.descripcion}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {pb.pasos.map((p, i) => (
                  <div key={i} style={{
                    display:'grid', gridTemplateColumns:'auto 1fr', gap:12, alignItems:'center',
                    padding:'12px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                  }}>
                    <div style={{
                      width:32, height:32, borderRadius:'50%', background:tm.color, color:'#fff',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, flexShrink:0,
                    }}>{i+1}</div>
                    <span style={{ fontSize:12.5, color:'#1d1d1f', fontWeight:500, lineHeight:1.45 }}>{p}</span>
                  </div>
                ))}
              </div>
            </section>
          )
        })()}

        {/* ───── Biblioteca de playbooks ───── */}
        <section style={{ marginTop:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>
              Biblioteca de playbooks · protocolos por tipo de crisis
            </h2>
            <span style={{ fontSize:11, color:'#6e6e73' }}>{PLAYBOOKS.length} playbooks</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:10 }}>
            {PLAYBOOKS.map(pb => {
              const tm = TIPO_META[pb.tipo]
              return (
                <article key={pb.id} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
                  padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`3px solid ${tm.color}`,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                    <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:4,
                      background:tm.color, color:'#fff',
                    }}>{pb.tipo.toUpperCase()}</span>
                  </div>
                  <h4 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:13.5, fontWeight:600, color:'#1d1d1f', letterSpacing:'-0.012em' }}>{pb.nombre}</h4>
                  <p style={{ margin:'0 0 8px', fontSize:11, color:'#6e6e73', lineHeight:1.45 }}>{pb.descripcion}</p>
                  <div style={{ fontSize:11, color:'#3a3a3d' }}>
                    <strong style={{ color:'#1d1d1f' }}>{pb.pasos.length}</strong> pasos protocolizados
                  </div>
                </article>
              )
            })}
          </div>
        </section>

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Crisis Intelligence · Politeia Analítica · {new Date().getFullYear()}
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

function CardKPI({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div style={{ textAlign:'center', minWidth:80, padding:'8px 12px', background:'#FAFAFB', borderRadius:10, border:'1px solid #ECECEF' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, lineHeight:1, color, letterSpacing:'-0.018em' }}>{value}</div>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'#6e6e73', marginTop:3 }}>{label}</div>
      {sub && <div style={{ fontSize:8.5, color:'#86868b', marginTop:1 }}>{sub}</div>}
    </div>
  )
}

function Mini({ label, value, sub, color }: { label:string, value:string, sub:string, color:string }) {
  return (
    <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8, padding:'7px 8px', textAlign:'center' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color, lineHeight:1 }}>{value}{sub && <span style={{ fontSize:9, color:'#86868b', marginLeft:1, fontWeight:600 }}>{sub}</span>}</div>
      <div style={{ fontSize:8.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.04em', textTransform:'uppercase', marginTop:3 }}>{label}</div>
    </div>
  )
}

function Metric({ label, value, max, unit, color }: { label:string, value:number, max:number, unit:string, color:string }) {
  const pct = (value / max) * 100
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:11, color:'#3a3a3d', fontWeight:600 }}>{label}</span>
        <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color }}>{unit}</span>
      </div>
      <div style={{ height:8, background:'#F5F5F7', borderRadius:4, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4, transition:'width 320ms' }}/>
      </div>
    </div>
  )
}
