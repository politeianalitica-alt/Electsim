'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, Legend,
} from 'recharts'

const FASE_ESTADO_COLOR: Record<string, string> = {
  completada:  '#16A34A',
  en_curso:    '#1F4E8C',
  planificada: '#93C5FD',
  retrasada:   '#DC2626',
  cancelada:   '#D1D5DB',
}

interface Fase {
  id: string; nombre: string; inicio: number; fin: number
  estado: string; descripcion?: string; coste_M?: number
}

interface Props {
  nombre: string
  fases: Fase[]
  inicio: number
  fin_previsto: number
}

export function ProgramGantt({ nombre, fases, inicio, fin_previsto }: Props) {
  const now = new Date().getFullYear()

  // Transformar fases en datos para Recharts Gantt (bar horizontal trick)
  const data = fases.map(f => ({
    name: f.nombre,
    offset: f.inicio - inicio,       // desde el inicio del programa
    duration: f.fin - f.inicio,
    inicio: f.inicio,
    fin: f.fin,
    estado: f.estado,
    coste_M: f.coste_M,
  }))

  const totalYears = fin_previsto - inicio
  const ticks = Array.from({ length: Math.ceil(totalYears / 2) + 1 }, (_, i) => i * 2)

  return (
    <div style={{ width: '100%' }}>
      <p style={{ fontSize: 10.5, color: '#86868b', margin: '0 0 10px' }}>
        {nombre} · {inicio}–{fin_previsto} · {fases.length} fases
      </p>
      <ResponsiveContainer width="100%" height={Math.max(160, fases.length * 44)}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 24, bottom: 0, left: 0 }}
          barCategoryGap={8}
        >
          <CartesianGrid stroke="#F5F5F7" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, totalYears]}
            ticks={ticks}
            tickFormatter={v => String(inicio + v)}
            tick={{ fontSize: 10, fill: '#86868b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 10.5, fill: '#3a3a3d' }}
            tickLine={false}
            axisLine={false}
          />
          {/* Línea del año actual */}
          <ReferenceLine
            x={now - inicio}
            stroke="#DC2626"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: 'Hoy', position: 'top', fontSize: 9, fill: '#DC2626', fontWeight: 700 }}
          />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 10, fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            formatter={(_v, _n, props) => [
              `${props.payload.inicio}–${props.payload.fin}${
                props.payload.coste_M ? ` · ${props.payload.coste_M >= 1000 ? (props.payload.coste_M/1000).toFixed(1)+'b€' : props.payload.coste_M+'M€'}` : ''
              }`,
              'Fase',
            ]}
            labelFormatter={label => label}
          />
          {/* Barra invisible de offset (transparente) */}
          <Bar dataKey="offset" stackId="g" fill="transparent" radius={0} />
          {/* Barra de duración coloreada por estado */}
          <Bar dataKey="duration" stackId="g" radius={[4,4,4,4]} maxBarSize={28}>
            {data.map((entry, i) => (
              <Cell key={i} fill={FASE_ESTADO_COLOR[entry.estado] ?? '#93C5FD'} />
            ))}
          </Bar>
          <Legend
            payload={Object.entries(FASE_ESTADO_COLOR).map(([k,v]) => ({ value: k.replace('_',' '), type: 'square' as const, color: v, id: k }))}
            wrapperStyle={{ fontSize: 10, paddingTop: 10 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
