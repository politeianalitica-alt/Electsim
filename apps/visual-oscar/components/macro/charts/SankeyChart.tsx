'use client'
/**
 * `<SankeyChart />` · Diagrama Sankey simplificado en SVG inline.
 *
 * Útil para visualizar flujos:
 *   - Flujos de capital país → sector → CCAA
 *   - Comercio España → socios principales
 *   - Composición demanda (consumo + inversión + exterior → PIB)
 *
 * Implementación simple de 2-3 niveles (source → middle → target).
 * No usa d3-sankey para mantener cero deps. Apto para 5-15 flujos.
 */

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color?: string;
}

interface SankeyNode {
  id: string;
  label: string;
  level: number; // 0 = izquierda, 1 = centro, 2 = derecha
  color?: string;
}

interface Props {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width?: number;
  height?: number;
  title?: string;
  unit?: string;
}

const COLORS = ['#0F766E', '#7c3aed', '#dc2626', '#f59e0b', '#16a34a', '#0891b2', '#8b5cf6', '#f97316', '#0ea5e9', '#10b981']

export function SankeyChart({
  nodes,
  links,
  width = 800,
  height = 380,
  title,
  unit = '',
}: Props) {
  if (!nodes || nodes.length === 0 || !links || links.length === 0) return null

  // Agrupar nodos por nivel
  const levels: SankeyNode[][] = []
  for (const n of nodes) {
    if (!levels[n.level]) levels[n.level] = []
    levels[n.level].push(n)
  }
  const numLevels = levels.length

  // Posiciones X por nivel
  const margin = { top: 20, right: 120, bottom: 20, left: 120 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  const xByLevel = (lvl: number) => margin.left + (lvl / Math.max(numLevels - 1, 1)) * innerW

  // Calcular alturas de nodos basadas en flujo total
  const nodeFlow: Record<string, number> = {}
  for (const link of links) {
    nodeFlow[link.source] = (nodeFlow[link.source] ?? 0) + link.value
    nodeFlow[link.target] = (nodeFlow[link.target] ?? 0) + link.value
  }

  // Para cada nivel, calcular altura por nodo proporcional
  const nodePositions: Record<string, { x: number; y: number; h: number; color: string }> = {}
  for (let lvl = 0; lvl < numLevels; lvl++) {
    const levelNodes = levels[lvl] || []
    const totalFlow = levelNodes.reduce((s, n) => s + (nodeFlow[n.id] ?? 0), 0) || 1
    const gap = 8
    const availableH = innerH - gap * (levelNodes.length - 1)
    let yCursor = margin.top
    levelNodes.forEach((n, idx) => {
      const h = (nodeFlow[n.id] ?? 0) / totalFlow * availableH
      nodePositions[n.id] = {
        x: xByLevel(lvl),
        y: yCursor,
        h: Math.max(h, 8),
        color: n.color || COLORS[idx % COLORS.length],
      }
      yCursor += Math.max(h, 8) + gap
    })
  }

  // Cursors para acumular Y dentro de cada nodo según se van añadiendo links
  const sourceCursors: Record<string, number> = {}
  const targetCursors: Record<string, number> = {}

  const NODE_W = 14

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#475569', textTransform: 'uppercase' }}>
          {title}
        </p>
      )}
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {/* Links */}
        {links.map((link, i) => {
          const s = nodePositions[link.source]
          const t = nodePositions[link.target]
          if (!s || !t) return null
          const flowRatio = link.value / Math.max(...links.map((l) => l.value))
          const linkH = Math.max(2, flowRatio * 20)
          const sY = s.y + (sourceCursors[link.source] ?? 0) + linkH / 2
          const tY = t.y + (targetCursors[link.target] ?? 0) + linkH / 2
          sourceCursors[link.source] = (sourceCursors[link.source] ?? 0) + linkH
          targetCursors[link.target] = (targetCursors[link.target] ?? 0) + linkH

          const x1 = s.x + NODE_W
          const x2 = t.x
          const cx1 = x1 + (x2 - x1) * 0.5
          const cx2 = x2 - (x2 - x1) * 0.5

          const path = `M ${x1} ${sY} C ${cx1} ${sY}, ${cx2} ${tY}, ${x2} ${tY}`
          return (
            <path
              key={`l-${i}`}
              d={path}
              stroke={link.color || s.color}
              strokeWidth={linkH}
              fill="none"
              opacity={0.4}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const p = nodePositions[n.id]
          if (!p) return null
          const labelX = n.level === 0 ? p.x - 4 : p.x + NODE_W + 4
          const anchor = n.level === 0 ? 'end' : 'start'
          return (
            <g key={n.id}>
              <rect x={p.x} y={p.y} width={NODE_W} height={p.h} fill={p.color} rx={2} />
              <text
                x={labelX}
                y={p.y + p.h / 2}
                fontSize={11}
                fill="#0f172a"
                fontWeight={600}
                textAnchor={anchor as 'start' | 'end'}
                dy="0.35em"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {n.label}
              </text>
              <text
                x={labelX}
                y={p.y + p.h / 2 + 12}
                fontSize={9}
                fill="#94a3b8"
                textAnchor={anchor as 'start' | 'end'}
                fontFamily="system-ui"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {(nodeFlow[n.id] ?? 0).toFixed(1)}{unit}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default SankeyChart
