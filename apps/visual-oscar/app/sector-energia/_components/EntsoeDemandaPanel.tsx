'use client'
/**
 * <EntsoeDemandaPanel /> · Sprint Energía · datos ENTSO-E extendidos
 *
 * Demanda eléctrica REAL vs PREVISIÓN day-ahead (documentType A65) de una zona
 * de oferta, vía ENTSO-E Transparency Platform. Compara la curva realizada
 * (processType A16) con la previsión (A01) y resume pico/valle/media MW + la
 * hora del pico de demanda.
 *
 * Datos vía proxies:
 *   - GET /api/entsoe/load?zone=ES&days=2            → demanda REAL (A16)
 *   - GET /api/entsoe/load?zone=ES&days=2&forecast=1 → previsión (A01)
 * Envelope estándar Politeia { ok, data, error, fetched_at, source_url }.
 *
 * Si ENTSOE_SECURITY_TOKEN no está configurado, los endpoints devuelven
 * ok:false y el panel muestra un aviso discreto orientando al visor oficial.
 * Cero deps · todo SVG/CSS inline. Cero emojis.
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'
import type { EntsoePoint } from '@/lib/energia/types'

const ACCENT = '#16A34A' // verde energía
const REAL_COLOR = '#16A34A'
const FCST_COLOR = '#0EA5E9'
const PUBLIC_URL = 'https://transparency.entsoe.eu'

/** Zonas seleccionables (subset estable de lib/entsoe/zones). */
const ZONE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'ES', label: 'España' },
  { code: 'FR', label: 'Francia' },
  { code: 'DE_LU', label: 'Alemania' },
  { code: 'PT', label: 'Portugal' },
]

/** Shape de /api/entsoe/load (EntsoeTotalLoad). */
interface LoadData {
  zone: string
  eic: string
  resolution_min: number
  points: EntsoePoint[]
  peak_mw: number | null
  min_mw: number | null
  avg_mw: number | null
}
interface Envelope<T> {
  ok: boolean
  data: T | null
  error?: string
  fetched_at?: string
  source_url?: string
}

const W = 560
const H = 150
const PAD = { top: 8, right: 8, bottom: 18, left: 8 }

/** Construye un path SVG (polilínea) a partir de puntos normalizados al lienzo. */
function buildPath(
  points: EntsoePoint[],
  minV: number,
  maxV: number,
): string {
  if (points.length === 0) return ''
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const span = Math.max(1, maxV - minV)
  const n = points.length
  return points
    .map((p, i) => {
      const x = PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
      const y = PAD.top + innerH - ((p.value - minV) / span) * innerH
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

/** Área cerrada bajo una polilínea (para sombrear la curva real). */
function buildArea(
  points: EntsoePoint[],
  minV: number,
  maxV: number,
): string {
  if (points.length === 0) return ''
  const line = buildPath(points, minV, maxV)
  const innerW = W - PAD.left - PAD.right
  const baseY = H - PAD.bottom
  const lastX = PAD.left + innerW
  return `${line} L${lastX.toFixed(1)},${baseY} L${PAD.left},${baseY} Z`
}

/** Hora local (HH:mm) del timestamp del pico de demanda. */
function peakHour(points: EntsoePoint[]): string | null {
  if (points.length === 0) return null
  let best = points[0]
  for (const p of points) if (p.value > best.value) best = p
  const d = new Date(best.timestamp)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function fmtMw(v: number | null): string {
  if (v == null) return '—'
  return v.toLocaleString('es-ES', { maximumFractionDigits: 0 })
}

export function EntsoeDemandaPanel() {
  const [zone, setZone] = useState<string>('ES')
  const [real, setReal] = useState<LoadData | null>(null)
  const [fcst, setFcst] = useState<LoadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    setReal(null)
    setFcst(null)

    const realReq = fetch(`/api/entsoe/load?zone=${zone}&days=2`, { cache: 'force-cache' })
      .then((r) => r.json() as Promise<Envelope<LoadData>>)
      .catch(() => ({ ok: false, data: null, error: 'network' }) as Envelope<LoadData>)
    const fcstReq = fetch(`/api/entsoe/load?zone=${zone}&days=2&forecast=1`, { cache: 'force-cache' })
      .then((r) => r.json() as Promise<Envelope<LoadData>>)
      .catch(() => ({ ok: false, data: null, error: 'network' }) as Envelope<LoadData>)

    Promise.all([realReq, fcstReq])
      .then(([realEnv, fcstEnv]) => {
        if (!alive) return
        if (realEnv.ok && realEnv.data) setReal(realEnv.data)
        if (fcstEnv.ok && fcstEnv.data) setFcst(fcstEnv.data)
        if (!(realEnv.ok && realEnv.data) && !(fcstEnv.ok && fcstEnv.data)) {
          setError(realEnv.error || fcstEnv.error || 'sin_datos')
        }
      })
      .catch(() => alive && setError('network'))
      .finally(() => alive && setLoading(false))

    return () => {
      alive = false
    }
  }, [zone])

  const { minV, maxV, realPath, realArea, fcstPath } = useMemo(() => {
    const all = [...(real?.points ?? []), ...(fcst?.points ?? [])]
    if (all.length === 0) {
      return { minV: 0, maxV: 1, realPath: '', realArea: '', fcstPath: '' }
    }
    const vals = all.map((p) => p.value)
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const pad = (hi - lo) * 0.08 || 1
    const minV = Math.max(0, lo - pad)
    const maxV = hi + pad
    return {
      minV,
      maxV,
      realPath: real ? buildPath(real.points, minV, maxV) : '',
      realArea: real ? buildArea(real.points, minV, maxV) : '',
      fcstPath: fcst ? buildPath(fcst.points, minV, maxV) : '',
    }
  }, [real, fcst])

  const hasData = !!real || !!fcst
  const peak = peakHour(real?.points ?? fcst?.points ?? [])
  const kpiSource = real ?? fcst

  const zoneSelector = (
    <select
      value={zone}
      onChange={(e) => setZone(e.target.value)}
      aria-label="Zona de oferta"
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#1d1d1f',
        border: '1px solid #ECECEF',
        borderRadius: 8,
        padding: '3px 8px',
        background: '#FAFAFA',
        cursor: 'pointer',
      }}
    >
      {ZONE_OPTIONS.map((z) => (
        <option key={z.code} value={z.code}>
          {z.label}
        </option>
      ))}
    </select>
  )

  return (
    <Panel
      title="Demanda eléctrica · real vs previsión (ENTSO-E)"
      subtitle="Curva realizada (A16) vs previsión day-ahead (A01) · 48h · cache 1h"
      sourceUrl={PUBLIC_URL}
      sourceLabel="ENTSO-E"
      sourceTooltip="Abrir ENTSO-E Transparency Platform"
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        {zoneSelector}
      </div>

      {loading && (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando demanda ENTSO-E…</p>
      )}

      {!loading && !hasData && (
        <div
          style={{
            padding: 12,
            background: '#fef9e7',
            border: '1px solid #fde68a',
            borderRadius: 8,
            fontSize: 11,
            color: '#92400e',
            lineHeight: 1.5,
          }}
        >
          <strong>Demanda ENTSO-E no disponible.</strong>{' '}
          {error === 'token_missing' || (error && error.startsWith('token_missing'))
            ? 'Requiere el Web API Security Token de ENTSO-E.'
            : 'La fuente no devolvió datos para esta zona ahora mismo.'}{' '}
          Consulta el visor oficial:{' '}
          <a
            href={PUBLIC_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}
          >
            transparency.entsoe.eu ↗
          </a>
        </div>
      )}

      {!loading && hasData && (
        <div>
          {/* KPIs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <Kpi label="Pico" value={`${fmtMw(kpiSource?.peak_mw ?? null)}`} unit="MW" color={ACCENT} />
            <Kpi label="Valle" value={`${fmtMw(kpiSource?.min_mw ?? null)}`} unit="MW" />
            <Kpi label="Media" value={`${fmtMw(kpiSource?.avg_mw ?? null)}`} unit="MW" />
            <Kpi label="Hora pico" value={peak ?? '—'} unit="" />
          </div>

          {/* Curva real vs previsión */}
          <div style={{ background: '#F6FBF7', borderRadius: 8, padding: '10px 12px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <p style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', margin: 0, letterSpacing: 0.5 }}>
                DEMANDA HORARIA · MW
              </p>
              <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#475569' }}>
                <LegendDot color={REAL_COLOR} label="Real (A16)" />
                <LegendDot color={FCST_COLOR} label="Previsión (A01)" dashed />
              </div>
            </div>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              height={H}
              preserveAspectRatio="none"
              role="img"
              aria-label="Demanda eléctrica horaria real vs previsión"
            >
              {realArea && <path d={realArea} fill={REAL_COLOR} fillOpacity={0.1} />}
              {fcstPath && (
                <path d={fcstPath} fill="none" stroke={FCST_COLOR} strokeWidth={1.6} strokeDasharray="4 3" />
              )}
              {realPath && <path d={realPath} fill="none" stroke={REAL_COLOR} strokeWidth={1.8} />}
            </svg>
            <p style={{ fontSize: 9, color: '#94a3b8', margin: '6px 0 0' }}>
              Eje vertical {fmtMw(minV)}–{fmtMw(maxV)} MW ·{' '}
              {real && fcst
                ? 'real sólida vs previsión punteada'
                : real
                  ? 'sólo serie real disponible'
                  : 'sólo previsión disponible'}
            </p>
          </div>
        </div>
      )}
    </Panel>
  )
}

function Kpi({
  label,
  value,
  unit,
  color = '#1d1d1f',
}: {
  label: string
  value: string
  unit: string
  color?: string
}) {
  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10, padding: '8px 10px' }}>
      <p style={{ fontSize: 9.5, color: '#6e6e73', margin: 0, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {label}
      </p>
      <p
        style={{
          margin: '2px 0 0',
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          fontWeight: 700,
          color,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {value}
        {unit && <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginLeft: 3 }}>{unit}</span>}
      </p>
    </div>
  )
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          width: 14,
          height: 0,
          borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}`,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  )
}

export default EntsoeDemandaPanel
