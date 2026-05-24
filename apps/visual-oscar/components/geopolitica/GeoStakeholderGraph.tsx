'use client'
/**
 * `<GeoStakeholderGraph />` · Sprint G3.
 *
 * Force-directed network estilo Eurasia Group stakeholder mapping +
 * ECFR Power Atlas. SVG puro con física simulada simple (no libs externas
 * para mantener bundle ligero).
 *
 * Nodes = países/actores (color por grupo: self/ally/partner/adversary/conflict)
 * Edges = flujos comerciales (T), seguridad (S), energía (E), migración (M)
 * Width edge = magnitud impacto
 *
 * Diferenciador: muestra a España como CENTRO + permite ver visualmente
 * "quién afecta a quién", revealing leverage points.
 */
import { useEffect, useRef, useState } from 'react'

interface Node {
  id: string
  label: string
  group: string
  size: number
  x?: number
  y?: number
  vx?: number
  vy?: number
}
interface Edge {
  source: string
  target: string
  kind: string
  weight: number
  label: string
}
interface NetworkResp {
  ok: boolean
  nodes: Node[]
  edges: Edge[]
  legend: { groups: Record<string, string>; edge_kinds: Record<string, string> }
}

const GROUP_COLOR: Record<string, string> = {
  self:      '#fbbf24',
  ally:      '#16a34a',
  partner:   '#0EA5E9',
  adversary: '#dc2626',
  conflict:  '#f97316',
}
const KIND_COLOR: Record<string, string> = {
  T: '#0EA5E9',
  S: '#dc2626',
  E: '#f59e0b',
  M: '#a855f7',
}

export function GeoStakeholderGraph() {
  const [data, setData] = useState<NetworkResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoverNode, setHoverNode] = useState<Node | null>(null)
  const [kindFilter, setKindFilter] = useState<'all' | 'T' | 'S' | 'E' | 'M'>('all')
  const svgRef = useRef<SVGSVGElement>(null)
  const W = 700
  const H = 500

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/stakeholder-network', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  // Simple force layout: centro = España, otros distribuidos radialmente
  // por grupo (ally arriba, adversary abajo, partner derecha, conflict izquierda)
  const positioned = data ? data.nodes.map((n) => {
    if (n.id === 'ES') return { ...n, x: W / 2, y: H / 2 }
    // Group placement (deterministic, no animation needed)
    const groupAngle: Record<string, number> = {
      ally: -Math.PI / 2,        // top
      adversary: Math.PI / 2,    // bottom
      partner: 0,                 // right
      conflict: Math.PI,         // left
    }
    const base = groupAngle[n.group] ?? 0
    const idx = data.nodes.filter((x) => x.group === n.group).indexOf(n)
    const total = data.nodes.filter((x) => x.group === n.group).length
    const spread = total > 1 ? (Math.PI / 3) * (idx / (total - 1) - 0.5) : 0
    const angle = base + spread
    const radius = 180 + (n.group === 'conflict' ? 30 : 0)
    return {
      ...n,
      x: W / 2 + radius * Math.cos(angle),
      y: H / 2 + radius * Math.sin(angle),
    }
  }) : []

  const nodeById: Record<string, typeof positioned[number]> = {}
  for (const n of positioned) nodeById[n.id] = n

  const filteredEdges = data ? data.edges.filter((e) => kindFilter === 'all' || e.kind === kindFilter) : []

  return (
    <section style={{ background: '#0f172a', borderRadius: 12, padding: 18, color: '#f1f5f9' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#fbbf24', textTransform: 'uppercase' }}>
            ◆ Stakeholder Impact Network · feature novedosa
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
            España centro · aliados arriba · adversarios abajo · socios derecha · conflictos izquierda
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'T', 'S', 'E', 'M'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(k)}
              style={{
                background: kindFilter === k ? (k === 'all' ? '#fbbf24' : KIND_COLOR[k]) : '#1e293b',
                color: kindFilter === k ? '#0f172a' : '#94a3b8',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: 0.5,
              }}
            >
              {k === 'all' ? 'TODO' : k === 'T' ? 'COMERCIO' : k === 'S' ? 'SEGURIDAD' : k === 'E' ? 'ENERGÍA' : 'MIGRACIÓN'}
            </button>
          ))}
        </div>
      </header>
      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando network…</p>}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16, alignItems: 'flex-start' }}>
          <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: '#020617', borderRadius: 8 }}>
            {/* Edges */}
            {filteredEdges.map((e, i) => {
              const s = nodeById[e.source]
              const t = nodeById[e.target]
              if (!s || !t) return null
              const stroke = KIND_COLOR[e.kind] || '#475569'
              return (
                <line key={`e-${i}`}
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={stroke}
                  strokeWidth={Math.max(0.5, e.weight / 3)}
                  opacity={hoverNode && hoverNode.id !== s.id && hoverNode.id !== t.id ? 0.1 : 0.5}
                />
              )
            })}
            {/* Nodes */}
            {positioned.map((n) => {
              const c = GROUP_COLOR[n.group] || '#94a3b8'
              const isHover = hoverNode?.id === n.id
              return (
                <g key={n.id}
                  onMouseEnter={() => setHoverNode(n)}
                  onMouseLeave={() => setHoverNode(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={n.x} cy={n.y} r={n.size / 2}
                    fill={c}
                    opacity={hoverNode && !isHover ? 0.35 : 1}
                    stroke={isHover ? '#fff' : '#0f172a'}
                    strokeWidth={isHover ? 2 : 1}
                  />
                  <text x={n.x} y={n.y + n.size / 2 + 12}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={n.group === 'self' ? 700 : 500}
                    fill={isHover ? '#fbbf24' : '#cbd5e1'}
                  >
                    {n.label}
                  </text>
                </g>
              )
            })}
          </svg>

          <div>
            {hoverNode ? (
              <div style={{
                background: '#1e293b',
                borderLeft: `4px solid ${GROUP_COLOR[hoverNode.group]}`,
                borderRadius: 6,
                padding: 10,
                marginBottom: 10,
              }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{hoverNode.label}</p>
                <p style={{ margin: '6px 0 0', fontSize: 10, color: '#94a3b8', textTransform: 'capitalize', letterSpacing: 0.5 }}>
                  Grupo · {hoverNode.group}
                </p>
                {data && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ margin: 0, fontSize: 10, color: '#fbbf24', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      Conexiones
                    </p>
                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {data.edges.filter((e) => e.source === hoverNode.id || e.target === hoverNode.id).slice(0, 8).map((e, i) => {
                        const other = e.source === hoverNode.id ? e.target : e.source
                        const otherNode = nodeById[other]
                        return (
                          <div key={i} style={{ fontSize: 10, color: '#cbd5e1' }}>
                            <span style={{ color: KIND_COLOR[e.kind], fontWeight: 700 }}>{e.kind}</span>
                            {' → '}
                            <strong>{otherNode?.label || other}</strong>
                            <span style={{ color: '#64748b', marginLeft: 4 }}>· {e.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#64748b', padding: 10, border: '1px dashed #334155', borderRadius: 6, marginBottom: 10 }}>
                Hover sobre un nodo para ver conexiones.
              </div>
            )}
            {data && (
              <div style={{ fontSize: 9, color: '#64748b' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#fbbf24', letterSpacing: 0.5, textTransform: 'uppercase' }}>Grupos</p>
                {Object.entries(data.legend.groups).map(([k, label]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: GROUP_COLOR[k], display: 'inline-block' }} />
                    <span>{label}</span>
                  </div>
                ))}
                <p style={{ margin: '8px 0 4px', fontWeight: 700, color: '#fbbf24', letterSpacing: 0.5, textTransform: 'uppercase' }}>Tipo edge</p>
                {Object.entries(data.legend.edge_kinds).map(([k, label]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <span style={{ width: 12, height: 2, background: KIND_COLOR[k], display: 'inline-block' }} />
                    <span><strong>{k}</strong> · {label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default GeoStakeholderGraph
