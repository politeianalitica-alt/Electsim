'use client'
/**
 * <ConectAeropuertos /> · Turismo v3 · Sprint T8 (Conectividad)
 *
 * Tráfico aéreo de la red AENA: ranking de aeropuertos por pasajeros (barras
 * horizontales · recharts), % internacional por aeropuerto y total nacional del
 * conjunto mostrado. El ~80% de las llegadas internacionales (FRONTUR) entran
 * por avión, así que la conectividad aérea es el cuello de botella físico del
 * turismo receptor.
 *
 * No hace fetch: recibe `data` ya resuelto por <ConectividadView /> (un solo
 * Promise.all para toda la vista). Honra `source` ('live' = CSV abierto /
 * 'catalog' = curado+datado) de forma honesta (CLAUDE.md) tanto a nivel de
 * conjunto como por registro.
 *
 * ANTI-DUPLICACIÓN: la inversión / CAPEX de Aena y el detalle de infraestructura
 * aeroportuaria viven en /sector-infraestructuras. Aquí solo se enlaza, no se
 * replica.
 *
 * Cero emojis · Unicode geométrico (⟶ ◐ ◉).
 */
import { useMemo } from 'react'
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

const ACCENT = '#0EA5E9'

export interface AenaAirportRow {
  codigo: string
  aeropuerto: string
  pasajeros: number | null
  intl_pct?: number | null
  yoy_pct?: number | null
  ccaa?: string
  source: 'live' | 'catalog'
}

export interface AenaPayload {
  anio_ref: number | null
  aeropuertos: AenaAirportRow[]
  total_pasajeros: number | null
  source: 'live' | 'catalog'
  nota: string
}

interface Props {
  data: AenaPayload | null
  loading?: boolean
}

/** Pasajeros → millones, 1 decimal. */
function toM(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null
  return n / 1_000_000
}

export function ConectAeropuertos({ data, loading = false }: Props) {
  const airports = data?.aeropuertos ?? []
  const totalM = toM(data?.total_pasajeros)
  const isLive = data?.source === 'live'

  // Barras: top por pasajeros (vienen ya ordenados desc del cliente). Limitamos
  // a 14 para que las barras horizontales respiren; el resto cuenta en el total.
  const rows = useMemo(
    () =>
      airports
        .filter((a) => a.pasajeros != null)
        .slice(0, 14)
        .map((a) => ({
          name: a.codigo || a.aeropuerto.slice(0, 3).toUpperCase(),
          aeropuerto: a.aeropuerto,
          pax: toM(a.pasajeros) ?? 0,
          intl: a.intl_pct ?? null,
          ccaa: a.ccaa ?? '',
        })),
    [airports],
  )

  // Media ponderada de % internacional (sobre los aeropuertos con dato).
  const intlPctAgg = useMemo(() => {
    let num = 0
    let den = 0
    for (const a of airports) {
      if (a.pasajeros != null && a.intl_pct != null) {
        num += a.pasajeros * a.intl_pct
        den += a.pasajeros
      }
    }
    return den > 0 ? num / den : null
  }, [airports])

  if (loading) {
    return <div style={{ height: 360, background: 'rgba(0,0,0,0.04)', borderRadius: 10 }} />
  }
  if (rows.length === 0) {
    return (
      <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
        Sin tráfico de aeropuertos disponible ahora. El endpoint sirve un CSV abierto de datos.gob.es
        si está configurado (AENA_TRAFFIC_CSV_URL) y, si no, el catálogo curado+datado de AENA.
      </p>
    )
  }

  const chartH = Math.max(220, rows.length * 26 + 20)

  return (
    <div>
      {/* Resumen · total + % internacional + procedencia */}
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-end' }}>
        <Metric
          label={`Pasajeros · top ${rows.length}`}
          value={totalM != null ? `${totalM.toLocaleString('es-ES', { maximumFractionDigits: 1 })} M` : '—'}
          color={ACCENT}
          highlight
        />
        <Metric
          label="Internacional (pond.)"
          value={intlPctAgg != null ? `${intlPctAgg.toFixed(0)}%` : '—'}
          color="#7C3AED"
        />
        <Metric label="Año ref." value={data?.anio_ref != null ? String(data.anio_ref) : '—'} color="#1d1d1f" />
        <div style={{ marginLeft: 'auto' }}>
          <SourceTag live={isLive} />
        </div>
      </div>

      {/* Ranking · barras horizontales por pasajeros */}
      <ResponsiveContainer width="100%" height={chartH}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 0 }} barCategoryGap={6}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10.5, fill: '#3a3a3d', fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            cursor={{ fill: 'rgba(14,165,233,0.06)' }}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #ECECEF' }}
            formatter={(v: number | string, _n, item) => {
              const p = (item?.payload ?? {}) as { aeropuerto?: string; intl?: number | null; ccaa?: string }
              const intl = p.intl != null ? ` · ${p.intl}% intl.` : ''
              const ccaa = p.ccaa ? ` · ${p.ccaa}` : ''
              return [`${Number(v).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M pax${intl}${ccaa}`, p.aeropuerto ?? '']
            }}
          />
          <Bar dataKey="pax" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {rows.map((r) => (
              // Tinte más fuerte cuanto mayor el % internacional (relevancia turística receptora).
              <Cell key={r.name} fill={r.intl != null && r.intl >= 65 ? ACCENT : '#7DD3FC'} />
            ))}
            <LabelList
              dataKey="pax"
              position="right"
              formatter={(v: number) => `${v.toLocaleString('es-ES', { maximumFractionDigits: 1 })}`}
              style={{ fontSize: 9.5, fill: '#6e6e73', fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Leyenda de tinte */}
      <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
        <LegendDot color={ACCENT} label="Internacional ≥ 65% (turismo receptor)" />
        <LegendDot color="#7DD3FC" label="Predominio nacional / mixto" />
      </div>

      {/* Enlace al módulo de infraestructuras (inversión Aena) · sin duplicar */}
      <div
        style={{
          marginTop: 14,
          padding: '10px 14px',
          background: '#F0F9FF',
          border: '1px solid #BAE6FD',
          borderRadius: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 11.5, color: '#0C4A6E', lineHeight: 1.4 }}>
          La inversión y el CAPEX de Aena (DORA, planes directores, ampliaciones) se analizan en el módulo
          de infraestructuras, no se replican aquí.
        </span>
        <a
          href="/sector-infraestructuras"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            background: ACCENT,
            padding: '6px 14px',
            borderRadius: 999,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Inversión Aena <span aria-hidden="true">⟶</span>
        </a>
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        {data?.nota}
      </p>
    </div>
  )
}

function Metric({ label, value, color, highlight }: { label: string; value: string; color: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: highlight ? 24 : 18,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function SourceTag({ live }: { live: boolean }) {
  return (
    <span
      title={
        live
          ? 'Datos en vivo desde un CSV abierto de datos.gob.es'
          : 'Catálogo curado y datado de AENA (datos 2024). Para datos en vivo configura AENA_TRAFFIC_CSV_URL'
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 10,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: 999,
        background: live ? '#ECFDF5' : '#F5F5F7',
        color: live ? '#047857' : '#6e6e73',
        border: `1px solid ${live ? '#A7F3D0' : '#E5E7EB'}`,
      }}
    >
      <span aria-hidden="true">{live ? '◉' : '◐'}</span>
      {live ? 'AENA · vivo (CSV abierto)' : 'AENA · curado+datado'}
    </span>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#6e6e73' }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
      {label}
    </span>
  )
}

export default ConectAeropuertos
