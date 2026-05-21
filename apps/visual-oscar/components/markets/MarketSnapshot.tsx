'use client'
/**
 * `<MarketSnapshot />` · widget reutilizable de mercados live (Finnhub).
 *
 * Variantes:
 *   variant="dashboard"  · 4 grupos (ADRs ES, US tech, EU caps, crypto)
 *                          formato compacto · ideal para sidebar/dashboard
 *   variant="spain"      · solo ADRs españoles (SAN, BBVA, TEF, FER)
 *                          ideal para /sector-banca + /macro
 *   variant="sector"     · stocks de un sector concreto
 *                          props: sector='defensa'|'energia'|'tech'|'banca_es'
 *
 * Datos live cada 5 min (cache server-side). Si Finnhub no responde
 * (rate-limit, error), muestra placeholder sin crash.
 */
import { useEffect, useState } from 'react'

interface Quote {
  symbol: string
  price: number
  change: number
  change_percent: number
  high?: number
  low?: number
  open?: number
  previous_close?: number
  name?: string
}

interface DashboardData {
  ok: boolean
  spain_adrs: Quote[]
  us_big_tech: Quote[]
  eu_big_caps: Quote[]
  crypto: Quote[]
  ts: string
  data_quality?: { source_type: string; source_name: string }
}

interface SectorData {
  ok: boolean
  sector: string
  n_items: number
  items: Quote[]
  data_quality?: { source_type: string; source_name: string }
}

type Variant = 'dashboard' | 'spain' | 'sector'

interface Props {
  variant?: Variant
  sector?: 'defensa' | 'energia' | 'tech' | 'banca_es'
  compact?: boolean
  title?: string
}

export function MarketSnapshot({
  variant = 'spain',
  sector = 'banca_es',
  compact = false,
  title,
}: Props) {
  const [data, setData] = useState<DashboardData | SectorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const url =
      variant === 'dashboard'
        ? '/api/finnhub/dashboard'
        : variant === 'sector'
          ? `/api/finnhub/sector/${sector}`
          : '/api/finnhub/sector/banca_es'

    fetch(url, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => alive && setData(j))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))

    // Auto-refresh cada 5 min
    const interval = setInterval(() => {
      fetch(url, { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => alive && setData(j))
        .catch(() => {})
    }, 5 * 60 * 1000)

    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [variant, sector])

  const isDashboard = variant === 'dashboard' && data && 'spain_adrs' in data

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: compact ? 10 : 14,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              letterSpacing: 0.8,
              color: '#0e7490',
              fontWeight: 700,
              margin: 0,
            }}
          >
            {(title ?? defaultTitle(variant, sector)).toUpperCase()}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            Finnhub · refresh 5 min · cache server 5 min
          </p>
        </div>
        {data?.data_quality && (
          <span
            style={{
              fontSize: 9,
              padding: '2px 6px',
              background: data.data_quality.source_type === 'live' ? '#dcfce7' : '#fee2e2',
              color: data.data_quality.source_type === 'live' ? '#166534' : '#991b1b',
              borderRadius: 4,
              fontWeight: 700,
              letterSpacing: 0.4,
            }}
          >
            {data.data_quality.source_type.toUpperCase()}
          </span>
        )}
      </header>

      {loading && (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando cotizaciones…</p>
      )}

      {!loading && data && isDashboard && (
        <>
          <QuoteGroup label="ADRs España" quotes={(data as DashboardData).spain_adrs} accent="#dc2626" compact={compact} />
          <QuoteGroup label="US Big Tech" quotes={(data as DashboardData).us_big_tech} accent="#2563eb" compact={compact} />
          <QuoteGroup label="EU Large Caps" quotes={(data as DashboardData).eu_big_caps} accent="#9333ea" compact={compact} />
          <QuoteGroup label="Crypto" quotes={(data as DashboardData).crypto} accent="#ea580c" compact={compact} />
          {(data as DashboardData).ts && (
            <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right' }}>
              Última actualización · {new Date((data as DashboardData).ts).toLocaleTimeString('es-ES')}
            </p>
          )}
        </>
      )}

      {!loading && data && !isDashboard && (data as SectorData).items?.length > 0 && (
        <QuoteGroup
          label=""
          quotes={(data as SectorData).items}
          accent="#0e7490"
          compact={compact}
        />
      )}

      {!loading && data && !isDashboard && !(data as SectorData).items?.length && (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
          Sin datos · rate-limit Finnhub o mercado cerrado.
        </p>
      )}
    </section>
  )
}

function defaultTitle(variant: Variant, sector?: string): string {
  if (variant === 'dashboard') return 'Mercados · snapshot global'
  if (variant === 'sector') {
    const map: Record<string, string> = {
      defensa: 'Defensa · cotizaciones',
      energia: 'Energía · cotizaciones',
      tech: 'Tech · cotizaciones',
      banca_es: 'Banca España · ADRs',
    }
    return map[sector ?? ''] ?? 'Cotizaciones'
  }
  return 'Mercados España · ADRs'
}

function QuoteGroup({
  label,
  quotes,
  accent,
  compact,
}: {
  label: string
  quotes: Quote[]
  accent: string
  compact: boolean
}) {
  if (!quotes || quotes.length === 0) return null
  return (
    <div style={{ marginTop: label ? 10 : 0 }}>
      {label && (
        <p
          style={{
            fontSize: 10,
            letterSpacing: 0.6,
            color: '#64748b',
            fontWeight: 700,
            margin: '0 0 6px',
          }}
        >
          {label.toUpperCase()}
        </p>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact
            ? 'repeat(auto-fill, minmax(120px, 1fr))'
            : 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 6,
        }}
      >
        {quotes.map((q) => (
          <QuoteCard key={q.symbol} quote={q} accent={accent} compact={compact} />
        ))}
      </div>
    </div>
  )
}

function QuoteCard({ quote, accent, compact }: { quote: Quote; accent: string; compact: boolean }) {
  const isUp = (quote.change_percent ?? 0) >= 0
  const color = isUp ? '#16a34a' : '#dc2626'
  const displaySymbol = quote.symbol.includes('/') ? quote.symbol : quote.symbol
  return (
    <div
      style={{
        background: '#f9fafb',
        border: '1px solid #f1f5f9',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 4,
        padding: compact ? '6px 8px' : '8px 10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span
          style={{
            fontSize: compact ? 10 : 11,
            fontWeight: 700,
            color: '#0f172a',
            fontFamily: 'monospace',
          }}
        >
          {displaySymbol}
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: color,
          }}
        >
          {isUp ? '+' : ''}{(quote.change_percent ?? 0).toFixed(2)}%
        </span>
      </div>
      {quote.name && (
        <p style={{ fontSize: 9, color: '#64748b', margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {quote.name}
        </p>
      )}
      <p
        style={{
          fontSize: compact ? 13 : 15,
          fontWeight: 800,
          color: '#0f172a',
          margin: '2px 0 0',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        ${typeof quote.price === 'number' ? quote.price.toFixed(2) : '—'}
      </p>
    </div>
  )
}

export default MarketSnapshot
