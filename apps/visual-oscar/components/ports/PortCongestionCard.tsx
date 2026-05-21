'use client'
import Link from 'next/link'
import type { SnapshotAllResponse } from '@/types/ports'
import { fmtNum } from '@/lib/ports-utils'
import { DataQualityBadge } from './DataQualityBadge'

type Item = SnapshotAllResponse['items'][number]

function levelColor(pct: number | null | undefined) {
  if (pct == null) return { bg: '#f3f4f6', fg: '#4b5563', label: '—' }
  if (pct >= 50) return { bg: '#fee2e2', fg: '#991b1b', label: 'CRÍTICA' }
  if (pct >= 35) return { bg: '#fef3c7', fg: '#92400e', label: 'ALTA' }
  if (pct >= 20) return { bg: '#dbeafe', fg: '#1e40af', label: 'MEDIA' }
  return { bg: '#dcfce7', fg: '#166534', label: 'BAJA' }
}

export function PortCongestionCard({ port }: { port: Item }) {
  const lv = levelColor(port.congestion_pct)
  return (
    <Link
      href={`/puertos/${port.slug}`}
      style={{
        display: 'block',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 12,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>{port.name}</p>
          <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
            {port.country_iso} · {port.type}
          </p>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            background: lv.bg,
            color: lv.fg,
            borderRadius: 4,
            letterSpacing: 0.6,
          }}
        >
          {lv.label}
        </span>
      </div>
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <Metric label="Anchored" value={port.vessels_anchored ?? '—'} />
        <Metric label="Llegadas 24h" value={port.arrivals_24h ?? '—'} />
        <Metric label="Congestión" value={fmtNum(port.congestion_pct, 0, '%')} />
      </div>
      {port.data_quality && (
        <div style={{ marginTop: 8 }}>
          <DataQualityBadge quality={port.data_quality} />
        </div>
      )}
    </Link>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: '#9ca3af', margin: 0, letterSpacing: 0.4 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '2px 0 0' }}>{value}</p>
    </div>
  )
}

export default PortCongestionCard
