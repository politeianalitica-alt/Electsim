'use client'
/**
 * <VisionTComparativaUe /> · Turismo v3 · Sprint T3 (Visión Global)
 *
 * Benchmark europeo en barras: España frente a Francia / Italia / Portugal y la
 * UE-27. Es un SNAPSHOT comparativo de cabecera, NO un explorador: deja claro
 * dónde está España en pernoctaciones, llegadas y peso del turismo en el PIB.
 * El detalle país a país (series, drill) no corresponde a esta vista.
 *
 * Consume `/api/turismo/comparativa-ue` (envelope `{ok,data,...}`):
 *   data.paises = [{ pais, es_ue, pernoctaciones, llegadas, pib_turistico_pct }]
 *
 * Tres métricas con selector compacto (pernoctaciones · llegadas · %PIB). No
 * hace fetch: recibe `data` ya resuelto por la vista padre. Degradación honesta
 * (CLAUDE.md): una métrica sin dato en ningún país → se deshabilita su pestaña;
 * país sin valor → barra vacía '—'. España se resalta. Cero emojis.
 */
import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface ComparativaPais {
  pais: string
  es_ue?: boolean
  pernoctaciones: number | null
  llegadas: number | null
  pib_turistico_pct: number | null
}
export interface ComparativaPayload {
  paises: ComparativaPais[]
  year_pernoctaciones?: number | null
  year_pib?: number | null
}

interface Props {
  data: ComparativaPayload | null
  accent?: string
  loading?: boolean
}

type Metric = 'pernoctaciones' | 'llegadas' | 'pib_turistico_pct'

const METRICS: { id: Metric; label: string; unit: string; fmt: (n: number) => string }[] = [
  { id: 'pernoctaciones', label: 'Pernoctaciones', unit: 'millones', fmt: (n) => (n / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 0 }) },
  { id: 'llegadas', label: 'Llegadas', unit: 'millones', fmt: (n) => (n / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 0 }) },
  { id: 'pib_turistico_pct', label: '% PIB turístico', unit: '% del PIB', fmt: (n) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 }) },
]

const ES_COLOR = '#0EA5E9'
const UE_COLOR = '#94A3B8'
const OTHER_COLOR = '#CBD5E1'

export function VisionTComparativaUe({ data, accent = '#0EA5E9', loading = false }: Props) {
  const paises = data?.paises ?? []
  const [metric, setMetric] = useState<Metric>('pernoctaciones')

  // Una métrica solo es seleccionable si algún país trae valor.
  const enabled = useMemo(() => {
    const e: Record<Metric, boolean> = { pernoctaciones: false, llegadas: false, pib_turistico_pct: false }
    for (const p of paises) {
      if (p.pernoctaciones != null) e.pernoctaciones = true
      if (p.llegadas != null) e.llegadas = true
      if (p.pib_turistico_pct != null) e.pib_turistico_pct = true
    }
    return e
  }, [paises])

  const active = enabled[metric] ? metric : (METRICS.find((m) => enabled[m.id])?.id ?? metric)
  const meta = METRICS.find((m) => m.id === active)!

  const rows = paises
    .map((p) => ({
      pais: p.pais === 'España' ? 'España' : p.pais.replace('UE-27', 'UE-27'),
      raw: p[active] as number | null,
      esUe: !!p.es_ue,
      esEs: p.pais === 'España',
    }))
    .filter((r) => r.raw != null) as { pais: string; raw: number; esUe: boolean; esEs: boolean }[]

  const year = active === 'pib_turistico_pct' ? data?.year_pib : data?.year_pernoctaciones

  return (
    <div>
      {/* Selector de métrica */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {METRICS.map((m) => {
          const on = m.id === active
          const dis = !enabled[m.id]
          return (
            <button
              key={m.id}
              onClick={() => !dis && setMetric(m.id)}
              disabled={dis}
              style={{
                border: '1px solid',
                borderColor: on ? accent : '#ECECEF',
                background: on ? accent : '#fff',
                color: on ? '#fff' : dis ? '#C0C0C5' : '#1d1d1f',
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: dis ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ height: 200, background: 'rgba(0,0,0,0.04)', borderRadius: 10 }} />
      ) : rows.length === 0 ? (
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 12 }}>
          Comparativa UE no disponible ahora.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 38)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="pais" tick={{ fontSize: 11, fontWeight: 600, fill: '#1d1d1f' }} axisLine={false} tickLine={false} width={72} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #ECECEF' }}
              formatter={(v: number) => [`${meta.fmt(v)} ${meta.unit}`, meta.label]}
            />
            <Bar dataKey="raw" radius={[0, 4, 4, 0]} maxBarSize={26}>
              {rows.map((r, i) => (
                <Cell key={i} fill={r.esEs ? ES_COLOR : r.esUe ? UE_COLOR : OTHER_COLOR} />
              ))}
              <LabelList dataKey="raw" position="right" formatter={(v: number) => meta.fmt(v)} style={{ fontSize: 10, fontWeight: 700, fill: '#3a3a3d' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      <p style={{ margin: '8px 0 0', fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.5 }}>
        {meta.label} ({meta.unit}){year ? ` · ${year}` : ''} · Eurostat (tour_occ_ninat / tour_occ_arnat / bop_its6_det ÷ nama_10_gdp).
        España resaltada en azul; la UE-27 es la referencia agregada (gris).
      </p>
    </div>
  )
}

export default VisionTComparativaUe
