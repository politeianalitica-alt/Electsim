'use client'
/**
 * <DiplomaticMap /> · Sprint GEO-DIP C2
 *
 * Mapa global con 2 capas toggleables:
 *   - Sanciones · color según severity (low/medium/high/pariah)
 *   - Polarización AGNU · azul (alignment occidental) / rojo (oriental) / gris
 *
 * Consume /api/diplomacia/sanciones-mapa.
 */
import { useEffect, useState } from 'react'
import { WorldMapBase } from '@/components/geopolitica/WorldMapBase'

interface Country {
  iso3: string; name_es: string; iso2: string
  lat: number; lon: number; region: string
  alignment_west: number | null
  sanctions_count_estimate: 'none' | 'low' | 'medium' | 'high' | 'pariah' | null
  has_sanctions: boolean
}

interface Response {
  ok: boolean
  countries: Country[]
  summary: { total: number; with_sanctions: number; pariah_states: number; western_aligned: number; eastern_aligned: number; non_aligned: number; agnu_coverage: number }
}

type Layer = 'sanciones' | 'agnu'

const SANCTIONS_COLOR: Record<string, string> = {
  none: '#94a3b8',
  low: '#eab308',
  medium: '#f59e0b',
  high: '#dc2626',
  pariah: '#7f1d1d',
}

function colorForAgnu(alignment: number | null): string {
  if (alignment === null) return '#cbd5e1'
  if (alignment > 60) return '#1e40af'
  if (alignment > 20) return '#3b82f6'
  if (alignment > -20) return '#94a3b8'
  if (alignment > -60) return '#dc2626'
  return '#7f1d1d'
}

interface Props {
  onCountryClick?: (iso3: string) => void
}

const W = 720, H = 340

export function DiplomaticMap({ onCountryClick }: Props) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<Country | null>(null)
  const [layer, setLayer] = useState<Layer>('sanciones')

  useEffect(() => {
    let alive = true
    fetch('/api/diplomacia/sanciones-mapa', { cache: 'force-cache' })
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
            Mapa diplomático global · sanciones + polarización AGNU
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
            333+ fuentes consolidadas OpenSanctions · 13 resoluciones AGNU clave 2022-2025 · click país para detalle
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['sanciones', 'agnu'] as Layer[]).map((l) => (
            <button
              key={l}
              onClick={() => setLayer(l)}
              style={{
                padding: '4px 8px', borderRadius: 5,
                border: layer === l ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: layer === l ? '#0f172a' : '#fff',
                color: layer === l ? '#fff' : '#475569',
                fontSize: 10, fontWeight: 600, cursor: 'pointer',
              }}
            >{l === 'sanciones' ? 'Sanciones' : 'Polarización AGNU'}</button>
          ))}
        </div>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando mapa diplomático…</p>}

      {!loading && data?.ok && (
        <>
          {/* G19 item 13 · WorldMapBase con contorno de países + círculos diplomáticos */}
          <WorldMapBase
            width={W}
            height={H}
            bgColor={layer === 'agnu' ? '#f0f9ff' : '#fef2f2'}
            countryFill={layer === 'agnu' ? '#cbd5e1' : '#e2e8f0'}
            countryStroke="#94a3b8"
            countryStrokeWidth={0.3}
          >
            {(project) => (
              <>
                {data.countries.map((c) => {
                  const { x, y } = project(c.lat, c.lon)
                  const fill = layer === 'sanciones'
                    ? SANCTIONS_COLOR[c.sanctions_count_estimate || 'none']
                    : colorForAgnu(c.alignment_west)
                  const r = layer === 'sanciones' && c.sanctions_count_estimate === 'pariah' ? 7
                    : layer === 'sanciones' && c.has_sanctions ? 5
                    : 4
                  return (
                    <g key={c.iso3}>
                      <circle
                        cx={x} cy={y} r={r}
                        fill={fill} opacity={0.85}
                        stroke="#fff" strokeWidth={0.8}
                        onMouseEnter={() => setHover(c)}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => onCountryClick?.(c.iso3)}
                        style={{ cursor: 'pointer' }}
                      />
                    </g>
                  )
                })}
              </>
            )}
          </WorldMapBase>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center', fontSize: 9, color: '#475569', flexWrap: 'wrap' }}>
            {layer === 'sanciones' && (
              <>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>Sanciones:</span>
                {[{l:'sin',c:'#94a3b8'},{l:'low',c:'#eab308'},{l:'medium',c:'#f59e0b'},{l:'high',c:'#dc2626'},{l:'pariah',c:'#7f1d1d'}].map((x) => (
                  <span key={x.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, background: x.c, borderRadius: '50%' }} /><span>{x.l}</span>
                  </span>
                ))}
              </>
            )}
            {layer === 'agnu' && (
              <>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>AGNU:</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#1e40af', borderRadius: '50%' }} />pro-Occidente</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#94a3b8', borderRadius: '50%' }} />no alineado</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#7f1d1d', borderRadius: '50%' }} />pro-Oriental</span>
              </>
            )}
            <span style={{ marginLeft: 'auto', color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
              {data.summary.with_sanctions} sancionados · {data.summary.pariah_states} pariah · {data.summary.agnu_coverage} países AGNU
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
              <p style={{ margin: '4px 0 0', fontSize: 10 }}>
                Sanciones: <strong style={{ color: SANCTIONS_COLOR[hover.sanctions_count_estimate || 'none'] }}>{hover.sanctions_count_estimate || 'sin'}</strong>
              </p>
              {hover.alignment_west !== null && (
                <p style={{ margin: '2px 0 0', fontSize: 10 }}>
                  Alignment AGNU: <strong style={{ fontFamily: 'ui-monospace, monospace', color: colorForAgnu(hover.alignment_west) }}>{hover.alignment_west > 0 ? '+' : ''}{hover.alignment_west}</strong>
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

export default DiplomaticMap
