'use client'
import { useState } from 'react'
import { useApi } from '@/lib/useApi'

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

const SVG_W = 720
const SVG_H = 360
const LAT_MIN = 36, LAT_MAX = 44, LON_MIN = -9, LON_MAX = 4

function project(lat: number, lon: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * SVG_W
  const y = SVG_H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * SVG_H
  return [x, y]
}

// Outline real de España peninsular construido a partir de coordenadas
// geográficas reales (lat, lon) y proyectado en la viewBox.
// 36 vértices clave: norte (Galicia → País Vasco) → Pirineos → costa este
// → costa sur → frontera con Portugal → Galicia.
const SPAIN_PATH = `
  M 33 28
  L 72 9
  L 174 16
  L 240 22
  L 307 35
  L 360 31
  L 399 33
  L 466 47
  L 526 60
  L 606 68
  L 682 77
  L 674 96
  L 619 117
  L 567 129
  L 539 152
  L 496 180
  L 477 204
  L 508 235
  L 471 254
  L 443 287
  L 410 308
  L 376 327
  L 312 332
  L 253 328
  L 227 338
  L 187 359
  L 177 356
  L 149 336
  L 113 303
  L 87 306
  L 95 270
  L 105 246
  L 102 220
  L 105 188
  L 114 151
  L 130 119
  L 127 99
  L 89 99
  L 50 95
  L 19 92
  L 16 84
  L 19 75
  L 12 60
  L 8 48
  L 33 28
  Z
`

// Portugal (silueta tenue como referencia geográfica)
const PORTUGAL_PATH = `
  M 8 48
  L 12 60
  L 19 75
  L 16 84
  L 19 92
  L 50 95
  L 89 99
  L 87 99
  L 70 130
  L 60 165
  L 55 210
  L 60 260
  L 70 295
  L 87 306
  L 87 306
  L 60 308
  L 30 290
  L 5 230
  L 0 170
  L 0 100
  L 8 48
  Z
`

// Posiciones aproximadas de 17 CCAA + Ceuta + Melilla en SVG
// (centroides aproximados — para etiquetas en hover/leyenda)
const CCAA_LABELS: Record<string, { x: number; y: number; name: string }> = {
  galicia:    { x: 60, y: 60,  name: 'Galicia' },
  asturias:   { x: 145, y: 38, name: 'Asturias' },
  cantabria:  { x: 225, y: 45, name: 'Cantabria' },
  pais_vasco: { x: 320, y: 55, name: 'País Vasco' },
  navarra:    { x: 380, y: 75, name: 'Navarra' },
  rioja:      { x: 320, y: 90, name: 'La Rioja' },
  aragon:     { x: 460, y: 130, name: 'Aragón' },
  cataluna:   { x: 580, y: 110, name: 'Cataluña' },
  cleon:      { x: 200, y: 130, name: 'Castilla y León' },
  madrid:     { x: 270, y: 175, name: 'Madrid' },
  cmancha:    { x: 320, y: 220, name: 'Castilla-La Mancha' },
  extremadura:{ x: 145, y: 220, name: 'Extremadura' },
  valencia:   { x: 470, y: 215, name: 'C. Valenciana' },
  murcia:     { x: 430, y: 280, name: 'Murcia' },
  andalucia:  { x: 240, y: 310, name: 'Andalucía' },
  baleares:   { x: 650, y: 215, name: 'Baleares' },
  canarias:   { x: 90, y: 320, name: 'Canarias' },
}

function dotColor(impact?: string) {
  if (impact === 'high') return '#c42c2c'
  if (impact === 'medium') return '#b25000'
  return '#1F4E8C'
}

// Datos demo fallback con coordenadas reales para que el mapa siempre muestre algo
const DEMO_ITEMS: LegItem[] = [
  { id: 1, titulo: 'Real Decreto-ley energía renovable', nivel: 'nacional', region: 'Madrid', ai_impact_level: 'high', ai_relevance: 9, sectores_afectados: ['Energía', 'Industria'], map_lat: 40.42, map_lon: -3.70 },
  { id: 2, titulo: 'Ley de Vivienda andaluza', nivel: 'regional', region: 'Andalucía', ai_impact_level: 'high', ai_relevance: 8, sectores_afectados: ['Vivienda'], map_lat: 37.39, map_lon: -5.99 },
  { id: 3, titulo: 'Decreto fiscalidad turismo', nivel: 'regional', region: 'Baleares', ai_impact_level: 'medium', ai_relevance: 7, sectores_afectados: ['Turismo'], map_lat: 39.57, map_lon: 2.65 },
  { id: 4, titulo: 'Reforma sanidad pública', nivel: 'regional', region: 'Cataluña', ai_impact_level: 'high', ai_relevance: 9, sectores_afectados: ['Salud'], map_lat: 41.39, map_lon: 2.17 },
  { id: 5, titulo: 'Plan industrial automoción', nivel: 'regional', region: 'Galicia', ai_impact_level: 'medium', ai_relevance: 7, sectores_afectados: ['Industria'], map_lat: 42.88, map_lon: -8.55 },
  { id: 6, titulo: 'PNL apoyo agricultura', nivel: 'nacional', region: 'Aragón', ai_impact_level: 'medium', ai_relevance: 6, sectores_afectados: ['Agro'], map_lat: 41.65, map_lon: -0.89 },
  { id: 7, titulo: 'Ordenanza tasas portuarias', nivel: 'local', region: 'Valencia', ai_impact_level: 'low', ai_relevance: 5, sectores_afectados: ['Logística'], map_lat: 39.47, map_lon: -0.38 },
  { id: 8, titulo: 'Decreto migración Canarias', nivel: 'nacional', region: 'Canarias', ai_impact_level: 'high', ai_relevance: 8, sectores_afectados: ['Inmigración'], map_lat: 28.46, map_lon: -16.25 },
  { id: 9, titulo: 'Ley educativa autonómica', nivel: 'regional', region: 'País Vasco', ai_impact_level: 'medium', ai_relevance: 7, sectores_afectados: ['Educación'], map_lat: 43.26, map_lon: -2.93 },
  { id: 10, titulo: 'Reforma laboral autonómica', nivel: 'regional', region: 'Asturias', ai_impact_level: 'low', ai_relevance: 5, sectores_afectados: ['Empleo'], map_lat: 43.36, map_lon: -5.85 },
  { id: 11, titulo: 'Plan vivienda Murcia', nivel: 'regional', region: 'Murcia', ai_impact_level: 'medium', ai_relevance: 6, sectores_afectados: ['Vivienda'], map_lat: 37.99, map_lon: -1.13 },
  { id: 12, titulo: 'Decreto turismo Castilla', nivel: 'regional', region: 'Castilla y León', ai_impact_level: 'low', ai_relevance: 5, sectores_afectados: ['Turismo'], map_lat: 41.65, map_lon: -4.72 },
  { id: 13, titulo: 'Ordenanza energética Bilbao', nivel: 'local', region: 'País Vasco', ai_impact_level: 'low', ai_relevance: 4, sectores_afectados: ['Energía'], map_lat: 43.26, map_lon: -2.93 },
  { id: 14, titulo: 'Plan agua Extremadura', nivel: 'regional', region: 'Extremadura', ai_impact_level: 'medium', ai_relevance: 6, sectores_afectados: ['Agua', 'Agro'], map_lat: 39.47, map_lon: -6.37 },
]

interface Props { sourcePath?: string }

export default function LegislationMap({ sourcePath = '/api/intelligence/legislation/impact' }: Props) {
  const [level, setLevel] = useState<string>('')
  const [minRelevance, setMinRelevance] = useState<number>(6)
  const [daysBack, setDaysBack] = useState<number>(30)
  const [hovered, setHovered] = useState<LegItem | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [selected, setSelected] = useState<LegItem | null>(null)

  const qs = new URLSearchParams({ min_relevance: String(minRelevance), days_back: String(daysBack), limit: '60' })
  if (level) qs.set('level', level)

  const { data, loading, refresh, source } = useApi<LegItem[]>(`${sourcePath}?${qs.toString()}`, { refreshInterval: 0 })
  const apiItems: LegItem[] = Array.isArray(data) ? data : []
  // Mostrar datos demo si la API no devuelve nada (modo offline / sin backend)
  const baseItems = apiItems.length > 0 ? apiItems : DEMO_ITEMS

  // Aplicar filtros también al fallback
  const legislation = baseItems.filter(l => {
    if (level && l.nivel !== level) return false
    if (minRelevance > 0 && (l.ai_relevance ?? 0) < minRelevance) return false
    return true
  })

  const geoItems = legislation.filter(l =>
    typeof l.map_lat === 'number' && typeof l.map_lon === 'number' && l.map_lat !== 0 && l.map_lon !== 0
  )

  const topItems = [...legislation]
    .sort((a, b) => (b.ai_relevance ?? 0) - (a.ai_relevance ?? 0))
    .slice(0, 5)

  const breakdown = {
    high: legislation.filter(l => l.ai_impact_level === 'high').length,
    medium: legislation.filter(l => l.ai_impact_level === 'medium').length,
    low: legislation.filter(l => l.ai_impact_level === 'low').length,
  }

  // Items dentro/fuera del bbox peninsular
  const peninsularItems = geoItems.filter(it => it.map_lat! >= LAT_MIN && it.map_lat! <= LAT_MAX && it.map_lon! >= LON_MIN && it.map_lon! <= LON_MAX)
  const canariasItems = geoItems.filter(it => it.map_lat! < 30) // Canarias

  return (
    <section style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 22, padding: '24px 28px', marginBottom: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Mapa legislativo · Impacto territorial
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
            {legislation.length} normas · {geoItems.length} con geolocalización · {source === 'mock' || apiItems.length === 0 ? 'datos demo' : 'datos en vivo'}
          </p>
        </div>
        <button
          onClick={() => refresh()}
          style={{
            padding: '6px 12px', borderRadius: 999, border: '1px solid #e8e8ed', background: '#fff',
            fontSize: 11, fontWeight: 600, color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
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
          <input type="range" min={1} max={10} value={minRelevance}
            onChange={e => setMinRelevance(parseInt(e.target.value))} style={{ width: 100 }} />
          <span style={{ fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, fontSize: 12, width: 16 }}>{minRelevance}</span>
        </div>
        <select value={daysBack} onChange={e => setDaysBack(parseInt(e.target.value))}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'inherit' }}>
          <option value={7}>7 días</option>
          <option value={30}>30 días</option>
          <option value={90}>90 días</option>
        </select>
      </div>

      {/* SVG Map */}
      <div style={{ position: 'relative', background: 'linear-gradient(180deg, #f6f8fb 0%, #f0f3f8 100%)', borderRadius: 14, overflow: 'hidden', marginBottom: 16, height: 420 }}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
          {/* Decoración: líneas de cuadrícula */}
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(31,78,140,0.05)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={SVG_W} height={SVG_H} fill="url(#grid)" />

          {/* Portugal (referencia tenue) */}
          <path d={PORTUGAL_PATH} fill="rgba(120,120,128,0.06)" stroke="rgba(120,120,128,0.20)" strokeWidth="0.8" strokeDasharray="3 2" />
          <text x="40" y="195" fill="rgba(120,120,128,0.45)" fontSize="10" fontStyle="italic" letterSpacing="0.05em">Portugal</text>

          {/* Spain mainland */}
          <path d={SPAIN_PATH} fill="rgba(31, 78, 140, 0.08)" stroke="rgba(31, 78, 140, 0.55)" strokeWidth="1.5" strokeLinejoin="round" />

          {/* Baleares — Mallorca, Menorca, Ibiza, Formentera */}
          <ellipse cx="650" cy="218" rx="22" ry="11" fill="rgba(31, 78, 140, 0.08)" stroke="rgba(31, 78, 140, 0.50)" strokeWidth="1" />
          <ellipse cx="695" cy="200" rx="11" ry="4" fill="rgba(31, 78, 140, 0.08)" stroke="rgba(31, 78, 140, 0.50)" strokeWidth="1" />
          <ellipse cx="618" cy="237" rx="9" ry="6" fill="rgba(31, 78, 140, 0.08)" stroke="rgba(31, 78, 140, 0.50)" strokeWidth="1" />
          <ellipse cx="623" cy="248" rx="5" ry="2" fill="rgba(31, 78, 140, 0.08)" stroke="rgba(31, 78, 140, 0.50)" strokeWidth="1" />
          <text x="650" y="195" textAnchor="middle" fill="rgba(31,78,140,0.55)" fontSize="9" fontWeight="500">Baleares</text>

          {/* Etiquetas CCAA principales */}
          {Object.entries(CCAA_LABELS).filter(([k]) => k !== 'baleares' && k !== 'canarias').map(([k, c]) => (
            <text key={k} x={c.x} y={c.y} textAnchor="middle" fill="rgba(31,78,140,0.32)" fontSize="8.5" fontWeight="500" pointerEvents="none">
              {c.name}
            </text>
          ))}

          {/* Inset Canarias (recuadro abajo a la izquierda) */}
          <g transform="translate(20, 290)">
            <rect width="140" height="65" fill="rgba(255,255,255,0.85)" stroke="rgba(31, 78, 140, 0.30)" strokeWidth="1" rx="6" />
            <text x="70" y="14" textAnchor="middle" fill="#6e6e73" fontSize="9" fontWeight="600">Canarias</text>
            {/* 7 islas aproximadas */}
            <ellipse cx="35" cy="40" rx="10" ry="6" fill="rgba(31,78,140,0.10)" stroke="rgba(31,78,140,0.40)" strokeWidth="0.8" />
            <ellipse cx="60" cy="35" rx="9" ry="5" fill="rgba(31,78,140,0.10)" stroke="rgba(31,78,140,0.40)" strokeWidth="0.8" />
            <ellipse cx="82" cy="42" rx="7" ry="4" fill="rgba(31,78,140,0.10)" stroke="rgba(31,78,140,0.40)" strokeWidth="0.8" />
            <circle cx="100" cy="38" r="3" fill="rgba(31,78,140,0.10)" stroke="rgba(31,78,140,0.40)" strokeWidth="0.8" />
            <circle cx="115" cy="42" r="3" fill="rgba(31,78,140,0.10)" stroke="rgba(31,78,140,0.40)" strokeWidth="0.8" />
            <circle cx="125" cy="38" r="2.5" fill="rgba(31,78,140,0.10)" stroke="rgba(31,78,140,0.40)" strokeWidth="0.8" />
            <circle cx="20" cy="50" r="2" fill="rgba(31,78,140,0.10)" stroke="rgba(31,78,140,0.40)" strokeWidth="0.8" />
            {/* Puntos canarios */}
            {canariasItems.map((it, i) => (
              <circle key={`can-${it.id ?? i}`}
                cx={50 + (i % 6) * 14} cy={40}
                r={6}
                fill={dotColor(it.ai_impact_level)}
                fillOpacity={0.9}
                stroke="white" strokeWidth="1.2"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  setHovered(it)
                  const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect()
                  if (rect) {
                    setHoverPos({ x: ((50 + (i % 6) * 14 + 20) / SVG_W) * rect.width, y: ((40 + 290) / SVG_H) * rect.height })
                  }
                }}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(it)}
              />
            ))}
          </g>

          {/* Puntos en península y baleares */}
          {peninsularItems.map((item, i) => {
            const [x, y] = project(item.map_lat!, item.map_lon!)
            const r = item.ai_impact_level === 'high' ? 9 : item.ai_impact_level === 'medium' ? 7 : 5.5
            return (
              <g key={item.id ?? i} style={{ cursor: 'pointer' }}>
                {/* halo */}
                <circle cx={x} cy={y} r={r + 5}
                  fill={dotColor(item.ai_impact_level)} fillOpacity={0.12}>
                  <animate attributeName="r" values={`${r + 3};${r + 8};${r + 3}`} dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.18;0.04;0.18" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle
                  cx={x} cy={y} r={r}
                  fill={dotColor(item.ai_impact_level)}
                  fillOpacity={0.92}
                  stroke="white" strokeWidth="1.6"
                  onMouseEnter={(e) => {
                    setHovered(item)
                    const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect()
                    if (rect) {
                      setHoverPos({ x: (x / SVG_W) * rect.width, y: (y / SVG_H) * rect.height })
                    }
                  }}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(item)}
                />
              </g>
            )
          })}
        </svg>

        {/* Hover tooltip */}
        {hovered && (
          <div style={{
            position: 'absolute', pointerEvents: 'none',
            left: Math.min(hoverPos.x + 14, 520), top: Math.max(hoverPos.y - 30, 8),
            background: '#fff', border: '1px solid #e8e8ed', borderRadius: 10, padding: '10px 14px',
            boxShadow: '0 6px 22px rgba(0,0,0,0.10)', maxWidth: 280, fontSize: 12,
          }}>
            <p style={{ fontWeight: 600, color: '#1d1d1f', margin: '0 0 6px', lineHeight: 1.3 }}>{hovered.titulo}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: dotColor(hovered.ai_impact_level), background: `${dotColor(hovered.ai_impact_level)}18`,
              }}>{hovered.ai_impact_level ?? '—'}</span>
              {hovered.region && <span style={{ color: '#6e6e73', fontSize: 11 }}>📍 {hovered.region}</span>}
              {hovered.ai_relevance != null && <span style={{ color: '#1F4E8C', fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, fontSize: 11.5 }}>R{hovered.ai_relevance}</span>}
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 12, right: 12, background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid #e8e8ed',
          borderRadius: 12, padding: '10px 14px', fontSize: 11, display: 'flex',
          flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73' }}>Impacto</div>
          {[
            { c: '#c42c2c', l: 'Alto', n: breakdown.high },
            { c: '#b25000', l: 'Medio', n: breakdown.medium },
            { c: '#1F4E8C', l: 'Bajo', n: breakdown.low },
          ].map(x => (
            <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', minWidth: 100 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: x.c }} /> {x.l}
              </span>
              <span style={{ fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, color: '#1d1d1f' }}>{x.n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected detail */}
      {selected && (
        <div style={{
          marginBottom: 16, background: '#f5f9ff', border: '1px solid #cfe0f3', borderRadius: 14, padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{selected.titulo}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: '#424245', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  color: dotColor(selected.ai_impact_level), background: `${dotColor(selected.ai_impact_level)}18`,
                }}>{selected.ai_impact_level ?? '—'}</span>
                {selected.nivel && <span>Nivel: <strong>{selected.nivel}</strong></span>}
                {selected.region && <span>Región: <strong>{selected.region}</strong></span>}
                {selected.ai_relevance != null && <span style={{ color: '#1F4E8C', fontFamily: 'var(--font-display,system-ui)', fontWeight: 700 }}>R{selected.ai_relevance}</span>}
              </div>
            </div>
            <button onClick={() => setSelected(null)}
              style={{ border: 'none', background: 'transparent', color: '#6e6e73', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              cerrar
            </button>
          </div>
          {(selected.sectores_afectados?.length ?? 0) > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selected.sectores_afectados!.map(s => (
                <span key={s} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 999,
                  background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontWeight: 600,
                }}>{s}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom: top items + breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <div>
          <h3 style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 8px' }}>
            Normas con mayor relevancia
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topItems.length === 0 ? (
              <p style={{ fontSize: 12, color: '#6e6e73', margin: '8px 0' }}>Sin normas en el periodo seleccionado.</p>
            ) : topItems.map((it, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 10, fontSize: 12,
                cursor: 'pointer',
              }} onClick={() => setSelected(it)}>
                <span style={{
                  fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                  color: it.nivel === 'nacional' ? '#c42c2c' : it.nivel === 'regional' ? '#b25000' : '#1F4E8C',
                  background: it.nivel === 'nacional' ? 'rgba(196,44,44,0.12)' : it.nivel === 'regional' ? 'rgba(178,80,0,0.12)' : 'rgba(31,78,140,0.12)',
                }}>{it.nivel ?? '—'}</span>
                <span style={{
                  flex: 1, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{it.titulo}</span>
                {it.region && <span style={{ color: '#6e6e73', fontSize: 11 }}>{it.region}</span>}
                <span style={{ color: '#1F4E8C', fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, fontSize: 11.5 }}>R{it.ai_relevance ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 8px' }}>
            Por impacto
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Alto', count: breakdown.high, color: '#c42c2c' },
              { label: 'Medio', count: breakdown.medium, color: '#b25000' },
              { label: 'Bajo', count: breakdown.low, color: '#1F4E8C' },
            ].map(b => (
              <div key={b.label} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 10,
              }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: b.color }} />
                <span style={{ fontSize: 12, color: '#1d1d1f', flex: 1 }}>{b.label}</span>
                <span style={{ fontSize: 14, fontFamily: 'var(--font-display,system-ui)', fontWeight: 700 }}>{b.count}</span>
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
