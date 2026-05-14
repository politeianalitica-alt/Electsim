'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { pipelinesApi } from '@/lib/domo/api-client'
import type { Pipeline, PipelineNode, PipelineEdge, NodeType, ScheduleFrequency } from '@/types/domo'
import { generateId } from '@/lib/domo/utils'
import { NODE_TYPE_LABELS, NODE_TYPE_COLORS } from '@/lib/domo/constants'
import Skeleton from '@/components/Skeleton'
import PipelineCanvas from './PipelineCanvas'
import NodeConfigPanel from './NodeConfigPanel'
import RunHistoryPanel from './RunHistoryPanel'
import styles from './PipelineEditor.module.css'

type RightPanel = 'node' | 'runs' | null

const SCHEDULE_OPTIONS: Array<{ value: ScheduleFrequency; label: string }> = [
  { value: 'manual',      label: 'Manual' },
  { value: 'every_15min', label: 'Cada 15 min' },
  { value: 'hourly',      label: 'Cada hora' },
  { value: 'daily',       label: 'Diario' },
  { value: 'weekly',      label: 'Semanal' },
]

export default function PipelineEditorClient({ id }: { id: string }) {
  const qc    = useQueryClient()
  const isNew = id === 'nuevo'

  const [name,             setName]             = useState('')
  const [description,      setDescription]      = useState('')
  const [schedule,         setSchedule]         = useState<ScheduleFrequency>('manual')
  const [nodes,            setNodes]            = useState<PipelineNode[]>([])
  const [edges,            setEdges]            = useState<PipelineEdge[]>([])
  const [selectedNodeId,   setSelectedNodeId]   = useState<string | null>(null)
  const [rightPanel,       setRightPanel]       = useState<RightPanel>(null)
  const [isDirty,          setIsDirty]          = useState(false)
  const [previewData,      setPreviewData]      = useState<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null)
  const [previewLoading,   setPreviewLoading]   = useState(false)

  const { data: pipeline, isLoading } = useQuery({
    queryKey: ['domo', 'pipelines', id],
    queryFn:  () => pipelinesApi.get(id),
    enabled:  !isNew,
  })

  useEffect(() => {
    if (!pipeline) return
    setName(pipeline.name)
    setDescription(pipeline.description ?? '')
    setSchedule(pipeline.schedule)
    setNodes(pipeline.nodes)
    setEdges(pipeline.edges)
  }, [pipeline])

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Pipeline>) =>
      isNew ? pipelinesApi.create(data) : pipelinesApi.update(id, data),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['domo', 'pipelines'] })
      setIsDirty(false)
      if (isNew && saved?.id) window.location.href = `/domo/pipeline/${saved.id}`
    },
  })

  const runMutation = useMutation({
    mutationFn: () => pipelinesApi.run(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domo', 'pipelines', id] })
      setRightPanel('runs')
    },
  })

  const handleSave = () => {
    saveMutation.mutate({ name, description, schedule, nodes, edges, status: 'active' })
  }

  const handleAddNode = (type: NodeType) => {
    const newNode: PipelineNode = {
      id:       generateId(),
      type,
      label:    NODE_TYPE_LABELS[type],
      position: { x: 200 + nodes.length * 60, y: 200 + (nodes.length % 3) * 80 },
      config:   {},
    }
    setNodes(prev => [...prev, newNode])
    setIsDirty(true)
  }

  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedNodeId(nodeId)
    setRightPanel(nodeId ? 'node' : null)
  }

  const handleNodeUpdate = (nodeId: string, config: Record<string, unknown>) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, config } : n))
    setIsDirty(true)
  }

  const handleNodeDelete = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId))
    setSelectedNodeId(null)
    setRightPanel(null)
    setIsDirty(true)
  }

  const handleEdgesChange = (newEdges: PipelineEdge[]) => {
    setEdges(newEdges)
    setIsDirty(true)
  }

  const handlePreview = async () => {
    if (isNew || !selectedNodeId) return
    setPreviewLoading(true)
    try {
      const data = await pipelinesApi.preview(id, selectedNodeId)
      setPreviewData(data)
    } catch {
      setPreviewData(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null

  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <Skeleton style={{ height: 32, width: 300, marginBottom: 16 }} />
        <Skeleton style={{ height: 600, borderRadius: 14 }} />
      </div>
    )
  }

  return (
    <div className={styles.editorRoot}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Link href="/domo/pipeline" className={styles.breadcrumbLink}>← Pipelines</Link>
          <span className={styles.toolbarSep}>›</span>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setIsDirty(true) }}
            placeholder="Nombre del pipeline…"
            className={styles.nameInput}
          />
          {isDirty && <span className={styles.dirtyBadge}>Sin guardar</span>}
        </div>
        <div className={styles.toolbarRight}>
          <select
            value={schedule}
            onChange={e => { setSchedule(e.target.value as ScheduleFrequency); setIsDirty(true) }}
            className={styles.scheduleSelect}
          >
            {SCHEDULE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {!isNew && (
            <button
              onClick={() => setRightPanel(rightPanel === 'runs' ? null : 'runs')}
              className={styles.btnSecondary}
            >
              Historial
            </button>
          )}
          {!isNew && (
            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className={styles.btnRun}
            >
              {runMutation.isPending ? '⟳ Ejecutando…' : '▶ Ejecutar'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || !name.trim()}
            className={styles.btnSave}
          >
            {saveMutation.isPending ? '⟳ Guardando…' : isDirty ? '● Guardar' : '✓ Guardado'}
          </button>
        </div>
      </div>

      <div className={styles.editorMain}>
        <div className={styles.palette}>
          <div className={styles.paletteTitle}>Nodos</div>
          {(Object.entries(NODE_TYPE_LABELS) as Array<[NodeType, string]>).map(([type, label]) => (
            <button
              key={type}
              onClick={() => handleAddNode(type)}
              className={styles.paletteItem}
              style={{ borderLeftColor: NODE_TYPE_COLORS[type] }}
              title={`Añadir nodo ${label}`}
            >
              <span
                className={styles.paletteItemDot}
                style={{ background: NODE_TYPE_COLORS[type] }}
              />
              {label}
            </button>
          ))}
        </div>

        <div className={styles.canvasWrapper}>
          <PipelineCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            onNodeSelect={handleNodeSelect}
            onNodesChange={setNodes}
            onEdgesChange={handleEdgesChange}
          />

          {selectedNode && !isNew && (
            <div className={styles.previewStrip}>
              <button
                onClick={handlePreview}
                disabled={previewLoading}
                className={styles.btnPreview}
              >
                {previewLoading ? '⟳ Cargando preview…' : '⬡ Preview de datos del nodo'}
              </button>
              {previewData && <PreviewTable data={previewData} />}
            </div>
          )}
        </div>

        {rightPanel === 'node' && selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={(config) => handleNodeUpdate(selectedNode.id, config)}
            onDelete={() => handleNodeDelete(selectedNode.id)}
            onClose={() => { setSelectedNodeId(null); setRightPanel(null) }}
          />
        )}
        {rightPanel === 'runs' && !isNew && (
          <RunHistoryPanel
            pipelineId={id}
            onClose={() => setRightPanel(null)}
          />
        )}
      </div>
    </div>
  )
}

function PreviewTable({ data }: { data: { columns: string[]; rows: Record<string, unknown>[] } }) {
  return (
    <div className={styles.previewTable}>
      <div style={{ overflowX: 'auto', maxHeight: 200 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            <tr>
              {data.columns.map(col => (
                <th key={col} style={{ padding: '4px 8px', textAlign: 'left', background: 'var(--bg-secondary,#f9fafb)', borderBottom: '1px solid var(--color-border,#e5e7eb)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 5).map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border,#e5e7eb)' }}>
                {data.columns.map(col => (
                  <td key={col} style={{ padding: '4px 8px', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {String(row[col] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span style={{ fontSize: '0.7rem', color: 'var(--color-muted,#6b7280)', padding: '4px 8px', display: 'block' }}>
        Mostrando {Math.min(5, data.rows.length)} de {data.rows.length} filas
      </span>
    </div>
  )
}
