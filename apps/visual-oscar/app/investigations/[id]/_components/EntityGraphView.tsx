'use client'
/**
 * EntityGraphView · grafo interactivo de entidades pinneadas + sus enlaces.
 *
 * Sprint 5 · S5.3. Usa @xyflow/react para layout fuerza-dirigido sobre los
 * resultados de `/api/v1/entities/{id}/backlinks` y entity_links.
 *
 * Limitaciones intencionales:
 *   - Layout determinista (radial simple) · suficiente para 5-30 nodos
 *   - Sólo nodos pinneados + 1 nivel de vecinos · evitar grafos masivos
 *   - Edges con label de link_kind (rol, votó, financió...)
 *   - Click nodo → onSelect(entityId) (parent decide qué hacer)
 */
import { useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { KIND_COLOR } from '@/types/ontology'

interface BackLink {
  entity_id: string
  name: string
  kind: string
  link_kind: string
  direction: 'incoming' | 'outgoing'
}

interface PinEntity {
  id: string
  name: string
  kind: string
  slug: string
}

interface Props {
  pinnedEntities: PinEntity[]
  onSelect?: (entityId: string) => void
  height?: number
}

const RADIUS = 180
const CENTER = { x: 320, y: 240 }

export function EntityGraphView({ pinnedEntities, onSelect, height = 480 }: Props) {
  const [backlinks, setBacklinks] = useState<Record<string, BackLink[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch backlinks de cada pinned entity
  useEffect(() => {
    if (!pinnedEntities.length) {
      setBacklinks({})
      return
    }
    let cancelled = false
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const results: Record<string, BackLink[]> = {}
        await Promise.all(
          pinnedEntities.map(async (e) => {
            try {
              const r = await fetch(`/api/entities/${e.id}/backlinks?limit=20`)
              if (!r.ok) {
                results[e.id] = []
                return
              }
              const data = await r.json()
              results[e.id] = Array.isArray(data.items) ? data.items : []
            } catch {
              results[e.id] = []
            }
          }),
        )
        if (!cancelled) setBacklinks(results)
      } catch (e) {
        if (!cancelled) setError(String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => {
      cancelled = true
    }
  }, [pinnedEntities.map((e) => e.id).join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []
    const seen = new Set<string>()

    // Pinneados → cluster central
    pinnedEntities.forEach((e, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, pinnedEntities.length)
      const x = CENTER.x + Math.cos(angle) * 80
      const y = CENTER.y + Math.sin(angle) * 80
      const col = KIND_COLOR[e.kind as keyof typeof KIND_COLOR] ?? '#525258'
      nodes.push({
        id: `pinned_${e.id}`,
        position: { x, y },
        data: { label: e.name, entityId: e.id, pinned: true },
        style: {
          background: col,
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '6px 10px',
          border: '2px solid #111',
          borderRadius: 6,
          width: 'auto',
          maxWidth: 180,
        },
      })
      seen.add(e.id)
    })

    // Vecinos (backlinks) en órbita externa
    let neighborIdx = 0
    pinnedEntities.forEach((e) => {
      const links = backlinks[e.id] ?? []
      links.slice(0, 6).forEach((l) => {
        if (!seen.has(l.entity_id)) {
          const angle = (2 * Math.PI * neighborIdx) / 24
          const x = CENTER.x + Math.cos(angle) * RADIUS
          const y = CENTER.y + Math.sin(angle) * RADIUS
          const col = KIND_COLOR[l.kind as keyof typeof KIND_COLOR] ?? '#9ca3af'
          nodes.push({
            id: `n_${l.entity_id}`,
            position: { x, y },
            data: { label: l.name, entityId: l.entity_id, pinned: false },
            style: {
              background: '#fff',
              color: col,
              border: `1px solid ${col}`,
              borderRadius: 6,
              fontSize: 10,
              padding: '4px 8px',
              maxWidth: 160,
            },
          })
          seen.add(l.entity_id)
          neighborIdx++
        }
        edges.push({
          id: `e_${e.id}_${l.entity_id}_${l.link_kind}`,
          source: l.direction === 'outgoing' ? `pinned_${e.id}` : `n_${l.entity_id}`,
          target: l.direction === 'outgoing' ? `n_${l.entity_id}` : `pinned_${e.id}`,
          label: l.link_kind.replace(/_/g, ' '),
          labelStyle: { fontSize: 9, fontWeight: 600 },
          labelBgStyle: { fill: '#fff' },
          style: { stroke: '#9ca3af', strokeWidth: 1 },
          animated: l.direction === 'outgoing',
        })
      })
    })
    return { nodes, edges }
  }, [pinnedEntities, backlinks])

  const onNodeClick: NodeMouseHandler = (_evt, node) => {
    const eid = (node.data as { entityId?: string }).entityId
    if (eid && onSelect) onSelect(eid)
  }

  if (!pinnedEntities.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
        Pin entidades en la sidebar para ver el grafo de relaciones.
      </div>
    )
  }

  return (
    <div style={{ height, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }}>
      {loading ? (
        <p style={{ padding: 14, fontSize: 12, color: '#9ca3af' }}>Cargando grafo…</p>
      ) : error ? (
        <p style={{ padding: 14, fontSize: 12, color: '#dc2626' }}>Error: {error}</p>
      ) : nodes.length === 0 ? (
        <p style={{ padding: 14, fontSize: 12, color: '#9ca3af' }}>
          Las entidades pinneadas no tienen backlinks visibles.
        </p>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="#e5e7eb" />
          <Controls position="bottom-right" />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => (n.data?.pinned ? '#7c3aed' : '#9ca3af')}
          />
        </ReactFlow>
      )}
    </div>
  )
}
