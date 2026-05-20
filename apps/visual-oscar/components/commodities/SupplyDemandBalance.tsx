'use client'

import { useMemo } from 'react'
import type { SDBalance } from '@/data/supply-demand-fixture'

interface Props {
  data: SDBalance
}

export function SupplyDemandBalance({ data }: Props) {
  const max = useMemo(
    () => Math.max(...data.years.flatMap((y) => [y.produccion, y.consumo])) * 1.1,
    [data],
  )
  const maxStock = useMemo(() => Math.max(...data.years.map((y) => y.stocks_finales)) * 1.1, [data])

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <tr>
            <th style={th}>Año</th>
            <th style={th}>Producción</th>
            <th style={th}>Consumo</th>
            <th style={th}>Stocks finales</th>
            <th style={th}>Exportaciones</th>
            <th style={th}>Balance</th>
            <th style={th}>S/U%</th>
          </tr>
        </thead>
        <tbody>
          {data.years.map((y) => {
            const balance = y.produccion - y.consumo
            const stockToUse = (y.stocks_finales / y.consumo) * 100
            const tight = stockToUse < 20
            return (
              <tr key={y.year} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>
                  <strong>{y.year}</strong>
                </td>
                <td style={td}>
                  <BarCell value={y.produccion} max={max} color="#22c55e" />
                </td>
                <td style={td}>
                  <BarCell value={y.consumo} max={max} color="#3b82f6" />
                </td>
                <td style={td}>
                  <BarCell value={y.stocks_finales} max={maxStock} color={tight ? '#dc2626' : '#f59e0b'} />
                </td>
                <td style={td}>{y.exportaciones.toLocaleString('es-ES')}</td>
                <td style={{ ...td, color: balance >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                  {balance > 0 ? '+' : ''}
                  {balance.toLocaleString('es-ES')}
                </td>
                <td style={{ ...td, color: tight ? '#dc2626' : '#374151', fontWeight: tight ? 700 : 400 }}>
                  {stockToUse.toFixed(1)}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
        Unidades: {data.unit}. S/U% = Stocks finales / Consumo. Rojo = umbral crítico &lt; 20%.
      </p>
    </div>
  )
}

function BarCell({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 14, background: '#f3f4f6', borderRadius: 3, position: 'relative' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ width: 60, textAlign: 'right' }}>{value.toLocaleString('es-ES')}</span>
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', color: '#374151', fontWeight: 700 }
const td: React.CSSProperties = { padding: '8px 10px', color: '#374151' }
