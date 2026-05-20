'use client'

import type { SDBalance } from '@/data/supply-demand-fixture'

interface Props {
  data: SDBalance
}

export function ProducersTable({ data }: Props) {
  const max = Math.max(...data.top_productores.map((p) => p.share_pct))
  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
        Top productores mundiales
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {data.top_productores.map((p, i) => (
          <div key={p.country} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 18, color: '#9ca3af' }}>{i + 1}</span>
            <span style={{ width: 100, fontWeight: 600, color: '#111827' }}>{p.country}</span>
            <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 2 }}>
              <div
                style={{
                  width: `${(p.share_pct / max) * 100}%`,
                  height: '100%',
                  background: '#7c3aed',
                  borderRadius: 2,
                }}
              />
            </div>
            <span style={{ width: 55, textAlign: 'right', color: '#374151', fontWeight: 600 }}>
              {p.share_pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
