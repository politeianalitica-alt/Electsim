/**
 * FIXTURE — Gobierno de coalición · XV Legislatura.
 *
 * Datos curados que sirven como fallback cuando el backend
 * `/api/legislative/government-composition` aún no tiene los datasets de
 * composición del Gobierno. El route handler
 * `app/api/gobierno-coalicion/route.ts` los devuelve con
 * `_meta.source='mock'`.
 *
 * Cuando el módulo institucional esté operativo en el backend (tablas
 * `gov_ministers`, `parliamentary_supports`, `gov_milestones`), este fixture
 * pasará a ser referencia y se eliminará.
 */

export type Partido = 'PSOE' | 'Sumar'

export interface Ministro {
  nombre: string
  cartera: string
  partido: Partido
  vicepresidencia?: 1 | 2 | 3
  desde: string         // mm/yyyy
  web: string           // URL oficial
  presupuesto: number   // M€ presupuesto inicial 2025
  funcionarios: number  // K personal del Departamento (incluye organismos)
  secretarios: string[] // Secretarías de Estado y Subsecretarías clave
  prioridades: string[] // 2-3 prioridades / iniciativas top
}

export interface Apoyo {
  partido: string
  color: string
  escanos: number
  rol: 'gobierno' | 'investidura' | 'situacional' | 'oposicion'
  posicion: string
  riesgo: 'bajo' | 'medio' | 'alto'
}

export interface Hito {
  fecha: string
  titulo: string
  detalle: string
  tipo: 'Ley' | 'RDL' | 'Acuerdo' | 'Crisis' | 'Cumbre'
  resultado: 'aprobado' | 'pendiente' | 'rechazado'
}

export const PRESIDENTE: Ministro = {
  nombre:'Pedro Sánchez Pérez-Castejón', cartera:'Presidencia del Gobierno', partido:'PSOE', desde:'06/2018',
  web:'https://www.lamoncloa.gob.es/presidente/Paginas/index.aspx',
  presupuesto: 0, funcionarios: 1.2,
  secretarios:['Diego Rubio (Director Gabinete)','Alma Ezcurra · Asuntos Constitucionales','Ana Mar Fernández · Política Económica'],
  prioridades:['Mantener la legislatura','Negociación PGE 2026','Agenda regeneración democrática'],
}

export const VICEPRESIDENCIAS: Ministro[] = [
  { nombre:'María Jesús Montero', cartera:'Hacienda', partido:'PSOE', vicepresidencia:1, desde:'12/2023',
    web:'https://www.hacienda.gob.es/',
    presupuesto: 22100, funcionarios: 16.0,
    secretarios:['Jesús Gascón · Hacienda','Carlos San Basilio · Presupuestos y Gastos'],
    prioridades:['Aprobar PGE 2026','Reforma fiscal pendiente','Senda fiscal con CCAA'],
  },
  { nombre:'Yolanda Díaz', cartera:'Trabajo y Economía Social', partido:'Sumar', vicepresidencia:2, desde:'01/2020',
    web:'https://www.trabajo.gob.es/',
    presupuesto: 36500, funcionarios: 18.5,
    secretarios:['Joaquín Pérez Rey · Trabajo','Borja Suárez · Seguridad Social (compartida)'],
    prioridades:['Reducción jornada 37,5h','Estatuto del Becario','SMI 2026'],
  },
  { nombre:'Sara Aagesen', cartera:'Transición Ecológica y Reto Demográfico', partido:'PSOE', vicepresidencia:3, desde:'11/2024',
    web:'https://www.miteco.gob.es/',
    presupuesto: 6450, funcionarios: 14.0,
    secretarios:['Joan Groizard · Energía','Carmen Crespo · Medio Ambiente'],
    prioridades:['Plan Nacional Energía y Clima','Cierre nucleares calendarizado','Adaptación a la sequía'],
  },
]

export const MINISTROS: Ministro[] = [
  { nombre:'Carlos Cuerpo', cartera:'Economía, Comercio y Empresa', partido:'PSOE', desde:'12/2023',
    web:'https://www.mineco.gob.es/',
    presupuesto: 6700, funcionarios: 8.0,
    secretarios:['Gonzalo García Andrés · Economía','Amparo López · Comercio','Jaime Pérez Renovales · Política Económica'],
    prioridades:['Captación de inversión extranjera','Plan de pymes','Fondos NextGen'],
  },
  { nombre:'José Manuel Albares', cartera:'Asuntos Exteriores · UE · Cooperación', partido:'PSOE', desde:'07/2021',
    web:'https://www.exteriores.gob.es/',
    presupuesto: 2150, funcionarios: 7.0,
    secretarios:['Fernando Sampedro · UE','Eva Granados · Iberoamérica','Diego Martínez Belío · Coop. Internacional'],
    prioridades:['Reconocimiento Estado Palestino','Presidencia rotatoria UE 2025','Sahel y Magreb'],
  },
  { nombre:'Félix Bolaños', cartera:'Presidencia · Justicia · Relaciones con las Cortes', partido:'PSOE', desde:'07/2021',
    web:'https://www.mjusticia.gob.es/',
    presupuesto: 2300, funcionarios: 27.0,
    secretarios:['Manuel Olmedo · Justicia','Judith Arnal · Relaciones con las Cortes','Aurora Moreno · Memoria Democrática'],
    prioridades:['Reforma del CGPJ ya aprobada','Ley amnistía aplicación','Renovación TC y Defensor del Pueblo'],
  },
  { nombre:'Margarita Robles', cartera:'Defensa', partido:'PSOE', desde:'06/2018',
    web:'https://www.defensa.gob.es/',
    presupuesto: 13500, funcionarios: 141.0,
    secretarios:['Amparo Valcarce · SE Defensa','Almte. Antonio Piñeiro · JEMAD'],
    prioridades:['Cumplir 2% PIB OTAN en 2029','Renovación material','Misiones exteriores (Líbano, Sahel)'],
  },
  { nombre:'F. Grande-Marlaska', cartera:'Interior', partido:'PSOE', desde:'06/2018',
    web:'https://www.interior.gob.es/',
    presupuesto: 12000, funcionarios: 145.0,
    secretarios:['Rafael Pérez · Seguridad','Aina Calvo · Migraciones','Manuel Vázquez · Plan Nacional Drogas'],
    prioridades:['Frontera sur (Canarias)','Lucha antiterrorista','Plan Galicia narcotráfico'],
  },
  { nombre:'Óscar Puente', cartera:'Transportes y Movilidad Sostenible', partido:'PSOE', desde:'11/2023',
    web:'https://www.transportes.gob.es/',
    presupuesto: 13000, funcionarios: 18.0,
    secretarios:['José Antonio Santano · SE Transportes','Pedro Saura · Adif (Pdte.)'],
    prioridades:['Mejora calidad servicio Renfe','Corredor Mediterráneo','Inversión carreteras'],
  },
  { nombre:'Pilar Alegría', cartera:'Educación · FP · Deportes · Portavoz', partido:'PSOE', desde:'07/2021',
    web:'https://www.educacionyfp.gob.es/',
    presupuesto: 6450, funcionarios: 11.0,
    secretarios:['María del Mar Sánchez · Educación y FP','José Manuel Franco · CSD'],
    prioridades:['Pacto educación','Refuerzo FP dual','Igualdad de oportunidades'],
  },
  { nombre:'Mónica García', cartera:'Sanidad', partido:'Sumar', desde:'11/2023',
    web:'https://www.sanidad.gob.es/',
    presupuesto: 1320, funcionarios: 4.5,
    secretarios:['Javier Padilla · SE Sanidad','Silvia Calzón · Direc. Salud Pública'],
    prioridades:['Ley antitabaco','Refuerzo Atención Primaria','Plan oncológico'],
  },
  { nombre:'Pablo Bustinduy', cartera:'Derechos Sociales · Consumo · Agenda 2030', partido:'Sumar', desde:'11/2023',
    web:'https://www.derechossocialesyagenda2030.gob.es/',
    presupuesto: 7560, funcionarios: 5.0,
    secretarios:['Rosa Martínez · SE Consumo','Juan Carlos Lozano · Agenda 2030'],
    prioridades:['Ley de Servicios Sociales','Limitar publicidad apuestas','Agenda 2030'],
  },
  { nombre:'Sira Rego', cartera:'Juventud e Infancia', partido:'Sumar', desde:'11/2023',
    web:'https://www.juventudeinfancia.gob.es/',
    presupuesto: 240, funcionarios: 0.8,
    secretarios:['Cristina Ribes · DG Infancia','Margarita Guerrero · DG Juventud'],
    prioridades:['Estrategia juventud','Lucha violencia infancia','Acceso a la vivienda joven'],
  },
  { nombre:'Ernest Urtasun', cartera:'Cultura', partido:'Sumar', desde:'11/2023',
    web:'https://www.cultura.gob.es/',
    presupuesto: 1450, funcionarios: 6.5,
    secretarios:['Jordi Martí · SE Cultura','Manuel Borja-Villel (asesor)'],
    prioridades:['Estatuto del Artista','Lucha precariedad sectorial','Devolución bienes coloniales'],
  },
  { nombre:'Diana Morant', cartera:'Ciencia · Innovación · Universidades', partido:'PSOE', desde:'07/2021',
    web:'https://www.ciencia.gob.es/',
    presupuesto: 4500, funcionarios: 9.0,
    secretarios:['Juan Cruz Cigudosa · SE Ciencia','Mª Antonia Peña · Universidades'],
    prioridades:['Ley Ciencia y Tecnología','Becas a la investigación','Captación talento'],
  },
  { nombre:'Jordi Hereu', cartera:'Industria y Turismo', partido:'PSOE', desde:'11/2023',
    web:'https://www.mincotur.gob.es/',
    presupuesto: 2700, funcionarios: 8.5,
    secretarios:['Rebeca Torró · SE Industria','Rosario Sánchez · SE Turismo'],
    prioridades:['Reindustrialización (PERTE)','Sostenibilidad turística','SEAT-Volkswagen baterías'],
  },
  { nombre:'Luis Planas', cartera:'Agricultura · Pesca · Alimentación', partido:'PSOE', desde:'06/2018',
    web:'https://www.mapa.gob.es/',
    presupuesto: 8550, funcionarios: 11.0,
    secretarios:['Begoña García · SE Agricultura','Isabel Bombal · DG Producción'],
    prioridades:['Renegociación PAC 2027','Apoyo sequía y aranceles','Cadena alimentaria'],
  },
  { nombre:'Isabel Rodríguez', cartera:'Vivienda y Agenda Urbana', partido:'PSOE', desde:'11/2023',
    web:'https://www.mivau.gob.es/',
    presupuesto: 1800, funcionarios: 2.5,
    secretarios:['David Lucas · SE Vivienda','Iñaki Carnicero · DG Agenda Urbana'],
    prioridades:['Plan estatal de vivienda','Zonas tensionadas','SEPES vivienda asequible'],
  },
  { nombre:'Elma Saiz', cartera:'Inclusión · Seguridad Social · Migraciones', partido:'PSOE', desde:'11/2023',
    web:'https://www.inclusion.gob.es/',
    presupuesto: 230400, funcionarios: 38.0,
    secretarios:['Borja Suárez · SE Seguridad Social','Pilar Cancela · SE Migraciones','Mercedes Martínez · SE Inclusión'],
    prioridades:['Equilibrio Seguridad Social','Reparto menores no acompañados','Subida pensiones IPC'],
  },
  { nombre:'Ana Redondo', cartera:'Igualdad', partido:'PSOE', desde:'11/2023',
    web:'https://www.igualdad.gob.es/',
    presupuesto: 600, funcionarios: 0.8,
    secretarios:['Aina Calvo · SE Igualdad','Carmen Martínez Perza · Inst. Mujeres'],
    prioridades:['Refuerzo VioGén','Ley trata seres humanos','Brecha salarial'],
  },
  { nombre:'Óscar López', cartera:'Transformación Digital y Función Pública', partido:'PSOE', desde:'11/2024',
    web:'https://www.transformaciondigital.gob.es/',
    presupuesto: 4350, funcionarios: 25.0,
    secretarios:['Antonio Hernando · SE Telecomunicaciones','Clara Mapelli · SE Función Pública','Mayte Ledo · SE Digital. e IA'],
    prioridades:['Estrategia Nacional de IA','Modernización Administración','Despliegue 5G/6G'],
  },
  { nombre:'Ángel Víctor Torres', cartera:'Política Territorial y Memoria Democrática', partido:'PSOE', desde:'11/2023',
    web:'https://www.mpt.gob.es/',
    presupuesto: 480, funcionarios: 1.5,
    secretarios:['Arcadi España · SE Política Territorial','Fernando Martínez · SE Memoria Democrática'],
    prioridades:['Conferencia Sectorial','Financiación autonómica','Aplicación Ley Memoria'],
  },
]

export const APOYOS: Apoyo[] = [
  { partido:'PSOE',     color:'#E1322D', escanos:121, rol:'gobierno',     posicion:'Partido del presidente del Gobierno', riesgo:'bajo' },
  { partido:'Sumar',    color:'#D43F8D', escanos: 31, rol:'gobierno',     posicion:'Socio de coalición',                   riesgo:'medio' },
  { partido:'ERC',      color:'#E8A030', escanos:  7, rol:'investidura',  posicion:'Apoyo investidura · ley a ley',        riesgo:'medio' },
  { partido:'EH Bildu', color:'#3F7A3A', escanos:  6, rol:'investidura',  posicion:'Apoyo investidura · ley a ley',        riesgo:'medio' },
  { partido:'PNV',      color:'#7DB94B', escanos:  5, rol:'investidura',  posicion:'Apoyo investidura · transferencia ferroviaria pendiente', riesgo:'alto' },
  { partido:'BNG',      color:'#5BB3D9', escanos:  1, rol:'investidura',  posicion:'Apoyo investidura',                    riesgo:'bajo' },
  { partido:'CC',       color:'#F2C43A', escanos:  1, rol:'situacional',  posicion:'Acuerdo presupuestos 2026',             riesgo:'medio' },
  { partido:'Junts',    color:'#1FA89B', escanos:  7, rol:'situacional',  posicion:'Apoyo investidura · retira apoyo legislatura', riesgo:'alto' },
  { partido:'PP',       color:'#1F4E8C', escanos:137, rol:'oposicion',    posicion:'Líder de la oposición',                riesgo:'alto' },
  { partido:'VOX',      color:'#5BA02E', escanos: 33, rol:'oposicion',    posicion:'Oposición',                            riesgo:'alto' },
  { partido:'UPN',      color:'#0E7D8C', escanos:  1, rol:'oposicion',    posicion:'Oposición',                            riesgo:'medio' },
]

export const HITOS: Hito[] = [
  { fecha:'16/11/2023', titulo:'Investidura de Pedro Sánchez',          detalle:'179 SÍ / 171 NO · pacto con Junts y resto del bloque',          tipo:'Acuerdo',  resultado:'aprobado' },
  { fecha:'30/05/2024', titulo:'Ley de Amnistía',                        detalle:'BOE-A-2024-11008 · convalidación parcial por TC pendiente',     tipo:'Ley',      resultado:'aprobado' },
  { fecha:'26/07/2024', titulo:'Reforma del CGPJ',                       detalle:'Renovación tras 5 años de bloqueo · pacto PP-PSOE',             tipo:'Acuerdo',  resultado:'aprobado' },
  { fecha:'07/11/2024', titulo:'Crisis post-DANA en Valencia',           detalle:'+220 fallecidos · gestión Mazón cuestionada · ayudas RDL',     tipo:'Crisis',   resultado:'aprobado' },
  { fecha:'20/11/2024', titulo:'Reorganización ministerial',             detalle:'Aagesen sustituye a Ribera · Óscar López a Función Pública',   tipo:'Acuerdo',  resultado:'aprobado' },
  { fecha:'18/12/2024', titulo:'Ley antitabaco · proyecto en marcha',    detalle:'Limita fumar terrazas y aumenta espacios libres de humo',       tipo:'Ley',      resultado:'pendiente' },
  { fecha:'31/01/2025', titulo:'Decreto Ómnibus rechazado',              detalle:'Junts retira apoyo · Gobierno repesca paquete por separado',    tipo:'RDL',      resultado:'rechazado' },
  { fecha:'22/04/2025', titulo:'Reducción jornada 37,5h',                detalle:'Trabajo aprueba en CMin · pendiente trámite Congreso',          tipo:'Ley',      resultado:'pendiente' },
  { fecha:'06/05/2026', titulo:'Negociación PGE 2026 con Junts',         detalle:'Reunión bilateral fiscal antes del 15 de mayo · clave',         tipo:'Acuerdo',  resultado:'pendiente' },
  { fecha:'09/05/2026', titulo:'Cumbre informal UE Día de Europa',       detalle:'España presidencia rotatoria 2025 · Estrasburgo',               tipo:'Cumbre',   resultado:'pendiente' },
]
