'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useApi } from '@/lib/useApi'
import Graph from 'graphology'
import { Sigma } from 'sigma'
import FA2Layout from 'graphology-layout-forceatlas2/worker'

interface GraphNode { id: string; type: string; label?: string }
interface GraphEdge { id: string; source: string; target: string; label?: string; weight?: number }
interface GraphData { nodes: GraphNode[]; edges: GraphEdge[]; root: string }

const TYPE_COLOR: Record<string, string> = {
  politico: '#1F4E8C',
  partido: '#5B21B6',
  medio: '#b25000',
  empresa: '#2d8a39',
  institucion: '#0F766E',
  other: '#6e6e73',
}

const FALLBACK_GRAPH: GraphData = {
  root: 'pedro-sanchez',
  nodes: [
    { id: 'pedro-sanchez', type: 'politico', label: 'Pedro Sánchez' },
    { id: 'psoe', type: 'partido', label: 'PSOE' },
    { id: 'sumar', type: 'partido', label: 'Sumar' },
    { id: 'yolanda-diaz', type: 'politico', label: 'Yolanda Díaz' },
    { id: 'el-pais', type: 'medio', label: 'El País' },
    { id: 'rtve', type: 'medio', label: 'RTVE' },
    { id: 'moncloa', type: 'institucion', label: 'Moncloa' },
    { id: 'felix-bolanos', type: 'politico', label: 'Félix Bolaños' },
    { id: 'cnmc', type: 'institucion', label: 'CNMC' },
  ],
  edges: [
    { id: 'e1', source: 'pedro-sanchez', target: 'psoe', label: 'lidera', weight: 1.0 },
    { id: 'e2', source: 'pedro-sanchez', target: 'sumar', label: 'coalición', weight: 0.7 },
    { id: 'e3', source: 'pedro-sanchez', target: 'yolanda-diaz', label: 'aliada', weight: 0.65 },
    { id: 'e4', source: 'pedro-sanchez', target: 'el-pais', label: 'cobertura', weight: 0.55 },
    { id: 'e5', source: 'pedro-sanchez', target: 'rtve', label: 'cobertura', weight: 0.45 },
    { id: 'e6', source: 'pedro-sanchez', target: 'moncloa', label: 'preside', weight: 1.0 },
    { id: 'e7', source: 'pedro-sanchez', target: 'felix-bolanos', label: 'gabinete', weight: 0.85 },
    { id: 'e8', source: 'pedro-sanchez', target: 'cnmc', label: 'nombra', weight: 0.30 },
  ],
}

interface Actor { id: string; nombre?: string; partido?: string; cargo?: string; score_influencia?: number }

interface Props {
  actors?: Actor[]
  initialId?: string
}

interface TooltipState {
  x: number
  y: number
  label: string
  type: string
}

// Append "20" (hex for ~12% opacity) to a 6-digit hex color
function dimColor(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length === 6) return '#' + clean + '20'
  return hex
}

export default function RelacionesGrafo({ actors = [], initialId }: Props) {
  const [search, setSearch] = useState('')
  const [rootId, setRootId] = useState<string>(initialId ?? actors[0]?.id ?? FALLBACK_GRAPH.root)
  const [playing, setPlaying] = useState(true)
  const [legendOpen, setLegendOpen] = useState(true)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const fa2Ref = useRef<FA2Layout | null>(null)
  const graphRef = useRef<Graph | null>(null)

  const { data, loading } = useApi<GraphData>(
    `/api/intelligence/personas/${rootId}/grafo?depth=2`,
    { refreshInterval: 0 }
  )

  const graphData: GraphData = useMemo(() => {
    if (data && data.nodes && data.nodes.length > 0) return data
    return { ...FALLBACK_GRAPH, root: rootId }
  }, [data, rootId])

  const filteredActors = useMemo(
    () => actors.filter(a =>
      !search || (a.nombre ?? a.id).toLowerCase().includes(search.toLowerCase())
    ),
    [actors, search]
  )

  // Build or rebuild the Sigma graph whenever graphData changes
  useEffect(() => {
    if (!containerRef.current) return

    // Kill previous instances
    if (fa2Ref.current) {
      fa2Ref.current.kill()
      fa2Ref.current = null
    }
    if (sigmaRef.current) {
      sigmaRef.current.kill()
      sigmaRef.current = null
    }

    const g = new Graph({ multi: false, type: 'undirected' })
    graphRef.current = g

    // Add nodes
    graphData.nodes.forEach((n, i) => {
      const isRoot = n.id === graphData.root
      const color = TYPE_COLOR[n.type] ?? TYPE_COLOR.other
      // Spread nodes in a circle for initial positions before FA2
      const angle = (i / Math.max(graphData.nodes.length, 1)) * 2 * Math.PI
      g.addNode(n.id, {
        label: n.label ?? n.id,
        x: isRoot ? 0 : Math.cos(angle),
        y: isRoot ? 0 : Math.sin(angle),
        size: isRoot ? 20 : 10,
        color,
        _originalColor: color,
        nodeType: n.type,
      })
    })

    // Add edges (guard against missing nodes)
    graphData.edges.forEach(e => {
      if (g.hasNode(e.source) && g.hasNode(e.target) && !g.hasEdge(e.source, e.target)) {
        g.addEdge(e.source, e.target, {
          label: e.label ?? '',
          size: 1 + (e.weight ?? 0.5) * 2,
          color: '#d1d1d6',
        })
      }
    })

    // Create Sigma renderer
    const renderer = new Sigma(g, containerRef.current, {
      labelFont: 'system-ui',
      labelColor: { color: '#1d1d1f' },
      labelSize: 11,
      defaultEdgeColor: '#d1d1d6',
      renderEdgeLabels: true,
      edgeLabelFont: 'system-ui',
      edgeLabelSize: 9,
      edgeLabelColor: { color: '#86868b' },
    })
    sigmaRef.current = renderer

    // Node hover: dim non-adjacent, show tooltip
    renderer.on('enterNode', ({ node, event }) => {
      const attrs = g.getNodeAttributes(node)
      const neighbors = new Set(g.neighbors(node))

      g.forEachNode((n2, a) => {
        if (n2 !== node && !neighbors.has(n2)) {
          g.setNodeAttribute(n2, 'color', dimColor(a._originalColor as string))
        }
      })

      renderer.refresh()

      // Use the sigma-internal event coordinates (viewport pixels relative to container)
      const container = containerRef.current
      if (container) {
        const sigmaEvent = event as { x?: number; y?: number }
        setTooltip({
          x: sigmaEvent.x ?? 0,
          y: sigmaEvent.y ?? 0,
          label: attrs.label as string,
          type: attrs.nodeType as string,
        })
      }
    })

    renderer.on('leaveNode', () => {
      g.forEachNode((n2, a) => {
        g.setNodeAttribute(n2, 'color', a._originalColor)
      })
      renderer.refresh()
      setTooltip(null)
    })

    // Click node to set as root
    renderer.on('clickNode', ({ node }) => {
      if (node !== graphData.root) {
        setRootId(node)
      }
    })

    // ResizeObserver
    const ro = new ResizeObserver(() => renderer.refresh())
    ro.observe(containerRef.current)

    // FA2 layout
    const fa2 = new FA2Layout(g, {
      settings: {
        gravity: 1,
        scalingRatio: 10,
        slowDown: 3,
        barnesHutOptimize: true,
      },
    })
    fa2Ref.current = fa2
    if (playing) fa2.start()

    return () => {
      ro.disconnect()
      fa2.kill()
      renderer.kill()
      fa2Ref.current = null
      sigmaRef.current = null
      graphRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData])

  // Play/pause FA2 separately
  const handlePlayPause = () => {
    if (!fa2Ref.current) return
    if (playing) {
      fa2Ref.current.stop()
    } else {
      fa2Ref.current.start()
    }
    setPlaying(p => !p)
  }

  const rootNode = graphData.nodes.find(n => n.id === graphData.root)

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e8e8ed',
      borderRadius: 22,
      padding: '20px 24px',
      display: 'grid',
      gridTemplateColumns: '260px 1fr',
      gap: 18,
    }}>
      {/* Left sidebar: actor selector */}
      <div style={{
        borderRight: '1px solid #e8e8ed',
        padding: '16px 12px',
        overflowY: 'auto',
        maxHeight: 480,
      }}>
        <input
          type="text"
          placeholder={`Buscar entre ${actors.length || '—'} actores…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid #e8e8ed',
            background: '#fff',
            fontSize: 12,
            fontFamily: 'inherit',
            outline: 'none',
            color: '#1d1d1f',
            marginBottom: 10,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredActors.length === 0 && actors.length === 0 && (
            <p style={{ fontSize: 11, color: '#6e6e73', fontStyle: 'italic', padding: '8px 0' }}>
              Sin actores cargados.
            </p>
          )}
          {filteredActors.slice(0, 50).map(a => {
            const isActive = a.id === rootId
            return (
              <button
                key={a.id}
                onClick={() => setRootId(a.id)}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid ' + (isActive ? '#1F4E8C' : '#f0f0f3'),
                  background: isActive ? '#f5f5f7' : '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>
                  {a.nombre ?? a.id}
                </div>
                {a.partido && (
                  <div style={{ fontSize: 10.5, color: '#6e6e73' }}>
                    {a.partido}{a.cargo ? ` · ${a.cargo}` : ''}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: graph */}
      <div>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>
            {rootNode?.label ?? rootId}
          </h3>
          <span style={{ padding: '2px 10px', borderRadius: 999, background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontSize: 10.5, fontWeight: 600 }}>
            {graphData.nodes.length} nodos
          </span>
          <span style={{ padding: '2px 10px', borderRadius: 999, background: 'rgba(91,33,182,0.10)', color: '#5B21B6', fontSize: 10.5, fontWeight: 600 }}>
            {graphData.edges.length} relaciones
          </span>
          {loading && (
            <span style={{ fontSize: 10.5, color: '#6e6e73' }}>cargando…</span>
          )}

          {/* Play/pause */}
          <button
            onClick={handlePlayPause}
            style={{
              marginLeft: 'auto',
              padding: '5px 14px',
              borderRadius: 8,
              border: '1px solid #e8e8ed',
              background: playing ? '#1d1d1f' : '#f5f5f7',
              color: playing ? '#fff' : '#1d1d1f',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {playing ? '⏸ Pausar FA2' : '▶ Animar FA2'}
          </button>
        </div>

        {/* Sigma container */}
        <div style={{ position: 'relative' }}>
          <div
            ref={containerRef}
            style={{
              width: '100%',
              height: 480,
              position: 'relative',
              background: '#f5f5f7',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          />

          {/* Tooltip */}
          {tooltip && (
            <div style={{
              position: 'absolute',
              left: tooltip.x + 12,
              top: tooltip.y - 8,
              background: 'rgba(255,255,255,0.97)',
              border: '1px solid #e8e8ed',
              borderRadius: 10,
              padding: '8px 12px',
              pointerEvents: 'none',
              zIndex: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{tooltip.label}</div>
              <div style={{ fontSize: 10.5, color: TYPE_COLOR[tooltip.type] ?? TYPE_COLOR.other, fontWeight: 600, marginTop: 2 }}>
                {tooltip.type}
              </div>
            </div>
          )}

          {/* Collapsible legend */}
          <div style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(255,255,255,0.97)',
            border: '1px solid #e8e8ed',
            borderRadius: 12,
            overflow: 'hidden',
            zIndex: 5,
          }}>
            <button
              onClick={() => setLegendOpen(o => !o)}
              style={{
                width: '100%',
                padding: '7px 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                fontFamily: 'inherit',
                fontSize: 11,
                fontWeight: 600,
                color: '#1d1d1f',
              }}
            >
              Leyenda
              <span style={{ fontSize: 9, color: '#6e6e73' }}>{legendOpen ? '▲' : '▼'}</span>
            </button>
            {legendOpen && (
              <div style={{ padding: '4px 12px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {Object.entries(TYPE_COLOR).filter(([k]) => k !== 'other').map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: v, flexShrink: 0 }} />
                    <span style={{ fontSize: 10.5, color: '#1d1d1f' }}>{k}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edges table */}
        <div style={{ marginTop: 14 }}>
          <h4 style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 8px' }}>
            Relaciones detectadas ({graphData.edges.length})
          </h4>
          <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {graphData.edges.map(e => {
              const sn = graphData.nodes.find(n => n.id === e.source)
              const tn = graphData.nodes.find(n => n.id === e.target)
              return (
                <div key={e.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 1fr 50px',
                  gap: 10,
                  padding: '6px 10px',
                  background: '#fafafc',
                  border: '1px solid #f0f0f3',
                  borderRadius: 8,
                  fontSize: 11.5,
                }}>
                  <span style={{ color: '#1d1d1f', fontWeight: 500 }}>{sn?.label ?? e.source}</span>
                  <span style={{ color: '#6e6e73', textAlign: 'center', fontStyle: 'italic' }}>{e.label ?? '—'}</span>
                  <span style={{ color: '#1d1d1f' }}>{tn?.label ?? e.target}</span>
                  <span style={{ color: '#1F4E8C', fontFamily: 'system-ui', fontWeight: 700, textAlign: 'right' }}>
                    {((e.weight ?? 0) * 100).toFixed(0)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
