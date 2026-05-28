/**
 * grafo-dosieres.ts · nodos y relaciones del grafo a partir de TODOS los
 * dossiers curados nuevos (IBEX 35, poder no-electo, diputaciones), no solo
 * del fixture de políticos.
 *
 * Cada dossier con apartado "redes" aporta:
 *   · un NODO (el sujeto) si participa en alguna relación,
 *   · ARISTAS hacia los destinos de sus items de red (resueltos por slug o por
 *     nombre normalizado contra el propio conjunto + el catálogo ACTORES).
 *
 * La nota Feijóo (+N/10) del contenido se convierte en val (-100..100) y tipo.
 * Devuelve además getDossierAny() para que la barra lateral muestre la ficha
 * completa al clicar un nodo (busca en todos los fixtures).
 */
import type { RelacionExplicita, TipoRelacion } from './relaciones-explicitas'
import type { DossierCompleto } from '@/data/dosieres-fixture'
import { IBEX35_FIXTURE, getIBXBySlug } from '@/data/ibex35-fixture'
import { PODER_FIXTURE, getPODBySlug } from '@/data/poder-fixture'
import { DIPUTACIONES_FIXTURE, getDIPBySlug } from '@/data/diputaciones-fixture'
import { getCONGBySlug } from '@/data/congreso-fixture'
import { getSENBySlug } from '@/data/senado-fixture'
import { getDossierBySlug } from '@/data/dosieres-fixture'
import { ACTORES } from './actores'

export interface GrafoActor {
  id: string
  nombre: string
  partido?: string
  cargo?: string
  cat?: string
  inf?: number
}

const norm = (s: string): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isSlug = (s: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(s.trim())

function extractNota(contenido: string): number | null {
  const m = contenido.match(/nota\s*([+\-]?\d+)\s*\/\s*10/i)
  return m ? parseInt(m[1], 10) : null
}

function tipoFromNota(nota: number): TipoRelacion {
  if (nota >= 7) return 'aliado_partido'
  if (nota >= 3) return 'pacto_investidura'
  if (nota >= 0) return 'mediador'
  if (nota >= -4) return 'critica_publica'
  return 'oposicion_frontal'
}

// Mapea tipo/tags del dossier a categoría de color del grafo.
function catFromTags(tags: string[]): string {
  const t = tags.map((x) => x.toLowerCase())
  const has = (...k: string[]) => k.some((x) => t.includes(x))
  if (has('medio', 'medios', 'periodista', 'tertuliano')) return 'mediatico'
  if (has('sindical', 'sindicato')) return 'sindicato'
  if (has('patronal', 'lobby', 'think-tank', 'empresa-familiar')) return 'patronal'
  if (has('regulador', 'institucional', 'iglesia', 'bce', 'sepi', 'cnmv', 'airef', 'consejo-de-estado', 'rae')) return 'institucion'
  if (has('union-europea', 'comision-europea', 'internacional', 'bei')) return 'europa'
  if (has('casa-real', 'monarquia')) return 'institucion'
  if (has('empresario', 'empresaria', 'ibex', 'ibex35', 'fondo', 'inversion', 'banca', 'despacho', 'seguros', 'dinastia', 'holding')) return 'institucion'
  if (has('senado', 'senador')) return 'parlamento'
  if (has('diputado-congreso', 'congreso')) return 'parlamento'
  if (has('diputacion', 'presidente-diputacion')) return 'autonomico'
  return 'institucion'
}

const FUENTES: DossierCompleto[] = [
  ...IBEX35_FIXTURE,
  ...PODER_FIXTURE,
  ...DIPUTACIONES_FIXTURE,
] as unknown as DossierCompleto[]

function build(): { actors: GrafoActor[]; relaciones: RelacionExplicita[] } {
  // índices de resolución
  const bySlug = new Map<string, DossierCompleto>()
  const byName = new Map<string, string>() // nombre normalizado -> id
  for (const d of FUENTES) {
    bySlug.set(d.slug, d)
    byName.set(norm(d.nombre_completo), d.slug)
    if (d.alias) byName.set(norm(d.alias), d.slug)
  }
  // también permitir enlazar a actores ya existentes del catálogo del grafo
  for (const a of ACTORES) byName.set(norm(a.nombre), a.id)

  const resolve = (raw: string): string | null => {
    const r = (raw || '').trim()
    if (!r) return null
    if (isSlug(r) && bySlug.has(r)) return r
    const n = norm(r)
    if (byName.has(n)) return byName.get(n)!
    return null
  }

  const edges: RelacionExplicita[] = []
  const usados = new Set<string>()
  for (const d of FUENTES) {
    const redes = d.apartados?.find((ap) => ap.tipo === 'redes')
    if (!redes) continue
    for (const item of redes.items) {
      const targetId = resolve(item.titulo || '')
      if (!targetId || targetId === d.slug) continue
      const nota = extractNota(item.contenido || '')
      if (nota === null) continue
      edges.push({
        a: d.slug,
        b: targetId,
        val: Math.max(-100, Math.min(100, nota * 10)),
        tipo: tipoFromNota(nota),
        label: (item.contenido || '').replace(/\*\*/g, '').replace(/\s*\(nota[^)]*\)/i, '').slice(0, 140),
      })
      usados.add(d.slug)
      usados.add(targetId)
    }
  }

  // nodos = dossiers nuestros que participan en alguna arista
  const actors: GrafoActor[] = []
  for (const slug of Array.from(usados)) {
    const d = bySlug.get(slug)
    if (!d) continue // es un id de ACTORES (ya es nodo del grafo) · no duplicar
    actors.push({
      id: d.slug,
      nombre: d.nombre_completo,
      partido: d.partido ?? undefined,
      cargo: d.cargo_actual ?? undefined,
      cat: catFromTags(d.tags || []),
      inf: 60,
    })
  }
  return { actors, relaciones: edges }
}

const built = build()
export const GRAFO_DOSIERES_ACTORS: GrafoActor[] = built.actors
export const RELACIONES_GRAFO_DOSIERES: RelacionExplicita[] = built.relaciones

/** Busca la ficha completa de un nodo del grafo en TODOS los fixtures. */
export function getDossierAny(id: string, nombre?: string): DossierCompleto | null {
  const getters = [getIBXBySlug, getPODBySlug, getDIPBySlug, getCONGBySlug, getSENBySlug, getDossierBySlug]
  for (const g of getters) {
    const d = g(id)
    if (d) return d
  }
  // por nombre normalizado contra los fixtures curados
  if (nombre) {
    const n = norm(nombre)
    const hit = FUENTES.find((d) => norm(d.nombre_completo) === n)
    if (hit) return hit
  }
  return null
}
