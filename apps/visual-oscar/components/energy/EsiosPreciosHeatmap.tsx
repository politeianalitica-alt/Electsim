'use client'
/**
 * <EsiosPreciosHeatmap /> · Sprint ESIOS-DEEP S2
 *
 * Muestra los precios eléctricos PVPC + Spot OMIE + Intradiarios MI1-MI4
 * con tres vistas combinadas:
 *
 *   1. KPIs superiores: PVPC ahora, mín hoy, máx hoy, hora más barata/cara
 *   2. Heatmap 7×24 (días × horas) PVPC · color verde/ámbar/rojo por p25/p75
 *      Tooltip al hover muestra fecha + hora + valor
 *   3. Mini-líneas PVPC vs Spot vs MI1 últimas 48h
 *
 * Consume /api/esios/precios (cache 600s).
 * Sin libs de charting · todo SVG inline.
 */
import { useEffect, useState } from 'react'

interface SerieValor { t: string; v: number }
interface DailyStats {
  date: string; avg: number; min: number; max: number
  hora_min: string; hora_max: string; count: number
}
interface PrecioSerie {
  slug: string; ok: boolean; label: string; short: string; unit: string
  latest: { value: number; datetime: string } | null
  prev_24h: { value: number; datetime: string } | null
  change_pct: number | null
  avg_24h: number | null
  serie_48h: SerieValor[]
  daily_stats: DailyStats[]
  source_url: string
  error?: string
}
interface HeatmapCell { dow: number; hour: number; value: number; date: string }
interface Heatmap {
  cells: HeatmapCell[]
  min: number; max: number; p25: number; p75: number
}
interface Response {
  ok: boolean
  error?: string
  message?: string
  precios: Record<string, PrecioSerie>
  heatmap_pvpc: Heatmap | null
  indicators_count?: number
  indicators_ok?: number
  fetched_at: string
  _meta?: { source: string; source_url: string; cache_ttl_seconds: number; note: string }
}

const DOW_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']  // domingo=0 según getDay()

export function EsiosPreciosHeatmap() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<HeatmapCell | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/esios/precios', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '18px 20px',
    }}>
      <header style={{ marginBottom: 14 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
          letterSpacing: '-0.01em', margin: 0, color: '#1d1d1f',
        }}>
          Precios eléctricos · PVPC + Spot OMIE + Intradiarios
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
          Heatmap PVPC 7 días × 24h · KPIs día actual · comparativa mayorista 48h.
          Datos horarios oficiales ESIOS · cache 10 min · D+1 publicado a las 20:15.
        </p>
      </header>

      {loading && (
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando precios ESIOS…</p>
      )}

      {!loading && data && !data.ok && data.error === 'no_key' && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b',
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#92400e',
        }}>
          <strong>! Configuración pendiente</strong> · ESIOS_API_KEY no está en Vercel env vars.
          Una vez añadida verás precios horarios reales con heatmap semanal.
        </div>
      )}

      {!loading && data?.ok && (
        <>
          <PvpcKpis precio={data.precios.pvpc} />
          {data.heatmap_pvpc && (
            <HeatmapGrid heatmap={data.heatmap_pvpc} onHover={setHover} hover={hover} />
          )}
          <CompareSeries precios={data.precios} />
          {data._meta && (
            <p style={{ margin: '12px 0 0', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
              Fuente: <a href={data._meta.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0891b2' }}>{data._meta.source}</a> · {data._meta.note}
            </p>
          )}
        </>
      )}
    </section>
  )
}

function PvpcKpis({ precio }: { precio: PrecioSerie | undefined }) {
  if (!precio?.ok || !precio.latest) return null
  const today = precio.daily_stats[precio.daily_stats.length - 1]
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 10, marginBottom: 14,
    }}>
      <Kpi label="PVPC ahora" value={`${precio.latest.value.toLocaleString('es-ES', { maximumFractionDigits: 1 })} €/MWh`} sub={precio.latest.datetime.slice(11, 16) + 'h'} accent="#dc2626" />
      {today && <>
        <Kpi label="Mínimo hoy" value={`${today.min} €/MWh`} sub={`a las ${today.hora_min}`} accent="#16a34a" />
        <Kpi label="Máximo hoy" value={`${today.max} €/MWh`} sub={`a las ${today.hora_max}`} accent="#dc2626" />
        <Kpi label="Media hoy" value={`${today.avg} €/MWh`} sub={`${today.count} horas`} accent="#0891b2" />
      </>}
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{
      padding: '10px 12px', background: '#fff', borderRadius: 8,
      borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9',
    }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace', lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>{sub}</p>}
    </div>
  )
}

function colorForPrice(value: number, p25: number, p75: number, min: number, max: number): string {
  // Verde (barato) → ámbar (medio) → rojo (caro)
  if (value <= p25) {
    // verde · interpolar de #dcfce7 (claro) a #16a34a (oscuro)
    const t = min === p25 ? 0 : (value - min) / (p25 - min)
    return interp('#dcfce7', '#16a34a', t)
  } else if (value <= p75) {
    // ámbar
    const t = p25 === p75 ? 0 : (value - p25) / (p75 - p25)
    return interp('#fef3c7', '#f59e0b', t)
  } else {
    // rojo
    const t = p75 === max ? 1 : (value - p75) / (max - p75)
    return interp('#fee2e2', '#dc2626', t)
  }
}

function interp(c1: string, c2: string, t: number): string {
  const tt = Math.max(0, Math.min(1, t))
  const h2r = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
  const [r1, g1, b1] = h2r(c1)
  const [r2, g2, b2] = h2r(c2)
  const r = Math.round(r1 + (r2 - r1) * tt)
  const g = Math.round(g1 + (g2 - g1) * tt)
  const b = Math.round(b1 + (b2 - b1) * tt)
  return `rgb(${r},${g},${b})`
}

function HeatmapGrid({
  heatmap, hover, onHover,
}: { heatmap: Heatmap; hover: HeatmapCell | null; onHover: (c: HeatmapCell | null) => void }) {
  // Construir matriz 7 dow × 24h. Si hay valor → último de los duplicados (puede haber repeticiones de día por solapamiento semanal)
  const grid: (HeatmapCell | null)[][] = Array.from({ length: 7 }, () => Array(24).fill(null))
  for (const c of heatmap.cells) {
    grid[c.dow][c.hour] = c
  }

  const cellW = 24, cellH = 18, labelW = 22, headerH = 16
  const w = labelW + 24 * cellW + 8
  const h = headerH + 7 * cellH + 8

  return (
    <div style={{ marginBottom: 14, position: 'relative' }}>
      <p style={{ margin: '0 0 8px', fontSize: 10, color: '#475569', fontWeight: 600 }}>
        Heatmap PVPC últimos 7 días · {Math.round(heatmap.min)}–{Math.round(heatmap.max)} €/MWh
      </p>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        {/* header horas */}
        {[0, 6, 12, 18].map((hr) => (
          <text key={hr} x={labelW + hr * cellW + cellW / 2} y={11} fontSize={8} fill="#94a3b8" textAnchor="middle">{hr}h</text>
        ))}
        {/* filas */}
        {grid.map((row, dow) => (
          <g key={dow}>
            <text x={4} y={headerH + dow * cellH + cellH / 2 + 3} fontSize={8} fill="#94a3b8">{DOW_LABELS[dow]}</text>
            {row.map((cell, hour) => {
              if (!cell) {
                return <rect key={hour} x={labelW + hour * cellW} y={headerH + dow * cellH} width={cellW - 1} height={cellH - 1} fill="#f8fafc" />
              }
              const fill = colorForPrice(cell.value, heatmap.p25, heatmap.p75, heatmap.min, heatmap.max)
              return (
                <rect
                  key={hour}
                  x={labelW + hour * cellW} y={headerH + dow * cellH}
                  width={cellW - 1} height={cellH - 1}
                  fill={fill}
                  stroke={hover === cell ? '#0f172a' : 'transparent'}
                  strokeWidth={1}
                  onMouseEnter={() => onHover(cell)}
                  onMouseLeave={() => onHover(null)}
                  style={{ cursor: 'pointer' }}
                />
              )
            })}
          </g>
        ))}
      </svg>
      {/* leyenda escala */}
      <div style={{ display: 'flex', gap: 4, marginTop: 6, alignItems: 'center', fontSize: 9, color: '#94a3b8' }}>
        <span>Barato</span>
        <div style={{ display: 'flex', gap: 1 }}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const v = heatmap.min + (heatmap.max - heatmap.min) * t
            return <div key={t} style={{ width: 18, height: 8, background: colorForPrice(v, heatmap.p25, heatmap.p75, heatmap.min, heatmap.max) }} />
          })}
        </div>
        <span>Caro</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'ui-monospace, monospace' }}>
          p25 {Math.round(heatmap.p25)} · p75 {Math.round(heatmap.p75)} €/MWh
        </span>
      </div>
      {/* tooltip */}
      {hover && (
        <div style={{
          position: 'absolute', top: 4, right: 0,
          background: '#0f172a', color: '#fff', padding: '6px 10px',
          borderRadius: 6, fontSize: 11, fontFamily: 'ui-monospace, monospace',
          pointerEvents: 'none',
        }}>
          {hover.date} · {String(hover.hour).padStart(2, '0')}:00 · <strong>{hover.value.toFixed(1)} €/MWh</strong>
        </div>
      )}
    </div>
  )
}

function CompareSeries({ precios }: { precios: Record<string, PrecioSerie> }) {
  const pvpc = precios.pvpc?.serie_48h || []
  const spot = precios.mercado_spot?.serie_48h || []
  const mi1 = precios.intradiario_mi1?.serie_48h || []

  if (pvpc.length === 0 && spot.length === 0) return null

  const all = [...pvpc, ...spot, ...mi1]
  const vals = all.map((p) => p.v).filter((v) => Number.isFinite(v))
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1

  const w = 720, h = 100, pad = 12
  const innerW = w - pad * 2
  const innerH = h - pad * 2

  const pathOf = (serie: SerieValor[], stroke: string) => {
    if (serie.length < 2) return null
    const d = serie.map((p, i) => {
      const x = pad + (i / (serie.length - 1)) * innerW
      const y = pad + innerH - ((p.v - minV) / range) * innerH
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
    return <path d={d} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  }

  return (
    <div style={{ marginTop: 14 }}>
      <p style={{ margin: '0 0 6px', fontSize: 10, color: '#475569', fontWeight: 600 }}>
        Comparativa 72h · PVPC vs Spot OMIE vs Intradiario MI1
      </p>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', background: '#fafafa', borderRadius: 6 }}>
        {pathOf(pvpc, '#dc2626')}
        {pathOf(spot, '#0891b2')}
        {pathOf(mi1, '#f59e0b')}
      </svg>
      <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 10, color: '#475569', flexWrap: 'wrap' }}>
        <Legend color="#dc2626" label="PVPC" />
        <Legend color="#0891b2" label="Spot OMIE" />
        <Legend color="#f59e0b" label="Intradiario MI1" />
        <span style={{ marginLeft: 'auto', color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>{Math.round(minV)}–{Math.round(maxV)} €/MWh</span>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ display: 'inline-block', width: 10, height: 2, background: color }} />
      <span>{label}</span>
    </span>
  )
}

export default EsiosPreciosHeatmap
