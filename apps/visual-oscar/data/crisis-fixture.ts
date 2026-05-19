/**
 * FIXTURE — Crisis Intelligence (riesgo · crisis activas + playbooks).
 *
 * Estos son datos curados que sirven como fallback cuando el backend
 * `/api/intelligence/signals?tipo=crisis` no está disponible o no tiene
 * datasets. El route handler `app/api/crisis/route.ts` los devuelve con
 * `_meta.source='mock'`.
 *
 * Cuando el módulo de Crisis Intelligence esté operativo en el backend,
 * este fixture pasará a ser meramente referencia y se eliminará.
 */

export type Severidad = 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA'
export type Fase = 'Detección' | 'Activa' | 'Contención' | 'Resolución' | 'Cerrada'
export type TipoCrisis =
  | 'Política' | 'Económica' | 'Sanitaria' | 'Mediática' | 'Tecnológica'
  | 'Climática' | 'Diplomática' | 'Social' | 'Energética' | 'Migratoria'

export type StakePos = 'aliado' | 'neutral' | 'opositor'
export type Stakeholder = { nombre: string; rol: string; posicion: StakePos }

export type Hito = { fecha: string; hora: string; evento: string; fuente: string; impacto: 'positivo' | 'neutral' | 'negativo' }
export type Accion = { accion: string; responsable: string; plazo: string; estado: 'Pendiente' | 'En curso' | 'Completada' }

export type Crisis = {
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

export type Playbook = { id: string; tipo: TipoCrisis; nombre: string; descripcion: string; pasos: string[] }

// ─────────────────────────────────────────────────────────────────────────
// Datos · 6 crisis (mix de reales + verosímiles)
// ─────────────────────────────────────────────────────────────────────────
export const CRISIS: Crisis[] = [
  {
    id:'dana-valencia',
    titulo:'Reconstrucción tras la DANA · 18 meses después',
    tipo:'Climática', severidad:'ALTA', fase:'Contención',
    inicio:'29/10/2024', actualizacion:'06/05/2026 09:30',
    ubicacion:'C. Valenciana · 75 municipios afectados',
    resumen:'Comisión de investigación abierta · 219 fallecidos · ejecución de ayudas en el 47% · tensión política sobre el reparto. Carlos Mazón dimitió en noviembre 2025 (un año después de la riada) · sustituido por Juanfran Pérez Llorca. VOX rompe el pacto con PP en diciembre 2025.',
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
export const PLAYBOOKS: Playbook[] = [
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
