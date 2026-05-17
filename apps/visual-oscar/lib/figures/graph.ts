/**
 * Constructor del grafo de figuras públicas.
 *
 * Genera nodes + edges con relaciones de múltiples tipos:
 *   - mismo-partido (políticos del mismo partido)
 *   - misma-comision (miembros de la misma comisión parlamentaria)
 *   - misma-empresa (empresarios de la misma compañía)
 *   - mismo-medio (periodistas y dueños del mismo medio)
 *   - mismo-sector (tags compartidos)
 *   - mismo-lobby (lobbistas representando los mismos intereses)
 *
 * Algoritmo:
 *   1. Carga catálogo expandido (~150 figuras nuevas) + políticos existentes
 *   2. Filtra por categorías seleccionadas
 *   3. Genera edges por pares con criterios estructurales (afiliación + tags)
 *   4. Genera edges adicionales desde composiciones reales de comisiones
 *      del Congreso (cuando dos figuras coinciden en una comisión)
 */

import type { Figure, FigureCategory, FigureGraph, FigureGraphEdge, FigureGraphNode } from './types'
import { getExpandedCatalog } from './catalog'
import { getAllCommissions } from '@/lib/legislative/aggregator'
import { fetchCommissionComposition } from '@/lib/legislative/congreso'

interface BuildOptions {
  /** Categorías a incluir. Default: todas */
  categories?: FigureCategory[]
  /** Mínima influencia para incluir nodo. Default: 0 */
  minInfluencia?: number
  /** Incluir aristas de comisión real (más lento). Default: false */
  withCommissionEdges?: boolean
}

export async function buildFigureGraph(opts: BuildOptions = {}): Promise<FigureGraph> {
  const catalog = getExpandedCatalog()
  const filtered = catalog.filter(f => {
    if (opts.categories && !opts.categories.includes(f.category)) return false
    if (opts.minInfluencia != null && f.influencia < opts.minInfluencia) return false
    return true
  })

  const nodes: FigureGraphNode[] = filtered.map(f => ({
    id: f.id,
    nombre: f.nombre,
    category: f.category,
    afiliacion: f.afiliacion,
    color: f.color,
    size: 5 + (f.influencia / 100) * 18,
    ejeX: f.ejeX,
    ejeY: f.ejeY,
    exposicion: f.exposicion,
  }))

  const edges: FigureGraphEdge[] = []
  const seenEdge = new Set<string>()

  function addEdge(e: FigureGraphEdge) {
    const key = [e.source, e.target].sort().join('|') + '|' + e.type
    if (seenEdge.has(key)) return
    seenEdge.add(key)
    edges.push(e)
  }

  // 1) Aristas estructurales por afiliación común
  for (let i = 0; i < filtered.length; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      const a = filtered[i]
      const b = filtered[j]

      // Misma afiliación (organización) → arista fuerte
      if (a.afiliacion && a.afiliacion === b.afiliacion) {
        const type: FigureGraphEdge['type'] =
          a.category === 'mediatico' || a.category === 'periodista' ? 'mismo-medio'
          : a.category === 'empresario' ? 'misma-empresa'
          : a.category === 'lobbista' || a.category === 'patronal' ? 'mismo-lobby'
          : a.category === 'fondo' ? 'mismo-fondo'
          : 'mismo-partido'
        addEdge({ source: a.id, target: b.id, type, weight: 0.9, label: a.afiliacion })
      }

      // Tags compartidos ≥3 → mismo-sector (más débil)
      const sharedTags = a.tags.filter(t => b.tags.includes(t))
      if (sharedTags.length >= 3 && a.afiliacion !== b.afiliacion) {
        addEdge({
          source: a.id, target: b.id, type: 'mismo-sector',
          weight: Math.min(0.7, sharedTags.length / 6),
          label: sharedTags.slice(0, 2).join(', '),
        })
      }
    }
  }

  // 2) Aristas de comisión real (opcional)
  if (opts.withCommissionEdges) {
    try {
      const { commissions } = await getAllCommissions()
      const congresoComs = commissions.filter(c => c.camara === 'congreso').slice(0, 15)
      // Para cada comisión, obtener composición y mapear nombres → figureIds
      const figuresByLastName: Record<string, string[]> = {}
      for (const f of filtered) {
        const last = f.nombre.split(/\s+/).slice(-2).join(' ').toLowerCase()
        if (!figuresByLastName[last]) figuresByLastName[last] = []
        figuresByLastName[last].push(f.id)
      }

      for (const c of congresoComs) {
        try {
          const comp = await fetchCommissionComposition(c.codigo, '1')
          if (!comp) continue
          // Encontrar miembros que estén en nuestro catálogo
          const memberFigureIds: string[] = []
          for (const m of comp.members) {
            const last = m.nombre.split(',')[0].trim().toLowerCase()
            const match = figuresByLastName[last]
            if (match) memberFigureIds.push(...match)
          }
          // Generar aristas por todos los pares dentro de esa comisión
          for (let i = 0; i < memberFigureIds.length; i++) {
            for (let j = i + 1; j < memberFigureIds.length; j++) {
              addEdge({
                source: memberFigureIds[i],
                target: memberFigureIds[j],
                type: 'misma-comision',
                weight: 0.75,
                label: c.nombre.slice(0, 50),
                comisionCodigo: c.codigo,
              })
            }
          }
        } catch {/* siguiente comisión */}
      }
    } catch {/* sin aristas de comisión */}
  }

  // Stats
  const porCategoria: Record<string, number> = {}
  const porTipoEdge: Record<string, number> = {}
  for (const n of nodes) porCategoria[n.category] = (porCategoria[n.category] || 0) + 1
  for (const e of edges) porTipoEdge[e.type] = (porTipoEdge[e.type] || 0) + 1

  return {
    nodes,
    edges,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      porCategoria,
      porTipoEdge,
    },
  }
}
