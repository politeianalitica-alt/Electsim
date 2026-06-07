'use client'
/**
 * <IatiSectoresChart /> · Tercer Sector v3 · Sprint TS5
 *
 * Distribución de la ayuda española declarada a IATI por SECTOR CAD/DAC, en
 * barras horizontales (recharts). Etiqueta cada código de 5 dígitos con su
 * nombre vía codelists IATI (keyless); cae al grupo de 3 dígitos o al código si
 * el codelist no lo trae. Clic en barra → filtra la vista por sector.
 *
 * Recibe `FacetCount[]` del overview (code = sector DAC, count = nº actividades)
 * + los codelists para resolver nombres. Cero emojis · es-ES.
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
import type { CodelistsData, FacetCount } from '@/lib/tercer-sector/iati-types'
import { ACCENT, ACCENT_DARK, CoopEmpty, fmtInt, sectorName } from './CoopShared'

interface IatiSectoresChartProps {
  sectors: FacetCount[]
  codelists: CodelistsData | null
  selectedSector?: string | null
  onSelect?: (code: string, name: string) => void
  top?: number
}

interface Row {
  code: string
  label: string
  count: number
}

export function IatiSectoresChart({ sectors, codelists, selectedSector, onSelect, top = 14 }: IatiSectoresChartProps) {
  const rows = useMemo<Row[]>(
    () =>
      [...sectors]
        .filter((s) => s.code && s.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, top)
        .map((s) => {
          // El overview ya resuelve `name` en modo datastore; si viene vacío o
          // igual al código, reintentamos con los codelists vivos.
          const resolved = s.name && s.name !== s.code ? s.name : sectorName(codelists, s.code)
          return { code: s.code, label: resolved, count: s.count }
        }),
    [sectors, codelists, top],
  )

  if (rows.length === 0) {
    return <CoopEmpty>Sin desglose por sector DAC. Requiere el Datastore (IATI_API_KEY).</CoopEmpty>
  }

  const sel = selectedSector ?? null
  const height = Math.max(160, rows.length * 26 + 16)

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={168}
            tick={{ fontSize: 11, fill: '#475569' }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: 'rgba(22,163,74,0.06)' }}
            formatter={(v: number) => [`${fmtInt(v)} actividades`, 'Actividades']}
            labelFormatter={(label: string, payload) => {
              const code = (payload?.[0]?.payload as Row | undefined)?.code
              return code ? `${label} · DAC ${code}` : label
            }}
            labelStyle={{ fontWeight: 700, color: '#0F172A' }}
            contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
          />
          <Bar
            dataKey="count"
            radius={[0, 5, 5, 0]}
            label={{ position: 'right', fontSize: 10.5, fill: '#64748B', formatter: (v: number) => fmtInt(v) }}
            onClick={(d: { code?: string; label?: string }) => {
              if (d?.code && onSelect) onSelect(d.code, d.label || d.code)
            }}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
          >
            {rows.map((r) => (
              <Cell key={r.code} fill={sel === r.code ? ACCENT_DARK : ACCENT} fillOpacity={sel && sel !== r.code ? 0.45 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default IatiSectoresChart
