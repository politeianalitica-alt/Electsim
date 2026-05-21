/**
 * FIXTURE — Datos macroeconómicos · 2026.
 *
 * Datos curados que sirven como fallback cuando el backend
 * `/api/macro/kpis` o `/api/macro/indicators` no están operativos. El route
 * handler `app/api/macro/dataset/route.ts` los devuelve con
 * `_meta.source='mock'`.
 *
 * Cuando los endpoints de Eurostat / INE / BdE estén en producción, este
 * fixture pasará a ser referencia y se eliminará.
 */

export type Dir = 'up' | 'down' | 'flat'

export interface Indic {
  id: string
  l: string
  v: string
  unidad: string
  delta: string
  dir: Dir
  good: 'up' | 'down' // qué dirección es buena
  c: string
  serie: number[]        // 12 puntos · evolución 12 meses
  fuente: string
  fecha: string
  comentario: string
}

export interface ComparativaRow {
  pais: string
  pib: number
  paro: number
  ipc: number
  deuda: number
  deficit: number
  c: string
  flag: string
}

export interface IpcComp {
  cat: string
  val: number
  peso: number
}

export interface ViviendaItem {
  l: string
  v: string
  sub: string
  c: string
  dir: 'up' | 'down'
}

export interface MercadoItem {
  l: string
  v: string
  delta: string
  color: string
  serie: number[]
}

export interface SalarioItem {
  l: string
  v: string
  sub: string
  c: string
}

export interface CalendarioItem {
  fecha: string
  org: string
  publi: string
  impacto: string
  color: string
}

export interface SectorItem {
  sector: string
  pct: number
  color: string
}

export interface VoterSens {
  euribor: number
  inflacion: number
  desempleo: number
  impuestos: number
  vivienda: number
}

export interface VoterProfile {
  nombre: string
  renta: number
  alquiler: string
  hipoteca: string
  ahorro: number
  sens: VoterSens
  c: string
}

export interface HistCycle {
  elec: string
  paro: number
  ipc: number
  pib: number
  gobernante: string
  ganador: string
  escanos: number
  leccion: string
}

export interface ImpactoRow {
  var: string
  psoe: number
  pp: number
  vox: number
  sumar: number
  c: string
}

export const KPIS: Indic[] = [
  { id:'pib',     l:'PIB Q1 2026 (interanual)', v:'+2.7%',  unidad:'tasa interanual',     delta:'+0.3 pp',  dir:'up',   good:'up',   c:'#16A34A',
    serie:[2.0,2.1,2.2,2.2,2.3,2.4,2.5,2.6,2.6,2.7,2.7,2.7], fuente:'INE · CNT',  fecha:'29 abr',
    comentario:'Mejor de lo esperado · revisión al alza del 0.3 pp · sigue por encima de la media UE.' },
  { id:'paro',    l:'Paro EPA Q1',              v:'11.4%',  unidad:'tasa de paro',         delta:'−0.4 pp',  dir:'down', good:'down', c:'#16A34A',
    serie:[12.0,11.9,11.8,11.7,11.7,11.6,11.5,11.5,11.4,11.4,11.4,11.4], fuente:'INE · EPA', fecha:'25 abr',
    comentario:'En mínimos desde 2008 · paro juvenil aún en 24% · nuevo mínimo previsto en T2.' },
  { id:'ipc',     l:'IPC general',              v:'2.9%',   unidad:'tasa interanual',     delta:'−0.2 pp',  dir:'down', good:'down', c:'#16A34A',
    serie:[3.5,3.4,3.3,3.2,3.1,3.1,3.0,3.0,2.9,2.9,2.9,2.9], fuente:'INE',          fecha:'15 abr',
    comentario:'Subyacente 2.7% · alimentación se modera · vivienda y alquileres siguen tensionados.' },
  { id:'prima',   l:'Prima de riesgo',          v:'102 pb', unidad:'spread Bund 10Y',     delta:'+10 pb',   dir:'up',   good:'down', c:'#DC2626',
    serie:[82,85,88,92,95,98,94,90,93,96,98,102], fuente:'Bloomberg', fecha:'06 may',
    comentario:'Tres días seguidos > 100 pb · ruido político y déficit pesan · BdE alerta.' },
  { id:'euribor', l:'Euríbor 12M',              v:'2.84%',  unidad:'referencia hipot.',   delta:'−0.11 pp', dir:'down', good:'down', c:'#16A34A',
    serie:[2.95,2.92,2.90,2.88,2.87,2.86,2.86,2.85,2.85,2.84,2.84,2.84], fuente:'EBF',         fecha:'05 may',
    comentario:'Bajada continua · alivio para 4.2M de hipotecas variables · ahorro medio 80€/mes.' },
  { id:'deuda',   l:'Deuda pública / PIB',      v:'107.4%', unidad:'fin Q4 2025',         delta:'−0.7 pp',  dir:'down', good:'down', c:'#F97316',
    serie:[108.0,108.1,108.2,108.0,107.8,107.6,107.5,107.5,107.4,107.4,107.4,107.4], fuente:'BdE',         fecha:'30 abr',
    comentario:'Trayectoria descendente desde el pico 2020 · UE pide nueva senda fiscal.' },
  { id:'tipos',   l:'Tipos BCE (depo)',         v:'2.00%',  unidad:'facilidad depósito',  delta:'−0.25 pp', dir:'down', good:'down', c:'#16A34A',
    serie:[3.50,3.50,3.25,3.00,3.00,2.75,2.75,2.50,2.50,2.25,2.00,2.00], fuente:'BCE',          fecha:'17 abr',
    comentario:'Lagarde recorta · próxima reunión junio · mercados descuentan otro recorte.' },
  { id:'deficit', l:'Déficit / PIB',            v:'−2.9%',  unidad:'objetivo 2026',       delta:'+0.3 pp',  dir:'up',   good:'down', c:'#16A34A',
    serie:[-3.5,-3.4,-3.3,-3.2,-3.2,-3.1,-3.1,-3.0,-3.0,-2.9,-2.9,-2.9], fuente:'IGAE',          fecha:'30 abr',
    comentario:'Por debajo del 3% por primera vez desde 2019 · objetivo UE cumplido.' },
  { id:'ibex',    l:'IBEX 35',                  v:'11.240', unidad:'puntos',              delta:'+1.2%',     dir:'up',   good:'up',   c:'#16A34A',
    serie:[10900,11050,10980,11100,11080,11150,11200,11180,11220,11240,11240,11240], fuente:'BME',          fecha:'06 may',
    comentario:'8 sesiones consecutivas en verde · banca tira del índice · Iberdrola y Telefónica débiles.' },
  { id:'turismo', l:'Turistas internacionales', v:'94.5 M', unidad:'acum. 12 meses',      delta:'+8.4%',     dir:'up',   good:'up',   c:'#16A34A',
    serie:[78,82,84,86,88,90,91,92,93,94,94.2,94.5], fuente:'INE · Frontur', fecha:'01 may',
    comentario:'Récord histórico · gasto turístico +12% · presión sobre vivienda en zonas tensionadas.' },
  { id:'sentim',  l:'Sentim. CIS Gobierno',     v:'42/100', unidad:'panel mayo',          delta:'+1.8',      dir:'up',   good:'up',   c:'#16A34A',
    serie:[36,38,38,39,40,40,41,40,41,42,42,42], fuente:'CIS',          fecha:'02 may',
    comentario:'Recupera tras DANA · sigue por debajo de 50 · valoración Sánchez 3.8/10.' },
  { id:'salario', l:'Salario medio bruto',      v:'2.214 €',unidad:'mensual ene 2026',    delta:'+3.2%',     dir:'up',   good:'up',   c:'#16A34A',
    serie:[2150,2160,2168,2175,2182,2188,2192,2198,2202,2206,2210,2214], fuente:'INE · ETCL',  fecha:'29 abr',
    comentario:'Ganancia real +0.3 pp tras inflación · convenios firmados +3.5% medio.' },
]

// Comparativa UE
export const COMPARATIVA: ComparativaRow[] = [
  { pais:'España',     pib:2.7, paro:11.4, ipc:2.9,  deuda:107.4, deficit:-2.9, c:'#1F4E8C', flag:'ES' },
  { pais:'Francia',    pib:1.2, paro: 7.4, ipc:2.0,  deuda:111.6, deficit:-5.4, c:'#3B82F6', flag:'FR' },
  { pais:'Italia',     pib:0.8, paro: 6.2, ipc:1.7,  deuda:138.3, deficit:-3.4, c:'#16A34A', flag:'IT' },
  { pais:'Alemania',   pib:0.4, paro: 3.5, ipc:2.2,  deuda: 63.6, deficit:-2.1, c:'#525258', flag:'DE' },
  { pais:'Portugal',   pib:1.9, paro: 6.8, ipc:2.4,  deuda: 92.1, deficit:-0.4, c:'#7DB94B', flag:'PT' },
  { pais:'Eurozona',   pib:1.1, paro: 6.5, ipc:2.4,  deuda: 88.0, deficit:-3.0, c:'#9333EA', flag:'EZ' },
]

// IPC por componentes
export const IPC_COMP: IpcComp[] = [
  { cat:'Vivienda y alquiler',  val:5.8, peso:14.2 },
  { cat:'Alimentación',          val:4.2, peso:18.0 },
  { cat:'Restauración y hoteles',val:3.8, peso:12.4 },
  { cat:'Transporte',            val:3.1, peso:13.8 },
  { cat:'Salud',                 val:2.7, peso: 4.0 },
  { cat:'Educación',             val:2.4, peso: 1.5 },
  { cat:'Vestido y calzado',     val:2.1, peso: 5.5 },
  { cat:'Ocio y cultura',         val:1.6, peso: 6.4 },
  { cat:'Energía',               val:1.8, peso: 5.0 },
  { cat:'Comunicaciones',        val:0.9, peso: 3.0 },
]

// Vivienda
export const VIVIENDA: ViviendaItem[] = [
  { l:'Precio vivienda',      v:'+8.4%', sub:'interanual Q1', c:'#DC2626', dir:'up' },
  { l:'Esfuerzo hipotecario', v:'34.8%', sub:'% renta bruta', c:'#F97316', dir:'up' },
  { l:'Compraventas',         v:'682K',  sub:'12 m móviles',  c:'#16A34A', dir:'up' },
  { l:'Alquiler medio',       v:'13.4€', sub:'€/m² ago 2026', c:'#DC2626', dir:'up' },
  { l:'Hipoteca media nueva', v:'162K€', sub:'capital medio', c:'#5B21B6', dir:'up' },
  { l:'Stock vivienda nueva', v:'320K',  sub:'sin vender',     c:'#0EA5E9', dir:'down' },
]

// Mercados
export const MERCADOS: MercadoItem[] = [
  { l:'IBEX 35',         v:'11.240', delta:'+1.2%',    color:'#16A34A', serie:[10900,11050,10980,11100,11080,11150,11200,11180,11220,11240] },
  { l:'Bono 10Y',        v:'3.24%',  delta:'+0.04 pp', color:'#DC2626', serie:[3.18,3.20,3.19,3.22,3.21,3.23,3.20,3.22,3.24,3.24] },
  { l:'EUR/USD',         v:'1.084',  delta:'+0.6%',    color:'#16A34A', serie:[1.072,1.075,1.073,1.078,1.076,1.080,1.079,1.082,1.083,1.084] },
  { l:'Brent ($/barril)', v:'84.20', delta:'−1.1%',     color:'#0EA5E9', serie:[86.5,86.0,85.8,85.4,85.1,84.9,84.7,84.5,84.4,84.2] },
  { l:'Oro ($/onza)',    v:'2.430',  delta:'+0.8%',    color:'#F59E0B', serie:[2380,2390,2400,2395,2405,2410,2415,2420,2425,2430] },
  { l:'Bitcoin',         v:'68.4K',  delta:'+2.4%',    color:'#5B21B6', serie:[64,65,63,66,65,67,66,68,67,68.4] },
]

// Salarios y poder adquisitivo
export const SALARIOS: SalarioItem[] = [
  { l:'SMI 2026',           v:'1.184€', sub:'14 pagas · subida +5.0%',      c:'#1F4E8C' },
  { l:'Salario mediano',     v:'1.890€', sub:'mensual neto',                   c:'#16A34A' },
  { l:'Salario medio bruto', v:'2.214€', sub:'mensual · crece +3.2%',          c:'#16A34A' },
  { l:'Brecha salarial',    v:'17.4%',  sub:'mujer vs hombre · −1.2 pp',      c:'#DC2626' },
  { l:'Convenios firmados', v:'+3.5%',  sub:'subida media salarial 2026',     c:'#16A34A' },
  { l:'Pérdida de poder',   v:'−4.1%',  sub:'acumulada 2020-2025 vs IPC',     c:'#DC2626' },
]

// Calendario macro · próximas publicaciones
export const CALENDARIO: CalendarioItem[] = [
  { fecha:'09/05/2026', org:'INE',    publi:'EPA T1 2026 detallada',          impacto:'ALTO',    color:'#DC2626' },
  { fecha:'15/05/2026', org:'INE',    publi:'IPC abril definitivo',           impacto:'MEDIO',   color:'#F97316' },
  { fecha:'22/05/2026', org:'BdE',    publi:'Proyecciones macroeconómicas',   impacto:'ALTO',    color:'#DC2626' },
  { fecha:'29/05/2026', org:'INE',    publi:'Avance PIB Q1 2026',              impacto:'CRÍTICO', color:'#DC2626' },
  { fecha:'30/05/2026', org:'IGAE',   publi:'Déficit AAPP abril',              impacto:'MEDIO',   color:'#F97316' },
  { fecha:'02/06/2026', org:'M.Trab.', publi:'Paro registrado mayo',          impacto:'ALTO',    color:'#DC2626' },
  { fecha:'05/06/2026', org:'INE',    publi:'IPI marzo · industria',           impacto:'MEDIO',   color:'#F97316' },
  { fecha:'12/06/2026', org:'BCE',    publi:'Reunión política monetaria',      impacto:'CRÍTICO', color:'#DC2626' },
]

// Sectores PIB · % del total
export const SECTORES: SectorItem[] = [
  { sector:'Servicios',         pct:74.2, color:'#1F4E8C' },
  { sector:'Industria',          pct:14.8, color:'#5B21B6' },
  { sector:'Construcción',       pct: 6.2, color:'#F97316' },
  { sector:'Agricultura, pesca', pct: 2.6, color:'#16A34A' },
  { sector:'Energía',            pct: 2.2, color:'#0EA5E9' },
]

// Perfiles votante · sensibilidad económica
export const VOTER_PROFILES: VoterProfile[] = [
  { nombre:'Izquierda urbana joven',  renta:22.0, alquiler:'35%', hipoteca:'—',     ahorro:180,
    sens:{ euribor:3, inflacion:8, desempleo:9, impuestos:4, vivienda:10 }, c:'#D43F8D' },
  { nombre:'Centro pragmático',         renta:32.0, alquiler:'—',   hipoteca:'650€', ahorro:420,
    sens:{ euribor:8, inflacion:7, desempleo:6, impuestos:7, vivienda:6  }, c:'#7C3AED' },
  { nombre:'Derecha tradicional',       renta:38.0, alquiler:'—',   hipoteca:'820€', ahorro:680,
    sens:{ euribor:9, inflacion:5, desempleo:4, impuestos:10, vivienda:3 }, c:'#1F4E8C' },
  { nombre:'Voto rural',                renta:19.0, alquiler:'—',   hipoteca:'280€', ahorro:190,
    sens:{ euribor:5, inflacion:9, desempleo:8, impuestos:6, vivienda:4  }, c:'#F59E0B' },
  { nombre:'Joven abstencionista',     renta:16.0, alquiler:'42%', hipoteca:'—',     ahorro: 50,
    sens:{ euribor:2, inflacion:7, desempleo:10, impuestos:3, vivienda:10 },c:'#9E9E9E' },
]

// Ciclos electorales históricos
export const HIST_CYCLES: HistCycle[] = [
  { elec:'1982', paro:16.3, ipc:14.4, pib: 1.2, gobernante:'UCD',  ganador:'PSOE', escanos:202, leccion:'Inflación + paro = derrota UCD · mayoría absoluta socialista' },
  { elec:'1996', paro:23.8, ipc: 3.6, pib: 2.4, gobernante:'PSOE', ganador:'PP',   escanos:156, leccion:'Prima alta + corrupción → alternancia bipartidista' },
  { elec:'2000', paro:14.1, ipc: 2.9, pib: 5.0, gobernante:'PP',   ganador:'PP',   escanos:183, leccion:'Auge económico = mayoría absoluta del PP' },
  { elec:'2011', paro:22.9, ipc: 3.1, pib:-0.8, gobernante:'PSOE', ganador:'PP',   escanos:186, leccion:'Rescate y desempleo = derrota histórica del PSOE' },
  { elec:'2015', paro:21.0, ipc: 0.5, pib: 3.4, gobernante:'PP',   ganador:'PP',   escanos:123, leccion:'Recuperación frágil = fragmentación 4 partidos' },
  { elec:'2019', paro:14.0, ipc: 0.7, pib: 2.0, gobernante:'PSOE', ganador:'PSOE', escanos:120, leccion:'Crecimiento moderado = bloqueo + repetición electoral' },
  { elec:'2023', paro:11.8, ipc: 3.5, pib: 2.5, gobernante:'PSOE', ganador:'PP',   escanos:137, leccion:'Inflación modera votos del Gobierno · empate técnico' },
]

// Impacto político de las variables
export const IMPACTO_POLITICO: ImpactoRow[] = [
  { var:'IPC sube',          psoe:-1.2, pp:+0.8,  vox:+0.5, sumar:-0.3, c:'#DC2626' },
  { var:'Paro baja',         psoe:+1.5, pp:-0.6,  vox:-0.4, sumar:+0.2, c:'#16A34A' },
  { var:'PIB > 2.5%',         psoe:+1.0, pp:-0.5,  vox:-0.3, sumar:+0.4, c:'#16A34A' },
  { var:'Prima > 100 pb',    psoe:-0.8, pp:+0.5,  vox:+0.3, sumar:-0.2, c:'#DC2626' },
  { var:'Vivienda sube',     psoe:-1.5, pp:-0.2,  vox:+0.2, sumar:+1.0, c:'#DC2626' },
  { var:'Salario medio +3%', psoe:+0.8, pp:-0.4,  vox:-0.2, sumar:+0.5, c:'#16A34A' },
]
