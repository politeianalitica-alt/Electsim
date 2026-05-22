'use client'
/**
 * `<Treemap />` · SVG inline treemap simplificado (squarified treemap).
 *
 * Útil para visualizar:
 *   - Composición sectorial (sector × peso PIB)
 *   - Top exportaciones (producto HS × valor)
 *   - IED por sector receptor
 *
 * Algoritmo squarified básico: ordena por valor descendente y rellena
 * filas horizontales. No es perfecto pero produce treemaps legibles
 * para 5-20 elementos.
 */

interface TreemapNode {
  id: string;
  label: string;
  value: number;
  color?: string;
  href?: string;
}

interface Props {
  data: TreemapNode[];
  width?: number;
  height?: number;
  title?: string;
  unit?: string;
  formatValue?: (v: number) => string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  node: TreemapNode;
}

function squarify(nodes: TreemapNode[], x: number, y: number, w: number, h: number): Rect[] {
  if (nodes.length === 0) return []
  const total = nodes.reduce((s, n) => s + n.value, 0) || 1

  // Caso base: 1 nodo
  if (nodes.length === 1) {
    return [{ x, y, w, h, node: nodes[0] }]
  }

  // Estrategia simple: si w > h, dividir vertical (filas); si no, horizontal
  // Tomar primer ~50% del total como bloque grande, resto recursivo
  const sorted = nodes.slice().sort((a, b) => b.value - a.value)
  const half = total / 2
  let acc = 0
  let splitIdx = 0
  for (let i = 0; i < sorted.length; i++) {
    acc += sorted[i].value
    if (acc >= half) {
      splitIdx = i + 1
      break
    }
  }
  if (splitIdx === 0) splitIdx = 1
  if (splitIdx >= sorted.length) splitIdx = sorted.length - 1

  const first = sorted.slice(0, splitIdx)
  const rest = sorted.slice(splitIdx)
  const firstTotal = first.reduce((s, n) => s + n.value, 0)
  const ratio = firstTotal / total

  if (w >= h) {
    // Split vertical: first ocupa la izquierda
    const firstW = Math.max(1, w * ratio)
    return [
      ...squarify(first, x, y, firstW, h),
      ...squarify(rest, x + firstW, y, w - firstW, h),
    ]
  } else {
    // Split horizontal: first ocupa arriba
    const firstH = Math.max(1, h * ratio)
    return [
      ...squarify(first, x, y, w, firstH),
      ...squarify(rest, x, y + firstH, w, h - firstH),
    ]
  }
}

const COLORS = ['#0F766E', '#7c3aed', '#dc2626', '#f59e0b', '#16a34a', '#0891b2', '#8b5cf6', '#f97316', '#0ea5e9', '#10b981', '#ef4444', '#a855f7']

export function Treemap({
  data,
  width = 720,
  height = 360,
  title,
  unit = '',
  formatValue,
}: Props) {
  if (!data || data.length === 0) return null

  // Color por defecto si no se especifica
  const enriched = data.map((d, i) => ({ ...d, color: d.color || COLORS[i % COLORS.length] }))
  const rects = squarify(enriched, 0, 0, width, height)

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#475569', textTransform: 'uppercase' }}>
          {title}
        </p>
      )}
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {rects.map((r, i) => {
          const fontSize = Math.max(8, Math.min(16, Math.sqrt(r.w * r.h) / 12))
          const showLabel = r.w > 60 && r.h > 30
          const showValue = r.w > 80 && r.h > 50
          const tag = r.node.href ? 'a' : 'g'
          const wrapperProps = r.node.href ? { href: r.node.href } : {}
          return (
            <a key={r.node.id} {...wrapperProps} style={{ cursor: r.node.href ? 'pointer' : 'default' }}>
              <rect
                x={r.x}
                y={r.y}
                width={Math.max(0, r.w - 2)}
                height={Math.max(0, r.h - 2)}
                fill={r.node.color}
                stroke="#fff"
                strokeWidth={2}
                rx={3}
                opacity={0.88}
              />
              {showLabel && (
                <text
                  x={r.x + 6}
                  y={r.y + 14}
                  fontSize={fontSize}
                  fill="#fff"
                  fontWeight={700}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {r.node.label.length > Math.floor(r.w / (fontSize * 0.55))
                    ? r.node.label.slice(0, Math.floor(r.w / (fontSize * 0.55)) - 1) + '…'
                    : r.node.label}
                </text>
              )}
              {showValue && (
                <text
                  x={r.x + 6}
                  y={r.y + 14 + fontSize + 2}
                  fontSize={Math.max(8, fontSize * 0.78)}
                  fill="#fff"
                  fontWeight={600}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  opacity={0.9}
                  style={{ pointerEvents: 'none' }}
                >
                  {formatValue ? formatValue(r.node.value) : r.node.value.toFixed(1) + unit}
                </text>
              )}
            </a>
          )
        })}
      </svg>
    </div>
  )
}

export default Treemap
