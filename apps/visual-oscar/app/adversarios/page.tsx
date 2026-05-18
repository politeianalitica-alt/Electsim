'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'

interface AdversariosResp {
  profiles?: Array<{ partido: string; intencion: number; delta7d: number; escanos: number; nivel: string }>
  generated_at?: string
}

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────
type Threat = 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO'

type Vulnerabilidad = { titulo: string; detalle: string; explotabilidad: number /* 0-100 */ }
type Mensaje = { titular: string; recurrencia: number /* 0-100 */; eficacia: number /* 0-100 */ }
type Voceria = { nombre: string; rol: string; valoracion: number /* /10 */; visibilidad: number /* 0-100 */ }
type Movim = { fecha: string; tipo: 'Mitin' | 'Debate' | 'Entrevista' | 'Comparecencia' | 'Acto' | 'Convención'; titulo: string; ubicacion: string }

type Adversario = {
  id: string
  siglas: string
  nombre: string
  color: string
  lider: string
  liderIniciales: string
  liderValoracion: number   // /10
  liderImagen: number        // /10
  liderConocimiento: number  // %
  intencionVoto: number      // %
  delta30d: number
  intencionUlt: number[]     // 8 puntos · evolución 8 semanas
  conocimiento: number       // %
  ideologia: number          // -100..+100
  centralizacion: number     // -100..+100
  amenaza: Threat
  // SWOT
  fortalezas: string[]
  debilidades: string[]
  oportunidadesNosotros: string[]  // qué oportunidades nos brinda
  amenazas: string[]                // qué riesgos plantea
  // Inteligencia
  mensajes: Mensaje[]
  voceros: Voceria[]
  vulnerabilidades: Vulnerabilidad[]
  coaliciones: { aliado: string; tipo: 'Coalición'|'Apoyo'|'Investidura'|'Pactos puntuales'; estabilidad: number /*0-100*/ }[]
  proximos: Movim[]
  // Equipo
  jefeCampania: string
  estrategia: string
  comunicacion: string
  // Recursos
  presupuestoEstim: number   // M€
  voluntariosEstim: number   // K
  redesAlcance: number        // M
  // Histórico
  votoSerie: number[]         // últimas 6 elecciones %
}

const THREAT_META: Record<Threat, { color: string }> = {
  'CRÍTICO': { color:'#DC2626' },
  'ALTO':    { color:'#F97316' },
  'MEDIO':   { color:'#EAB308' },
  'BAJO':    { color:'#0EA5E9' },
}

// ─────────────────────────────────────────────────────────────────────────
// Datos · 6 adversarios principales
// ─────────────────────────────────────────────────────────────────────────
const ADVERSARIOS: Adversario[] = [
  {
    id:'psoe', siglas:'PSOE', nombre:'Partido Socialista Obrero Español', color:'#E1322D',
    lider:'Pedro Sánchez', liderIniciales:'PS',
    liderValoracion:3.8, liderImagen:4.0, liderConocimiento:99,
    intencionVoto:26.8, delta30d:-0.2,
    intencionUlt:[28.0, 28.4, 27.8, 27.2, 27.0, 27.1, 26.9, 26.8],
    conocimiento:99, ideologia:-22, centralizacion:+12, amenaza:'CRÍTICO',
    fortalezas:[
      'Maquinaria territorial densa con presencia en todos los municipios',
      'Control de la agenda institucional desde el Gobierno',
      'Acceso preferente a medios públicos y difusión',
      'Núcleo de fidelidad electoral consolidado en pensiones, sanidad y educación',
      'Cinco vicepresidencias y narrativa de continuidad',
    ],
    debilidades:[
      'Desgaste por gestión cotidiana y crisis institucionales',
      'Dependencia aritmética de Junts y EH Bildu para legislar',
      'Pérdida de poder territorial en CCAA históricas (Asturias, Aragón)',
      'Ruido judicial en torno a Begoña Gómez y caso Koldo',
      'Caída sostenida en franja 25-44 años urbanos',
    ],
    oportunidadesNosotros:[
      'Atacar la dependencia de Junts: imagen de gobierno «de prestado»',
      'Visibilizar bloqueo presupuestario y fracaso del decreto ómnibus',
      'Capitalizar fatiga ciudadana con la legislatura',
      'Polarizar sobre amnistía y unidad de España',
    ],
    amenazas:[
      'Movilización afectiva de su electorado fiel ante riesgo de cambio',
      'Capacidad mediática y de fact-checking institucional',
      'Apoyo organizado de UGT y CCOO en territorio',
      'Riesgo de pacto de última hora con Junts que reactive narrativa',
    ],
    mensajes:[
      { titular:'«Coalición progresista de avance social»',                       recurrencia:88, eficacia:62 },
      { titular:'«La derecha quiere recortar pensiones y sanidad»',               recurrencia:78, eficacia:72 },
      { titular:'«España va bien · datos económicos y empleo récord»',            recurrencia:72, eficacia:55 },
      { titular:'«La amnistía cierra heridas y normaliza Cataluña»',              recurrencia:42, eficacia:25 },
      { titular:'«PP+VOX = retroceso democrático»',                                recurrencia:82, eficacia:65 },
    ],
    voceros:[
      { nombre:'Pedro Sánchez',     rol:'Presidente · líder',          valoracion:3.8, visibilidad:98 },
      { nombre:'María Jesús Montero',rol:'Vp 1ª · candidata Andalucía', valoracion:4.2, visibilidad:78 },
      { nombre:'Pilar Alegría',     rol:'Portavoz del Gobierno',        valoracion:4.5, visibilidad:82 },
      { nombre:'Patxi López',        rol:'Portavoz parlamentario',      valoracion:5.1, visibilidad:62 },
      { nombre:'Esther Peña',        rol:'Portavoz parlamentaria',      valoracion:4.8, visibilidad:45 },
      { nombre:'Óscar Puente',       rol:'Min. Transportes · ataque',   valoracion:3.5, visibilidad:74 },
    ],
    vulnerabilidades:[
      { titulo:'Bloqueo presupuestario',          detalle:'Tres ejercicios sin nuevos PGE · gobierno con prórroga 2023', explotabilidad:88 },
      { titulo:'Crisis de Junts',                  detalle:'Junts amenaza con tumbar 3 RDL si no hay cesión fiscal',     explotabilidad:75 },
      { titulo:'Caso Begoña Gómez · TS',           detalle:'Causa abierta y citaciones pendientes ante el juez',         explotabilidad:65 },
      { titulo:'Caso Koldo · ex-PSOE Ábalos',      detalle:'Desgaste en sumario judicial con eco mediático constante',   explotabilidad:62 },
      { titulo:'Frente Fiscalía · García Ortiz',   detalle:'TS rechaza nulidad · oposición exige cese · inestabilidad',  explotabilidad:72 },
    ],
    coaliciones:[
      { aliado:'Sumar',     tipo:'Coalición',          estabilidad:62 },
      { aliado:'ERC',        tipo:'Investidura',        estabilidad:55 },
      { aliado:'PNV',        tipo:'Investidura',        estabilidad:78 },
      { aliado:'EH Bildu',   tipo:'Apoyo',              estabilidad:72 },
      { aliado:'Junts',      tipo:'Pactos puntuales',   estabilidad:30 },
      { aliado:'BNG · CC',   tipo:'Pactos puntuales',   estabilidad:65 },
    ],
    proximos:[
      { fecha:'08/05/2026', tipo:'Mitin',          titulo:'Acto de campaña europea',                  ubicacion:'Sevilla' },
      { fecha:'09/05/2026', tipo:'Acto',           titulo:'Día de Europa · Comisión y eurodiputados', ubicacion:'Madrid · Casa de Europa' },
      { fecha:'12/05/2026', tipo:'Debate',         titulo:'Debate televisado · TVE',                   ubicacion:'TVE Prado del Rey' },
      { fecha:'15/05/2026', tipo:'Convención',     titulo:'Convención federal del PSOE',              ubicacion:'A Coruña' },
    ],
    jefeCampania:'Santos Cerdán', estrategia:'Pilar Cancela · Eva Granados', comunicacion:'Pilar Alegría',
    presupuestoEstim:14.0, voluntariosEstim:18.5, redesAlcance:42.0,
    votoSerie:[28.0, 22.7, 28.7, 28.0, 30.0, 31.7],
  },
  {
    id:'vox', siglas:'VOX', nombre:'VOX', color:'#5BA02E',
    lider:'Santiago Abascal', liderIniciales:'SA',
    liderValoracion:3.9, liderImagen:3.7, liderConocimiento:96,
    intencionVoto:12.4, delta30d:-0.8,
    intencionUlt:[13.2, 13.4, 13.0, 12.8, 12.6, 12.6, 12.5, 12.4],
    conocimiento:96, ideologia:+78, centralizacion:+60, amenaza:'ALTO',
    fortalezas:[
      'Voto fiel y altamente fidelizado en franja 18-34 hombres',
      'Disciplina interna y mensaje muy compacto',
      'Capacidad disruptiva para marcar agenda en inmigración',
      'Crecimiento sostenido en zonas rurales y costa mediterránea',
      'Eurodiputados activos con conexión a Patriotas por Europa',
    ],
    debilidades:[
      'Caída en sondeos tras debate sobre inmigración',
      'Ruptura del pacto autonómico con PP en julio 2024 sin recuperación',
      'Sin acceso real a gobiernos autonómicos',
      'Polarización de su electorado limita expansión',
      'Conflictos internos visibles tras salida de Iván Espinosa',
    ],
    oportunidadesNosotros:[
      'Atraer voto VOX en clase media urbana adulta',
      'Posicionarnos como única alternativa real de gobierno',
      'Capitalizar agenda económica que VOX descuida',
      'Disociar al PP de la pertenencia a su marco',
    ],
    amenazas:[
      'Capacidad de marcar agenda mediática en inmigración',
      'Ascenso eventual en jóvenes hombres TikTok',
      'Movilización afectiva con identidad y patria',
      'Influencia en CCAA donde queda como alternativa',
    ],
    mensajes:[
      { titular:'«Stop a la inmigración ilegal»',                                recurrencia:92, eficacia:68 },
      { titular:'«Bajada masiva de impuestos · libertad económica»',             recurrencia:78, eficacia:55 },
      { titular:'«Defender la familia y la vida»',                                recurrencia:62, eficacia:48 },
      { titular:'«España: una, grande y libre · contra el separatismo»',          recurrencia:72, eficacia:50 },
      { titular:'«PP es PSOE light · necesitas voto VOX»',                       recurrencia:65, eficacia:52 },
    ],
    voceros:[
      { nombre:'Santiago Abascal',  rol:'Presidente',                  valoracion:3.9, visibilidad:88 },
      { nombre:'Pepa Millán',        rol:'Voz mediática parlamentaria', valoracion:4.4, visibilidad:78 },
      { nombre:'José M. Figaredo',   rol:'Portavoz Economía',           valoracion:4.5, visibilidad:62 },
      { nombre:'Ignacio Garriga',    rol:'Sec. general · Cataluña',    valoracion:3.6, visibilidad:55 },
      { nombre:'Manuel Mariscal',    rol:'Vicesec. Comunicación',       valoracion:3.8, visibilidad:48 },
      { nombre:'Rocío Monasterio',   rol:'Líder Madrid',                valoracion:3.4, visibilidad:62 },
    ],
    vulnerabilidades:[
      { titulo:'Caída tras debate inmigración',     detalle:'-0.8 pp en una semana · narrativa de extremismo aviva el centro', explotabilidad:78 },
      { titulo:'Conflictos internos · post-Espinosa',detalle:'Salidas de cuadros y Atenea como think-tank rival',              explotabilidad:62 },
      { titulo:'Sin gobiernos autonómicos',           detalle:'Ruptura con PP en CCAA dejó a VOX fuera del poder territorial',  explotabilidad:55 },
      { titulo:'Polémicas en Europa · grupos PfE',   detalle:'Asociación con AfD y Reagrupación Nacional puede penalizar',     explotabilidad:48 },
    ],
    coaliciones:[
      { aliado:'PP', tipo:'Pactos puntuales', estabilidad:25 },
    ],
    proximos:[
      { fecha:'07/05/2026', tipo:'Acto',          titulo:'Encuentro con autónomos en Levante',                ubicacion:'Murcia' },
      { fecha:'10/05/2026', tipo:'Mitin',         titulo:'Mitin con jóvenes · Vistalegre',                   ubicacion:'Madrid' },
      { fecha:'13/05/2026', tipo:'Convención',    titulo:'Convención «Por España» · estrategia europea',     ubicacion:'Toledo' },
      { fecha:'18/05/2026', tipo:'Comparecencia', titulo:'Comparecencia parlamentaria sobre inmigración',     ubicacion:'Congreso' },
    ],
    jefeCampania:'Pepa Millán', estrategia:'Manuel Mariscal', comunicacion:'Pepa Millán',
    presupuestoEstim:6.5, voluntariosEstim:5.2, redesAlcance:18.0,
    votoSerie:[0.2, 0.2, 10.3, 15.1, 12.4, 12.4],
  },
  {
    id:'sumar', siglas:'Sumar', nombre:'Sumar · movimiento político', color:'#D43F8D',
    lider:'Yolanda Díaz', liderIniciales:'YD',
    liderValoracion:3.5, liderImagen:3.6, liderConocimiento:88,
    intencionVoto:10.2, delta30d:-1.2,
    intencionUlt:[12.8, 12.4, 12.0, 11.6, 11.2, 10.8, 10.5, 10.2],
    conocimiento:88, ideologia:-58, centralizacion:-18, amenaza:'MEDIO',
    fortalezas:[
      '5 ministerios en el Gobierno · capacidad de impulsar leyes laborales',
      'Apoyo de IU, Comuns, Compromís y Más Madrid en su federación',
      'Yolanda Díaz como liderazgo vinculado a la reducción de jornada',
      'Capacidad legislativa real (jornada 37,5 h, SMI)',
      'Identidad social-ecologista coherente',
    ],
    debilidades:[
      'Caída en sondeos sostenida desde europeas 2024',
      'Tensión interna con Podemos y rivalidad por el espacio',
      'Identidad poco consolidada · marca Sumar débil',
      'Dependencia del Gobierno Sánchez para visibilidad',
      'Bajo conocimiento de líderes alternativos a Yolanda',
    ],
    oportunidadesNosotros:[
      'Capitalizar fatiga del votante de izquierda crítico',
      'Atraer voto socialdemócrata desencantado con la coalición',
      'Visibilizar tensión con CCOO/UGT por la reducción de jornada',
      'Posicionarnos como serieros frente a improvisación',
    ],
    amenazas:[
      'Posible upset si Yolanda lanza «momento ético»',
      'Capacidad movilizadora en grandes ciudades',
      'Apoyo social de plataformas vivienda y trabajo',
      'Acceso a medios públicos y difusión institucional',
    ],
    mensajes:[
      { titular:'«Reducción de la jornada laboral · vida digna»',         recurrencia:85, eficacia:65 },
      { titular:'«Vivienda como derecho»',                                  recurrencia:78, eficacia:60 },
      { titular:'«Subir el SMI por encima de la inflación»',                recurrencia:62, eficacia:55 },
      { titular:'«Frente progresista contra la ultraderecha»',              recurrencia:72, eficacia:45 },
      { titular:'«Justicia fiscal · que paguen más los que más tienen»',   recurrencia:58, eficacia:48 },
    ],
    voceros:[
      { nombre:'Yolanda Díaz',      rol:'Vp 2ª · líder',             valoracion:3.5, visibilidad:82 },
      { nombre:'Mónica García',      rol:'Min. Sanidad',             valoracion:5.4, visibilidad:62 },
      { nombre:'Ernest Urtasun',     rol:'Min. Cultura',              valoracion:4.2, visibilidad:48 },
      { nombre:'Marta Lois',         rol:'Portavoz parlamentaria',   valoracion:4.0, visibilidad:42 },
      { nombre:'Pablo Bustinduy',    rol:'Min. Derechos Sociales',   valoracion:4.6, visibilidad:38 },
    ],
    vulnerabilidades:[
      { titulo:'Caída en sondeos',                detalle:'Pérdida de 2.6 pp en 8 semanas · base electoral en duda',           explotabilidad:75 },
      { titulo:'Ruptura con Podemos',              detalle:'Verstrynge y Belarra atacan desde fuera del grupo',                explotabilidad:62 },
      { titulo:'Tensión jornada laboral con CEOE', detalle:'Patronal abandona diálogo social · puede generar imagen de bloqueo',explotabilidad:48 },
      { titulo:'Marca débil',                       detalle:'Solo 38% conoce a sus ministros más allá de Yolanda Díaz',         explotabilidad:55 },
    ],
    coaliciones:[
      { aliado:'PSOE',     tipo:'Coalición',          estabilidad:62 },
      { aliado:'IU',        tipo:'Coalición',          estabilidad:88 },
      { aliado:'Comuns',    tipo:'Coalición',          estabilidad:78 },
      { aliado:'Compromís', tipo:'Coalición',          estabilidad:70 },
      { aliado:'Más Madrid',tipo:'Coalición',          estabilidad:65 },
      { aliado:'BNG',        tipo:'Coalición',         estabilidad:72 },
    ],
    proximos:[
      { fecha:'08/05/2026', tipo:'Acto',  titulo:'Encuentro con sindicatos',                  ubicacion:'Madrid · CCOO Lope de Vega' },
      { fecha:'14/05/2026', tipo:'Mitin', titulo:'Acto reducción jornada · trabajadores',     ubicacion:'Barcelona' },
      { fecha:'19/05/2026', tipo:'Convención', titulo:'Asamblea Sumar Cataluña',               ubicacion:'Sabadell' },
    ],
    jefeCampania:'Lara Hernández', estrategia:'Aina Vidal', comunicacion:'Tesh Sidi',
    presupuestoEstim:3.2, voluntariosEstim:2.4, redesAlcance:9.5,
    votoSerie:[20.7, 21.2, 14.3, 12.8, 12.3, 12.3],
  },
  {
    id:'junts', siglas:'Junts', nombre:'Junts per Catalunya', color:'#1FA89B',
    lider:'Carles Puigdemont', liderIniciales:'CP',
    liderValoracion:3.4, liderImagen:3.2, liderConocimiento:88,
    intencionVoto:1.6, delta30d:0.0,
    intencionUlt:[1.6, 1.6, 1.7, 1.6, 1.6, 1.6, 1.6, 1.6],
    conocimiento:88, ideologia:+12, centralizacion:-88, amenaza:'CRÍTICO',
    fortalezas:[
      'Llave aritmética del Gobierno Sánchez',
      'Disciplina de voto del 100% en el Congreso',
      'Liderazgo carismático de Puigdemont desde el exilio',
      'Capacidad de bloqueo legislativo demostrada',
      'Eurodiputado en grupo de no inscritos · margen estratégico',
    ],
    debilidades:[
      'Limitado a Cataluña · sin proyección estatal',
      'Pérdida del Govern frente a Illa (PSC)',
      'Tensión interna sobre estrategia: bloqueo total vs negociación',
      'Imagen polarizante en el resto de España',
      'Dependencia de Puigdemont como figura única',
    ],
    oportunidadesNosotros:[
      'Visibilizar la dependencia del Gobierno de un partido prófugo',
      'Aglutinar voto constitucionalista en Cataluña a través de PSC',
      'Capitalizar fatiga del frente independentista',
      'Polarizar contra la amnistía que les beneficia',
    ],
    amenazas:[
      'Capacidad de tumbar legislación clave',
      'Visibilidad en momentos de máxima tensión',
      'Refuerzo nacionalista si el Estado escala el conflicto',
    ],
    mensajes:[
      { titular:'«Cataluña merece la independencia · referéndum»',       recurrencia:82, eficacia:42 },
      { titular:'«Hartos del PSOE · sin financiación, sin apoyos»',     recurrencia:78, eficacia:58 },
      { titular:'«Defensa del catalán y la cultura»',                    recurrencia:62, eficacia:55 },
    ],
    voceros:[
      { nombre:'Carles Puigdemont', rol:'Líder',                     valoracion:3.4, visibilidad:78 },
      { nombre:'Miriam Nogueras',    rol:'Portavoz Congreso',         valoracion:4.2, visibilidad:58 },
      { nombre:'Jordi Turull',       rol:'Sec. general',              valoracion:3.8, visibilidad:42 },
    ],
    vulnerabilidades:[
      { titulo:'Pérdida del Govern',          detalle:'Illa (PSC) presidente · Junts en oposición catalana',           explotabilidad:62 },
      { titulo:'División interna',            detalle:'Sectores duros vs negociadores en pugna',                        explotabilidad:48 },
      { titulo:'Aplicación amnistía bloqueada', detalle:'TC pendiente · Puigdemont sigue prófugo de la justicia',       explotabilidad:55 },
    ],
    coaliciones:[
      { aliado:'PSOE',  tipo:'Pactos puntuales', estabilidad:30 },
      { aliado:'PNV',   tipo:'Pactos puntuales', estabilidad:42 },
    ],
    proximos:[
      { fecha:'12/05/2026', tipo:'Comparecencia', titulo:'Comparecencia Nogueras · presupuestos', ubicacion:'Congreso' },
      { fecha:'17/05/2026', tipo:'Acto',          titulo:'Acto de partido en Girona',              ubicacion:'Girona' },
    ],
    jefeCampania:'Jordi Turull', estrategia:'Josep Rius', comunicacion:'Miriam Nogueras',
    presupuestoEstim:1.8, voluntariosEstim:1.2, redesAlcance:5.0,
    votoSerie:[2.2, 1.7, 2.3, 1.7, 1.6, 1.6],
  },
  {
    id:'erc', siglas:'ERC', nombre:'Esquerra Republicana de Catalunya', color:'#E8A030',
    lider:'Oriol Junqueras', liderIniciales:'OJ',
    liderValoracion:4.1, liderImagen:3.9, liderConocimiento:78,
    intencionVoto:2.0, delta30d:+0.1,
    intencionUlt:[1.9, 1.9, 1.9, 2.0, 2.0, 2.0, 2.0, 2.0],
    conocimiento:78, ideologia:-32, centralizacion:-78, amenaza:'BAJO',
    fortalezas:[
      'Pragmatismo negociador histórico',
      'Cuadros experimentados en gobierno',
      'Integración en Verdes/ALE en Europa',
      'Apoyo investidura formal a Sánchez',
    ],
    debilidades:[
      'Pérdida ante Junts en la batalla independentista',
      'Sin Govern desde 2024',
      'Divisiones internas tras el congreso del pasado octubre',
      'Caída electoral sostenida',
    ],
    oportunidadesNosotros:[
      'Espacio político en disputa con Junts y PSC',
      'Aprovechar fatiga del bloque independentista',
    ],
    amenazas:[
      'Capacidad de pacto con cualquiera',
      'Reactivación de marca si negocia algo significativo',
    ],
    mensajes:[
      { titular:'«Cataluña diversa y republicana»',         recurrencia:75, eficacia:48 },
      { titular:'«Negociación útil con Madrid»',             recurrencia:65, eficacia:52 },
    ],
    voceros:[
      { nombre:'Oriol Junqueras', rol:'Presidente',         valoracion:4.1, visibilidad:62 },
      { nombre:'Gabriel Rufián',  rol:'Portavoz Congreso',  valoracion:4.6, visibilidad:78 },
      { nombre:'Marta Rovira',     rol:'Sec. general',       valoracion:3.8, visibilidad:48 },
    ],
    vulnerabilidades:[
      { titulo:'Pérdida de Junqueras',  detalle:'Imagen desgastada tras la prisión y la división interna', explotabilidad:48 },
      { titulo:'Caída en sondeos',      detalle:'2.0% intención · pérdida de espacio frente a Junts',      explotabilidad:42 },
    ],
    coaliciones:[
      { aliado:'PSOE',     tipo:'Investidura',        estabilidad:55 },
      { aliado:'EH Bildu', tipo:'Pactos puntuales',   estabilidad:62 },
    ],
    proximos:[
      { fecha:'10/05/2026', tipo:'Mitin', titulo:'Acto en Girona · Junqueras',  ubicacion:'Girona' },
    ],
    jefeCampania:'Oriol Junqueras', estrategia:'Marta Rovira', comunicacion:'Gabriel Rufián',
    presupuestoEstim:1.4, voluntariosEstim:1.0, redesAlcance:4.0,
    votoSerie:[2.7, 3.9, 3.6, 3.5, 1.9, 1.9],
  },
  {
    id:'podemos', siglas:'Podemos', nombre:'Podemos', color:'#6C2C5E',
    lider:'Ione Belarra', liderIniciales:'IB',
    liderValoracion:3.2, liderImagen:3.4, liderConocimiento:75,
    intencionVoto:2.0, delta30d:+0.2,
    intencionUlt:[1.6, 1.7, 1.8, 1.8, 1.9, 1.9, 2.0, 2.0],
    conocimiento:75, ideologia:-65, centralizacion:-10, amenaza:'BAJO',
    fortalezas:[
      'Identidad muy clara y mensaje compacto',
      'Movilización en redes con voces visibles',
      'Maquinaria activista mantenida',
      '4 escaños en el Grupo Mixto · capacidad de bloqueo simbólica',
    ],
    debilidades:[
      'Ruptura con Sumar abrió frente fratricida',
      'Pérdida de espacio ante Sumar y BNG',
      'Caída sostenida desde 2019 (20.7% → 1.8%)',
      'Imagen de fragmentación de la izquierda',
    ],
    oportunidadesNosotros:[
      'Atraer voto crítico con coalición Sánchez',
      'Visibilizar fragmentación del bloque progresista',
    ],
    amenazas:[
      'Capacidad de movilización afectiva en redes',
      'Polarización emocional en debates',
    ],
    mensajes:[
      { titular:'«El PSOE traicionó al pueblo trabajador»',         recurrencia:78, eficacia:48 },
      { titular:'«Sin coalición no hay socialismo · solo nosotros»', recurrencia:75, eficacia:42 },
    ],
    voceros:[
      { nombre:'Ione Belarra',         rol:'Sec. general',          valoracion:3.2, visibilidad:62 },
      { nombre:'Lilith Verstrynge',     rol:'Portavoz Congreso',    valoracion:3.5, visibilidad:55 },
      { nombre:'Pablo Fernández',       rol:'Portavoz nacional',    valoracion:3.8, visibilidad:48 },
    ],
    vulnerabilidades:[
      { titulo:'Ruptura con Sumar',   detalle:'Pérdida de espacio y financiación · imagen de división',  explotabilidad:62 },
      { titulo:'Caída electoral 2023',detalle:'Hundimiento al 1.8% en generales · fuera del Gobierno',   explotabilidad:55 },
    ],
    coaliciones:[
      { aliado:'BNG',       tipo:'Pactos puntuales', estabilidad:48 },
      { aliado:'EH Bildu',  tipo:'Pactos puntuales', estabilidad:55 },
    ],
    proximos:[
      { fecha:'11/05/2026', tipo:'Acto', titulo:'Encuentro con activistas vivienda', ubicacion:'Madrid' },
    ],
    jefeCampania:'Ione Belarra', estrategia:'Pablo Fernández', comunicacion:'Lilith Verstrynge',
    presupuestoEstim:1.0, voluntariosEstim:0.9, redesAlcance:4.5,
    votoSerie:[20.7, 21.2, 14.3, 12.8, 1.8, 1.8],
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function AdversariosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // Live data del backend (auto-refresh 60s) — usado para actualizar la
  // intención de voto, delta y escaños de cada adversario en tiempo real.
  const { data: liveData, source: liveSource, updatedAt: liveUpdated, refresh: liveRefresh } =
    useApi<AdversariosResp>('/api/adversarios/profiles', { refreshInterval: 60_000 })

  const [selectedId, setSelectedId] = useState(ADVERSARIOS[0].id)
  const [tab, setTab] = useState<'dafo' | 'mensajes' | 'voceros' | 'vulnerabilidades' | 'coaliciones' | 'agenda'>('dafo')
  const selected = useMemo(() => ADVERSARIOS.find(a => a.id === selectedId)!, [selectedId])

  // Enriquecimiento silencioso desde brain_actor_dossiers (si existe).
  // Fetch al endpoint /api/brain-content/actor/{lider}. Si no hay dossier,
  // brainDossier queda null y la página se renderiza igual que antes.
  const [brainDossier, setBrainDossier] = useState<Record<string, unknown> | null>(null)
  useEffect(() => {
    let cancelled = false
    setBrainDossier(null)
    const subject = selected?.lider || selected?.nombre
    if (!subject) return
    const url = `/api/brain-content/actor/${encodeURIComponent(subject)}`
    fetch(url, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return
        if (j && j.found && j.dossier) {
          setBrainDossier(j.dossier as Record<string, unknown>)
        }
      })
      .catch(() => { /* silencio · sin dossier la UI no cambia */ })
    return () => { cancelled = true }
  }, [selected])

  const brainSummary: string | null = (() => {
    if (!brainDossier) return null
    const exec = brainDossier.executive_summary
    const ol = brainDossier.one_liner
    if (typeof exec === 'string' && exec.length > 0) return exec
    if (typeof ol === 'string' && ol.length > 0) return ol
    return null
  })()
  const brainSections = (brainDossier?.sections as Record<string, unknown> | undefined) || {}
  const brainRisks = (brainDossier?.risks as string[] | undefined) || []

  const totals = useMemo(() => {
    const cri = ADVERSARIOS.filter(a => a.amenaza === 'CRÍTICO').length
    const alt = ADVERSARIOS.filter(a => a.amenaza === 'ALTO').length
    const presupTotal = ADVERSARIOS.reduce((s, a) => s + a.presupuestoEstim, 0)
    const volTotal = ADVERSARIOS.reduce((s, a) => s + a.voluntariosEstim, 0)
    return { total: ADVERSARIOS.length, cri, alt, presupTotal, volTotal }
  }, [])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#7F1D1D 0%,#1A0202 100%)',
          borderRadius:18, padding:'24px 32px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <span>ELECTORAL · INTELLIGENCE SOBRE ADVERSARIOS</span>
              <LiveStatusBadge updatedAt={liveUpdated} source={liveSource} refreshIntervalSec={60} onRefresh={liveRefresh}/>
              {liveData?.profiles && liveData.profiles.length > 0 && (
                <span style={{ fontSize:10, opacity:0.55, fontWeight:500 }}>· {liveData.profiles.length} perfiles vivos</span>
              )}
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              Conoce a tu adversario <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>antes de cada movimiento</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              {totals.total} adversarios bajo seguimiento · DAFO estratégico, vulnerabilidades, mapa de mensajes, voceros, coaliciones y agenda. Inteligencia competitiva para campaña.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            <HeroKPI label="Adversarios" value={String(totals.total)}     accent="#FCA5A5"/>
            <HeroKPI label="Críticos"     value={String(totals.cri)}       accent="#DC2626"/>
            <HeroKPI label="Altos"        value={String(totals.alt)}       accent="#F97316"/>
            <HeroKPI label="∑ Presup."    value={`${totals.presupTotal.toFixed(1)}M€`} accent="#FBBF24"/>
          </div>
        </section>

        {/* ───── Selector de adversarios ───── */}
        <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))', gap:10, marginBottom:18 }}>
          {ADVERSARIOS.map(a => {
            const active = a.id === selectedId
            const tm = THREAT_META[a.amenaza]
            return (
              <button key={a.id} onClick={() => setSelectedId(a.id)} style={{
                textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                background:'#fff', border:`1px solid ${active ? a.color : '#ECECEF'}`,
                borderRadius:14, overflow:'hidden',
                boxShadow: active ? `0 0 0 3px ${a.color}22` : '0 1px 3px rgba(0,0,0,0.04)',
                borderLeft:`4px solid ${a.color}`,
                padding:0, transition:'box-shadow 200ms',
              }}>
                <header style={{ padding:'12px 14px', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:10, alignItems:'center' }}>
                  <div style={{
                    width:42, height:42, borderRadius:10, background:a.color, color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, letterSpacing:'-0.01em',
                  }}>{a.siglas.length <= 4 ? a.siglas : a.siglas.slice(0,4)}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
                      <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'1px 6px', borderRadius:4, background:tm.color, color:'#fff' }}>NIVEL {a.amenaza}</span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.nombre}</div>
                    <div style={{ fontSize:10.5, color:'#6e6e73' }}>{a.lider}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:a.color, lineHeight:1 }}>{a.intencionVoto}<span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>%</span></div>
                    <div style={{ fontSize:9, fontWeight:700, color: a.delta30d > 0 ? '#16A34A' : a.delta30d < 0 ? '#DC2626' : '#6e6e73', marginTop:2 }}>
                      {a.delta30d > 0 ? '▲' : a.delta30d < 0 ? '▼' : '→'} {Math.abs(a.delta30d).toFixed(1)}
                    </div>
                  </div>
                </header>
                <div style={{ padding:'4px 14px 12px' }}>
                  <Sparkline data={a.intencionUlt} color={a.color} h={28}/>
                </div>
              </button>
            )
          })}
        </section>

        {/* ───── Cabecera del adversario seleccionado ───── */}
        <section style={{
          background:'#fff', border:`2px solid ${selected.color}40`, borderRadius:14,
          padding:'24px 28px', boxShadow:`0 4px 16px ${selected.color}1a`, marginBottom:14,
        }}>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:18, alignItems:'center', marginBottom:18 }}>
            <div style={{
              width:64, height:64, borderRadius:16, background:selected.color, color:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, letterSpacing:'-0.02em',
              boxShadow:`0 4px 12px ${selected.color}50`,
            }}>{selected.liderIniciales}</div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
                <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:4, background:THREAT_META[selected.amenaza].color, color:'#fff' }}>NIVEL DE AMENAZA: {selected.amenaza}</span>
                <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em' }}>· {selected.siglas.toUpperCase()}</span>
              </div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, letterSpacing:'-0.018em', margin:'0 0 3px', color:'#1d1d1f' }}>{selected.nombre}</h2>
              <p style={{ margin:0, fontSize:12, color:'#3a3a3d' }}>
                Líder: <strong style={{ color:'#1d1d1f' }}>{selected.lider}</strong> · valoración <strong>{selected.liderValoracion}/10</strong> · imagen {selected.liderImagen}/10 · conocimiento {selected.liderConocimiento}%
              </p>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2 }}>Intención de voto</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:700, color:selected.color, letterSpacing:'-0.024em', lineHeight:1 }}>{selected.intencionVoto}<span style={{ fontSize:18, color:'#6e6e73', fontWeight:600 }}>%</span></div>
              <div style={{ fontSize:11, fontWeight:700, color: selected.delta30d > 0 ? '#16A34A' : selected.delta30d < 0 ? '#DC2626' : '#6e6e73', marginTop:2 }}>
                {selected.delta30d > 0 ? '▲' : selected.delta30d < 0 ? '▼' : '→'} {Math.abs(selected.delta30d).toFixed(1)} · 30 días
              </div>
            </div>
          </div>

          {/* Síntesis biográfica desde brain (solo si hay dossier) */}
          {brainSummary && (
            <p style={{
              margin:'0 0 12px', fontSize:13, lineHeight:1.55,
              color:'#3a3a3d', fontStyle:'italic',
              borderLeft:`3px solid ${selected.color}40`,
              paddingLeft:12,
            }}>
              {brainSummary}
            </p>
          )}

          {/* Indicadores clave */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, marginBottom:14 }}>
            <SKpi label="Conocimiento"    value={`${selected.conocimiento}%`}              color="#5B21B6"/>
            <SKpi label="Eje izq-dcha"    value={selected.ideologia > 0 ? `+${selected.ideologia}` : `${selected.ideologia}`} sub={selected.ideologia < 0 ? 'izquierda' : 'derecha'} color={selected.color}/>
            <SKpi label="Eje territorial" value={selected.centralizacion > 0 ? `+${selected.centralizacion}` : `${selected.centralizacion}`} sub={selected.centralizacion < 0 ? 'descentr.' : 'central.'} color="#0F766E"/>
            <SKpi label="Presup. estim."  value={`${selected.presupuestoEstim}M€`}         color="#16A34A"/>
            <SKpi label="Voluntarios"     value={`${selected.voluntariosEstim}K`}          color="#0EA5E9"/>
            <SKpi label="Alcance redes"   value={`${selected.redesAlcance}M`}              color="#DC2626"/>
          </div>

          {/* Bloque enriquecido por brain · solo si hay secciones */}
          {(Object.keys(brainSections).length > 0 || brainRisks.length > 0) && (
            <div style={{
              background:'#fafafa', border:'1px solid #ECECEF', borderRadius:10,
              padding:'12px 14px', marginBottom:14, fontSize:12.5, lineHeight:1.55,
              color:'#3a3a3d',
            }}>
              {typeof brainSections['estilo_politico'] === 'string' && (brainSections['estilo_politico'] as string) && (
                <div style={{ marginBottom:6 }}>
                  <strong style={{ color:'#1d1d1f' }}>Estilo:</strong> {brainSections['estilo_politico'] as string}
                </div>
              )}
              {typeof brainSections['momentum'] === 'string' && (brainSections['momentum'] as string) && (
                <div style={{ marginBottom:6 }}>
                  <strong style={{ color:'#1d1d1f' }}>Momentum:</strong> {brainSections['momentum'] as string}
                </div>
              )}
              {typeof brainSections['predicted_next_move'] === 'string' && (brainSections['predicted_next_move'] as string) && (
                <div style={{ marginBottom:6 }}>
                  <strong style={{ color:'#1d1d1f' }}>Próximo movimiento esperado:</strong> {brainSections['predicted_next_move'] as string}
                </div>
              )}
              {brainRisks.length > 0 && (
                <div style={{ marginTop:6 }}>
                  <strong style={{ color:'#1d1d1f' }}>Riesgos identificados:</strong>
                  <ul style={{ margin:'4px 0 0 18px', padding:0 }}>
                    {brainRisks.slice(0, 4).map((r, i) => (<li key={i}>{r}</li>))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Equipo */}
          <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'10px 14px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, fontSize:11.5 }}>
            <div><strong style={{ color:'#6e6e73', fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:3 }}>Jefe de campaña</strong><span style={{ color:'#1d1d1f', fontWeight:600 }}>{selected.jefeCampania}</span></div>
            <div><strong style={{ color:'#6e6e73', fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:3 }}>Estrategia</strong><span style={{ color:'#1d1d1f', fontWeight:600 }}>{selected.estrategia}</span></div>
            <div><strong style={{ color:'#6e6e73', fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:3 }}>Comunicación</strong><span style={{ color:'#1d1d1f', fontWeight:600 }}>{selected.comunicacion}</span></div>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14, flexWrap:'wrap' }}>
          {([
            { k:'dafo',             label:'Análisis DAFO',          count: 4 },
            { k:'mensajes',          label:'Mapa de mensajes',       count: selected.mensajes.length },
            { k:'voceros',           label:'Voceros y portavoces',   count: selected.voceros.length },
            { k:'vulnerabilidades', label:'Vulnerabilidades',        count: selected.vulnerabilidades.length },
            { k:'coaliciones',       label:'Coaliciones y aliados',  count: selected.coaliciones.length },
            { k:'agenda',            label:'Próximos movimientos',   count: selected.proximos.length },
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
                {t.label} <span style={{ marginLeft:5, color: active ? selected.color : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · DAFO ───── */}
        {tab === 'dafo' && (
          <section style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <DafoBlock titulo="Fortalezas (de su lado)"        items={selected.fortalezas}            color="#16A34A" sym="+"/>
            <DafoBlock titulo="Debilidades (de su lado)"        items={selected.debilidades}           color="#DC2626" sym="−"/>
            <DafoBlock titulo="Oportunidades (para nosotros)"  items={selected.oportunidadesNosotros} color="#5B21B6" sym="↗"/>
            <DafoBlock titulo="Amenazas (que plantean)"        items={selected.amenazas}              color="#F97316" sym="!"/>
          </section>
        )}

        {/* ───── TAB · Mensajes ───── */}
        {tab === 'mensajes' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Mapa de mensajes · narrativa principal</h3>
            <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>Recurrencia (intensidad de uso) y eficacia (impacto en intención de voto) estimadas</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {selected.mensajes.map((m, i) => (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'1fr 200px 200px', gap:14, alignItems:'center',
                  padding:'12px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                }}>
                  <div style={{ fontSize:13, color:'#1d1d1f', fontWeight:600, fontStyle:'italic', lineHeight:1.4 }}>{m.titular}</div>
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3, fontSize:9.5, color:'#6e6e73', fontWeight:700 }}>
                      <span style={{ letterSpacing:'0.06em', textTransform:'uppercase' }}>Recurrencia</span>
                      <span style={{ fontFamily:'var(--font-display)', color:selected.color }}>{m.recurrencia}</span>
                    </div>
                    <div style={{ height:7, background:'#fff', borderRadius:3, overflow:'hidden', border:'1px solid #ECECEF' }}>
                      <div style={{ width:`${m.recurrencia}%`, height:'100%', background:selected.color, borderRadius:3 }}/>
                    </div>
                  </div>
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3, fontSize:9.5, color:'#6e6e73', fontWeight:700 }}>
                      <span style={{ letterSpacing:'0.06em', textTransform:'uppercase' }}>Eficacia</span>
                      <span style={{ fontFamily:'var(--font-display)', color: m.eficacia >= 60 ? '#DC2626' : m.eficacia >= 40 ? '#F97316' : '#16A34A' }}>{m.eficacia}</span>
                    </div>
                    <div style={{ height:7, background:'#fff', borderRadius:3, overflow:'hidden', border:'1px solid #ECECEF' }}>
                      <div style={{ width:`${m.eficacia}%`, height:'100%', background: m.eficacia >= 60 ? '#DC2626' : m.eficacia >= 40 ? '#F97316' : '#16A34A', borderRadius:3 }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── TAB · Voceros ───── */}
        {tab === 'voceros' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                  {['#','Voz','Rol','Valoración (/10)','Visibilidad mediática'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...selected.voceros].sort((a,b) => b.visibilidad - a.visibilidad).map((v, i) => (
                  <tr key={v.nombre} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding:'10px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{i+1}</td>
                    <td style={{ padding:'10px 12px', fontWeight:600, color:'#1d1d1f' }}>{v.nombre}</td>
                    <td style={{ padding:'10px 12px', color:'#3a3a3d' }}>{v.rol}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, height:7, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:80 }}>
                          <div style={{ width:`${(v.valoracion / 10) * 100}%`, height:'100%', background: v.valoracion >= 5 ? '#16A34A' : v.valoracion >= 4 ? '#F97316' : '#DC2626', borderRadius:3 }}/>
                        </div>
                        <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:'#1d1d1f', minWidth:24, textAlign:'right' }}>{v.valoracion}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, height:7, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:80 }}>
                          <div style={{ width:`${v.visibilidad}%`, height:'100%', background:selected.color, borderRadius:3 }}/>
                        </div>
                        <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:selected.color, minWidth:24, textAlign:'right' }}>{v.visibilidad}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ───── TAB · Vulnerabilidades ───── */}
        {tab === 'vulnerabilidades' && (
          <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))', gap:10 }}>
            {[...selected.vulnerabilidades].sort((a,b) => b.explotabilidad - a.explotabilidad).map((v, i) => {
              const c = v.explotabilidad >= 75 ? '#DC2626' : v.explotabilidad >= 50 ? '#F97316' : '#EAB308'
              return (
                <article key={i} style={{
                  background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
                  padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`3px solid ${c}`,
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                      padding:'2px 7px', borderRadius:4,
                      background:c, color:'#fff',
                    }}>{v.explotabilidad >= 75 ? 'CRÍTICA' : v.explotabilidad >= 50 ? 'ALTA' : 'MEDIA'}</span>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:c }}>{v.explotabilidad}<span style={{ fontSize:10, color:'#86868b' }}>/100</span></span>
                  </div>
                  <h4 style={{ margin:'0 0 5px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color:'#1d1d1f', letterSpacing:'-0.012em' }}>{v.titulo}</h4>
                  <p style={{ margin:'0 0 8px', fontSize:11.5, color:'#3a3a3d', lineHeight:1.45 }}>{v.detalle}</p>
                  <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:`${v.explotabilidad}%`, height:'100%', background:c, borderRadius:3 }}/>
                  </div>
                  <div style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginTop:4 }}>Explotabilidad</div>
                </article>
              )
            })}
          </section>
        )}

        {/* ───── TAB · Coaliciones ───── */}
        {tab === 'coaliciones' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Coaliciones y aliados</h3>
            <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>Estabilidad estimada de cada relación · 0 (frágil) a 100 (sólida)</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {selected.coaliciones.map((c, i) => {
                const estCol = c.estabilidad >= 70 ? '#16A34A' : c.estabilidad >= 50 ? '#F97316' : '#DC2626'
                const tipoCol = c.tipo === 'Coalición' ? '#16A34A' : c.tipo === 'Investidura' ? '#5B21B6' : c.tipo === 'Apoyo' ? '#0EA5E9' : '#F97316'
                return (
                  <div key={i} style={{
                    display:'grid', gridTemplateColumns:'160px 130px 1fr 80px', gap:14, alignItems:'center',
                    padding:'10px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                  }}>
                    <strong style={{ fontSize:13, color:'#1d1d1f' }}>{c.aliado}</strong>
                    <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.06em', textAlign:'center',
                      padding:'3px 8px', borderRadius:999,
                      background:`${tipoCol}15`, color:tipoCol, border:`1px solid ${tipoCol}40`,
                    }}>{c.tipo.toUpperCase()}</span>
                    <div style={{ height:8, background:'#fff', borderRadius:4, overflow:'hidden', border:'1px solid #ECECEF' }}>
                      <div style={{ width:`${c.estabilidad}%`, height:'100%', background:estCol, borderRadius:4, transition:'width 320ms' }}/>
                    </div>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:estCol, textAlign:'right' }}>{c.estabilidad}/100</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ───── TAB · Próximos movimientos ───── */}
        {tab === 'agenda' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin:'0 0 14px', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em' }}>Próximos movimientos detectados</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {selected.proximos.map((m, i) => (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'70px 1fr auto', gap:14, alignItems:'center',
                  padding:'12px 14px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                  borderLeft:`3px solid ${selected.color}`,
                }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:'#1d1d1f' }}>{m.fecha.slice(0,5)}</div>
                  </div>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.08em', padding:'1px 6px', borderRadius:4, background:selected.color, color:'#fff' }}>{m.tipo.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f' }}>{m.titulo}</div>
                    <div style={{ fontSize:10.5, color:'#6e6e73', marginTop:1 }}>{m.ubicacion}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Inteligencia de Adversarios · Politeia Analítica · {new Date().getFullYear()}
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

function SKpi({ label, value, sub, color }: { label:string, value:string, sub?:string, color:string }) {
  return (
    <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
      <div style={{ fontSize:9, fontWeight:800, color:'#6e6e73', letterSpacing:'0.08em', textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color, letterSpacing:'-0.018em', marginTop:3, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:9, color:'#86868b', fontWeight:600, marginTop:2 }}>{sub}</div>}
    </div>
  )
}

function DafoBlock({ titulo, items, color, sym }: { titulo:string, items:string[], color:string, sym:string }) {
  return (
    <div style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
      padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
      borderTop:`4px solid ${color}`,
    }}>
      <h3 style={{ margin:'0 0 12px', fontFamily:'var(--font-display)', fontSize:13.5, fontWeight:600, letterSpacing:'-0.012em', color }}>{titulo}</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
            <span style={{
              flexShrink:0, width:22, height:22, borderRadius:'50%',
              background:`${color}15`, color, border:`1px solid ${color}40`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:800,
            }}>{sym}</span>
            <p style={{ margin:0, fontSize:12, color:'#3a3a3d', lineHeight:1.45, paddingTop:3 }}>{it}</p>
          </div>
        ))}
      </div>
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
