'use client'
import { useState, useEffect } from 'react'
import { geoConicConformal, geoMercator, geoPath } from 'd3-geo'
import type { ExtendedFeatureCollection, GeoPermissibleObjects } from 'd3-geo'
import { useApi } from '@/lib/useApi'
import Skeleton, { LiveDot } from './Skeleton'
import CountUp from './CountUp'
import MapSkeleton from '@/components/maps/MapSkeleton'
import MapLegend from '@/components/maps/MapLegend'
import { positiveColorScale } from '@/lib/map-colors'

// ─── GeoJSON types ─────────────────────────────────────────────────────────────
interface GeoFeature { type: 'Feature'; properties: Record<string, unknown> | null; geometry: unknown }
interface GeoFC { type: 'FeatureCollection'; features: GeoFeature[] }

// ─── API data types ────────────────────────────────────────────────────────────
interface CCAARegion  { n: number; pos: number; neg: number; neu: number; sent_score: number; top_topics: string[] }
interface EuropeCountry { n: number; pos: number; neg: number; spain_imp: number; sample_titles: string[] }

// API name → GeoJSON name (actual names from spain-ccaa.geojson)
const API_TO_GEO: Record<string, string> = {
 'Madrid': 'Madrid',
 'Cataluña': 'Cataluña',
 'Andalucía': 'Andalucia',
 'Galicia': 'Galicia',
 'Castilla y León': 'Castilla-Leon',
 'Castilla-La Mancha': 'Castilla-La Mancha',
 'C. Valenciana': 'Valencia',
 'País Vasco': 'Pais Vasco',
 'Aragón': 'Aragon',
 'Asturias': 'Asturias',
 'Cantabria': 'Cantabria',
 'La Rioja': 'La Rioja',
 'Navarra': 'Navarra',
 'Extremadura': 'Extremadura',
 'Murcia': 'Murcia',
 'Baleares': 'Baleares',
 'Canarias': 'Canarias',
}
// Reverse: GeoJSON name → API name
const GEO_TO_API: Record<string, string> = Object.fromEntries(Object.entries(API_TO_GEO).map(([a, g]) => [g, a]))

const EUROPE_COUNTRIES: Array<{ name: string; lat: number; lon: number }> = [
  { name: 'Spain',          lat: 40.4, lon:  -3.7 },
  { name: 'France',         lat: 46.6, lon:   2.4 },
  { name: 'United Kingdom', lat: 51.5, lon:  -0.1 },
  { name: 'Germany',        lat: 51.2, lon:  10.5 },
  { name: 'Italy',          lat: 41.9, lon:  12.5 },
  { name: 'Portugal',       lat: 38.7, lon:  -9.1 },
  { name: 'Belgium',        lat: 50.8, lon:   4.4 },
  { name: 'Netherlands',    lat: 52.4, lon:   4.9 },
  { name: 'Greece',         lat: 38.0, lon:  23.7 },
  { name: 'Poland',         lat: 52.2, lon:  21.0 },
  { name: 'Switzerland',    lat: 46.8, lon:   8.2 },
  { name: 'Austria',        lat: 48.2, lon:  16.4 },
  { name: 'Sweden',         lat: 59.3, lon:  18.1 },
  { name: 'Norway',         lat: 59.9, lon:  10.7 },
  { name: 'Denmark',        lat: 55.7, lon:  12.6 },
  { name: 'Ireland',        lat: 53.3, lon:  -6.2 },
  { name: 'Czech Republic', lat: 50.1, lon:  14.4 },
  { name: 'Hungary',        lat: 47.5, lon:  19.0 },
  { name: 'Romania',        lat: 44.4, lon:  26.1 },
  { name: 'Ukraine',        lat: 50.4, lon:  30.5 },
  { name: 'Russia',         lat: 55.8, lon:  37.6 },
  { name: 'Turkey',         lat: 41.0, lon:  28.9 },
]

// ─── Main export ───────────────────────────────────────────────────────────────
export default function RegionalNewsMaps() {
  const [view, setView] = useState<'spain' | 'europe'>('spain')
  const [selected, setSelected] = useState<string | null>(null)

  const { data, source } = useApi<{ spain_ccaa: Record<string, CCAARegion>; europe: Record<string, EuropeCountry> }>(
 '/api/narratives/by-region?hours_back=72',
    { refreshInterval: 180_000 },
  )
  const spain  = data?.spain_ccaa ?? {}
  const europe = data?.europe ?? {}

  return (
 <section style={{ marginTop: 22 }}>
      {/* Header */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
 <div>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.018em', margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}>
 <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'} />
            Geografía de los debates
 </h2>
 <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0' }}>
            {view === 'spain'
              ? <><CountUp value={Object.values(spain).reduce((s, v) => s + v.n, 0)} /> noticias regionales</>
              : <><CountUp value={Object.values(europe).reduce((s, v) => s + v.n, 0)} /> noticias europeas</>}
 </p>
 </div>
 <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
          {(['spain', 'europe'] as const).map(v => (
 <button key={v} onClick={() => { setView(v); setSelected(null) }} style={{
              background: view === v ? '#fff' : 'transparent',
              color: view === v ? '#1d1d1f' : '#6e6e73',
              border: 'none', borderRadius: 999, padding: '5px 14px',
              fontSize: 11.5, fontWeight: view === v ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 160ms',
            }}>
              {v === 'spain' ? 'España (CCAA)' : 'Europa'}
 </button>
          ))}
 </div>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 18 }}>
        {/* Map */}
 <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {view === 'spain'
            ? <SpainCCAAMap spain={spain} selected={selected} onSelect={setSelected} />
            : <EuropeMap europe={europe} selected={selected} onSelect={setSelected} />}
 </div>

        {/* Detail panel */}
 <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {selected
            ? view === 'spain'
              ? <CCAADetail name={selected} data={spain[selected]} />
              : <CountryDetail name={selected} data={europe[selected]} />
            : (
 <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
 <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, margin: '0 0 10px', letterSpacing: '-0.01em' }}>
                  {view === 'spain' ? 'Top CCAA por volumen' : 'Top países por volumen'}
 </h3>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(view === 'spain'
                    ? Object.entries(spain).sort((a, b) => b[1].n - a[1].n).slice(0, 8)
                    : Object.entries(europe).sort((a, b) => b[1].n - a[1].n).slice(0, 8)
                  ).map(([name, info]) => {
                    const total = info.pos + info.neg + ((info as CCAARegion).neu ?? 0)
                    const polarity = total > 0 ? (info.pos - info.neg) / total : 0
                    return (
 <button key={name} onClick={() => setSelected(name)} style={{
                        display: 'grid', gridTemplateColumns: '1fr 50px 70px', gap: 8, alignItems: 'center',
                        padding: '7px 10px', background: '#FAFAFB', border: '1px solid #ECECEF',
                        borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      }}>
 <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
 <span style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink-2)' }}><CountUp value={info.n} /></span>
 <span style={{ fontSize: 10, color: polarity > 0.1 ? '#16A34A' : polarity < -0.1 ? '#DC2626' : 'var(--ink-4)', fontWeight: 600, textAlign: 'right' }}>
                          {polarity > 0 ? '+' : ''}{polarity.toFixed(2)} sent
 </span>
 </button>
                    )
                  })}
                  {(view === 'spain' ? Object.keys(spain) : Object.keys(europe)).length === 0 && (
 <Skeleton width="100%" height={200} radius={8} />
                  )}
 </div>
 <p style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 'auto', paddingTop: 12, fontStyle: 'italic' }}>
                  Click en una región del mapa para ver el detalle.
 </p>
 </div>
            )}
 </div>
 </div>
 </section>
  )
}

// ── SpainCCAAMap — real GeoJSON choropleth ─────────────────────────────────────
function SpainCCAAMap({ spain, selected, onSelect }: { spain: Record<string, CCAARegion>; selected: string | null; onSelect: (n: string) => void }) {
  const [geoData, setGeoData] = useState<GeoFC | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [hoverName, setHoverName] = useState<string | null>(null)

  useEffect(() => {
    fetch('/geodata/spain-ccaa.geojson')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<GeoFC> })
      .then(setGeoData)
      .catch(e => setGeoError((e as Error).message))
  }, [])

  const maxN = Math.max(1, ...Object.values(spain).map(v => v.n))
  const colorFn = positiveColorScale([0, maxN])

  const MAP_W = 500, MAP_H = 320, INS_W = 110, INS_H = 62

  const peninsulaFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => !String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null
  const canariasFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null

  const mainProj = peninsulaFC
    ? geoConicConformal().parallels([36, 44]).rotate([4, 0]).fitSize([MAP_W, MAP_H], peninsulaFC as unknown as ExtendedFeatureCollection)
    : null
  const canProj = canariasFC && canariasFC.features.length > 0
    ? geoMercator().fitSize([INS_W, INS_H], canariasFC as unknown as ExtendedFeatureCollection)
    : null
  const mainPath = mainProj ? geoPath(mainProj) : null
  const canPath  = canProj  ? geoPath(canProj)  : null

  function getApiName(geoName: string): string {
    return GEO_TO_API[geoName] ?? geoName
  }

  if (geoError) return <div style={{ color: '#c42c2c', fontSize: 12 }}>Error: {geoError}</div>
  if (!geoData)  return <MapSkeleton height={340} />

  return (
 <div>
 <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
        Mapa de España · click para detalle
 </div>
 <div style={{ position: 'relative' }}>
 <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          style={{ width: '100%', height: 'auto' }}
          role="img"
          aria-label="Mapa CCAA España — volumen de noticias"
        >
          {peninsulaFC && mainPath && peninsulaFC.features.map((f, i) => {
            const d = mainPath(f as unknown as GeoPermissibleObjects)
            if (!d) return null
            const geoName  = String(f.properties?.name ?? '')
            const apiName  = getApiName(geoName)
            const region   = spain[apiName]
            const n        = region?.n ?? 0
            const isSelected = selected === apiName
            const isHover    = hoverName === geoName
            return (
 <path
                key={i}
                d={d}
                fill={n > 0 ? colorFn(n) : '#e2e8f0'}
                stroke={isSelected ? '#1F4E8C' : isHover ? '#94a3b8' : '#cbd5e1'}
                strokeWidth={isSelected ? 2 : isHover ? 1.5 : 0.8}
                style={{ cursor: 'pointer', transition: 'stroke 120ms' }}
                tabIndex={0}
                role="button"
                aria-label={`${apiName}: ${n} artículos`}
                onMouseEnter={() => setHoverName(geoName)}
                onMouseLeave={() => setHoverName(null)}
                onClick={() => onSelect(apiName)}
                onKeyDown={e => e.key === 'Enter' && onSelect(apiName)}
              >
 <title>{`${apiName} · ${n} artículos · sentimiento ${region?.sent_score?.toFixed(2) ?? '—'}`}</title>
 </path>
            )
          })}
 </svg>

        {/* Canarias inset */}
        {canariasFC && canPath && (
 <div style={{
            position: 'absolute', bottom: 0, left: 0,
            background: 'rgba(255,255,255,0.92)', borderRadius: 6, border: '1px solid #cbd5e1', padding: 2,
          }}>
 <div style={{ fontSize: 8, color: '#6e6e73', textAlign: 'center', fontWeight: 600, marginBottom: 1 }}>Canarias</div>
 <svg viewBox={`0 0 ${INS_W} ${INS_H}`} width={INS_W} height={INS_H} role="img" aria-label="Canarias">
              {canariasFC.features.map((f, i) => {
                const d = canPath(f as unknown as GeoPermissibleObjects)
                if (!d) return null
                const geoName = String(f.properties?.name ?? '')
                const apiName = getApiName(geoName)
                const n = spain[apiName]?.n ?? 0
                return (
 <path
                    key={i} d={d}
                    fill={n > 0 ? colorFn(n) : '#e2e8f0'}
                    stroke={selected === apiName ? '#1F4E8C' : '#cbd5e1'}
                    strokeWidth={selected === apiName ? 1.5 : 0.6}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelect(apiName)}
                  >
 <title>{`${apiName} · ${n} artículos`}</title>
 </path>
                )
              })}
 </svg>
 </div>
        )}
 </div>

 <MapLegend scale={colorFn} min={0} max={maxN} unit="arts." />
 </div>
  )
}

// ── EuropeMap — bubbles with d3 Mercator projection ────────────────────────────
function EuropeMap({ europe, selected, onSelect }: { europe: Record<string, EuropeCountry>; selected: string | null; onSelect: (n: string) => void }) {
  const W = 500, H = 360

  const europeBbox = {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [[[-25, 34], [45, 34], [45, 72], [-25, 72], [-25, 34]]] },
    properties: {},
  }
  const proj = geoMercator().fitExtent([[20, 20], [W - 20, H - 20]], europeBbox as unknown as ExtendedFeatureCollection)
  const max  = Math.max(1, ...Object.values(europe).map(v => v.n))

  function px(lat: number, lon: number): [number, number] {
    return proj([lon, lat]) ?? [0, 0]
  }

  return (
 <div>
 <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
        Mapa de Europa · click para detalle
 </div>
 <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', background: '#FAFAFB', borderRadius: 12 }} role="img" aria-label="Mapa Europa">
        {/* Graticule */}
        {[40, 50, 60].map(lat => { const [,y] = px(lat, 0); return <line key={lat} x1={0} x2={W} y1={y} y2={y} stroke="#ECECEF" strokeWidth={0.5} /> })}
        {[-10, 0, 10, 20, 30, 40].map(lon => { const [x] = px(0, lon); return <line key={lon} y1={0} y2={H} x1={x} x2={x} stroke="#ECECEF" strokeWidth={0.5} /> })}

        {/* Spain reference ring */}
        {(() => { const [x, y] = px(40.4, -3.7); return <circle cx={x} cy={y} r={28} fill="#1F4E8C0F" stroke="#1F4E8C" strokeWidth={1} strokeDasharray="3 3" /> })()}

        {/* Country bubbles */}
        {EUROPE_COUNTRIES.map(c => {
          const cdata = europe[c.name]
          const [x, y] = px(c.lat, c.lon)
          if (!cdata || cdata.n === 0) return <circle key={c.name} cx={x} cy={y} r={2.5} fill="#D1D5DB" opacity={0.4} />
          const r = 5 + Math.sqrt(cdata.n / max) * 22
          const polarity = cdata.pos - cdata.neg
          const fill = polarity > 0 ? '#16A34A' : polarity < 0 ? '#DC2626' : '#6E6E73'
          const isSel = selected === c.name
          return (
 <g key={c.name} style={{ cursor: 'pointer' }} onClick={() => onSelect(c.name)}>
 <circle cx={x} cy={y} r={r} fill={fill} fillOpacity={0.55} stroke={isSel ? '#1d1d1f' : fill} strokeWidth={isSel ? 2 : 0.8} />
              {cdata.spain_imp > 0 && <circle cx={x} cy={y} r={r + 3} fill="none" stroke="#DC2626" strokeWidth={1} strokeDasharray="2 2" opacity={0.7} />}
 <title>{`${c.name} · ${cdata.n} arts · pos ${cdata.pos} / neg ${cdata.neg}`}</title>
              {r > 10 && <text x={x} y={y + 3} textAnchor="middle" style={{ fontSize: 9, fontFamily: 'var(--font-display)', fill: '#fff', fontWeight: 600, pointerEvents: 'none' }}>{cdata.n}</text>}
 </g>
          )
        })}
 </svg>
 </div>
  )
}

// ── Detail panels ──────────────────────────────────────────────────────────────
function CCAADetail({ name, data }: { name: string; data?: CCAARegion }) {
  if (!data) return <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>Sin datos para {name}</p>
  const total = data.pos + data.neg + data.neu || 1
  return (
 <div>
 <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Comunidad autónoma</div>
 <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.015em', color: '#1d1d1f' }}>{name}</h3>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
 <Stat label="Noticias 72h" value={data.n} accent="#1F4E8C" />
 <Stat label="Polaridad" value={data.sent_score} accent={data.sent_score > 0.1 ? '#16A34A' : data.sent_score < -0.1 ? '#DC2626' : '#6E6E73'} decimals={2} />
 </div>
 <div style={{ marginBottom: 14 }}>
 <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>Distribución sentimiento</div>
 <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#F5F5F7' }}>
 <div style={{ width: `${(data.pos / total) * 100}%`, background: '#16A34A', transition: 'width 600ms' }} />
 <div style={{ width: `${(data.neu / total) * 100}%`, background: '#9CA3AF', transition: 'width 600ms' }} />
 <div style={{ width: `${(data.neg / total) * 100}%`, background: '#DC2626', transition: 'width 600ms' }} />
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
 <span style={{ color: '#16A34A', fontWeight: 600 }}>{data.pos}+</span>
 <span>{data.neu}=</span>
 <span style={{ color: '#DC2626', fontWeight: 600 }}>{data.neg}−</span>
 </div>
 </div>
      {data.top_topics.length > 0 && (
 <div>
 <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>Debates dominantes</div>
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {data.top_topics.map(t => <span key={t} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: '#EFF6FF', color: '#1F4E8C', fontWeight: 500, border: '1px solid #DBEAFE' }}>{t}</span>)}
 </div>
 </div>
      )}
 </div>
  )
}

function CountryDetail({ name, data }: { name: string; data?: EuropeCountry }) {
  if (!data) return <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>Sin datos para {name}</p>
  return (
 <div>
 <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>País</div>
 <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.015em', color: '#1d1d1f' }}>{name}</h3>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
 <Stat label="Artículos" value={data.n}   accent="#1F4E8C" />
 <Stat label="Sentiment +" value={data.pos}  accent="#16A34A" />
 <Stat label="Sentiment −" value={data.neg}  accent="#DC2626" />
 </div>
      {data.spain_imp > 0 && (
 <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 8, marginBottom: 12 }}>
 <div style={{ fontSize: 10, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Impacto España</div>
 <div style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', marginTop: 2 }}>
 <CountUp value={data.spain_imp} /> noticias con repercusión alta/crítica
 </div>
 </div>
      )}
      {data.sample_titles.length > 0 && (
 <div>
 <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>Titulares relevantes</div>
          {data.sample_titles.slice(0, 4).map((t, i) => (
 <div key={i} style={{ fontSize: 11.5, color: 'var(--ink-2)', padding: '6px 0', borderBottom: '1px solid var(--hairline)', lineHeight: 1.4 }}>{t}</div>
          ))}
 </div>
      )}
 </div>
  )
}

function Stat({ label, value, accent, decimals = 0 }: { label: string; value: number; accent: string; decimals?: number }) {
  return (
 <div style={{ padding: '8px 10px', background: '#FAFAFB', borderRadius: 8, border: '1px solid #ECECEF' }}>
 <div style={{ fontSize: 9.5, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 2 }}>{label}</div>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: accent, lineHeight: 1 }}>
 <CountUp value={value} decimals={decimals} />
 </div>
 </div>
  )
}
