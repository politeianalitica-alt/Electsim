'use client'

import Link from 'next/link'
import type { CommoditySnapshot } from '@/types/commodities'
import { fmtPct, fmtPrice, trendArrow, trendColor, trendOf } from '@/lib/commodities-utils'

interface Props {
  items: CommoditySnapshot[]
  /** Lista de slugs prioritarios · si está vacía usa los más volátiles. */
  highlightSlugs?: string[]
}

const DEFAULT_HIGHLIGHT = [
  'brent_crude',
  'natgas_ttf',
  'wheat_milling_euronext',
  'olive_oil_es',
  'gold_comex',
  'cocoa_ny',
  'palm_oil_klu',
  'copper_lme',
]

export function MarketSummaryBanner({ items, highlightSlugs }: Props) {
  const wanted = highlightSlugs && highlightSlugs.length > 0 ? highlightSlugs : DEFAULT_HIGHLIGHT
  const map = new Map(items.map((i) => [i.slug, i]))
  const visible = wanted.map((s) => map.get(s)).filter(Boolean) as CommoditySnapshot[]

  if (visible.length === 0) return null

  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: 8,
        padding: '10px 16px',
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 24,
          overflowX: 'auto',
          scrollbarWidth: 'thin',
          paddingBottom: 2,
        }}
      >
        {visible.map((it) => {
          const t = trendOf(it.change_pct)
          return (
            <Link
              key={it.slug}
              href={`/commodities/${it.slug}`}
              style={{
                color: '#e5e7eb',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ color: '#9ca3af', fontWeight: 600 }}>
                {it.name.split('·')[0].trim().toUpperCase()}
              </span>
              <span style={{ color: '#fff', fontWeight: 700 }}>
                {fmtPrice(it.last_price, it.currency)}
              </span>
              <span style={{ color: trendColor(t), fontWeight: 700 }}>
                {trendArrow(t)} {fmtPct(it.change_pct)}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
