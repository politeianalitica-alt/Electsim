'use client'
/**
 * `<RadarChart />` · SVG inline radar (spider) chart para visualizar
 * dimensiones múltiples normalizadas 0-100. Ideal para Riesgo sistémico
 * (5 dimensiones: deuda · déficit · inflación · paro · spread) o
 * Competitividad (productividad · I+D · industria · exports · empleo).
 */

interface RadarAxis {
  id: string;
  label: string;
  value: number; // 0-100 normalizado
  /** Override color del punto/label si quieres destacar uno. */
  color?: string;
}

interface Props {
  data: RadarAxis[];
  size?: number;
  title?: string;
  accent?: string;
  /** Etiqueta del valor central (puntuación compuesta opcional). */
  centerLabel?: string;
  centerValue?: number | null;
}

export function RadarChart({
  data,
  size = 320,
  title,
  accent = '#7c3aed',
  centerLabel,
  centerValue,
}: Props) {
  if (!data || data.length < 3) {
    return (
      <p style={{ fontSize: 12, color: '#94a3b8', padding: 12 }}>
        Radar requiere al menos 3 dimensiones.
      </p>
    )
  }

  const cx = size / 2
  const cy = size / 2
  const R = size * 0.38
  const N = data.length

  // Anillos de referencia (25, 50, 75, 100)
  const rings = [25, 50, 75, 100]

  // Calcular vértices del polígono
  const points = data.map((d, i) => {
    const angle = (i / N) * 2 * Math.PI - Math.PI / 2
    const r = (Math.max(0, Math.min(100, d.value)) / 100) * R
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    return { ...d, x, y, angle }
  })

  const polygonPath = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {title && (
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#475569', textTransform: 'uppercase' }}>
          {title}
        </p>
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        {/* Anillos */}
        {rings.map((pct, idx) => (
          <circle
            key={pct}
            cx={cx}
            cy={cy}
            r={(pct / 100) * R}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={idx === rings.length - 1 ? 1.2 : 0.6}
          />
        ))}

        {/* Ejes radiales */}
        {points.map((p, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + R * Math.cos(p.angle)}
            y2={cy + R * Math.sin(p.angle)}
            stroke="#cbd5e1"
            strokeWidth={0.4}
          />
        ))}

        {/* Polígono de datos */}
        <polygon
          points={polygonPath}
          fill={`${accent}30`}
          stroke={accent}
          strokeWidth={1.6}
        />

        {/* Puntos */}
        {points.map((p) => (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r={3.2} fill={p.color || accent} stroke="#fff" strokeWidth={1.2} />
            <text
              x={p.x}
              y={p.y - 5}
              fontSize={8.5}
              fill={p.color || accent}
              fontWeight={700}
              textAnchor="middle"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {Math.round(p.value)}
            </text>
          </g>
        ))}

        {/* Labels de ejes (texto fuera del polígono) */}
        {points.map((p, i) => {
          const labelR = R + 22
          const lx = cx + labelR * Math.cos(p.angle)
          const ly = cy + labelR * Math.sin(p.angle)
          // Anchor depende de la posición angular
          let anchor: 'start' | 'middle' | 'end' = 'middle'
          if (p.angle > -Math.PI / 4 && p.angle < Math.PI / 4) anchor = 'start'
          else if (p.angle > (3 * Math.PI) / 4 || p.angle < -(3 * Math.PI) / 4) anchor = 'end'
          return (
            <text
              key={`l-${i}`}
              x={lx}
              y={ly}
              fontSize={9.5}
              fill="#0f172a"
              fontWeight={600}
              textAnchor={anchor}
              fontFamily="system-ui, -apple-system, sans-serif"
              dy="0.35em"
            >
              {p.label}
            </text>
          )
        })}

        {/* Valor central */}
        {centerValue != null && (
          <>
            <text
              x={cx}
              y={cy}
              fontSize={26}
              fill={accent}
              fontWeight={700}
              textAnchor="middle"
              dy="0.35em"
              fontFamily="system-ui"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(centerValue)}
            </text>
            {centerLabel && (
              <text
                x={cx}
                y={cy + 18}
                fontSize={8}
                fill="#94a3b8"
                fontWeight={600}
                textAnchor="middle"
                fontFamily="system-ui"
              >
                {centerLabel}
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  )
}

export default RadarChart
