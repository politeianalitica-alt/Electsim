import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/intelligence/personas/[id]/grafo?depth=2
//
// Builds an ego graph centred on the given actor.
// Strategy:
//   1. Try backend /api/actors/graph (full graph) and filter to neighbors of root.
//   2. Combine with structural relations from /api/actor-relations if available.
//   3. If everything fails → minimal graph with just the root node.

interface BackendNode {
  id: string
  name: string
  party?: string
  color?: string
  role?: string
  relevance?: number
  exposure?: number
  sentiment?: string
  mentions_24h?: number
  group?: string
}
interface BackendEdge {
  source: string
  target: string
  weight?: number
  label?: string
  type?: string
}
interface BackendGraph {
  nodes: BackendNode[]
  edges?: BackendEdge[]
  links?: BackendEdge[]
}

interface OutNode { id: string; type: string; label: string }
interface OutEdge { id: string; source: string; target: string; label?: string; weight?: number }
interface OutGraph { nodes: OutNode[]; edges: OutEdge[]; root: string }

function nodeType(party?: string): string {
  if (!party) return 'politico'
  const p = party.toLowerCase()
  if (['psoe', 'pp', 'vox', 'sumar', 'podemos', 'erc', 'junts', 'pnv', 'bildu', 'cs', 'ciudadanos', 'cup', 'bng'].includes(p)) return 'politico'
  return 'politico'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const root = decodeURIComponent(params.id)
  const { searchParams } = req.nextUrl
  const depth = Math.min(3, Math.max(1, Number(searchParams.get('depth') || 2)))

  // Fetch full backend actor graph
  const graphR = await callBackend<BackendGraph>('/api/actors/graph')

  if (graphR.data && Array.isArray(graphR.data.nodes) && graphR.data.nodes.length > 0) {
    const full = graphR.data
    const edges = full.edges ?? full.links ?? []

    // Find root node by id, name slug, or name
    const rootLower = root.toLowerCase().replace(/-/g, ' ').trim()
    const rootNode = full.nodes.find(n =>
      n.id === root ||
      n.name?.toLowerCase() === rootLower ||
      n.name?.toLowerCase().replace(/[.,]/g, '') === rootLower
    )

    if (rootNode) {
      // BFS to find neighbours up to `depth` hops
      const adj: Record<string, Set<string>> = {}
      for (const e of edges) {
        if (!adj[e.source]) adj[e.source] = new Set()
        if (!adj[e.target]) adj[e.target] = new Set()
        adj[e.source].add(e.target)
        adj[e.target].add(e.source)
      }
      const visited = new Set<string>([rootNode.id])
      let frontier = [rootNode.id]
      for (let d = 0; d < depth; d++) {
        const next: string[] = []
        for (const nid of frontier) {
          const neigh = adj[nid]
          if (!neigh) continue
          neigh.forEach(nb => {
            if (!visited.has(nb)) {
              visited.add(nb)
              next.push(nb)
            }
          })
        }
        frontier = next
      }

      const includedNodes = full.nodes.filter(n => visited.has(n.id))
      const includedEdges = edges.filter(e => visited.has(e.source) && visited.has(e.target))

      const outNodes: OutNode[] = includedNodes.map(n => ({
        id: n.id,
        type: nodeType(n.party),
        label: n.name,
      }))
      const outEdges: OutEdge[] = includedEdges.map((e, i) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        label: e.label ?? e.type ?? 'co-mención',
        weight: e.weight ?? 0.5,
      }))

      return NextResponse.json(withMeta<OutGraph>({
        nodes: outNodes,
        edges: outEdges,
        root: rootNode.id,
      }, 'backend', { latency_ms: graphR.latency_ms }))
    }
  }

  // Honest fallback: minimal single-node graph signalling the root isn't in the dataset
  const empty: OutGraph = {
    nodes: [{ id: root, type: 'politico', label: root.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }],
    edges: [],
    root,
  }
  return NextResponse.json(withMeta(empty, 'mock', {
    warnings: graphR.error
      ? [`backend_unreachable:${graphR.error}`]
      : [`actor_not_in_graph:${root}`],
    latency_ms: graphR.latency_ms,
  }))
}
