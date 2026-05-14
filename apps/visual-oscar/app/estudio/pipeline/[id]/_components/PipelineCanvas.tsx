'use client'

import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { PipelineNode, PipelineEdge } from '@/types/domo'
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from '@/lib/estudio/constants'
import styles from './PipelineEditor.module.css'

interface Props {
  nodes:          PipelineNode[]
  edges:          PipelineEdge[]
  selectedNodeId: string | null
  onNodeSelect:   (id: string | null) => void
  onNodesChange:  (nodes: PipelineNode[]) => void
  onEdgesChange:  (edges: PipelineEdge[]) => void
}

function toRFNode(n: PipelineNode, selected: boolean): Node {
  const color = NODE_TYPE_COLORS[n.type] ?? '#6b7280'
  return {
    id:       n.id,
    type:     'default',
    position: n.position,
    selected,
    data: { label: n.label || NODE_TYPE_LABELS[n.type] },
    style: {
      background:   'var(--bg-primary, #fff)',
      border:       `2px solid ${color}`,
      borderRadius: 10,
      padding:      '8px 14px',
      fontSize:     12,
      fontWeight:   600,
      color:        'var(--color-text, #111827)',
      boxShadow:    selected ? `0 0 0 3px ${color}44` : '0 1px 4px rgba(0,0,0,0.08)',
      minWidth:     120,
    },
  }
}

function toRFEdge(e: PipelineEdge): Edge {
  return {
    id:     e.id,
    source: e.source,
    target: e.target,
    label:  e.label,
    animated: true,
    style:      { stroke: 'var(--color-accent, #3b82f6)', strokeWidth: 1.5 },
    labelStyle: { fontSize: 11, fill: 'var(--color-muted, #6b7280)' },
  }
}

export default function PipelineCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onNodesChange,
  onEdgesChange,
}: Props) {
  const rfNodes = nodes.map(n => toRFNode(n, n.id === selectedNodeId))
  const rfEdges = edges.map(toRFEdge)

  const handleConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target) return
    const newEdge: PipelineEdge = {
      id:     `e-${conn.source}-${conn.target}-${Date.now().toString(36)}`,
      source: conn.source,
      target: conn.target,
    }
    onEdgesChange([...edges, newEdge])
  }, [edges, onEdgesChange])

  const handleNodeDragStop = useCallback((_: unknown, node: Node) => {
    onNodesChange(
      nodes.map(n => n.id === node.id ? { ...n, position: node.position } : n),
    )
  }, [nodes, onNodesChange])

  const handleEdgeDelete = useCallback((deletedEdges: Edge[]) => {
    const ids = new Set(deletedEdges.map(e => e.id))
    onEdgesChange(edges.filter(e => !ids.has(e.id)))
  }, [edges, onEdgesChange])

  return (
    <div className={styles.canvas}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onConnect={handleConnect}
        onNodeClick={(_, node) => onNodeSelect(node.id)}
        onPaneClick={() => onNodeSelect(null)}
        onNodeDragStop={handleNodeDragStop}
        onEdgesDelete={handleEdgeDelete}
        fitView
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--color-border,#e5e7eb)" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={2}
          zoomable
          pannable
          style={{ background: 'var(--bg-secondary,#f9fafb)', border: '1px solid var(--color-border,#e5e7eb)' }}
        />
      </ReactFlow>

      {rfNodes.length === 0 && (
        <div className={styles.canvasEmpty}>
          <span style={{ fontSize: '2rem', opacity: 0.3 }}>⟶</span>
          <p>Añade nodos desde el panel izquierdo para construir el pipeline</p>
          <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>Arrastra y conecta nodos · Selecciona un nodo para configurarlo</p>
        </div>
      )}
    </div>
  )
}
