'use client'
/**
 * <SpainPresenceMap /> · Sprint GEO-ES C5
 *
 * Mapa global con 4 dimensiones togglables:
 *   - economica · stock IED log-scaled
 *   - corporativa · # empresas IBEX
 *   - diplomatica · score embajadas + consulados + Cervantes
 *   - exports · exportaciones 2024 acumulado
 *
 * Click país → callback drawer (reusa riskDrawerIso).
 */
import { useEffect, useState } from 'react'
import { WorldMapBase } from '@/components/geopolitica/WorldMapBase'

interface CountryPresence {
  iso3: string; name_es: string; iso2: string
  lat: number; lon: number; region: string
  presence: {
    economica_score: number | null
    corporativa_count: number
    diplomatica: { embassy: boolean; consulates: number; cervantes: number; icex: boolean; military: boolean } | null
    fdi_stock_eur_bn: number | null
    exports_2024_eur_bn: number | null
    overall_score: number | null
  }
}

interface Response {
  ok: boolean
  countries: CountryPresence[]
  summary: { countries_with_presence: number; countries_with_ibex: number; countries_with_embassy: number; countries_with_cervantes: number; presence_catalog_size: number; ibex_catalog_size: number }
}

type Dim = 'economica' | 'corporativa' | 'diplomatica' | 'exports'

interface Props {
  onCountryClick?: (iso3: string) => void
}

const W = 720, H = 340

function colorEconomica(score: number | null): string {
  if (score === null || score === 0) return '#e2e8f0'
  if (score < 10) return '#86efac'
  if (score < 30) return '#16a34a'
  if (score < 60) return '#0891b2'
  return '#0c4a6e'
}

function colorCorporativa(count: number): string {
  if (count === 0) return '#e2e8f0'
  if (count <= 3) return '#86efac'
  if (count <= 8) return '#16a34a'
  return '#0c4a6e'
}

function colorDiplomatica(score: number): string {
  if (score === 0) return '#e2e8f0'
  if (score < 15) return '#fde68a'
  if (score < 30) return '#f59e0b'
  return '#dc2626'
}

function colorExports(usd: number | null): string {
  if (usd === null || usd === 0) return '#e2e8f0'
  if (usd < 1) return '#fef3c7'
  if (usd < 5) return '#f59e0b'
  if (usd < 15) return '#dc2626'
  return '#7f1d1d'
}

function diploScore(d: CountryPresence['presence']['diplomatica']): number {
  if (!d) return 0
  return (d.embassy ? 5 : 0) + d.consulates * 2 + d.cervantes * 3 + (d.icex ? 4 : 0) + (d.military ? 4 : 0)
}

export function SpainPresenceMap({ onCountryClick }: Props) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<CountryPresence | null>(null)
  const [dim, setDim] = useState<Dim>('exports')

  useEffect(() => {
    let alive = true
    fetch('/api/presencia-espana/mapa', { cache: 'force-cache' })
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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
            Mapa presencia España · 4 dimensiones togglables
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
            Económica (FDI stock) · Corporativa (IBEX-35) · Diplomática (embajadas+ICEX+Cervantes+misiones) · Exportaciones 2024
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {([
            { v: 'exports', l: 'Exports' },
            { v: 'economica', l: 'FDI' },
            { v: 'corporativa', l: 'IBEX' },
            { v: 'diplomatica', l: 'Diplomática' },
          ] as Array<{ v: Dim; l: string }>).map((o) => (
            <button
              key={o.v}
              onClick={() => setDim(o.v)}
              style={{
                padding: '4px 8px', borderRadius: 5,
                border: dim === o.v ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: dim === o.v ? '#0f172a' : '#fff',
                color: dim === o.v ? '#fff' : '#475569',
                fontSize: 10, fontWeight: 600, cursor: 'pointer',
              }}
            >{o.l}</button>
          ))}
        </div>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando mapa presencia España…</p>}

      {!loading && data?.ok && (
        <>
          {/* G20 item 17 · WorldMapBase con contorno de países + overlay España + países presencia */}
          <WorldMapBase
            width={W}
            height={H}
            bgColor="#fafaf9"
            countryFill="#e7e5e4"
            countryStroke="#a8a29e"
            countryStrokeWidth={0.3}
          >
            {(project) => (
              <>
                {/* España marcada en rojo grande con halo */}
                {data.countries.find((c) => c.iso3 === 'ESP') && (() => {
                  const esp = data.countries.find((c) => c.iso3 === 'ESP')!
                  const { x, y } = project(esp.lat, esp.lon)
                  return (
                    <g>
                      <circle cx={x} cy={y} r={12} fill="none" stroke="#dc2626" strokeWidth={1.2} opacity={0.4}>
                        <animate attributeName="r" values="10;16;10" dur="2.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={x} cy={y} r={8} fill="#dc2626" stroke="#fff" strokeWidth={2} />
                    </g>
                  )
                })()}

                {data.countries.map((c) => {
                  if (c.iso3 === 'ESP') return null
                  const { x, y } = project(c.lat, c.lon)
                  let fill = '#e2e8f0'
                  let r = 3
                  if (dim === 'economica') {
                    fill = colorEconomica(c.presence.economica_score)
                    r = c.presence.economica_score !== null ? 3 + Math.log10((c.presence.economica_score || 0) + 1) * 2 : 3
                  } else if (dim === 'corporativa') {
                    fill = colorCorporativa(c.presence.corporativa_count)
                    r = 3 + c.presence.corporativa_count * 0.5
                  } else if (dim === 'diplomatica') {
                    const ds = diploScore(c.presence.diplomatica)
                    fill = colorDiplomatica(ds)
                    r = 3 + ds * 0.2
                  } else {
                    fill = colorExports(c.presence.exports_2024_eur_bn)
                    r = c.presence.exports_2024_eur_bn ? 3 + Math.log10((c.presence.exports_2024_eur_bn || 0) + 1) * 3 : 3
                  }
                  return (
                    <circle key={c.iso3}
                      cx={x} cy={y} r={r}
                      fill={fill} opacity={0.9}
                      stroke="#fff" strokeWidth={0.8}
                      onMouseEnter={() => setHover(c)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => onCountryClick?.(c.iso3)}
                      style={{ cursor: 'pointer' }}
                    />
                  )
                })}
              </>
            )}
          </WorldMapBase>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 9, color: '#475569', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>España (rojo) + dimensión {dim.toUpperCase()}</span>
            <span style={{ marginLeft: 'auto', color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
              {data.summary.countries_with_presence} países presencia · {data.summary.countries_with_ibex} con IBEX · {data.summary.countries_with_cervantes} con Cervantes
            </span>
          </div>

          {hover && (
            <div style={{
              position: 'absolute', top: 60, right: 20,
              background: '#0f172a', color: '#fff',
              padding: '10px 14px', borderRadius: 8, fontSize: 11, maxWidth: 240,
              pointerEvents: 'none',
            }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{hover.name_es}</p>
              {hover.presence.exports_2024_eur_bn !== null && (
                <p style={{ margin: '4px 0 0', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}>
                  Exports 2024: <strong style={{ color: '#fbbf24' }}>€{hover.presence.exports_2024_eur_bn}bn</strong>
                </p>
              )}
              {hover.presence.fdi_stock_eur_bn !== null && (
                <p style={{ margin: '2px 0 0', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}>FDI stock: €{hover.presence.fdi_stock_eur_bn}bn</p>
              )}
              {hover.presence.corporativa_count > 0 && (
                <p style={{ margin: '2px 0 0', fontSize: 10 }}>IBEX: {hover.presence.corporativa_count} empresas</p>
              )}
              {hover.presence.diplomatica && (
                <p style={{ margin: '2px 0 0', fontSize: 10 }}>
                  {hover.presence.diplomatica.embassy ? '🏛 Embajada · ' : ''}
                  {hover.presence.diplomatica.cervantes > 0 ? `📚 ${hover.presence.diplomatica.cervantes} Cervantes` : ''}
                </p>
              )}
              <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>Click para drawer →</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default SpainPresenceMap
