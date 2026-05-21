'use client'
/**
 * `<MapaNarrativasGlobal />` · Tab 6 · Mapa Global de Narrativas.
 *
 * Inspirado en el Streamlit anterior: mapa mundial con eventos coloreados
 * por categoría · filtros window/region/category/relevance · KPIs arriba
 * · click evento → ficha de evento "Inteligencia política".
 *
 * Fuentes:
 *  - /api/medios/eventos-globales · agregador ACLED + GDELT
 *  - /api/medios/lectura · síntesis IA del evento (Groq fallback)
 */
import { useEffect, useState, useMemo } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const WORLD_GEO_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json'

const CATEGORY_COLORS: Record<string, string> = {
  'Justicia':            '#a855f7',
  'Política Exterior':   '#3b82f6',
  'Sociedad':            '#10b981',
  'Deporte':             '#94a3b8',
  'Política Interior':   '#fbbf24',
  'Economía':            '#f97316',
  'Salud':               '#ec4899',
  'Medioambiente':       '#22c55e',
  'Seguridad Defensa':   '#dc2626',
}

const REGIONS = [
  { id: 'global',    label: 'Global' },
  { id: 'europa',    label: 'Europa' },
  { id: 'n-america', label: 'N.América' },
  { id: 's-america', label: 'S.América' },
  { id: 'asia',      label: 'Asia' },
  { id: 'africa',    label: 'África' },
]

interface Evento {
  id: string
  iso2: string
  country: string
  lat: number
  lon: number
  category: string
  relevance: number
  impact_es: boolean
  sentiment: number
  n_acled: number
  n_gdelt: number
  n_total: number
  titles: string[]
  cat_counts: Record<string, number>
}

interface MapaData {
  ok: boolean
  kpis: {
    eventos_activos: number
    relevancia_critica: number
    impacto_alto_es: number
    sentimiento_neg_pct: number
    sentimiento_pos_pct: number
  }
  eventos: Evento[]
  categories_available: string[]
}

export function MapaNarrativasGlobal() {
  const [region, setRegion] = useState<string>('global')
  const [category, setCategory] = useState<string>('todas')
  const [minRelevance, setMinRelevance] = useState<number>(0)
  const [view, setView] = useState<'relevancia' | 'sentimiento' | 'volumen'>('relevancia')
  const [data, setData] = useState<MapaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null)
  const [eventLectura, setEventLectura] = useState<string | null>(null)
  const [loadingLectura, setLoadingLectura] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ region, category, minRelevance: String(minRelevance) })
    fetch(`/api/medios/eventos-globales?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        if (!d.ok) setError(d.error || 'No se pudieron obtener eventos')
        else setData(d)
      })
      .catch((e) => alive && setError(String(e?.message ?? e)))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [region, category, minRelevance])

  // Generar lectura IA del evento seleccionado
  const askLectura = async () => {
    if (!selectedEvent) return
    setLoadingLectura(true); setEventLectura(null)
    try {
      const r = await fetch('/api/medios/lectura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tabId: 'mapa-global',
          query: `Evento en ${selectedEvent.country}`,
          context: {
            n_articles: selectedEvent.n_total,
            sample_titles: selectedEvent.titles,
            top_sources: [],
            actors: [{ name: selectedEvent.country, mentions: selectedEvent.n_total, sentiment: selectedEvent.sentiment }],
            sentiment: {
              score: selectedEvent.sentiment,
              positive: Math.round(selectedEvent.n_total * (selectedEvent.sentiment > 0 ? selectedEvent.sentiment : 0)),
              negative: Math.round(selectedEvent.n_total * (selectedEvent.sentiment < 0 ? -selectedEvent.sentiment : 0)),
              neutral: 0,
            },
          },
        }),
      })
      const d = await r.json()
      setEventLectura(d.lectura || d.error || 'Sin respuesta')
    } catch (e: any) {
      setEventLectura(String(e?.message ?? e))
    } finally {
      setLoadingLectura(false)
    }
  }

  // Eventos a mostrar (filtrados ya en el endpoint)
  const eventos = data?.eventos || []

  // Marker size en función de view
  const markerSize = (e: Evento) => {
    if (view === 'volumen') return Math.max(4, Math.min(24, Math.sqrt(e.n_total) * 1.6))
    if (view === 'sentimiento') return 8
    return Math.max(4, Math.min(20, e.relevance / 5))
  }
  const markerColor = (e: Evento) => {
    if (view === 'sentimiento') {
      if (e.sentiment > 0.15) return '#10b981'
      if (e.sentiment < -0.15) return '#dc2626'
      return '#94a3b8'
    }
    return CATEGORY_COLORS[e.category] || '#94a3b8'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Region tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRegion(r.id)}
            style={{
              padding: '8px 18px',
              border: `1.5px solid ${region === r.id ? '#0891B2' : '#e5e7eb'}`,
              background: region === r.id ? '#ecfeff' : '#fff',
              color: region === r.id ? '#0891B2' : '#475569',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
        <Field label="Categoría">
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
            <option value="todas">Todas</option>
            {data?.categories_available?.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label={`Relevancia mínima: ${minRelevance}`}>
          <input
            type="range" min={0} max={80} value={minRelevance}
            onChange={(e) => setMinRelevance(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </Field>
        <Field label="Vista">
          <select value={view} onChange={(e) => setView(e.target.value as any)} style={selectStyle}>
            <option value="relevancia">Relevancia (tamaño)</option>
            <option value="sentimiento">Sentimiento (color)</option>
            <option value="volumen">Volumen mediático</option>
          </select>
        </Field>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>
            Ventana: <strong>24h-30d</strong> · ACLED+GDELT
          </p>
        </div>
      </div>

      {/* KPIs */}
      {data?.kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          <Kpi label="Eventos activos" value={String(data.kpis.eventos_activos)} accent="#0891B2" />
          <Kpi label="Relevancia crítica" value={String(data.kpis.relevancia_critica)} accent="#dc2626" />
          <Kpi label="Impacto alto ES" value={String(data.kpis.impacto_alto_es)} accent="#f97316" />
          <Kpi label="Sentimiento neg." value={`${data.kpis.sentimiento_neg_pct.toFixed(0)}%`} accent="#dc2626" />
          <Kpi label="Sentimiento pos." value={`${data.kpis.sentimiento_pos_pct.toFixed(0)}%`} accent="#10b981" />
        </div>
      )}

      {/* Mapa */}
      <section style={{ background: '#0f172a', borderRadius: 12, padding: 14, position: 'relative' }}>
        {/* Leyenda */}
        <div style={{
          position: 'absolute', top: 18, left: 18, zIndex: 5,
          background: 'rgba(15,23,42,0.85)', color: '#fff', padding: 10, borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: 10,
        }}>
          <p style={{ fontWeight: 700, margin: '0 0 6px', fontSize: 10, opacity: 0.85, letterSpacing: 0.4 }}>CATEGORÍAS</p>
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '2px 0' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ opacity: 0.9 }}>{cat}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Cargando eventos globales (ACLED + GDELT)…
          </div>
        ) : error ? (
          <div style={{ padding: 24, color: '#fca5a5' }}>⚠ {error}</div>
        ) : (
          <ComposableMap
            projectionConfig={{ scale: 145 }}
            style={{ width: '100%', height: 480 }}
            projection="geoEqualEarth"
          >
            <Geographies geography={WORLD_GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: { fill: '#1e293b', stroke: '#0f172a', strokeWidth: 0.5, outline: 'none' },
                      hover: { fill: '#334155', outline: 'none' },
                      pressed: { fill: '#334155', outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>
            {eventos.map((e) => {
              const r = markerSize(e)
              const color = markerColor(e)
              const isSelected = selectedEvent?.id === e.id
              return (
                <Marker
                  key={e.id}
                  coordinates={[e.lon, e.lat]}
                  onClick={() => setSelectedEvent(e)}
                  style={{ default: { cursor: 'pointer' } }}
                >
                  <circle
                    r={r}
                    fill={color}
                    fillOpacity={e.impact_es ? 0.95 : 0.7}
                    stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.3)'}
                    strokeWidth={isSelected ? 2 : 0.8}
                  />
                </Marker>
              )
            })}
          </ComposableMap>
        )}
      </section>

      {/* Ficha de evento */}
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, borderLeft: '4px solid #0891B2' }}>
        <p style={{ fontSize: 11, color: '#0891B2', fontWeight: 700, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          ⬢ Ficha de evento · Inteligencia política
        </p>
        {!selectedEvent ? (
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
            Selecciona un evento (círculo) en el mapa para análisis en profundidad.
          </p>
        ) : (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {selectedEvent.country}
                <span style={{
                  fontSize: 10, padding: '3px 10px', borderRadius: 999,
                  background: CATEGORY_COLORS[selectedEvent.category] + '22',
                  color: CATEGORY_COLORS[selectedEvent.category],
                  fontWeight: 700, marginLeft: 10, letterSpacing: 0.4, textTransform: 'uppercase',
                }}>
                  {selectedEvent.category}
                </span>
                {selectedEvent.impact_es && (
                  <span style={{
                    fontSize: 10, padding: '3px 10px', borderRadius: 999,
                    background: '#fef3c7', color: '#92400e',
                    fontWeight: 700, marginLeft: 6, letterSpacing: 0.4,
                  }}>
                    IMPACTO ES
                  </span>
                )}
              </h3>
              <button
                onClick={askLectura}
                disabled={loadingLectura}
                style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                {loadingLectura ? 'Generando…' : '✦ Lectura IA con Groq'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 12 }}>
              <Kpi label="Relevancia" value={`${selectedEvent.relevance.toFixed(0)} / 100`} accent="#0891B2" />
              <Kpi label="Volumen total" value={String(selectedEvent.n_total)} accent="#7c3aed" />
              <Kpi label="ACLED events" value={String(selectedEvent.n_acled)} accent="#dc2626" />
              <Kpi label="GDELT artículos" value={String(selectedEvent.n_gdelt)} accent="#1F4E8C" />
              <Kpi label="Sentimiento" value={`${(selectedEvent.sentiment * 100).toFixed(0)}%`} accent={selectedEvent.sentiment >= 0 ? '#10b981' : '#dc2626'} />
            </div>

            {selectedEvent.titles.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Titulares clave · GDELT últimas 24h
                </p>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: '#0f172a', lineHeight: 1.6 }}>
                  {selectedEvent.titles.slice(0, 5).map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}

            {Object.keys(selectedEvent.cat_counts).length > 1 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Mix de categorías en el flujo
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {Object.entries(selectedEvent.cat_counts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, n]) => (
                      <span key={cat} style={{
                        fontSize: 10, padding: '3px 8px', borderRadius: 999,
                        background: (CATEGORY_COLORS[cat] || '#94a3b8') + '22',
                        color: CATEGORY_COLORS[cat] || '#475569', fontWeight: 600,
                      }}>
                        {cat}: {n}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {eventLectura && (
              <div style={{ marginTop: 14, padding: 12, background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, borderLeft: '3px solid #7c3aed' }}>
                <p style={{ fontSize: 10, color: '#7c3aed', margin: 0, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  ✦ Análisis IA · Groq reasoning
                </p>
                <pre style={{ fontFamily: 'inherit', fontSize: 12, color: '#0f172a', lineHeight: 1.6, margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{eventLectura}</pre>
                <p style={{ fontSize: 9, color: '#94a3b8', margin: '10px 0 0', fontStyle: 'italic' }}>
                  Generado por IA · revisar antes de citar
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #e5e7eb',
  borderRadius: 6, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#0f172a',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</span>
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  )
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${accent}33`, borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: 10 }}>
      <p style={{ fontSize: 9, color: '#64748b', margin: 0, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: accent, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  )
}

export default MapaNarrativasGlobal
