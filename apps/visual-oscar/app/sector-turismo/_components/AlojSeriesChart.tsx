'use client'
/**
 * <AlojSeriesChart /> · Turismo v3 · Sprint T5
 *
 * Series por tipo de alojamiento:
 *   1) Pernoctaciones por tipo · líneas múltiples (recharts). Eje X = periodo
 *      mensual común (unión de periodos de los 4 tipos); cada tipo su color.
 *   2) Grado de ocupación % por tipo · barras comparadas del ÚLTIMO mes (el
 *      endpoint da el grado como escalar por tipo, no como serie; lo decimos en
 *      el subtítulo y comparamos el dato vigente de los 4 tipos).
 *
 * Degradación honesta: si ningún tipo trae serie/grado → empty-state. Líneas con
 * connectNulls para huecos puntuales. Cero emojis · es-ES.
 */
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { type OcupacionTipo, TIPO_COLOR, fmtNum, fmtPct, fmtPeriod, AlojEmpty } from './AlojShared'

const ORDER = ['hoteles', 'apartamentos', 'campings', 'rural']

/** Fila pivotada: periodo + una clave por tipo con su valor de pernoctaciones. */
type PivotRow = { period: string } & { [tipo: string]: number | null | string }

/** Pivota las series de pernoctaciones en filas por periodo para recharts. */
function pivotPernoct(tipos: OcupacionTipo[]): PivotRow[] {
  const rows: Record<string, PivotRow> = {}
  for (const t of tipos) {
    for (const p of t.serie_pernoctaciones || []) {
      if (!rows[p.period]) rows[p.period] = { period: p.period }
      rows[p.period][t.tipo] = p.value
    }
  }
  return Object.values(rows).sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0))
}

export function AlojSeriesChart({ tipos }: { tipos: OcupacionTipo[] }) {
  const ordered = useMemo(() => [...tipos].sort((a, b) => ORDER.indexOf(a.tipo) - ORDER.indexOf(b.tipo)), [tipos])

  const pernoctRows = useMemo(() => pivotPernoct(ordered), [ordered])
  const tiposConSerie = useMemo(
    () => ordered.filter((t) => (t.serie_pernoctaciones || []).some((p) => p.value != null)),
    [ordered],
  )

  const ocupBars = useMemo(
    () =>
      ordered
        .filter((t) => t.grado_ocupacion_pct != null)
        .map((t) => ({ tipo: t.tipo, label: t.label, pct: t.grado_ocupacion_pct as number, period: t.last_period })),
    [ordered],
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
      {/* ── Pernoctaciones por tipo · líneas múltiples ── */}
      <div>
        <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 8 }}>
          Pernoctaciones mensuales · una línea por tipo de alojamiento
        </div>
        {tiposConSerie.length === 0 || pernoctRows.length < 2 ? (
          <AlojEmpty>Sin series de pernoctaciones disponibles en este momento.</AlojEmpty>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={pernoctRows} margin={{ top: 8, right: 12, bottom: 0, left: 6 }}>
              <CartesianGrid stroke="#F5F5F7" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 9.5, fill: '#86868b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtPeriod}
                minTickGap={28}
              />
              <YAxis
                tick={{ fontSize: 9.5, fill: '#86868b' }}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v) => (Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : Math.abs(v) >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : String(v))}
              />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                formatter={(value: number, name: string) => [`${fmtNum(value)} pernoct.`, ordered.find((t) => t.tipo === name)?.label ?? name]}
                labelFormatter={(l) => fmtPeriod(String(l))}
              />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} formatter={(value) => ordered.find((t) => t.tipo === value)?.label ?? value} />
              {tiposConSerie.map((t) => (
                <Line
                  key={t.tipo}
                  type="monotone"
                  dataKey={t.tipo}
                  stroke={TIPO_COLOR[t.tipo] ?? '#9CA3AF'}
                  strokeWidth={t.tipo === 'hoteles' ? 2.4 : 1.6}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Grado de ocupación % por tipo · barras (último mes) ── */}
      <div>
        <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 8 }}>
          Grado de ocupación · % del último mes por tipo
        </div>
        {ocupBars.length === 0 ? (
          <AlojEmpty>Sin grado de ocupación disponible por tipo.</AlojEmpty>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={228}>
              <BarChart data={ocupBars} margin={{ top: 8, right: 10, bottom: 0, left: 0 }} layout="vertical">
                <CartesianGrid stroke="#F5F5F7" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9.5, fill: '#86868b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#3a3a3d' }} tickLine={false} axisLine={false} width={120} />
                <Tooltip
                  cursor={{ fill: 'rgba(14,165,233,0.06)' }}
                  contentStyle={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  formatter={(value: number) => [fmtPct(value), 'Ocupación']}
                  labelFormatter={(l) => String(l)}
                />
                <Bar dataKey="pct" radius={[0, 5, 5, 0]} maxBarSize={26} isAnimationActive={false}>
                  {ocupBars.map((b) => (
                    <Cell key={b.tipo} fill={TIPO_COLOR[b.tipo] ?? '#9CA3AF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 4 }}>
              Valor vigente, no serie · periodo más reciente por tipo (INE no publica el grado mensual como serie en este corte).
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AlojSeriesChart
