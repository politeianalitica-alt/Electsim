/**
 * Utilidades de presentación para actores políticos.
 * Cero datos hardcoded — sólo helpers de UI (labels, categorías, iniciales).
 */

export type Categoria =
  | 'gobierno'
  | 'oposicion'
  | 'parlamento'
  | 'autonomico'
  | 'municipal'
  | 'institucion'
  | 'patronal'
  | 'sindicato'
  | 'mediatico'
  | 'europa'

export interface ActorVO {
  id: string
  nombre: string
  partido: string
  cargo: string
  cat: Categoria
  color: string
  ejeX: number
  ejeY: number
  val: number
  delta: number
  inf: number
  forts: string[]
  debs: string[]
  evs: string[]
  seg: { f: string; eng: string; tono: number }
}

export const CAT_LABEL: Record<Categoria, string> = {
  gobierno: 'Gobierno',
  oposicion: 'Oposición',
  parlamento: 'Parlamento',
  autonomico: 'CCAA',
  municipal: 'Ayuntamientos',
  institucion: 'Instituciones',
  patronal: 'Patronal',
  sindicato: 'Sindicatos',
  mediatico: 'Medios',
  europa: 'Europa',
}

export const CATS: Array<'Todos' | Categoria> = [
 'Todos',
 'gobierno',
 'oposicion',
 'parlamento',
 'autonomico',
 'municipal',
 'institucion',
 'patronal',
 'sindicato',
 'mediatico',
 'europa',
]

export const initials = (n: string): string =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('')
