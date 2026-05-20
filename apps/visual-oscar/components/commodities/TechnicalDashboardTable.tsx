'use client'

import Link from 'next/link'
import { useCommodityTechnical } from '@/hooks/useCommodities'
import { SIGNAL_LABELS, signalColor } from '@/lib/commodities-utils'

interface Props {
  slugs: string[]
}

export function TechnicalDashboardTable({ slugs }: Props) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <tr>
            <th style={th}>Commodity</th>
            <th style={th}>Último</th>
            <th style={th}>RSI(14)</th>
            <th style={th}>MACD hist.</th>
            <th style={th}>vs SMA50</th>
            <th style={th}>vs SMA200</th>
            <th style={th}>Señal</th>
          </tr>
        </thead>
        <tbody>
          {slugs.map((s) => (
            <TechRow key={s} slug={s} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TechRow({ slug }: { slug: string }) {
  const { data, loading } = useCommodityTechnical(slug, '1y')

  if (loading || !data) {
    return (
      <tr>
        <td style={td} colSpan={7}>
          <Link href={`/commodities/${slug}`} style={{ color: '#9ca3af' }}>
            {slug} · cargando…
          </Link>
        </td>
      </tr>
    )
  }

  const ind = data.indicators
  const last = data.last_price ?? 0
  const rsi = ind?.rsi14
  const macd = ind?.macd_histogram
  const sma50 = ind?.sma50
  const sma200 = ind?.sma200
  const col = signalColor(data.signal)

  return (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={td}>
        <Link href={`/commodities/${slug}`} style={{ color: '#111827', textDecoration: 'none', fontWeight: 600 }}>
          {slug}
        </Link>
      </td>
      <td style={td}>{last ? last.toLocaleString('es-ES', { maximumFractionDigits: 3 }) : '—'}</td>
      <td style={{ ...td, color: rsi == null ? '#9ca3af' : rsi >= 70 ? '#dc2626' : rsi <= 30 ? '#16a34a' : '#374151' }}>
        {rsi != null ? rsi.toFixed(1) : '—'}
        {rsi != null && rsi >= 70 ? ' ⚠ sobrecomprado' : null}
        {rsi != null && rsi <= 30 ? ' ⚠ sobrevendido' : null}
      </td>
      <td style={{ ...td, color: macd == null ? '#9ca3af' : macd > 0 ? '#16a34a' : '#dc2626' }}>
        {macd != null ? macd.toFixed(3) : '—'}
      </td>
      <td style={{ ...td, color: sma50 == null ? '#9ca3af' : last > sma50 ? '#16a34a' : '#dc2626' }}>
        {sma50 == null ? '—' : last > sma50 ? '↑' : '↓'}
      </td>
      <td style={{ ...td, color: sma200 == null ? '#9ca3af' : last > sma200 ? '#16a34a' : '#dc2626' }}>
        {sma200 == null ? '—' : last > sma200 ? '↑' : '↓'}
      </td>
      <td style={td}>
        <span
          style={{
            background: col.bg,
            color: col.fg,
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {SIGNAL_LABELS[data.signal]}
        </span>
      </td>
    </tr>
  )
}

const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', color: '#374151', fontWeight: 700, fontSize: 11 }
const td: React.CSSProperties = { padding: '8px 10px', color: '#374151' }
