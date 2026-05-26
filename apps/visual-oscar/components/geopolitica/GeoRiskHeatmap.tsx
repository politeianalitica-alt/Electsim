'use client'
/**
 * `<GeoRiskHeatmap />` · Sprint G5 (original) → reescrito Sprint G14 FASE 3.
 *
 * Choropleth mundial con risk score 0-100 por país. Hover → tooltip con score,
 * región, eventos ACLED. Click → drill `/geopolitica/pais/[iso3]`.
 *
 * Sprint G14 FASE 3 · cambio crítico: PORTAR de Plotly (~600 KB) a
 * react-simple-maps (~80 KB, ya en bundle vía /puertos). Beneficios:
 *  - Bundle de /geopolitica se reduce significativamente
 *  - Look más sobrio y consistente con el resto de la app
 *  - Menos dependencias de runtime · sin iframe Plotly
 *  - Misma funcionalidad: choropleth + tooltip + click drill
 *  - Bonus: tooltip muestra band semaforizado + breakdown ACLED visible
 *
 * Inspirado en Verisk Maplecroft Country Risk Map + CFR Global Conflict Tracker.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ISO3_TO_NUM3 } from '@/lib/geopolitica/iso3-to-num3'

interface Country {
  iso3: string
  name: string
  region: string
  baseline_risk: number
  acled_events_30d: number
  acled_fatalities_30d: number
  score: number
  band: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
}

interface HeatmapResp {
  ok: boolean
  countries: Country[]
  methodology: string
  bands: Record<string, string>
}

const WORLD_GEOJSON = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Escala de color · score 0-100 → semáforo continuo verde→amber→rojo
function scoreToColor(score: number): string {
  if (score >= 75) return '#dc2626'  // CRITICO
  if (score >= 55) return '#f97316'  // ALTO
  if (score >= 30) return '#f59e0b'  // MEDIO
  if (score >= 1)  return '#84cc16'  // BAJO con datos
  return '#1e293b'                    // sin datos
}

function bandColor(band: string): string {
  return band === 'CRITICO' ? '#dc2626' : band === 'ALTO' ? '#f97316' : band === 'MEDIO' ? '#f59e0b' : '#16a34a'
}

export function GeoRiskHeatmap() {
  const router = useRouter()
  const [data, setData] = useState<HeatmapResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [Lib, setLib] = useState<any | null>(null)
  const [topology, setTopology] = useState<any | null>(null)
  const [hover, setHover] = useState<{ x: number; y: number; iso_num: string; name: string } | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/world-risk', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let cancel = false
    import('react-simple-maps').then((m) => !cancel && setLib(m)).catch(() => {})
    fetch(WORLD_GEOJSON)
      .then((r) => r.json())
      .then((t) => !cancel && setTopology(t))
      .catch(() => {})
    return () => { cancel = true }
  }, [])

  // Index países por ISO numeric (lo que usa world-atlas en geo.id)
  const byNum: Record<string, Country> = useMemo(() => {
    if (!data) return {}
    const m: Record<string, Country> = {}
    for (const c of data.countries) {
      const num3 = ISO3_TO_NUM3[c.iso3]
      if (num3) m[num3] = c
    }
    return m
  }, [data])

  // Tooltip · resolver con datos actuales
  const hoverCountry = hover ? byNum[hover.iso_num] : null

  return (
    <section style={{
      background: '#020617',
      border: '1px solid #1e293b',
      borderLeft: '4px solid #fbbf24',
      borderRadius: 12,
      padding: 18,
      color: '#f1f5f9',
      position: 'relative',
    }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#fbbf24', textTransform: 'uppercase' }}>
          ◆ World Risk Heatmap · {data?.countries?.length || 0} países · choropleth SVG
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
          Hover país → tooltip score + ACLED 30d · click → drill país profundo. Inspirado en Verisk Maplecroft + CFR Global Conflict Tracker.
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando datos…</p>}
      {!loading && (!Lib || !topology) && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando mapa mundial…</p>}

      {data && Lib && topology && (() => {
        const { ComposableMap, Geographies, Geography, ZoomableGroup } = Lib
        return (
          <div style={{ position: 'relative', width: '100%', borderRadius: 8, overflow: 'hidden', background: '#020617' }}>
            <ComposableMap
              projection="geoEqualEarth"
              projectionConfig={{ scale: 155 }}
              style={{ width: '100%', height: 520 }}
            >
              <ZoomableGroup center={[10, 25]} zoom={1} maxZoom={5}>
                <Geographies geography={topology}>
                  {({ geographies }: { geographies: any[] }) =>
                    geographies.map((geo) => {
                      const num3 = String(geo.id).padStart(3, '0')
                      const c = byNum[num3]
                      const fill = c ? scoreToColor(c.score) : '#0f172a'
                      const stroke = c ? '#020617' : '#1e293b'
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          style={{
                            default: { fill, stroke, strokeWidth: 0.4, outline: 'none', cursor: c ? 'pointer' : 'default' },
                            hover: { fill: c ? '#fbbf24' : '#1e293b', stroke: '#fbbf24', strokeWidth: 0.8, outline: 'none' },
                            pressed: { fill: c ? '#f59e0b' : '#1e293b', outline: 'none' },
                          }}
                          onMouseEnter={(evt: React.MouseEvent) => {
                            setHover({
                              x: evt.clientX,
                              y: evt.clientY,
                              iso_num: num3,
                              name: geo.properties?.name || 'Sin nombre',
                            })
                          }}
                          onMouseMove={(evt: React.MouseEvent) => {
                            if (hover) setHover({ ...hover, x: evt.clientX, y: evt.clientY })
                          }}
                          onMouseLeave={() => setHover(null)}
                          onClick={() => {
                            if (c) router.push(`/geopolitica/pais/${c.iso3}`)
                          }}
                        />
                      )
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>

            {/* Tooltip flotante */}
            {hover && (
              <div
                style={{
                  position: 'fixed',
                  top: hover.y + 12,
                  left: hover.x + 12,
                  background: '#0f172a',
                  color: '#f1f5f9',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '8px 10px',
                  fontSize: 11,
                  pointerEvents: 'none',
                  zIndex: 50,
                  minWidth: 180,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
                  {hoverCountry?.name || hover.name}
                </div>
                {hoverCountry ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ color: '#cbd5e1' }}>Score:</span>
                      <span style={{ fontWeight: 700, color: bandColor(hoverCountry.band) }}>
                        {hoverCountry.score}/100 · {hoverCountry.band}
                      </span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 10 }}>Región: {hoverCountry.region}</div>
                    <div style={{ color: '#94a3b8', fontSize: 10 }}>
                      ACLED 30d: <strong style={{ color: '#cbd5e1' }}>{hoverCountry.acled_events_30d}</strong> eventos
                      {hoverCountry.acled_fatalities_30d > 0 && (
                        <> · <strong style={{ color: '#fecaca' }}>{hoverCountry.acled_fatalities_30d}</strong> fatalities</>
                      )}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 9, color: '#64748b', fontStyle: 'italic' }}>
                      Click → drill país →
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#64748b', fontSize: 10 }}>
                    Sin datos de baseline · no en watchlist Politeia
                  </div>
                )}
              </div>
            )}

            {/* Leyenda + bandas */}
            <div style={{
              position: 'absolute', bottom: 12, left: 12, background: 'rgba(15,23,42,0.92)',
              border: '1px solid #334155', borderRadius: 4, padding: '6px 10px',
              display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 9, color: '#cbd5e1',
            }}>
              {Object.entries(data.bands).map(([k, label]) => (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: bandColor(k), borderRadius: 2, display: 'inline-block' }} />
                  <strong style={{ color: bandColor(k) }}>{k}</strong>
                  <span style={{ color: '#94a3b8' }}>· {label}</span>
                </span>
              ))}
            </div>
          </div>
        )
      })()}

      {data && (
        <p style={{ margin: '10px 0 0', fontSize: 9, color: '#64748b', lineHeight: 1.5 }}>
          {data.methodology}
        </p>
      )}
    </section>
  )
}

export default GeoRiskHeatmap
