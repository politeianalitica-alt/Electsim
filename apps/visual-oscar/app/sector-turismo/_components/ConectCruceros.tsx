'use client'
/**
 * <ConectCruceros /> · Turismo v3 · Sprint T8 (Conectividad)
 *
 * Tráfico de pasajeros de crucero por puerto español: ranking por pasajeros
 * (barras horizontales · recharts) + cuota de homeport (embarque/desembarque vs
 * tránsito). Barcelona es el primer homeport de Europa; el homeport tiene mucho
 * mayor impacto en gasto (pernoctación pre/post crucero, vuelos) que el tránsito.
 *
 * No hace fetch: recibe `data` ya resuelto por <ConectividadView />.
 *
 * ANTI-DUPLICACIÓN (CLAUDE.md / spec): el módulo Puertos cubre carga, AIS y la
 * ficha de cada puerto. Aquí solo se muestran las cifras de pasajeros de crucero
 * (curadas+datadas) y, cuando el puerto existe en el módulo Puertos (`port_slug`),
 * se ofrece deep-link a su ficha. No se replica el módulo.
 *
 * Cero emojis · Unicode geométrico (⟶ ◐).
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
const HOMEPORT = '#0369A1'
const TRANSIT = '#7DD3FC'

export interface CruisePortRow {
  puerto: string
  autoridad?: string
  pasajeros_crucero: number | null
  escalas?: number | null
  homeport_pct?: number | null
  ccaa?: string
  port_slug?: string | null
  lat?: number | null
  lon?: number | null
  source: 'catalog' | 'ports+catalog'
}

export interface CrucerosPayload {
  anio_ref: number | null
  puertos: CruisePortRow[]
  total_pasajeros: number | null
  cruzados_con_puertos: number
  source: 'catalog' | 'ports+catalog'
  nota: string
}

interface Props {
  data: CrucerosPayload | null
  loading?: boolean
}

function toM(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null
  return n / 1_000_000
}

export function ConectCruceros({ data, loading = false }: Props) {
  const puertos = data?.puertos ?? []
  const totalM = toM(data?.total_pasajeros)

  // Cuota agregada de homeport (ponderada por pasajeros).
  const homeportAgg = useMemo(() => {
    let num = 0
    let den = 0
    for (const p of puertos) {
      if (p.pasajeros_crucero != null && p.homeport_pct != null) {
        num += p.pasajeros_crucero * p.homeport_pct
        den += p.pasajeros_crucero
      }
    }
    return den > 0 ? num / den : null
  }, [puertos])

  // Barras apiladas: pasajeros homeport vs tránsito (de homeport_pct).
  const rows = useMemo(
    () =>
      puertos
        .filter((p) => p.pasajeros_crucero != null)
        .slice(0, 14)
        .map((p) => {
          const total = toM(p.pasajeros_crucero) ?? 0
          const hp = p.homeport_pct != null ? p.homeport_pct / 100 : null
          return {
            name: shortPort(p.puerto),
            puerto: p.puerto,
            total,
            homeport: hp != null ? total * hp : null,
            transito: hp != null ? total * (1 - hp) : total,
            homeportPct: p.homeport_pct ?? null,
            escalas: p.escalas ?? null,
            slug: p.port_slug ?? null,
            ccaa: p.ccaa ?? '',
            hasSplit: hp != null,
          }
        }),
    [puertos],
  )

  const anySplit = rows.some((r) => r.hasSplit)

  if (loading) {
    return <div style={{ height: 360, background: 'rgba(0,0,0,0.04)', borderRadius: 10 }} />
  }
  if (rows.length === 0) {
    return (
      <p style={{ fontSize: 12, color: '#86868b', margin: 0, lineHeight: 1.5 }}>
        Sin tráfico de cruceros disponible ahora. Las cifras son curadas+datadas de Puertos del Estado
        (que no expone API REST de pasajeros de crucero).
      </p>
    )
  }

  const chartH = Math.max(220, rows.length * 26 + 20)
  const tooltipFmt = (v: number | string, name: string, item: { payload?: Record<string, unknown> }) => {
    const p = (item?.payload ?? {}) as { puerto?: string; homeportPct?: number | null; escalas?: number | null; ccaa?: string }
    const label = name === 'homeport' ? 'Homeport' : 'Tránsito'
    const extra =
      name === 'homeport'
        ? p.homeportPct != null
          ? ` (${p.homeportPct}% del puerto)`
          : ''
        : p.escalas != null
          ? ` · ${p.escalas} escalas`
          : ''
    return [`${Number(v).toLocaleString('es-ES', { maximumFractionDigits: 2 })} M · ${label}${extra}`, p.puerto ?? '']
  }

  return (
    <div>
      {/* Resumen · total + homeport agregado + puertos cruzados */}
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-end' }}>
        <Metric
          label={`Pasajeros crucero · top ${rows.length}`}
          value={totalM != null ? `${totalM.toLocaleString('es-ES', { maximumFractionDigits: 2 })} M` : '—'}
          color={ACCENT}
          highlight
        />
        <Metric
          label="Homeport (pond.)"
          value={homeportAgg != null ? `${homeportAgg.toFixed(0)}%` : '—'}
          color={HOMEPORT}
        />
        <Metric label="Año ref." value={data?.anio_ref != null ? String(data.anio_ref) : '—'} color="#1d1d1f" />
        <div style={{ marginLeft: 'auto' }}>
          <span
            title="Cifras curadas+datadas de Puertos del Estado; cuando el puerto existe en el módulo Puertos se enlaza a su ficha."
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 999,
              background: '#F5F5F7',
              color: '#6e6e73',
              border: '1px solid #E5E7EB',
            }}
          >
            <span aria-hidden="true">◐</span> Puertos del Estado · curado+datado
          </span>
        </div>
      </div>

      {/* Ranking · barras horizontales apiladas (homeport / tránsito) */}
      <ResponsiveContainer width="100%" height={chartH}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 0 }} barCategoryGap={6}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: '#3a3a3d', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={92}
          />
          <Tooltip
            cursor={{ fill: 'rgba(14,165,233,0.06)' }}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #ECECEF' }}
            formatter={tooltipFmt as never}
          />
          {anySplit ? (
            <>
              <Bar dataKey="homeport" stackId="pax" fill={HOMEPORT} radius={[0, 0, 0, 0]} maxBarSize={20} />
              <Bar dataKey="transito" stackId="pax" fill={TRANSIT} radius={[0, 4, 4, 0]} maxBarSize={20}>
                <LabelList
                  dataKey="total"
                  position="right"
                  formatter={(v: number) => `${v.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`}
                  style={{ fontSize: 9.5, fill: '#6e6e73', fontWeight: 700 }}
                />
              </Bar>
            </>
          ) : (
            <Bar dataKey="transito" fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={20}>
              {rows.map((r) => (
                <Cell key={r.name} fill={ACCENT} />
              ))}
              <LabelList
                dataKey="total"
                position="right"
                formatter={(v: number) => `${v.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`}
                style={{ fontSize: 9.5, fill: '#6e6e73', fontWeight: 700 }}
              />
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>

      {anySplit && (
        <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
          <LegendDot color={HOMEPORT} label="Homeport (embarque/desembarque · mayor gasto)" />
          <LegendDot color={TRANSIT} label="Tránsito (escala)" />
        </div>
      )}

      {/* Deep-links a fichas del módulo Puertos (cuando existe slug) · sin duplicar */}
      <CrossLinks rows={rows} cruzados={data?.cruzados_con_puertos ?? 0} />

      <p style={{ margin: '12px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        {data?.nota}
      </p>
    </div>
  )
}

function CrossLinks({
  rows,
  cruzados,
}: {
  rows: Array<{ name: string; puerto: string; slug: string | null }>
  cruzados: number
}) {
  const linked = rows.filter((r) => r.slug)
  return (
    <div
      style={{
        marginTop: 14,
        padding: '10px 14px',
        background: '#F0F9FF',
        border: '1px solid #BAE6FD',
        borderRadius: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, color: '#0C4A6E', lineHeight: 1.4 }}>
          La ficha de cada puerto (carga, AIS, escalas) vive en el módulo Puertos.
          {cruzados > 0
            ? ` ${cruzados} de estos puertos están cruzados con su ficha.`
            : ' Las cifras de crucero no se replican allí.'}
        </span>
        <a
          href="/puertos"
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
          Módulo Puertos <span aria-hidden="true">⟶</span>
        </a>
      </div>
      {linked.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {linked.map((r) => (
            <a
              key={r.name}
              href={`/puertos/${r.slug}`}
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: '#0369A1',
                background: '#fff',
                border: '1px solid #BAE6FD',
                borderRadius: 999,
                padding: '3px 10px',
                textDecoration: 'none',
              }}
            >
              {r.puerto} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

/** Acorta nombres de puerto largos para el eje. */
function shortPort(p: string): string {
  return p
    .replace('Illes Balears (Palma)', 'Palma (Balears)')
    .replace('Santa Cruz de Tenerife', 'S.C. Tenerife')
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#6e6e73' }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
      {label}
    </span>
  )
}

export default ConectCruceros
