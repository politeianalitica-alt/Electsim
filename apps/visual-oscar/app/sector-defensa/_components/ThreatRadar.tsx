'use client'
/**
 * Threat Radar · radar chart SVG procedural de 6 dimensiones doctrinarias
 * (Ciber, Espacial, Marítimo, Aéreo, Terrestre, Híbrido).
 *
 * Sin dependencias externas — todo es <svg> calculado.
 */
import type { ThreatRadar } from '@/lib/defense/analisis-defensa'

export function ThreatRadarChart({ radar }: { radar: ThreatRadar }) {
  const W = 360, H = 360
  const cx = W / 2, cy = H / 2
  const rMax = 130
  const N = radar.dimensiones.length

  // Anillos concéntricos a 25/50/75/100
  const anillos = [25, 50, 75, 100]

  // Puntos del polígono datos
  const puntos = radar.dimensiones.map((d, i) => {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2
    const r = (d.nivel / 100) * rMax
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      labelX: cx + (rMax + 28) * Math.cos(angle),
      labelY: cy + (rMax + 28) * Math.sin(angle),
      dim: d,
      angle,
    }
  })
  const polygonPath = puntos.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // Color global según nivel
  const colorGlobal = radar.nivelGlobal >= 75 ? '#DC2626' : radar.nivelGlobal >= 60 ? '#F97316' : radar.nivelGlobal >= 45 ? '#F59E0B' : '#16A34A'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, color: '#6e6e73' }}>
          Modelo basado en doctrina OTAN multi-dominio · 6 dimensiones operacionales
        </p>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 9, color: '#86868b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>NIVEL GLOBAL</p>
          <p style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 700, color: colorGlobal, fontFamily: 'var(--font-display)' }}>
            {radar.nivelGlobal}<span style={{ fontSize: 12, color: '#6e6e73' }}>/100</span>
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'center' }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Anillos */}
          {anillos.map(p => (
            <circle key={p} cx={cx} cy={cy} r={(p / 100) * rMax} fill="none" stroke="#ECECEF" strokeWidth={1} strokeDasharray={p === 100 ? '0' : '2,3'}/>
          ))}
          {/* Etiquetas de anillo */}
          {[50, 100].map(p => (
            <text key={p} x={cx + 3} y={cy - (p / 100) * rMax - 2} style={{ fontSize: 8, fill: '#9CA3AF' }}>{p}</text>
          ))}
          {/* Ejes */}
          {puntos.map((p, i) => (
            <line key={i} x1={cx} y1={cy} x2={cx + rMax * Math.cos(p.angle)} y2={cy + rMax * Math.sin(p.angle)} stroke="#F5F5F7" strokeWidth={1}/>
          ))}
          {/* Polígono datos */}
          <polygon points={polygonPath} fill={`${colorGlobal}30`} stroke={colorGlobal} strokeWidth={2}/>
          {/* Puntos */}
          {puntos.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={5} fill={p.dim.color} stroke="#fff" strokeWidth={2}>
                <title>{p.dim.dimension}: {p.dim.nivel}/100 ({p.dim.banda})</title>
              </circle>
            </g>
          ))}
          {/* Etiquetas */}
          {puntos.map((p, i) => {
            // Calcular el text-anchor según posición
            const dx = Math.cos(p.angle)
            const anchor = Math.abs(dx) < 0.3 ? 'middle' : dx > 0 ? 'start' : 'end'
            return (
              <g key={i}>
                <text x={p.labelX} y={p.labelY - 3} textAnchor={anchor} style={{ fontSize: 11, fontWeight: 700, fill: '#1d1d1f' }}>
                  {p.dim.dimension}
                </text>
                <text x={p.labelX} y={p.labelY + 9} textAnchor={anchor} style={{ fontSize: 9.5, fill: p.dim.color, fontWeight: 600 }}>
                  {p.dim.nivel}/100 · {p.dim.banda}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Tabla de dimensiones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {radar.dimensiones.map((d, i) => (
            <div key={i} style={{ padding: 8, borderRadius: 8, background: '#FAFAFA', borderLeft: `3px solid ${d.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{d.dimension}</span>
                <span style={{ fontSize: 10, color: d.color, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: `${d.color}15` }}>
                  {d.nivel}/100 · {d.banda}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {d.factores.map(f => (
                  <span key={f} style={{ fontSize: 9.5, color: '#6e6e73', background: '#fff', padding: '1px 5px', borderRadius: 4, border: '1px solid #ECECEF' }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
