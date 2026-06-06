'use client'
/**
 * <DemandaGastoPanel /> · Turismo v3 · Sprint T4
 *
 * Gasto turístico internacional (INE EGATUR): las 4 métricas que pidió el
 * propietario, cada una con su KPI (valor + YoY) y serie temporal:
 *   - gasto_total          (M€)
 *   - gasto_medio_persona  (€/turista por viaje)
 *   - gasto_medio_diario   (€/día)
 *   - estancia_media       (noches)
 *
 * Una fila de 4 tarjetas-KPI (clic = selecciona la serie) + un LineChart
 * recharts de la métrica seleccionada. Degradación honesta: métricas null →
 * '—', serie vacía → nota. Cero emojis.
 */
import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { EgaturData, EgaturMetric } from './shared/demandaUtils'
import { fmtNum, fmtPct, periodTick, TOOLTIP_STYLE } from './shared/demandaUtils'

interface Props {
  data: EgaturData
}

type MetricKey = 'gasto_total' | 'gasto_medio_persona' | 'gasto_medio_diario' | 'estancia_media'

interface MetricMeta {
  key: MetricKey
  label: string
  color: string
  /** Decimales para el KPI. */
  kpiDecimals: number
}

const METRICS: MetricMeta[] = [
  { key: 'gasto_total', label: 'Gasto total', color: '#0EA5E9', kpiDecimals: 0 },
  { key: 'gasto_medio_persona', label: 'Gasto medio por turista', color: '#7C3AED', kpiDecimals: 0 },
  { key: 'gasto_medio_diario', label: 'Gasto medio diario', color: '#0891B2', kpiDecimals: 0 },
  { key: 'estancia_media', label: 'Estancia media', color: '#D97706', kpiDecimals: 2 },
]

/** Valor del KPI compactado por unidad (M€ con miles, resto entero). */
function kpiValue(m: EgaturMetric, decimals: number): string {
  const v = m.last?.value
  if (v == null) return '—'
  return v.toLocaleString('es-ES', { maximumFractionDigits: decimals })
}

export function DemandaGastoPanel({ data }: Props) {
  const [sel, setSel] = useState<MetricKey>('gasto_total')

  const metricsWithMeta = useMemo(
    () => METRICS.map((meta) => ({ meta, metric: data[meta.key] })),
    [data],
  )

  const active = data[sel]
  const activeMeta = METRICS.find((m) => m.key === sel) ?? METRICS[0]

  const chartData = useMemo(
    () => active.serie.filter((p) => p.value != null).map((p) => ({ period: p.period, value: p.value })),
    [active],
  )

  return (
    <div>
      {/* KPIs · clic selecciona la serie */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {metricsWithMeta.map(({ meta, metric }) => {
          const selected = meta.key === sel
          const yoy = metric.yoy_pct
          const yoyClr = yoy == null ? '#86868b' : yoy >= 0 ? '#15803D' : '#DC2626'
          return (
            <button
              key={meta.key}
              onClick={() => setSel(meta.key)}
              aria-pressed={selected}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                background: selected ? '#F5F8FC' : '#FAFAFA',
                border: `1px solid ${selected ? meta.color : '#ECECEF'}`,
                borderRadius: 12,
                padding: '12px 14px',
                transition: 'border-color 150ms ease, background 150ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: meta.color, display: 'inline-block' }} />
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6e6e73' }}>
                  {meta.label}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#1d1d1f', lineHeight: 1.05 }}>
                {kpiValue(metric, meta.kpiDecimals)}
                <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 5, opacity: 0.7 }}>{metric.unit}</span>
              </div>
              <div style={{ fontSize: 10.5, marginTop: 3, color: yoyClr, fontWeight: 700 }}>
                {fmtPct(yoy)} <span style={{ color: '#9CA3AF', fontWeight: 500 }}>interanual</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Serie de la métrica seleccionada */}
      <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 8 }}>
        {activeMeta.label} · serie {data.last_period ? `(último: ${data.last_period})` : ''} · {active.unit}
      </div>
      {chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#F5F5F7" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10, fill: '#86868b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={periodTick}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#86868b' }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v) => fmtNum(v, activeMeta.kpiDecimals)}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number) => [`${fmtNum(value, activeMeta.kpiDecimals)} ${active.unit}`, activeMeta.label]}
              labelFormatter={(p) => String(p)}
            />
            <Line type="monotone" dataKey="value" stroke={activeMeta.color} strokeWidth={2.4} dot={{ r: 2.5 }} activeDot={{ r: 4.5 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p style={{ fontSize: 12, color: '#86868b', margin: '12px 0' }}>
          Serie no disponible para esta métrica.
        </p>
      )}
    </div>
  )
}

export default DemandaGastoPanel
