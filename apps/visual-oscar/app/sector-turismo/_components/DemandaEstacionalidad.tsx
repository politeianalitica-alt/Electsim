'use client'
/**
 * <DemandaEstacionalidad /> · Turismo v3 · Sprint T4
 *
 * Estacionalidad de la demanda turística: curva del índice mensual (media
 * anual = 100) con pico y valle resaltados. Si AEMET está disponible, superpone
 * la temperatura media mensual de la CCAA costera de referencia (eje derecho)
 * para mostrar la sincronía clima-demanda. Si no, omite la línea de clima con
 * nota honesta (clima_source).
 *
 * Recharts ComposedChart (barras = índice, línea = temperatura). Pico/valle
 * marcados con Cell de color y un par de chips resumen. Cero emojis.
 */
import { useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import type { EstacionalidadData } from './shared/demandaUtils'
import { TOOLTIP_STYLE } from './shared/demandaUtils'

interface Props {
  data: EstacionalidadData
}

const ACCENT = '#0EA5E9'
const PICO = '#DC2626'
const VALLE = '#3B82F6'
const TEMP = '#F59E0B'

export function DemandaEstacionalidad({ data }: Props) {
  const hasTemp = data.clima_source === 'aemet' && data.meses.some((m) => m.temp_media != null)

  const chartData = useMemo(
    () =>
      data.meses.map((m) => ({
        mes: m.mes_nombre.slice(0, 3),
        mesFull: m.mes_nombre,
        indice: m.indice_turismo,
        temp: m.temp_media ?? null,
        isPico: m.mes === data.pico.mes,
        isValle: m.mes === data.valle.mes,
      })),
    [data],
  )

  return (
    <div>
      {/* Chips resumen pico / valle / ratio */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <Chip label="Pico" value={`${data.pico.mes_nombre} · ${data.pico.indice_turismo}`} color={PICO} />
        <Chip label="Valle" value={`${data.valle.mes_nombre} · ${data.valle.indice_turismo}`} color={VALLE} />
        <Chip label="Ratio pico/valle" value={`${data.ratio_pico_valle.toLocaleString('es-ES', { maximumFractionDigits: 2 })}×`} color="#6e6e73" />
        {hasTemp && <Chip label="Clima" value={`Temperatura · ${data.ccaa_clima}`} color={TEMP} />}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 8, right: hasTemp ? 8 : 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#F5F5F7" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#86868b' }} tickLine={false} axisLine={false} interval={0} />
          <YAxis
            yAxisId="idx"
            tick={{ fontSize: 10, fill: '#86868b' }}
            tickLine={false}
            axisLine={false}
            width={34}
            domain={[0, 'auto']}
          />
          {hasTemp && (
            <YAxis
              yAxisId="temp"
              orientation="right"
              tick={{ fontSize: 10, fill: TEMP }}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(v) => `${v}º`}
              domain={['auto', 'auto']}
            />
          )}
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number, name: string) => {
              if (name === 'Temperatura') return [`${value}ºC`, name]
              return [`${value}`, 'Índice de demanda']
            }}
            labelFormatter={(_label, payload) => payload?.[0]?.payload?.mesFull ?? _label}
          />
          {hasTemp && <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
          <Bar yAxisId="idx" dataKey="indice" name="Índice de demanda" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.isPico ? PICO : d.isValle ? VALLE : ACCENT} opacity={d.isPico || d.isValle ? 1 : 0.78} />
            ))}
          </Bar>
          {hasTemp && (
            <Line yAxisId="temp" type="monotone" dataKey="temp" name="Temperatura" stroke={TEMP} strokeWidth={2.4} dot={{ r: 2.5 }} activeDot={{ r: 4.5 }} connectNulls />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <p style={{ fontSize: 10.5, color: '#86868b', marginTop: 10, lineHeight: 1.5 }}>
        Índice mensual de demanda (media anual = 100). {data.nota}
      </p>
    </div>
  )
}

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10, padding: '8px 12px', borderTop: `3px solid ${color}` }}>
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>{value}</span>
    </div>
  )
}

export default DemandaEstacionalidad
