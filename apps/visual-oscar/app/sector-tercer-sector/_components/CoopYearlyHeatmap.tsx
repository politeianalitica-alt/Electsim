'use client'
/**
 * <CoopYearlyHeatmap /> · Tercer Sector v3 · Sprint IATI-MAX.
 *
 * Heatmap años × países (top-N) de desembolsos EUR. Consume el endpoint
 * `/api/tercer-sector/iati/yearly-disbursements` (Full Access) que devuelve
 * puntos sparse `{year, country_code, value_eur, count}` ya agregados Solr.
 *
 * Render: tabla densa con celdas coloreadas por intensidad (escala secuencial
 * verde) y tooltip al hover. Filas = países, columnas = años. Solo se pintan
 * los puntos con dato (no inventamos cero relleno).
 *
 * REQUIERE IATI_API_KEY (Datastore). Sin key → empty honesto.
 * Cero emojis · es-ES.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  ACCENT_DARK,
  CoopEmpty,
  CoopSkeleton,
  GREEN_RAMP,
  fmtEur,
  fmtInt,
  getEnvelope,
} from './CoopShared'

interface HeatmapPoint {
  year: number
  country_code: string
  country_name: string
  value_eur: number
  count: number
}
interface HeatmapData {
  points: HeatmapPoint[]
  years: number[]
  top_countries: Array<{ code: string; name: string; count: number }>
  total_value_eur: number
  total_count: number
}

interface CoopYearlyHeatmapProps {
  /** Acotar a una ONGD si el filtro de la vista está activo. */
  reportingOrg?: string | null
  /** Años para atrás (default 8). */
  yearsBack?: number
  /** Top-N países (default 12). */
  topN?: number
}

function rampColor(t: number): string {
  if (!Number.isFinite(t) || t <= 0) return '#FFFFFF'
  const idx = Math.min(GREEN_RAMP.length - 1, Math.floor(t * GREEN_RAMP.length))
  return GREEN_RAMP[idx]
}

export function CoopYearlyHeatmap({
  reportingOrg = null,
  yearsBack = 8,
  topN = 12,
}: CoopYearlyHeatmapProps) {
  const [data, setData] = useState<HeatmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [noKey, setNoKey] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setNoKey(false)
    setErr(null)
    const yearTo = new Date().getUTCFullYear()
    const yearFrom = yearTo - yearsBack + 1
    const params = new URLSearchParams({
      year_from: String(yearFrom),
      year_to: String(yearTo),
      top_n_countries: String(topN),
    })
    if (reportingOrg) params.set('reporting_org', reportingOrg)
    getEnvelope<HeatmapData>(
      `/api/tercer-sector/iati/yearly-disbursements?${params.toString()}`,
      ctrl.signal,
    ).then((env) => {
      if (ctrl.signal.aborted) return
      if (env.ok && env.data) setData(env.data)
      else if ((env.error ?? '').startsWith('no_key')) setNoKey(true)
      else if (env.error && env.error !== 'aborted') setErr(env.error)
      setLoading(false)
    })
    return () => ctrl.abort()
  }, [reportingOrg, yearsBack, topN])

  // Indice (country, year) → punto. Calcula también max para normalizar color.
  const { byKey, max, countriesOrdered, years } = useMemo(() => {
    if (!data) return { byKey: new Map<string, HeatmapPoint>(), max: 0, countriesOrdered: [], years: [] as number[] }
    const m = new Map<string, HeatmapPoint>()
    let mx = 0
    for (const p of data.points) {
      const k = `${p.country_code}|${p.year}`
      m.set(k, p)
      if (p.value_eur > mx) mx = p.value_eur
    }
    return {
      byKey: m,
      max: mx,
      countriesOrdered: data.top_countries,
      years: data.years,
    }
  }, [data])

  if (loading) return <CoopSkeleton height={320} />
  if (noKey) {
    return (
      <CoopEmpty>
        El heatmap requiere el IATI Datastore.{' '}
        <strong style={{ color: '#B45309' }}>Configura IATI_API_KEY</strong> para ver desembolsos por año × país.
      </CoopEmpty>
    )
  }
  if (err) return <CoopEmpty>No se pudo cargar el heatmap ({err}).</CoopEmpty>
  if (!data || data.points.length === 0) {
    return <CoopEmpty>Sin desembolsos EUR comparables en el rango.</CoopEmpty>
  }

  const norm = (v: number): number => {
    if (max <= 0) return 0
    return Math.log1p(v) / Math.log1p(max)
  }

  return (
    <div>
      <p style={{ fontSize: 11.5, color: '#64748B', margin: '0 0 8px' }}>
        Top {countriesOrdered.length} países × {years.length} años · {fmtInt(data.total_count)} transacciones EUR · suma{' '}
        <strong style={{ color: ACCENT_DARK }}>{fmtEur(data.total_value_eur)}</strong>
      </p>
      <div style={{ overflowX: 'auto', border: '1px solid #ECECEF', borderRadius: 10 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%', minWidth: 600 }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th
                style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  position: 'sticky',
                  left: 0,
                  background: '#F8FAFC',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#64748B',
                  borderBottom: '1px solid #E2E8F0',
                  minWidth: 160,
                }}
              >
                País
              </th>
              {years.map((y) => (
                <th
                  key={y}
                  style={{
                    padding: '8px 6px',
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#64748B',
                    borderBottom: '1px solid #E2E8F0',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {countriesOrdered.map((c) => (
              <tr key={c.code} style={{ borderTop: '1px solid #F1F5F9' }}>
                <td
                  style={{
                    padding: '6px 10px',
                    position: 'sticky',
                    left: 0,
                    background: '#fff',
                    fontWeight: 600,
                    color: '#0F172A',
                  }}
                >
                  {c.name}
                  <span style={{ marginLeft: 6, color: '#94A3B8', fontWeight: 400 }}>{c.code}</span>
                </td>
                {years.map((y) => {
                  const p = byKey.get(`${c.code}|${y}`)
                  const fill = p ? rampColor(norm(p.value_eur)) : '#F8FAFC'
                  return (
                    <td
                      key={y}
                      title={
                        p
                          ? `${c.name} · ${y} · ${fmtEur(p.value_eur)} (${fmtInt(p.count)} txs)`
                          : `${c.name} · ${y} · sin desembolsos EUR`
                      }
                      style={{
                        padding: '6px 4px',
                        textAlign: 'center',
                        background: fill,
                        color: p && norm(p.value_eur) > 0.55 ? '#fff' : '#475569',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: 10,
                        minWidth: 50,
                      }}
                    >
                      {p ? compactEur(p.value_eur) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 9.5, color: '#94A3B8' }}>menos</span>
        {GREEN_RAMP.map((c) => (
          <span key={c} style={{ width: 18, height: 8, background: c, borderRadius: 2, display: 'inline-block' }} />
        ))}
        <span style={{ fontSize: 9.5, color: '#94A3B8' }}>más EUR</span>
      </div>
    </div>
  )
}

function compactEur(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}G`
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(Math.round(v))
}

export default CoopYearlyHeatmap
