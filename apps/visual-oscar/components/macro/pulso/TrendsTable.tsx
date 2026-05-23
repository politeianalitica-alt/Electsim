'use client'
/**
 * `<TrendsTable />` · Sprint N5.
 *
 * Tabla compacta escaneable con todos los indicadores del subtab.
 * Para cada indicador muestra:
 *  - shortLabel + unit + family
 *  - último valor y periodo
 *  - variación vs valor anterior (Δ y %)
 *  - variación YoY si hay datos suficientes
 *  - estado vs umbral (semáforo verde/amber/rojo)
 *  - sparkline horizontal del histórico (últimos N puntos)
 *
 * Diseñada para densidad informativa máxima · una sola página = todo el catálogo.
 */
import { useMemo } from 'react'
import Link from 'next/link'
import { FAMILY_META } from '@/lib/macro/subtab-registry'
import type { PulsoIndicatorMeta } from '@/lib/macro/pulso-indicators'
import type { PulsoFetchResult, PulsoPoint } from '@/lib/macro/pulso-fetcher'

interface Props {
  indicators: PulsoIndicatorMeta[]
  byId: Record<string, PulsoFetchResult>
  accent: string
  subtabSlug: string
}

function pctChange(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null
  return ((curr - prev) / Math.abs(prev)) * 100
}

function statusForValue(v: number | null, threshold?: PulsoIndicatorMeta['threshold']): 'green' | 'amber' | 'red' | 'na' {
  if (v == null || !threshold) return 'na'
  const { amber, red, goodAbove } = threshold
  if (goodAbove) {
    if (red != null && v < red) return 'red'
    if (amber != null && v < amber) return 'amber'
    return 'green'
  }
  if (red != null && v > red) return 'red'
  if (amber != null && v > amber) return 'amber'
  return 'green'
}

const STATUS_COLORS = {
  green: { bg: '#dcfce7', fg: '#166534', dot: '#22c55e' },
  amber: { bg: '#fef3c7', fg: '#92400e', dot: '#f59e0b' },
  red:   { bg: '#fee2e2', fg: '#991b1b', dot: '#ef4444' },
  na:    { bg: '#f1f5f9', fg: '#64748b', dot: '#94a3b8' },
} as const

/** Mini-sparkline SVG · normaliza serie 0-100 sobre su rango propio */
function Sparkline({ points, color }: { points: PulsoPoint[]; color: string }) {
  const valid = points.filter((p) => p.value != null) as { period: string; value: number }[]
  if (valid.length < 2) return <span style={{ fontSize: 9, color: '#cbd5e1' }}>—</span>
  const slice = valid.slice(-24)
  const values = slice.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 80
  const h = 18
  const stepX = w / Math.max(1, slice.length - 1)
  const pts = slice.map((p, i) => {
    const x = i * stepX
    const y = h - ((p.value - min) / range) * (h - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function TrendsTable({ indicators, byId, accent, subtabSlug }: Props) {
  const rows = useMemo(() => {
    return indicators.map((meta) => {
      const result = byId[meta.id]
      const series = result?.series || []
      const last = result?.last || null
      const prevIdx = series.length >= 2 ? series.length - 2 : -1
      const prev = prevIdx >= 0 ? series[prevIdx] : null

      // YoY: buscar punto del mismo periodo año anterior (heurística simple por índice)
      let yoy: number | null = null
      if (last) {
        // Para series mensuales 12 puntos atrás; trimestrales 4
        const cadence = meta.frequency || 'quarterly'
        const lag = cadence === 'monthly' ? 12 : cadence === 'quarterly' ? 4 : 1
        const yoyIdx = series.length - 1 - lag
        if (yoyIdx >= 0) {
          const yoyPoint = series[yoyIdx]
          if (yoyPoint?.value != null && last.value != null) {
            yoy = pctChange(last.value, yoyPoint.value)
          }
        }
      }

      return {
        id: meta.id,
        label: meta.shortLabel || meta.label,
        family: meta.family,
        unit: meta.unit,
        source: meta.source,
        last,
        prev,
        deltaPct: last && prev ? pctChange(last.value, prev.value) : null,
        yoy,
        status: statusForValue(last?.value ?? null, meta.threshold),
        series,
      }
    })
  }, [indicators, byId])

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${accent}`, borderRadius: 10, padding: 16 }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: accent, textTransform: 'uppercase' }}>
        Matriz de tendencias · {rows.length} indicadores · escaneable de un vistazo
      </p>
      <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#94a3b8' }}>
        Último valor · variación vs periodo anterior · YoY · estado vs umbral · sparkline. Click en cualquier fila → detalle.
      </p>
      <div style={{ marginTop: 14, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontVariantNumeric: 'tabular-nums' as any }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
              <th style={{ padding: '8px 8px', fontWeight: 700, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>Indicador</th>
              <th style={{ padding: '8px 8px', fontWeight: 700, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>Familia</th>
              <th style={{ padding: '8px 8px', fontWeight: 700, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'right' }}>Último</th>
              <th style={{ padding: '8px 8px', fontWeight: 700, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'right' }}>Δ vs ant.</th>
              <th style={{ padding: '8px 8px', fontWeight: 700, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'right' }}>YoY</th>
              <th style={{ padding: '8px 8px', fontWeight: 700, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '8px 8px', fontWeight: 700, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>Tendencia</th>
              <th style={{ padding: '8px 8px', fontWeight: 700, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>Fuente</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const statusCfg = STATUS_COLORS[r.status]
              return (
                <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 8px' }}>
                    <Link href={`/macro/${subtabSlug}/indicator/${r.id}`} style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}>
                      {r.label}
                    </Link>
                    {r.last?.period && <span style={{ display: 'block', fontSize: 9, color: '#94a3b8', fontWeight: 400 }}>{r.last.period}</span>}
                  </td>
                  <td style={{ padding: '8px 8px', color: '#64748b', fontSize: 10 }}>
                    {FAMILY_META[r.family as keyof typeof FAMILY_META]?.label || r.family}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    {r.last?.value != null
                      ? r.last.value.toLocaleString('es-ES', { maximumFractionDigits: 2 })
                      : '—'}
                    <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 400, marginLeft: 2 }}>{r.unit}</span>
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: r.deltaPct == null ? '#94a3b8' : r.deltaPct > 0 ? '#16a34a' : r.deltaPct < 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                    {r.deltaPct == null ? '—' : `${r.deltaPct > 0 ? '+' : ''}${r.deltaPct.toFixed(2)}%`}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: r.yoy == null ? '#94a3b8' : r.yoy > 0 ? '#16a34a' : r.yoy < 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                    {r.yoy == null ? '—' : `${r.yoy > 0 ? '+' : ''}${r.yoy.toFixed(1)}%`}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: statusCfg.bg, color: statusCfg.fg }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: statusCfg.dot, marginRight: 4, verticalAlign: 'middle' }} />
                      {r.status === 'na' ? 'N/D' : r.status === 'green' ? 'OK' : r.status === 'amber' ? 'Alerta' : 'Crítico'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 8px' }}>
                    <Sparkline points={r.series} color={statusCfg.dot} />
                  </td>
                  <td style={{ padding: '8px 8px', color: '#64748b', fontSize: 10 }}>{r.source}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default TrendsTable
