'use client'
/**
 * <ViviendaPreciosView /> · Vivienda v3 · Sprint V5
 *
 * Vista profunda de precios. Conecta tres fuentes complementarias:
 *
 *   1. INE TempUS · IPV trimestral España (10 años) — datos ya en endpoint
 *      /api/sectores/vivienda/precios.
 *   2. Eurostat prc_hpi_a · comparativa internacional España vs UE-27 +
 *      Eurozone + países de referencia.
 *   3. BdE tabla 25.10 · serie nominal y REAL (deflactada por IPC). Pone
 *      el dato del IPV en perspectiva con la inflación.
 *
 * Cada panel cita su fuente + link al portal oficial. Si una fuente cae,
 * el panel muestra mensaje claro y los otros dos siguen funcionando.
 */
import { useEffect, useState } from 'react'

const ACCENT = '#DB2777'

// ─── Tipos de respuesta ───────────────────────────────────

interface IpvPoint {
  t: string
  indice: number | null
  var_anual: number | null
}

interface EurostatSerie {
  geo: string
  points: Array<{ time: string; value: number | null }>
}
interface EurostatEnvelope {
  ok: boolean
  data: { series: EurostatSerie[]; latest_by_geo: Record<string, { time: string; value: number | null }> } | null
  fuente: string
  fuente_url: string
  fuentes_error: string[]
}

interface BdePoint {
  periodo: string
  anyo: number
  trim: number | null
  nominal: number | null
  real: number | null
  var_anual_nominal: number | null
  var_anual_real: number | null
}
interface BdeEnvelope {
  ok: boolean
  data: { points: BdePoint[]; latest: BdePoint | null; max_real: BdePoint | null; distancia_al_max_real_pct: number | null } | null
  fuente: string
  fuente_url: string
  fuentes_error: string[]
}

const GEO_LABELS: Record<string, string> = {
  ES: 'España',
  EU27_2020: 'UE-27',
  EA20: 'Zona euro',
  FR: 'Francia',
  DE: 'Alemania',
  IT: 'Italia',
  PT: 'Portugal',
  NL: 'Países Bajos',
}
const GEO_COLORS: Record<string, string> = {
  ES: '#DB2777',
  EU27_2020: '#1F4E8C',
  EA20: '#0EA5E9',
  FR: '#7C3AED',
  DE: '#F59E0B',
  IT: '#16A34A',
  PT: '#DC2626',
  NL: '#0F766E',
}

export function ViviendaPreciosView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <HeaderPrecios />
      <PanelIpvEspana />
      <PanelComparativaEurostat />
      <PanelBdeReal />
    </div>
  )
}

function HeaderPrecios() {
  return (
    <section
      style={{
        background: `linear-gradient(135deg, ${ACCENT} 0%, #831843 100%)`,
        borderRadius: 18,
        padding: '24px 32px',
        color: '#fff',
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.16em',
          opacity: 0.8,
          textTransform: 'uppercase',
          margin: '0 0 8px',
        }}
      >
        VIVIENDA · PRECIOS · IPV + EUROSTAT + BdE PRECIO REAL
      </p>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          margin: '0 0 8px',
        }}
      >
        Qué precio paga España y cómo se compara con la UE
      </h2>
      <p style={{ fontSize: 13, opacity: 0.85, margin: 0, lineHeight: 1.55, maxWidth: 880 }}>
        Tres lecturas complementarias: el índice oficial del INE (nominal), la comparativa europea
        con Eurostat, y la serie deflactada del Banco de España (precio real). Esta última pone los
        precios en perspectiva con la inflación y permite responder con honestidad si estamos cerca
        del máximo de 2007 o todavía lejos.
      </p>
    </section>
  )
}

// ─── Panel 1 · IPV España histórico ───────────────────────

function PanelIpvEspana() {
  const [points, setPoints] = useState<IpvPoint[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/sectores/vivienda/precios?nult=40', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { points: IpvPoint[] } | null) => {
        if (alive) setPoints(j?.points ?? null)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const valid = (points ?? []).filter((p) => p.indice != null)
  const last = valid[valid.length - 1]
  const first = valid[0]
  const acumulada = first && last && first.indice && last.indice
    ? Number((((last.indice - first.indice) / first.indice) * 100).toFixed(1))
    : null

  return (
    <Panel
      titulo="IPV España · 10 años (INE trimestral)"
      fuente="INE · Índice de Precios de Vivienda · base 2015 = 100"
      url="https://www.ine.es/dynt3/inebase/index.htm?padre=4960"
    >
      {loading ? (
        <Skeleton h={220} />
      ) : !valid.length ? (
        <Vacio msg="INE no devuelve datos en este momento." />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
            <Mini label={`Índice actual (${last?.t ?? '—'})`} value={last?.indice ?? null} unit="" color={ACCENT} decimals={2} />
            <Mini
              label={`Variación anual (${last?.t ?? '—'})`}
              value={last?.var_anual ?? null}
              unit="%"
              color={(last?.var_anual ?? 0) > 0 ? '#DC2626' : '#16A34A'}
              decimals={1}
            />
            <Mini
              label={`Acumulada 10 años (${first?.t ?? ''} → ${last?.t ?? ''})`}
              value={acumulada}
              unit="%"
              color="#1F4E8C"
              decimals={1}
            />
          </div>
          <LineChart points={valid.map((p) => ({ t: p.t, value: p.indice }))} color={ACCENT} />
        </>
      )}
    </Panel>
  )
}

// ─── Panel 2 · Comparativa Eurostat ───────────────────────

function PanelComparativaEurostat() {
  const [env, setEnv] = useState<EurostatEnvelope | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/vivienda/eurostat-hpi', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: EurostatEnvelope | null) => alive && setEnv(j))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const series = env?.data?.series ?? []
  const visible = ['ES', 'EU27_2020', 'EA20', 'FR', 'DE', 'IT', 'PT', 'NL']
    .map((g) => series.find((s) => s.geo === g))
    .filter(Boolean) as EurostatSerie[]

  return (
    <Panel
      titulo="Comparativa europea · House Price Index"
      fuente={env?.fuente || 'Eurostat · prc_hpi_a'}
      url={env?.fuente_url || 'https://ec.europa.eu/eurostat/databrowser/view/prc_hpi_a'}
    >
      {loading ? (
        <Skeleton h={240} />
      ) : !env?.ok || visible.length === 0 ? (
        <Vacio msg={`Eurostat no responde · ${env?.fuentes_error?.join(' · ') || 'sin detalle'}`} />
      ) : (
        <>
          <p style={{ fontSize: 11, color: '#86868b', margin: '0 0 12px', lineHeight: 1.5 }}>
            Índice base 2015 = 100. Valores más altos indican subidas acumuladas mayores desde 2015.
            España vs zona euro y vs países de referencia (mismo período).
          </p>
          <MultiLineChart series={visible.map((s) => ({ geo: s.geo, label: GEO_LABELS[s.geo] || s.geo, color: GEO_COLORS[s.geo] || '#999', points: s.points }))} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            {visible.map((s) => {
              const last = s.points[s.points.length - 1]
              return (
                <div key={s.geo} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ width: 12, height: 2, background: GEO_COLORS[s.geo] || '#999' }} />
                  <span style={{ color: '#3a3a3d', fontWeight: 700 }}>{GEO_LABELS[s.geo] || s.geo}</span>
                  <span style={{ color: '#86868b' }}>
                    {last?.value != null ? `${last.value.toLocaleString('es-ES', { maximumFractionDigits: 1 })} (${last.time})` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Panel>
  )
}

// ─── Panel 3 · BdE precio real ────────────────────────────

function PanelBdeReal() {
  const [env, setEnv] = useState<BdeEnvelope | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/vivienda/bde-precio-real', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: BdeEnvelope | null) => alive && setEnv(j))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const points = env?.data?.points ?? []
  const latest = env?.data?.latest ?? null
  const max_real = env?.data?.max_real ?? null
  const dist = env?.data?.distancia_al_max_real_pct ?? null

  return (
    <Panel
      titulo="BdE · precio nominal vs real (deflactado)"
      fuente={env?.fuente || 'BdE · Boletín Estadístico tabla 25.10'}
      url={env?.fuente_url || 'https://www.bde.es/webbde/es/estadis/infoest/series/'}
    >
      {loading ? (
        <Skeleton h={240} />
      ) : !env?.ok || points.length === 0 ? (
        <Vacio msg={`BdE no responde · ${env?.fuentes_error?.join(' · ') || 'CSV no disponible · degradación honesta'}`} />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
            <Mini label={`Nominal último (${latest?.periodo ?? '—'})`} value={latest?.nominal ?? null} unit="" color="#1F4E8C" decimals={1} />
            <Mini label={`Real deflactado`} value={latest?.real ?? null} unit="" color={ACCENT} decimals={1} />
            <Mini
              label={`Distancia al máximo real (${max_real?.periodo ?? '—'})`}
              value={dist}
              unit="%"
              color={dist != null && dist > -5 ? '#DC2626' : '#16A34A'}
              decimals={1}
              sub={dist != null && dist >= 0 ? 'Por encima del pico histórico' : 'Por debajo del pico histórico'}
            />
          </div>
          <MultiLineChart
            series={[
              { geo: 'NOM', label: 'Nominal', color: '#1F4E8C', points: points.map((p) => ({ time: p.periodo, value: p.nominal })) },
              { geo: 'REAL', label: 'Real deflactado IPC', color: ACCENT, points: points.map((p) => ({ time: p.periodo, value: p.real })) },
            ]}
          />
          <p style={{ fontSize: 11, color: '#86868b', margin: '12px 0 0', lineHeight: 1.5 }}>
            El precio real elimina el efecto de la inflación. Permite responder si estamos
            realmente más cerca del pico de 2007 o si la subida nominal es en gran parte deflación
            del euro. Si la fuente BdE no responde (CSV migrado), los demás paneles siguen
            funcionando.
          </p>
        </>
      )}
    </Panel>
  )
}

// ─── Primitivas internas ──────────────────────────────────

function Panel({ titulo, fuente, url, children }: { titulo: string; fuente: string; url: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '20px 22px' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em', margin: 0 }}>
          {titulo}
        </h3>
        <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: '#86868b', textDecoration: 'none' }}>
          {fuente} ›
        </a>
      </header>
      {children}
    </section>
  )
}

function Mini({
  label,
  value,
  unit,
  color,
  decimals = 1,
  sub,
}: {
  label: string
  value: number | null
  unit: string
  color: string
  decimals?: number
  sub?: string
}) {
  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderTop: `3px solid ${color}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>{label}</div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: value == null ? '#9CA3AF' : color,
          marginTop: 2,
        }}
      >
        {value == null ? '—' : value.toLocaleString('es-ES', { maximumFractionDigits: decimals })}
        <span style={{ fontSize: 11, marginLeft: 4, color: '#86868b' }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 10, color: '#86868b', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Skeleton({ h = 200 }: { h?: number }) {
  return <div style={{ height: h, background: 'rgba(0,0,0,0.04)', borderRadius: 8 }} />
}

function Vacio({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '14px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 12, color: '#991B1B' }}>
      {msg}
    </div>
  )
}

function LineChart({ points, color }: { points: Array<{ t: string; value: number | null }>; color: string }) {
  const valid = points.filter((p) => p.value != null)
  if (!valid.length) return <Vacio msg="Sin datos" />
  const W = 700
  const H = 220
  const P = 30
  const values = valid.map((p) => p.value as number)
  const minY = Math.min(...values) * 0.98
  const maxY = Math.max(...values) * 1.02
  const path = valid
    .map((p, i) => {
      const x = P + (i / (valid.length - 1)) * (W - 2 * P)
      const y = P + (1 - ((p.value as number) - minY) / (maxY - minY)) * (H - 2 * P)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" />
      ))}
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} />
      {valid
        .filter((_, i) => i % Math.ceil(valid.length / 6) === 0)
        .map((p) => {
          const i = valid.findIndex((v) => v.t === p.t)
          const x = P + (i / (valid.length - 1)) * (W - 2 * P)
          return (
            <text key={p.t} x={x} y={H + 14} textAnchor="middle" style={{ fontSize: 9, fill: '#86868b' }}>
              {p.t}
            </text>
          )
        })}
      <text x={4} y={P + 4} style={{ fontSize: 9, fill: '#86868b' }}>
        {maxY.toFixed(0)}
      </text>
      <text x={4} y={H - P + 4} style={{ fontSize: 9, fill: '#86868b' }}>
        {minY.toFixed(0)}
      </text>
    </svg>
  )
}

function MultiLineChart({
  series,
}: {
  series: Array<{ geo: string; label: string; color: string; points: Array<{ time: string; value: number | null }> }>
}) {
  const all = series.flatMap((s) => s.points.filter((p) => p.value != null).map((p) => p.value as number))
  if (all.length === 0) return <Vacio msg="Sin datos comunes" />
  const W = 700
  const H = 220
  const P = 30
  const minY = Math.min(...all) * 0.97
  const maxY = Math.max(...all) * 1.03

  // Eje X: union de tiempos ordenados
  const times = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.time)))).sort()
  const xFor = (t: string) => {
    const i = times.indexOf(t)
    if (i < 0) return P
    return P + (i / Math.max(1, times.length - 1)) * (W - 2 * P)
  }
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" />
      ))}
      {series.map((s) => {
        const pts = s.points.filter((p) => p.value != null)
        if (pts.length === 0) return null
        const path = pts
          .map((p, i) => {
            const x = xFor(p.time)
            const y = P + (1 - ((p.value as number) - minY) / (maxY - minY)) * (H - 2 * P)
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
          })
          .join(' ')
        return <path key={s.geo} d={path} fill="none" stroke={s.color} strokeWidth={s.geo === 'ES' || s.geo === 'NOM' || s.geo === 'REAL' ? 2.5 : 1.6} opacity={s.geo === 'ES' || s.geo === 'NOM' || s.geo === 'REAL' ? 1 : 0.7} />
      })}
      {times
        .filter((_, i) => i % Math.ceil(times.length / 6) === 0)
        .map((t) => (
          <text key={t} x={xFor(t)} y={H + 14} textAnchor="middle" style={{ fontSize: 9, fill: '#86868b' }}>
            {t}
          </text>
        ))}
      <text x={4} y={P + 4} style={{ fontSize: 9, fill: '#86868b' }}>
        {maxY.toFixed(0)}
      </text>
      <text x={4} y={H - P + 4} style={{ fontSize: 9, fill: '#86868b' }}>
        {minY.toFixed(0)}
      </text>
    </svg>
  )
}
