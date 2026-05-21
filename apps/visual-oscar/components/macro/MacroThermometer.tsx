'use client'
/**
 * `<MacroThermometer />` · Gauge SVG semicircular para score 0-100.
 *
 * Reutilizable extracción del hero original /macro.
 * Compact mode reduce el tamaño para hero compacto.
 */
interface MacroThermometerProps {
  value: number   // 0-100
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function MacroThermometer({ value, size = 'md', showLabel = true }: MacroThermometerProps) {
  const v = Math.max(0, Math.min(100, value))
  const dim = size === 'sm' ? { w: 100, h: 60, stroke: 5 } : size === 'lg' ? { w: 240, h: 140, stroke: 10 } : { w: 160, h: 90, stroke: 7 }

  // Calcular ángulo: 0 = 180° (izquierda), 100 = 0° (derecha)
  // Arco va de [20, 100] a [180, 100] · 80px radio
  const cx = dim.w / 2
  const cy = dim.h * 0.85
  const r = dim.h * 0.75
  const angle = Math.PI - (v / 100) * Math.PI  // π → 0
  const px = cx + r * Math.cos(angle)
  const py = cy - r * Math.sin(angle)

  const status =
    v >= 70 ? { label: 'Favorable', color: '#16A34A' } :
    v >= 55 ? { label: 'Mixta',     color: '#EAB308' } :
    v >= 40 ? { label: 'Tensiones', color: '#F97316' } :
              { label: 'Adversa',   color: '#DC2626' }

  return (
    <div style={{ textAlign: 'center', display: 'inline-block' }}>
      <svg viewBox={`0 0 ${dim.w} ${dim.h}`} width={dim.w} height={dim.h}>
        <defs>
          <linearGradient id="macroThermoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#DC2626" />
            <stop offset="40%"  stopColor="#F97316" />
            <stop offset="70%"  stopColor="#EAB308" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
        </defs>
        {/* Arco background gris */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          stroke="#e5e7eb"
          strokeWidth={dim.stroke}
          fill="none"
          strokeLinecap="round"
        />
        {/* Arco coloreado proporcional al valor */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          stroke="url(#macroThermoGradient)"
          strokeWidth={dim.stroke}
          fill="none"
          strokeDasharray={`${(v / 100) * Math.PI * r} ${Math.PI * r}`}
          strokeLinecap="round"
        />
        {/* Aguja */}
        <circle cx={px} cy={py} r={dim.stroke * 0.9} fill="#fff" stroke={status.color} strokeWidth={2} />
        {/* Valor */}
        <text
          x={cx}
          y={cy - r * 0.35}
          textAnchor="middle"
          fontSize={dim.h * 0.32}
          fontWeight={700}
          fill="#0f172a"
          fontFamily="var(--font-display, system-ui)"
        >
          {v}
        </text>
      </svg>
      {showLabel && (
        <div style={{ fontSize: size === 'sm' ? 10 : 12, fontWeight: 700, color: status.color, marginTop: -4, letterSpacing: 0.4 }}>
          {status.label.toUpperCase()}
        </div>
      )}
    </div>
  )
}

export default MacroThermometer
