'use client'
/**
 * <PoliticaOperacionEntsoe /> · Sprint Energía · EN4
 *
 * TRANSPARENCIA OPERATIVA EN VIVO (ENTSO-E Transparency Platform). Pone, al
 * inicio de la pestaña Política energética, la foto operativa real del sistema:
 * qué centrales están indisponibles, cuánta potencia hay instalada por
 * tecnología y cómo evoluciona la reserva hidráulica.
 *
 * Tres fetches independientes (cada uno degrada solo):
 *   GET /api/entsoe/indisponibilidades?zone=ES&days=14  → outages A80
 *   GET /api/entsoe/capacidad?zone=ES                   → capacidad instalada A68
 *   GET /api/entsoe/embalses?zone=ES&days=56            → embalses A72 (semanal)
 *
 * Todos devuelven el envelope Politeia { ok, data, error, fetched_at,
 * source_url }. El token ENTSO-E es server-side (process.env.ENTSOE_SECURITY_
 * TOKEN, lo lee el cliente). Si falta, el endpoint responde ok:false con
 * `token_missing · …`; aquí se muestra ese mensaje de forma elegante sin romper
 * el resto (CLAUDE.md). Cero emojis · Unicode (◉ ◐ ⟶ ↗). ACCENT verde '#16A34A'.
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'

const ACCENT = '#16A34A'
const ENTSOE_URL = 'https://transparency.entsoe.eu'

// ─── Tipos del envelope (espejo de lib/entsoe/extended.ts) ───────────────────
interface OutageRecord {
  id: string
  unidad: string
  psr_type: string
  tecnologia: string
  nominal_mw: number | null
  disponible_mw: number | null
  indisponible_mw: number | null
  desde: string | null
  hasta: string | null
  tipo: 'planned' | 'forced' | 'desconocido'
  razon: string | null
}
interface Outages {
  zone: string
  eic: string
  outages: OutageRecord[]
  total_indisponible_mw: number
  n: number
}
interface CapacityItem {
  psr_type: string
  label: string
  mw: number
}
interface InstalledCapacity {
  zone: string
  eic: string
  year: number
  by_type: CapacityItem[]
  total_mw: number
}
interface HydroPoint {
  timestamp: string
  mwh: number
}
interface HydroReservoirs {
  zone: string
  eic: string
  points: HydroPoint[]
  latest_mwh: number | null
  latest_date: string | null
}
interface Envelope<T> {
  ok: boolean
  data: T | null
  error: string | null
  fetched_at: string
  source_url?: string
}

export function PoliticaOperacionEntsoe({ zone = 'ES' }: { zone?: string }) {
  const [outages, setOutages] = useState<Envelope<Outages> | null>(null)
  const [capacity, setCapacity] = useState<Envelope<InstalledCapacity> | null>(null)
  const [hydro, setHydro] = useState<Envelope<HydroReservoirs> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      get<Outages>(`/api/entsoe/indisponibilidades?zone=${zone}&days=14`),
      get<InstalledCapacity>(`/api/entsoe/capacidad?zone=${zone}`),
      get<HydroReservoirs>(`/api/entsoe/embalses?zone=${zone}&days=56`),
    ]).then(([o, c, h]) => {
      if (cancelled) return
      setOutages(o)
      setCapacity(c)
      setHydro(h)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [zone])

  return (
    <>
      {/* ── 1) Indisponibilidades de centrales (outages) ── */}
      <Panel
        title="Indisponibilidades de centrales · outages"
        subtitle="Unidades de generación fuera de servicio (planificadas y forzadas) · ENTSO-E A80 · top por potencia indisponible"
        marginBottom
        sourceUrl={outages?.source_url || ENTSOE_URL}
        sourceLabel="ENTSO-E"
        sourceTooltip="ENTSO-E Transparency Platform · Generation Unavailability"
      >
        {loading ? (
          <Loading label="Cargando indisponibilidades…" />
        ) : !outages?.ok || !outages.data || outages.data.outages.length === 0 ? (
          <EntsoeEmpty
            err={outages?.error}
            normalMsg="Sin indisponibilidades de generación publicadas ahora en esta zona. Es la situación esperada cuando el parque opera con normalidad."
          />
        ) : (
          <OutagesTable data={outages.data} />
        )}
      </Panel>

      {/* ── 2) Capacidad instalada por tecnología ── */}
      <Panel
        title="Capacidad instalada por tecnología"
        subtitle="Potencia instalada agregada del sistema (MW por tecnología) · ENTSO-E A68 · dato anual"
        marginBottom
        sourceUrl={capacity?.source_url || ENTSOE_URL}
        sourceLabel="ENTSO-E"
        sourceTooltip="ENTSO-E Transparency Platform · Installed Capacity per Type"
      >
        {loading ? (
          <Loading label="Cargando capacidad instalada…" />
        ) : !capacity?.ok || !capacity.data || capacity.data.by_type.length === 0 ? (
          <EntsoeEmpty
            err={capacity?.error}
            normalMsg="Capacidad instalada no disponible ahora para esta zona/año."
          />
        ) : (
          <CapacityBars data={capacity.data} />
        )}
      </Panel>

      {/* ── 3) Embalses hidráulicos · reserva ── */}
      <Panel
        title="Embalses hidráulicos · reserva"
        subtitle="Energía almacenada en los embalses (MWh) · serie semanal de 8 semanas · ENTSO-E A72"
        marginBottom
        sourceUrl={hydro?.source_url || ENTSOE_URL}
        sourceLabel="ENTSO-E"
        sourceTooltip="ENTSO-E Transparency Platform · Water Reservoirs and Hydro Storage Plants"
      >
        {loading ? (
          <Loading label="Cargando reserva hidráulica…" />
        ) : !hydro?.ok || !hydro.data || hydro.data.points.length === 0 ? (
          <EntsoeEmpty
            err={hydro?.error}
            normalMsg="Serie de embalses no disponible ahora para esta zona."
          />
        ) : (
          <HydroSpark data={hydro.data} />
        )}
      </Panel>
    </>
  )
}

export default PoliticaOperacionEntsoe

// ─── Outages: tabla top por MW indisponible ──────────────────────────────────
function OutagesTable({ data }: { data: Outages }) {
  const rows = data.outages.slice(0, 16)
  return (
    <div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
        <KPI label="Potencia indisponible (total)" value={`${data.total_indisponible_mw.toLocaleString('es-ES', { maximumFractionDigits: 0 })} MW`} accent />
        <KPI label="Unidades afectadas" value={String(data.n)} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <Th>Unidad</Th>
            <Th w={140}>Tecnología</Th>
            <Th w={120} right>Indisponible</Th>
            <Th w={170}>Ventana</Th>
            <Th w={110}>Tipo</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} style={{ borderTop: '1px solid #F1F1F3' }}>
              <Td>{o.unidad}</Td>
              <Td dim>{o.tecnologia}</Td>
              <Td right mono>
                {o.indisponible_mw != null ? `${o.indisponible_mw.toLocaleString('es-ES', { maximumFractionDigits: 0 })} MW` : '—'}
              </Td>
              <Td dim>
                {[o.desde, o.hasta].filter(Boolean).join('  ⟶  ') || '—'}
              </Td>
              <Td>
                <OutageTipo tipo={o.tipo} />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: '8px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        Potencia indisponible = nominal − disponible declarada. Ordenado por mayor impacto. Una
        indisponibilidad forzada (no planificada) de una unidad grande puede tensar el mercado diario.
      </p>
    </div>
  )
}

function OutageTipo({ tipo }: { tipo: OutageRecord['tipo'] }) {
  const forced = tipo === 'forced'
  const planned = tipo === 'planned'
  const col = forced ? '#DC2626' : planned ? ACCENT : '#6e6e73'
  const bg = forced ? 'rgba(220,38,38,0.07)' : planned ? 'rgba(22,163,74,0.07)' : '#F1F5F9'
  const label = forced ? 'forzada' : planned ? 'planificada' : 'sin clasificar'
  return (
    <span style={{ display: 'inline-block', fontSize: 9.5, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: bg, color: col }}>
      {label}
    </span>
  )
}

// ─── Capacidad: barras horizontales por tecnología ───────────────────────────
function CapacityBars({ data }: { data: InstalledCapacity }) {
  const rows = data.by_type.slice(0, 14)
  const max = Math.max(1, ...rows.map((r) => r.mw))
  return (
    <div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
        <KPI label={`Capacidad total instalada · ${data.year}`} value={`${(data.total_mw / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} GW`} accent />
        <KPI label="Tecnologías" value={String(data.by_type.length)} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rows.map((r) => {
          const pct = Math.max(2, (r.mw / max) * 100)
          return (
            <div key={r.psr_type}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1d1d1f' }}>{r.label}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: ACCENT, fontFamily: 'var(--font-display)' }}>
                  {(r.mw / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} GW
                </span>
              </div>
              <div style={{ height: 7, background: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: ACCENT, borderRadius: 5, transition: 'width 300ms ease' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Embalses: sparkline + última cifra ──────────────────────────────────────
function HydroSpark({ data }: { data: HydroReservoirs }) {
  const pts = data.points
  const first = pts[0]
  const last = pts[pts.length - 1]
  const delta = last && first ? last.mwh - first.mwh : null
  return (
    <div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reserva almacenada</div>
          <div style={{ fontSize: 30, fontWeight: 700, fontFamily: 'var(--font-display)', color: ACCENT, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {data.latest_mwh != null ? `${(data.latest_mwh / 1000).toLocaleString('es-ES', { maximumFractionDigits: 0 })}` : '—'}
            <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 5, color: '#6e6e73' }}>GWh</span>
          </div>
          {data.latest_date && <div style={{ fontSize: 9.5, color: '#A0A0A5', marginTop: 2 }}>al {data.latest_date.slice(0, 10)}</div>}
        </div>
        {delta != null && (
          <KPI
            label="Variación 8 semanas"
            value={`${delta >= 0 ? '⇡' : '⇣'} ${Math.abs(delta / 1000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} GWh`}
            color={delta >= 0 ? ACCENT : '#DC2626'}
          />
        )}
      </div>
      <Sparkline points={pts} />
      <p style={{ margin: '8px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        Energía equivalente almacenada en los embalses hidroeléctricos (MWh), serie semanal de
        ENTSO-E. La reserva hidráulica condiciona la oferta de generación gestionable y los precios.
      </p>
    </div>
  )
}

function Sparkline({ points }: { points: HydroPoint[] }) {
  const path = useMemo(() => {
    if (points.length < 2) return null
    const W = 1080, H = 120, P = 8
    const vals = points.map((p) => p.mwh)
    const max = Math.max(...vals)
    const min = Math.min(...vals)
    const range = max - min || 1
    const n = points.length
    const x = (i: number) => P + (i / (n - 1)) * (W - 2 * P)
    const y = (v: number) => P + (1 - (v - min) / range) * (H - 2 * P)
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.mwh).toFixed(1)}`).join(' ')
    const area = `${line} L${x(n - 1).toFixed(1)},${(H - P).toFixed(1)} L${x(0).toFixed(1)},${(H - P).toFixed(1)} Z`
    return { W, H, line, area, points, x, y }
  }, [points])

  if (!path) {
    return <div style={{ fontSize: 11.5, color: '#86868b' }}>Serie insuficiente para graficar.</div>
  }
  return (
    <svg width="100%" viewBox={`0 0 ${path.W} ${path.H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="hydroArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
          <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={path.area} fill="url(#hydroArea)" stroke="none" />
      <path d={path.line} fill="none" stroke={ACCENT} strokeWidth={2} />
      {path.points.map((p, i) => (
        <circle key={p.timestamp} cx={path.x(i)} cy={path.y(p.mwh)} r={4} fill="transparent" style={{ cursor: 'crosshair' }}>
          <title>{p.timestamp.slice(0, 10)}: {(p.mwh / 1000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} GWh</title>
        </circle>
      ))}
    </svg>
  )
}

// ─── Estados y primitivas ────────────────────────────────────────────────────
function Loading({ label }: { label: string }) {
  return <div style={{ fontSize: 12, color: '#86868b' }}>{label}</div>
}

/** Empty-state honesto: distingue token ENTSO-E ausente del resto. */
function EntsoeEmpty({ err, normalMsg }: { err?: string | null; normalMsg: string }) {
  const tokenMissing = /token_missing|security_token|ENTSOE_SECURITY_TOKEN|unauthorized|no_token/i.test(err ?? '')
  return (
    <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.55 }}>
      {tokenMissing ? (
        <>
          <p style={{ margin: '0 0 8px' }}>Transparencia operativa ENTSO-E no disponible: falta el token de acceso.</p>
          <p style={{ margin: 0 }}>
            La API de <strong>ENTSO-E Transparency Platform</strong> requiere un token gratuito.
            Regístrate en{' '}
            <a href="https://transparency.entsoe.eu" target="_blank" rel="noreferrer" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>
              transparency.entsoe.eu
            </a>{' '}
            y añade{' '}
            <code style={{ fontFamily: 'monospace', background: '#F1F5F9', padding: '1px 4px', borderRadius: 3 }}>ENTSOE_SECURITY_TOKEN</code>{' '}
            en las variables de entorno de Vercel. El resto de la pestaña Política sigue operativo.
          </p>
        </>
      ) : (
        <>
          <p style={{ margin: 0 }}>{normalMsg}</p>
          {err && <p style={{ margin: '6px 0 0', fontSize: 10.5, color: '#A0A0A5' }}>{err}</p>}
        </>
      )}
    </div>
  )
}

function KPI({ label, value, accent, color }: { label: string; value: string; accent?: boolean; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, fontFamily: 'var(--font-display)', color: color ?? (accent ? ACCENT : '#1d1d1f'), letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  )
}

function Th({ children, w, right }: { children: React.ReactNode; w?: number; right?: boolean }) {
  return (
    <th
      style={{
        textAlign: right ? 'right' : 'left',
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#86868b',
        padding: '0 10px 8px 0',
        width: w,
      }}
    >
      {children}
    </th>
  )
}
function Td({ children, mono, dim, right }: { children: React.ReactNode; mono?: boolean; dim?: boolean; right?: boolean }) {
  return (
    <td
      style={{
        padding: '9px 10px 9px 0',
        verticalAlign: 'top',
        textAlign: right ? 'right' : 'left',
        color: dim ? '#6e6e73' : '#3a3a3d',
        fontFamily: mono ? 'monospace' : 'inherit',
        fontSize: mono ? 11 : 12,
        lineHeight: 1.4,
      }}
    >
      {children}
    </td>
  )
}

// ─── Fetch helper · envelope-safe (NUNCA lanza) ──────────────────────────────
async function get<T>(url: string): Promise<Envelope<T>> {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) {
      return { ok: false, data: null, error: `HTTP ${r.status}`, fetched_at: new Date().toISOString() }
    }
    return (await r.json()) as Envelope<T>
  } catch (e: unknown) {
    return { ok: false, data: null, error: e instanceof Error ? e.message : String(e), fetched_at: new Date().toISOString() }
  }
}
