'use client'
/**
 * `<GeopoliticalClock />` · Sprint G3 · feature novedosa.
 *
 * Reloj radial que muestra los 12 conflictos top monitoreados por
 * Politeia como segmentos de pizza, con anillo concéntrico de fase:
 *   - centro (dormant): bajo color gris
 *   - medio (active):  ámbar
 *   - exterior (crisis): rojo
 *
 * No existe en dashboards comerciales (Verisk/Eurasia muestran tablas o
 * heatmaps). Permite escaneo visual rápido: ¿qué conflictos están en
 * fase crisis vs latente?
 *
 * SVG puro (sin libs externas). Hover → tooltip con país + fase + severidad.
 */
import { useState } from 'react'

interface Conflict {
  id: string
  label: string
  phase: 'dormant' | 'active' | 'crisis'
  intensity: number // 0-1
  color: string
}

const CONFLICTS_2026: Conflict[] = [
  { id: 'ua-ru',  label: 'Ucrania-Rusia',         phase: 'crisis',  intensity: 0.95, color: '#dc2626' },
  { id: 'il-ps',  label: 'Israel-Palestina',      phase: 'crisis',  intensity: 0.85, color: '#dc2626' },
  { id: 'il-hz',  label: 'Israel-Hezbolá',        phase: 'crisis',  intensity: 0.75, color: '#dc2626' },
  { id: 'sahel',  label: 'Sahel (Mali/Burkina)',  phase: 'active',  intensity: 0.65, color: '#f97316' },
  { id: 'sudan',  label: 'Sudán',                 phase: 'crisis',  intensity: 0.80, color: '#dc2626' },
  { id: 'taiwan', label: 'Taiwán-China',          phase: 'active',  intensity: 0.55, color: '#f59e0b' },
  { id: 'mig-at', label: 'Migración atlántica',   phase: 'active',  intensity: 0.70, color: '#f97316' },
  { id: 'mig-me', label: 'Migración mediterránea',phase: 'active',  intensity: 0.50, color: '#f59e0b' },
  { id: 'ma-es',  label: 'Marruecos-España',      phase: 'active',  intensity: 0.45, color: '#f59e0b' },
  { id: 've-co',  label: 'Venezuela-Colombia',    phase: 'dormant', intensity: 0.30, color: '#94a3b8' },
  { id: 'libya',  label: 'Libia (división)',      phase: 'dormant', intensity: 0.25, color: '#94a3b8' },
  { id: 'haiti',  label: 'Haití (colapso)',       phase: 'crisis',  intensity: 0.70, color: '#dc2626' },
]

const PHASE_RING: Record<Conflict['phase'], { r: number; bg: string }> = {
  dormant: { r: 60,  bg: '#1e293b' },
  active:  { r: 95,  bg: '#7c2d12' },
  crisis:  { r: 130, bg: '#7f1d1d' },
}

export function GeopoliticalClock() {
  const [hover, setHover] = useState<Conflict | null>(null)
  const W = 360
  const cx = W / 2
  const cy = W / 2
  const segCount = CONFLICTS_2026.length
  const arcStep = (Math.PI * 2) / segCount

  // Polar coord helper
  const polar = (a: number, r: number) => ({
    x: cx + r * Math.cos(a - Math.PI / 2),
    y: cy + r * Math.sin(a - Math.PI / 2),
  })

  return (
    <section style={{ background: '#0f172a', borderRadius: 12, padding: 18, color: '#f1f5f9' }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#fbbf24', textTransform: 'uppercase' }}>
          ◆ Geopolitical Clock · {CONFLICTS_2026.length} conflictos activos · feature novedosa
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
          Reloj radial · centro = dormant · medio = active · exterior = crisis. Hover para detalle.
        </p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <svg width="100%" viewBox={`0 0 ${W} ${W}`} style={{ display: 'block' }}>
            {/* Anillos fase */}
            {(['dormant', 'active', 'crisis'] as const).map((p) => (
              <circle key={p} cx={cx} cy={cy} r={PHASE_RING[p].r} fill="none" stroke={PHASE_RING[p].bg} strokeWidth={1} opacity={0.5} strokeDasharray="3 3" />
            ))}
            {/* Etiquetas anillos */}
            <text x={cx} y={cy - 60 + 4} textAnchor="middle" fontSize={8} fill="#475569">dormant</text>
            <text x={cx} y={cy - 95 + 4} textAnchor="middle" fontSize={8} fill="#92400e">active</text>
            <text x={cx} y={cy - 130 + 4} textAnchor="middle" fontSize={8} fill="#991b1b">crisis</text>

            {/* Segmentos por conflicto */}
            {CONFLICTS_2026.map((c, i) => {
              const a0 = i * arcStep
              const a1 = (i + 1) * arcStep
              const rInner = 30
              const rOuter = PHASE_RING[c.phase].r
              // Sector path
              const p0 = polar(a0, rInner)
              const p1 = polar(a1, rInner)
              const p2 = polar(a1, rOuter)
              const p3 = polar(a0, rOuter)
              const largeArc = arcStep > Math.PI ? 1 : 0
              const path = `M ${p0.x} ${p0.y} L ${p3.x} ${p3.y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p1.x} ${p1.y} A ${rInner} ${rInner} 0 ${largeArc} 0 ${p0.x} ${p0.y} Z`
              // Etiqueta posicion
              const midAngle = (a0 + a1) / 2
              const labelPos = polar(midAngle, rOuter + 14)
              return (
                <g key={c.id}
                  onMouseEnter={() => setHover(c)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <path d={path}
                    fill={c.color}
                    opacity={hover && hover.id !== c.id ? 0.3 : 0.8}
                    stroke="#0f172a" strokeWidth={1}
                  />
                  <text x={labelPos.x} y={labelPos.y}
                    textAnchor="middle"
                    fontSize={8}
                    fill={hover && hover.id === c.id ? '#fbbf24' : '#cbd5e1'}
                    fontWeight={hover && hover.id === c.id ? 700 : 400}
                    transform={
                      midAngle > Math.PI / 2 && midAngle < (Math.PI * 3) / 2
                        ? `rotate(${(midAngle * 180 / Math.PI) - 90 + 180} ${labelPos.x} ${labelPos.y})`
                        : `rotate(${(midAngle * 180 / Math.PI) - 90} ${labelPos.x} ${labelPos.y})`
                    }
                  >
                    {c.label}
                  </text>
                </g>
              )
            })}

            {/* Centro */}
            <circle cx={cx} cy={cy} r={25} fill="#1e293b" stroke="#fbbf24" strokeWidth={1} />
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fbbf24">
              GEO
            </text>
          </svg>
        </div>

        {/* Panel detalle hover */}
        <div style={{ minHeight: 200 }}>
          {hover ? (
            <div style={{
              background: '#1e293b',
              borderLeft: `4px solid ${hover.color}`,
              borderRadius: 6,
              padding: 12,
            }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{hover.label}</p>
              <p style={{ margin: '6px 0 0', fontSize: 10, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Fase · {hover.phase}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#cbd5e1' }}>
                Intensidad · <strong style={{ color: hover.color }}>{(hover.intensity * 100).toFixed(0)}%</strong>
              </p>
              <div style={{ marginTop: 10, height: 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${hover.intensity * 100}%`, background: hover.color, transition: 'width 200ms' }} />
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: 11,
              color: '#64748b',
              padding: 12,
              border: '1px dashed #334155',
              borderRadius: 6,
              textAlign: 'center',
            }}>
              Hover sobre un segmento para ver detalle del conflicto.
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 9, color: '#64748b', lineHeight: 1.5 }}>
            <strong style={{ color: '#fbbf24' }}>Leyenda fases:</strong><br />
            <span style={{ color: '#94a3b8' }}>dormant</span> · latente sin escalada activa<br />
            <span style={{ color: '#f59e0b' }}>active</span> · operaciones en curso<br />
            <span style={{ color: '#dc2626' }}>crisis</span> · alta intensidad + escalada
          </div>
        </div>
      </div>
    </section>
  )
}

export default GeopoliticalClock
