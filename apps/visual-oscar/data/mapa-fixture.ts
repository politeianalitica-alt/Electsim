/**
 * FIXTURE — Mapa electoral (hemiciclo + históricas + CC.AA. + nowcasting).
 *
 * Datos curados que sirven como fallback cuando el backend
 * `/api/electoral/*` no expone aún los datasets completos del mapa.
 * El route handler `app/api/mapa/dataset/route.ts` los devuelve con
 * `_meta.source='mock'`.
 *
 * Cuando el backend electoral exponga los endpoints definitivos
 * (`/api/electoral/historical`, `/api/electoral/nowcasting`,
 * `/api/electoral/by-ccaa`), este fixture pasará a ser referencia.
 */

import type { HParty } from '@/components/HemicycleAdvanced'

// Colores de partidos (modernos + históricos UCD/CiU)
const PC = {
  pp:'#1F4E8C', psoe:'#E1322D', vox:'#5BA02E', sumar:'#D43F8D',
  erc:'#E8A030', junts:'#1FA89B', pnv:'#7DB94B', bildu:'#3F7A3A',
  cc:'#F2C43A', bng:'#5BB3D9', upn:'#0E7D8C', ucd:'#F2A825', ciu:'#0091C8',
  otros:'#9E9E9E',
}

// Paleta C — usada por ELECCIONES (1977-2023)
const C = {
  ucd:'#F2C43A', psoe:'#E30613', pce:'#A02525', iu:'#A02525', uip:'#A02525',
  ap:'#00549F', cd:'#00549F', pp:'#009FDB', cds:'#FF9800',
  ciu:'#00AEEF', erc:'#F4B20A', pnv:'#007A3D', hb:'#3F7A3A', bildu:'#A9C55A', bng:'#73C6EE',
  podemos:'#6C2C5E', up:'#6C2C5E', sumar:'#E4007C', cs:'#FF6B00', upyd:'#E91E63',
  vox:'#63BE21', cc:'#FFC107', junts:'#00AEEF', upn:'#003A8C', otros:'#9E9E9E',
}

export type EleccionRow = { siglas: string; pct: number; seats: number; color: string; bloque: 'izquierda' | 'derecha' | 'otros' }
export type Eleccion = { id: string; label: string; fecha: string; ganador: string; data: EleccionRow[] }

export type HemiHistoricItem = { k: string; label: string }

export type NowRow = {
  siglas: string
  pct: number
  ci_inf: number
  ci_sup: number
  seats: number
  color: string
  bloque: 'izquierda' | 'derecha' | 'otros'
}

export type CCAARow = {
  name: string
  winner: string
  color: string
  pct: number
  seats_hist: number
  seats_est: number
  delta: number
}

export type SeriesRow = {
  elec: string
  PP: number
  PSOE: number
  VOX: number
  Sumar: number
  PP_s: number
  PSOE_s: number
}

// Resultados oficiales (escaños) de las generales en democracia.
// PCE/IU/Podemos/UP se agrupan bajo 'sumar' (sucesión histórica de la izquierda alternativa).
// AP/CD/PP bajo 'pp'. CIU/CDC/DiL bajo 'ciu' (separado de Junts post-2017).
// HB/AMAIUR/EH Bildu bajo 'bildu'. Cs/CDS/UPyD bajo 'otros'. EA bajo 'pnv'. CHA/IC-V/EE bajo 'sumar'.
export const HEMI_DATASETS: Record<string, HParty[]> = {
  estimacion: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:132 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:110 },
    { id:'vox',   name:'VOX',      color:PC.vox,   seats: 42 },
    { id:'sumar', name:'Sumar',    color:PC.sumar, seats: 35 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats: 11 },
    { id:'junts', name:'Junts',    color:PC.junts, seats:  7 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  5 },
    { id:'bildu', name:'EH Bildu', color:PC.bildu, seats:  4 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  2 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  1 },
    { id:'otros', name:'Otros',    color:PC.otros, seats:  1 },
  ],
  g2023: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:137 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:121 },
    { id:'vox',   name:'VOX',      color:PC.vox,   seats: 33 },
    { id:'sumar', name:'Sumar',    color:PC.sumar, seats: 31 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  7 },
    { id:'junts', name:'Junts',    color:PC.junts, seats:  7 },
    { id:'bildu', name:'EH Bildu', color:PC.bildu, seats:  6 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  5 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  1 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  1 },
    { id:'upn',   name:'UPN',      color:PC.upn,   seats:  1 },
  ],
  g2019: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:120 },
    { id:'pp',    name:'PP',       color:PC.pp,    seats: 89 },
    { id:'vox',   name:'VOX',      color:PC.vox,   seats: 52 },
    { id:'sumar', name:'UP+MP',    color:PC.sumar, seats: 38 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats: 13 },
    { id:'otros', name:'Cs',       color:'#FF8A00',seats: 10 },
    { id:'junts', name:'JxCat',    color:PC.junts, seats:  8 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  6 },
    { id:'bildu', name:'EH Bildu', color:PC.bildu, seats:  5 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  2 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  1 },
    { id:'upn',   name:'Otros',    color:PC.otros, seats:  6 },
  ],
  g2016: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:137 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats: 85 },
    { id:'sumar', name:'UP',       color:PC.sumar, seats: 71 },
    { id:'otros', name:'Cs',       color:'#FF8A00',seats: 32 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  9 },
    { id:'ciu',   name:'CDC',      color:PC.ciu,   seats:  8 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  5 },
    { id:'bildu', name:'EH Bildu', color:PC.bildu, seats:  2 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  1 },
  ],
  g2015: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:123 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats: 90 },
    { id:'sumar', name:'Podemos+IU',color:PC.sumar,seats: 71 },
    { id:'otros', name:'Cs',       color:'#FF8A00',seats: 40 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  9 },
    { id:'ciu',   name:'DiL',      color:PC.ciu,   seats:  8 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  6 },
    { id:'bildu', name:'EH Bildu', color:PC.bildu, seats:  2 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  1 },
  ],
  g2011: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:186 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:110 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 16 },
    { id:'sumar', name:'IU',       color:PC.sumar, seats: 11 },
    { id:'bildu', name:'Amaiur',   color:PC.bildu, seats:  7 },
    { id:'otros', name:'UPyD',     color:'#E91E63',seats:  5 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  5 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  3 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  2 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  2 },
    { id:'upn',   name:'GBai+FAC', color:PC.upn,   seats:  3 },
  ],
  g2008: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:169 },
    { id:'pp',    name:'PP',       color:PC.pp,    seats:154 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 11 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  6 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  3 },
    { id:'sumar', name:'IU',       color:PC.sumar, seats:  2 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  2 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  2 },
    { id:'otros', name:'UPyD',     color:'#E91E63',seats:  1 },
  ],
  g2004: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:164 },
    { id:'pp',    name:'PP',       color:PC.pp,    seats:148 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 10 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  8 },
    { id:'pnv',   name:'PNV+EA',   color:PC.pnv,   seats:  8 },
    { id:'sumar', name:'IU+CHA',   color:PC.sumar, seats:  6 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  3 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  2 },
    { id:'otros', name:'NaBai',    color:PC.otros, seats:  1 },
  ],
  g2000: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:183 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:125 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 15 },
    { id:'sumar', name:'IU+IC+CHA',color:PC.sumar, seats: 10 },
    { id:'pnv',   name:'PNV+EA',   color:PC.pnv,   seats:  8 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  4 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  4 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  1 },
  ],
  g1996: [
    { id:'pp',    name:'PP',       color:PC.pp,    seats:156 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:141 },
    { id:'sumar', name:'IU',       color:PC.sumar, seats: 21 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 16 },
    { id:'pnv',   name:'PNV+EA',   color:PC.pnv,   seats:  6 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  4 },
    { id:'bildu', name:'HB',       color:PC.bildu, seats:  2 },
    { id:'bng',   name:'BNG',      color:PC.bng,   seats:  2 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  1 },
    { id:'otros', name:'UV',       color:PC.otros, seats:  1 },
  ],
  g1993: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:159 },
    { id:'pp',    name:'PP',       color:PC.pp,    seats:141 },
    { id:'sumar', name:'IU',       color:PC.sumar, seats: 18 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 17 },
    { id:'pnv',   name:'PNV+EA',   color:PC.pnv,   seats:  6 },
    { id:'cc',    name:'CC',       color:PC.cc,    seats:  4 },
    { id:'bildu', name:'HB',       color:PC.bildu, seats:  2 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  1 },
    { id:'otros', name:'UV+PAR',   color:PC.otros, seats:  2 },
  ],
  g1989: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:175 },
    { id:'pp',    name:'PP',       color:PC.pp,    seats:107 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 18 },
    { id:'sumar', name:'IU+EE',    color:PC.sumar, seats: 19 },
    { id:'otros', name:'CDS+otros',color:PC.otros, seats: 20 },
    { id:'pnv',   name:'PNV+EA',   color:PC.pnv,   seats:  7 },
    { id:'bildu', name:'HB',       color:PC.bildu, seats:  4 },
  ],
  g1986: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:184 },
    { id:'pp',    name:'AP',       color:PC.pp,    seats:105 },
    { id:'otros', name:'CDS+otros',color:PC.otros, seats: 22 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 18 },
    { id:'sumar', name:'IU+EE',    color:PC.sumar, seats:  9 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  6 },
    { id:'bildu', name:'HB',       color:PC.bildu, seats:  5 },
    { id:'cc',    name:'AIC',      color:PC.cc,    seats:  1 },
  ],
  g1982: [
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:202 },
    { id:'pp',    name:'AP-PDP',   color:PC.pp,    seats:107 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats: 12 },
    { id:'ucd',   name:'UCD',      color:PC.ucd,   seats: 11 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  8 },
    { id:'sumar', name:'PCE+EE',   color:PC.sumar, seats:  5 },
    { id:'otros', name:'CDS',      color:PC.otros, seats:  2 },
    { id:'bildu', name:'HB',       color:PC.bildu, seats:  2 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  1 },
  ],
  g1979: [
    { id:'ucd',   name:'UCD',      color:PC.ucd,   seats:168 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:121 },
    { id:'sumar', name:'PCE+EE',   color:PC.sumar, seats: 24 },
    { id:'pp',    name:'CD',       color:PC.pp,    seats:  9 },
    { id:'ciu',   name:'CiU',      color:PC.ciu,   seats:  8 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  7 },
    { id:'bildu', name:'HB',       color:PC.bildu, seats:  3 },
    { id:'erc',   name:'ERC',      color:PC.erc,   seats:  1 },
    { id:'upn',   name:'UPN',      color:PC.upn,   seats:  1 },
    { id:'otros', name:'PSA+otros',color:PC.otros, seats:  8 },
  ],
  g1977: [
    { id:'ucd',   name:'UCD',      color:PC.ucd,   seats:165 },
    { id:'psoe',  name:'PSOE',     color:PC.psoe,  seats:118 },
    { id:'sumar', name:'PCE+PSP+EE',color:PC.sumar,seats: 27 },
    { id:'pp',    name:'AP',       color:PC.pp,    seats: 16 },
    { id:'junts', name:'PDC',      color:PC.junts, seats: 11 },
    { id:'pnv',   name:'PNV',      color:PC.pnv,   seats:  8 },
    { id:'otros', name:'Otros',    color:PC.otros, seats:  5 },
  ],
}

// Lista para el dropdown "Históricas…"
export const HEMI_HISTORIC: readonly HemiHistoricItem[] = [
  { k:'g2019', label:'Generales 2019' }, { k:'g2016', label:'Generales 2016' }, { k:'g2015', label:'Generales 2015' },
  { k:'g2011', label:'Generales 2011' }, { k:'g2008', label:'Generales 2008' }, { k:'g2004', label:'Generales 2004' },
  { k:'g2000', label:'Generales 2000' }, { k:'g1996', label:'Generales 1996' }, { k:'g1993', label:'Generales 1993' },
  { k:'g1989', label:'Generales 1989' }, { k:'g1986', label:'Generales 1986' }, { k:'g1982', label:'Generales 1982' },
  { k:'g1979', label:'Generales 1979' }, { k:'g1977', label:'Generales 1977' },
] as const

export const HIST_2023: EleccionRow[] = [
  { siglas:'PP',       pct:33.05, seats:137, color:'#009FDB', bloque:'derecha'   },
  { siglas:'PSOE',     pct:31.70, seats:121, color:'#E30613', bloque:'izquierda' },
  { siglas:'VOX',      pct:12.39, seats: 33, color:'#63BE21', bloque:'derecha'   },
  { siglas:'Sumar',    pct:12.31, seats: 31, color:'#E4007C', bloque:'izquierda' },
  { siglas:'ERC',      pct: 2.04, seats:  7, color:'#F4B20A', bloque:'izquierda' },
  { siglas:'Junts',    pct: 1.63, seats:  7, color:'#00AEEF', bloque:'otros'     },
  { siglas:'EH Bildu', pct: 1.29, seats:  6, color:'#A9C55A', bloque:'izquierda' },
  { siglas:'PNV',      pct: 1.05, seats:  5, color:'#007A3D', bloque:'otros'     },
  { siglas:'CC',       pct: 0.66, seats:  1, color:'#FFC107', bloque:'derecha'   },
  { siglas:'BNG',      pct: 0.54, seats:  1, color:'#73C6EE', bloque:'izquierda' },
  { siglas:'UPN',      pct: 0.27, seats:  1, color:'#003A8C', bloque:'derecha'   },
]

// Resultados de todas las elecciones generales en democracia (1977-2023).
// Datos oficiales aproximados (% voto / escaños). Top partidos por elección.
export const ELECCIONES: Eleccion[] = [
  { id:'1977', label:'Generales 1977', fecha:'15 jun 1977', ganador:'UCD', data:[
    { siglas:'UCD',  pct:34.4, seats:165, color:C.ucd,   bloque:'derecha'   },
    { siglas:'PSOE', pct:29.3, seats:118, color:C.psoe,  bloque:'izquierda' },
    { siglas:'PCE',  pct: 9.4, seats: 20, color:C.pce,   bloque:'izquierda' },
    { siglas:'AP',   pct: 8.2, seats: 16, color:C.ap,    bloque:'derecha'   },
    { siglas:'PSP',  pct: 4.5, seats:  6, color:'#9E9E9E',bloque:'izquierda'},
    { siglas:'PDC',  pct: 2.8, seats: 11, color:C.ciu,   bloque:'otros'     },
    { siglas:'PNV',  pct: 1.7, seats:  8, color:C.pnv,   bloque:'otros'     },
  ]},
  { id:'1979', label:'Generales 1979', fecha:'1 mar 1979', ganador:'UCD', data:[
    { siglas:'UCD',  pct:34.8, seats:168, color:C.ucd,   bloque:'derecha'   },
    { siglas:'PSOE', pct:30.4, seats:121, color:C.psoe,  bloque:'izquierda' },
    { siglas:'PCE',  pct:10.8, seats: 23, color:C.pce,   bloque:'izquierda' },
    { siglas:'CD',   pct: 6.1, seats:  9, color:C.cd,    bloque:'derecha'   },
    { siglas:'CiU',  pct: 2.7, seats:  8, color:C.ciu,   bloque:'otros'     },
    { siglas:'PNV',  pct: 1.7, seats:  7, color:C.pnv,   bloque:'otros'     },
    { siglas:'HB',   pct: 1.0, seats:  3, color:C.hb,    bloque:'otros'     },
  ]},
  { id:'1982', label:'Generales 1982', fecha:'28 oct 1982', ganador:'PSOE', data:[
    { siglas:'PSOE', pct:48.1, seats:202, color:C.psoe,  bloque:'izquierda' },
    { siglas:'AP',   pct:26.4, seats:107, color:C.ap,    bloque:'derecha'   },
    { siglas:'UCD',  pct: 6.8, seats: 11, color:C.ucd,   bloque:'derecha'   },
    { siglas:'PCE',  pct: 4.0, seats:  4, color:C.pce,   bloque:'izquierda' },
    { siglas:'CiU',  pct: 3.7, seats: 12, color:C.ciu,   bloque:'otros'     },
    { siglas:'PNV',  pct: 1.9, seats:  8, color:C.pnv,   bloque:'otros'     },
  ]},
  { id:'1986', label:'Generales 1986', fecha:'22 jun 1986', ganador:'PSOE', data:[
    { siglas:'PSOE', pct:44.1, seats:184, color:C.psoe,  bloque:'izquierda' },
    { siglas:'AP',   pct:26.0, seats:105, color:C.ap,    bloque:'derecha'   },
    { siglas:'CDS',  pct: 9.2, seats: 19, color:C.cds,   bloque:'derecha'   },
    { siglas:'IU',   pct: 4.6, seats:  7, color:C.iu,    bloque:'izquierda' },
    { siglas:'CiU',  pct: 5.0, seats: 18, color:C.ciu,   bloque:'otros'     },
    { siglas:'PNV',  pct: 1.5, seats:  6, color:C.pnv,   bloque:'otros'     },
  ]},
  { id:'1989', label:'Generales 1989', fecha:'29 oct 1989', ganador:'PSOE', data:[
    { siglas:'PSOE', pct:39.6, seats:175, color:C.psoe,  bloque:'izquierda' },
    { siglas:'PP',   pct:25.8, seats:107, color:C.pp,    bloque:'derecha'   },
    { siglas:'IU',   pct: 9.1, seats: 17, color:C.iu,    bloque:'izquierda' },
    { siglas:'CDS',  pct: 7.9, seats: 14, color:C.cds,   bloque:'derecha'   },
    { siglas:'CiU',  pct: 5.0, seats: 18, color:C.ciu,   bloque:'otros'     },
    { siglas:'PNV',  pct: 1.2, seats:  5, color:C.pnv,   bloque:'otros'     },
  ]},
  { id:'1993', label:'Generales 1993', fecha:'6 jun 1993', ganador:'PSOE', data:[
    { siglas:'PSOE', pct:38.8, seats:159, color:C.psoe,  bloque:'izquierda' },
    { siglas:'PP',   pct:34.8, seats:141, color:C.pp,    bloque:'derecha'   },
    { siglas:'IU',   pct: 9.6, seats: 18, color:C.iu,    bloque:'izquierda' },
    { siglas:'CiU',  pct: 4.9, seats: 17, color:C.ciu,   bloque:'otros'     },
    { siglas:'PNV',  pct: 1.2, seats:  5, color:C.pnv,   bloque:'otros'     },
    { siglas:'CC',   pct: 0.9, seats:  4, color:C.cc,    bloque:'derecha'   },
  ]},
  { id:'1996', label:'Generales 1996', fecha:'3 mar 1996', ganador:'PP', data:[
    { siglas:'PP',   pct:38.8, seats:156, color:C.pp,    bloque:'derecha'   },
    { siglas:'PSOE', pct:37.6, seats:141, color:C.psoe,  bloque:'izquierda' },
    { siglas:'IU',   pct:10.5, seats: 21, color:C.iu,    bloque:'izquierda' },
    { siglas:'CiU',  pct: 4.6, seats: 16, color:C.ciu,   bloque:'otros'     },
    { siglas:'PNV',  pct: 1.3, seats:  5, color:C.pnv,   bloque:'otros'     },
    { siglas:'CC',   pct: 0.9, seats:  4, color:C.cc,    bloque:'derecha'   },
  ]},
  { id:'2000', label:'Generales 2000', fecha:'12 mar 2000', ganador:'PP', data:[
    { siglas:'PP',   pct:44.5, seats:183, color:C.pp,    bloque:'derecha'   },
    { siglas:'PSOE', pct:34.2, seats:125, color:C.psoe,  bloque:'izquierda' },
    { siglas:'CiU',  pct: 4.2, seats: 15, color:C.ciu,   bloque:'otros'     },
    { siglas:'IU',   pct: 5.5, seats:  8, color:C.iu,    bloque:'izquierda' },
    { siglas:'PNV',  pct: 1.5, seats:  7, color:C.pnv,   bloque:'otros'     },
    { siglas:'CC',   pct: 1.1, seats:  4, color:C.cc,    bloque:'derecha'   },
  ]},
  { id:'2004', label:'Generales 2004', fecha:'14 mar 2004', ganador:'PSOE', data:[
    { siglas:'PSOE', pct:42.6, seats:164, color:C.psoe,  bloque:'izquierda' },
    { siglas:'PP',   pct:37.7, seats:148, color:C.pp,    bloque:'derecha'   },
    { siglas:'CiU',  pct: 3.2, seats: 10, color:C.ciu,   bloque:'otros'     },
    { siglas:'ERC',  pct: 2.5, seats:  8, color:C.erc,   bloque:'izquierda' },
    { siglas:'PNV',  pct: 1.6, seats:  7, color:C.pnv,   bloque:'otros'     },
    { siglas:'IU',   pct: 5.0, seats:  5, color:C.iu,    bloque:'izquierda' },
  ]},
  { id:'2008', label:'Generales 2008', fecha:'9 mar 2008', ganador:'PSOE', data:[
    { siglas:'PSOE', pct:43.9, seats:169, color:C.psoe,  bloque:'izquierda' },
    { siglas:'PP',   pct:39.9, seats:154, color:C.pp,    bloque:'derecha'   },
    { siglas:'CiU',  pct: 3.0, seats: 10, color:C.ciu,   bloque:'otros'     },
    { siglas:'PNV',  pct: 1.2, seats:  6, color:C.pnv,   bloque:'otros'     },
    { siglas:'IU',   pct: 3.8, seats:  2, color:C.iu,    bloque:'izquierda' },
    { siglas:'ERC',  pct: 1.2, seats:  3, color:C.erc,   bloque:'izquierda' },
  ]},
  { id:'2011', label:'Generales 2011', fecha:'20 nov 2011', ganador:'PP', data:[
    { siglas:'PP',   pct:44.6, seats:186, color:C.pp,    bloque:'derecha'   },
    { siglas:'PSOE', pct:28.8, seats:110, color:C.psoe,  bloque:'izquierda' },
    { siglas:'CiU',  pct: 4.2, seats: 16, color:C.ciu,   bloque:'otros'     },
    { siglas:'IU',   pct: 6.9, seats: 11, color:C.iu,    bloque:'izquierda' },
    { siglas:'UPyD', pct: 4.7, seats:  5, color:C.upyd,  bloque:'derecha'   },
    { siglas:'PNV',  pct: 1.3, seats:  5, color:C.pnv,   bloque:'otros'     },
  ]},
  { id:'2015', label:'Generales 2015', fecha:'20 dic 2015', ganador:'PP', data:[
    { siglas:'PP',      pct:28.7, seats:123, color:C.pp,      bloque:'derecha'   },
    { siglas:'PSOE',    pct:22.0, seats: 90, color:C.psoe,    bloque:'izquierda' },
    { siglas:'Podemos', pct:20.7, seats: 69, color:C.podemos, bloque:'izquierda' },
    { siglas:'Cs',      pct:13.9, seats: 40, color:C.cs,      bloque:'derecha'   },
    { siglas:'ERC',     pct: 2.4, seats:  9, color:C.erc,     bloque:'izquierda' },
    { siglas:'CDC',     pct: 2.3, seats:  8, color:C.junts,   bloque:'otros'     },
    { siglas:'PNV',     pct: 1.2, seats:  6, color:C.pnv,     bloque:'otros'     },
  ]},
  { id:'2016', label:'Generales 2016', fecha:'26 jun 2016', ganador:'PP', data:[
    { siglas:'PP',      pct:33.0, seats:137, color:C.pp,      bloque:'derecha'   },
    { siglas:'PSOE',    pct:22.6, seats: 85, color:C.psoe,    bloque:'izquierda' },
    { siglas:'Podemos', pct:21.2, seats: 71, color:C.podemos, bloque:'izquierda' },
    { siglas:'Cs',      pct:13.1, seats: 32, color:C.cs,      bloque:'derecha'   },
    { siglas:'ERC',     pct: 2.6, seats:  9, color:C.erc,     bloque:'izquierda' },
    { siglas:'CDC',     pct: 2.0, seats:  8, color:C.junts,   bloque:'otros'     },
    { siglas:'PNV',     pct: 1.2, seats:  5, color:C.pnv,     bloque:'otros'     },
  ]},
  { id:'2019a', label:'Generales abril 2019', fecha:'28 abr 2019', ganador:'PSOE', data:[
    { siglas:'PSOE',    pct:28.7, seats:123, color:C.psoe,    bloque:'izquierda' },
    { siglas:'PP',      pct:16.7, seats: 66, color:C.pp,      bloque:'derecha'   },
    { siglas:'Cs',      pct:15.9, seats: 57, color:C.cs,      bloque:'derecha'   },
    { siglas:'UP',      pct:14.3, seats: 42, color:C.up,      bloque:'izquierda' },
    { siglas:'VOX',     pct:10.3, seats: 24, color:C.vox,     bloque:'derecha'   },
    { siglas:'ERC',     pct: 3.9, seats: 15, color:C.erc,     bloque:'izquierda' },
    { siglas:'JxCat',   pct: 1.9, seats:  7, color:C.junts,   bloque:'otros'     },
    { siglas:'PNV',     pct: 1.5, seats:  6, color:C.pnv,     bloque:'otros'     },
  ]},
  { id:'2019b', label:'Generales noviembre 2019', fecha:'10 nov 2019', ganador:'PSOE', data:[
    { siglas:'PSOE',    pct:28.0, seats:120, color:C.psoe,    bloque:'izquierda' },
    { siglas:'PP',      pct:20.8, seats: 89, color:C.pp,      bloque:'derecha'   },
    { siglas:'VOX',     pct:15.1, seats: 52, color:C.vox,     bloque:'derecha'   },
    { siglas:'UP',      pct:12.8, seats: 35, color:C.up,      bloque:'izquierda' },
    { siglas:'ERC',     pct: 3.6, seats: 13, color:C.erc,     bloque:'izquierda' },
    { siglas:'Cs',      pct: 6.8, seats: 10, color:C.cs,      bloque:'derecha'   },
    { siglas:'JxCat',   pct: 2.2, seats:  8, color:C.junts,   bloque:'otros'     },
    { siglas:'PNV',     pct: 1.6, seats:  6, color:C.pnv,     bloque:'otros'     },
    { siglas:'EH Bildu',pct: 1.1, seats:  5, color:C.bildu,   bloque:'izquierda' },
  ]},
  { id:'2023', label:'Generales 2023', fecha:'23 jul 2023', ganador:'PP', data: HIST_2023 },
]

export const NOW: NowRow[] = [
  { siglas:'PP',       pct:32.1, ci_inf:30.2, ci_sup:34.0, seats:132, color:'#009FDB', bloque:'derecha'   },
  { siglas:'PSOE',     pct:26.8, ci_inf:24.8, ci_sup:28.8, seats:110, color:'#E30613', bloque:'izquierda' },
  { siglas:'VOX',      pct:12.4, ci_inf:11.0, ci_sup:13.8, seats: 42, color:'#63BE21', bloque:'derecha'   },
  { siglas:'Sumar',    pct:10.2, ci_inf: 8.8, ci_sup:11.6, seats: 35, color:'#E4007C', bloque:'izquierda' },
  { siglas:'ERC',      pct: 3.1, ci_inf: 2.4, ci_sup: 3.8, seats: 11, color:'#F4B20A', bloque:'izquierda' },
  { siglas:'Junts',    pct: 2.8, ci_inf: 2.2, ci_sup: 3.4, seats:  7, color:'#00AEEF', bloque:'otros'     },
  { siglas:'PNV',      pct: 2.1, ci_inf: 1.6, ci_sup: 2.6, seats:  5, color:'#007A3D', bloque:'otros'     },
  { siglas:'EH Bildu', pct: 2.0, ci_inf: 1.5, ci_sup: 2.5, seats:  4, color:'#A9C55A', bloque:'izquierda' },
  { siglas:'CC',       pct: 1.4, ci_inf: 1.0, ci_sup: 1.8, seats:  2, color:'#FFC107', bloque:'derecha'   },
  { siglas:'BNG',      pct: 0.9, ci_inf: 0.6, ci_sup: 1.2, seats:  1, color:'#73C6EE', bloque:'izquierda' },
]

export const CCAA: CCAARow[] = [
  { name:'Galicia',           winner:'PP',       color:'#009FDB', pct:40.2, seats_hist:10, seats_est:10, delta: 0  },
  { name:'Asturias',          winner:'PSOE',     color:'#E30613', pct:32.8, seats_hist: 6, seats_est: 5, delta:-1  },
  { name:'Cantabria',         winner:'PP',       color:'#009FDB', pct:37.4, seats_hist: 5, seats_est: 5, delta: 0  },
  { name:'País Vasco',        winner:'PNV',      color:'#007A3D', pct:27.3, seats_hist: 9, seats_est: 8, delta:-1  },
  { name:'Navarra',           winner:'PP',       color:'#009FDB', pct:32.1, seats_hist: 5, seats_est: 5, delta: 0  },
  { name:'La Rioja',          winner:'PP',       color:'#009FDB', pct:41.0, seats_hist: 4, seats_est: 4, delta: 0  },
  { name:'Aragón',            winner:'PP',       color:'#009FDB', pct:38.4, seats_hist: 8, seats_est: 8, delta: 0  },
  { name:'Cataluña',          winner:'ERC',      color:'#F4B20A', pct:17.5, seats_hist:23, seats_est:25, delta:+2  },
  { name:'Castilla y León',   winner:'PP',       color:'#009FDB', pct:44.2, seats_hist:22, seats_est:24, delta:+2  },
  { name:'Madrid',            winner:'PP',       color:'#009FDB', pct:38.4, seats_hist:34, seats_est:36, delta:+2  },
  { name:'Extremadura',       winner:'PP',       color:'#009FDB', pct:37.8, seats_hist: 6, seats_est: 6, delta: 0  },
  { name:'Castilla-La Mancha',winner:'PSOE',     color:'#E30613', pct:35.2, seats_hist:10, seats_est: 9, delta:-1  },
  { name:'C. Valenciana',     winner:'PP',       color:'#009FDB', pct:32.8, seats_hist:18, seats_est:19, delta:+1  },
  { name:'Baleares',          winner:'PP',       color:'#009FDB', pct:35.2, seats_hist: 6, seats_est: 6, delta: 0  },
  { name:'Murcia',            winner:'PP',       color:'#009FDB', pct:42.1, seats_hist: 9, seats_est: 9, delta: 0  },
  { name:'Andalucía',         winner:'PP',       color:'#009FDB', pct:38.7, seats_hist:46, seats_est:48, delta:+2  },
  { name:'Canarias',          winner:'PSOE',     color:'#E30613', pct:28.5, seats_hist:11, seats_est:10, delta:-1  },
]

export const SERIES: SeriesRow[] = [
  { elec:'2015', PP:28.7, PSOE:22.0, VOX: 0.0, Sumar:20.7, PP_s:123, PSOE_s: 90 },
  { elec:'2016', PP:33.0, PSOE:22.7, VOX: 0.2, Sumar:21.2, PP_s:137, PSOE_s: 85 },
  { elec:'2019a',PP:16.7, PSOE:28.7, VOX:10.3, Sumar:14.3, PP_s: 66, PSOE_s:123 },
  { elec:'2019b',PP:20.8, PSOE:28.0, VOX:15.1, Sumar:12.8, PP_s: 88, PSOE_s:120 },
  { elec:'2023', PP:33.1, PSOE:31.7, VOX:12.4, Sumar:12.3, PP_s:137, PSOE_s:121 },
  { elec:'Est.', PP:32.1, PSOE:26.8, VOX:12.4, Sumar:10.2, PP_s:132, PSOE_s:110 },
]
