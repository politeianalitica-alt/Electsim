'use client'
/**
 * <ElectricoMercadoFinanciero /> · Energía v3 · Sprint E3 (Eléctrico profundo)
 *
 * Sub-tab "Mercado financiero eléctrico" de ElectricoView. Consume el endpoint
 * NUEVO `/api/energia/esios-financial?hours=48` (cliente
 * `lib/energia/esios-financial.ts`) que expone la familia de indicadores ESIOS
 * de MERCADO DE AJUSTE que las vistas no usaban:
 *
 *   - Servicios de ajuste · banda secundaria (subir/bajar) + terciaria
 *     (subir/bajar): coste de mantener la reserva que casa generación y demanda
 *     segundo a segundo.
 *   - Restricciones técnicas: coste de redespacho por congestión de la red de
 *     transporte (cuando el mercado casa energía que la red no puede mover).
 *   - Gestión de desvíos: coste de corregir las desviaciones entre lo programado
 *     y lo realmente producido/consumido.
 *   - Intercambios bilaterales: saldos por frontera (FR/PT/MA/AD).
 *
 * Degradación HONESTA por-indicador (CLAUDE.md): cada `Ind.ok===false` muestra
 * su propio empty-state ("sin datos · requiere ESIOS_API_KEY" o el `error`) sin
 * romper el resto. El endpoint responde 200 incluso degradado.
 *
 * Cero deps de gráfico · todo SVG inline (mismo patrón que ElectricoView /
 * EsiosAjustesPanel). Cero emojis · Unicode geométrico (▲ ▼ ↗ — ·).
 */
import { useEffect, useState } from 'react'

// ─── Contrato del endpoint (definido AQUÍ · no se edita types.ts) ─────────
// Espejo de `EsiosFinancialIndicator` / `EsiosFinancialData` del cliente lib.
interface FinPoint {
  ts: string
  value: number
}
interface FinIndicator {
  slug: string
  id: number
  label: string
  short: string
  unit: string
  category: string
  use_case: string
  ok: boolean
  error?: string
  last_value: number | null
  last_ts: string | null
  change_24h_pct: number | null
  series: FinPoint[]
  source_url: string
}
interface FinData {
  ajuste: FinIndicator[]
  bilateral: FinIndicator[]
  ok_count: number
  total_count: number
}
interface FinResponse {
  ok: boolean
  error?: string
  data?: FinData
  fetched_at?: string
  source_url?: string
  _meta?: { source?: string; source_label?: string; env_hint?: string; note?: string }
}

const ACCENT = '#0891b2' // cian ESIOS (coherente con EsiosTabsSection)
const POS = '#16A34A'
const NEG = '#DC2626'
const HOURS = 48

// Reparte los 6 indicadores de "ajuste" en dos bloques semánticos para que el
// analista distinga el mercado de balance (banda/terciaria/desvíos) de la
// congestión de red (restricciones técnicas).
const RESTRICCION_SLUGS = new Set(['restricciones_tecnicas'])
const DESVIO_SLUGS = new Set(['desvios'])

function isBalance(slug: string): boolean {
  return !RESTRICCION_SLUGS.has(slug) && !DESVIO_SLUGS.has(slug)
}

// ─── Helpers de formato ───────────────────────────────────────────────────
function fmt(v: number | null | undefined, max = 1): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toLocaleString('es-ES', { maximumFractionDigits: max })
}
function fmtTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function ElectricoMercadoFinanciero() {
  const [resp, setResp] = useState<FinResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/energia/esios-financial?hours=${HOURS}`, { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<FinResponse>) : null))
      .then((j) => { if (alive) setResp(j) })
      .catch(() => { if (alive) setResp(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [reloadKey])

  const data = resp?.data
  const ajuste = data?.ajuste ?? []
  const bilateral = data?.bilateral ?? []
  const balance = ajuste.filter((i) => isBalance(i.slug))
  const restricciones = ajuste.filter((i) => RESTRICCION_SLUGS.has(i.slug))
  const desvios = ajuste.filter((i) => DESVIO_SLUGS.has(i.slug))

  // ¿Todo degradado por falta de clave? → cabecera de aviso global (pero igual
  // pintamos cada indicador con su empty-state, que es la regla del sprint).
  const allNoKey =
    resp != null &&
    data != null &&
    data.ok_count === 0 &&
    ajuste.concat(bilateral).some((i) => /no_key|ESIOS_API_KEY/i.test(i.error || resp.error || ''))

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '18px 20px',
    }}>
      {/* Cabecera */}
      <header style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 12, marginBottom: 6, flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
            letterSpacing: '-0.01em', margin: 0, color: '#1d1d1f',
          }}>
            Mercado financiero eléctrico · servicios de ajuste e intercambios
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73', lineHeight: 1.5, maxWidth: 760 }}>
            Lo que cuesta operar el sistema más allá del precio mayorista: el coste de mantener la
            reserva (banda secundaria/terciaria), de aliviar la congestión de red (restricciones
            técnicas), de balancear las desviaciones (gestión de desvíos) y los saldos comerciales
            por frontera. Datos del operador del sistema (ESIOS · REE), ventana {HOURS} h.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {data && (
            <span style={{
              fontSize: 10.5, color: data.ok_count > 0 ? '#0f766e' : '#92400e', fontWeight: 600,
              background: data.ok_count > 0 ? '#ecfdf5' : '#fef3c7',
              border: `1px solid ${data.ok_count > 0 ? '#a7f3d0' : '#fde68a'}`,
              padding: '4px 10px', borderRadius: 999,
            }}>
              {data.ok_count}/{data.total_count} indicadores en vivo
            </span>
          )}
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            style={{
              fontSize: 10.5, padding: '4px 12px', borderRadius: 999,
              border: '1px solid #D8E5F4', background: '#F5F8FC', color: ACCENT,
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
            }}
          >↻ Actualizar</button>
        </div>
      </header>

      {loading && (
        <p style={{ margin: '12px 0 0', fontSize: 11, color: '#94a3b8' }}>Cargando indicadores ESIOS…</p>
      )}

      {!loading && allNoKey && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b',
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#92400e', marginTop: 12,
        }}>
          <strong>! Configuración pendiente</strong> · ESIOS_API_KEY no está en Vercel env vars.
          Cada indicador queda en su empty-state honesto; el resto de la vista Eléctrico funciona.
        </div>
      )}

      {!loading && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 14 }}>
          {/* ── Bloque 1 · Servicios de ajuste (banda secundaria/terciaria) ── */}
          <Block
            title="Servicios de ajuste · mercado de balance"
            note="Banda secundaria y terciaria: el coste de la reserva que casa generación y demanda en tiempo real. Sube cuando el sistema está tensionado (poca flexibilidad disponible)."
          >
            <KpiRow inds={balance} accent={ACCENT} />
            <ChartGrid inds={balance} accent={ACCENT} />
          </Block>

          {/* ── Bloque 2 · Restricciones técnicas (congestión de red) ── */}
          <Block
            title="Restricciones técnicas · congestión de red"
            note="Coste de redespacho cuando el mercado casa energía que la red de transporte no puede mover: se baja generación barata en una zona y se sube otra más cara cerca del consumo. Refleja cuellos de botella en la red."
          >
            <KpiRow inds={restricciones} accent="#f59e0b" />
            <ChartGrid inds={restricciones} accent="#f59e0b" />
          </Block>

          {/* ── Bloque 3 · Gestión de desvíos (índice de desviación) ── */}
          <Block
            title="Gestión de desvíos · coste de balancear"
            note="Coste de corregir la diferencia entre lo programado y lo realmente producido/consumido. Penaliza a quien se desvía de su programa; es la señal económica de qué cara sale la imprecisión del sistema."
          >
            <KpiRow inds={desvios} accent="#7c3aed" />
            <ChartGrid inds={desvios} accent="#7c3aed" />
          </Block>

          {/* ── Bloque 4 · Intercambios bilaterales por frontera ── */}
          <Block
            title="Intercambios bilaterales · saldos por frontera"
            note="Saldo comercial de cada interconexión (Francia, Portugal, Marruecos, Andorra). Positivo = importación neta; negativo = exportación neta. El precio relativo entre mercados explica el sentido del flujo."
          >
            <BilateralTable inds={bilateral} />
          </Block>

          {/* Pie de fuente */}
          <p style={{
            margin: 0, fontSize: 9.5, color: '#94a3b8',
            borderTop: '1px solid #f1f5f9', paddingTop: 8, lineHeight: 1.5,
          }}>
            {resp?._meta?.note || 'Degradación por-indicador: un indicador caído deja su tarjeta vacía sin romper el resto.'}
            {' · '}
            Fuente:{' '}
            <a href={resp?.source_url || 'https://www.esios.ree.es/es/analisis'} target="_blank" rel="noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
              ESIOS · REE
            </a>
            {resp?.fetched_at ? ` · ${fmtTime(resp.fetched_at)}` : ''}
          </p>
        </div>
      )}

      {!loading && !data && (
        <div style={{
          marginTop: 12, padding: '12px 14px', background: '#f8fafc',
          border: '1px solid #f1f5f9', borderRadius: 8, fontSize: 11.5, color: '#64748b',
        }}>
          No se pudo cargar el mercado financiero eléctrico. {resp?.error ? `(${resp.error})` : 'Reintenta en unos minutos.'}
        </div>
      )}
    </section>
  )
}

// ─── Sub-componentes de presentación ──────────────────────────────────────

function Block({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{
        margin: 0, fontSize: 12.5, fontWeight: 700, color: '#1d1d1f',
        fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
      }}>
        {title}
      </h3>
      <p style={{ margin: '3px 0 10px', fontSize: 10.5, color: '#6e6e73', lineHeight: 1.5, maxWidth: 820 }}>
        {note}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  )
}

/** Fila de KPIs (último valor + cambio 24h) con degradación por-indicador. */
function KpiRow({ inds, accent }: { inds: FinIndicator[]; accent: string }) {
  if (!inds.length) return null
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(${inds.length > 1 ? 180 : 220}px, 1fr))`,
      gap: 10,
    }}>
      {inds.map((ind) => <KpiCard key={ind.slug} ind={ind} accent={accent} />)}
    </div>
  )
}

function KpiCard({ ind, accent }: { ind: FinIndicator; accent: string }) {
  if (!ind.ok || ind.last_value == null) {
    return (
      <div style={{
        padding: '10px 12px', background: '#f8fafc', borderRadius: 8,
        borderLeft: '3px solid #cbd5e1', border: '1px solid #f1f5f9',
      }}>
        <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.3 }}>{ind.short}</p>
        <p style={{ margin: '6px 0 0', fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
          {emptyLabel(ind.error)}
        </p>
      </div>
    )
  }
  const chg = ind.change_24h_pct
  const chgColor = chg == null ? '#94a3b8' : chg > 0 ? NEG : chg < 0 ? POS : '#64748b'
  const chgArrow = chg == null ? '·' : chg > 0 ? '▲' : chg < 0 ? '▼' : '—'
  return (
    <div
      style={{
        padding: '10px 12px', background: '#fff', borderRadius: 8,
        borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9',
      }}
      title={`${ind.label} · ${ind.use_case}`}
    >
      <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.3 }}>{ind.short}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 5, gap: 6 }}>
        <span style={{ fontSize: 19, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>
          {fmt(ind.last_value)}
        </span>
        <span style={{ fontSize: 9.5, color: '#94a3b8' }}>{ind.unit}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: chgColor }}>
          {chgArrow} {chg == null ? 's/d 24h' : `${chg > 0 ? '+' : ''}${fmt(chg)}% 24h`}
        </span>
        <span style={{ fontSize: 9, color: '#cbd5e1' }}>{fmtTime(ind.last_ts)}</span>
      </div>
    </div>
  )
}

/** Rejilla de gráficos de serie (uno por indicador OK con ≥2 puntos). */
function ChartGrid({ inds, accent }: { inds: FinIndicator[]; accent: string }) {
  const drawable = inds.filter((i) => i.ok && i.series.length >= 2)
  if (!drawable.length) return null
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: drawable.length > 1 ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
      gap: 12,
    }}>
      {drawable.map((ind) => <SeriesChart key={ind.slug} ind={ind} accent={accent} />)}
    </div>
  )
}

/** Gráfico de línea SVG inline para la serie de un indicador. */
function SeriesChart({ ind, accent }: { ind: FinIndicator; accent: string }) {
  const pts = ind.series
  const vals = pts.map((p) => p.value)
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  const range = max - min || 1
  const W = 520, H = 130, P = 8
  const x = (i: number) => P + (i / (pts.length - 1)) * (W - 2 * P)
  const y = (v: number) => P + (1 - (v - min) / range) * (H - 2 * P)
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  // Línea base en cero si la serie cruza el cero (relevante en desvíos/saldos).
  const showZero = min < 0 && max > 0
  const zeroY = y(0)
  return (
    <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#3a3a3d' }}>{ind.short}</span>
        <span style={{ fontSize: 9.5, color: '#94a3b8' }}>
          {fmt(ind.last_value)} {ind.unit} · rango {fmt(min)}–{fmt(max)}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} role="img" aria-label={`${ind.label} · serie ${HOURS} h`}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" strokeWidth={1} />
        ))}
        {showZero && (
          <line x1={P} x2={W - P} y1={zeroY} y2={zeroY} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
        )}
        <path d={path} fill="none" stroke={accent} strokeWidth={1.8} />
        {pts.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={5} fill="transparent" style={{ cursor: 'crosshair' }}>
            <title>{fmtTime(p.ts)} · {fmt(p.value, 2)} {ind.unit}</title>
          </circle>
        ))}
      </svg>
      <a href={ind.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: accent, textDecoration: 'none' }}>
        Ver en ESIOS ↗
      </a>
    </div>
  )
}

/** Tabla de intercambios bilaterales (saldos por frontera) con degradación. */
function BilateralTable({ inds }: { inds: FinIndicator[] }) {
  if (!inds.length) {
    return <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin fronteras configuradas.</p>
  }
  const cell: React.CSSProperties = { padding: '8px 10px', fontSize: 11, borderBottom: '1px solid #f1f5f9' }
  const th: React.CSSProperties = { ...cell, fontWeight: 700, color: '#64748b', textAlign: 'left', fontSize: 10, letterSpacing: 0.3, textTransform: 'uppercase' }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Frontera</th>
            <th style={{ ...th, textAlign: 'right' }}>Saldo último</th>
            <th style={{ ...th, textAlign: 'center' }}>Sentido</th>
            <th style={{ ...th, textAlign: 'right' }}>Cambio 24h</th>
            <th style={{ ...th, textAlign: 'right' }}>Actualizado</th>
            <th style={{ ...th, textAlign: 'center' }}>Serie {HOURS}h</th>
          </tr>
        </thead>
        <tbody>
          {inds.map((ind) => {
            if (!ind.ok || ind.last_value == null) {
              return (
                <tr key={ind.slug}>
                  <td style={cell}><strong style={{ color: '#1d1d1f' }}>{ind.short}</strong></td>
                  <td style={{ ...cell, color: '#94a3b8', fontStyle: 'italic' }} colSpan={5}>{emptyLabel(ind.error)}</td>
                </tr>
              )
            }
            const v = ind.last_value
            const positive = v >= 0
            const chg = ind.change_24h_pct
            return (
              <tr key={ind.slug}>
                <td style={cell} title={ind.use_case}>
                  <strong style={{ color: '#1d1d1f' }}>{ind.short}</strong>
                </td>
                <td style={{ ...cell, textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700, color: positive ? POS : NEG }}>
                  {fmt(v)} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 9.5 }}>{ind.unit}</span>
                </td>
                <td style={{ ...cell, textAlign: 'center', color: positive ? POS : NEG, fontWeight: 600 }}>
                  {positive ? '↘ importación' : '↗ exportación'}
                </td>
                <td style={{ ...cell, textAlign: 'right', color: chg == null ? '#94a3b8' : chg > 0 ? NEG : POS, fontWeight: 600 }}>
                  {chg == null ? '—' : `${chg > 0 ? '+' : ''}${fmt(chg)}%`}
                </td>
                <td style={{ ...cell, textAlign: 'right', color: '#94a3b8', fontSize: 9.5 }}>{fmtTime(ind.last_ts)}</td>
                <td style={{ ...cell, textAlign: 'center' }}>
                  <Sparkline series={ind.series} positive={positive} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Sparkline({ series, positive }: { series: FinPoint[]; positive: boolean }) {
  if (series.length < 2) return <span style={{ fontSize: 9, color: '#cbd5e1' }}>—</span>
  const vals = series.map((p) => p.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const w = 90, h = 22
  const path = series.map((p, i) => {
    const x = (i / (series.length - 1)) * w
    const yy = h - ((p.value - min) / range) * h
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yy.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ verticalAlign: 'middle' }}>
      <path d={path} fill="none" stroke={positive ? POS : NEG} strokeWidth={1.3} />
    </svg>
  )
}

// Mensaje de empty-state honesto a partir del `error` del indicador.
function emptyLabel(error?: string): string {
  if (!error) return 'sin datos'
  if (/no_key|ESIOS_API_KEY/i.test(error)) return 'sin datos · requiere ESIOS_API_KEY'
  if (/404/.test(error)) return 'sin datos · indicador no disponible (404)'
  return `sin datos · ${error}`
}

export default ElectricoMercadoFinanciero
