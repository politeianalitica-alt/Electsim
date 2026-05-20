'use client'

import Link from 'next/link'
import type { CommoditySnapshot } from '@/types/commodities'
import {
  CATEGORY_COLORS,
  fmtPct,
  fmtPrice,
  trendArrow,
  trendColor,
  trendOf,
} from '@/lib/commodities-utils'

interface Props {
  item: CommoditySnapshot
  onToggleWatch?: () => void
  isWatched?: boolean
}

export function PriceCard({ item, onToggleWatch, isWatched }: Props) {
  const t = trendOf(item.change_pct)
  const tcol = trendColor(t)
  const catCol = CATEGORY_COLORS[item.category]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 14,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
        <Link
          href={`/commodities/${item.slug}`}
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: '#111827',
            textDecoration: 'none',
            lineHeight: 1.25,
            flex: 1,
          }}
        >
          {item.name}
        </Link>
        {onToggleWatch ? (
          <button
            onClick={onToggleWatch}
            aria-label={isWatched ? 'Quitar de watchlist' : 'Añadir a watchlist'}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 14,
              color: isWatched ? '#f59e0b' : '#9ca3af',
            }}
          >
            {isWatched ? '★' : '☆'}
          </button>
        ) : null}
      </div>

      <span
        style={{
          alignSelf: 'flex-start',
          padding: '2px 8px',
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: catCol.fg,
          background: catCol.bg,
        }}
      >
        {item.category}
      </span>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
          {fmtPrice(item.last_price, item.currency)}
        </span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>{item.unit}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: tcol, fontWeight: 600 }}>
        <span>{trendArrow(t)}</span>
        <span>{fmtPct(item.change_pct)}</span>
        <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 'auto' }}>
          {item.exchange}
        </span>
      </div>

      {!item.available ? (
        <span style={{ fontSize: 10, color: '#dc2626' }}>· precio no disponible</span>
      ) : null}
    </div>
  )
}
