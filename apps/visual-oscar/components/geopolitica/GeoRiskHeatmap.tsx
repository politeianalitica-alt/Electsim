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

interface HeatmapProps {
  /** Callback opcional al click en país. Si no se proporciona, drillea a /geopolitica/pais/[iso3]. */
  onCountryClick?: (iso3: string) => void
}

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

/** Sprint G14 FASE 3 cont · capas seleccionables (ya hay datos · solo cambio de mapeo). */
type LayerKey = 'score' | 'baseline' | 'acled_events' | 'acled_fatalities'

interface LayerDef {
  key: LayerKey
  label: string
  short: string
  get: (c: Country) => number
  /** Conversión valor → color 0-100 normalizado. */
  norm: (v: number) => number
  legend: { bands: Array<{ label: string; threshold: number; color: string }> }
}

const LAYERS: Record<LayerKey, LayerDef> = {
  score: {
    key: 'score', label: 'Risk Score · baseline + ACLED uplift', short: 'Risk',
    get: (c) => c.score,
    norm: (v) => v,
    legend: { bands: [
      { label: '< 30 estable', threshold: 30, color: '#84cc16' },
      { label: '30-54 vigilar', threshold: 55, color: '#f59e0b' },
      { label: '55-74 crisis', threshold: 75, color: '#f97316' },
      { label: '≥ 75 severo', threshold: 100, color: '#dc2626' },
    ]},
  },
  baseline: {
    key: 'baseline', label: 'Baseline Politeia · sin uplift eventos', short: 'Baseline',
    get: (c) => c.baseline_risk,
    norm: (v) => v,
    legend: { bands: [
      { label: '< 30 estable', threshold: 30, color: '#84cc16' },
      { label: '30-54 vigilar', threshold: 55, color: '#f59e0b' },
      { label: '55-74 crisis', threshold: 75, color: '#f97316' },
      { label: '≥ 75 severo', threshold: 100, color: '#dc2626' },
    ]},
  },
  acled_events: {
    key: 'acled_events', label: 'ACLED · eventos últimos 30d', short: 'Eventos',
    get: (c) => c.acled_events_30d,
    // Escala log para distribución típica ACLED (tail larga)
    norm: (v) => v <= 0 ? 0 : Math.min(100, Math.log10(v + 1) * 35),
    legend: { bands: [
      { label: '0 ningún evento', threshold: 1, color: '#1e293b' },
      { label: '1-10 baja', threshold: 11, color: '#84cc16' },
      { label: '11-50 media', threshold: 51, color: '#f59e0b' },
      { label: '51-200 alta', threshold: 201, color: '#f97316' },
      { label: '> 200 crítica', threshold: 9999, color: '#dc2626' },
    ]},
  },
  acled_fatalities: {
    key: 'acled_fatalities', label: 'ACLED · fatalidades últimos 30d', short: 'Fatalities',
    get: (c) => c.acled_fatalities_30d,
    norm: (v) => v <= 0 ? 0 : Math.min(100, Math.log10(v + 1) * 30),
    legend: { bands: [
      { label: '0 sin víctimas', threshold: 1, color: '#1e293b' },
      { label: '1-25 baja', threshold: 26, color: '#84cc16' },
      { label: '26-100 media', threshold: 101, color: '#f59e0b' },
      { label: '101-500 alta', threshold: 501, color: '#f97316' },
      { label: '> 500 crítica', threshold: 99999, color: '#dc2626' },
    ]},
  },
}

function layerColor(layer: LayerDef, c: Country | null): string {
  if (!c) return '#0f172a'
  const v = layer.get(c)
  const n = layer.norm(v)
  return scoreToColor(n)
}

export function GeoRiskHeatmap({ onCountryClick }: HeatmapProps = {}) {
  const router = useRouter()
  const [data, setData] = useState<HeatmapResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [Lib, setLib] = useState<any | null>(null)
  const [topology, setTopology] = useState<any | null>(null)
  const [hover, setHover] = useState<{ x: number; y: number; iso_num: string; name: string } | null>(null)
  const [layerKey, setLayerKey] = useState<LayerKey>('score')
  const layer = LAYERS[layerKey]

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
      <header style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#fbbf24', textTransform: 'uppercase' }}>
            ◆ World Risk Heatmap · {data?.countries?.length || 0} países · choropleth SVG
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
            Hover país → tooltip · click → drill país profundo. Cambia capa para alternar entre risk score, baseline curado, eventos ACLED y fatalities.
          </p>
        </div>
        {/* Sprint G14 FASE 3 cont · selector de capa */}
        <div style={{ display: 'flex', gap: 4, padding: 3, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, flexShrink: 0 }}>
          {(Object.keys(LAYERS) as LayerKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setLayerKey(k)}
              title={LAYERS[k].label}
              style={{
                background: layerKey === k ? '#fbbf24' : 'transparent',
                color: layerKey === k ? '#0f172a' : '#94a3b8',
                border: 'none', borderRadius: 3, padding: '4px 10px',
                fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{LAYERS[k].short}</button>
          ))}
        </div>
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
                      const fill = layerColor(layer, c || null)
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
                            if (!c) return
                            if (onCountryClick) onCountryClick(c.iso3)
                            else router.push(`/geopolitica/pais/${c.iso3}`)
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

            {/* Leyenda dinámica de la layer activa */}
            <div style={{
              position: 'absolute', bottom: 12, left: 12, background: 'rgba(15,23,42,0.92)',
              border: '1px solid #334155', borderRadius: 4, padding: '6px 10px',
              display: 'flex', flexDirection: 'column', gap: 4, fontSize: 9, color: '#cbd5e1',
              maxWidth: 320,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Capa: {layer.label}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {layer.legend.bands.map((b, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, background: b.color, borderRadius: 2, display: 'inline-block' }} />
                    <span style={{ color: '#94a3b8' }}>{b.label}</span>
                  </span>
                ))}
              </div>
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
