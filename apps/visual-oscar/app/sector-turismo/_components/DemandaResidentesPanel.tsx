'use client'
/**
 * <DemandaResidentesPanel /> · Turismo v3 · Sprint T4
 *
 * Turismo de residentes (INE ETR/FAMILITUR · demanda doméstica):
 *   - Donut interno vs emisor (cuota de viajes del último periodo) + cifras de
 *     viajes / pernoctaciones / gasto / estancia media por destino.
 *   - Serie temporal trimestral de viajes y pernoctaciones (dos líneas).
 *
 * Complementa FRONTUR/EGATUR: aquí miramos a los RESIDENTES, no a los turistas
 * internacionales. Degradación honesta: destino sin dato → '—', serie vacía →
 * nota. Cero emojis.
 */
import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import type { ResidentesData, ResidentesDestino } from './shared/demandaUtils'
import { fmtNum, fmtMillones, periodTick, TOOLTIP_STYLE } from './shared/demandaUtils'

interface Props {
  data: ResidentesData
}

const COLOR_INTERNO = '#0EA5E9'
const COLOR_EMISOR = '#7C3AED'

/** Fila de detalle de un destino (interno/emisor). */
function DestinoStat({ titulo, color, d }: { titulo: string; color: string; d: ResidentesDestino }) {
  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10, padding: '12px 14px', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f' }}>{titulo}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>
          {d.cuota_pct != null ? `${d.cuota_pct}%` : '—'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 11 }}>
        <Kv k="Viajes" v={fmtNum(d.viajes)} />
        <Kv k="Pernoct." v={fmtNum(d.pernoctaciones)} />
        <Kv k="Estancia" v={d.duracion_media != null ? `${d.duracion_media.toLocaleString('es-ES', { maximumFractionDigits: 2 })} noches` : '—'} />
        <Kv k="Gasto" v={d.gasto_total != null ? `${fmtNum(d.gasto_total)} miles €` : '—'} />
      </div>
    </div>
  )
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ color: '#86868b', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{k}</span>
      <span style={{ color: '#1d1d1f', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{v}</span>
    </div>
  )
}

export function DemandaResidentesPanel({ data }: Props) {
  const interno = data.destino.interno
  const emisor = data.destino.emisor

  const pieData = useMemo(() => {
    const out: Array<{ name: string; value: number; color: string }> = []
    if (interno.viajes != null && interno.viajes > 0) out.push({ name: 'Interno (España)', value: interno.viajes, color: COLOR_INTERNO })
    if (emisor.viajes != null && emisor.viajes > 0) out.push({ name: 'Emisor (extranjero)', value: emisor.viajes, color: COLOR_EMISOR })
    return out
  }, [interno, emisor])

  // Serie combinada viajes + pernoctaciones por periodo.
  const serie = useMemo(() => {
    const byPeriod = new Map<string, { period: string; viajes: number | null; pernoctaciones: number | null }>()
    for (const p of data.serie_viajes) byPeriod.set(p.period, { period: p.period, viajes: p.value, pernoctaciones: null })
    for (const p of data.serie_pernoctaciones) {
      const e = byPeriod.get(p.period) ?? { period: p.period, viajes: null, pernoctaciones: null }
      e.pernoctaciones = p.value
      byPeriod.set(p.period, e)
    }
    return Array.from(byPeriod.values()).sort((a, b) => a.period.localeCompare(b.period))
  }, [data.serie_viajes, data.serie_pernoctaciones])

  const hasSerie = serie.filter((s) => s.viajes != null || s.pernoctaciones != null).length > 1

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 18 }}>
      {/* Columna izquierda: donut + detalle por destino */}
      <div>
        <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 8 }}>
          Reparto de viajes{data.last_period ? ` · ${data.last_period}` : ''} · interno vs emisor
        </div>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={74} paddingAngle={2} stroke="none">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number, name: string) => [`${fmtNum(value)} viajes`, name]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ fontSize: 12, color: '#86868b', margin: '8px 0' }}>Reparto interno/emisor no disponible.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          <DestinoStat titulo="Destino interno" color={COLOR_INTERNO} d={interno} />
          <DestinoStat titulo="Destino emisor" color={COLOR_EMISOR} d={emisor} />
        </div>
      </div>

      {/* Columna derecha: serie temporal viajes + pernoctaciones */}
      <div>
        <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 8 }}>
          Serie trimestral · viajes y pernoctaciones totales de residentes
        </div>
        {hasSerie ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={serie} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#F5F5F7" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#86868b' }} tickLine={false} axisLine={false} tickFormatter={periodTick} minTickGap={20} />
              <YAxis tick={{ fontSize: 10, fill: '#86868b' }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => fmtMillones(v, 0)} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number, name: string) => [fmtNum(value), name]}
                labelFormatter={(p) => String(p)}
              />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Line type="monotone" dataKey="viajes" name="Viajes" stroke={COLOR_INTERNO} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} connectNulls />
              <Line type="monotone" dataKey="pernoctaciones" name="Pernoctaciones" stroke={COLOR_EMISOR} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ fontSize: 12, color: '#86868b', margin: '12px 0' }}>Serie temporal de residentes no disponible.</p>
        )}
      </div>
    </div>
  )
}

export default DemandaResidentesPanel
