'use client'
import { useEffect, useMemo, useState } from 'react'
import { useApi } from '@/lib/useApi'

interface GraphNode { id: string; type: string; label?: string }
interface GraphEdge { id: string; source: string; target: string; label?: string; weight?: number }
interface GraphData { nodes: GraphNode[]; edges: GraphEdge[]; root: string }

const TYPE_COLOR: Record<string, string> = {
  politico: '#1F4E8C', partido: '#5B21B6', medio: '#b25000',
  empresa: '#2d8a39', institucion: '#0F766E', other: '#6e6e73',
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

export default function RelacionesGrafo({ actors = [], initialId }: Props) {
  const [search, setSearch] = useState('')
  const [rootId, setRootId] = useState<string>(initialId ?? actors[0]?.id ?? FALLBACK_GRAPH.root)

  const { data, loading } = useApi<GraphData>(`/api/intelligence/personas/${rootId}/grafo?depth=2`, { refreshInterval: 0 })
  const graph: GraphData = (data && data.nodes && data.nodes.length > 0) ? data : { ...FALLBACK_GRAPH, root: rootId }

  const filteredActors = actors.filter(a =>
    !search || (a.nombre ?? a.id).toLowerCase().includes(search.toLowerCase())
  )

  // Layout: root center, related nodes in ring
  const cx = 320, cy = 220, R = 160
  const related = useMemo(() => graph.nodes.filter(n => n.id !== graph.root), [graph])

  const positions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    pos[graph.root] = { x: cx, y: cy }
    related.forEach((n, i) => {
      const angle = (i / Math.max(related.length, 1)) * 2 * Math.PI - Math.PI / 2
      pos[n.id] = { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) }
    })
    return pos
  }, [graph, related])

  const rootNode = graph.nodes.find(n => n.id === graph.root)

  return (
    <section style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '20px 24px', display: 'grid', gridTemplateColumns: '280px 1fr', gap: 18 }}>
      {/* Left: actor selector */}
      <div>
        <input
          type="text"
          placeholder={`Buscar entre ${actors.length || '—'} actores…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 10,
            border: '1px solid #e8e8ed', background: '#fff',
            fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#1d1d1f', marginBottom: 10,
          }}
        />
        <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredActors.length === 0 && actors.length === 0 && (
            <p style={{ fontSize: 11, color: '#6e6e73', fontStyle: 'italic', padding: '8px 0' }}>Sin actores cargados.</p>
          )}
          {filteredActors.slice(0, 50).map(a => {
            const isActive = a.id === rootId
            return (
              <button key={a.id} onClick={() => setRootId(a.id)} style={{
                textAlign: 'left', padding: '8px 12px', borderRadius: 10,
                border: '1px solid ' + (isActive ? '#1F4E8C' : '#f0f0f3'),
                background: isActive ? 'rgba(31,78,140,0.08)' : '#fff',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>{a.nombre ?? a.id}</div>
                {a.partido && <div style={{ fontSize: 10.5, color: '#6e6e73' }}>{a.partido} {a.cargo ? `· ${a.cargo}` : ''}</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: graph + edges */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{rootNode?.label ?? rootId}</h3>
          <span style={{ padding: '2px 10px', borderRadius: 999, background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontSize: 10.5, fontWeight: 600 }}>
            {graph.nodes.length} nodos
          </span>
          <span style={{ padding: '2px 10px', borderRadius: 999, background: 'rgba(91,33,182,0.10)', color: '#5B21B6', fontSize: 10.5, fontWeight: 600 }}>
            {graph.edges.length} relaciones
          </span>
          {loading && <span style={{ fontSize: 10.5, color: '#6e6e73' }}>cargando…</span>}
        </div>

        <div style={{ background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 14, height: 440, position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 640 440" style={{ width: '100%', height: '100%' }}>
            {/* Edges */}
            {graph.edges.map(e => {
              const a = positions[e.source], b = positions[e.target]
              if (!a || !b) return null
              const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
              return (
                <g key={e.id}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(110,110,115,0.30)" strokeWidth={1 + (e.weight ?? 0.5) * 2} />
                  {e.label && (
                    <text x={mx} y={my} textAnchor="middle" dy={-4} fill="#6e6e73" fontSize={9} fontStyle="italic">
                      {e.label}
                    </text>
                  )}
                </g>
              )
            })}
            {/* Nodes */}
            {graph.nodes.map(n => {
              const p = positions[n.id]
              if (!p) return null
              const isRoot = n.id === graph.root
              const c = TYPE_COLOR[n.type] ?? TYPE_COLOR.other
              return (
                <g key={n.id} onClick={() => !isRoot && setRootId(n.id)} style={{ cursor: isRoot ? 'default' : 'pointer' }}>
                  <circle cx={p.x} cy={p.y} r={isRoot ? 28 : 18} fill={c} fillOpacity={isRoot ? 1 : 0.85} stroke="white" strokeWidth={2.5} />
                  <text x={p.x} y={p.y + 4} textAnchor="middle" fill="white" fontSize={isRoot ? 11 : 9} fontWeight={700}>
                    {(n.label ?? n.id).slice(0, isRoot ? 12 : 10)}
                  </text>
                  <text x={p.x} y={p.y + (isRoot ? 44 : 32)} textAnchor="middle" fill="#6e6e73" fontSize={9} fontWeight={500}>
                    {n.type}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Legend */}
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.95)', border: '1px solid #e8e8ed', borderRadius: 10, padding: '8px 12px', fontSize: 10.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(TYPE_COLOR).filter(([k]) => k !== 'other').map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: v }} />
                <span style={{ color: '#1d1d1f' }}>{k}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Edges table */}
        <div style={{ marginTop: 14 }}>
          <h4 style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 8px' }}>
            Relaciones detectadas ({graph.edges.length})
          </h4>
          <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {graph.edges.map(e => {
              const sn = graph.nodes.find(n => n.id === e.source)
              const tn = graph.nodes.find(n => n.id === e.target)
              return (
                <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr 50px', gap: 10, padding: '6px 10px', background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 8, fontSize: 11.5 }}>
                  <span style={{ color: '#1d1d1f', fontWeight: 500 }}>{sn?.label ?? e.source}</span>
                  <span style={{ color: '#6e6e73', textAlign: 'center', fontStyle: 'italic' }}>{e.label ?? '—'}</span>
                  <span style={{ color: '#1d1d1f' }}>{tn?.label ?? e.target}</span>
                  <span style={{ color: '#1F4E8C', fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, textAlign: 'right' }}>
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
