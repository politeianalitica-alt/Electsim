'use client'
/**
 * <CoopPaisesRanking /> · Tercer Sector v3 · Sprint TS5
 *
 * Ranking de países RECEPTORES de la ayuda española declarada a IATI, en barras
 * horizontales (recharts). Acompaña al mapa coroplético (CoopWorldMap):
 *   - Cubre el 100% de los receptores aunque el geojson no pinte alguno.
 *   - Es la representación PRINCIPAL en pantallas estrechas / cuando el mapa no
 *     carga, y la base interactiva (clic en barra → filtra la vista por país).
 *
 * Recibe `FacetCount[]` del overview (code=ISO-2, name resuelto, count). El
 * `count` es nº de actividades (modo datastore). Cero emojis · es-ES.
 */
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FacetCount } from '@/lib/tercer-sector/iati-types'
import { ACCENT, ACCENT_DARK, CoopEmpty, fmtInt } from './CoopShared'

interface CoopPaisesRankingProps {
  countries: FacetCount[]
  selectedIso?: string | null
  onSelect?: (iso2: string, name: string) => void
  /** Cuántas barras mostrar (default 14). */
  top?: number
}

interface Row {
  iso: string
  name: string
  count: number
}

export function CoopPaisesRanking({ countries, selectedIso, onSelect, top = 14 }: CoopPaisesRankingProps) {
  const rows = useMemo<Row[]>(
    () =>
      [...countries]
        .filter((c) => c.code && c.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, top)
        .map((c) => ({ iso: c.code.toUpperCase(), name: c.name || c.code, count: c.count })),
    [countries, top],
  )

  if (rows.length === 0) {
    return <CoopEmpty>Sin desglose por país receptor. Requiere el Datastore (IATI_API_KEY).</CoopEmpty>
  }

  const sel = selectedIso?.toUpperCase() ?? null
  const height = Math.max(160, rows.length * 26 + 16)

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={132}
            tick={{ fontSize: 11, fill: '#475569' }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: 'rgba(22,163,74,0.06)' }}
            formatter={(v: number) => [`${fmtInt(v)} actividades`, 'Actividades']}
            labelStyle={{ fontWeight: 700, color: '#0F172A' }}
            contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
          />
          <Bar
            dataKey="count"
            radius={[0, 5, 5, 0]}
            label={{ position: 'right', fontSize: 10.5, fill: '#64748B', formatter: (v: number) => fmtInt(v) }}
            onClick={(d: { iso?: string; name?: string }) => {
              if (d?.iso && onSelect) onSelect(d.iso, d.name || d.iso)
            }}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
          >
            {rows.map((r) => (
              <Cell key={r.iso} fill={sel === r.iso ? ACCENT_DARK : ACCENT} fillOpacity={sel && sel !== r.iso ? 0.45 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CoopPaisesRanking
