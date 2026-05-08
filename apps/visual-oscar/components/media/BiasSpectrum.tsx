'use client'
import { useState } from 'react'

type IdeologiaPercibida =
  | 'izquierda'
  | 'centroizquierda'
  | 'centro'
  | 'centroderecha'
  | 'derecha'
  | 'nacionalista'

interface MedioItem {
  nombre: string
  ideologia_percibida: string
  audiencia_mensual_M: number
  grupo_mediatico: string
  tipo: string
  n_articulos_recientes: number
}

interface BiasSpectrumProps {
  medios: MedioItem[]
}

const IDEOLOGY_X: Record<IdeologiaPercibida, number> = {
  izquierda: 5,
  centroizquierda: 25,
  centro: 50,
  centroderecha: 70,
  derecha: 88,
  nacionalista: 50,
}

const IDEOLOGY_COLOR: Record<IdeologiaPercibida, string> = {
  izquierda: '#e74c3c',
  centroizquierda: '#e67e22',
  centro: '#95a5a6',
  centroderecha: '#3498db',
  derecha: '#2c3e50',
  nacionalista: '#9b59b6',
}

function getRadius(audiencia: number, maxAudiencia: number): number {
  if (maxAudiencia === 0) return 20
  const ratio = audiencia / maxAudiencia
  return Math.round(20 + ratio * 40)
}

interface TooltipData {
  medio: MedioItem
  x: number
  y: number
}

export default function BiasSpectrum({ medios }: BiasSpectrumProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const maxAudiencia = medios.reduce(
    (max, m) => Math.max(max, m.audiencia_mensual_M),
    0
  )

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 22,
        padding: '20px 20px 16px',
        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
        border: '1px solid #e8e8ed',
        fontFamily: '-apple-system, system-ui, sans-serif',
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#1d1d1f',
            letterSpacing: '-0.01em',
          }}
        >
          Espectro de Sesgo Político
        </div>
        <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 2 }}>
          Tamaño de burbuja = audiencia mensual
        </div>
      </div>

      {/* Axis labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          fontWeight: 600,
          color: '#6e6e73',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginTop: 12,
          marginBottom: 4,
        }}
      >
        <span>Izquierda</span>
        <span>Derecha</span>
      </div>

      {/* Gradient bar */}
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background:
            'linear-gradient(to right, #e74c3c, #e67e22, #95a5a6, #3498db, #2c3e50)',
          marginBottom: 8,
        }}
      />

      {/* Bubble container */}
      <div
        style={{
          position: 'relative',
          height: 200,
          overflow: 'visible',
        }}
      >
        {medios.map((medio, i) => {
          const xPct = IDEOLOGY_X[medio.ideologia_percibida as IdeologiaPercibida] ?? 50
          const radius = getRadius(medio.audiencia_mensual_M, maxAudiencia)
          const color = IDEOLOGY_COLOR[medio.ideologia_percibida as IdeologiaPercibida] ?? '#95a5a6'
          const label = medio.nombre.slice(0, 12)

          // Stagger vertical position to reduce overlap
          const row = i % 3
          const yBase = 30 + row * 55
          const yPx = yBase + (radius / 2)

          return (
            <div
              key={`${medio.nombre}-${i}`}
              onMouseEnter={(e) => {
                const rect = (
                  e.currentTarget.parentElement as HTMLDivElement
                ).getBoundingClientRect()
                const cx =
                  e.currentTarget.getBoundingClientRect().left -
                  rect.left +
                  radius
                const cy =
                  e.currentTarget.getBoundingClientRect().top -
                  rect.top
                setTooltip({ medio, x: cx, y: cy })
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{
                position: 'absolute',
                left: `calc(${xPct}% - ${radius}px)`,
                top: yPx,
                width: radius * 2,
                height: radius * 2,
                borderRadius: '50%',
                background: color,
                opacity: 0.85,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'default',
                boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
                transition: 'opacity 150ms, transform 150ms',
                zIndex: 1,
              }}
            >
              <span
                style={{
                  fontSize: Math.max(8, Math.min(11, radius / 3.5)),
                  fontWeight: 700,
                  color: '#fff',
                  textAlign: 'center',
                  lineHeight: 1.1,
                  padding: '0 2px',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  overflow: 'hidden',
                  maxWidth: radius * 2 - 4,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
          )
        })}

        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(tooltip.x, 240),
              top: tooltip.y - 10,
              background: '#1d1d1f',
              color: '#fff',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 11.5,
              lineHeight: 1.55,
              zIndex: 100,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 2 }}>
              {tooltip.medio.nombre}
            </div>
            <div style={{ opacity: 0.8 }}>{tooltip.medio.grupo_mediatico}</div>
            <div>
              {tooltip.medio.audiencia_mensual_M.toFixed(1)} M lectores
            </div>
            <div>
              {tooltip.medio.n_articulos_recientes} arts últimos 7d
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
