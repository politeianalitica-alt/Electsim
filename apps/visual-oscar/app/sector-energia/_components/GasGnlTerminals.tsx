'use client'
/**
 * <GasGnlTerminals /> · Energía v3 · E7 (Gas profundo)
 *
 * Orígenes y terminales de GNL en VIVO. Consume el endpoint
 * `GET /api/energia/gnl-origenes?days=30`, que combina:
 *   - estado VIVO agregado de España (GIE ALSI): % de llenado, energía en
 *     tanque (GWh), send-out total a la red (GWh/d), fecha del gas-day;
 *   - las 6-7 terminales de regasificación españolas (Barcelona, Cartagena,
 *     Huelva, Bilbao, Sagunto, Mugardos, El Musel) con su send-out estimado
 *     (prorrateado por capacidad nominal) y su cuota de capacidad del sistema;
 *   - los orígenes del GNL por país (catálogo curado CORES/Enagás), mostrados
 *     como donut con su nota + fuente honestas (no es el mes corriente).
 *
 * Distinto de lo que ya hay en GasView (que usa AGSI gas-storage, ALSI
 * lng-storage, IIP, Henry Hub, TTF): esta vista NO repite el % de llenado de
 * tanque ni el send-out agregado como KPI suelto, sino que los baja a nivel de
 * terminal y añade el donut de orígenes por país, que no existía en vivo.
 *
 * Degradación honesta: si falta GIE_API_KEY el endpoint responde ok:false con
 * el dato vivo en null pero la estructura de terminales + orígenes presente, de
 * modo que la diversificación por país se sigue viendo. Cero emojis · Unicode.
 */
import { useEffect, useMemo, useState } from 'react'

const GAS = '#1D4ED8'
const GAS_DARK = '#1E3A8A'

// ─── Tipos (espejo del endpoint · NO se importan de types.ts) ────────────────
interface GnlTerminal {
  nombre: string
  ubicacion: string
  operador: string
  emision_nominal_gwh_dia: number | null
  estado: string
  send_out_estimado_gwh: number | null
  cuota_capacidad_pct: number | null
  nota?: string
}
interface GnlOrigen {
  pais: string
  cuota_pct: number
}
interface GnlOrigenesData {
  fullness_pct: number | null
  inventory_gwh: number | null
  send_out_total_gwh: number | null
  updated_at: string | null
  terminales: GnlTerminal[]
  origenes: GnlOrigen[]
  origenes_ano_ref: number
  nota_origenes: string
  origenes_fuente: string
  origenes_fuente_url: string
}
interface GnlOrigenesResponse {
  ok: boolean
  error?: string
  data?: GnlOrigenesData
}

export function GasGnlTerminals() {
  const [data, setData] = useState<GnlOrigenesData | null>(null)
  const [live, setLive] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const res = (await fetch('/api/energia/gnl-origenes?days=30', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)) as GnlOrigenesResponse | null
      if (!alive) return
      // El endpoint trae siempre la estructura (terminales + orígenes) aunque el
      // dato vivo falte: usamos data si existe, sea ok o no.
      setData(res?.data ?? null)
      setLive(!!res?.ok)
      setErr(res?.ok ? null : res?.error ?? 'sin datos')
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return <div style={{ fontSize: 12, color: '#86868b' }}>Cargando terminales y orígenes de GNL…</div>
  }
  if (!data) {
    return (
      <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.55 }}>
        Estado del GNL no disponible ahora{err ? ` (${err.split('·')[0].trim()})` : ''}. El endpoint
        combina el estado vivo de España (GIE ALSI · requiere <code style={codeStyle}>GIE_API_KEY</code>)
        con el catálogo de terminales y orígenes. Reintenta en unos minutos.
      </div>
    )
  }

  const keyMissing = !live && /no_key|GIE_API_KEY|unauthorized|api key/i.test(err ?? '')

  return (
    <div>
      {/* Banda de estado agregado vivo (cuando hay key) o aviso de degradación */}
      {live ? (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
          <LiveMetric label="Send-out total (red)" value={fmt(data.send_out_total_gwh, 'GWh/d')} highlight />
          <LiveMetric label="GNL en tanque" value={fmt(data.inventory_gwh, 'GWh')} />
          <LiveMetric label="Llenado tanques" value={data.fullness_pct != null ? `${data.fullness_pct.toFixed(1)}%` : '—'} />
          {data.updated_at && (
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#A0A0A5' }}>
              GIE ALSI · gas-day {data.updated_at}
            </span>
          )}
        </div>
      ) : (
        <div
          style={{
            fontSize: 11, color: '#92722f', background: '#FEF9EE', border: '1px solid #F4E2BC',
            borderRadius: 8, padding: '8px 12px', marginBottom: 16, lineHeight: 1.5,
          }}
        >
          {keyMissing ? (
            <>
              Send-out por terminal no disponible: falta <code style={codeStyle}>GIE_API_KEY</code> (gratis en{' '}
              <a href="https://alsi.gie.eu/account" target="_blank" rel="noreferrer" style={{ color: GAS_DARK, fontWeight: 600 }}>alsi.gie.eu/account</a>).
              Se muestra la capacidad nominal de cada terminal y los orígenes del catálogo.
            </>
          ) : (
            <>El estado vivo de ALSI no respondió; se muestran la capacidad nominal y los orígenes del catálogo.</>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, alignItems: 'start' }}>
        {/* ── Terminales (cards) ───────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {data.terminales.map((t) => (
              <TerminalCard key={t.nombre} t={t} live={live} />
            ))}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
            {live
              ? 'El send-out por terminal está prorrateado del send-out agregado vivo (GIE ALSI) según la capacidad de emisión nominal de cada planta (ALSI publica el agregado por país, no por terminal). La cuota es sobre la capacidad nominal del sistema.'
              : 'Capacidad de emisión nominal por terminal (catálogo Enagás). El send-out vivo por planta requiere GIE_API_KEY.'}
            {' '}España concentra ~1/3 de la capacidad de regasificación de la UE.
          </p>
        </div>

        {/* ── Orígenes por país (donut) ────────────────────────────────────── */}
        <div>
          <OrigenesDonut origenes={data.origenes} anoRef={data.origenes_ano_ref} />
          <p style={{ margin: '12px 0 0', fontSize: 9.5, color: '#A0A0A5', lineHeight: 1.5 }}>
            {data.nota_origenes}
          </p>
          {data.origenes_fuente_url && (
            <a
              href={data.origenes_fuente_url}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 600, color: GAS_DARK, textDecoration: 'none' }}
            >
              Fuente: {data.origenes_fuente} ⟶
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default GasGnlTerminals

// ─── Card de terminal ────────────────────────────────────────────────────────
function TerminalCard({ t, live }: { t: GnlTerminal; live: boolean }) {
  const op = t.estado === 'operativa'
  const cuota = t.cuota_capacidad_pct
  return (
    <div
      style={{
        border: `1px solid ${op ? '#E2E8F0' : '#EDEDED'}`,
        borderRadius: 11,
        padding: '11px 13px',
        background: op ? '#fff' : '#FAFAFA',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: op ? '#1d1d1f' : '#94A3B8', fontFamily: 'var(--font-display)' }}>
          {t.nombre}
        </span>
        {!op && (
          <span style={{ fontSize: 8, fontWeight: 800, color: '#94A3B8', background: '#F1F5F9', padding: '2px 6px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.estado}
          </span>
        )}
      </div>
      <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 1 }}>
        {t.ubicacion} · {t.operador}
      </div>

      {/* barra de cuota de capacidad del sistema */}
      <div style={{ marginTop: 9, height: 7, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, cuota ?? 0))}%`,
            height: '100%',
            background: op ? GAS : '#CBD5E1',
            transition: 'width 250ms ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, gap: 8 }}>
        <MiniStat
          label={live ? 'Send-out' : 'Cap. nominal'}
          value={
            live
              ? t.send_out_estimado_gwh != null
                ? `${t.send_out_estimado_gwh.toLocaleString('es-ES', { maximumFractionDigits: 0 })} GWh/d`
                : '—'
              : t.emision_nominal_gwh_dia != null
                ? `${t.emision_nominal_gwh_dia} GWh/d`
                : 'puesta en marcha'
          }
          color={op ? '#1d1d1f' : '#94A3B8'}
        />
        <MiniStat label="Cuota cap." value={cuota != null ? `${cuota.toFixed(1)}%` : '—'} color={GAS} align="right" />
      </div>
    </div>
  )
}

function MiniStat({ label, value, color, align }: { label: string; value: string; color?: string; align?: 'right' }) {
  return (
    <div style={{ textAlign: align ?? 'left' }}>
      <div style={{ fontSize: 8.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', color: color ?? '#1d1d1f', letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  )
}

function LiveMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: highlight ? 26 : 20, fontWeight: 700, fontFamily: 'var(--font-display)', color: highlight ? GAS : '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

// ─── Donut de orígenes por país (SVG, sin librería) ──────────────────────────
const ORIGEN_COLORS = ['#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#7C3AED', '#A78BFA', '#0891B2']
const ORIGEN_RESTO = '#CBD5E1'

function OrigenesDonut({ origenes, anoRef }: { origenes: GnlOrigen[]; anoRef: number }) {
  const segments = useMemo(() => {
    const total = origenes.reduce((acc, o) => acc + (o.cuota_pct || 0), 0) || 100
    let acc = 0
    return origenes.map((o, i) => {
      const frac = (o.cuota_pct || 0) / total
      const start = acc
      acc += frac
      const resto = /resto|otros/i.test(o.pais)
      return {
        pais: o.pais,
        cuota: o.cuota_pct,
        start,
        end: acc,
        color: resto ? ORIGEN_RESTO : ORIGEN_COLORS[i % ORIGEN_COLORS.length],
      }
    })
  }, [origenes])

  if (segments.length === 0) {
    return <div style={{ fontSize: 11.5, color: '#86868b' }}>Sin desglose de orígenes en el catálogo.</div>
  }

  const R = 52
  const STROKE = 22
  const C = 2 * Math.PI * R
  const cx = 70
  const cy = 70

  return (
    <div>
      <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
        Orígenes del GNL por país · ~{anoRef}
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <svg width={140} height={140} viewBox="0 0 140 140" style={{ flex: '0 0 auto' }}>
          {/* track */}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#F1F5F9" strokeWidth={STROKE} />
          {segments.map((s) => {
            const len = (s.end - s.start) * C
            const gap = C - len
            const offset = -s.start * C
            return (
              <circle
                key={s.pais}
                cx={cx}
                cy={cy}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={STROKE}
                strokeDasharray={`${len} ${gap}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${cx} ${cy})`}
              >
                <title>{s.pais}: {s.cuota}%</title>
              </circle>
            )
          })}
          <text x={cx} y={cy - 2} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: '#1d1d1f', fontFamily: 'var(--font-display)' }}>
            GNL
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 8, fill: '#86868b' }}>
            por origen
          </text>
        </svg>

        {/* leyenda */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 120px' }}>
          {segments.map((s) => (
            <li key={s.pais} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flex: '0 0 auto' }} />
              <span style={{ color: /resto|otros/i.test(s.pais) ? '#9CA3AF' : '#3a3a3d', fontWeight: /resto|otros/i.test(s.pais) ? 500 : 600 }}>
                {s.pais}
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1d1d1f' }}>{s.cuota}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmt(v: number | null, unit: string): string {
  if (v == null) return '—'
  return `${v.toLocaleString('es-ES', { maximumFractionDigits: 0 })} ${unit}`
}

const codeStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  background: '#F1F5F9',
  padding: '1px 4px',
  borderRadius: 3,
}
