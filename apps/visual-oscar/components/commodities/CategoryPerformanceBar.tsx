'use client'

import { useMemo } from 'react'
import type { CommodityCategory, CommoditySnapshot } from '@/types/commodities'
import { CATEGORIES, CATEGORY_COLORS, fmtPct, trendColor, trendOf } from '@/lib/commodities-utils'

interface Props {
  items: CommoditySnapshot[]
}

export function CategoryPerformanceBar({ items }: Props) {
  const stats = useMemo(() => {
    const acc = new Map<
      CommodityCategory,
      { sum: number; n: number; avgChange: number }
    >()
    items.forEach((it) => {
      const cur = acc.get(it.category) ?? { sum: 0, n: 0, avgChange: 0 }
      if (it.change_pct != null) {
        cur.sum += it.change_pct
        cur.n += 1
      }
      acc.set(it.category, cur)
    })
    return CATEGORIES.map((c) => {
      const s = acc.get(c.value)
      const avg = s && s.n > 0 ? s.sum / s.n : 0
      return { category: c.value, label: c.label, avg, n: s?.n ?? 0 }
    })
  }, [items])

  const max = Math.max(0.5, ...stats.map((s) => Math.abs(s.avg)))

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
        Performance por categoría · promedio del día
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {stats.map((s) => {
          const t = trendOf(s.avg)
          const tcol = trendColor(t)
          const catCol = CATEGORY_COLORS[s.category]
          const pct = Math.min(1, Math.abs(s.avg) / max)
          return (
            <div key={s.category} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 90,
                  fontSize: 11,
                  fontWeight: 700,
                  color: catCol.fg,
                  background: catCol.bg,
                  padding: '3px 8px',
                  borderRadius: 4,
                  textAlign: 'center',
                }}
              >
                {s.label}
              </span>
              <div style={{ position: 'relative', flex: 1, height: 18, background: '#f3f4f6', borderRadius: 4 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: s.avg < 0 ? `${50 - 50 * pct}%` : '50%',
                    width: `${50 * pct}%`,
                    height: '100%',
                    background: tcol,
                    borderRadius: 4,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: '#9ca3af',
                  }}
                />
              </div>
              <span style={{ width: 70, fontSize: 11, fontWeight: 700, color: tcol, textAlign: 'right' }}>
                {fmtPct(s.avg)}
              </span>
              <span style={{ width: 24, fontSize: 10, color: '#9ca3af', textAlign: 'right' }}>
                {s.n}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
