'use client'
/**
 * <EsiosLivePanel /> · Sprint ESIOS
 *
 * Pinta los 6 indicadores ESIOS clave del endpoint /api/esios/snapshot
 * con valor actual + delta 24h + mini-sparkline SVG inline.
 *
 *   - PVPC (€/MWh hora actual)
 *   - Mercado spot OMIE
 *   - Demanda peninsular real (MW · 10-min)
 *   - % renovable instantáneo
 *   - Factor emisión CO2 (gCO2/kWh)
 *   - Precio EUA CO2 (€/t)
 *
 * Cada KPI lleva color semántico: `higher_is_worse` invierte verde/rojo.
 * Empty state honesto si ESIOS_API_KEY no está configurada.
 *
 * Refresh: el endpoint ya tiene cache 10 min. El componente lee con
 * `cache: 'force-cache'` (deja decidir al CDN).
 *
 * Sin libs de charting · SVG inline para sparklines.
 */
import { useEffect, useState } from 'react'

interface IndicatorPoint { t: string; v: number }
interface Indicator {
  slug: string
  ok: boolean
  label: string
  short: string
  unit: string
  category: string
  use_case: string
  higher_is_worse?: boolean
  latest: { value: number; datetime: string } | null
  prev: { value: number; datetime: string } | null
  change_pct: number | null
  avg_24h: number | null
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
  _meta?: { source: string; source_url: string; api_docs: string; cache_ttl_minutes: number }
}

type Variant = 'dashboard' | 'compact'

interface Props {
  variant?: Variant
  /** Opcional · subset de slugs a mostrar (default: los 6) */
  subset?: string[]
}

const DEFAULT_ORDER = [
  'pvpc',
  'mercado_spot',
  'demanda_real',
  'porcentaje_renovable',
  'emisiones_co2',
  'precio_co2_eua',
]

export function EsiosLivePanel({ variant = 'dashboard', subset }: Props) {
  const [data, setData] = useState<SnapshotResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/esios/snapshot', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const slugs = subset && subset.length > 0 ? subset : DEFAULT_ORDER
  const indicators = slugs
    .map((s) => data?.indicators?.[s])
    .filter((i): i is Indicator => !!i)

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      {variant === 'dashboard' && (
        <header style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 12, marginBottom: 12, flexWrap: 'wrap',
        }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em',
              margin: 0, color: '#1d1d1f',
            }}>
              Sistema eléctrico en directo · ESIOS
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
              6 indicadores clave del operador del sistema (Red Eléctrica España).
              Precios horarios PVPC + spot · demanda peninsular real (10-min) · %
              renovable · CO2. Cache 10 min · datos oficiales.
            </p>
          </div>
          {data?._meta && (
            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
              {data.indicators_ok ?? 0}/{data.indicators_count ?? 6} live
            </span>
          )}
        </header>
      )}

      {loading && (
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando indicadores ESIOS…</p>
      )}

      {/* Empty state · no_key */}
      {!loading && data && !data.ok && data.error === 'no_key' && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b',
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#92400e',
        }}>
          <strong>! Configuración pendiente</strong> · El endpoint
          <code style={{ background: '#fffbeb', padding: '0 4px', borderRadius: 2, margin: '0 4px', fontSize: 10 }}>/api/esios/snapshot</code>
          está listo pero <strong>ESIOS_API_KEY</strong> no está en variables de entorno de Vercel.
          Una vez añadida (Project Settings → Environment Variables → Production), aparecerán los 6
          indicadores en directo (PVPC horario, spot OMIE, demanda, % renovable, CO2 g/kWh, EUA).
        </div>
      )}

      {/* Empty state · otro error */}
      {!loading && data && !data.ok && data.error && data.error !== 'no_key' && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #dc2626',
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#991b1b',
        }}>
          ▲ ESIOS snapshot no disponible: <code>{data.error}</code>
        </div>
      )}

      {/* Grid de indicadores */}
      {!loading && indicators.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`,
          gap: 12,
        }}>
          {indicators.map((ind) => (
            <IndicatorCard key={ind.slug} indicator={ind} />
          ))}
        </div>
      )}

      {variant === 'dashboard' && data?.ok && (
        <p style={{ margin: '10px 0 0', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
          Fuente: <a href={data._meta?.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0891b2' }}>
            {data._meta?.source}
          </a> · API <a href={data._meta?.api_docs} target="_blank" rel="noopener noreferrer" style={{ color: '#0891b2' }}>docs</a> ·
          Cache {data._meta?.cache_ttl_minutes} min · datos oficiales horarios/10-min.
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
          {indicator.short}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          {indicator.error || 'sin datos'}
        </p>
      </div>
    )
  }

  const change = indicator.change_pct ?? 0
  const isWorseIfUp = indicator.higher_is_worse === true
  // Si higher_is_worse=true, subida = rojo. Si false, subida = verde.
  const changeColor = isWorseIfUp
    ? (change > 0.1 ? '#dc2626' : change < -0.1 ? '#16a34a' : '#64748b')
    : (change > 0.1 ? '#16a34a' : change < -0.1 ? '#dc2626' : '#64748b')
  const accent = colorForCategory(indicator.category)

  // Mini-spark SVG
  const values = indicator.points.map((p) => p.v)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1
  const w = 80, h = 22
  const path = indicator.points.length > 1
    ? indicator.points.map((p, i) => {
        const x = (i / (indicator.points.length - 1)) * w
        const y = h - ((p.v - minV) / range) * h
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    : null

  return (
    <div style={{
      padding: '10px 12px', background: '#fff', borderRadius: 8,
      borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9',
    }} title={indicator.use_case}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600, lineHeight: 1.2 }}>
        {indicator.short}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4, gap: 6 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace', lineHeight: 1.2 }}>
          {formatValue(indicator.latest.value, indicator.unit)}
        </span>
        {indicator.change_pct !== null && (
          <span style={{ fontSize: 10, color: changeColor, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 6 }}>
        <span style={{ fontSize: 9, color: '#94a3b8' }}>{indicator.unit}</span>
        {path && (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
            <path d={path} fill="none" stroke={accent} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <p style={{ margin: '2px 0 0', fontSize: 9, color: '#cbd5e1', fontFamily: 'ui-monospace, monospace' }}>
        {indicator.latest.datetime.slice(11, 16)}h · {indicator.latest.datetime.slice(0, 10)}
      </p>
      {indicator.avg_24h !== null && (
        <p style={{ margin: '1px 0 0', fontSize: 9, color: '#94a3b8' }}>
          media 24h: <strong>{formatValue(indicator.avg_24h, indicator.unit)}</strong>
        </p>
      )}
    </div>
  )
}

function colorForCategory(c: string): string {
  if (c === 'precios') return '#dc2626'
  if (c === 'demanda') return '#0891b2'
  if (c === 'generacion') return '#16a34a'
  if (c === 'mix') return '#16a34a'
  if (c === 'emisiones') return '#7c3aed'
  if (c === 'intercambios') return '#f59e0b'
  if (c === 'almacenamiento') return '#0ea5e9'
  if (c === 'mercado') return '#f97316'
  return '#64748b'
}

function formatValue(v: number, unit: string): string {
  if (unit === '%' || unit === '€/MWh' || unit === '€/t' || unit === '€/MW') {
    return v.toLocaleString('es-ES', { maximumFractionDigits: 1 })
  }
  if (unit === 'MW') {
    if (Math.abs(v) >= 1000) return (v / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' GW'
    return v.toLocaleString('es-ES', { maximumFractionDigits: 0 })
  }
  if (unit === 'gCO2/kWh') {
    return v.toLocaleString('es-ES', { maximumFractionDigits: 0 })
  }
  return v.toLocaleString('es-ES', { maximumFractionDigits: 1 })
}

export default EsiosLivePanel
