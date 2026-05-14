'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardsApi } from '@/lib/domo/api-client'
import { POLITEIA_COLORS, PARTIDO_COLORS } from '@/lib/domo/constants'
import { formatNumber } from '@/lib/domo/utils'
import type { DashboardWidget } from '@/types/domo'
import Skeleton from '@/components/Skeleton'
import Sparkline from '@/components/Sparkline'
import CountUp from '@/components/CountUp'
import styles from './WidgetRenderer.module.css'

interface Props {
  widget:      DashboardWidget
  dashboardId: string
  editable?:   boolean
  onEdit?:     () => void
  onRemove?:   () => void
}

export default function WidgetRenderer({ widget, dashboardId, editable, onEdit, onRemove }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey:  ['domo', 'dashboard-widget', dashboardId, widget.id],
    queryFn:   () => dashboardsApi.widgetData(dashboardId, widget.id),
    staleTime: 60_000,
    enabled:   widget.type !== 'text',
  })

  const rows    = data?.rows ?? []
  const columns = data?.columns ?? []

  const cfg = widget.config

  return (
    <div className={`${styles.widget} ${editable ? styles.editable : ''}`}>
      {(cfg.title || editable) && (
        <div className={styles.widgetHeader}>
          <div className={styles.widgetTitleGroup}>
            {cfg.title    && <span className={styles.widgetTitle}>{cfg.title}</span>}
            {cfg.subtitle && <span className={styles.widgetSubtitle}>{cfg.subtitle}</span>}
          </div>
          {editable && (
            <div className={styles.widgetActions}>
              <button onClick={onEdit}   className={styles.widgetActionBtn} title="Configurar">⚙</button>
              <button onClick={onRemove} className={styles.widgetActionBtn} title="Eliminar">×</button>
            </div>
          )}
        </div>
      )}

      <div className={styles.widgetBody}>
        {isLoading && widget.type !== 'text' ? (
          <Skeleton style={{ flex: 1, borderRadius: 8, margin: '8px' }} />
        ) : isError && widget.type !== 'text' ? (
          <div className={styles.errorState}>! Sin datos</div>
        ) : (
          <WidgetContent
            widget={widget}
            rows={rows}
            columns={columns}
          />
        )}
      </div>
    </div>
  )
}

function WidgetContent({ widget, rows, columns }: {
  widget:  DashboardWidget
  rows:    Record<string, unknown>[]
  columns: string[]
}) {
  const cfg     = widget.config
  const colors  = POLITEIA_COLORS
  const partidos = PARTIDO_COLORS

  switch (widget.type) {

    case 'text':
      return (
        <div className={styles.textWidget}>
          <div dangerouslySetInnerHTML={{ __html: (cfg.content ?? '').replace(/\n/g, '<br/>') }} />
        </div>
      )

    case 'kpi': {
      const field = cfg.valueField ?? columns[0]
      const agg   = cfg.kpiAggregation ?? 'sum'
      let value: number
      if      (agg === 'count') value = rows.length
      else if (agg === 'avg')   value = rows.reduce((s, r) => s + Number(r[field] ?? 0), 0) / (rows.length || 1)
      else if (agg === 'min')   value = Math.min(...rows.map(r => Number(r[field] ?? 0)))
      else if (agg === 'max')   value = Math.max(...rows.map(r => Number(r[field] ?? 0)))
      else if (agg === 'last')  value = Number(rows[rows.length - 1]?.[field] ?? 0)
      else                      value = rows.reduce((s, r) => s + Number(r[field] ?? 0), 0)

      const sparkData = rows.slice(-20).map(r => Number(r[field] ?? 0))
      const prev      = sparkData[sparkData.length - 2] ?? 0
      const pct       = prev !== 0 ? ((value - prev) / prev) * 100 : 0

      return (
        <div className={styles.kpiWidget}>
          <div className={styles.kpiValue}>
            {cfg.prefix && <span className={styles.kpiPrefix}>{cfg.prefix}</span>}
            <CountUp value={value} />
            {cfg.unit && <span className={styles.kpiUnit}>{cfg.unit}</span>}
          </div>
          {cfg.kpiComparePct && (
            <div className={styles.kpiChange} style={{ color: pct >= 0 ? '#22c55e' : '#ef4444' }}>
              {pct >= 0 ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}%
            </div>
          )}
          {sparkData.length > 2 && (
            <div className={styles.kpiSparkline}>
              <Sparkline data={sparkData} color={colors[0]} />
            </div>
          )}
        </div>
      )
    }

    case 'bar':
    case 'bar_horizontal': {
      const xField        = cfg.xField ?? columns[0]
      const yField        = cfg.yField ?? columns[1]
      const isHorizontal  = widget.type === 'bar_horizontal'
      const maxVal        = Math.max(...rows.map(r => Number(r[yField] ?? 0)), 1)

      return (
        <div className={`${styles.barChart} ${isHorizontal ? styles.barChartH : ''}`}>
          {rows.slice(0, 15).map((row, i) => {
            const val   = Number(row[yField] ?? 0)
            const pct   = (val / maxVal) * 100
            const color = partidos[String(row[xField])] ?? colors[i % colors.length]
            return isHorizontal ? (
              <div key={i} className={styles.barHRow}>
                <span className={styles.barLabel}>{String(row[xField])}</span>
                <div className={styles.barHTrack}>
                  <div className={styles.barHFill} style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className={styles.barValue}>{formatNumber(val)}{cfg.unit ? ` ${cfg.unit}` : ''}</span>
              </div>
            ) : (
              <div key={i} className={styles.barVCol}>
                <div className={styles.barVTrack}>
                  <div
                    className={styles.barVFill}
                    style={{ height: `${pct}%`, background: color }}
                    title={`${row[xField]}: ${formatNumber(val)}`}
                  />
                </div>
                <span className={styles.barLabel}>{String(row[xField]).slice(0, 6)}</span>
              </div>
            )
          })}
        </div>
      )
    }

    case 'line':
    case 'area': {
      const yField = cfg.yField ?? columns[1]
      const vals   = rows.map(r => Number(r[yField] ?? 0))
      const minV   = Math.min(...vals)
      const maxV   = Math.max(...vals)
      const range  = maxV - minV || 1
      const W = 100, H = 60
      const pts = vals.map((v, i) => ({
        x: (i / Math.max(vals.length - 1, 1)) * W,
        y: H - ((v - minV) / range) * (H - 4) - 2,
      }))
      const d     = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      const areaD = `${d} L ${W} ${H} L 0 ${H} Z`

      return (
        <div className={styles.lineChart}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            {widget.type === 'area' && <path d={areaD} fill={`${colors[0]}30`} />}
            <path d={d} fill="none" stroke={colors[0]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )
    }

    case 'pie':
    case 'donut': {
      const labelField = cfg.labelField ?? columns[0]
      const valueField = cfg.valueField ?? columns[1]
      const total      = rows.reduce((s, r) => s + Number(r[valueField] ?? 0), 0)
      const CX = 50, CY = 50
      const R     = widget.type === 'donut' ? 28 : 40
      const INNER = widget.type === 'donut' ? 16 : 0

      let angle = -Math.PI / 2
      const slices = rows.slice(0, 8).map((row, i) => {
        const val   = Number(row[valueField] ?? 0)
        const sweep = total > 0 ? (val / total) * Math.PI * 2 : 0
        const x1 = CX + R * Math.cos(angle)
        const y1 = CY + R * Math.sin(angle)
        angle += sweep
        const x2 = CX + R * Math.cos(angle)
        const y2 = CY + R * Math.sin(angle)
        const xi1 = CX + INNER * Math.cos(angle - sweep)
        const yi1 = CY + INNER * Math.sin(angle - sweep)
        const xi2 = CX + INNER * Math.cos(angle)
        const yi2 = CY + INNER * Math.sin(angle)
        const large = sweep > Math.PI ? 1 : 0
        const color = partidos[String(row[labelField])] ?? colors[i % colors.length]
        const d = INNER > 0
          ? `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${xi2.toFixed(1)} ${yi2.toFixed(1)} A ${INNER} ${INNER} 0 ${large} 0 ${xi1.toFixed(1)} ${yi1.toFixed(1)} Z`
          : `M ${CX} ${CY} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`
        return { d, color, label: String(row[labelField]), val, pct: total > 0 ? ((val / total) * 100).toFixed(1) : '0' }
      })

      return (
        <div className={styles.pieChart}>
          <svg viewBox="0 0 100 100" style={{ width: '60%', height: '100%', flex: '0 0 auto' }}>
            {slices.map((s, i) => (
              <path key={i} d={s.d} fill={s.color} stroke="var(--bg-primary,#fff)" strokeWidth=".5">
                <title>{s.label}: {s.pct}%</title>
              </path>
            ))}
          </svg>
          {cfg.showLegend !== false && (
            <div className={styles.pieLegend}>
              {slices.map((s, i) => (
                <div key={i} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: s.color }} />
                  <span className={styles.legendLabel}>{s.label}</span>
                  <span className={styles.legendPct}>{s.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    case 'table': {
      const cols = cfg.xField
        ? [cfg.xField, ...(cfg.yField ? [cfg.yField] : []), ...(cfg.colorField ? [cfg.colorField] : [])]
        : columns.slice(0, 6)
      return (
        <div className={styles.tableWidget}>
          <table className={styles.miniTable}>
            <thead>
              <tr>{cols.map(c => <th key={c} className={styles.miniTh}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row, i) => (
                <tr key={i} className={styles.miniTr}>
                  {cols.map(c => (
                    <td key={c} className={styles.miniTd}>
                      {typeof row[c] === 'number' ? formatNumber(Number(row[c])) : String(row[c] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'gauge': {
      const field  = cfg.valueField ?? columns[0]
      const value  = Number(rows[0]?.[field] ?? 0)
      const min    = cfg.gaugeMin ?? 0
      const max    = cfg.gaugeMax ?? 100
      const pct    = Math.min(1, Math.max(0, (value - min) / (max - min)))
      const angle  = -150 + pct * 300
      const color  = cfg.gaugeThresholds
        ? cfg.gaugeThresholds.reduce((c, t) => value >= t.value ? t.color : c, colors[0])
        : colors[0]

      return (
        <div className={styles.gaugeWidget}>
          <svg viewBox="0 0 100 60" style={{ width: '80%' }}>
            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--color-border,#e5e7eb)" strokeWidth="8" strokeLinecap="round" />
            <path
              d={`M 10 50 A 40 40 0 ${pct > 0.5 ? 1 : 0} 1 ${(50 + 40 * Math.cos(((-150 + pct * 300) - 90) * Math.PI / 180)).toFixed(1)} ${(50 + 40 * Math.sin(((-150 + pct * 300) - 90) * Math.PI / 180)).toFixed(1)}`}
              fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            />
            <line
              x1="50" y1="50"
              x2={(50 + 28 * Math.cos((angle - 90) * Math.PI / 180)).toFixed(1)}
              y2={(50 + 28 * Math.sin((angle - 90) * Math.PI / 180)).toFixed(1)}
              stroke={color} strokeWidth="2" strokeLinecap="round"
            />
            <circle cx="50" cy="50" r="3" fill={color} />
          </svg>
          <div className={styles.gaugeValue} style={{ color }}>
            {cfg.prefix}{formatNumber(value)}{cfg.unit}
          </div>
          <div className={styles.gaugeLimits}>
            <span>{cfg.prefix}{min}{cfg.unit}</span>
            <span>{cfg.prefix}{max}{cfg.unit}</span>
          </div>
        </div>
      )
    }

    case 'scatter': {
      const xField = cfg.xField ?? columns[0]
      const yField = cfg.yField ?? columns[1]
      const xs = rows.map(r => Number(r[xField] ?? 0))
      const ys = rows.map(r => Number(r[yField] ?? 0))
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)

      return (
        <div className={styles.scatterChart}>
          <svg viewBox="0 0 100 80" style={{ width: '100%', height: '100%' }}>
            {rows.slice(0, 200).map((row, i) => {
              const x = maxX > minX ? ((Number(row[xField] ?? 0) - minX) / (maxX - minX)) * 90 + 5 : 50
              const y = maxY > minY ? 75 - ((Number(row[yField] ?? 0) - minY) / (maxY - minY)) * 70 : 40
              const color = cfg.colorField ? (partidos[String(row[cfg.colorField])] ?? colors[i % colors.length]) : colors[0]
              return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="1.8" fill={color} fillOpacity=".7" />
            })}
          </svg>
        </div>
      )
    }

    case 'heatmap': {
      const xField     = cfg.xField     ?? columns[0]
      const yField     = cfg.yField     ?? columns[1]
      const valueField = cfg.valueField ?? columns[2]
      const xs = Array.from(new Set(rows.map(r => String(r[xField])))).slice(0, 12)
      const ys = Array.from(new Set(rows.map(r => String(r[yField])))).slice(0, 8)
      const vals = rows.map(r => Number(r[valueField] ?? 0))
      const minV = Math.min(...vals, 0), maxV = Math.max(...vals, 1)
      const cellMap = new Map(rows.map(r => [`${r[xField]}__${r[yField]}`, Number(r[valueField] ?? 0)]))

      return (
        <div className={styles.heatmapChart}>
          <div className={styles.heatmapGrid} style={{ gridTemplateColumns: `auto repeat(${xs.length}, 1fr)` }}>
            <div />
            {xs.map(x => <span key={`hx-${x}`} className={styles.heatmapLabel}>{x.slice(0, 5)}</span>)}
            {ys.map(y => (
              <span key={`y-${y}`} style={{ display: 'contents' }}>
                <span className={styles.heatmapLabel}>{y.slice(0, 6)}</span>
                {xs.map(x => {
                  const v = cellMap.get(`${x}__${y}`) ?? 0
                  const intensity = maxV > minV ? (v - minV) / (maxV - minV) : 0
                  return (
                    <div
                      key={`${x}-${y}`}
                      className={styles.heatmapCell}
                      style={{ background: `rgba(59,130,246,${0.1 + intensity * 0.85})` }}
                      title={`${x} × ${y}: ${formatNumber(v)}`}
                    />
                  )
                })}
              </span>
            ))}
          </div>
        </div>
      )
    }

    default:
      return (
        <div className={styles.errorState}>
          Widget tipo <code>{widget.type}</code> no implementado aún
        </div>
      )
  }
}
