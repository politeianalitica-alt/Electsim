'use client'
import Link from 'next/link'
import type { ChokepointRisk } from '@/types/ports'
import { DataQualityBadge } from './DataQualityBadge'

const LEVEL_STYLE: Record<string, { bg: string; fg: string; ring: string }> = {
  critico: { bg: '#fef2f2', fg: '#991b1b', ring: '#dc2626' },
  alto: { bg: '#fff7ed', fg: '#9a3412', ring: '#ea580c' },
  medio: { bg: '#fffbeb', fg: '#92400e', ring: '#f59e0b' },
  bajo: { bg: '#f0fdf4', fg: '#166534', ring: '#16a34a' },
  minimo: { bg: '#f0f9ff', fg: '#075985', ring: '#0284c7' },
}

export function ChokepointRiskCard({ ck }: { ck: ChokepointRisk }) {
  const lv = LEVEL_STYLE[ck.risk_level] ?? LEVEL_STYLE.medio
  return (
    <Link
      href={`/puertos/chokepoints#${ck.slug}`}
      style={{
        display: 'block',
        background: '#fff',
        border: `1px solid #e5e7eb`,
        borderLeft: `4px solid ${lv.ring}`,
        borderRadius: 8,
        padding: 14,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{ck.name}</p>
          <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>{ck.region}</p>
        </div>
        <span
          style={{
            fontSize: 10,
            padding: '3px 8px',
            background: lv.bg,
            color: lv.fg,
            borderRadius: 999,
            fontWeight: 700,
            letterSpacing: 0.6,
          }}
        >
          {ck.risk_level.toUpperCase()}
        </span>
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: lv.ring }}>{ck.risk_score}</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>/ 100 risk</span>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span>Base {ck.score_base} · Eventos {ck.n_events_30d ?? 0} (30d)</span>
        {ck.data_quality ? (
          <DataQualityBadge quality={ck.data_quality} />
        ) : (
          <span>· {ck.data_source}</span>
        )}
      </div>
    </Link>
  )
}

export default ChokepointRiskCard
