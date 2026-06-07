'use client'
/**
 * <OrgDistribucion /> · Tercer Sector v3 · TS4 (Organizaciones)
 *
 * Mini-gráficos de distribución del directorio (sobre el conjunto FILTRADO
 * completo, no solo la página visible):
 *   - Por tipo de entidad  · barras horizontales (recharts).
 *   - Por sector           · barras horizontales (top N, recharts).
 *   - Por CCAA de la sede  · barras horizontales (top N, recharts).
 * Un toggle permite ver «nº de entidades» o «ingresos agregados (M€)» — los
 * importes agregan solo entidades con ingreso publicado (honestidad con nulos).
 *
 * Recibe ya las filas filtradas (computadas por la vista con un fetch a pageSize
 * que cubre el catálogo) y deriva los conteos aquí. Cero emojis.
 */
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ACCENT,
  CAT_COLORS,
  ccaaLabel,
  fmtEur,
  fmtNum,
  OrgEmpty,
  sectorLabel,
  tipoLabel,
  type OrgRow,
} from './OrgShared'

type Metric = 'count' | 'ingresos'

interface Bucket {
  key: string
  label: string
  count: number
  ingresos: number
  /** Cuántas entidades del bucket tienen ingreso publicado. */
  conIngreso: number
}

/** Agrupa filas por una dimensión y agrega conteo + ingresos. */
function bucketize(
  rows: OrgRow[],
  dim: (o: OrgRow) => string | null | undefined,
  label: (k: string) => string,
): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const o of rows) {
    const k = dim(o)
    if (!k) continue
    const b = map.get(k) ?? { key: k, label: label(k), count: 0, ingresos: 0, conIngreso: 0 }
    b.count += 1
    if (typeof o.ingresos_eur === 'number' && Number.isFinite(o.ingresos_eur)) {
      b.ingresos += o.ingresos_eur
      b.conIngreso += 1
    }
    map.set(k, b)
  }
  return [...map.values()]
}

function sortBuckets(buckets: Bucket[], metric: Metric): Bucket[] {
  return [...buckets].sort((a, b) =>
    metric === 'ingresos' ? b.ingresos - a.ingresos : b.count - a.count || b.ingresos - a.ingresos,
  )
}

interface MiniProps {
  title: string
  buckets: Bucket[]
  metric: Metric
  /** Top N a mostrar (resto agrupado en «Otros»). */
  topN?: number
  height?: number
}

function MiniBarChart({ title, buckets, metric, topN, height = 220 }: MiniProps) {
  const data = useMemo(() => {
    const sorted = sortBuckets(buckets, metric)
    if (!topN || sorted.length <= topN) return sorted
    const head = sorted.slice(0, topN)
    const tail = sorted.slice(topN)
    const otros: Bucket = {
      key: '__otros__',
      label: `Otros (${tail.length})`,
      count: tail.reduce((s, b) => s + b.count, 0),
      ingresos: tail.reduce((s, b) => s + b.ingresos, 0),
      conIngreso: tail.reduce((s, b) => s + b.conIngreso, 0),
    }
    return [...head, otros]
  }, [buckets, metric, topN])

  const valueKey = metric === 'ingresos' ? 'ingresos' : 'count'
  // Para ingresos representamos en M€ para que las etiquetas quepan.
  const chartData = useMemo(
    () =>
      data.map((b, i) => ({
        ...b,
        value: metric === 'ingresos' ? b.ingresos / 1_000_000 : b.count,
        _color: b.key === '__otros__' ? '#CBD5E1' : CAT_COLORS[i % CAT_COLORS.length],
      })),
    [data, metric],
  )

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 12,
        padding: 14,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 800, color: '#1d1d1f', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 9.5, color: '#94a3b8', marginBottom: 8 }}>
        {metric === 'ingresos' ? 'Ingresos agregados (M€) · solo entidades con dato' : 'Nº de entidades'}
      </div>
      {chartData.length === 0 ? (
        <OrgEmpty>Sin datos para esta dimensión con los filtros actuales.</OrgEmpty>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(height, chartData.length * 26 + 24)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 2, right: 44, bottom: 2, left: 4 }}
            barCategoryGap={6}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 10, fill: '#475569' }}
              tickLine={false}
              axisLine={false}
              width={138}
            />
            <Tooltip
              cursor={{ fill: 'rgba(22,163,74,0.06)' }}
              contentStyle={{
                background: '#fff',
                border: '1px solid #ECECEF',
                borderRadius: 10,
                fontSize: 12,
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
              formatter={(_v: number, _n: string, p: { payload?: Bucket }) => {
                const b = p?.payload as Bucket | undefined
                if (!b) return ['', '']
                return [
                  metric === 'ingresos'
                    ? `${fmtEur(b.ingresos)} · ${b.conIngreso}/${b.count} con dato`
                    : `${fmtNum(b.count)} entidades · ${fmtEur(b.ingresos)} agregados`,
                  b.label,
                ]
              }}
            />
            <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={22} isAnimationActive={false}>
              {chartData.map((d) => (
                <Cell key={d.key} fill={d._color} />
              ))}
              <LabelList
                dataKey={valueKey}
                position="right"
                formatter={(v: number) =>
                  metric === 'ingresos' ? fmtEur(v) : fmtNum(v)
                }
                style={{ fontSize: 9.5, fill: '#64748b', fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

interface Props {
  /** Conjunto FILTRADO completo (no la página). */
  rows: OrgRow[]
  loading?: boolean
}

export function OrgDistribucion({ rows, loading }: Props) {
  const [metric, setMetric] = useState<Metric>('count')

  const porTipo = useMemo(() => bucketize(rows, (o) => o.tipo, tipoLabel), [rows])
  const porSector = useMemo(() => bucketize(rows, (o) => o.sector, sectorLabel), [rows])
  const porCcaa = useMemo(() => bucketize(rows, (o) => o.ccaa ?? null, (k) => ccaaLabel(k)), [rows])

  return (
    <section style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>
            Distribución del directorio
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#94a3b8' }}>
            Sobre el conjunto filtrado completo · por tipo, sector y CCAA de la sede
          </p>
        </div>
        <div style={{ display: 'inline-flex', gap: 2, background: '#F1F5F9', borderRadius: 8, padding: 2 }}>
          {(['count', 'ingresos'] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              aria-pressed={metric === m}
              style={{
                border: 'none',
                cursor: 'pointer',
                background: metric === m ? '#fff' : 'transparent',
                color: metric === m ? ACCENT : '#64748b',
                fontWeight: 700,
                fontSize: 11,
                padding: '5px 12px',
                borderRadius: 6,
                boxShadow: metric === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                fontFamily: 'inherit',
              }}
            >
              {m === 'count' ? 'Nº entidades' : 'Ingresos'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{ height: 240, background: '#fff', border: '1px solid #ECECEF', borderRadius: 12 }}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <MiniBarChart title="Por tipo de entidad" buckets={porTipo} metric={metric} topN={8} />
          <MiniBarChart title="Por sector de actividad" buckets={porSector} metric={metric} topN={10} />
          <MiniBarChart title="Por CCAA de la sede" buckets={porCcaa} metric={metric} topN={10} />
        </div>
      )}
    </section>
  )
}

export default OrgDistribucion
