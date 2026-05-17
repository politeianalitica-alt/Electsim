'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

interface WaterfallItem {
  iso3: string
  label: string
  value_usd_b: number | null
  delta_usd_m: number | null
  delta_pct: number | null
  highlighted: boolean
}

interface Props {
  items: WaterfallItem[]
  year: number
  prev_year: number
}

export function BudgetWaterfall({ items, year, prev_year }: Props) {
  const data = items.map(it => ({
    ...it,
    fill: it.highlighted
      ? '#1F4E8C'
      : (it.delta_pct ?? 0) >= 0 ? '#16A34A' : '#DC2626',
  }))

  return (
    <div style={{ width: '100%' }}>
      <p style={{ fontSize: 11, color: '#86868b', margin: '0 0 12px' }}>
        Variación del gasto militar {prev_year}→{year} (Δ% interanual)
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#F5F5F7" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#86868b' }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#86868b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
            width={40}
          />
          <ReferenceLine y={0} stroke="#DDDDE3" strokeWidth={1} />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid #ECECEF',
              borderRadius: 10,
              fontSize: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
            formatter={(value: number, _name: string, props) => [
              <span key="v">
                <strong>{value > 0 ? '+' : ''}{value}%</strong>
                {props.payload?.delta_usd_m != null && (
                  <span style={{ color: '#86868b', marginLeft: 6 }}>
                    ({props.payload.delta_usd_m > 0 ? '+' : ''}{props.payload.delta_usd_m.toLocaleString('es-ES')} M USD)
                  </span>
                )}
              </span>,
              'Variación YoY',
            ]}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="delta_pct" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} opacity={entry.highlighted ? 1 : 0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 6, textAlign: 'right' }}>
        Fuente: World Bank · MS.MIL.XPND.CD
      </div>
    </div>
  )
}
