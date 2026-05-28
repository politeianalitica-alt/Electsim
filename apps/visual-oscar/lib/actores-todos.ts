/**
 * actores-todos.ts · catálogo UNIFICADO de actores para el mapa y el grafo.
 *
 * Fusiona el catálogo curado ACTORES (con coordenadas ideológicas reales) con
 * TODAS las personas de los dossiers (IBEX 35, poder no-electo, Congreso,
 * Senado, diputaciones, medios y los ~3.340 políticos del fixture). A los que
 * no tienen coordenadas se les derivan a partir del partido/grupo + jitter por
 * nombre, igual que hace data/actores-fixture.ts.
 *
 * Dedupe por nombre normalizado · gana ACTORES (coords curadas).
 */
import { ACTORES } from './actores'
import type { Actor, Categoria } from '@/data/actores-fixture'
import { IBEX35_FIXTURE } from '@/data/ibex35-fixture'
import { PODER_FIXTURE } from '@/data/poder-fixture'
import { DIPUTACIONES_FIXTURE } from '@/data/diputaciones-fixture'
import { MEDIOS_FIXTURE } from '@/data/medios-fixture'
import { CONGRESO_FIXTURE } from '@/data/congreso-fixture'
import { SENADO_FIXTURE } from '@/data/senado-fixture'
import { DOSIERES_FIXTURE } from '@/data/dosieres-fixture'
import type { DossierCompleto } from '@/data/dosieres-fixture'

const norm = (s: string): string =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

// Posición ideológica base por partido/grupo (espejo de actores-fixture).
const POS_BASE: Record<string, [number, number]> = {
  PSOE: [-22, 12], PSC: [-15, -35], 'PSC-PSOE': [-15, -35], 'PSE-EE': [-18, -45],
  PP: [38, -12], VOX: [78, 60], Sumar: [-58, -18], Podemos: [-65, -10],
  Junts: [12, -88], JxCat: [12, -88], ERC: [-32, -78], 'EH Bildu': [-62, -65],
  PNV: [10, -72], 'EAJ-PNV': [10, -72], BNG: [-50, -60], CC: [8, -45], UPN: [38, -38],
  'CCa': [8, -45], Compromís: [-42, -30], CUP: [-70, -80],
  'Casa Real': [5, 75], CGPJ: [5, 50], TC: [0, 55], Fiscalía: [0, 50],
  BdE: [25, 60], BEI: [10, 85], BCE: [15, 80], CEOE: [38, 35], CEPYME: [30, 30],
  CCOO: [-45, 20], UGT: [-45, 20], Medios: [0, 40], Independiente: [0, 30],
}
const PARTY_COLOR: Record<string, string> = {
  PSOE: '#E1322D', PSC: '#E1322D', PP: '#1F4E8C', VOX: '#5BB033', Sumar: '#E51C55',
  Podemos: '#6A1B7A', ERC: '#FFB232', 'EH Bildu': '#0EA37A', PNV: '#1B7A3D',
  'EAJ-PNV': '#1B7A3D', Junts: '#00C3B2', BNG: '#6FB7E9', CC: '#FFD200', UPN: '#0072CE',
}
const catFromTags = (tags: string[]): Categoria => {
  const t = (tags || []).map((x) => x.toLowerCase())
  const has = (...k: string[]) => k.some((x) => t.includes(x))
  if (has('medio', 'medios', 'periodista', 'tertuliano')) return 'mediatico'
  if (has('sindical', 'sindicato')) return 'sindicato'
  if (has('patronal', 'lobby', 'think-tank', 'empresa-familiar')) return 'patronal'
  if (has('union-europea', 'comision-europea', 'bce', 'bei')) return 'europa'
  if (has('regulador', 'institucional', 'iglesia', 'casa-real', 'monarquia', 'sepi', 'cnmv', 'airef', 'consejo-de-estado', 'rae', 'judicial', 'fiscalia', 'poder-judicial')) return 'institucion'
  if (has('empresario', 'empresaria', 'ibex', 'ibex35', 'fondo', 'inversion', 'banca', 'despacho', 'seguros', 'dinastia', 'holding', 'directivo', 'ceo')) return 'patronal'
  if (has('senado', 'senador')) return 'parlamento'
  if (has('diputado-congreso', 'congreso')) return 'parlamento'
  if (has('diputacion', 'presidente-diputacion', 'presidente-junta')) return 'autonomico'
  if (has('alcalde', 'concejal', 'municipal')) return 'municipal'
  return 'parlamento'
}
const hash = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function buildFromDossier(d: DossierCompleto, baseInf: number): Actor {
  const partido = d.partido || 'Independiente'
  const cat = catFromTags(d.tags || [])
  const [bx, by] = POS_BASE[partido] ?? (
    cat === 'institucion' ? [0, 55] : cat === 'patronal' ? [30, 30] :
    cat === 'mediatico' ? [0, 40] : cat === 'sindicato' ? [-45, 20] : [0, 0]
  )
  const h = hash(d.slug)
  const ejeX = Math.max(-100, Math.min(100, bx + (((h % 25) - 12))))
  const ejeY = Math.max(-100, Math.min(100, by + ((((h >> 5) % 25) - 12))))
  return {
    id: d.slug,
    nombre: d.nombre_completo,
    partido,
    cargo: d.cargo_actual || '',
    cat,
    color: PARTY_COLOR[partido] || '#6e6e73',
    ejeX, ejeY,
    val: 5, delta: 0, inf: baseInf,
    forts: [], debs: [], evs: [],
    seg: { f: '', eng: '', tono: 0 },
  }
}

// Cada fuente con una influencia base (para el orden cuando se recorta el render).
const FUENTES: Array<[DossierCompleto[], number]> = [
  [IBEX35_FIXTURE as unknown as DossierCompleto[], 58],
  [PODER_FIXTURE as unknown as DossierCompleto[], 60],
  [MEDIOS_FIXTURE as unknown as DossierCompleto[], 54],
  [CONGRESO_FIXTURE as unknown as DossierCompleto[], 46],
  [SENADO_FIXTURE as unknown as DossierCompleto[], 44],
  [DIPUTACIONES_FIXTURE as unknown as DossierCompleto[], 45],
  [DOSIERES_FIXTURE, 40],
]

function build(): Actor[] {
  const out: Actor[] = [...ACTORES]
  const seen = new Set(out.map((a) => norm(a.nombre)))
  for (const [fixture, inf] of FUENTES) {
    for (const d of fixture) {
      const key = norm(d.nombre_completo)
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(buildFromDossier(d, inf))
    }
  }
  return out
}

export const ACTORES_TODOS: Actor[] = build()
