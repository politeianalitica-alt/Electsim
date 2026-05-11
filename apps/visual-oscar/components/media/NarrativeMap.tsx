'use client'
import { useState, useEffect, useRef } from 'react'
import { geoConicConformal, geoMercator, geoNaturalEarth1, geoPath, geoCentroid } from 'd3-geo'
import type { ExtendedFeatureCollection, GeoPermissibleObjects } from 'd3-geo'
import MapSkeleton from '@/components/maps/MapSkeleton'
import MapLegend from '@/components/maps/MapLegend'
import { positiveColorScale, categoricalColor } from '@/lib/map-colors'

// ─── GeoJSON types ─────────────────────────────────────────────────────────────
interface GeoFeature { type: 'Feature'; properties: Record<string, unknown> | null; geometry: unknown; id?: string | number }
interface GeoFC { type: 'FeatureCollection'; features: GeoFeature[] }

// ─── API types (props — unchanged) ────────────────────────────────────────────
interface PaisItem { country_code: string; country_name: string; n_articulos: number; sentiment_avg: number; lat: number; lon: number }
interface CcaaItem { ccaa_id: number; nombre_ccaa: string; narrativa_dominante: string; n_articulos: number; ideologia_media: number }
interface NarrativeMapProps { paises: PaisItem[]; ccaas: CcaaItem[] }
type ViewMode = 'mundo' | 'europa' | 'espana'

// ─── Constants ─────────────────────────────────────────────────────────────────
const W = 900, H = 460
const INS_W = 198, INS_H = 110

const NARRATIVA_LABELS: Record<string, string> = {
  politica: 'Política', economia: 'Economía', justicia: 'Justicia',
  vivienda: 'Vivienda', sanidad: 'Sanidad', inmigracion: 'Inmigración',
  energia: 'Energía', educacion: 'Educación', generalista: 'Generalista',
}

// API nombre_ccaa → GeoJSON name (actual names from spain-ccaa.geojson)
const CCAA_TO_GEO: Record<string, string> = {
  'Andalucía':            'Andalucia',
  'Aragón':               'Aragon',
  'Asturias':             'Asturias',
  'Baleares':             'Baleares',
  'Canarias':             'Canarias',
  'Cantabria':            'Cantabria',
  'Castilla-La Mancha':   'Castilla-La Mancha',
  'Castilla y León':      'Castilla-Leon',
  'Cataluña':             'Cataluña',
  'Extremadura':          'Extremadura',
  'Galicia':              'Galicia',
  'La Rioja':             'La Rioja',
  'Madrid':               'Madrid',
  'Murcia':               'Murcia',
  'Navarra':              'Navarra',
  'País Vasco':           'Pais Vasco',
  'Comunitat Valenciana': 'Valencia',
}
const GEO_TO_CCAA: Record<string, string> = Object.fromEntries(Object.entries(CCAA_TO_GEO).map(([a, g]) => [g, a]))

// ─── Tooltip ───────────────────────────────────────────────────────────────────
interface TooltipState { x: number; y: number; lines: string[] }

function Tooltip({ tip }: { tip: TooltipState }) {
  return (
    <div style={{
      position: 'absolute', left: tip.x + 10, top: tip.y - 10, zIndex: 200, pointerEvents: 'none',
      background: '#0d1f3a', color: '#fff', borderRadius: 10, padding: '8px 12px',
      fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'nowrap',
      boxShadow: '0 4px 18px rgba(0,0,0,0.45)', border: '1px solid rgba(64,96,160,0.4)',
    }}>
      {tip.lines.map((l, i) => <div key={i} style={i === 0 ? { fontWeight: 700, marginBottom: 2 } : { opacity: 0.82 }}>{l}</div>)}
    </div>
  )
}

// ─── Sentiment color ───────────────────────────────────────────────────────────
function sentColor(s: number): string {
  if (s > 0.2) return '#00c47c'
  if (s > 0.05) return '#4dba87'
  if (s > -0.05) return '#6c7480'
  if (s > -0.2) return '#e07840'
  return '#c42c2c'
}

function bubbleR(n: number, max: number): number {
  return Math.min(Math.max((n / (max || 1)) * 28 + 5, 5), 32)
}

// ─── World / Europa GeoJSON map ────────────────────────────────────────────────
interface GeoMapProps { paises: PaisItem[]; worldData: GeoFC; mode: 'mundo' | 'europa' }

function GeoMap({ paises, worldData, mode }: GeoMapProps) {
  const [tip, setTip] = useState<TooltipState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const maxArt = paises.reduce((m, p) => Math.max(m, p.n_articulos), 0)
  const colorFn = positiveColorScale([0, maxArt])

  // For Europa mode: filter by centroid within Europe bbox
  const features = mode === 'mundo'
    ? worldData.features
    : worldData.features.filter(f => {
        const [lon, lat] = geoCentroid(f as unknown as GeoPermissibleObjects)
        return lon >= -25 && lon <= 45 && lat >= 34 && lat <= 72
      })

  const fc: GeoFC = { type: 'FeatureCollection', features }

  const projection = mode === 'mundo'
    ? geoNaturalEarth1().fitSize([W, H], fc as unknown as ExtendedFeatureCollection)
    : geoConicConformal().parallels([43, 62]).rotate([-15, 0]).fitSize([W, H], fc as unknown as ExtendedFeatureCollection)
  const pathGen = geoPath(projection)

  // Build lookup: country_code → PaisItem, country_name → PaisItem
  const byCode: Record<string, PaisItem> = {}
  const byName: Record<string, PaisItem> = {}
  for (const p of paises) {
    byCode[p.country_code.toUpperCase()] = p
    byName[p.country_name] = p
  }

  function getPais(f: GeoFeature): PaisItem | undefined {
    const id   = String(f.id ?? '').toUpperCase()
    const name = String(f.properties?.name ?? '')
    return byCode[id] ?? byName[name]
  }

  function handleEnter(p: PaisItem, e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, lines: [p.country_name, `${p.n_articulos.toLocaleString('es-ES')} artículos`, `Sentimiento: ${p.sentiment_avg.toFixed(2)}`] })
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', lineHeight: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', background: '#0b1422', borderRadius: 12 }} role="img" aria-label={`Mapa narrativo — ${mode}`}>
        {/* Country fills */}
        {features.map((f, i) => {
          const d = pathGen(f as unknown as GeoPermissibleObjects)
          if (!d) return null
          const p = getPais(f)
          return (
            <path
              key={i} d={d}
              fill={p && p.n_articulos > 0 ? colorFn(p.n_articulos) : '#1e293b'}
              stroke="rgba(255,255,255,0.08)" strokeWidth={0.4}
              style={p ? { cursor: 'pointer' } : undefined}
              onMouseEnter={p ? e => handleEnter(p, e) : undefined}
              onMouseLeave={p ? () => setTip(null) : undefined}
              aria-label={p ? `${p.country_name}: ${p.n_articulos} artículos` : undefined}
            />
          )
        })}

        {/* Proportional sentiment circles on data positions */}
        {paises.map(p => {
          const pos = projection([p.lon, p.lat])
          if (!pos) return null
          const [x, y] = pos
          const r = bubbleR(p.n_articulos, maxArt)
          return (
            <g key={p.country_code} style={{ cursor: 'pointer' }}
              onMouseEnter={e => handleEnter(p, e)}
              onMouseLeave={() => setTip(null)}>
              <circle cx={x} cy={y} r={r} fill={sentColor(p.sentiment_avg)} fillOpacity={0.75} stroke="rgba(255,255,255,0.5)" strokeWidth={0.5} />
              {r >= 12 && (
                <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={9} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {p.country_code.toUpperCase()}
                </text>
              )}
            </g>
          )
        })}

        {paises.length === 0 && (
          <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.35)" fontSize={14} fontFamily="-apple-system, system-ui, sans-serif">
            Sin datos · Conectando con backend…
          </text>
        )}
      </svg>
      {tip && <Tooltip tip={tip} />}
      <MapLegend scale={colorFn} min={0} max={maxArt} unit="arts." />
    </div>
  )
}

// ─── España CCAA map ───────────────────────────────────────────────────────────
function SpainMap({ ccaas }: { ccaas: CcaaItem[] }) {
  const [geoData, setGeoData] = useState<GeoFC | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [tip, setTip] = useState<TooltipState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/geodata/spain-ccaa.geojson')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<GeoFC> })
      .then(setGeoData)
      .catch(e => setGeoError((e as Error).message))
  }, [])

  const maxArt = ccaas.reduce((m, c) => Math.max(m, c.n_articulos), 0)

  const peninsulaFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => !String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null
  const canariasFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null

  const mainProj = peninsulaFC
    ? geoConicConformal().parallels([36, 44]).rotate([4, 0]).fitSize([W, H], peninsulaFC as unknown as ExtendedFeatureCollection)
    : null
  const canProj = canariasFC && canariasFC.features.length > 0
    ? geoMercator().fitSize([INS_W, INS_H], canariasFC as unknown as ExtendedFeatureCollection)
    : null
  const mainPath = mainProj ? geoPath(mainProj) : null
  const canPath  = canProj  ? geoPath(canProj)  : null

  // Build lookup: geoName → CcaaItem
  const byCcaa: Record<string, CcaaItem> = {}
  for (const c of ccaas) {
    const geoName = CCAA_TO_GEO[c.nombre_ccaa] ?? c.nombre_ccaa
    byCcaa[geoName] = c
  }

  function handleEnter(c: CcaaItem, e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, lines: [c.nombre_ccaa, NARRATIVA_LABELS[c.narrativa_dominante] ?? c.narrativa_dominante, `${c.n_articulos.toLocaleString('es-ES')} artículos`] })
  }

  const usedNarrativas = Array.from(new Set(ccaas.map(c => c.narrativa_dominante))).filter(n => n in NARRATIVA_LABELS)

  if (geoError) return <div style={{ color: '#c42c2c', fontSize: 12, padding: 12 }}>Error cargando mapa España: {geoError}</div>
  if (!geoData)  return <MapSkeleton height={H} />

  return (
    <div ref={containerRef} style={{ position: 'relative', lineHeight: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', background: '#0b1422', borderRadius: 12 }} role="img" aria-label="Mapa España CCAA — narrativas dominantes">
        {/* CCAA fills colored by narrativa_dominante */}
        {peninsulaFC && mainPath && peninsulaFC.features.map((f, i) => {
          const d = mainPath(f as unknown as GeoPermissibleObjects)
          if (!d) return null
          const geoName = String(f.properties?.name ?? '')
          const ccaa = byCcaa[geoName]
          const fill = ccaa ? categoricalColor(ccaa.narrativa_dominante) : '#1e293b'
          return (
            <path
              key={i} d={d}
              fill={fill} fillOpacity={0.75}
              stroke="rgba(255,255,255,0.1)" strokeWidth={0.6}
              style={ccaa ? { cursor: 'pointer' } : undefined}
              onMouseEnter={ccaa ? e => handleEnter(ccaa, e) : undefined}
              onMouseLeave={ccaa ? () => setTip(null) : undefined}
              aria-label={ccaa ? `${ccaa.nombre_ccaa}: ${NARRATIVA_LABELS[ccaa.narrativa_dominante] ?? ccaa.narrativa_dominante}` : undefined}
            />
          )
        })}

        {/* Proportional circles on centroids */}
        {peninsulaFC && mainProj && peninsulaFC.features.map((f, i) => {
          const geoName = String(f.properties?.name ?? '')
          const ccaa = byCcaa[geoName]
          if (!ccaa || ccaa.n_articulos === 0) return null
          const centroid = geoCentroid(f as unknown as GeoPermissibleObjects)
          const pos = mainProj(centroid)
          if (!pos) return null
          const [x, y] = pos
          const r = bubbleR(ccaa.n_articulos, maxArt)
          return (
            <circle key={`dot-${i}`} cx={x} cy={y} r={r}
              fill={categoricalColor(ccaa.narrativa_dominante)} fillOpacity={0.9}
              stroke="rgba(255,255,255,0.4)" strokeWidth={0.8}
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => handleEnter(ccaa, e)}
              onMouseLeave={() => setTip(null)}
            />
          )
        })}
      </svg>

      {/* Canarias inset */}
      {canariasFC && canPath && (
        <div style={{
          position: 'absolute', bottom: 8, left: 8,
          background: 'rgba(11,20,34,0.92)', borderRadius: 8, border: '1px solid rgba(64,96,160,0.3)', padding: 4,
        }}>
          <div style={{ fontSize: 8, color: '#8899bb', textAlign: 'center', fontWeight: 600, marginBottom: 2 }}>Canarias</div>
          <svg viewBox={`0 0 ${INS_W} ${INS_H}`} width={INS_W} height={INS_H} role="img" aria-label="Canarias">
            {canariasFC.features.map((f, i) => {
              const d = canPath(f as unknown as GeoPermissibleObjects)
              if (!d) return null
              const geoName = String(f.properties?.name ?? '')
              const ccaa = byCcaa[geoName]
              return (
                <path key={i} d={d}
                  fill={ccaa ? categoricalColor(ccaa.narrativa_dominante) : '#1e293b'}
                  fillOpacity={0.75}
                  stroke="rgba(255,255,255,0.1)" strokeWidth={0.6}
                >
                  {ccaa && <title>{ccaa.nombre_ccaa}: {ccaa.n_articulos} artículos</title>}
                </path>
              )
            })}
          </svg>
        </div>
      )}

      {/* Narrativa legend */}
      {usedNarrativas.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexWrap: 'wrap', gap: '6px 10px', justifyContent: 'center',
          background: 'rgba(11,20,34,0.82)', borderRadius: 10, padding: '6px 14px',
          maxWidth: '90%', zIndex: 10, border: '1px solid rgba(64,96,160,0.3)',
        }}>
          {usedNarrativas.map(n => (
            <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#cdd5e0', fontSize: 10.5, fontWeight: 500 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: categoricalColor(n), flexShrink: 0 }} />
              {NARRATIVA_LABELS[n] ?? n}
            </span>
          ))}
        </div>
      )}

      {tip && <Tooltip tip={tip} />}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function NarrativeMap({ paises, ccaas }: NarrativeMapProps) {
  const [view, setView] = useState<ViewMode>('mundo')

  const [worldData, setWorldData] = useState<GeoFC | null>(null)
  const [worldError, setWorldError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/geodata/world-countries.geojson')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<GeoFC> })
      .then(setWorldData)
      .catch(e => setWorldError((e as Error).message))
  }, [])

  const views: { id: ViewMode; label: string }[] = [
    { id: 'mundo',  label: 'Mundo' },
    { id: 'europa', label: 'Europa' },
    { id: 'espana', label: 'España CCAA' },
  ]

  return (
    <div style={{ fontFamily: '-apple-system, system-ui, sans-serif' }}>
      {/* Toggle */}
      <div style={{
        display: 'inline-flex', gap: 4, background: 'rgba(255,255,255,0.07)',
        borderRadius: 24, padding: 4, marginBottom: 14, border: '1px solid rgba(64,96,160,0.25)',
      }}>
        {views.map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            background: view === v.id ? '#2a4a9c' : 'transparent',
            color: view === v.id ? '#e8f0ff' : '#8899bb',
            border: 'none', borderRadius: 20, padding: '6px 16px',
            fontSize: 12.5, fontWeight: view === v.id ? 700 : 500,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms', whiteSpace: 'nowrap',
          }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Map area */}
      {(view === 'mundo' || view === 'europa') && (
        worldError
          ? <div style={{ color: '#c42c2c', fontSize: 12, padding: 12 }}>Error cargando mapa: {worldError}</div>
          : !worldData
            ? <MapSkeleton height={H} />
            : <GeoMap paises={paises} worldData={worldData} mode={view} />
      )}
      {view === 'espana' && <SpainMap ccaas={ccaas} />}
    </div>
  )
}
