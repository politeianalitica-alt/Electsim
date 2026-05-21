'use client'

import { useMemo } from 'react'

interface GrupoSeat {
  id: string
  nombre: string
  acronimo: string
  diputados: number
  color: string
}

interface HemicycleChartProps {
  grupos: GrupoSeat[]
  totalEscanos?: number
  width?: number
  height?: number
  highlightedGrupo?: string
  onGrupoClick?: (grupoId: string) => void
}

interface SeatPosition {
  x: number
  y: number
  grupoId: string
  color: string
}

function computeSeats(grupos: GrupoSeat[], total: number): SeatPosition[] {
  const seats: SeatPosition[] = []
  const cx = 0
  const cy = 0
  const rows = 6
  const innerRadius = 60
  const outerRadius = 130

  // Build ordered list of groups by political position (right to left arc)
  const orderedGrupos = [...grupos].sort((a, b) => {
    // Simple ordering: put governing coalition first (left side), opposition second (right)
    return b.diputados - a.diputados
  })

  // Total seats to place
  const totalSeats = orderedGrupos.reduce((s, g) => s + g.diputados, 0)
  if (totalSeats === 0) return seats

  // Place seats in semicircular rows
  const seatsPerRow: number[] = []
  const rowFractions: number[] = []

  for (let r = 0; r < rows; r++) {
    const frac = (r + 0.5) / rows
    rowFractions.push(frac)
  }

  // Compute circumference of each row proportional to radius
  const rowRadii = rowFractions.map(f => innerRadius + f * (outerRadius - innerRadius))
  const totalCirc = rowRadii.reduce((s, r) => s + r, 0)

  rowRadii.forEach(r => {
    const n = Math.round((r / totalCirc) * totalSeats)
    seatsPerRow.push(n)
  })

  // Adjust last row to match total
  const diff = totalSeats - seatsPerRow.reduce((s, n) => s + n, 0)
  seatsPerRow[rows - 1] += diff

  // Assign seats to groups
  const seatQueue: Array<{ grupoId: string; color: string }> = []
  for (const g of orderedGrupos) {
    for (let i = 0; i < g.diputados; i++) {
      seatQueue.push({ grupoId: g.id, color: g.color })
    }
  }

  let idx = 0
  for (let r = 0; r < rows; r++) {
    const radius = rowRadii[r]
    const n = seatsPerRow[r]
    for (let s = 0; s < n; s++) {
      if (idx >= seatQueue.length) break
      const angle = Math.PI - (s / (n - 1 || 1)) * Math.PI // 180° to 0°
      const x = cx + radius * Math.cos(angle)
      const y = cy - radius * Math.sin(angle)
      seats.push({ x, y, ...seatQueue[idx] })
      idx++
    }
  }

  return seats
}

export default function HemicycleChart({
  grupos,
  totalEscanos = 350,
  width = 480,
  height = 260,
  highlightedGrupo,
  onGrupoClick,
}: HemicycleChartProps) {
  const seats = useMemo(() => computeSeats(grupos, totalEscanos), [grupos, totalEscanos])

  const cx = width / 2
  const cy = height - 20

  if (grupos.length === 0) {
    return (
 <div
        className="flex items-center justify-center"
        style={{ width, height }}
      >
 <span style={{ color: 'var(--color-ink-3)', fontSize: 14 }}>Sin datos</span>
 </div>
    )
  }

  return (
 <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Hemiciclo del Congreso de los Diputados"
    >
      {/* Base arc */}
 <path
        d={`M ${cx - 145} ${cy} A 145 145 0 0 1 ${cx + 145} ${cy}`}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={1}
      />

      {/* Seats */}
      {seats.map((s, i) => {
        const isHighlighted = !highlightedGrupo || s.grupoId === highlightedGrupo
        return (
 <circle
            key={i}
            cx={cx + s.x}
            cy={cy + s.y}
            r={3.8}
            fill={s.color}
            opacity={isHighlighted ? 1 : 0.2}
            style={{ cursor: onGrupoClick ? 'pointer' : 'default', transition: 'opacity 0.2s' }}
            onClick={() => onGrupoClick?.(s.grupoId)}
          />
        )
      })}

      {/* Center label */}
 <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fontSize={13}
        fontWeight={600}
        fill="var(--color-ink)"
      >
        {totalEscanos}
 </text>
 <text
        x={cx}
        y={cy + 8}
        textAnchor="middle"
        fontSize={10}
        fill="var(--color-ink-2)"
      >
        escaños
 </text>
 </svg>
  )
}
