'use client'
/**
 * <EntsoeForecastRenovablesPanel /> · Sprint Energía · datos ENTSO-E extendidos
 *
 * Previsión eólica & solar day-ahead (documentType A69 · processType A01) de una
 * zona de oferta, vía ENTSO-E Transparency Platform. Muestra una serie por
 * tecnología (solar B16, eólica offshore B18, onshore B19) con su pico y media
 * MW, y — si la previsión de demanda está disponible vía /api/entsoe/load — el
 * porcentaje de cobertura renovable sobre la demanda prevista.
 *
 * Datos vía proxies:
 *   - GET /api/entsoe/forecast-renovables?zone=ES&days=2 → A69 por tecnología
 *   - GET /api/entsoe/load?zone=ES&days=2&forecast=1      → demanda prevista (opc.)
 * Envelope estándar Politeia { ok, data, error, fetched_at, source_url }.
 *
 * Degradación honesta: si ENTSOE_SECURITY_TOKEN no está, los endpoints devuelven
 * ok:false y el panel muestra un aviso discreto. El % sobre demanda se omite si
 * la demanda no está disponible (no se inventa). Cero deps · SVG/CSS inline.
 * Cero emojis.
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'
import type { EntsoePoint } from '@/lib/energia/types'

const ACCENT = '#16A34A' // verde energía
const PUBLIC_URL = 'https://transparency.entsoe.eu'

/** Color por psrType de tecnología (solar/eólica). */
const TECH_COLOR: Record<string, string> = {
  B16: '#F59E0B', // Solar
  B18: '#0EA5E9', // Eólica offshore
  B19: '#16A34A', // Eólica onshore
}

const ZONE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'ES', label: 'España' },
  { code: 'FR', label: 'Francia' },
  { code: 'DE_LU', label: 'Alemania' },
  { code: 'PT', label: 'Portugal' },
]

interface WindSolarTech {
  psr_type: string
  label: string
  points: EntsoePoint[]
  avg_mw: number | null
  peak_mw: number | null
}
interface WindSolarForecast {
  zone: string
  eic: string
  by_tech: WindSolarTech[]
}
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

const W = 280
const H = 70
const PAD = 6

/** Sparkline path para una serie de puntos normalizada a su propio rango. */
function sparkPath(points: EntsoePoint[]): string {
  if (points.length === 0) return ''
  const vals = points.map((p) => p.value)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const span = Math.max(1, hi - lo)
  const innerW = W - PAD * 2
  const innerH = H - PAD * 2
  const n = points.length
  return points
    .map((p, i) => {
      const x = PAD + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
      const y = PAD + innerH - ((p.value - lo) / span) * innerH
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function fmtMw(v: number | null): string {
  if (v == null) return '—'
  return v.toLocaleString('es-ES', { maximumFractionDigits: 0 })
}

/** % de cobertura renovable sobre demanda prevista, por media. Null si falta. */
function coveragePct(renovMw: number | null, demandMw: number | null): number | null {
  if (renovMw == null || demandMw == null || demandMw <= 0) return null
  return Math.round((renovMw / demandMw) * 1000) / 10
}

export function EntsoeForecastRenovablesPanel() {
  const [zone, setZone] = useState<string>('ES')
  const [forecast, setForecast] = useState<WindSolarForecast | null>(null)
  const [demand, setDemand] = useState<LoadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    setForecast(null)
    setDemand(null)

    const fcstReq = fetch(`/api/entsoe/forecast-renovables?zone=${zone}&days=2`, { cache: 'force-cache' })
      .then((r) => r.json() as Promise<Envelope<WindSolarForecast>>)
      .catch(() => ({ ok: false, data: null, error: 'network' }) as Envelope<WindSolarForecast>)
    const demReq = fetch(`/api/entsoe/load?zone=${zone}&days=2&forecast=1`, { cache: 'force-cache' })
      .then((r) => r.json() as Promise<Envelope<LoadData>>)
      .catch(() => ({ ok: false, data: null, error: 'network' }) as Envelope<LoadData>)

    Promise.all([fcstReq, demReq])
      .then(([fcstEnv, demEnv]) => {
        if (!alive) return
        if (fcstEnv.ok && fcstEnv.data) setForecast(fcstEnv.data)
        else setError(fcstEnv.error || 'sin_datos')
        if (demEnv.ok && demEnv.data) setDemand(demEnv.data)
      })
      .catch(() => alive && setError('network'))
      .finally(() => alive && setLoading(false))

    return () => {
      alive = false
    }
  }, [zone])

  /** Tecnologías ordenadas con su pico/media + sparkline. */
  const techs = useMemo(() => forecast?.by_tech ?? [], [forecast])

  /** Suma de la media renovable (todas las tecnologías) para % cobertura. */
  const totalAvg = useMemo(
    () => techs.reduce((acc, t) => acc + (t.avg_mw ?? 0), 0),
    [techs],
  )
  const totalPeak = useMemo(
    () => techs.reduce((acc, t) => acc + (t.peak_mw ?? 0), 0),
    [techs],
  )
  const covPct = coveragePct(totalAvg || null, demand?.avg_mw ?? null)

  const hasData = techs.length > 0
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
      title="Previsión eólica y solar D+1 (ENTSO-E)"
      subtitle="Previsión day-ahead por tecnología (A69) · 48h · cache 1h"
      sourceUrl={PUBLIC_URL}
      sourceLabel="ENTSO-E"
      sourceTooltip="Abrir ENTSO-E Transparency Platform"
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        {zoneSelector}
      </div>

      {loading && (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando previsión renovable…</p>
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
          <strong>Previsión renovable ENTSO-E no disponible.</strong>{' '}
          {error && error.startsWith('token_missing')
            ? 'Requiere el Web API Security Token de ENTSO-E.'
            : 'La fuente no devolvió previsión eólica/solar para esta zona ahora mismo.'}{' '}
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
          {/* Resumen agregado */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: covPct != null ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <Kpi label="Pico renovable" value={fmtMw(totalPeak || null)} unit="MW" color={ACCENT} />
            <Kpi label="Media renovable" value={fmtMw(totalAvg || null)} unit="MW" />
            {covPct != null && (
              <Kpi label="% s/ demanda prevista" value={covPct.toLocaleString('es-ES')} unit="%" color={ACCENT} />
            )}
          </div>

          {/* Series por tecnología */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {techs.map((t) => {
              const color = TECH_COLOR[t.psr_type] || ACCENT
              const path = sparkPath(t.points)
              return (
                <div
                  key={t.psr_type}
                  style={{
                    background: '#F6FBF7',
                    borderRadius: 8,
                    padding: '8px 12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span
                        style={{ width: 9, height: 9, borderRadius: 2, background: color, display: 'inline-block' }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>{t.label}</span>
                      <span style={{ fontSize: 9.5, color: '#94a3b8' }}>· {t.psr_type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#475569' }}>
                      <span>
                        Pico{' '}
                        <strong style={{ color: '#1d1d1f', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtMw(t.peak_mw)}
                        </strong>{' '}
                        MW
                      </span>
                      <span>
                        Media{' '}
                        <strong style={{ color: '#1d1d1f', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtMw(t.avg_mw)}
                        </strong>{' '}
                        MW
                      </span>
                    </div>
                  </div>
                  <svg
                    viewBox={`0 0 ${W} ${H}`}
                    width={140}
                    height={H}
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={`Previsión ${t.label}`}
                    style={{ overflow: 'visible' }}
                  >
                    {path && <path d={path} fill="none" stroke={color} strokeWidth={1.8} />}
                  </svg>
                </div>
              )
            })}
          </div>

          <p style={{ fontSize: 9, color: '#94a3b8', margin: '10px 0 0' }}>
            {covPct != null
              ? 'Cobertura % = media renovable prevista / demanda media prevista.'
              : 'Demanda prevista no disponible · se omite el % sobre demanda (no se estima).'}
          </p>
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

export default EntsoeForecastRenovablesPanel
