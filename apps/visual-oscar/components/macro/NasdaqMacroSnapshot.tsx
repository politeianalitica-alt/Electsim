'use client'
/**
 * <NasdaqMacroSnapshot /> · Sprint Nasdaq-Wire
 *
 * Pinta los 5 indicadores macro+commodities del endpoint
 * `/api/nasdaq/snapshot` con valor + delta + mini-spark inline.
 *
 *   - OPEC oil (USD/barril, daily)
 *   - LBMA gold (USD/oz, daily)
 *   - US 10Y yield (%, daily)
 *   - US unemployment (%, monthly)
 *   - S&P 500 Shiller PE ratio (monthly)
 *
 * Diseño: bloque horizontal con 5 KPIs alineados. Cada KPI = label +
 * valor (font mono) + delta color-coded (verde subida / rojo caída /
 * gris neutro) + sparkline SVG inline simple.
 *
 * Empty state honesto: si la API responde `ok: false, error: 'no_key'`,
 * mostramos un banner "Configurar NASDAQ_DATA_LINK_KEY en Vercel" en
 * lugar de inventarnos datos.
 *
 * Props:
 *   - variant: 'dashboard' (heading completo) | 'compact' (sin heading)
 *   - subset: opcional · array con los slugs a mostrar (default: los 5)
 */
import { useEffect, useState } from 'react'

interface IndicatorPoint { date: string; value: number }
interface Indicator {
  slug: string
  ok: boolean
  label: string
  unit: string
  frequency: string
  use_case: string
  latest: IndicatorPoint | null
  prev: IndicatorPoint | null
  change_pct: number | null
  points: IndicatorPoint[]
  source_url: string
  error?: string
}
interface SnapshotResponse {
  ok: boolean
  error?: string
  message?: string
  indicators: Record<string, Indicator>
  indicators_count?: number
  indicators_ok?: number
  fetched_at: string
  _meta?: { source: string; source_url: string; cache_ttl_hours: number }
}

type Variant = 'dashboard' | 'compact'

const DEFAULT_SLUGS = [
  'opec_oil',
  'gold_lbma_am',
  'fred_us_10y_yield',
  'fred_us_unemployment',
  'multpl_sp500_pe',
] as const

interface Props {
  variant?: Variant
  /** Opcional · si quieres mostrar solo un subset (ej. en sector-energia, solo opec_oil + gold) */
  subset?: string[]
}

export function NasdaqMacroSnapshot({ variant = 'dashboard', subset }: Props) {
  const [data, setData] = useState<SnapshotResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/nasdaq/snapshot', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const slugs = subset && subset.length > 0 ? subset : [...DEFAULT_SLUGS]
  const indicators = slugs
    .map((s) => data?.indicators?.[s])
    .filter((i): i is Indicator => !!i)

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      {variant === 'dashboard' && (
        <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em',
              margin: 0, color: '#1d1d1f',
            }}>
              Macro & commodities · Nasdaq Data Link
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
              5 indicadores clave para el contexto USA y materias primas globales.
              Datos oficiales (LBMA fixing Londres · OPEP cesta · FRED Reserva Federal).
              Actualización diaria/mensual · cache 6h.
            </p>
          </div>
          {data?._meta && (
            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
              {data.indicators_ok ?? 0}/{data.indicators_count ?? 5} live
            </span>
          )}
        </header>
      )}

      {loading && (
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando snapshot Nasdaq Data Link…</p>
      )}

      {/* Empty state honesto · no_key */}
      {!loading && data && !data.ok && data.error === 'no_key' && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b',
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#92400e',
        }}>
          <strong>! Configuración pendiente</strong> · El endpoint
          <code style={{ background: '#fffbeb', padding: '0 4px', borderRadius: 2, margin: '0 4px', fontSize: 10 }}>/api/nasdaq/snapshot</code>
          está listo pero <strong>NASDAQ_DATA_LINK_KEY</strong> no está configurada en variables de entorno de Vercel.
          Una vez añadida, este bloque mostrará 5 indicadores live (petróleo OPEP, oro LBMA, bono USA 10y, paro EEUU, Shiller CAPE).
        </div>
      )}

      {/* Empty state · otro error */}
      {!loading && data && !data.ok && data.error && data.error !== 'no_key' && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #dc2626',
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#991b1b',
        }}>
          ▲ Snapshot Nasdaq no disponible: <code>{data.error}</code>
        </div>
      )}

      {/* Grid de indicadores */}
      {!loading && indicators.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(indicators.length, 5)}, 1fr)`,
          gap: 14,
        }}>
          {indicators.map((ind) => (
            <IndicatorCard key={ind.slug} indicator={ind} />
          ))}
        </div>
      )}

      {variant === 'dashboard' && data?.ok && (
        <p style={{ margin: '10px 0 0', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
          Fuente: Nasdaq Data Link · {data._meta?.source_url} ·
          Cache {data._meta?.cache_ttl_hours}h · datos LBMA/OPEC/FRED oficiales.
        </p>
      )}
    </section>
  )
}

function IndicatorCard({ indicator }: { indicator: Indicator }) {
  if (!indicator.ok || !indicator.latest) {
    return (
      <div style={{
        padding: '10px 12px', background: '#f8fafc', borderRadius: 6,
        borderLeft: '3px solid #cbd5e1',
      }}>
        <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
          {indicator.label}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          {indicator.error || 'sin datos'}
        </p>
      </div>
    )
  }

  const change = indicator.change_pct ?? 0
  const changeColor = change > 0.05 ? '#16a34a' : change < -0.05 ? '#dc2626' : '#64748b'
  const accent = indicator.slug.startsWith('fred_us_10y') || indicator.slug.startsWith('fred_us_un') ? '#7c3aed'
    : indicator.slug.startsWith('opec') ? '#dc2626'
    : indicator.slug.startsWith('gold') || indicator.slug.startsWith('silver') ? '#f59e0b'
    : indicator.slug.startsWith('multpl') ? '#0891b2'
    : '#1F4E8C'

  // Mini-spark SVG con los 30 últimos puntos (más antiguo→más reciente)
  const sparkPoints = [...indicator.points].reverse()  // points viene desc → invertimos
  const values = sparkPoints.map((p) => p.value)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1
  const w = 80, h = 24
  const path = sparkPoints.length > 1
    ? sparkPoints.map((p, i) => {
        const x = (i / (sparkPoints.length - 1)) * w
        const y = h - ((p.value - minV) / range) * h
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    : null

  return (
    <div style={{
      padding: '10px 12px', background: '#fff', borderRadius: 8,
      borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9',
    }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600, lineHeight: 1.2 }} title={indicator.use_case}>
        {indicator.label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4, gap: 6 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace', lineHeight: 1.2 }}>
          {formatValue(indicator.latest.value, indicator.unit)}
        </span>
        {indicator.change_pct !== null && (
          <span style={{ fontSize: 11, color: changeColor, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>
            {change > 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 6 }}>
        <span style={{ fontSize: 9, color: '#94a3b8' }}>{indicator.unit}</span>
        {path && (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
            <path d={path} fill="none" stroke={accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <p style={{ margin: '2px 0 0', fontSize: 9, color: '#cbd5e1', fontFamily: 'ui-monospace, monospace' }}>
        {indicator.latest.date}
      </p>
    </div>
  )
}

function formatValue(v: number, unit: string): string {
  // USD/barril, USD/oz, % → 2 decimales
  if (unit.startsWith('%') || unit.includes('USD/') || unit === 'ratio') {
    return v.toLocaleString('es-ES', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
  }
  // index, USD billion → 1 decimal
  return v.toLocaleString('es-ES', { maximumFractionDigits: 1 })
}

export default NasdaqMacroSnapshot
