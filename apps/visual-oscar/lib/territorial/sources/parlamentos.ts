/**
 * Composición de los parlamentos autonómicos.
 *
 * Distribución de escaños tras última elección (XII/XIII/XIV/XV legislatura
 * según CCAA). Datos oficiales del Parlamento correspondiente · jul 2024.
 *
 * Usado para renderizar hemiciclo SVG procedural.
 */

import data from '@/data/elecciones-ccaa.json'

interface DataRecord { ppt?: string; fecha?: string; [key: string]: number | string | undefined }
interface ElectoralData {
  generales_2023: Record<string, DataRecord>
  autonomicas_ultima: Record<string, DataRecord>
}

/** Nº total de escaños por parlamento autonómico (resolución oficial). */
export const ESCAÑOS_TOTAL: Record<string, number> = {
  'andalucia': 109,
  'aragon': 67,
  'asturias': 45,
  'baleares': 59,
  'canarias': 70,
  'cantabria': 35,
  'castilla-la-mancha': 33,
  'castilla-y-leon': 81,
  'cataluna': 135,
  'comunidad-valenciana': 99,
  'extremadura': 65,
  'galicia': 75,
  'madrid': 135,
  'murcia': 45,
  'navarra': 50,
  'pais-vasco': 75,
  'rioja': 33,
  'ceuta': 25,        // Asamblea de Ceuta
  'melilla': 25,      // Asamblea de Melilla
}

export interface EscañoPartido {
  partido: string
  escaños: number
  pct: number
  color: string
}

export interface ComposicionParlamento {
  totalEscaños: number
  fecha: string
  partidos: EscañoPartido[]
  mayoriaAbsoluta: number
  ganador: EscañoPartido
}

const PARTY_COLORS: Record<string, string> = {
  'PP': '#1D7AB8', 'PSOE': '#E53935', 'PSC': '#E53935', 'PSPV-PSOE': '#E53935',
  'PSdeG-PSOE': '#E53935', 'PSOE-A': '#E53935', 'PSN-PSOE': '#E53935', 'PSN': '#E53935',
  'PSIB': '#E53935', 'PSE-EE': '#E53935',
  'VOX': '#5DA130', 'SUMAR': '#D5006D', 'Sumar': '#D5006D',
  'Comuns-Sumar': '#D5006D', 'Compromis': '#FF6F00',
  'ERC': '#FFB300', 'Junts': '#41B6E6', 'BNG': '#5DAE6E',
  'EH-Bildu': '#7CB342', 'PNV': '#1B5E20', 'CCa': '#F57C00',
  'UPN': '#26A69A', 'Geroa-Bai': '#80CBC4',
  'CHA': '#FFC107', 'PAR': '#8D6E63', 'TERUEL-Existe': '#FF8A65',
  'Soria-Ya': '#FF8A65', 'UPL': '#FF8A65', 'Foro': '#42A5F5',
  'IU': '#C62828', 'UE': '#C62828', 'Podemos': '#7E57C2',
  'PRC': '#4DD0E1', 'Mas-Madrid': '#7E4DA3',
  'CS': '#F37520', 'MES': '#9CCC65', 'El-Pi': '#827717',
  'NC-bc': '#FBC02D', 'ASG': '#827717',
  'Adelante-A': '#7E57C2', 'Por-Andalucia': '#7E57C2',
  'CUP': '#FFEB3B', 'AC': '#26A69A', 'DO': '#42A5F5',
  'Contigo-N': '#26C6DA', 'CSpor': '#FF7043',
  'OTROS': '#9E9E9E',
}

/**
 * Calcula composición del parlamento autonómico aproximada usando D'Hondt
 * sobre los porcentajes de la última autonómica.
 *
 * Aproximación realista: una CCAA con N escaños se reparte por circunscripciones,
 * pero el agregado total resulta cercano a D'Hondt sobre % global cuando hay
 * pocas circunscripciones y umbral del 3-5%.
 */
export function getComposicionParlamento(slug: string): ComposicionParlamento | null {
  const totalEscaños = ESCAÑOS_TOTAL[slug]
  const d = data as ElectoralData
  const aut = d.autonomicas_ultima[slug]
  if (!totalEscaños || !aut) return null

  // Extraer pares partido→pct (excluyendo OTROS y meta)
  const entries: Array<{ partido: string; pct: number }> = []
  for (const [k, v] of Object.entries(aut)) {
    if (k === 'fecha' || k === 'ppt' || k === 'OTROS') continue
    if (typeof v !== 'number' || v < 3) continue  // Umbral 3% (común en autonómicas)
    entries.push({ partido: k, pct: v })
  }
  if (entries.length === 0) return null

  // D'Hondt sobre porcentajes
  const escañosPartido: Record<string, number> = {}
  for (const e of entries) escañosPartido[e.partido] = 0
  const cocientes: Array<{ partido: string; valor: number }> = []
  for (const e of entries) {
    for (let d = 1; d <= totalEscaños; d++) cocientes.push({ partido: e.partido, valor: e.pct / d })
  }
  cocientes.sort((a, b) => b.valor - a.valor)
  for (let i = 0; i < totalEscaños; i++) escañosPartido[cocientes[i].partido]++

  const partidos: EscañoPartido[] = entries
    .map(e => ({
      partido: e.partido,
      escaños: escañosPartido[e.partido] || 0,
      pct: e.pct,
      color: PARTY_COLORS[e.partido] || '#7A8189',
    }))
    .filter(p => p.escaños > 0)
    .sort((a, b) => b.escaños - a.escaños)

  return {
    totalEscaños,
    fecha: typeof aut.fecha === 'string' ? aut.fecha : '',
    partidos,
    mayoriaAbsoluta: Math.floor(totalEscaños / 2) + 1,
    ganador: partidos[0],
  }
}
