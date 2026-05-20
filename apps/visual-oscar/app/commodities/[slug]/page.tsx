'use client'
/**
 * /commodities/[slug] · vista individual
 *
 * Sprint 3: header con precio + variación + 52w + OHLC con overlays técnicos
 * + panel RSI/MACD + watchlist toggle.
 */
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import {
  useCommodity,
  useCommodityPrice,
  useCommodityTechnical,
} from '@/hooks/useCommodities'
import { useCommodityWatchlist } from '@/hooks/useCommodityWatchlist'
import { TechnicalOverlayPanel } from '@/components/commodities/TechnicalOverlayPanel'
import {
  CATEGORY_COLORS,
  fmtPct,
  fmtPrice,
  SIGNAL_LABELS,
  signalColor,
  trendArrow,
  trendColor,
  trendOf,
} from '@/lib/commodities-utils'

const RANGES = ['1mo', '3mo', '6mo', '1y', '5y'] as const
type Range = (typeof RANGES)[number]

export default function CommodityDetailPage() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''
  const [range, setRange] = useState<Range>('1y')

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { data: meta } = useCommodity(slug)
  const { data: price, loading: priceLoading } = useCommodityPrice(slug, range, '1d')
  const { data: tech } = useCommodityTechnical(slug, '1y')
  const { includes, toggle } = useCommodityWatchlist()

  const change = price?.change_pct
  const t = trendOf(change)
  const tcol = trendColor(t)
  const cat = meta?.category
  const catCol = cat ? CATEGORY_COLORS[cat] : null

  const ohlc = price?.ohlc ?? []
  const closes = ohlc.map((p) => p.close).filter((c): c is number => c != null)
  const range52w = closes.length
    ? { lo: Math.min(...closes), hi: Math.max(...closes) }
    : null

  if (!slug) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <AppHeader />
        <p style={{ padding: 24 }}>Sin slug.</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <Link
          href="/commodities"
          style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}
        >
          ← Volver al dashboard
        </Link>

        <header style={{ marginTop: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: '#111827',
                margin: 0,
              }}
            >
              {meta?.name ?? slug}
            </h1>
            {catCol && cat ? (
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  color: catCol.fg,
                  background: catCol.bg,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {cat}
              </span>
            ) : null}
            <button
              onClick={() => toggle(slug)}
              style={{
                border: '1px solid #e5e7eb',
                background: '#fff',
                padding: '4px 10px',
                fontSize: 12,
                borderRadius: 6,
                cursor: 'pointer',
                color: includes(slug) ? '#f59e0b' : '#6b7280',
              }}
            >
              {includes(slug) ? '★ En watchlist' : '☆ Añadir a watchlist'}
            </button>
          </div>
          <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
            {meta?.exchange} · {meta?.unit} · ticker {meta?.yahoo_ticker ?? '—'}
          </p>
          {meta?.description ? (
            <p style={{ marginTop: 6, fontSize: 13, color: '#374151', maxWidth: 800 }}>
              {meta.description}
            </p>
          ) : null}
        </header>

        {/* KPIs principales */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Kpi
            label="Último precio"
            value={fmtPrice(price?.last_price, price?.currency)}
            sub={price?.ohlc?.[price.ohlc.length - 1]?.date ?? ''}
          />
          <Kpi
            label="Variación 1D"
            value={fmtPct(change)}
            color={tcol}
            sub={`${trendArrow(t)} ${meta?.exchange ?? ''}`}
          />
          <Kpi
            label="Rango 52w"
            value={
              range52w
                ? `${fmtPrice(range52w.lo)} — ${fmtPrice(range52w.hi)}`
                : '—'
            }
            sub={`${closes.length} obs ${range}`}
          />
          {tech?.signal ? (
            <SignalKpi signal={tech.signal} />
          ) : (
            <Kpi label="Señal técnica" value="—" sub="cargando…" />
          )}
        </div>

        {/* Layout 2 columnas · gráfico + panel */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
            gap: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginBottom: 10,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Rango:</span>
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    background: r === range ? '#111827' : '#fff',
                    color: r === range ? '#fff' : '#374151',
                    border: '1px solid',
                    borderColor: r === range ? '#111827' : '#e5e7eb',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
            {priceLoading ? (
              <p style={{ fontSize: 12, color: '#9ca3af' }}>Cargando OHLC…</p>
            ) : ohlc.length === 0 ? (
              <p style={{ fontSize: 12, color: '#9ca3af' }}>Sin datos OHLC para este rango.</p>
            ) : (
              <TechnicalOverlayPanel data={ohlc} />
            )}
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Panel title="Indicadores técnicos">
              {tech?.indicators ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
                  <Li label="SMA 20" value={tech.indicators.sma20} />
                  <Li label="SMA 50" value={tech.indicators.sma50} />
                  <Li label="SMA 200" value={tech.indicators.sma200} />
                  <Li label="RSI (14)" value={tech.indicators.rsi14} suffix="" />
                  <Li label="MACD" value={tech.indicators.macd} />
                  <Li label="MACD signal" value={tech.indicators.macd_signal} />
                  <Li label="MACD hist." value={tech.indicators.macd_histogram} />
                </ul>
              ) : (
                <p style={{ fontSize: 12, color: '#9ca3af' }}>Sin datos técnicos.</p>
              )}
            </Panel>

            <Panel title="Próximos pasos">
              <ul style={{ paddingLeft: 18, fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                <li>
                  <Link href={`/commodities/${slug}/forecast`} style={{ color: '#7c3aed' }}>
                    Forecast IA →
                  </Link>
                </li>
                <li>
                  <Link href={`/commodities/recipe-cost?slug=${slug}`} style={{ color: '#7c3aed' }}>
                    Usar en receta →
                  </Link>
                </li>
                <li>
                  <Link href={`/commodities/alerts?slug=${slug}`} style={{ color: '#7c3aed' }}>
                    Configurar alerta de precio →
                  </Link>
                </li>
              </ul>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <p style={{ fontSize: 11, color: '#6b7280', margin: 0, fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: color ?? '#111827', margin: '4px 0 0 0' }}>
        {value}
      </p>
      {sub ? <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0 0' }}>{sub}</p> : null}
    </div>
  )
}

function SignalKpi({ signal }: { signal: keyof typeof SIGNAL_LABELS }) {
  const c = signalColor(signal)
  return (
    <div
      style={{
        background: c.bg,
        border: '1px solid',
        borderColor: c.fg,
        borderRadius: 10,
        padding: 14,
      }}
    >
      <p style={{ fontSize: 11, color: c.fg, margin: 0, fontWeight: 600 }}>
        Señal compuesta · RSI+MACD+SMA50
      </p>
      <p style={{ fontSize: 16, fontWeight: 800, color: c.fg, margin: '4px 0 0 0' }}>
        {SIGNAL_LABELS[signal]}
      </p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Li({ label, value, suffix = '' }: { label: string; value: number | null; suffix?: string }) {
  return (
    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #f3f4f6' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 700, color: '#111827' }}>
        {value == null ? '—' : value.toLocaleString('es-ES', { maximumFractionDigits: 4 }) + suffix}
      </span>
    </li>
  )
}
