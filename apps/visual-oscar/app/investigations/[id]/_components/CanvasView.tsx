'use client'
/**
 * CanvasView · Sprint 5 · S5.4
 *
 * Canvas libre estilo Miro para el caso. Usa @xyflow/react con:
 *   - drag de nodos libres (sticky notes)
 *   - drag para conectar dos nodos (crear edge)
 *   - doble click en vacío crea sticky nuevo
 *   - sidebar derecho · paleta para añadir nodos (pin actor, hipótesis, evidencia, nota)
 *   - persistencia localStorage por investigationId · al guardar se podría
 *     sincronizar a artifact canvas_state (backend ya soporta artifact_kind=canvas_state)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface Props {
  investigationId: string | number
}

type NodeKind = 'note' | 'actor' | 'hypothesis' | 'evidence' | 'question'

const NODE_COLORS: Record<NodeKind, { bg: string; fg: string; border: string }> = {
  note:       { bg: '#fef3c7', fg: '#92400e', border: '#fbbf24' },
  actor:      { bg: '#dbeafe', fg: '#1e40af', border: '#3b82f6' },
  hypothesis: { bg: '#f3e8ff', fg: '#7c2d12', border: '#9333ea' },
  evidence:   { bg: '#dcfce7', fg: '#166534', border: '#22c55e' },
  question:   { bg: '#fee2e2', fg: '#991b1b', border: '#ef4444' },
}

function storageKey(invId: string | number) {
  return `politeia.canvas.${invId}`
}

interface PersistedCanvas {
  nodes: Node[]
  edges: Edge[]
  updated_at: string
}

function loadCanvas(invId: string | number): PersistedCanvas | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey(invId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveCanvas(invId: string | number, payload: PersistedCanvas) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(invId), JSON.stringify(payload))
  } catch {
    /* quota · ignore */
  }
}

function makeNode(kind: NodeKind, x: number, y: number, label?: string): Node {
  const c = NODE_COLORS[kind]
  const id = `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  return {
    id,
    position: { x, y },
    data: { label: label ?? defaultLabel(kind), kind },
    style: {
      background: c.bg,
      color: c.fg,
      border: `1.5px solid ${c.border}`,
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
      fontWeight: 600,
      maxWidth: 220,
      minWidth: 140,
    },
  }
}

function defaultLabel(kind: NodeKind): string {
  return {
    note: 'Nota libre',
    actor: 'Actor',
    hypothesis: 'Hipótesis',
    evidence: 'Evidencia',
    question: 'Pregunta',
  }[kind]
}

function CanvasInner({ investigationId }: Props) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const flowRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  // Load inicial
  useEffect(() => {
    const stored = loadCanvas(investigationId)
    if (stored) {
      setNodes(stored.nodes || [])
      setEdges(stored.edges || [])
      setLastSaved(stored.updated_at || null)
    }
  }, [investigationId])

  // Autosave debounce 1s
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => {
      const updated_at = new Date().toISOString()
      saveCanvas(investigationId, { nodes, edges, updated_at })
      setLastSaved(updated_at)
      setDirty(false)
    }, 1000)
    return () => clearTimeout(t)
  }, [dirty, nodes, edges, investigationId])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds))
    setDirty(true)
  }, [])
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds))
    setDirty(true)
  }, [])
  const onConnect = useCallback((c: Connection) => {
    setEdges((eds) =>
      addEdge(
        { ...c, animated: false, style: { stroke: '#6b7280', strokeWidth: 1.5 } },
        eds,
      ),
    )
    setDirty(true)
  }, [])

  const addAtCenter = (kind: NodeKind) => {
    const rect = flowRef.current?.getBoundingClientRect()
    const center = rect
      ? screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        })
      : { x: 200, y: 200 }
    const n = makeNode(kind, center.x, center.y)
    setNodes((nds) => [...nds, n])
    setDirty(true)
  }

  const clearAll = () => {
    if (!confirm('¿Borrar todo el canvas?')) return
    setNodes([])
    setEdges([])
    setDirty(true)
  }

  const onPaneDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const n = makeNode('note', pos.x, pos.y)
      setNodes((nds) => [...nds, n])
      setDirty(true)
    },
    [screenToFlowPosition],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 600 }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '6px 10px',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          alignItems: 'center',
          fontSize: 11,
        }}
      >
        <span style={{ color: '#6b7280', fontWeight: 600 }}>Añadir:</span>
        {(Object.keys(NODE_COLORS) as NodeKind[]).map((k) => {
          const c = NODE_COLORS[k]
          return (
            <button
              key={k}
              onClick={() => addAtCenter(k)}
              style={{
                padding: '3px 8px',
                fontSize: 10.5,
                fontWeight: 700,
                background: c.bg,
                color: c.fg,
                border: `1px solid ${c.border}`,
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              + {defaultLabel(k)}
            </button>
          )
        })}
        <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 10 }}>
          {dirty ? '· guardando…' : lastSaved ? `· guardado ${new Date(lastSaved).toLocaleTimeString('es-ES')}` : 'sin cambios'}
        </span>
        <button
          onClick={clearAll}
          style={{
            padding: '3px 10px',
            fontSize: 10.5,
            background: '#fff',
            border: '1px solid #fecaca',
            color: '#dc2626',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Limpiar todo
        </button>
      </div>

      <div
        ref={flowRef}
        style={{
          flex: 1,
          border: '1px solid #e5e7eb',
          borderRadius: '0 0 8px 8px',
          background: '#fafafa',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDoubleClick={onPaneDoubleClick}
          fitView={nodes.length > 0}
          minZoom={0.2}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="#e5e7eb" />
          <Controls position="bottom-right" />
          <MiniMap pannable zoomable nodeColor={(n) => {
            const kind = (n.data as { kind?: NodeKind }).kind
            return kind ? NODE_COLORS[kind].border : '#9ca3af'
          }} />
        </ReactFlow>
      </div>

      <p style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 6 }}>
        Doble-click en el canvas para crear nota · Drag handles para conectar nodos ·
        Persistido localmente. Próximo paso: sync con artifact canvas_state del caso.
      </p>
    </div>
  )
}

export function CanvasView(props: Props) {
  // ReactFlowProvider necesario para useReactFlow() hook
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}
