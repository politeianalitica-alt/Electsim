'use client'

import Link from 'next/link'
import type { CommoditySnapshot } from '@/types/commodities'
import { fmtPct } from '@/lib/commodities-utils'

interface Props {
  items: CommoditySnapshot[]
  /** Tamaño max de celda · ajusta densidad. */
  cellMin?: number
}

function heatColor(change: number | null | undefined): { bg: string; fg: string } {
  if (change == null) return { bg: '#f3f4f6', fg: '#9ca3af' }
  const v = Math.max(-5, Math.min(5, change))
  // -5 → rojo intenso · 0 → gris · +5 → verde intenso
  const intensity = Math.min(1, Math.abs(v) / 5)
  if (v > 0) {
    const g = Math.round(74 + (220 - 74) * (1 - intensity)) // claro→oscuro verde
    return { bg: `rgba(34,197,94,${0.25 + intensity * 0.65})`, fg: g > 130 ? '#065f46' : '#fff' }
  }
  if (v < 0) {
    return { bg: `rgba(220,38,38,${0.25 + intensity * 0.65})`, fg: intensity > 0.5 ? '#fff' : '#7f1d1d' }
  }
  return { bg: '#e5e7eb', fg: '#374151' }
}

export function PriceHeatmap({ items, cellMin = 110 }: Props) {
  if (!items.length) return null
  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
        Mapa de calor · variación diaria %
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${cellMin}px, 1fr))`,
          gap: 4,
        }}
      >
        {items.map((it) => {
          const c = heatColor(it.change_pct)
          return (
            <Link
              key={it.slug}
              href={`/commodities/${it.slug}`}
              title={`${it.name} · ${fmtPct(it.change_pct)}`}
              style={{
                background: c.bg,
                color: c.fg,
                padding: '8px 10px',
                borderRadius: 4,
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minHeight: 50,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.85, lineHeight: 1.1 }}>
                {it.name.split('·')[0].trim()}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtPct(it.change_pct)}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
