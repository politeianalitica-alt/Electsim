'use client'
/**
 * `<GeoEventCalendarHeatmap />` · Sprint G14 cierre extra
 *
 * Heatmap calendario estilo GitHub contributions sobre 90 días recientes de
 * eventos geopolíticos (cascading events + state-media items + convergence
 * alerts). Cada celda = un día · color por densidad de actividad.
 *
 * Permite ver "el pulso del mundo a 90 días" de un vistazo y detectar:
 *  - Días pico (crisis aguda)
 *  - Patrones semanales (lunes alto / fin de semana bajo)
 *  - Spikes inesperados (señal débil)
 *
 * Inspirado en GitHub contribution graph + echarts calendar heatmap, pero
 * implementado con SVG puro + d3-scale (ya en bundle) · cero nuevas deps.
 */
import { useEffect, useMemo, useState } from 'react'
import { scaleQuantize } from 'd3-scale'

interface DayBucket {
  date: string                // YYYY-MM-DD
  total: number
  by_type: Record<string, number>  // {acled: 5, osint: 3, alert: 1, state_media: 12}
  critical_count: number
}

interface Resp {
  ok?: boolean
  events?: Array<{ ts: string; type?: string; severity?: string }>
}

// Helpers fecha
function toDateStr(d: Date): string { return d.toISOString().slice(0, 10) }

function buildDayRange(days: number): string[] {
  const out: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push(toDateStr(d))
  }
  return out
}

function weekIndex(dateStr: string, baseDate: Date): number {
  const d = new Date(dateStr)
  const ms = d.getTime() - baseDate.getTime()
  return Math.floor(ms / (7 * 86400000))
}

function dayOfWeek(dateStr: string): number {
  // 0 = lunes (queremos lunes arriba), 6 = domingo
  const d = new Date(dateStr).getDay()  // 0 dom, 1 lun, ..., 6 sab
  return d === 0 ? 6 : d - 1
}

const DAYS_OF_WEEK_LABEL = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTH_LABEL_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function GeoEventCalendarHeatmap({ days = 90 }: { days?: number }) {
  const [cascading, setCascading] = useState<Resp | null>(null)
  const [stateMedia, setStateMedia] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<{ x: number; y: number; day: DayBucket } | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/geopolitica/cascading-events?limit=500', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/geopolitica/state-media?limit_per_feed=15', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([c, s]) => {
      if (!alive) return
      setCascading(c)
      setStateMedia(s)
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const buckets = useMemo<Record<string, DayBucket>>(() => {
    const dayRange = buildDayRange(days)
    const map: Record<string, DayBucket> = {}
    for (const d of dayRange) {
      map[d] = { date: d, total: 0, by_type: {}, critical_count: 0 }
    }
    const cutoffTs = Date.now() - days * 86400000
    // Cascading events
    if (cascading?.events && Array.isArray(cascading.events)) {
      for (const e of cascading.events) {
        const ts = new Date(e.ts).getTime()
        if (isNaN(ts) || ts < cutoffTs) continue
        const dayStr = toDateStr(new Date(ts))
        const b = map[dayStr]
        if (!b) continue
        b.total++
        const t = e.type || 'unknown'
        b.by_type[t] = (b.by_type[t] || 0) + 1
        if (e.severity === 'critical') b.critical_count++
      }
    }
    // State-media items
    if (stateMedia?.feeds && Array.isArray(stateMedia.feeds)) {
      for (const f of stateMedia.feeds) {
        if (!Array.isArray(f.items)) continue
        for (const it of f.items) {
          const ts = new Date(it.pubDate || '').getTime()
          if (isNaN(ts) || ts < cutoffTs) continue
          const dayStr = toDateStr(new Date(ts))
          const b = map[dayStr]
          if (!b) continue
          b.total++
          b.by_type['state_media'] = (b.by_type['state_media'] || 0) + 1
        }
      }
    }
    return map
  }, [cascading, stateMedia, days])

  const dayList = useMemo(() => buildDayRange(days), [days])
  const counts = useMemo(() => Object.values(buckets).map((b) => b.total), [buckets])
  const maxCount = Math.max(1, ...counts)

  // Escala color · semáforo oscuro (sin datos) → rojo crítico
  const colorScale = useMemo(() => scaleQuantize<string>()
    .domain([0, maxCount])
    .range(['#1e293b', '#365314', '#84cc16', '#facc15', '#f97316', '#dc2626']),
    [maxCount])

  // Grid layout
  const baseDate = useMemo(() => new Date(dayList[0]), [dayList])
  const cellSize = 12
  const cellGap = 2
  const nWeeks = Math.ceil(days / 7) + 1
  const svgW = nWeeks * (cellSize + cellGap) + 30
  const svgH = 7 * (cellSize + cellGap) + 30

  // Month labels: cada celda con weekIndex inicio de mes (día 1-7 del mes)
  const monthLabels: Array<{ x: number; label: string }> = []
  let lastMonth = -1
  for (const dateStr of dayList) {
    const d = new Date(dateStr)
    const m = d.getMonth()
    if (m !== lastMonth && d.getDate() <= 7) {
      monthLabels.push({ x: weekIndex(dateStr, baseDate) * (cellSize + cellGap), label: MONTH_LABEL_ES[m] })
      lastMonth = m
    }
  }

  const totalEvents = counts.reduce((s, c) => s + c, 0)
  const activeDays = counts.filter((c) => c > 0).length

  return (
    <section style={{
      background: '#020617',
      border: '1px solid #1e293b',
      borderLeft: '4px solid #84cc16',
      borderRadius: 12,
      padding: 18,
      color: '#f1f5f9',
      position: 'relative',
    }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#bef264', textTransform: 'uppercase' }}>
          ▦ Heatmap calendario · {days} días de actividad geopolítica
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
          {totalEvents} eventos · {activeDays} días con actividad · pico {maxCount} eventos/día. Combina cascading events (ACLED+OSINT+alertas) + items state-media. Hover día → breakdown.
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando series temporales…</p>}

      {!loading && (
        <div style={{ overflow: 'auto', paddingBottom: 4 }}>
          <svg width={svgW} height={svgH} style={{ display: 'block', minWidth: svgW }}>
            {/* Month labels arriba */}
            {monthLabels.map((m, i) => (
              <text key={i} x={m.x + 30} y={10} fontSize={9} fill="#94a3b8" fontFamily="ui-monospace, monospace">
                {m.label}
              </text>
            ))}
            {/* Day-of-week labels izquierda */}
            {DAYS_OF_WEEK_LABEL.map((lbl, i) => (
              <text key={lbl} x={4} y={24 + i * (cellSize + cellGap) + cellSize - 2} fontSize={8} fill="#64748b" fontFamily="ui-monospace, monospace">
                {lbl}
              </text>
            ))}
            {/* Celdas día */}
            {dayList.map((dateStr) => {
              const wi = weekIndex(dateStr, baseDate)
              const dow = dayOfWeek(dateStr)
              const b = buckets[dateStr]
              const fill = colorScale(b.total)
              return (
                <rect
                  key={dateStr}
                  x={30 + wi * (cellSize + cellGap)}
                  y={20 + dow * (cellSize + cellGap)}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={fill}
                  stroke={b.critical_count > 0 ? '#dc2626' : 'transparent'}
                  strokeWidth={b.critical_count > 0 ? 1 : 0}
                  onMouseEnter={(evt) => setHover({ x: evt.clientX, y: evt.clientY, day: b })}
                  onMouseMove={(evt) => hover && setHover({ ...hover, x: evt.clientX, y: evt.clientY })}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: b.total > 0 ? 'pointer' : 'default' }}
                />
              )
            })}
          </svg>
        </div>
      )}

      {/* Tooltip */}
      {hover && hover.day.total > 0 && (
        <div
          style={{
            position: 'fixed',
            top: hover.y + 12, left: hover.x + 12,
            background: '#0f172a', color: '#f1f5f9',
            border: '1px solid #334155', borderRadius: 6,
            padding: '8px 10px', fontSize: 11, pointerEvents: 'none',
            zIndex: 50, minWidth: 180,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{hover.day.date}</div>
          <div style={{ marginBottom: 3 }}>
            Total: <strong style={{ color: '#bef264' }}>{hover.day.total}</strong> eventos
          </div>
          {hover.day.critical_count > 0 && (
            <div style={{ color: '#fca5a5', fontWeight: 600, marginBottom: 3 }}>
              ▲ {hover.day.critical_count} críticos
            </div>
          )}
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 4 }}>
            {Object.entries(hover.day.by_type).map(([k, v]) => (
              <div key={k} style={{ fontSize: 10, color: '#94a3b8' }}>
                · {k}: <strong style={{ color: '#cbd5e1' }}>{v}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leyenda */}
      {!loading && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, fontSize: 9, color: '#94a3b8', alignItems: 'center' }}>
          <span>Menos</span>
          {['#1e293b', '#365314', '#84cc16', '#facc15', '#f97316', '#dc2626'].map((c) => (
            <span key={c} style={{ width: 12, height: 12, background: c, borderRadius: 2, display: 'inline-block' }} />
          ))}
          <span>Más</span>
          <span style={{ marginLeft: 12, color: '#fca5a5' }}>· borde rojo = ≥1 evento crítico</span>
        </div>
      )}
    </section>
  )
}

export default GeoEventCalendarHeatmap
