'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'

interface Series {
  iso3: string
  label: string
  color: string
  data: Array<{ year: number; value: number | null }>
}

interface Props {
  series: Series[]
  from: number
  to: number
}

// Pivota las series en filas por año para Recharts
function pivot(series: Series[], from: number, to: number) {
  const rows: Record<number, Record<string, number | null> & { year: number }> = {}
  for (let y = from; y <= to; y++) rows[y] = { year: y }
  for (const s of series) {
    for (const pt of s.data) {
      if (rows[pt.year]) rows[pt.year][s.iso3] = pt.value
    }
  }
  return Object.values(rows).sort((a, b) => a.year - b.year)
}

export function BudgetTimeseriesChart({ series, from, to }: Props) {
  const data = pivot(series, from, to)

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#F5F5F7" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: '#86868b' }}
            tickLine={false}
            axisLine={false}
            interval={3}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#86868b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            width={32}
            domain={[0, 'auto']}
          />
          <ReferenceLine
            y={2}
            stroke="#DC2626"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: 'OTAN 2%', position: 'right', fontSize: 9, fill: '#DC2626', fontWeight: 700 }}
          />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid #ECECEF',
              borderRadius: 10,
              fontSize: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
            formatter={(value: number, name: string) => [
              `${value?.toFixed(2)}% PIB`,
              series.find(s => s.iso3 === name)?.label ?? name,
            ]}
            labelFormatter={(y) => `Año ${y}`}
          />
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            formatter={(value) => series.find(s => s.iso3 === value)?.label ?? value}
          />
          {series.map((s) => (
            <Line
              key={s.iso3}
              type="monotone"
              dataKey={s.iso3}
              stroke={s.color}
              strokeWidth={s.iso3 === 'ESP' ? 2.5 : 1.5}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 6, textAlign: 'right' }}>
        Fuente: World Bank · MS.MIL.XPND.GD.ZS
      </div>
    </div>
  )
}
