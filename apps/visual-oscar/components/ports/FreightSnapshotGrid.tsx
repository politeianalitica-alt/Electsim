'use client'
import Link from 'next/link'
import type { FreightIndex } from '@/types/ports'
import { fmtNum } from '@/lib/ports-utils'
import { DataQualityBadge } from './DataQualityBadge'

const SIGNAL_STYLE: Record<string, { bg: string; fg: string; arrow: string }> = {
  fuerte_subida: { bg: '#dcfce7', fg: '#166534', arrow: '⇈' },
  subida: { bg: '#ecfccb', fg: '#3f6212', arrow: '↑' },
  estable: { bg: '#f3f4f6', fg: '#374151', arrow: '→' },
  bajada: { bg: '#fee2e2', fg: '#991b1b', arrow: '↓' },
  fuerte_bajada: { bg: '#fecaca', fg: '#7f1d1d', arrow: '⇊' },
}

export function FreightSnapshotGrid({ items, compact = false }: { items: FreightIndex[]; compact?: boolean }) {
  if (!items.length) {
    return (
      <div
        style={{
          padding: 24,
          background: '#fff',
          border: '1px dashed #e5e7eb',
          borderRadius: 8,
          color: '#6b7280',
          fontSize: 13,
          textAlign: 'center',
        }}
      >
        Sin datos de fletes disponibles.
      </div>
    )
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: compact
          ? 'repeat(auto-fill, minmax(180px, 1fr))'
          : 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 12,
      }}
    >
      {items.map((it) => {
        const sig = SIGNAL_STYLE[it.signal] ?? SIGNAL_STYLE.estable
        return (
          <Link
            key={it.slug}
            href={`/puertos/fletes#${it.slug}`}
            style={{
              display: 'block',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 14,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>{it.name}</p>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  background: sig.bg,
                  color: sig.fg,
                  borderRadius: 4,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                }}
              >
                {sig.arrow} {it.signal.replace('_', ' ')}
              </span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '6px 0 2px' }}>
              {it.last_price != null
                ? it.last_price.toLocaleString('es-ES', { maximumFractionDigits: 2 })
                : '—'}
              <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6, fontWeight: 500 }}>
                {it.unit ?? ''}
              </span>
            </p>
            <p
              style={{
                fontSize: 12,
                color: (it.change_pct ?? 0) >= 0 ? '#15803d' : '#b91c1c',
                margin: 0,
                fontWeight: 600,
              }}
            >
              {it.change_pct != null && it.change_pct >= 0 ? '+' : ''}
              {fmtNum(it.change_pct, 2, '%')}
              <span style={{ color: '#9ca3af', marginLeft: 8, fontWeight: 400 }}>
                {(it.category ?? '').replace('_', ' ')}
              </span>
            </p>
            {it.data_quality && (
              <div style={{ marginTop: 6 }}>
                <DataQualityBadge quality={it.data_quality} />
              </div>
            )}
          </Link>
        )
      })}
    </div>
  )
}

export default FreightSnapshotGrid
