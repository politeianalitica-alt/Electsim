'use client'
import { useMemo, useState } from 'react'

export type PartyId = 'pp' | 'psoe' | 'vox' | 'sumar' | 'erc' | 'junts' | 'bildu' | 'pnv' | 'bng' | 'cc' | 'upn' | 'ucd' | 'ciu' | 'otros'

export const PARTIES: Record<PartyId, { name: string; color: string }> = {
  pp:    { name: 'PP',       color: '#1F4E8C' },
  psoe:  { name: 'PSOE',     color: '#E1322D' },
  vox:   { name: 'VOX',      color: '#5BA02E' },
  sumar: { name: 'Sumar',    color: '#D43F8D' },
  erc:   { name: 'ERC',      color: '#E8A030' },
  junts: { name: 'Junts',    color: '#1FA89B' },
  bildu: { name: 'EH Bildu', color: '#3F7A3A' },
  pnv:   { name: 'PNV',      color: '#7DB94B' },
  bng:   { name: 'BNG',      color: '#5BB3D9' },
  cc:    { name: 'CC',       color: '#F2C43A' },
  upn:   { name: 'UPN',      color: '#0E7D8C' },
  ucd:   { name: 'UCD',      color: '#F2A825' },
  ciu:   { name: 'CiU',      color: '#0091C8' },
  otros: { name: 'Otros',    color: '#9E9E9E' },
}

// 52 provincias en grid cartográfico (col, row) — geografía aproximada de España
export type Province = { id: string; name: string; col: number; row: number; seats: number }
export const PROVINCES: Province[] = [
  { id:'c',   name:'A Coruña',     col:1, row:0, seats:8  },
  { id:'lu',  name:'Lugo',         col:2, row:0, seats:4  },
  { id:'or',  name:'Ourense',      col:2, row:1, seats:4  },
  { id:'po',  name:'Pontevedra',   col:1, row:1, seats:7  },
  { id:'o',   name:'Asturias',     col:3, row:0, seats:7  },
  { id:'s',   name:'Cantabria',    col:4, row:0, seats:5  },
  { id:'bi',  name:'Bizkaia',      col:5, row:0, seats:8  },
  { id:'ss',  name:'Gipuzkoa',     col:6, row:0, seats:6  },
  { id:'vi',  name:'Álava',        col:5, row:1, seats:4  },
  { id:'na',  name:'Navarra',      col:6, row:1, seats:5  },
  { id:'le',  name:'León',         col:3, row:1, seats:4  },
  { id:'p',   name:'Palencia',     col:4, row:1, seats:3  },
  { id:'bu',  name:'Burgos',       col:5, row:2, seats:4  },
  { id:'lo',  name:'La Rioja',     col:6, row:2, seats:4  },
  { id:'hu',  name:'Huesca',       col:7, row:1, seats:3  },
  { id:'z',   name:'Zaragoza',     col:7, row:2, seats:7  },
  { id:'za',  name:'Zamora',       col:3, row:2, seats:3  },
  { id:'sa',  name:'Salamanca',    col:3, row:3, seats:4  },
  { id:'av',  name:'Ávila',        col:4, row:3, seats:3  },
  { id:'sg',  name:'Segovia',      col:4, row:2, seats:3  },
  { id:'so',  name:'Soria',        col:5, row:3, seats:2  },
  { id:'va',  name:'Valladolid',   col:4, row:4, seats:5  },
  { id:'ge',  name:'Girona',       col:8, row:1, seats:6  },
  { id:'l',   name:'Lleida',       col:7, row:0, seats:4  },
  { id:'t',   name:'Tarragona',    col:8, row:2, seats:6  },
  { id:'b',   name:'Barcelona',    col:8, row:0, seats:32 },
  { id:'m',   name:'Madrid',       col:5, row:4, seats:37 },
  { id:'gu',  name:'Guadalajara',  col:6, row:3, seats:3  },
  { id:'cu',  name:'Cuenca',       col:6, row:4, seats:3  },
  { id:'to',  name:'Toledo',       col:5, row:5, seats:6  },
  { id:'cr',  name:'Ciudad Real',  col:4, row:5, seats:5  },
  { id:'ab',  name:'Albacete',     col:5, row:6, seats:4  },
  { id:'cs',  name:'Castellón',    col:7, row:3, seats:5  },
  { id:'v',   name:'Valencia',     col:7, row:4, seats:15 },
  { id:'a',   name:'Alicante',     col:7, row:5, seats:13 },
  { id:'mu',  name:'Murcia',       col:6, row:6, seats:10 },
  { id:'h',   name:'Huelva',       col:1, row:6, seats:5  },
  { id:'se',  name:'Sevilla',      col:2, row:6, seats:12 },
  { id:'co',  name:'Córdoba',      col:3, row:6, seats:7  },
  { id:'j',   name:'Jaén',         col:4, row:6, seats:5  },
  { id:'ca',  name:'Cádiz',        col:2, row:7, seats:9  },
  { id:'ma',  name:'Málaga',       col:3, row:7, seats:11 },
  { id:'gr',  name:'Granada',      col:4, row:7, seats:7  },
  { id:'al',  name:'Almería',      col:5, row:7, seats:6  },
  { id:'cc',  name:'Cáceres',      col:2, row:5, seats:4  },
  { id:'ba',  name:'Badajoz',      col:2, row:4, seats:6  },
  { id:'pm',  name:'Baleares',     col:9, row:3, seats:8  },
  { id:'gc',  name:'Las Palmas',   col:0, row:8, seats:8  },
  { id:'tf',  name:'S.C. Tenerife',col:1, row:8, seats:7  },
  { id:'ce',  name:'Ceuta',        col:0, row:7, seats:1  },
  { id:'ml',  name:'Melilla',      col:0, row:6, seats:1  },
  { id:'te',  name:'Teruel',       col:6, row:5, seats:3  },
]

// Winners por dataset — solo el partido ganador en cada provincia.
// (Datos sintéticos plausibles para demo; en producción vendrían de API.)
export const WINNERS: Record<string, Record<string, PartyId>> = {
  estimacion: {
    c:'pp', lu:'pp', or:'pp', po:'psoe', o:'psoe', s:'pp', bi:'pnv', ss:'bildu', vi:'pnv', na:'psoe',
    le:'pp', p:'pp', bu:'pp', lo:'pp', hu:'psoe', z:'pp', za:'pp', sa:'pp', av:'pp', sg:'pp',
    so:'pp', va:'pp', ge:'junts', l:'erc', t:'psoe', b:'psoe', m:'pp', gu:'pp', cu:'pp', to:'psoe',
    cr:'psoe', ab:'psoe', cs:'pp', v:'pp', a:'pp', mu:'pp', h:'psoe', se:'psoe', co:'psoe', j:'psoe',
    ca:'psoe', ma:'pp', gr:'psoe', al:'pp', cc:'psoe', ba:'psoe', pm:'pp', gc:'psoe', tf:'psoe',
    ce:'pp', ml:'pp', te:'pp',
  },
  g2023: {
    c:'pp', lu:'pp', or:'pp', po:'pp', o:'pp', s:'pp', bi:'pnv', ss:'bildu', vi:'pnv', na:'psoe',
    le:'pp', p:'pp', bu:'pp', lo:'pp', hu:'psoe', z:'pp', za:'pp', sa:'pp', av:'pp', sg:'pp',
    so:'pp', va:'pp', ge:'junts', l:'erc', t:'psoe', b:'psoe', m:'pp', gu:'pp', cu:'pp', to:'pp',
    cr:'pp', ab:'pp', cs:'pp', v:'pp', a:'pp', mu:'pp', h:'pp', se:'psoe', co:'pp', j:'pp',
    ca:'psoe', ma:'pp', gr:'pp', al:'pp', cc:'pp', ba:'psoe', pm:'pp', gc:'psoe', tf:'psoe',
    ce:'pp', ml:'pp', te:'pp',
  },
  g2019: {
    c:'psoe', lu:'psoe', or:'psoe', po:'psoe', o:'psoe', s:'psoe', bi:'pnv', ss:'bildu', vi:'pnv', na:'psoe',
    le:'psoe', p:'psoe', bu:'psoe', lo:'psoe', hu:'psoe', z:'psoe', za:'psoe', sa:'psoe', av:'psoe', sg:'psoe',
    so:'pp', va:'psoe', ge:'erc', l:'erc', t:'psoe', b:'psoe', m:'pp', gu:'psoe', cu:'psoe', to:'psoe',
    cr:'psoe', ab:'psoe', cs:'psoe', v:'psoe', a:'psoe', mu:'pp', h:'psoe', se:'psoe', co:'psoe', j:'psoe',
    ca:'psoe', ma:'psoe', gr:'psoe', al:'pp', cc:'psoe', ba:'psoe', pm:'psoe', gc:'psoe', tf:'psoe',
    ce:'pp', ml:'pp', te:'pp',
  },
  g2016: {
    c:'pp', lu:'pp', or:'pp', po:'pp', o:'pp', s:'pp', bi:'pnv', ss:'bildu', vi:'pnv', na:'upn',
    le:'pp', p:'pp', bu:'pp', lo:'pp', hu:'pp', z:'pp', za:'pp', sa:'pp', av:'pp', sg:'pp',
    so:'pp', va:'pp', ge:'erc', l:'erc', t:'pp', b:'sumar', m:'pp', gu:'pp', cu:'pp', to:'pp',
    cr:'pp', ab:'pp', cs:'pp', v:'sumar', a:'pp', mu:'pp', h:'psoe', se:'psoe', co:'pp', j:'pp',
    ca:'psoe', ma:'pp', gr:'pp', al:'pp', cc:'pp', ba:'pp', pm:'pp', gc:'pp', tf:'pp',
    ce:'pp', ml:'pp', te:'pp',
  },
  g2015: {
    c:'pp', lu:'pp', or:'pp', po:'pp', o:'pp', s:'pp', bi:'pnv', ss:'bildu', vi:'pp', na:'upn',
    le:'pp', p:'pp', bu:'pp', lo:'pp', hu:'pp', z:'pp', za:'pp', sa:'pp', av:'pp', sg:'pp',
    so:'pp', va:'pp', ge:'erc', l:'erc', t:'sumar', b:'sumar', m:'pp', gu:'pp', cu:'pp', to:'pp',
    cr:'pp', ab:'pp', cs:'pp', v:'sumar', a:'pp', mu:'pp', h:'psoe', se:'psoe', co:'pp', j:'pp',
    ca:'psoe', ma:'pp', gr:'pp', al:'pp', cc:'pp', ba:'pp', pm:'pp', gc:'pp', tf:'pp',
    ce:'pp', ml:'pp', te:'pp',
  },
}

function mkW(d: PartyId, ex: Partial<Record<string, PartyId>> = {}): Record<string, PartyId> {
  const out: Record<string, PartyId> = {}
  PROVINCES.forEach(p => { out[p.id] = (ex[p.id] || d) })
  return out
}

// Elecciones históricas: ganador nacional + excepciones provinciales aproximadas
const W_1977 = mkW('ucd', { bi:'pnv', ss:'pnv', vi:'pnv', na:'ucd', ge:'ciu', l:'ciu', t:'ciu', b:'psoe', se:'psoe', ca:'psoe', ce:'ucd', ml:'ucd' })
const W_1979 = mkW('ucd', { bi:'pnv', ss:'pnv', vi:'pnv', ge:'ciu', l:'ciu', t:'ciu', b:'psoe', se:'psoe', ca:'psoe' })
const W_1982 = mkW('psoe', { lu:'pp', or:'pp', le:'pp', av:'pp', sg:'pp', so:'pp', bi:'pnv', ss:'pnv', vi:'pnv', na:'ucd', ge:'ciu', l:'ciu', t:'ciu' })
const W_1986 = mkW('psoe', { lu:'pp', or:'pp', sa:'pp', av:'pp', sg:'pp', so:'pp', bi:'pnv', ss:'pnv', vi:'pnv', na:'pp', ge:'ciu', l:'ciu', t:'ciu' })
const W_1989 = mkW('psoe', { lu:'pp', or:'pp', sa:'pp', av:'pp', sg:'pp', so:'pp', za:'pp', m:'pp', mu:'pp', bi:'pnv', ss:'pnv', vi:'pnv', na:'pp', ge:'ciu', l:'ciu', t:'ciu' })
const W_1993 = mkW('psoe', { c:'pp', lu:'pp', or:'pp', le:'pp', p:'pp', bu:'pp', lo:'pp', sa:'pp', av:'pp', sg:'pp', so:'pp', za:'pp', va:'pp', m:'pp', mu:'pp', cs:'pp', a:'pp', bi:'pnv', ss:'pnv', vi:'pnv', na:'pp', ge:'ciu', l:'ciu', t:'ciu', b:'psoe' })
const W_1996 = mkW('pp', { se:'psoe', co:'psoe', j:'psoe', ca:'psoe', ma:'psoe', gr:'psoe', h:'psoe', cc:'psoe', ba:'psoe', o:'psoe', bi:'pnv', ss:'pnv', vi:'pnv', na:'pp', ge:'ciu', l:'ciu', t:'ciu', b:'psoe' })
const W_2000 = mkW('pp', { se:'psoe', ca:'psoe', h:'psoe', cc:'psoe', ba:'psoe', bi:'pnv', ss:'pnv', vi:'pnv', na:'pp', ge:'ciu', l:'ciu', t:'ciu' })
const W_2004 = mkW('psoe', { lu:'pp', or:'pp', le:'pp', p:'pp', bu:'pp', lo:'pp', sa:'pp', av:'pp', sg:'pp', so:'pp', za:'pp', m:'pp', mu:'pp', a:'pp', cs:'pp', bi:'pnv', ss:'pnv', vi:'pnv', na:'psoe', ge:'erc', l:'erc', t:'psoe', b:'psoe' })
const W_2008 = mkW('psoe', { lu:'pp', or:'pp', le:'pp', p:'pp', bu:'pp', lo:'pp', sa:'pp', av:'pp', sg:'pp', so:'pp', za:'pp', m:'pp', mu:'pp', a:'pp', cs:'pp', s:'pp', bi:'pnv', ss:'pnv', vi:'pnv', na:'psoe', ge:'ciu', l:'ciu', t:'psoe', b:'psoe' })
const W_2011 = mkW('pp', { se:'psoe', ca:'psoe', h:'psoe', ba:'psoe', cc:'psoe', bi:'pnv', ss:'bildu', vi:'pp', na:'upn', ge:'ciu', l:'ciu', t:'pp', b:'ciu' })

export const WINNERS_HIST: Record<string, Record<string, PartyId>> = {
  g2011: W_2011, g2008: W_2008, g2004: W_2004, g2000: W_2000, g1996: W_1996,
  g1993: W_1993, g1989: W_1989, g1986: W_1986, g1982: W_1982, g1979: W_1979, g1977: W_1977,
}

export const HISTORIC_OPTIONS = [
  { k:'g2019', label:'Generales 2019' }, { k:'g2016', label:'Generales 2016' }, { k:'g2015', label:'Generales 2015' },
  { k:'g2011', label:'Generales 2011' }, { k:'g2008', label:'Generales 2008' }, { k:'g2004', label:'Generales 2004' },
  { k:'g2000', label:'Generales 2000' }, { k:'g1996', label:'Generales 1996' }, { k:'g1993', label:'Generales 1993' },
  { k:'g1989', label:'Generales 1989' }, { k:'g1986', label:'Generales 1986' }, { k:'g1982', label:'Generales 1982' },
  { k:'g1979', label:'Generales 1979' }, { k:'g1977', label:'Generales 1977' },
] as const
const HISTORIC_KEYS = HISTORIC_OPTIONS.map(o => o.k) as readonly string[]

// Bloque ideológico por partido
// Vista del mapa
type View = 'winner' | 'tamano'
const VIEWS: { k: View; label: string }[] = [
  { k: 'winner', label: 'Ganador' },
  { k: 'tamano', label: 'Tamaño' },
]

function colorForCell(view: View, winner: PartyId | undefined, seats: number): string {
  if (view === 'tamano') {
    if (seats >= 20) return '#1d1d1f'
    if (seats >= 10) return '#515154'
    if (seats >= 5)  return '#86868b'
    return '#C0C0C5'
  }
  return winner ? PARTIES[winner].color : '#C0C0C5'
}

// Nombre histórico con el que cada partido (en su id moderno) se presentó en cada elección.
// Si no hay entrada, se usa PARTIES[id].name.
const HISTORIC_NAMES: Record<string, Partial<Record<PartyId, string>>> = {
  g1977: { pp:'AP', sumar:'PCE', junts:'PDC' },
  g1979: { pp:'CD', sumar:'PCE-EPK', bildu:'HB' },
  g1982: { pp:'AP-PDP', sumar:'PCE', ciu:'CiU', bildu:'HB', otros:'CDS' },
  g1986: { pp:'AP', sumar:'IU', ciu:'CiU', bildu:'HB', otros:'CDS', cc:'AIC' },
  g1989: { sumar:'IU', ciu:'CiU', bildu:'HB', otros:'CDS' },
  g1993: { sumar:'IU', ciu:'CiU', bildu:'HB' },
  g1996: { sumar:'IU', ciu:'CiU', bildu:'HB' },
  g2000: { sumar:'IU', ciu:'CiU' },
  g2004: { sumar:'IU', ciu:'CiU' },
  g2008: { sumar:'IU', ciu:'CiU', otros:'UPyD' },
  g2011: { sumar:'IU-LV', ciu:'CiU', bildu:'Amaiur', otros:'UPyD' },
  g2015: { sumar:'Podemos', ciu:'DiL', otros:'Cs' },
  g2016: { sumar:'Unidos Podemos', ciu:'CDC', otros:'Cs' },
  g2019: { sumar:'Unidas Podemos', ciu:'CDC', junts:'JxCat', otros:'Cs' },
  g2023: { sumar:'Sumar' },
  estimacion: {},
}

function partyName(dataset: string, pid: PartyId): string {
  return HISTORIC_NAMES[dataset]?.[pid] || PARTIES[pid].name
}

// Top partidos por elección (en orden de fuerza nacional aproximada)
const TOP_BY_YEAR: Record<string, PartyId[]> = {
  estimacion: ['pp','psoe','vox','sumar','erc','junts','pnv','bildu'],
  g2023: ['pp','psoe','vox','sumar','erc','junts','bildu','pnv'],
  g2019: ['psoe','pp','vox','sumar','erc','junts','pnv','bildu'],
  g2016: ['pp','psoe','sumar','erc','junts','pnv','bildu'],
  g2015: ['pp','psoe','sumar','erc','junts','pnv','bildu'],
  g2011: ['pp','psoe','sumar','ciu','pnv','bildu'],
  g2008: ['psoe','pp','ciu','sumar','pnv','bildu'],
  g2004: ['psoe','pp','ciu','erc','sumar','pnv','bildu'],
  g2000: ['pp','psoe','ciu','sumar','pnv'],
  g1996: ['pp','psoe','sumar','ciu','pnv'],
  g1993: ['psoe','pp','sumar','ciu','pnv'],
  g1989: ['psoe','pp','sumar','ciu','pnv'],
  g1986: ['psoe','pp','sumar','ciu','pnv'],
  g1982: ['psoe','pp','ucd','ciu','pnv'],
  g1979: ['ucd','psoe','pp','sumar','ciu','pnv'],
  g1977: ['ucd','psoe','sumar','pp','ciu','pnv'],
}

function getBreakdown(dataset: string, prov: Province, winner: PartyId | undefined): Partial<Record<PartyId, number>> {
  if (dataset === 'estimacion' && BREAKDOWN_2026[prov.id]) return BREAKDOWN_2026[prov.id]
  if (!winner) return {}
  const seats = prov.seats
  if (seats === 1) return { [winner]: 1 } as Partial<Record<PartyId, number>>
  const top = TOP_BY_YEAR[dataset] || ['pp','psoe','vox','sumar']
  const opponents = top.filter(p => p !== winner)
  const out: Partial<Record<PartyId, number>> = {}
  // Ganador ~50%
  let winnerShare = Math.max(1, Math.round(seats * 0.5))
  if (winnerShare >= seats) winnerShare = seats - 1
  out[winner] = winnerShare
  let rem = seats - winnerShare
  // Segundo ~30%
  if (rem > 0 && opponents.length > 0) {
    const give = Math.min(Math.max(1, Math.round(seats * 0.3)), rem)
    out[opponents[0]] = give
    rem -= give
  }
  // Tercero — hasta 2
  if (rem > 0 && opponents.length > 1) {
    const give = Math.min(2, rem)
    out[opponents[1]] = give
    rem -= give
  }
  // Cuarto — resto
  if (rem > 0 && opponents.length > 2) {
    out[opponents[2]] = rem
    rem = 0
  }
  if (rem > 0) out[winner] = (out[winner] || 0) + rem
  return out
}

// Distribución de escaños por provincia (estimación 2026 — datos del design Anthropic)
const BREAKDOWN_2026: Record<string, Partial<Record<PartyId, number>>> = {
  c:{pp:4,psoe:3,bng:1}, lu:{pp:2,psoe:1,bng:1}, or:{pp:2,psoe:2}, po:{psoe:3,pp:3,bng:1},
  o:{psoe:3,pp:3,sumar:1}, s:{pp:3,psoe:2}, bi:{pnv:3,psoe:2,pp:1,bildu:2}, ss:{bildu:3,pnv:2,psoe:1},
  vi:{pnv:1,pp:1,psoe:1,bildu:1}, na:{psoe:2,upn:1,bildu:1,pp:1},
  le:{pp:2,psoe:2}, p:{pp:2,psoe:1}, bu:{pp:2,psoe:1,vox:1}, lo:{pp:2,psoe:1,vox:1},
  hu:{psoe:2,pp:1}, z:{pp:3,psoe:3,vox:1}, za:{pp:2,psoe:1}, sa:{pp:2,psoe:1,vox:1},
  av:{pp:2,psoe:1}, sg:{pp:2,psoe:1}, so:{pp:1,psoe:1}, va:{pp:2,psoe:2,vox:1},
  ge:{junts:2,erc:2,psoe:1,pp:1}, l:{erc:2,junts:1,psoe:1}, t:{psoe:2,erc:1,pp:1,junts:1,sumar:1},
  b:{psoe:11,pp:7,erc:5,sumar:4,junts:3,vox:2},
  m:{pp:14,psoe:9,vox:6,sumar:6,otros:2}, gu:{pp:2,psoe:1}, cu:{pp:2,psoe:1},
  to:{psoe:3,pp:2,vox:1}, cr:{psoe:2,pp:2,vox:1}, ab:{psoe:2,pp:1,vox:1},
  cs:{pp:2,psoe:2,vox:1}, v:{pp:6,psoe:4,vox:2,sumar:2,otros:1}, a:{pp:5,psoe:4,vox:2,sumar:2},
  mu:{pp:5,psoe:3,vox:2}, h:{psoe:2,pp:2,vox:1}, se:{psoe:5,pp:4,vox:2,sumar:1}, co:{psoe:3,pp:3,vox:1},
  j:{psoe:2,pp:2,vox:1}, ca:{psoe:4,pp:3,vox:1,sumar:1}, ma:{pp:5,psoe:4,vox:1,sumar:1},
  gr:{psoe:3,pp:3,vox:1}, al:{pp:3,psoe:2,vox:1}, cc:{psoe:2,pp:2}, ba:{psoe:3,pp:2,vox:1},
  pm:{pp:3,psoe:3,vox:1,sumar:1}, gc:{psoe:3,pp:2,cc:2,vox:1}, tf:{psoe:3,pp:2,cc:1,vox:1},
  ce:{pp:1}, ml:{pp:1}, te:{pp:1,psoe:1,otros:1},
}

export default function MapaProvincias({
  compact = false,
  dataset: datasetProp,
  onDatasetChange,
}: {
  compact?: boolean
  dataset?: string                    // Modo controlado: parent lleva el estado
  onDatasetChange?: (d: string) => void
}) {
  const [internalDataset, setInternalDataset] = useState<string>('estimacion')
  const dataset = datasetProp ?? internalDataset
  const setDataset = (d: string) => {
    if (onDatasetChange) onDatasetChange(d)
    else setInternalDataset(d)
  }
  const [view, setView] = useState<View>('winner')
  const [hover, setHover] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const focused = pinned || hover
  const focusedProv = focused ? PROVINCES.find(p => p.id === focused) : null

  const winners = WINNERS[dataset] || WINNERS_HIST[dataset]

  // Totales agregados por partido (suma de escaños donde el partido es ganador)
  const partyWinTotals = useMemo(() => {
    const out: Record<string, number> = {}
    PROVINCES.forEach(p => {
      const w = winners[p.id]
      if (!w) return
      out[w] = (out[w] || 0) + p.seats
    })
    return out
  }, [winners])

  const winnersOrdered = useMemo(
    () => Object.entries(partyWinTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => ({ id: id as PartyId, n, ...PARTIES[id as PartyId] })),
    [partyWinTotals]
  )


  // Layout SVG
  const cellSize = compact ? 24 : 56
  const cellGap = compact ? 2 : 6
  const cols = 10, rows = 9
  const W = cols * (cellSize + cellGap)
  const H = rows * (cellSize + cellGap) + 18

  const focusedWinner = focusedProv ? winners[focusedProv.id] : null
  const focusedParty = focusedWinner ? PARTIES[focusedWinner] : null

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #ECECEF' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>Mapa de provincias</h2>
          <p style={{ fontSize: 12, color: '#6e6e73', margin: '4px 0 0' }}>
            52 circunscripciones · {view === 'winner' ? 'color = partido más votado' : 'color = tamaño en escaños'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
              {([{k:'estimacion',label:'Est. 2026'},{k:'g2023',label:'Generales 2023'}] as const).map(o => {
                const active = dataset === o.k
                return (
                  <button key={o.k} onClick={() => { setDataset(o.k); setPinned(null); setHover(null) }} style={{
                    background: active ? '#fff' : 'transparent',
                    color: active ? '#1d1d1f' : '#6e6e73',
                    border: 'none', borderRadius: 999, padding: '5px 11px',
                    fontSize: 11.5, fontWeight: active ? 600 : 500, cursor: 'pointer',
                    fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 160ms',
                  }}>{o.label}</button>
                )
              })}
            </div>
            <select
              value={HISTORIC_KEYS.includes(dataset) ? dataset : ''}
              onChange={e => { if (e.target.value) { setDataset(e.target.value); setPinned(null); setHover(null) } }}
              style={{
                fontFamily: 'inherit', fontSize: 11.5, fontWeight: HISTORIC_KEYS.includes(dataset) ? 600 : 500,
                padding: '5px 26px 5px 11px', borderRadius: 999,
                border: '1px solid ' + (HISTORIC_KEYS.includes(dataset) ? '#1d1d1f' : '#ECECEF'),
                background: '#fff', color: HISTORIC_KEYS.includes(dataset) ? '#1d1d1f' : '#6e6e73',
                cursor: 'pointer', appearance: 'none',
                backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
              }}>
              <option value="">Históricas…</option>
              {HISTORIC_OPTIONS.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
            {VIEWS.map(o => {
              const active = view === o.k
              return (
                <button key={o.k} onClick={() => setView(o.k)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#1d1d1f' : '#6e6e73',
                  border: 'none', borderRadius: 999, padding: '5px 11px',
                  fontSize: 11.5, fontWeight: active ? 600 : 500, cursor: 'pointer',
                  fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 160ms',
                }}>{o.label}</button>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 280px', gap: 22, alignItems: 'start' }}>
        <div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
            {PROVINCES.map(p => {
              const x = p.col * (cellSize + cellGap)
              const y = p.row * (cellSize + cellGap)
              const winner = winners[p.id]
              const cellColor = colorForCell(view, winner, p.seats)
              const isFocus = focused === p.id
              const dim = focused && focused !== p.id
              return (
                <g key={p.id}
                   onMouseEnter={() => setHover(p.id)}
                   onMouseLeave={() => setHover(null)}
                   onClick={() => setPinned(pinned === p.id ? null : p.id)}
                   style={{ cursor: 'pointer' }}>
                  <rect
                    x={x} y={y} width={cellSize} height={cellSize}
                    rx="8"
                    fill={cellColor}
                    opacity={dim ? 0.22 : 1}
                    stroke={isFocus ? '#1d1d1f' : 'transparent'}
                    strokeWidth="2"
                    style={{ transition: 'opacity 180ms, fill 200ms' }}
                  />
                  <text x={x + cellSize / 2} y={y + cellSize / 2 - (compact ? 2 : 5)} textAnchor="middle"
                        fill="#fff" fontSize={compact ? 5.5 : (p.seats >= 12 ? 10 : 9)} fontWeight="600"
                        opacity={dim ? 0.6 : 0.92} style={{ pointerEvents: 'none' }}
                        textLength={cellSize - 4} lengthAdjust="spacingAndGlyphs">
                    {compact ? (p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name) : (p.name.length > 10 ? p.name.slice(0, 8) + '…' : p.name)}
                  </text>
                  <text x={x + cellSize / 2} y={y + cellSize / 2 + (compact ? 8 : 11)} textAnchor="middle"
                        fill="#fff" fontFamily="var(--font-display)" fontSize={compact ? 9 : 14} fontWeight="700"
                        opacity={dim ? 0.6 : 1} style={{ pointerEvents: 'none' }}>
                    {p.seats}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Panel de detalle en modo compact (visible al hacer click) */}
          {compact && (() => {
            const prov = focusedProv
            if (!prov) {
              return (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#FAFAFB', border: '1px solid #ECECEF', fontSize: 11.5, color: '#6e6e73', textAlign: 'center' }}>
                  Pulsa una provincia para ver su distribución de escaños
                </div>
              )
            }
            const w = winners[prov.id]
            const wParty = w ? PARTIES[w] : null
            const breakdown = getBreakdown(dataset, prov, w)
            const breakdownEntries = Object.keys(breakdown).length
              ? (Object.entries(breakdown) as Array<[PartyId, number]>).sort((a, b) => b[1] - a[1])
              : null
            return (
              <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: '#FAFAFB', border: '1px solid #ECECEF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: breakdownEntries ? 10 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f' }}>{prov.name}</span>
                    <span style={{ fontSize: 11, color: '#6e6e73' }}>· {prov.seats} escaños</span>
                  </div>
                  {wParty && w && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6e6e73' }}>
                      Ganador:
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: wParty.color }}>{partyName(dataset, w)}</span>
                    </span>
                  )}
                </div>
                {breakdownEntries ? (
                  <>
                    <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                      {breakdownEntries.map(([pid, n]) => (
                        <div key={pid} style={{ width: `${(n / prov.seats) * 100}%`, background: PARTIES[pid].color }}/>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                      {breakdownEntries.map(([pid, n]) => (
                        <span key={pid} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5 }}>
                          <span style={{ width: 9, height: 9, borderRadius: 2, background: PARTIES[pid].color }}/>
                          <span style={{ fontWeight: 600, color: '#3a3a3d' }}>{partyName(dataset, pid)}</span>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1d1d1f' }}>{n}</span>
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 10.5, color: '#86868b', textAlign: 'right' }}>
                      {pinned === prov.id ? 'Pulsa otra vez para soltar' : 'Pulsa para fijar'}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: '#86868b', marginTop: 6 }}>
                    Sin reparto disponible.
                  </div>
                )}
              </div>
            )
          })()}

          {/* Leyenda dinámica según vista */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', marginTop: 14, paddingTop: 12, borderTop: '1px solid #ECECEF' }}>
            {view === 'winner' && winnersOrdered.map(p => (
              <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#3a3a3d' }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: p.color }}/>
                <span style={{ fontWeight: 600 }}>{partyName(dataset, p.id)}</span>
                <span style={{ color: '#6e6e73' }}>· {p.n} esc · {Object.values(winners).filter(w => w === p.id).length} prov.</span>
              </span>
            ))}
            {view === 'tamano' && (
              [
                { c:'#1d1d1f', label:'≥ 20 esc' },
                { c:'#515154', label:'10-19 esc' },
                { c:'#86868b', label:'5-9 esc' },
                { c:'#C0C0C5', label:'< 5 esc' },
              ].map(t => (
                <span key={t.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#3a3a3d' }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: t.c }}/>
                  <span style={{ fontWeight: 500 }}>{t.label}</span>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Side panel detalle */}
        {!compact && <aside style={{ background: '#FAFAFB', borderRadius: 14, padding: '18px 18px 16px', border: '1px solid #ECECEF', position: 'sticky', top: 60 }}>
          {focusedProv && focusedParty ? (
            <>
              <div style={{ fontSize: 11, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Provincia</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.018em', color: '#1d1d1f', marginBottom: 12 }}>{focusedProv.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #ECECEF' }}>
                  <div style={{ fontSize: 10.5, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Escaños</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#1d1d1f' }}>{focusedProv.seats}</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #ECECEF' }}>
                  <div style={{ fontSize: 10.5, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Ganador</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: focusedParty.color, marginTop: 2 }}>{focusedWinner ? partyName(dataset, focusedWinner) : focusedParty.name}</div>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: '#6e6e73', lineHeight: 1.5 }}>
                {pinned ? 'Provincia fijada. Pulsa de nuevo para soltar.' : 'Pasa el cursor sobre otra provincia o pulsa para fijarla.'}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Resumen</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.018em', color: '#1d1d1f', marginBottom: 12 }}>{dataset === 'estimacion' ? 'Estimación 2026' : dataset === 'g2023' ? 'Generales 2023' : (HISTORIC_OPTIONS.find(o => o.k === dataset)?.label ?? dataset)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {winnersOrdered.slice(0, 5).map(p => (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '14px 1fr auto', gap: 10, alignItems: 'center' }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: p.color }}/>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#3a3a3d' }}>{partyName(dataset, p.id)}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{p.n}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: '#6e6e73', lineHeight: 1.5 }}>
                Pasa el cursor sobre cualquier provincia para ver su detalle.
              </div>
            </>
          )}
        </aside>}
      </div>
    </div>
  )
}
