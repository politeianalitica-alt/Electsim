'use client'
/**
 * <EsiosHourlyChart /> · Sprint ESIOS
 *
 * Gráfico de serie horaria de un indicador ESIOS (por defecto PVPC) con:
 *   - Selector slug en cabecera (PVPC / spot OMIE / EUA CO2 / etc.)
 *   - Curva 24h con bandas amber/red en horas pico
 *   - Marcadores hora actual (línea vertical) + hora más cara / más barata
 *   - Lectura: precio actual + media 24h + min/max + horas más baratas
 *
 * Pensado para tab "Mercado eléctrico" en /sector-energia. Muestra de
 * un vistazo cuándo conviene consumir (PVPC mínimo) y cuándo el sistema
 * está más tensionado (PVPC máximo).
 *
 * SVG inline · sin libs.
 */
import { useEffect, useMemo, useState } from 'react'

interface EsiosValue { value: number; datetime: string; datetime_utc?: string }
interface EsiosIndicator {
  id: number
  name: string
  short_name: string
  values: EsiosValue[]
}
interface SnapshotResponse {
  ok: boolean
  error?: string
  indicator?: EsiosIndicator
  meta?: {
    slug: string
    label: string
    short: string
    unit: string
    use_case: string
    higher_is_worse?: boolean
  }
  source_url?: string
}

const AVAILABLE_SLUGS: Array<{ slug: string; label: string }> = [
  { slug: 'pvpc', label: 'PVPC' },
  { slug: 'mercado_spot', label: 'Spot OMIE' },
  { slug: 'intradiario_mi1', label: 'Intradiario MI1' },
  { slug: 'emisiones_co2', label: 'Emisiones CO2' },
  { slug: 'porcentaje_renovable', label: '% renovable' },
]

interface Props {
  /** Slug inicial · default 'pvpc' */
  defaultSlug?: string
  /** Horas hacia atrás · default 48 (24h ayer + 24h hoy) */
  hours?: number
}

export function EsiosHourlyChart({ defaultSlug = 'pvpc', hours = 48 }: Props) {
  const [slug, setSlug] = useState(defaultSlug)
  const [data, setData] = useState<SnapshotResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/esios/indicator/${slug}?hours=${hours}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [slug, hours])

  const stats = useMemo(() => {
    const vals = data?.indicator?.values || []
    if (vals.length === 0) return null
    const numericVals = vals.map((v) => v.value)
    const min = Math.min(...numericVals)
    const max = Math.max(...numericVals)
    const avg = numericVals.reduce((s, n) => s + n, 0) / numericVals.length
    const minIdx = numericVals.indexOf(min)
    const maxIdx = numericVals.indexOf(max)
    const current = vals[vals.length - 1]
    return { min, max, avg, minIdx, maxIdx, current, total: vals.length }
  }, [data])

  const unit = data?.meta?.unit || ''
  const label = data?.meta?.label || slug
  const useCase = data?.meta?.use_case

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em',
            margin: 0, color: '#1d1d1f',
          }}>
            Serie horaria · {label}
          </h2>
          <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
            {AVAILABLE_SLUGS.map((s) => (
              <button
                key={s.slug}
                onClick={() => setSlug(s.slug)}
                style={{
                  background: slug === s.slug ? '#fff' : 'transparent',
                  color: slug === s.slug ? '#0f172a' : '#64748b',
                  border: 'none', borderRadius: 5,
                  fontSize: 10.5, fontWeight: slug === s.slug ? 700 : 500,
                  padding: '4px 10px', cursor: 'pointer',
                  boxShadow: slug === s.slug ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
                  fontFamily: 'inherit',
                }}
              >{s.label}</button>
            ))}
          </div>
        </div>
        {useCase && (
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6e6e73', lineHeight: 1.4 }}>
            {useCase}
          </p>
        )}
      </header>

      {loading && (
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando serie {slug} ({hours}h)…</p>
      )}

      {!loading && data && !data.ok && (
        <div style={{
          background: data.error === 'no_key' ? '#fef3c7' : '#fef2f2',
          border: '1px solid ' + (data.error === 'no_key' ? '#fde68a' : '#fecaca'),
          borderLeft: '3px solid ' + (data.error === 'no_key' ? '#f59e0b' : '#dc2626'),
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5,
          color: data.error === 'no_key' ? '#92400e' : '#991b1b',
        }}>
          {data.error === 'no_key' ? (
            <>
              <strong>! Configuración pendiente</strong> · ESIOS_API_KEY no está configurada.
            </>
          ) : (
            <>▲ Error: {data.error}</>
          )}
        </div>
      )}

      {!loading && data?.ok && stats && (
        <>
          {/* KPIs · valor actual + media + min/max */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
            <Kpi label="Actual" value={fmt(stats.current.value, unit)} accent="#0f172a" sub={stats.current.datetime.slice(11, 16) + 'h'} />
            <Kpi label="Media período" value={fmt(stats.avg, unit)} accent="#64748b" sub={`${stats.total} puntos`} />
            <Kpi label="Mínimo" value={fmt(stats.min, unit)} accent="#16a34a" sub={(data.indicator?.values[stats.minIdx]?.datetime || '').slice(11, 16) + 'h'} />
            <Kpi label="Máximo" value={fmt(stats.max, unit)} accent="#dc2626" sub={(data.indicator?.values[stats.maxIdx]?.datetime || '').slice(11, 16) + 'h'} />
          </div>

          {/* Gráfico SVG */}
          <Chart
            values={data.indicator?.values || []}
            unit={unit}
            minV={stats.min}
            maxV={stats.max}
            avg={stats.avg}
            higherIsWorse={data.meta?.higher_is_worse}
          />
        </>
      )}

      {!loading && data?.ok && (
        <p style={{ margin: '10px 0 0', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
          Fuente: ESIOS · indicador {data.indicator?.id} · <a href={data.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0891b2' }}>ver en esios.ree.es ↗</a>
        </p>
      )}
    </section>
  )
}

function Kpi({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div style={{
      padding: '8px 10px', background: '#fff', border: '1px solid #f1f5f9',
      borderLeft: `3px solid ${accent}`, borderRadius: 6,
    }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: accent, fontFamily: 'ui-monospace, monospace' }}>
        {value}
      </p>
      {sub && (
        <p style={{ margin: '1px 0 0', fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>{sub}</p>
      )}
    </div>
  )
}

function Chart({
  values, unit, minV, maxV, avg, higherIsWorse,
}: {
  values: EsiosValue[]
  unit: string
  minV: number
  maxV: number
  avg: number
  higherIsWorse?: boolean
}) {
  if (values.length < 2) return null
  const w = 720
  const h = 200
  const padL = 40, padR = 10, padT = 10, padB = 30
  const chartW = w - padL - padR
  const chartH = h - padT - padB
  const range = maxV - minV || 1

  const xFor = (i: number) => padL + (i / (values.length - 1)) * chartW
  const yFor = (v: number) => padT + chartH - ((v - minV) / range) * chartH

  // Línea principal
  const pathLine = values.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.value).toFixed(1)}`).join(' ')

  // Área bajo la línea (relleno semitransparente)
  const pathArea = `M${xFor(0)},${padT + chartH} L${values.map((p, i) => `${xFor(i).toFixed(1)},${yFor(p.value).toFixed(1)}`).join(' L')} L${xFor(values.length - 1)},${padT + chartH} Z`

  // Línea de media horizontal
  const yAvg = yFor(avg)

  // Ticks Y (3 valores)
  const ticksY = [minV, avg, maxV]

  // Ticks X (cada 6h)
  const ticksXIdx: number[] = []
  for (let i = 0; i < values.length; i += Math.max(1, Math.floor(values.length / 6))) ticksXIdx.push(i)
  if (ticksXIdx[ticksXIdx.length - 1] !== values.length - 1) ticksXIdx.push(values.length - 1)

  // Color · gradient si higher_is_worse (verde abajo, rojo arriba)
  const gradientId = `esios-grad-${Math.random().toString(36).slice(2, 8)}`

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={higherIsWorse ? '#dc2626' : '#16a34a'} stopOpacity="0.30" />
          <stop offset="100%" stopColor={higherIsWorse ? '#dc2626' : '#16a34a'} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Eje Y ticks */}
      {ticksY.map((tv, i) => (
        <g key={i}>
          <line x1={padL} y1={yFor(tv)} x2={w - padR} y2={yFor(tv)} stroke="#f1f5f9" strokeWidth="1" />
          <text x={padL - 4} y={yFor(tv) + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="ui-monospace, monospace">
            {fmt(tv, unit)}
          </text>
        </g>
      ))}

      {/* Área */}
      <path d={pathArea} fill={`url(#${gradientId})`} />

      {/* Línea media */}
      <line x1={padL} y1={yAvg} x2={w - padR} y2={yAvg} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
      <text x={w - padR + 2} y={yAvg + 3} fontSize="9" fill="#94a3b8">media</text>

      {/* Línea principal */}
      <path d={pathLine} fill="none" stroke={higherIsWorse ? '#dc2626' : '#16a34a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

      {/* Marcador último valor */}
      <circle cx={xFor(values.length - 1)} cy={yFor(values[values.length - 1].value)} r="3.5" fill={higherIsWorse ? '#dc2626' : '#16a34a'} />

      {/* Eje X ticks · hora */}
      {ticksXIdx.map((i) => (
        <text
          key={i}
          x={xFor(i)}
          y={h - padB + 14}
          textAnchor="middle"
          fontSize="9"
          fill="#94a3b8"
          fontFamily="ui-monospace, monospace"
        >
          {values[i].datetime.slice(11, 16)}
        </text>
      ))}
    </svg>
  )
}

function fmt(v: number, unit: string): string {
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

export default EsiosHourlyChart
