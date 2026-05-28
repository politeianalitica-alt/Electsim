'use client'
/**
 * <GeoRadarMap /> · Sprint GEO-RADAR C2
 *
 * Mapa mundial esquemático con un círculo por país coloreado según su
 * Índice de Riesgo Compuesto (IRC). Verde (estable) → ámbar (moderado)
 * → naranja (alto) → rojo (crítico).
 *
 * Sin Mapbox · proyección equirectangular SVG inline · cero deps.
 *
 * Consume /api/geopolitica/irc.
 * Click en país → callback onCountryClick(iso3) que el parent usa para
 * abrir el drawer.
 */
import { useEffect, useState } from 'react'
import { WorldMapBase } from './WorldMapBase'

interface CountryIRC {
  iso3: string
  name_es: string
  iso2: string
  lat: number
  lon: number
  region: string
  irc: number
  risk_level: 'bajo' | 'moderado' | 'alto' | 'critico'
  raw: { polyarchy: number | null; milex_pct_gdp: number | null; gdelt_articles_48h?: number }
}
interface Response {
  ok: boolean
  countries: CountryIRC[]
  summary: { total_countries: number; critical_risk_count: number; high_risk_count: number; avg_global_tone: number | null }
  _meta?: { sources: Array<{ name: string; url: string; role: string }>; methodology: string }
}

interface Props {
  onCountryClick?: (iso3: string) => void
  highlightRegion?: string             // opcional · oscurece países fuera de esta región
}

const W = 720, H = 360

function colorForIRC(irc: number): string {
  if (irc >= 75) return '#7f1d1d'       // crítico · rojo oscuro
  if (irc >= 55) return '#dc2626'       // alto · rojo
  if (irc >= 35) return '#f59e0b'       // moderado · ámbar
  return '#16a34a'                       // bajo · verde
}

function radiusForIRC(irc: number): number {
  // 3-8 px según IRC, log
  return Math.round(3 + (irc / 100) * 5)
}

export function GeoRadarMap({ onCountryClick, highlightRegion }: Props) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<CountryIRC | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/irc', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px', position: 'relative',
    }}>
      <header style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Mapa mundial de riesgo · Índice IRC compuesto
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
          V-Dem (40%) + SIPRI militarización (15%) + GDELT tono 48h (30%) + GDELT volumen conflictos (15%).
          Click en cualquier círculo para detalle. {data?.summary && `${data.summary.total_countries} países cubiertos.`}
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando IRC global…</p>}

      {!loading && data?.ok && (
        <>
          {/* G16 · WorldMapBase con contorno de países como capa base + puntos IRC encima */}
          <WorldMapBase
            width={W}
            height={H}
            bgColor="#f0f9ff"
            countryFill="#cbd5e1"
            countryStroke="#94a3b8"
            countryStrokeWidth={0.3}
          >
            {(project) => (
              <>
                {data.countries.map((c) => {
                  const { x, y } = project(c.lat, c.lon)
                  const dimmed = highlightRegion && c.region !== highlightRegion
                  const fill = colorForIRC(c.irc)
                  const r = radiusForIRC(c.irc)
                  return (
                    <g key={c.iso3}>
                      <circle
                        cx={x} cy={y} r={r}
                        fill={fill}
                        opacity={dimmed ? 0.2 : 0.9}
                        stroke="#fff" strokeWidth={0.8}
                        onMouseEnter={() => setHover(c)}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => onCountryClick?.(c.iso3)}
                        style={{ cursor: 'pointer' }}
                      />
                      {c.irc >= 75 && !dimmed && (
                        <circle cx={x} cy={y} r={r + 4} fill="none" stroke={fill} strokeWidth={0.8} opacity={0.5}>
                          <animate attributeName="r" values={`${r + 2};${r + 8};${r + 2}`} dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </g>
                  )
                })}
              </>
            )}
          </WorldMapBase>

          {/* Leyenda escala riesgo */}
          <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center', fontSize: 9, color: '#475569', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>IRC:</span>
            {[
              { label: 'Bajo · <35', color: '#16a34a' },
              { label: 'Moderado · 35-55', color: '#f59e0b' },
              { label: 'Alto · 55-75', color: '#dc2626' },
              { label: 'Crítico · ≥75', color: '#7f1d1d' },
            ].map((l) => (
              <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: l.color, borderRadius: '50%' }} />
                <span>{l.label}</span>
              </span>
            ))}
            <span style={{ marginLeft: 'auto', color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
              {data.summary.critical_risk_count} críticos · {data.summary.high_risk_count} alto · {data.summary.total_countries} total
            </span>
          </div>

          {/* Tooltip hover */}
          {hover && (
            <div style={{
              position: 'absolute', top: 60, right: 24,
              background: '#0f172a', color: '#fff',
              padding: '8px 12px', borderRadius: 8, fontSize: 11,
              maxWidth: 240, pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
                {hover.name_es} <span style={{ color: '#94a3b8', fontWeight: 400 }}>· {hover.iso3}</span>
              </p>
              <p style={{ margin: '4px 0 0', fontFamily: 'ui-monospace, monospace' }}>
                IRC <strong style={{ color: colorForIRC(hover.irc) }}>{hover.irc}</strong> · {hover.risk_level.toUpperCase()}
              </p>
              {hover.raw.polyarchy !== null && (
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#cbd5e1' }}>
                  V-Dem: {hover.raw.polyarchy.toFixed(2)}
                </p>
              )}
              {hover.raw.milex_pct_gdp !== null && (
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#cbd5e1' }}>
                  Milex: {hover.raw.milex_pct_gdp}% PIB
                </p>
              )}
              {hover.raw.gdelt_articles_48h !== undefined && (
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#cbd5e1' }}>
                  GDELT 48h: {hover.raw.gdelt_articles_48h} arts conflicto
                </p>
              )}
              <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>Click para más detalle →</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default GeoRadarMap
