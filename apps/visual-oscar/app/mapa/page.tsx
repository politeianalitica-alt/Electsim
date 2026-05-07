'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { useRouter } from 'next/navigation'
import { clearTokens, isAuthenticated } from '@/lib/auth'
import HemicycleAdvanced, { HParty } from '@/components/HemicycleAdvanced'
import MapaProvincias from '@/components/MapaProvincias'
import MunicipiosHistorico from '@/components/MunicipiosHistorico'

// Colores de partidos (modernos + históricos UCD/CiU)
const PC = {
  pp:'#1F4E8C', psoe:'#E1322D', vox:'#5BA02E', sumar:'#D43F8D',
  erc:'#E8A030', junts:'#1FA89B', pnv:'#7DB94B', bildu:'#3F7A3A',
  cc:'#F2C43A', bng:'#5BB3D9', upn:'#0E7D8C', ucd:'#F2A825', ciu:'#0091C8',
  otros:'#9E9E9E',
}

// Resultados oficiales (escaños) de las generales en democracia.
// PCE/IU/Podemos/UP se agrupan bajo 'sumar' (sucesión histórica de la izquierda alternativa).
// AP/CD/PP bajo 'pp'. CIU/CDC/DiL bajo 'ciu' (separado de Junts post-2017).
// HB/AMAIUR/EH Bildu bajo 'bildu'. Cs/CDS/UPyD bajo 'otros'. EA bajo 'pnv'. CHA/IC-V/EE bajo 'sumar'.
const HEMI_DATASETS: Record<string, HParty[]> = {
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
const HEMI_HISTORIC = [
  { k:'g2019', label:'Generales 2019' }, { k:'g2016', label:'Generales 2016' }, { k:'g2015', label:'Generales 2015' },
  { k:'g2011', label:'Generales 2011' }, { k:'g2008', label:'Generales 2008' }, { k:'g2004', label:'Generales 2004' },
  { k:'g2000', label:'Generales 2000' }, { k:'g1996', label:'Generales 1996' }, { k:'g1993', label:'Generales 1993' },
  { k:'g1989', label:'Generales 1989' }, { k:'g1986', label:'Generales 1986' }, { k:'g1982', label:'Generales 1982' },
  { k:'g1979', label:'Generales 1979' }, { k:'g1977', label:'Generales 1977' },
] as const
const HEMI_HISTORIC_KEYS = HEMI_HISTORIC.map(o => o.k) as readonly string[]

const HIST_2023 = [
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
type EleccionRow = { siglas: string; pct: number; seats: number; color: string; bloque: 'izquierda' | 'derecha' | 'otros' }
type Eleccion = { id: string; label: string; fecha: string; ganador: string; data: EleccionRow[] }

const C = {
  ucd:'#F2C43A', psoe:'#E30613', pce:'#A02525', iu:'#A02525', uip:'#A02525',
  ap:'#00549F', cd:'#00549F', pp:'#009FDB', cds:'#FF9800',
  ciu:'#00AEEF', erc:'#F4B20A', pnv:'#007A3D', hb:'#3F7A3A', bildu:'#A9C55A', bng:'#73C6EE',
  podemos:'#6C2C5E', up:'#6C2C5E', sumar:'#E4007C', cs:'#FF6B00', upyd:'#E91E63',
  vox:'#63BE21', cc:'#FFC107', junts:'#00AEEF', upn:'#003A8C', otros:'#9E9E9E',
}

const ELECCIONES: Eleccion[] = [
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
  { id:'2023', label:'Generales 2023', fecha:'23 jul 2023', ganador:'PP', data: HIST_2023 as EleccionRow[] },
]

const NOW = [
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

const CCAA = [
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

const SERIES = [
  { elec:'2015', PP:28.7, PSOE:22.0, VOX: 0.0, Sumar:20.7, PP_s:123, PSOE_s: 90 },
  { elec:'2016', PP:33.0, PSOE:22.7, VOX: 0.2, Sumar:21.2, PP_s:137, PSOE_s: 85 },
  { elec:'2019a',PP:16.7, PSOE:28.7, VOX:10.3, Sumar:14.3, PP_s: 66, PSOE_s:123 },
  { elec:'2019b',PP:20.8, PSOE:28.0, VOX:15.1, Sumar:12.8, PP_s: 88, PSOE_s:120 },
  { elec:'2023', PP:33.1, PSOE:31.7, VOX:12.4, Sumar:12.3, PP_s:137, PSOE_s:121 },
  { elec:'Est.', PP:32.1, PSOE:26.8, VOX:12.4, Sumar:10.2, PP_s:132, PSOE_s:110 },
]

const NAV=[
  {label:'Resumen',href:'/dashboard'},{label:'Mapa',href:'/mapa'},
  {label:'Nowcasting',href:'/nowcasting'},{label:'Escenarios',href:'/escenarios'},
  {label:'Coaliciones',href:'/coaliciones'},{label:'Riesgo',href:'/riesgo'},
  {label:'Macro',href:'/macro'},{label:'Prensa',href:'/prensa'},
  {label:'Congreso',href:'/congreso'},{label:'Briefing',href:'/briefing'},
  {label:'Microdatos',href:'/microdatos'},{label:'Índices',href:'/indices'},
  {label:'Agentes',href:'/agentes'},{label:'Geopolítica',href:'/geopolitica'},
]

function BarChart({data,maxPct=44}:{data:{siglas:string,pct:number,seats:number,color:string}[],maxPct?:number}){
  return(
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {data.map(p=>(
        <div key={p.siglas} style={{display:'grid',gridTemplateColumns:'64px 1fr 52px 44px',gap:10,alignItems:'center'}}>
          <span style={{fontSize:12,fontWeight:600,color:'var(--ink-2)'}}>{p.siglas}</span>
          <div style={{height:20,background:'var(--bg-soft)',borderRadius:5,overflow:'hidden'}}>
            <div style={{width:`${(p.pct/maxPct)*100}%`,height:'100%',background:p.color,borderRadius:5}}/>
          </div>
          <span style={{fontFamily:'var(--font-display)',fontSize:12.5,fontWeight:600,color:p.color}}>{p.pct}%</span>
          <span style={{fontSize:11,color:'var(--ink-4)',textAlign:'right'}}>{p.seats}e</span>
        </div>
      ))}
    </div>
  )
}

function TabHistoricas(){
  const [selId,setSelId]=useState('2023')
  const sel=ELECCIONES.find(e=>e.id===selId)!
  const maxPct=Math.max(...sel.data.map(d=>d.pct))*1.05
  const totalSeats=sel.data.reduce((s,d)=>s+d.seats,0)
  return(
    <div style={{background:'#fff',borderRadius:20,padding:'22px 26px',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',border:'1px solid #ECECEF'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,gap:12,flexWrap:'wrap'}}>
        <div>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Resultados detallados · {sel.label}</h2>
          <p style={{fontSize:11.5,color:'#6e6e73',margin:'4px 0 0'}}>{sel.fecha} · ganador: <strong style={{color:'#1d1d1f'}}>{sel.ganador}</strong></p>
        </div>
        <select value={selId} onChange={e=>setSelId(e.target.value)} style={{
          fontFamily:'inherit',fontSize:12,fontWeight:500,padding:'7px 32px 7px 12px',
          borderRadius:8,border:'1px solid #ECECEF',background:'#fff',
          color:'#1d1d1f',cursor:'pointer',
          appearance:'none',
          backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
          backgroundRepeat:'no-repeat',backgroundPosition:'right 10px center',
        }}>
          {[...ELECCIONES].reverse().map(e=>(
            <option key={e.id} value={e.id}>{e.label}</option>
          ))}
        </select>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>
        <BarChart data={sel.data} maxPct={maxPct}/>
        <div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
            <thead><tr style={{borderBottom:'1px solid var(--hairline)'}}>
              {['Partido','Votos %','Escaños','Bloque'].map(h=><th key={h} style={{textAlign:'left',padding:'0 8px 9px',fontWeight:600,color:'var(--ink-3)',fontSize:11,letterSpacing:'0.04em',textTransform:'uppercase'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {sel.data.map((p,i)=>(
                <tr key={p.siglas} style={{borderBottom:'1px solid var(--hairline)',background:i%2?'#fafafa':'transparent'}}>
                  <td style={{padding:'8px',fontWeight:700,color:p.color}}>{p.siglas}</td>
                  <td style={{padding:'8px',fontWeight:600}}>{p.pct}%</td>
                  <td style={{padding:'8px',fontWeight:600,color:p.color}}>{p.seats}</td>
                  <td style={{padding:'8px',color:'var(--ink-4)',textTransform:'capitalize'}}>{p.bloque}</td>
                </tr>
              ))}
              <tr style={{background:'#1d1d1f',color:'#fff'}}>
                <td style={{padding:'8px',fontWeight:700}}>Total</td>
                <td style={{padding:'8px',color:'rgba(255,255,255,0.6)',fontSize:11}}>top {sel.data.length}</td>
                <td style={{padding:'8px',fontWeight:700}}>{totalSeats}</td>
                <td style={{padding:'8px',color:'rgba(255,255,255,0.6)',fontSize:11}}>de 350</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TabEstimacion(){
  return(
    <div style={{background:'#fff',borderRadius:20,padding:'22px 26px',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',border:'1px solid #ECECEF'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Estimación actual con IC 95%</h2>
        <span style={{fontSize:11,fontWeight:600,color:'#16A34A',background:'#f0fdf4',borderRadius:999,padding:'4px 10px',border:'1px solid #bbf7d0',letterSpacing:'0.04em'}}>Tiempo real</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {NOW.map(p=>(
          <div key={p.siglas} style={{display:'grid',gridTemplateColumns:'64px 1fr 52px 80px 44px',gap:10,alignItems:'center'}}>
            <span style={{fontSize:12,fontWeight:600,color:'var(--ink-2)'}}>{p.siglas}</span>
            <div style={{height:20,background:'var(--bg-soft)',borderRadius:5,overflow:'hidden',position:'relative'}}>
              <div style={{position:'absolute',left:`${(p.ci_inf/38)*100}%`,right:`${100-(p.ci_sup/38)*100}%`,top:0,bottom:0,background:p.color,opacity:0.2,borderRadius:5}}/>
              <div style={{width:`${(p.pct/38)*100}%`,height:'100%',background:p.color,borderRadius:5,position:'relative'}}/>
            </div>
            <span style={{fontFamily:'var(--font-display)',fontSize:12.5,fontWeight:600,color:p.color}}>{p.pct}%</span>
            <span style={{fontSize:11,color:'var(--ink-4)'}}>[{p.ci_inf}–{p.ci_sup}]</span>
            <span style={{fontSize:11,color:'var(--ink-4)',textAlign:'right'}}>{p.seats}e</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TabMapa(){
  const [view,setView]=useState<'winner'|'delta'>('winner')
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <MapaProvincias/>
      <div style={{display:'flex',gap:8,marginBottom:4,marginTop:4}}>
        {[{id:'winner',label:'CC.AA. · partido ganador'},{id:'delta',label:'CC.AA. · variación estimada'}].map(v=>(
          <button key={v.id} onClick={()=>setView(v.id as any)} style={{padding:'8px 16px',borderRadius:10,border:'1px solid var(--hairline)',background:view===v.id?'var(--ink)':'#fff',color:view===v.id?'#fff':'var(--ink-2)',fontFamily:'inherit',fontSize:12.5,fontWeight:500,cursor:'pointer'}}>
            {v.label}
          </button>
        ))}
      </div>
      <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>{view==='winner'?'CC.AA. por partido ganador estimado':'Variación de escaños vs 2023'}</h2>
          <span style={{fontSize:10.5,color:'var(--ink-3)',background:'var(--bg-soft)',borderRadius:999,padding:'3px 10px',border:'1px solid var(--hairline)'}}>17 comunidades</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {CCAA.map(r=>{
            const bg=view==='winner'?`${r.color}18`:(r.delta>0?'rgba(34,197,94,0.08)':r.delta<0?'rgba(239,68,68,0.08)':'var(--bg-soft)')
            const border=view==='winner'?`${r.color}40`:(r.delta>0?'rgba(34,197,94,0.3)':r.delta<0?'rgba(239,68,68,0.3)':'var(--hairline)')
            const textColor=view==='winner'?r.color:(r.delta>0?'#16A34A':r.delta<0?'#DC2626':'var(--ink-4)')
            return(
              <div key={r.name} style={{padding:'12px 14px',borderRadius:12,background:bg,border:`1px solid ${border}`}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--ink-2)',marginBottom:4}}>{r.name}</div>
                {view==='winner'?(
                  <>
                    <div style={{fontSize:13,fontWeight:700,color:r.color}}>{r.winner}</div>
                    <div style={{fontSize:10.5,color:'var(--ink-4)',marginTop:2}}>{r.pct}% · {r.seats_hist} esc</div>
                  </>
                ):(
                  <>
                    <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,color:textColor}}>{r.delta>0?'+':''}{r.delta===0?'=':r.delta}</div>
                    <div style={{fontSize:10.5,color:'var(--ink-4)',marginTop:2}}>{r.seats_hist} → {r.seats_est} esc</div>
                  </>
                )}
              </div>
            )
          })}
        </div>
        <div style={{display:'flex',gap:12,marginTop:14,flexWrap:'wrap'}}>
          {[{color:'#009FDB',label:'PP'},{color:'#E30613',label:'PSOE'},{color:'#F4B20A',label:'ERC'},{color:'#007A3D',label:'PNV'}].map(l=>(
            <span key={l.label} style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,color:'var(--ink-3)'}}>
              <span style={{width:10,height:10,borderRadius:2,background:l.color}}/>{l.label}
            </span>
          ))}
        </div>
      </div>
      <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 16px'}}>Escaños estimados por CC.AA.</h2>
        <div style={{display:'flex',flexDirection:'column',gap:7}}>
          {[...CCAA].sort((a,b)=>b.seats_est-a.seats_est).map(r=>(
            <div key={r.name} style={{display:'grid',gridTemplateColumns:'140px 1fr 36px 60px',gap:12,alignItems:'center'}}>
              <span style={{fontSize:12,fontWeight:500,color:'var(--ink-2)'}}>{r.name}</span>
              <div style={{height:16,background:'var(--bg-soft)',borderRadius:5,overflow:'hidden'}}>
                <div style={{width:`${(r.seats_est/50)*100}%`,height:'100%',background:r.color,borderRadius:5}}/>
              </div>
              <span style={{fontFamily:'var(--font-display)',fontSize:13,fontWeight:600,color:r.color,textAlign:'right'}}>{r.seats_est}</span>
              <span style={{fontSize:10.5,color:r.delta>0?'#16A34A':r.delta<0?'#DC2626':'var(--ink-4)',fontWeight:600,textAlign:'right'}}>{r.delta>0?'+':''}{r.delta===0?'=':r.delta}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TabComparativa(){
  const W=900,H=280,padL=44,padR=20,padT=16,padB=36
  const barW=W-padL-padR,rowH=(H-padT-padB)/SERIES.length
  const maxSeats=160
  const lineParties=[
    {key:'PP',color:'#009FDB'},{key:'PSOE',color:'#E30613'},
    {key:'VOX',color:'#63BE21'},{key:'Sumar',color:'#E4007C'},
  ]
  const xPos=(i:number)=>padL+(i/(SERIES.length-1))*barW
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Evolución histórica · Intención de voto</h2>
          <div style={{display:'flex',gap:12,fontSize:11}}>
            {lineParties.map(p=><span key={p.key} style={{display:'inline-flex',alignItems:'center',gap:5,color:'var(--ink-3)'}}><svg width="18" height="5"><line x1="0" y1="2.5" x2="18" y2="2.5" stroke={p.color} strokeWidth="2"/></svg>{p.key}</span>)}
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
          {[0,10,20,30,40].map(t=>{
            const yy=padT+(1-t/45)*(H-padT-padB)
            return<g key={t}><line x1={padL} y1={yy} x2={W-padR} y2={yy} stroke="var(--hairline)" strokeDasharray={t===0?"":"2 4"}/><text x={padL-8} y={yy+3} textAnchor="end" fontSize="10" fill="var(--ink-4)">{t}%</text></g>
          })}
          {SERIES.map((_,i)=><text key={i} x={xPos(i)} y={H-12} textAnchor="middle" fontSize="10.5" fill="var(--ink-4)">{SERIES[i].elec}</text>)}
          {lineParties.map(p=>{
            const pts=SERIES.map((s,i)=>{const v=(s as any)[p.key];return[xPos(i),padT+(1-v/45)*(H-padT-padB)] as [number,number]})
            const d=pts.map(([x,y],i)=>(i===0?`M${x} ${y}`:`L${x} ${y}`)).join(" ")
            return<g key={p.key}><path d={d} fill="none" stroke={p.color} strokeWidth="2"/>{pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3" fill={p.color}/>)}</g>
          })}
        </svg>
      </div>
      <div style={{background:'#fff',borderRadius:16,padding:'22px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,letterSpacing:'-0.015em',margin:'0 0 18px'}}>Tabla comparativa de escaños</h2>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
          <thead><tr style={{borderBottom:'1px solid var(--hairline)'}}>
            {['Elección','PP','PSOE','VOX','Sumar','Mayoría'].map(h=><th key={h} style={{textAlign:'left',padding:'0 8px 9px',fontWeight:600,color:'var(--ink-3)',fontSize:10.5,letterSpacing:'0.04em',textTransform:'uppercase'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {SERIES.map((s,i)=>(
              <tr key={s.elec} style={{borderBottom:'1px solid var(--hairline)',background:i===SERIES.length-1?'#f0f9ff':i%2?'#fafafa':'transparent'}}>
                <td style={{padding:'8px',fontWeight:700,color:i===SERIES.length-1?'#0EA5E9':'var(--ink)'}}>{s.elec}</td>
                <td style={{padding:'8px',fontWeight:600,color:'#009FDB'}}>{s.PP_s}</td>
                <td style={{padding:'8px',fontWeight:600,color:'#E30613'}}>{s.PSOE_s}</td>
                <td style={{padding:'8px',color:'#63BE21'}}>{s.elec==='2015'||s.elec==='2016'?'—':s.elec==='2019a'?'24':'2019b'===s.elec?'52':s.elec==='2023'?'33':'42'}</td>
                <td style={{padding:'8px',color:'#E4007C'}}>{s.elec==='2015'?'69':s.elec==='2016'?'71':s.elec==='2019a'?'42':'2019b'===s.elec?'35':s.elec==='2023'?'31':'35'}</td>
                <td style={{padding:'8px',color:s.PP_s>=176||s.PSOE_s>=176?'#16A34A':'var(--ink-4)',fontWeight:600}}>176</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function MapaPage(){
  const router=useRouter()
  const [hemiDataset,setHemiDataset]=useState<keyof typeof HEMI_DATASETS>('estimacion')
  useEffect(()=>{if(!isAuthenticated())router.push('/login')},[router])
  return(
    <div style={{background:'var(--bg)',minHeight:'100vh',fontFamily:'var(--font-body)'}}>
      <AppHeader/>
      <main style={{maxWidth:1600,margin:'0 auto',padding:'0 28px 80px'}}>
        <section style={{background:'linear-gradient(135deg,#1a2744 0%,#0d1628 100%)',borderRadius:'0 0 24px 24px',padding:'36px 48px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22,color:'#fff'}}>
          <div>
            <p style={{fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',opacity:0.7,margin:'0 0 8px'}}>Mapa Electoral · España</p>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:700,letterSpacing:'-0.024em',margin:'0 0 6px',lineHeight:1.1}}>PP gana en <em style={{fontWeight:300}}>13 de 17 CC.AA.</em></h1>
            <p style={{fontSize:13,opacity:0.7,margin:0}}>Estimación D'Hondt · 17 comunidades · 350 escaños</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,flexShrink:0}}>
            {[{label:'PP gana',value:'13',color:'#60a5fa'},{label:'PSOE gana',value:'3',color:'#f87171'},{label:'Otros',value:'1',color:'#a3a3a3'}].map(k=>(
              <div key={k.label} style={{textAlign:'center'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:40,fontWeight:700,color:k.color,lineHeight:1}}>{k.value}</div>
                <div style={{fontSize:11,opacity:0.7,marginTop:3}}>{k.label}</div>
              </div>
            ))}
          </div>
        </section>

        <div style={{display:'grid',gridTemplateColumns:'8fr 5fr',gap:18,marginBottom:20,alignItems:'stretch'}}>
          <MapaProvincias compact/>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:'#fff',borderRadius:20,padding:'18px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',border:'1px solid #ECECEF'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,gap:8,flexWrap:'wrap'}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:600,letterSpacing:'-0.015em',margin:0}}>Hemiciclo</h2>
              <div style={{display:'inline-flex',alignItems:'center',gap:6}}>
                <div style={{display:'inline-flex',background:'#F5F5F7',borderRadius:999,padding:2}}>
                  {([{k:'estimacion',label:'Est. 2026'},{k:'g2023',label:'2023'}] as const).map(o=>{
                    const active=hemiDataset===o.k
                    return(
                      <button key={o.k} onClick={()=>setHemiDataset(o.k)} style={{
                        background:active?'#fff':'transparent',color:active?'#1d1d1f':'#6e6e73',
                        border:'none',borderRadius:999,padding:'5px 11px',fontSize:11.5,
                        fontWeight:active?600:500,cursor:'pointer',fontFamily:'inherit',
                        boxShadow:active?'0 1px 2px rgba(0,0,0,0.06)':'none',transition:'all 160ms',
                      }}>{o.label}</button>
                    )
                  })}
                </div>
                <select
                  value={HEMI_HISTORIC_KEYS.includes(hemiDataset) ? hemiDataset : ''}
                  onChange={e=>{ if(e.target.value) setHemiDataset(e.target.value) }}
                  style={{
                    fontFamily:'inherit',fontSize:11.5,fontWeight:HEMI_HISTORIC_KEYS.includes(hemiDataset)?600:500,
                    padding:'5px 26px 5px 11px',borderRadius:999,
                    border:'1px solid '+(HEMI_HISTORIC_KEYS.includes(hemiDataset)?'#1d1d1f':'#ECECEF'),
                    background:'#fff',color:HEMI_HISTORIC_KEYS.includes(hemiDataset)?'#1d1d1f':'#6e6e73',
                    cursor:'pointer',appearance:'none',
                    backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                    backgroundRepeat:'no-repeat',backgroundPosition:'right 9px center',
                  }}>
                  <option value="">Históricas…</option>
                  {HEMI_HISTORIC.map(o=><option key={o.k} value={o.k}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <HemicycleAdvanced parties={HEMI_DATASETS[hemiDataset]}/>
          </div>
          <MunicipiosHistorico/>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:18}}>
          <TabEstimacion/>
          <TabHistoricas/>
        </div>
      </main>
      <footer style={{borderTop:'1px solid var(--hairline)',padding:'20px 28px',textAlign:'center',color:'var(--ink-4)',fontSize:11.5}}>
        Datos ficticios · Mapa Electoral · ElectSim · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
