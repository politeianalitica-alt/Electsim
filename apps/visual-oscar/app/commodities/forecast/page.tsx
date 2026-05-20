'use client'
/**
 * /commodities/forecast · Motor Forecasting IA
 *
 * Vista comparativa de forecasts del watchlist · usa endpoint /forecast
 * (modelo drift naive stub · sustituible por Prophet/NHITS).
 */
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useCommodityWatchlist } from '@/hooks/useCommodityWatchlist'
import { useCommodityForecast, useCommodityPrice } from '@/hooks/useCommodities'
import { ForecastChart } from '@/components/commodities/ForecastChart'
import { fmtPct, fmtPrice } from '@/lib/commodities-utils'

const HORIZONS = [7, 30, 90, 180] as const

export default function ForecastPage() {
  const router = useRouter()
  const search = useSearchParams()
  const initial = search?.get('slug') ?? null
  const [slug, setSlug] = useState<string | null>(initial)
  const [horizon, setHorizon] = useState<number>(30)

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { watchlist } = useCommodityWatchlist()
  const activeSlug = slug ?? watchlist[0] ?? null

  const { data: price } = useCommodityPrice(activeSlug, '1y', '1d')
  const { data: forecast, loading } = useCommodityForecast(activeSlug, horizon)

  const lastPrice = price?.last_price ?? 0
  const lastForecastPoint = forecast?.forecast?.[forecast.forecast.length - 1]
  const expectedReturn = lastForecastPoint && lastPrice
    ? ((lastForecastPoint.value - lastPrice) / lastPrice) * 100
    : null

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/commodities" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
          ← Volver al dashboard
        </Link>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '12px 0 4px' }}>
          Motor de Forecasting · IA
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
          Predicción de precios con bandas de confianza 80% y 95%.{' '}
          {forecast?.accuracy_disclaimer ? (
            <span style={{ color: '#dc2626' }}>{forecast.accuracy_disclaimer}</span>
          ) : null}
        </p>

        {/* Selector commodity + horizonte */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Commodity:</span>
          <select
            value={activeSlug ?? ''}
            onChange={(e) => setSlug(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: 13,
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              background: '#fff',
              minWidth: 200,
            }}
          >
            {watchlist.length === 0 ? <option value="">(watchlist vacía)</option> : null}
            {watchlist.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginLeft: 16 }}>
            Horizonte:
          </span>
          {HORIZONS.map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                background: horizon === h ? '#7c3aed' : '#fff',
                color: horizon === h ? '#fff' : '#374151',
                border: '1px solid',
                borderColor: horizon === h ? '#7c3aed' : '#e5e7eb',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {h}d
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Kpi label="Precio actual" value={fmtPrice(lastPrice, price?.currency)} sub={forecast?.last_date} />
          <Kpi
            label={`Forecast ${horizon}d`}
            value={fmtPrice(lastForecastPoint?.value, price?.currency)}
            sub={lastForecastPoint?.date}
          />
          <Kpi
            label="Variación esperada"
            value={expectedReturn != null ? fmtPct(expectedReturn) : '—'}
            color={expectedReturn != null && expectedReturn > 0 ? '#16a34a' : expectedReturn != null && expectedReturn < 0 ? '#dc2626' : '#374151'}
          />
          <Kpi label="Modelo" value={forecast?.model ?? '—'} sub="stub · drift naive" />
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: 16,
          }}
        >
          {loading ? (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Calculando forecast…</p>
          ) : !forecast?.forecast?.length ? (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>
              Sin forecast disponible para este commodity.
            </p>
          ) : (
            <ForecastChart
              history={(price?.ohlc ?? []).slice(-180)}
              forecast={forecast.forecast}
            />
          )}
        </div>

        {/* Tabla comparativa watchlist · forecast 30d */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '24px 0 8px' }}>
          Comparativa watchlist · forecast 30d
        </h2>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
          <WatchlistForecastTable horizon={30} />
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
      <p style={{ fontSize: 11, color: '#6b7280', margin: 0, fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 800, color: color ?? '#111827', margin: '4px 0 0 0' }}>{value}</p>
      {sub ? <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0 0' }}>{sub}</p> : null}
    </div>
  )
}

function WatchlistForecastTable({ horizon }: { horizon: number }) {
  const { watchlist } = useCommodityWatchlist()
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        <tr>
          <th style={th}>Commodity</th>
          <th style={th}>Precio actual</th>
          <th style={th}>Forecast {horizon}d</th>
          <th style={th}>Var. esperada</th>
        </tr>
      </thead>
      <tbody>
        {watchlist.map((s) => (
          <WatchlistRow key={s} slug={s} horizon={horizon} />
        ))}
      </tbody>
    </table>
  )
}

function WatchlistRow({ slug, horizon }: { slug: string; horizon: number }) {
  const { data: price } = useCommodityPrice(slug, '1mo', '1d')
  const { data: forecast } = useCommodityForecast(slug, horizon)
  const last = price?.last_price ?? null
  const fc = forecast?.forecast?.[forecast.forecast.length - 1]?.value ?? null
  const ret = last != null && fc != null && last > 0 ? ((fc - last) / last) * 100 : null
  const col = ret == null ? '#374151' : ret > 0 ? '#16a34a' : ret < 0 ? '#dc2626' : '#374151'
  return (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={td}>
        <Link href={`/commodities/${slug}`} style={{ color: '#111827', textDecoration: 'none', fontWeight: 600 }}>
          {slug}
        </Link>
      </td>
      <td style={td}>{fmtPrice(last)}</td>
      <td style={td}>{fmtPrice(fc)}</td>
      <td style={{ ...td, color: col, fontWeight: 700 }}>{ret != null ? fmtPct(ret) : '—'}</td>
    </tr>
  )
}

const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', color: '#374151', fontWeight: 700 }
const td: React.CSSProperties = { padding: '10px 14px', color: '#374151' }
