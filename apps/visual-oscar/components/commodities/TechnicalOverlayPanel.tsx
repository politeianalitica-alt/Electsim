'use client'

import { useMemo, useState } from 'react'
import type { OHLCPoint } from '@/types/commodities'
import { OHLCChart } from './OHLCChart'
import { bollinger, sma } from '@/lib/sma'

interface Props {
  data: OHLCPoint[]
}

type OverlayKey = 'sma20' | 'sma50' | 'sma200' | 'bb20'

const OPTIONS: { key: OverlayKey; label: string; color: string }[] = [
  { key: 'sma20', label: 'SMA 20', color: '#2563eb' },
  { key: 'sma50', label: 'SMA 50', color: '#f59e0b' },
  { key: 'sma200', label: 'SMA 200', color: '#dc2626' },
  { key: 'bb20', label: 'Bollinger 20', color: '#9333ea' },
]

export function TechnicalOverlayPanel({ data }: Props) {
  const [active, setActive] = useState<Set<OverlayKey>>(
    () => new Set<OverlayKey>(['sma20', 'sma50']),
  )
  const [asLine, setAsLine] = useState(false)

  const closes = useMemo(() => data.map((d) => d.close), [data])

  const overlays = useMemo(() => {
    const list: { name: string; values: (number | null)[]; color: string }[] = []
    if (active.has('sma20')) list.push({ name: 'SMA 20', values: sma(closes, 20), color: '#2563eb' })
    if (active.has('sma50')) list.push({ name: 'SMA 50', values: sma(closes, 50), color: '#f59e0b' })
    if (active.has('sma200')) list.push({ name: 'SMA 200', values: sma(closes, 200), color: '#dc2626' })
    if (active.has('bb20')) {
      const bb = bollinger(closes, 20, 2)
      list.push({ name: 'BB upper', values: bb.upper, color: '#9333ea' })
      list.push({ name: 'BB lower', values: bb.lower, color: '#9333ea' })
    }
    return list
  }, [closes, active])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {OPTIONS.map((o) => {
          const isActive = active.has(o.key)
          return (
            <button
              key={o.key}
              onClick={() => {
                setActive((prev) => {
                  const next = new Set(prev)
                  if (next.has(o.key)) next.delete(o.key)
                  else next.add(o.key)
                  return next
                })
              }}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                border: '1px solid',
                borderColor: isActive ? o.color : '#e5e7eb',
                background: isActive ? `${o.color}20` : '#fff',
                color: isActive ? o.color : '#374151',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          )
        })}
        <label
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <input type="checkbox" checked={asLine} onChange={(e) => setAsLine(e.target.checked)} />
          línea (cierre)
        </label>
      </div>
      <OHLCChart data={data} overlays={overlays} asLine={asLine} />
    </div>
  )
}
