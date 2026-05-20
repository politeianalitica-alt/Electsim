'use client'
import { useState, useEffect } from 'react'
import { geoConicConformal, geoMercator, geoPath } from 'd3-geo'
import type { ExtendedFeatureCollection, GeoPermissibleObjects } from 'd3-geo'
import { useApi } from '@/lib/useApi'
import MapSkeleton from '@/components/maps/MapSkeleton'

// ─── GeoJSON types ─────────────────────────────────────────────────────────────
interface GeoFeature {
  type: 'Feature'
  properties: Record<string, unknown> | null
  geometry: unknown
}
interface GeoFC {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

// ─── Data types ────────────────────────────────────────────────────────────────
interface LegItem {
  id?: string | number
  titulo?: string
  nivel?: string
  region?: string
  ai_impact_level?: string
  ai_relevance?: number
  ai_category?: string
  sectores_afectados?: string[]
  map_lat?: number
  map_lon?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SVG_W = 720
const SVG_H = 400
const INS_W = 160
const INS_H = 90

function dotColor(impact?: string): string {
  if (impact === 'high')   return '#c42c2c'
  if (impact === 'medium') return '#b25000'
  return '#1F4E8C'
}

function isCanarias(lat: number | undefined) { return typeof lat === 'number' && lat < 30 }
function isMainland(lat: number | undefined) { return typeof lat === 'number' && lat >= 36 }

// ─── Demo fallback ─────────────────────────────────────────────────────────────
const DEMO_ITEMS: LegItem[] = [
  { id: 1,  titulo: 'Real Decreto-ley energía renovable',  nivel: 'nacional',  region: 'Madrid',          ai_impact_level: 'high',   ai_relevance: 9, sectores_afectados: ['Energía', 'Industria'], map_lat: 40.42, map_lon: -3.70 },
  { id: 2,  titulo: 'Ley de Vivienda andaluza',            nivel: 'regional',  region: 'Andalucía',       ai_impact_level: 'high',   ai_relevance: 8, sectores_afectados: ['Vivienda'],             map_lat: 37.39, map_lon: -5.99 },
  { id: 3,  titulo: 'Decreto fiscalidad turismo',          nivel: 'regional',  region: 'Baleares',        ai_impact_level: 'medium', ai_relevance: 7, sectores_afectados: ['Turismo'],              map_lat: 39.57, map_lon:  2.65 },
  { id: 4,  titulo: 'Reforma sanidad pública',             nivel: 'regional',  region: 'Cataluña',        ai_impact_level: 'high',   ai_relevance: 9, sectores_afectados: ['Salud'],                map_lat: 41.39, map_lon:  2.17 },
  { id: 5,  titulo: 'Plan industrial automoción',          nivel: 'regional',  region: 'Galicia',         ai_impact_level: 'medium', ai_relevance: 7, sectores_afectados: ['Industria'],            map_lat: 42.88, map_lon: -8.55 },
  { id: 6,  titulo: 'PNL apoyo agricultura',               nivel: 'nacional',  region: 'Aragón',          ai_impact_level: 'medium', ai_relevance: 6, sectores_afectados: ['Agro'],                 map_lat: 41.65, map_lon: -0.89 },
  { id: 7,  titulo: 'Ordenanza tasas portuarias',          nivel: 'local',     region: 'Valencia',        ai_impact_level: 'low',    ai_relevance: 5, sectores_afectados: ['Logística'],            map_lat: 39.47, map_lon: -0.38 },
  { id: 8,  titulo: 'Decreto migración Canarias',          nivel: 'nacional',  region: 'Canarias',        ai_impact_level: 'high',   ai_relevance: 8, sectores_afectados: ['Inmigración'],          map_lat: 28.46, map_lon:-16.25 },
  { id: 9,  titulo: 'Ley educativa autonómica',            nivel: 'regional',  region: 'País Vasco',      ai_impact_level: 'medium', ai_relevance: 7, sectores_afectados: ['Educación'],            map_lat: 43.26, map_lon: -2.93 },
  { id: 10, titulo: 'Reforma laboral autonómica',          nivel: 'regional',  region: 'Asturias',        ai_impact_level: 'low',    ai_relevance: 5, sectores_afectados: ['Empleo'],               map_lat: 43.36, map_lon: -5.85 },
  { id: 11, titulo: 'Plan vivienda Murcia',                nivel: 'regional',  region: 'Murcia',          ai_impact_level: 'medium', ai_relevance: 6, sectores_afectados: ['Vivienda'],             map_lat: 37.99, map_lon: -1.13 },
  { id: 12, titulo: 'Decreto turismo Castilla',            nivel: 'regional',  region: 'Castilla y León', ai_impact_level: 'low',    ai_relevance: 5, sectores_afectados: ['Turismo'],              map_lat: 41.65, map_lon: -4.72 },
  { id: 13, titulo: 'Ordenanza energética Bilbao',         nivel: 'local',     region: 'País Vasco',      ai_impact_level: 'low',    ai_relevance: 4, sectores_afectados: ['Energía'],              map_lat: 43.26, map_lon: -2.93 },
  { id: 14, titulo: 'Plan agua Extremadura',               nivel: 'regional',  region: 'Extremadura',     ai_impact_level: 'medium', ai_relevance: 6, sectores_afectados: ['Agua', 'Agro'],         map_lat: 39.47, map_lon: -6.37 },
]

interface Props { sourcePath?: string }

export default function LegislationMap({ sourcePath = '/api/intelligence/legislation/impact' }: Props) {
  // GeoJSON state
  const [geoData, setGeoData] = useState<GeoFC | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/geodata/spain-ccaa.geojson')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<GeoFC> })
      .then(setGeoData)
      .catch(e => setGeoError((e as Error).message))
  }, [])

  // UI state
  const [level, setLevel] = useState('')
  const [minRelevance, setMinRelevance] = useState(6)
  const [daysBack, setDaysBack] = useState(30)
  const [hovered, setHovered] = useState<LegItem | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [selected, setSelected] = useState<LegItem | null>(null)

  // API
  const qs = new URLSearchParams({ min_relevance: String(minRelevance), days_back: String(daysBack), limit: '60' })
  if (level) qs.set('level', level)
  const { data, loading, refresh, source } = useApi<LegItem[]>(`${sourcePath}?${qs.toString()}`, { refreshInterval: 0 })
  const apiItems: LegItem[] = Array.isArray(data) ? data : []
  const baseItems = apiItems.length > 0 ? apiItems : DEMO_ITEMS

  const legislation = baseItems.filter(l => {
    if (level && l.nivel !== level) return false
    if (minRelevance > 0 && (l.ai_relevance ?? 0) < minRelevance) return false
    return true
  })

  const geoItems     = legislation.filter(l => typeof l.map_lat === 'number' && typeof l.map_lon === 'number' && l.map_lat !== 0)
  const mainItems     = geoItems.filter(l => isMainland(l.map_lat))
  const canariasItems = geoItems.filter(l => isCanarias(l.map_lat))
  const topItems      = [...legislation].sort((a, b) => (b.ai_relevance ?? 0) - (a.ai_relevance ?? 0)).slice(0, 5)
  const breakdown = {
    high:   legislation.filter(l => l.ai_impact_level === 'high').length,
    medium: legislation.filter(l => l.ai_impact_level === 'medium').length,
    low:    legislation.filter(l => l.ai_impact_level === 'low').length,
  }

  // Build projections (only once geoData is loaded)
  const peninsulaFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => !String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null
  const canariasFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null

  const mainProjection = peninsulaFC
    ? geoConicConformal().parallels([36, 44]).rotate([4, 0]).fitSize([SVG_W, SVG_H], peninsulaFC as unknown as ExtendedFeatureCollection)
    : null
  const canariasProjection = canariasFC && canariasFC.features.length > 0
    ? geoMercator().fitSize([INS_W, INS_H], canariasFC as unknown as ExtendedFeatureCollection)
    : null

  const mainPathGen     = mainProjection     ? geoPath(mainProjection)     : null
  const canariasPathGen = canariasProjection ? geoPath(canariasProjection) : null

  function projectMain(lat: number, lon: number): [number, number] | null {
    return mainProjection ? mainProjection([lon, lat]) : null
  }
  function projectCanarias(lat: number, lon: number): [number, number] | null {
    return canariasProjection ? canariasProjection([lon, lat]) : null
  }

  return (
 <section style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 22, padding: '24px 28px', marginBottom: 18 }}>
      {/* Header */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
 <div>
 <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Mapa legislativo · Impacto territorial</h2>
 <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
            {legislation.length} normas · {geoItems.length} geolocalizadas · {source === 'mock' || apiItems.length === 0 ? 'datos demo' : 'datos en vivo'}
 </p>
 </div>
 <button onClick={() => refresh()} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid #e8e8ed', background: '#fff', fontSize: 11, fontWeight: 600, color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'Cargando…' : 'Actualizar'}
 </button>
 </div>

      {/* Filters */}
 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap', fontSize: 12 }}>
 <select value={level} onChange={e => setLevel(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'inherit' }}>
 <option value="">Todos niveles</option>
 <option value="nacional">Nacional</option>
 <option value="regional">Regional</option>
 <option value="local">Local</option>
 </select>
 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
 <span style={{ color: '#6e6e73', fontSize: 11 }}>Rel min</span>
 <input type="range" min={1} max={10} value={minRelevance} onChange={e => setMinRelevance(parseInt(e.target.value))} style={{ width: 100 }} />
 <span style={{ fontWeight: 700, fontSize: 12, width: 16 }}>{minRelevance}</span>
 </div>
 <select value={daysBack} onChange={e => setDaysBack(parseInt(e.target.value))}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'inherit' }}>
 <option value={7}>7 días</option>
 <option value={30}>30 días</option>
 <option value={90}>90 días</option>
 </select>
 </div>

      {/* Map area */}
      {geoError ? (
 <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c42c2c', fontSize: 13, border: '1px solid #fde8e8', borderRadius: 14, marginBottom: 16 }}>
          Error cargando mapa: {geoError}
 </div>
      ) : !geoData ? (
 <div style={{ marginBottom: 16 }}><MapSkeleton height={420} /></div>
      ) : (
 <div style={{ position: 'relative', background: 'linear-gradient(180deg, #f6f8fb 0%, #f0f3f8 100%)', borderRadius: 14, overflow: 'hidden', marginBottom: 16, height: 420 }}>
          {/* Main SVG — peninsula + Baleares */}
 <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ width: '100%', height: '100%' }}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Mapa de España con impacto legislativo por región"
          >
            {/* CCAA fills */}
            {peninsulaFC && mainPathGen && peninsulaFC.features.map((f, i) => {
              const d = mainPathGen(f as unknown as GeoPermissibleObjects)
              if (!d) return null
              return (
 <path
                  key={i}
                  d={d}
                  fill="#e2e8f0"
                  stroke="#cbd5e1"
                  strokeWidth={0.8}
                  aria-label={String(f.properties?.name ?? '')}
                />
              )
            })}

            {/* Impact dots — mainland */}
            {mainItems.map((item, i) => {
              const pos = projectMain(item.map_lat!, item.map_lon!)
              if (!pos) return null
              const [x, y] = pos
              const r = item.ai_impact_level === 'high' ? 9 : item.ai_impact_level === 'medium' ? 7 : 5.5
              const color = dotColor(item.ai_impact_level)
              return (
 <g
                  key={item.id ?? i}
                  style={{ cursor: 'pointer' }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${item.region ?? ''}: impacto ${item.ai_impact_level ?? 'bajo'}`}
                  onKeyDown={e => e.key === 'Enter' && setSelected(item)}
                >
 <circle cx={x} cy={y} r={r + 5} fill={color} fillOpacity={0.12}>
 <animate attributeName="r" values={`${r + 3};${r + 8};${r + 3}`} dur="2.4s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.18;0.04;0.18" dur="2.4s" repeatCount="indefinite" />
 </circle>
 <circle
                    cx={x} cy={y} r={r}
                    fill={color} fillOpacity={0.92}
                    stroke="white" strokeWidth={1.6}
                    onMouseEnter={e => {
                      setHovered(item)
                      const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect()
                      if (rect) setHoverPos({ x: (x / SVG_W) * rect.width, y: (y / SVG_H) * rect.height })
                    }}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(item)}
                  />
 </g>
              )
            })}
 </svg>

          {/* Canarias inset — bottom-left */}
 <div style={{
            position: 'absolute', bottom: 12, left: 12,
            width: INS_W + 4,
            background: 'rgba(255,255,255,0.92)',
            borderRadius: 8, border: '1px solid #cbd5e1', padding: 2,
          }}>
 <div style={{ fontSize: 8, color: '#6e6e73', textAlign: 'center', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 1 }}>Canarias</div>
 <svg viewBox={`0 0 ${INS_W} ${INS_H}`} width={INS_W} height={INS_H} role="img" aria-label="Canarias">
              {canariasFC && canariasPathGen && canariasFC.features.map((f, i) => {
                const d = canariasPathGen(f as unknown as GeoPermissibleObjects)
                if (!d) return null
                return <path key={i} d={d} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={0.8} />
              })}
              {canariasItems.map((item, i) => {
                const pos = projectCanarias(item.map_lat!, item.map_lon!)
                if (!pos) return null
                const [x, y] = pos
                const r = item.ai_impact_level === 'high' ? 7 : item.ai_impact_level === 'medium' ? 5.5 : 4
                return (
 <circle
                    key={item.id ?? i}
                    cx={x} cy={y} r={r}
                    fill={dotColor(item.ai_impact_level)} fillOpacity={0.9}
                    stroke="white" strokeWidth={1.2}
                    style={{ cursor: 'pointer' }}
                    aria-label={`${item.region ?? ''}: impacto ${item.ai_impact_level ?? 'bajo'}`}
                    onClick={() => setSelected(item)}
                    onMouseEnter={() => setHovered(item)}
                    onMouseLeave={() => setHovered(null)}
                  />
                )
              })}
 </svg>
 </div>

          {/* Impact legend */}
 <div style={{
            position: 'absolute', bottom: 12, right: 12,
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
            border: '1px solid #e8e8ed', borderRadius: 12, padding: '10px 14px',
            fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6,
          }}>
 <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73' }}>Impacto</div>
            {([{ c: '#c42c2c', l: 'Alto', n: breakdown.high }, { c: '#b25000', l: 'Medio', n: breakdown.medium }, { c: '#1F4E8C', l: 'Bajo', n: breakdown.low }] as const).map(x => (
 <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', minWidth: 100 }}>
 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
 <span style={{ width: 9, height: 9, borderRadius: 999, background: x.c }} />{x.l}
 </span>
 <span style={{ fontWeight: 700, color: '#1d1d1f' }}>{x.n}</span>
 </div>
            ))}
 </div>

          {/* Tooltip */}
          {hovered && (
 <div style={{
              position: 'absolute', pointerEvents: 'none',
              left: Math.min(hoverPos.x + 14, 520), top: Math.max(hoverPos.y - 30, 8),
              background: '#fff', border: '1px solid #e8e8ed', borderRadius: 10,
              padding: '10px 14px', boxShadow: '0 6px 22px rgba(0,0,0,0.10)', maxWidth: 280, fontSize: 12,
            }}>
 <p style={{ fontWeight: 600, color: '#1d1d1f', margin: '0 0 6px', lineHeight: 1.3 }}>{hovered.titulo}</p>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
 <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: dotColor(hovered.ai_impact_level), background: `${dotColor(hovered.ai_impact_level)}18` }}>
                  {hovered.ai_impact_level ?? '—'}
 </span>
                {hovered.region && <span style={{ color: '#6e6e73', fontSize: 11 }}>{hovered.region}</span>}
                {hovered.ai_relevance != null && <span style={{ color: '#1F4E8C', fontWeight: 700, fontSize: 11.5 }}>R{hovered.ai_relevance}</span>}
 </div>
 </div>
          )}
 </div>
      )}

      {/* Selected detail */}
      {selected && (
 <div style={{ marginBottom: 16, background: '#f5f9ff', border: '1px solid #cfe0f3', borderRadius: 14, padding: '14px 18px' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
 <div>
 <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{selected.titulo}</h4>
 <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: '#424245', flexWrap: 'wrap' }}>
 <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  color: dotColor(selected.ai_impact_level), background: `${dotColor(selected.ai_impact_level)}18` }}>
                  {selected.ai_impact_level ?? '—'}
 </span>
                {selected.nivel   && <span>Nivel: <strong>{selected.nivel}</strong></span>}
                {selected.region  && <span>Región: <strong>{selected.region}</strong></span>}
                {selected.ai_relevance != null && <span style={{ color: '#1F4E8C', fontWeight: 700 }}>R{selected.ai_relevance}</span>}
 </div>
 </div>
 <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'transparent', color: '#6e6e73', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              cerrar
 </button>
 </div>
          {(selected.sectores_afectados?.length ?? 0) > 0 && (
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selected.sectores_afectados!.map(s => (
 <span key={s} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontWeight: 600 }}>{s}</span>
              ))}
 </div>
          )}
 </div>
      )}

      {/* Bottom: top items + breakdown */}
 <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
 <div>
 <h3 style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 8px' }}>Normas con mayor relevancia</h3>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topItems.length === 0
              ? <p style={{ fontSize: 12, color: '#6e6e73', margin: '8px 0' }}>Sin normas en el periodo seleccionado.</p>
              : topItems.map((it, i) => (
 <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 10, fontSize: 12, cursor: 'pointer',
                }} onClick={() => setSelected(it)}>
 <span style={{
                    fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                    color: it.nivel === 'nacional' ? '#c42c2c' : it.nivel === 'regional' ? '#b25000' : '#1F4E8C',
                    background: it.nivel === 'nacional' ? 'rgba(196,44,44,0.12)' : it.nivel === 'regional' ? 'rgba(178,80,0,0.12)' : 'rgba(31,78,140,0.12)',
                  }}>{it.nivel ?? '—'}</span>
 <span style={{ flex: 1, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.titulo}</span>
                  {it.region && <span style={{ color: '#6e6e73', fontSize: 11 }}>{it.region}</span>}
 <span style={{ color: '#1F4E8C', fontWeight: 700, fontSize: 11.5 }}>R{it.ai_relevance ?? 0}</span>
 </div>
              ))}
 </div>
 </div>
 <div>
 <h3 style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 8px' }}>Por impacto</h3>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[{ label: 'Alto', count: breakdown.high, color: '#c42c2c' }, { label: 'Medio', count: breakdown.medium, color: '#b25000' }, { label: 'Bajo', count: breakdown.low, color: '#1F4E8C' }].map(b => (
 <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 10 }}>
 <span style={{ width: 10, height: 10, borderRadius: 999, background: b.color }} />
 <span style={{ fontSize: 12, color: '#1d1d1f', flex: 1 }}>{b.label}</span>
 <span style={{ fontSize: 14, fontWeight: 700 }}>{b.count}</span>
 </div>
            ))}
 <p style={{ fontSize: 10.5, color: '#6e6e73', textAlign: 'center', margin: '4px 0 0' }}>
              Total: <strong style={{ color: '#1d1d1f' }}>{legislation.length}</strong> normas
 </p>
 </div>
 </div>
 </div>
 </section>
  )
}
