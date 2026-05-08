'use client'
import { useApi } from '@/lib/useApi'

interface Posicion {
  partido: string
  posicion_x: number  // -10 izq → +10 der
  posicion_y: number  // -10 lib → +10 aut
  color?: string
}

const FALLBACK: Record<string, Posicion> = {
  PP:    { partido: 'PP',    posicion_x: 4.2,  posicion_y: 2.5,  color: '#1F4E8C' },
  PSOE:  { partido: 'PSOE',  posicion_x: -3.5, posicion_y: -1.0, color: '#E1322D' },
  VOX:   { partido: 'VOX',   posicion_x: 7.8,  posicion_y: 7.2,  color: '#5BA02E' },
  Sumar: { partido: 'Sumar', posicion_x: -7.0, posicion_y: -4.5, color: '#D43F8D' },
  Junts: { partido: 'Junts', posicion_x: 1.2,  posicion_y: 1.8,  color: '#1FA89B' },
  ERC:   { partido: 'ERC',   posicion_x: -4.0, posicion_y: -3.0, color: '#E8A030' },
  PNV:   { partido: 'PNV',   posicion_x: 0.5,  posicion_y: 1.0,  color: '#4D9E33' },
}

interface Props {
  partido: string
  size?: number
}

export default function IdeologicalScatter({ partido, size = 280 }: Props) {
  const { data } = useApi<Posicion[]>(`/api/opposition/posicionamiento?partidos=${encodeURIComponent(partido)}&tema=`, { refreshInterval: 0 })
  const apiPos = Array.isArray(data) ? data[0] : null
  const focused: Posicion = apiPos ?? FALLBACK[partido] ?? { partido, posicion_x: 0, posicion_y: 0, color: '#6e6e73' }

  // Show all known parties to give context
  const others = Object.values(FALLBACK).filter(p => p.partido !== focused.partido)

  // Project to SVG (range -10..+10 → 20..size-20)
  const W = size, H = size
  const px = (x: number) => 20 + ((x + 10) / 20) * (W - 40)
  const py = (y: number) => H - 20 - ((y + 10) / 20) * (H - 40)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12 }}>
        {/* Grid */}
        {[-10, -5, 0, 5, 10].map(v => (
          <g key={`g-${v}`}>
            <line x1={px(v)} y1={20} x2={px(v)} y2={H - 20} stroke="rgba(31,78,140,0.06)" strokeWidth={v === 0 ? 1.5 : 0.5} />
            <line x1={20} y1={py(v)} x2={W - 20} y2={py(v)} stroke="rgba(31,78,140,0.06)" strokeWidth={v === 0 ? 1.5 : 0.5} />
          </g>
        ))}
        {/* Axis labels */}
        <text x={W / 2} y={14} textAnchor="middle" fill="#6e6e73" fontSize={9} fontWeight={600}>autoritario</text>
        <text x={W / 2} y={H - 6} textAnchor="middle" fill="#6e6e73" fontSize={9} fontWeight={600}>libertario</text>
        <text x={6} y={H / 2} textAnchor="start" fill="#6e6e73" fontSize={9} fontWeight={600}>izq.</text>
        <text x={W - 6} y={H / 2} textAnchor="end" fill="#6e6e73" fontSize={9} fontWeight={600}>der.</text>

        {/* Other parties (faded) */}
        {others.map(p => (
          <g key={p.partido}>
            <circle cx={px(p.posicion_x)} cy={py(p.posicion_y)} r={6} fill={p.color ?? '#6e6e73'} fillOpacity={0.35} stroke="white" strokeWidth={1.5} />
            <text x={px(p.posicion_x)} y={py(p.posicion_y) + 18} textAnchor="middle" fill="#6e6e73" fontSize={9}>{p.partido}</text>
          </g>
        ))}
        {/* Focused party */}
        <g>
          <circle cx={px(focused.posicion_x)} cy={py(focused.posicion_y)} r={11} fill={focused.color ?? '#1F4E8C'} fillOpacity={0.95} stroke="white" strokeWidth={2.5} />
          <text x={px(focused.posicion_x)} y={py(focused.posicion_y) + 24} textAnchor="middle" fill="#1d1d1f" fontSize={10.5} fontWeight={700}>{focused.partido}</text>
        </g>
      </svg>
      <div style={{ display: 'flex', gap: 14, fontSize: 10.5, color: '#6e6e73', justifyContent: 'center' }}>
        <span>X (econ): <strong style={{ color: '#1d1d1f', fontFamily: 'var(--font-display,system-ui)' }}>{focused.posicion_x.toFixed(1)}</strong></span>
        <span>Y (social): <strong style={{ color: '#1d1d1f', fontFamily: 'var(--font-display,system-ui)' }}>{focused.posicion_y.toFixed(1)}</strong></span>
      </div>
    </div>
  )
}
