'use client'
/**
 * `<IndicatorDrill />` · Contenido completo del drawer cuando el analista
 * pincha un KPI macro. Muestra:
 *   - Serie histórica completa (line chart con axes)
 *   - Forecast IMF si disponible
 *   - Tabla de valores ordenados
 *   - Comparativa peers UE (barras horizontales)
 *   - Lectura de tendencia auto
 */
import { DeepLineChart } from './DeepLineChart'
import { TrendNarrative } from './TrendNarrative'
import { CountryCompareBars } from './CountryCompareBars'

interface Props {
  label: string
  unit?: string
  decimals?: number
  series: { period: string; value: number | null }[]
  forecast?: { period: string; value: number | null }[]
  sourceCode: string
  sourceName: string
  imfCompareIndicator?: string  // si IMF, código para CountryCompareBars
  threshold?: { amber?: number; red?: number; goodAbove?: boolean }
  accent?: string
}

export function IndicatorDrill({
  label,
  unit = '%',
  decimals = 1,
  series,
  forecast,
  sourceCode,
  sourceName,
  imfCompareIndicator,
  threshold,
  accent = '#0f766e',
}: Props) {
  const valid = (series || []).filter((p) => p.value != null && Number.isFinite(p.value))
  const last = valid[valid.length - 1]
  const fcSeries = (forecast || []).filter((p) => p.value != null && Number.isFinite(p.value))

  // Tabla de últimos N
  const tableRows = [...valid].slice(-12).reverse()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header>
        <p style={{ fontSize: 10, color: accent, margin: 0, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          {sourceName} · {sourceCode}
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>
          {last
            ? `${last.value! > 0 && unit === '%' ? '+' : ''}${last.value!.toFixed(decimals)}${unit}`
            : '—'}
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginLeft: 10 }}>
            {last?.period}
          </span>
        </h2>
      </header>

      {/* Chart histórico + forecast */}
      {valid.length > 1 && (
        <section>
          <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 6px', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Serie histórica completa {fcSeries.length > 0 && '+ forecast'}
          </p>
          <DeepLineChart
            series={[
              {
                id: 'hist',
                label,
                color: accent,
                points: valid.map((p) => ({ period: p.period, value: p.value })),
                fillBelow: true,
              },
              ...(fcSeries.length > 0 ? [{
                id: 'fc',
                label: 'Forecast IMF',
                color: '#7c3aed',
                points: fcSeries.map((p) => ({ period: p.period, value: p.value })),
                dashed: true,
              }] : []),
            ]}
            height={200}
            yLabel={unit === '%' ? `${label} (%)` : label}
            zeroLine={unit === '%'}
            formatValue={(v) => `${v.toFixed(decimals)}${unit}`}
          />
        </section>
      )}

      {/* Lectura de tendencia */}
      <TrendNarrative
        label={label}
        unit={unit}
        decimals={decimals}
        series={valid as any}
        forecast={fcSeries as any}
        threshold={threshold}
        accent={accent}
      />

      {/* Comparativa peers si IMF */}
      {imfCompareIndicator && (
        <section>
          <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 6px', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Comparativa peers UE
          </p>
          <CountryCompareBars
            indicator={imfCompareIndicator}
            unit={unit}
            decimals={decimals}
            spainColor={accent}
          />
        </section>
      )}

      {/* Tabla últimos 12 valores */}
      {tableRows.length > 0 && (
        <section>
          <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 6px', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Últimos 12 valores
          </p>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b' }}>Periodo</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b' }}>Valor</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b' }}>Δ período</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((p, i) => {
                const nxt = tableRows[i + 1]
                const delta = nxt && nxt.value != null ? p.value! - nxt.value : null
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '5px 8px', color: '#0f172a' }}>{p.period}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {p.value! > 0 && unit === '%' ? '+' : ''}{p.value!.toFixed(decimals)}{unit}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: delta == null ? '#cbd5e1' : delta >= 0 ? '#16a34a' : '#dc2626' }}>
                      {delta != null ? `${delta >= 0 ? '+' : ''}${delta.toFixed(decimals)}${unit}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>
        Fuente · {sourceName} · código {sourceCode} · datos en vivo
      </p>
    </div>
  )
}

export default IndicatorDrill
