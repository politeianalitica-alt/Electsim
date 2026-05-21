'use client'
import { useEffect, useMemo, useState } from 'react'

// Patrones electorales tipo (sesgo histórico de cada zona)
type PatternKey = 'sur' | 'centro' | 'norte_pp' | 'cataluna' | 'pais_vasco' | 'galicia' | 'levante' | 'islas' | 'navarra'

type Muni = { id: string; ccaa: string; provincia: string; municipio: string; pob: number; pattern: PatternKey }
type RawMuni = { i: string; n: string; p: string; c: string; t: PatternKey }
type RealResult = { v: Record<string, number>; t: number; c: number; p: number; b: number; n: number }
type RealData = Record<string, Record<string, RealResult>> // dataset → muniId → result

// Población aproximada para municipios sin dato real (se ajusta por seed determinista)
function inferPob(name: string): number {
  // Hash determinista que da entre ~500 y ~50.000 hab. (capitales se sobrescriben con valores reales)
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return 500 + (Math.abs(h) % 49500)
}

// Población real de las grandes ciudades (sobrescribe el inferido)
const POB_CONOCIDAS: Record<string, number> = {
 'Madrid':3324000, 'Barcelona':1660000, 'Valencia':794000, 'Sevilla':687000, 'Zaragoza':686000,
 'Málaga':579000, 'Murcia':460000, 'Palma':419000, 'Las Palmas de Gran Canaria':380000,
 'Bilbao':346000, 'Alicante':336000, 'Córdoba':323000, 'Valladolid':298000, 'Vigo':294000,
 "L'Hospitalet de Llobregat":267000, 'Gijón':268000, 'A Coruña':246000, 'Vitoria-Gasteiz':253000,
 'Granada':228000, 'Elche':234000, 'Oviedo':220000, 'Badalona':222000, 'Cartagena':217000,
 'Terrassa':226000, 'Jerez de la Frontera':213000, 'Sabadell':215000, 'Móstoles':209000,
 'Santa Cruz de Tenerife':209000, 'Pamplona/Iruña':201000, 'Almería':200000, 'Alcalá de Henares':196000,
 'Fuenlabrada':191000, 'Donostia/San Sebastián':188000, 'Burgos':174000, 'Albacete':174000,
 'Castellón de la Plana/Castelló de la Plana':170000, 'Santander':172000, 'Getafe':181000,
 'Logroño':151000, 'Badajoz':151000, 'Salamanca':144000, 'Huelva':142000, 'Marbella':152000,
 'Lleida':140000, 'Tarragona':135000, 'León':122000, 'Cádiz':113000, 'Jaén':111000,
 'Ourense':104000, 'Girona':104000, 'Lugo':98000, 'Cáceres':96000, 'Guadalajara':89000,
 'Toledo':86000, 'Ceuta':84000, 'Pontevedra':83000, 'Melilla':87000, 'Ciudad Real':75000,
 'Cuenca':54000, 'Huesca':53000, 'Teruel':35000,
}

// Lista hardcoded eliminada — ahora se carga el dataset completo del INE (8.132 municipios)
// desde /municipios.json al montar el componente.
const _MUNIS_LEGACY_UNUSED: Omit<Muni, 'id'>[] = [
  // Andalucía
  { ccaa:'Andalucía', provincia:'Sevilla',  municipio:'Sevilla',         pob:687000, pattern:'sur' },
  { ccaa:'Andalucía', provincia:'Sevilla',  municipio:'Dos Hermanas',    pob:137000, pattern:'sur' },
  { ccaa:'Andalucía', provincia:'Málaga',   municipio:'Málaga',          pob:579000, pattern:'sur' },
  { ccaa:'Andalucía', provincia:'Málaga',   municipio:'Marbella',        pob:152000, pattern:'sur' },
  { ccaa:'Andalucía', provincia:'Granada',  municipio:'Granada',         pob:228000, pattern:'sur' },
  { ccaa:'Andalucía', provincia:'Córdoba',  municipio:'Córdoba',         pob:323000, pattern:'sur' },
  { ccaa:'Andalucía', provincia:'Almería',  municipio:'Almería',         pob:200000, pattern:'sur' },
  { ccaa:'Andalucía', provincia:'Huelva',   municipio:'Huelva',          pob:142000, pattern:'sur' },
  { ccaa:'Andalucía', provincia:'Jaén',     municipio:'Jaén',            pob:111000, pattern:'sur' },
  { ccaa:'Andalucía', provincia:'Cádiz',    municipio:'Cádiz',           pob:113000, pattern:'sur' },
  { ccaa:'Andalucía', provincia:'Cádiz',    municipio:'Jerez de la Frontera', pob:213000, pattern:'sur' },
  // Aragón
  { ccaa:'Aragón',    provincia:'Zaragoza', municipio:'Zaragoza',        pob:686000, pattern:'centro' },
  { ccaa:'Aragón',    provincia:'Huesca',   municipio:'Huesca',          pob: 53000, pattern:'centro' },
  { ccaa:'Aragón',    provincia:'Teruel',   municipio:'Teruel',          pob: 35000, pattern:'centro' },
  // Asturias
  { ccaa:'Asturias',  provincia:'Asturias', municipio:'Oviedo',          pob:220000, pattern:'norte_pp' },
  { ccaa:'Asturias',  provincia:'Asturias', municipio:'Gijón',           pob:268000, pattern:'norte_pp' },
  // Baleares
  { ccaa:'Baleares',  provincia:'Baleares', municipio:'Palma',           pob:419000, pattern:'islas' },
  // Canarias
  { ccaa:'Canarias',  provincia:'Las Palmas',   municipio:'Las Palmas de Gran Canaria', pob:380000, pattern:'islas' },
  { ccaa:'Canarias',  provincia:'S.C. Tenerife',municipio:'Santa Cruz de Tenerife',     pob:209000, pattern:'islas' },
  // Cantabria
  { ccaa:'Cantabria', provincia:'Cantabria',municipio:'Santander',       pob:172000, pattern:'norte_pp' },
  // Castilla-La Mancha
  { ccaa:'Castilla-La Mancha', provincia:'Toledo',     municipio:'Toledo',     pob: 86000, pattern:'centro' },
  { ccaa:'Castilla-La Mancha', provincia:'Albacete',   municipio:'Albacete',   pob:174000, pattern:'centro' },
  { ccaa:'Castilla-La Mancha', provincia:'Ciudad Real',municipio:'Ciudad Real',pob: 75000, pattern:'centro' },
  { ccaa:'Castilla-La Mancha', provincia:'Cuenca',     municipio:'Cuenca',     pob: 54000, pattern:'centro' },
  { ccaa:'Castilla-La Mancha', provincia:'Guadalajara',municipio:'Guadalajara',pob: 89000, pattern:'centro' },
  // Castilla y León
  { ccaa:'Castilla y León', provincia:'Valladolid',municipio:'Valladolid',pob:298000, pattern:'centro' },
  { ccaa:'Castilla y León', provincia:'Burgos',    municipio:'Burgos',    pob:174000, pattern:'centro' },
  { ccaa:'Castilla y León', provincia:'Salamanca', municipio:'Salamanca', pob:144000, pattern:'centro' },
  { ccaa:'Castilla y León', provincia:'León',      municipio:'León',      pob:122000, pattern:'centro' },
  // Cataluña
  { ccaa:'Cataluña', provincia:'Barcelona',municipio:'Barcelona',           pob:1660000,pattern:'cataluna' },
  { ccaa:'Cataluña', provincia:'Barcelona',municipio:"L'Hospitalet de Llobregat",pob:267000,pattern:'cataluna' },
  { ccaa:'Cataluña', provincia:'Barcelona',municipio:'Badalona',            pob:222000, pattern:'cataluna' },
  { ccaa:'Cataluña', provincia:'Barcelona',municipio:'Terrassa',            pob:226000, pattern:'cataluna' },
  { ccaa:'Cataluña', provincia:'Girona',   municipio:'Girona',              pob:104000, pattern:'cataluna' },
  { ccaa:'Cataluña', provincia:'Lleida',   municipio:'Lleida',              pob:140000, pattern:'cataluna' },
  { ccaa:'Cataluña', provincia:'Tarragona',municipio:'Tarragona',           pob:135000, pattern:'cataluna' },
  // Extremadura
  { ccaa:'Extremadura',provincia:'Badajoz', municipio:'Badajoz',            pob:151000, pattern:'sur' },
  { ccaa:'Extremadura',provincia:'Cáceres', municipio:'Cáceres',            pob: 96000, pattern:'sur' },
  // Galicia
  { ccaa:'Galicia',   provincia:'A Coruña', municipio:'A Coruña',           pob:246000, pattern:'galicia' },
  { ccaa:'Galicia',   provincia:'Pontevedra',municipio:'Vigo',              pob:294000, pattern:'galicia' },
  { ccaa:'Galicia',   provincia:'Pontevedra',municipio:'Pontevedra',        pob: 83000, pattern:'galicia' },
  { ccaa:'Galicia',   provincia:'Lugo',     municipio:'Lugo',               pob: 98000, pattern:'galicia' },
  { ccaa:'Galicia',   provincia:'Ourense',  municipio:'Ourense',            pob:104000, pattern:'galicia' },
  // La Rioja
  { ccaa:'La Rioja',  provincia:'La Rioja', municipio:'Logroño',            pob:151000, pattern:'centro' },
  // Madrid
  { ccaa:'Madrid',    provincia:'Madrid',   municipio:'Madrid',             pob:3324000,pattern:'centro' },
  { ccaa:'Madrid',    provincia:'Madrid',   municipio:'Móstoles',           pob:209000, pattern:'centro' },
  { ccaa:'Madrid',    provincia:'Madrid',   municipio:'Alcalá de Henares',  pob:196000, pattern:'centro' },
  { ccaa:'Madrid',    provincia:'Madrid',   municipio:'Fuenlabrada',        pob:191000, pattern:'centro' },
  // Murcia
  { ccaa:'Murcia',    provincia:'Murcia',   municipio:'Murcia',             pob:460000, pattern:'levante' },
  { ccaa:'Murcia',    provincia:'Murcia',   municipio:'Cartagena',          pob:217000, pattern:'levante' },
  // Navarra
  { ccaa:'Navarra',   provincia:'Navarra',  municipio:'Pamplona',           pob:201000, pattern:'navarra' },
  // País Vasco
  { ccaa:'País Vasco',provincia:'Bizkaia',  municipio:'Bilbao',             pob:346000, pattern:'pais_vasco' },
  { ccaa:'País Vasco',provincia:'Gipuzkoa', municipio:'Donostia / S. Sebastián',pob:188000,pattern:'pais_vasco' },
  { ccaa:'País Vasco',provincia:'Álava',    municipio:'Vitoria-Gasteiz',    pob:253000, pattern:'pais_vasco' },
  // Valencia
  { ccaa:'Valencia',  provincia:'Valencia', municipio:'Valencia',           pob:794000, pattern:'levante' },
  { ccaa:'Valencia',  provincia:'Alicante', municipio:'Alicante',           pob:336000, pattern:'levante' },
  { ccaa:'Valencia',  provincia:'Castellón',municipio:'Castellón de la Plana',pob:170000,pattern:'levante' },
  // Ceuta / Melilla
  { ccaa:'Ceuta',     provincia:'Ceuta',    municipio:'Ceuta',              pob: 84000, pattern:'sur' },
  { ccaa:'Melilla',   provincia:'Melilla',  municipio:'Melilla',            pob: 87000, pattern:'sur' },
]

// Datasets con etiquetas
const DATASETS = [
  { k:'estimacion', label:'Estimación 2026', winner:'pp',   year:2026 },
  { k:'g2023',      label:'Generales 2023',  winner:'pp',   year:2023 },
  { k:'g2019',      label:'Generales 2019',  winner:'psoe', year:2019 },
  { k:'g2016',      label:'Generales 2016',  winner:'pp',   year:2016 },
  { k:'g2015',      label:'Generales 2015',  winner:'pp',   year:2015 },
  { k:'g2011',      label:'Generales 2011',  winner:'pp',   year:2011 },
  { k:'g2008',      label:'Generales 2008',  winner:'psoe', year:2008 },
  { k:'g2004',      label:'Generales 2004',  winner:'psoe', year:2004 },
  { k:'g2000',      label:'Generales 2000',  winner:'pp',   year:2000 },
  { k:'g1996',      label:'Generales 1996',  winner:'pp',   year:1996 },
  { k:'g1993',      label:'Generales 1993',  winner:'psoe', year:1993 },
  { k:'g1989',      label:'Generales 1989',  winner:'psoe', year:1989 },
  { k:'g1986',      label:'Generales 1986',  winner:'psoe', year:1986 },
  { k:'g1982',      label:'Generales 1982',  winner:'psoe', year:1982 },
  { k:'g1979',      label:'Generales 1979',  winner:'ucd',  year:1979 },
  { k:'g1977',      label:'Generales 1977',  winner:'ucd',  year:1977 },
] as const
const HISTORIC_KEYS = DATASETS.filter(d => !['estimacion','g2023'].includes(d.k)).map(d => d.k) as readonly string[]

const PARTY_COLOR: Record<string, string> = {
  pp:'#1F4E8C', psoe:'#E1322D', vox:'#5BA02E', sumar:'#D43F8D',
  erc:'#E8A030', junts:'#1FA89B', pnv:'#7DB94B', bildu:'#3F7A3A',
  cc:'#F2C43A', bng:'#5BB3D9', upn:'#0E7D8C', ucd:'#F2A825', ciu:'#0091C8',
  otros:'#9E9E9E',
}

// Para cada elección, qué partidos son relevantes y nombres con que se presentaron
function partiesForYear(year: number): Array<{ id: string; label: string }> {
  if (year >= 2023) return [{id:'pp',label:'PP'},{id:'psoe',label:'PSOE'},{id:'vox',label:'VOX'},{id:'sumar',label:'Sumar'},{id:'otros',label:'Otros'}]
  if (year >= 2019) return [{id:'psoe',label:'PSOE'},{id:'pp',label:'PP'},{id:'vox',label:'VOX'},{id:'sumar',label:'UP'},{id:'otros',label:'Cs'}]
  if (year >= 2016) return [{id:'pp',label:'PP'},{id:'psoe',label:'PSOE'},{id:'sumar',label:'UP'},{id:'otros',label:'Cs'}]
  if (year >= 2015) return [{id:'pp',label:'PP'},{id:'psoe',label:'PSOE'},{id:'sumar',label:'Podemos'},{id:'otros',label:'Cs'}]
  if (year >= 2008) return [{id:'pp',label:'PP'},{id:'psoe',label:'PSOE'},{id:'sumar',label:'IU'},{id:'otros',label:'Otros'}]
  if (year >= 1996) return [{id:'pp',label:'PP'},{id:'psoe',label:'PSOE'},{id:'sumar',label:'IU'},{id:'otros',label:'Otros'}]
  if (year >= 1989) return [{id:'psoe',label:'PSOE'},{id:'pp',label:'PP'},{id:'sumar',label:'IU'},{id:'otros',label:'CDS'}]
  if (year >= 1986) return [{id:'psoe',label:'PSOE'},{id:'pp',label:'AP'},{id:'sumar',label:'IU'},{id:'otros',label:'CDS'}]
  if (year >= 1982) return [{id:'psoe',label:'PSOE'},{id:'pp',label:'AP-PDP'},{id:'sumar',label:'PCE'},{id:'ucd',label:'UCD'}]
  if (year >= 1979) return [{id:'ucd',label:'UCD'},{id:'psoe',label:'PSOE'},{id:'sumar',label:'PCE'},{id:'pp',label:'CD'}]
  return [{id:'ucd',label:'UCD'},{id:'psoe',label:'PSOE'},{id:'sumar',label:'PCE'},{id:'pp',label:'AP'}]
}

// Pesos base (reparto típico) por patrón regional. En %.
const BASE_WEIGHTS: Record<PatternKey, Record<string, number>> = {
  sur:        { psoe:38, pp:32, vox:13, sumar:11, otros:6 },
  centro:     { pp:40, psoe:28, vox:14, sumar:10, otros:8 },
  norte_pp:   { pp:36, psoe:30, vox:11, sumar:13, otros:10 },
  cataluna:   { psoe:30, sumar:14, junts:13, erc:14, pp:14, vox:7, otros:8 },
  pais_vasco: { pnv:30, psoe:23, bildu:21, pp:13, sumar:8, vox:5 },
  galicia:    { pp:43, psoe:26, sumar:11, bng:13, vox:7 },
  levante:    { pp:36, psoe:26, vox:16, sumar:11, otros:11 },
  islas:      { psoe:32, pp:30, cc:16, vox:11, sumar:11 },
  navarra:    { psoe:24, pp:20, upn:18, bildu:16, sumar:12, vox:10 },
}

// Modificadores históricos (qué partidos están "vivos" cada año, cuotas distintas)
function historicAdjust(year: number, base: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  if (year >= 2023) {
    out.pp = base.pp ?? 0; out.psoe = base.psoe ?? 0
    out.vox = base.vox ?? 0; out.sumar = base.sumar ?? 0
    out.otros = base.otros ?? 0
    if (base.junts) out.junts = base.junts
    if (base.erc) out.erc = base.erc
    if (base.pnv) out.pnv = base.pnv
    if (base.bildu) out.bildu = base.bildu
    if (base.bng) out.bng = base.bng
    if (base.cc) out.cc = base.cc
    if (base.upn) out.upn = base.upn
  } else if (year >= 2019) {
    out.psoe = (base.psoe ?? 0) + 4
    out.pp = (base.pp ?? 0) - 8
    out.vox = base.vox ?? 0
    out.sumar = base.sumar ?? 0
    out.otros = (base.otros ?? 0) + 8 // Cs
    if (base.junts) out.junts = base.junts
    if (base.erc) out.erc = base.erc
    if (base.pnv) out.pnv = base.pnv
    if (base.bildu) out.bildu = base.bildu
    if (base.bng) out.bng = base.bng
    if (base.cc) out.cc = base.cc
    if (base.upn) out.upn = base.upn
  } else if (year >= 2015) {
    // Sumar = Podemos
    out.pp = (base.pp ?? 0) - 6
    out.psoe = (base.psoe ?? 0) - 8
    out.sumar = (base.sumar ?? 0) + 12 // Podemos era +
    out.otros = (base.otros ?? 0) + 14 // Cs
    if (base.junts) out.junts = base.junts
    if (base.erc) out.erc = base.erc
    if (base.pnv) out.pnv = base.pnv
    if (base.bildu) out.bildu = base.bildu
    if (base.bng) out.bng = base.bng
    if (base.cc) out.cc = base.cc
  } else if (year >= 2008) {
    // Bipartidismo PP-PSOE, sin VOX, sin Cs, sin Sumar fuerte
    out.pp = (base.pp ?? 0) + 4
    out.psoe = (base.psoe ?? 0) + 4
    out.sumar = Math.max(2, (base.sumar ?? 0) - 4) // IU residual
    if (base.junts || base.erc) out.ciu = (base.junts ?? 0) + (base.erc ?? 0) - 6
    if (base.pnv) out.pnv = base.pnv
    if (base.bildu) out.bildu = base.bildu
    if (base.bng) out.bng = base.bng
    if (base.cc) out.cc = base.cc
  } else if (year >= 1996) {
    out.pp = (base.pp ?? 0) + 6
    out.psoe = (base.psoe ?? 0) + 6
    out.sumar = base.sumar ?? 0
    if (base.junts || base.erc) out.ciu = ((base.junts ?? 0) + (base.erc ?? 0)) * 0.7
    if (base.pnv) out.pnv = base.pnv
    if (base.bildu) out.bildu = (base.bildu ?? 0) * 0.6
    if (base.bng) out.bng = base.bng
  } else if (year >= 1986) {
    // PSOE arrasaba
    out.psoe = (base.psoe ?? 0) + 12
    out.pp = (base.pp ?? 0) - 4 // AP era menor
    out.sumar = base.sumar ?? 0 // IU
    out.otros = 8 // CDS
    if (base.junts || base.erc) out.ciu = ((base.junts ?? 0) + (base.erc ?? 0)) * 0.7
    if (base.pnv) out.pnv = base.pnv
  } else if (year >= 1982) {
    // PSOE 48%
    out.psoe = (base.psoe ?? 0) + 18
    out.pp = (base.pp ?? 0) // AP-PDP
    out.sumar = (base.sumar ?? 0) - 6 // PCE bajó
    out.ucd = 8
    if (base.junts || base.erc) out.ciu = ((base.junts ?? 0) + (base.erc ?? 0)) * 0.6
    if (base.pnv) out.pnv = base.pnv
  } else {
    // 1977, 1979 — UCD ganaba
    out.ucd = 35
    out.psoe = (base.psoe ?? 0) - 4
    out.sumar = 9 // PCE
    out.pp = year >= 1979 ? 7 : 8 // CD/AP
    if (base.junts || base.erc) out.ciu = ((base.junts ?? 0) + (base.erc ?? 0)) * 0.5
    if (base.pnv) out.pnv = base.pnv
  }
  // Limpiar negativos / cero
  for (const k of Object.keys(out)) if (out[k] <= 0.5) delete out[k]
  return out
}

// Hash determinista para variar resultados por municipio
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// Mapeo dataset (componente) → key del JSON de votos reales
const REAL_KEY: Record<string, string> = {
  g2023: 'g2023', g2019: 'g2019b', g2016: 'g2016', g2015: 'g2015',
  g2011: 'g2011', g2008: 'g2008', g2004: 'g2004', g2000: 'g2000',
  g1996: 'g1996', g1986: 'g1986', g1982: 'g1982', g1979: 'g1979', g1977: 'g1977',
  // estimacion, g2019 abr (g2019a), g1989, g1993 no tienen entrada → caen a sintético
}

function realResults(muni: Muni, dataset: string, realData: RealData) {
  const key = REAL_KEY[dataset]
  if (!key) return null
  const r = realData[key]?.[muni.id]
  if (!r) return null
  const items = Object.entries(r.v)
    .filter(([, votos]) => votos > 0)
    .map(([pid, votos]) => ({ pid, votos, pct: +(votos / r.t * 100).toFixed(1) }))
    .sort((a, b) => b.votos - a.votos)
  const turnout = r.c > 0 ? +((r.p / r.c) * 100).toFixed(1) : null
  return { items, totalVotos: r.t, censo: r.c, turnout, real: true as const }
}

// Calcula resultados (% y votos absolutos) para un municipio en una elección
function getResults(muni: Muni, dataset: string) {
  const ds = DATASETS.find(d => d.k === dataset)!
  const baseRaw = BASE_WEIGHTS[muni.pattern]
  const adjusted = historicAdjust(ds.year, baseRaw)
  // Variación local determinista (-3..+3 pp por partido)
  const seed = hash(muni.municipio + ds.k)
  const noisy: Record<string, number> = {}
  let i = 0
  for (const [pid, pct] of Object.entries(adjusted)) {
    const drift = ((seed >> (i * 3)) & 7) - 3 // -3..+4
    noisy[pid] = Math.max(0.5, pct + drift * 0.5)
    i++
  }
  // Normalizar a 100
  const tot = Object.values(noisy).reduce((s, v) => s + v, 0)
  const normalized: Record<string, number> = {}
  for (const k of Object.keys(noisy)) normalized[k] = (noisy[k] / tot) * 100
  // Participación 65-78%
  const turnout = 65 + ((seed >> 5) % 14)
  const censo = Math.round(muni.pob * 0.85) // votantes inscritos aprox.
  const votos = Math.round(censo * turnout / 100)
  const out = Object.entries(normalized)
    .map(([pid, pct]) => ({ pid, pct: +pct.toFixed(1), votos: Math.round(votos * pct / 100) }))
    .sort((a, b) => b.pct - a.pct)
  return { items: out, totalVotos: votos, censo, turnout: +turnout.toFixed(1) }
}

export default function MunicipiosHistorico() {
  const [dataset, setDataset] = useState<string>('estimacion')
  const [allMunis, setAllMunis] = useState<Muni[]>([])
  const [realData, setRealData] = useState<RealData>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/municipios.json').then(r => r.json() as Promise<RawMuni[]>),
      fetch('/votos-municipios.json').then(r => r.json() as Promise<RealData>).catch(() => ({})),
    ]).then(([raw, real]) => {
      const list: Muni[] = raw.map(m => ({
        id: m.i, ccaa: m.c, provincia: m.p, municipio: m.n, pattern: m.t,
        pob: POB_CONOCIDAS[m.n] ?? inferPob(m.n + m.p),
      }))
      setAllMunis(list)
      setRealData(real)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Cascada de selectores
  const ccaas = useMemo(() => Array.from(new Set(allMunis.map(m => m.ccaa))).sort((a, b) => a.localeCompare(b, 'es')), [allMunis])
  const [ccaa, setCcaa] = useState<string>('Madrid')
  const provincias = useMemo(() => Array.from(new Set(allMunis.filter(m => m.ccaa === ccaa).map(m => m.provincia))).sort((a, b) => a.localeCompare(b, 'es')), [ccaa, allMunis])
  const [provincia, setProvincia] = useState<string>('Madrid')
  const munis = useMemo(() => allMunis.filter(m => m.ccaa === ccaa && m.provincia === provincia).sort((a, b) => b.pob - a.pob || a.municipio.localeCompare(b.municipio, 'es')), [ccaa, provincia, allMunis])
  const [municipio, setMunicipio] = useState<string>('Madrid')

  // Mantener consistencia tras cambio de CCAA / Provincia
  const safeProv = provincias.includes(provincia) ? provincia : (provincias[0] ?? '')
  const safeMuni = useMemo(() => {
    const list = allMunis.filter(m => m.ccaa === ccaa && m.provincia === safeProv)
    return list.find(m => m.municipio === municipio) ? municipio : (list[0]?.municipio ?? '')
  }, [ccaa, safeProv, municipio, allMunis])

  const muni = useMemo(() => allMunis.find(m => m.ccaa === ccaa && m.provincia === safeProv && m.municipio === safeMuni), [ccaa, safeProv, safeMuni, allMunis])
  const ds = DATASETS.find(d => d.k === dataset)!
  const res = useMemo(() => {
    if (!muni) return null
    const real = realResults(muni, dataset, realData)
    if (real) return real
    return { ...getResults(muni, dataset), real: false as const, turnout: getResults(muni, dataset).turnout as number | null }
  }, [muni, dataset, realData])
  const partyLabels = useMemo(() => {
    const map: Record<string, string> = {}
    partiesForYear(ds.year).forEach(p => { map[p.id] = p.label })
    // Partidos extra (regionales) que no están en la lista base
    const extras: Record<string, string> = {
      junts: ds.year >= 2017 ? 'Junts' : ds.year >= 1979 ? 'CiU' : 'PDC',
      ciu: 'CiU', erc:'ERC', pnv:'PNV', bildu: ds.year >= 2011 ? 'EH Bildu' : 'HB',
      bng:'BNG', cc: ds.year >= 1989 ? 'CC' : 'AIC', upn:'UPN',
    }
    return { ...extras, ...map }
  }, [ds])

  const labelOf = (pid: string) => partyLabels[pid] || pid.toUpperCase()

  return (
 <div style={{ background: '#fff', borderRadius: 20, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #ECECEF' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>Resultados por municipio</h2>
 <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
 <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 2 }}>
            {([{k:'estimacion',label:'Est. 2026'},{k:'g2023',label:'2023'}] as const).map(o => {
              const active = dataset === o.k
              return (
 <button key={o.k} onClick={() => setDataset(o.k)} style={{
                  background: active ? '#fff' : 'transparent', color: active ? '#1d1d1f' : '#6e6e73',
                  border: 'none', borderRadius: 999, padding: '5px 11px', fontSize: 11.5,
                  fontWeight: active ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 160ms',
                }}>{o.label}</button>
              )
            })}
 </div>
 <select
            value={HISTORIC_KEYS.includes(dataset) ? dataset : ''}
            onChange={e => { if (e.target.value) setDataset(e.target.value) }}
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
            {DATASETS.filter(d => HISTORIC_KEYS.includes(d.k)).map(d => (
 <option key={d.k} value={d.k}>{d.label}</option>
            ))}
 </select>
 </div>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 6, marginBottom: 12 }}>
 <select value={ccaa} onChange={e => setCcaa(e.target.value)} style={selectStyle}>
          {ccaas.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 <select value={safeProv} onChange={e => { setProvincia(e.target.value) }} style={selectStyle}>
          {provincias.map(p => <option key={p} value={p}>{p}</option>)}
 </select>
 <select value={safeMuni} onChange={e => setMunicipio(e.target.value)} style={selectStyle}>
          {munis.map(m => <option key={m.municipio} value={m.municipio}>{m.municipio}</option>)}
 </select>
 </div>

      {loading ? (
 <div style={{ fontSize: 12, color: '#6e6e73', padding: 20, textAlign: 'center' }}>
          Cargando 8.132 municipios…
 </div>
      ) : muni && res ? (
 <>
          {/* Header con nombre + badges */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
 <div style={{ minWidth: 0, flex: 1 }}>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, letterSpacing: '-0.014em', color: '#1d1d1f', lineHeight: 1.15 }}>{muni.municipio}</div>
 <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
 <span>{ds.label}</span>
 <span style={{ color: '#d2d2d7' }}>·</span>
 <span>{muni.pob.toLocaleString('es')} hab.</span>
                {res.turnout != null && (<><span style={{ color: '#d2d2d7' }}>·</span><span>part. {res.turnout}%</span></>)}
                {res.real ? (
 <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(22,163,74,0.12)', color: '#16A34A', letterSpacing: '0.06em' }}>OFICIALES</span>
                ) : (
 <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(217,119,6,0.12)', color: '#D97706', letterSpacing: '0.06em' }}>ESTIMADOS</span>
                )}
 </div>
 </div>
 </div>

          {/* Banner ganador — grande y dinámico */}
          {res.items[0] && (
 <div key={`${muni.id}-${dataset}-winner`} style={{
              display:'grid', gridTemplateColumns:'1fr auto', gap:14, alignItems:'center',
              padding:'14px 16px', borderRadius:14, marginBottom:12,
              background:`linear-gradient(135deg, ${PARTY_COLOR[res.items[0].pid] || '#ccc'} 0%, ${PARTY_COLOR[res.items[0].pid] || '#ccc'}d0 100%)`,
              color:'#fff', boxShadow:`0 6px 18px -6px ${PARTY_COLOR[res.items[0].pid] || '#000'}80`,
              animation:'winnerFade 320ms ease-out',
            }}>
 <div style={{ minWidth:0 }}>
 <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', opacity:0.7, marginBottom:2 }}>Ganador</div>
 <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, letterSpacing:'-0.022em', lineHeight:1 }}>{labelOf(res.items[0].pid)}</div>
 <div style={{ fontSize:11, opacity:0.85, marginTop:4 }}>{res.items[0].votos.toLocaleString('es')} votos</div>
 </div>
 <div style={{ textAlign:'right' }}>
 <div style={{ fontFamily:'var(--font-display)', fontSize:38, fontWeight:700, letterSpacing:'-0.03em', lineHeight:1 }}>{res.items[0].pct}<span style={{ fontSize:18, opacity:0.8 }}>%</span></div>
                {res.items[1] && (
 <div style={{ fontSize:10, opacity:0.75, marginTop:4 }}>+{(res.items[0].pct - res.items[1].pct).toFixed(1)} pp sobre {labelOf(res.items[1].pid)}</div>
                )}
 </div>
 </div>
          )}

          {/* Resto de partidos — barras grandes */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {res.items.slice(1).map(it => (
 <div key={`${muni.id}-${dataset}-${it.pid}`} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 56px 78px', gap: 10, alignItems: 'center', animation: 'rowFade 280ms ease-out' }}>
 <span style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
 <span style={{ width: 11, height: 11, borderRadius: 3, background: PARTY_COLOR[it.pid] || '#ccc', flexShrink: 0 }}/>
 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelOf(it.pid)}</span>
 </span>
 <div style={{ height: 18, background: '#F5F5F7', borderRadius: 5, overflow: 'hidden', position:'relative' }}>
 <div style={{
                    width: `${Math.min(100, (it.pct / Math.max(1, res.items[0].pct)) * 100)}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${PARTY_COLOR[it.pid] || '#ccc'} 0%, ${PARTY_COLOR[it.pid] || '#ccc'}cc 100%)`,
                    borderRadius: 5,
                    transition: 'width 320ms cubic-bezier(.2,.8,.2,1)',
                  }}/>
 </div>
 <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: PARTY_COLOR[it.pid] || '#3a3a3d', textAlign: 'right', letterSpacing: '-0.01em' }}>{it.pct}%</span>
 <span style={{ fontSize: 11, color: '#6e6e73', textAlign: 'right', fontVariantNumeric:'tabular-nums' }}>{it.votos.toLocaleString('es')}</span>
 </div>
            ))}
 </div>

          {/* Footer */}
 <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #ECECEF', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
 <div style={{ fontSize: 10.5, color: '#86868b' }}>
              {res.real
                ? 'Fuente: Ministerio del Interior · 156 ciudades cubiertas (1977-2023).'
                : 'Datos estimados · municipio no incluido en el dataset oficial.'}
 </div>
 <div style={{ fontSize: 11, color: '#3a3a3d' }}>
 <span style={{ color:'#86868b' }}>Total votos: </span>
 <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{res.totalVotos.toLocaleString('es')}</span>
 </div>
 </div>

 <style>{`
            @keyframes winnerFade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
            @keyframes rowFade { from { opacity: 0; transform: translateX(-3px); } to { opacity: 1; transform: none; } }
 `}</style>
 </>
      ) : (
 <div style={{ fontSize: 12, color: '#6e6e73', padding: 20, textAlign: 'center' }}>
          Selecciona CCAA, provincia y municipio.
 </div>
      )}
 </div>
  )
}

const selectStyle: React.CSSProperties = {
  fontFamily: 'inherit', fontSize: 11.5, fontWeight: 500,
  padding: '6px 22px 6px 10px', borderRadius: 8,
  border: '1px solid #ECECEF', background: '#fff', color: '#1d1d1f',
  cursor: 'pointer', appearance: 'none',
  backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center',
  width: '100%',
}
