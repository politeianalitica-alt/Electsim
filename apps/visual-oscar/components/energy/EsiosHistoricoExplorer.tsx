'use client'
/**
 * <EsiosHistoricoExplorer /> · Sprint ESIOS-DEEP S5
 *
 * Drill-down genérico de cualquier indicador ESIOS:
 *   - Selector slug (los 30+ indicadores curados)
 *   - Selector rango (24h, 7d, 30d, 1y)
 *   - Chart serie + stats (avg/min/max/std/p10/p50/p90)
 *   - Export CSV de la serie
 *   - Buckets diarios visualizados como barras si rango 7d/30d
 *
 * Consume /api/esios/historico/[slug]?range=...
 * Sin libs · SVG inline + descarga client-side.
 */
import { useEffect, useState } from 'react'

interface Stats {
  count: number; avg: number; min: number; max: number; std: number
  p10: number; p50: number; p90: number
}
interface DailyBucket {
  date: string; avg: number; min: number; max: number; count: number
}
interface Response {
  ok: boolean; error?: string
  slug?: string
  range?: string
  serie?: Array<{ t: string; v: number }>
  serie_downsampled?: boolean
  stats?: Stats
  daily?: DailyBucket[]
  meta?: { slug: string; label: string; short: string; unit: string; frequency: string; category: string; use_case: string; higher_is_worse?: boolean }
  _meta?: { source: string; source_url: string; cache_ttl_seconds: number; max_serie_length: number }
}

const SLUG_OPTIONS: Array<{ slug: string; label: string }> = [
  { slug: 'pvpc', label: 'PVPC · Precio regulado' },
  { slug: 'mercado_spot', label: 'Spot OMIE' },
  { slug: 'intradiario_mi1', label: 'Intradiario MI1' },
  { slug: 'demanda_real', label: 'Demanda real peninsular' },
  { slug: 'porcentaje_renovable', label: '% renovable' },
  { slug: 'porcentaje_libre_co2', label: '% libre CO2' },
  { slug: 'emisiones_co2', label: 'Emisiones gCO2/kWh' },
  { slug: 'precio_co2_eua', label: 'Precio EUA CO2' },
  { slug: 'gen_nuclear', label: 'Generación nuclear' },
  { slug: 'gen_eolica', label: 'Generación eólica' },
  { slug: 'gen_solar_fv', label: 'Generación solar FV' },
  { slug: 'gen_hidraulica', label: 'Generación hidráulica' },
  { slug: 'gen_ciclo_combinado', label: 'Generación ciclo combinado' },
  { slug: 'gen_renovable_total', label: 'Renovable total' },
  { slug: 'intercambio_francia', label: 'Saldo Francia' },
  { slug: 'intercambio_portugal', label: 'Saldo Portugal' },
  { slug: 'banda_secundaria_subir', label: 'Banda sec. subir' },
  { slug: 'desvios', label: 'Precio desvíos' },
  { slug: 'restricciones_tecnicas', label: 'Restricciones técnicas' },
]

const RANGES: Array<{ value: '24h' | '7d' | '30d' | '1y'; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '1y', label: '1 año' },
]

export function EsiosHistoricoExplorer() {
  const [slug, setSlug] = useState('pvpc')
  const [range, setRange] = useState<'24h' | '7d' | '30d' | '1y'>('7d')
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/esios/historico/${slug}?range=${range}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [slug, range])

  function exportCSV() {
    if (!data?.serie) return
    const header = 't,v\n'
    const body = data.serie.map((p) => `${p.t},${p.v}`).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `esios_${slug}_${range}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '18px 20px',
    }}>
      <header style={{ marginBottom: 12 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
          letterSpacing: '-0.01em', margin: 0, color: '#1d1d1f',
        }}>
          Explorar histórico · ESIOS drill-down
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
          Selecciona indicador y rango. Stats automáticas + descarga CSV.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <select
          value={slug} onChange={(e) => setSlug(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, minWidth: 200 }}
        >
          {SLUG_OPTIONS.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              style={{
                padding: '6px 10px', borderRadius: 6,
                border: range === r.value ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: range === r.value ? '#0f172a' : '#fff',
                color: range === r.value ? '#fff' : '#475569',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}
            >{r.label}</button>
          ))}
        </div>
        <button
          onClick={exportCSV}
          disabled={!data?.serie}
          style={{
            padding: '6px 10px', borderRadius: 6,
            border: '1px solid #0891b2', background: '#fff', color: '#0891b2',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            opacity: data?.serie ? 1 : 0.5,
          }}
        >
          ⤓ CSV
        </button>
      </div>

      {loading && <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando…</p>}

      {!loading && data && !data.ok && data.error === 'no_key' && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b',
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#92400e',
        }}>
          <strong>! Configuración pendiente</strong> · ESIOS_API_KEY no está en Vercel env vars.
        </div>
      )}

      {!loading && data && !data.ok && data.error !== 'no_key' && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #dc2626',
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#991b1b',
        }}>
          ▲ Sin datos: <code>{data.error}</code>
        </div>
      )}

      {!loading && data?.ok && data.serie && (
        <>
          {data.stats && <StatsRow stats={data.stats} unit={data.meta?.unit || ''} />}
          <SeriesChart serie={data.serie} downsampled={data.serie_downsampled} stats={data.stats} unit={data.meta?.unit || ''} higherIsWorse={data.meta?.higher_is_worse} />
          {data.daily && data.daily.length > 0 && <DailyBars daily={data.daily} unit={data.meta?.unit || ''} />}
          {data.meta && (
            <p style={{ margin: '10px 0 0', fontSize: 10, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
              {data.meta.use_case} · frecuencia <strong>{data.meta.frequency}</strong> · categoría <strong>{data.meta.category}</strong>
            </p>
          )}
        </>
      )}
    </section>
  )
}

function StatsRow({ stats, unit }: { stats: Stats; unit: string }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
      gap: 8, marginBottom: 12,
    }}>
      <Stat label="N" value={stats.count.toLocaleString('es-ES')} />
      <Stat label="Media" value={`${stats.avg.toLocaleString('es-ES')}`} />
      <Stat label="Min" value={`${stats.min.toLocaleString('es-ES')}`} />
      <Stat label="Max" value={`${stats.max.toLocaleString('es-ES')}`} />
      <Stat label="Desv. típica" value={`${stats.std.toLocaleString('es-ES')}`} />
      <Stat label="p10" value={`${stats.p10.toLocaleString('es-ES')}`} />
      <Stat label="Mediana" value={`${stats.p50.toLocaleString('es-ES')}`} />
      <Stat label="p90" value={`${stats.p90.toLocaleString('es-ES')}`} />
    </div>
  )
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '6px 8px', background: '#f8fafc', borderRadius: 6, border: '1px solid #f1f5f9' }}>
      <p style={{ margin: 0, fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

function SeriesChart({
  serie, downsampled, stats, unit, higherIsWorse,
}: { serie: Array<{ t: string; v: number }>; downsampled?: boolean; stats?: Stats; unit: string; higherIsWorse?: boolean }) {
  if (serie.length < 2) return null
  const vals = serie.map((p) => p.v)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1
  const w = 720, h = 220, padL = 40, padR = 8, padT = 14, padB = 22
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const xOf = (i: number) => padL + (i / Math.max(1, serie.length - 1)) * innerW
  const yOf = (v: number) => padT + innerH - ((v - minV) / range) * innerH
  const lineColor = higherIsWorse ? '#dc2626' : '#0891b2'
  const path = serie.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')
  const avgY = stats ? yOf(stats.avg) : null

  const tickIdxs = [0, Math.floor(serie.length / 4), Math.floor(serie.length / 2), Math.floor(serie.length * 3 / 4), serie.length - 1]

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <p style={{ margin: 0, fontSize: 10, color: '#475569', fontWeight: 600 }}>
          Serie · {serie.length} puntos {downsampled && <span style={{ color: '#94a3b8' }}>(downsampled)</span>}
        </p>
        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>{unit}</span>
      </div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {[0, 0.5, 1].map((t) => {
          const y = padT + innerH * t
          const v = maxV - range * t
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={padL - 4} y={y + 3} fontSize={9} fill="#94a3b8" textAnchor="end" fontFamily="ui-monospace, monospace">
                {v.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
              </text>
            </g>
          )
        })}
        <path d={path} fill="none" stroke={lineColor} strokeWidth={1.4} />
        {avgY !== null && (
          <>
            <line x1={padL} y1={avgY} x2={w - padR} y2={avgY} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
            <text x={w - padR - 4} y={avgY - 3} fontSize={8} fill="#94a3b8" textAnchor="end">media</text>
          </>
        )}
        {tickIdxs.map((i) => (
          <text key={i} x={xOf(i)} y={h - 6} fontSize={8} fill="#94a3b8" textAnchor="middle" fontFamily="ui-monospace, monospace">
            {serie[i]?.t.slice(0, 10) || ''}
          </text>
        ))}
      </svg>
    </div>
  )
}

function DailyBars({ daily, unit }: { daily: DailyBucket[]; unit: string }) {
  if (daily.length === 0) return null
  const maxAvg = Math.max(...daily.map((d) => d.avg))
  const w = 720, h = 80, padL = 40, padR = 8, padT = 8, padB = 18
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const barW = innerW / daily.length - 1
  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 10, color: '#475569', fontWeight: 600 }}>
        Tendencia diaria · media por día
      </p>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {daily.map((d, i) => {
          const x = padL + i * (innerW / daily.length)
          const barH = (d.avg / maxAvg) * innerH
          const y = padT + innerH - barH
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={barH} fill="#0891b2" opacity={0.7}>
                <title>{d.date} · media {d.avg} {unit}</title>
              </rect>
            </g>
          )
        })}
        {[0, Math.floor(daily.length / 2), daily.length - 1].map((i) => (
          <text key={i} x={padL + i * (innerW / daily.length) + barW / 2} y={h - 4} fontSize={7} fill="#94a3b8" textAnchor="middle" fontFamily="ui-monospace, monospace">
            {daily[i]?.date.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  )
}

export default EsiosHistoricoExplorer
