'use client'
/**
 * MapaProvinciasPrecios · mapa coroplético de España con precio €/m²
 * por provincia.
 *
 * Reutiliza el mismo GeoJSON `/geodata/spain-provinces.geojson` que el
 * MapaPoliticoEspana, pero colorea cada provincia según el precio €/m²
 * usando una escala de color cuantil (verde claro = barato, rojo oscuro
 * = caro). Canarias en caja decorativa abajo a la izquierda.
 *
 * Tooltip al hover: nombre · precio · variación anual.
 */
import { useEffect, useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'

interface ProvinciaPrecio {
  cod_prov: string
  id: string
  nombre: string
  precio_m2: number
  var_anual: number
  ccaa: string
}

interface ProvFeature {
  type: 'Feature'
  properties: { cod_prov?: string; name?: string; cod_ccaa?: string }
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] }
}
interface ProvFC {
  type: 'FeatureCollection'
  features: ProvFeature[]
}

const CANARIAS_CODS = new Set(['35', '38'])

// Escala cuantil · 6 niveles · de pink-100 a pink-900 (paleta vivienda)
const SCALE_COLORS = ['#FCE7F3', '#FBCFE8', '#F9A8D4', '#F472B6', '#DB2777', '#831843']
const SCALE_LABELS = ['Muy bajo', 'Bajo', 'Medio-bajo', 'Medio-alto', 'Alto', 'Muy alto']

function colorForPrice(price: number, breaks: number[]): string {
  for (let i = 0; i < breaks.length; i++) {
    if (price <= breaks[i]) return SCALE_COLORS[i]
  }
  return SCALE_COLORS[SCALE_COLORS.length - 1]
}

// Calcular cortes cuantiles
function quantileBreaks(values: number[], n: number): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  const breaks: number[] = []
  for (let i = 1; i <= n; i++) {
    const idx = Math.floor((i / n) * (sorted.length - 1))
    breaks.push(sorted[idx])
  }
  return breaks
}

interface MapaProvinciasPreciosProps {
  provincias: ProvinciaPrecio[]
  compact?: boolean
}

export default function MapaProvinciasPrecios({ provincias, compact = false }: MapaProvinciasPreciosProps) {
  const [geo, setGeo] = useState<ProvFC | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [pinId, setPinId] = useState<string | null>(null)
  const focusedId = pinId || hoverId

  useEffect(() => {
    let alive = true
    fetch('/geodata/spain-provinces.geojson')
      .then(r => r.ok ? r.json() as Promise<ProvFC> : null)
      .then(g => { if (alive && g) { setGeo(g); setLoading(false) } })
      .catch(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  // Index por cod_prov para búsqueda rápida
  const byCod = useMemo(() => {
    const m: Record<string, ProvinciaPrecio> = {}
    provincias.forEach(p => { m[p.cod_prov] = p })
    return m
  }, [provincias])

  const breaks = useMemo(
    () => quantileBreaks(provincias.map(p => p.precio_m2), SCALE_COLORS.length),
    [provincias],
  )

  const { peninsulaFCs, canariasFCs } = useMemo(() => {
    if (!geo) return { peninsulaFCs: [] as ProvFeature[], canariasFCs: [] as ProvFeature[] }
    const pen: ProvFeature[] = []
    const can: ProvFeature[] = []
    geo.features.forEach(f => {
      const c = f.properties.cod_prov || ''
      if (CANARIAS_CODS.has(c)) can.push(f); else pen.push(f)
    })
    return { peninsulaFCs: pen, canariasFCs: can }
  }, [geo])

  const W = compact ? 600 : 880
  const H = compact ? 440 : 620

  const peninsulaProjection = useMemo(() => {
    if (peninsulaFCs.length === 0) return null
    return geoMercator()
      .center([-3.7, 40.0])
      .scale(compact ? 2200 : 3300)
      .translate([W * 0.5, H * 0.5])
  }, [peninsulaFCs, compact, W, H])

  const canariasProjection = useMemo(() => {
    if (canariasFCs.length === 0) return null
    const boxW = compact ? 100 : 140
    const boxH = compact ? 56 : 78
    return geoMercator()
      .center([-15.6, 28.2])
      .scale(compact ? 1700 : 2500)
      .translate([boxW * 0.5 + 10, H - boxH * 0.5 - 10])
  }, [canariasFCs, compact, H])

  const peninsulaPath = useMemo(() => peninsulaProjection ? geoPath(peninsulaProjection) : null, [peninsulaProjection])
  const canariasPath  = useMemo(() => canariasProjection  ? geoPath(canariasProjection)  : null, [canariasProjection])

  const focused = focusedId ? Object.values(byCod).find(p => p.cod_prov === focusedId) : null

  return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header con info contextual + escala */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
 <div style={{ fontSize: 12, color: '#6e6e73' }}>
          {focused ? (
 <span>
 <strong style={{ color: '#1d1d1f' }}>{focused.nombre}</strong>
              {' · '}
 <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#DB2777' }}>
                {focused.precio_m2.toLocaleString('es-ES')} €/m²
 </span>
              {' · '}
 <span style={{ color: focused.var_anual >= 7 ? '#DC2626' : focused.var_anual >= 4 ? '#D97706' : '#16A34A', fontWeight: 600 }}>
                {focused.var_anual >= 0 ? '+' : ''}{focused.var_anual.toFixed(1)}% anual
 </span>
              {' · '}
 <span style={{ color: '#86868b' }}>{focused.ccaa}</span>
 </span>
          ) : (
 <span>52 provincias · hover para ver precio · click para fijar</span>
          )}
 </div>
        {/* Escala de color */}
 <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
 <span style={{ fontSize: 9.5, color: '#86868b', marginRight: 4 }}>€/m²</span>
          {SCALE_COLORS.map((c, i) => (
 <span key={i} title={`${SCALE_LABELS[i]} · ≤ ${breaks[i].toLocaleString('es-ES')} €/m²`} style={{
              width: 22, height: 10, background: c, borderRadius: i === 0 ? '3px 0 0 3px' : i === SCALE_COLORS.length - 1 ? '0 3px 3px 0' : 0,
            }}/>
          ))}
 <span style={{ fontSize: 9.5, color: '#86868b', marginLeft: 4 }}>+caro</span>
 </div>
 </div>

      {/* Mapa SVG */}
 <div style={{ position: 'relative', minHeight: 0 }}>
        {loading && (
 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868b', fontSize: 12 }}>
            Cargando geografía…
 </div>
        )}
        {!loading && geo && (
 <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" style={{ display: 'block' }}
               onClick={() => setPinId(null)}
          >
            {/* Caja Canarias (decorativa) */}
 <rect x={5} y={H - (compact ? 60 : 82)} width={compact ? 100 : 140} height={compact ? 55 : 77}
                  fill="none" stroke="#ECECEF" strokeWidth={1} strokeDasharray="3 3" rx={6}/>
 <text x={10} y={H - (compact ? 48 : 68)} fontSize={8} fill="#86868b" fontWeight={600} letterSpacing="0.05em">CANARIAS</text>

            {/* Península + Baleares */}
            {peninsulaPath && peninsulaFCs.map(f => {
              const c = f.properties.cod_prov || ''
              const prov = byCod[c]
              const fill = prov ? colorForPrice(prov.precio_m2, breaks) : '#E8E8ED'
              const isFocused = focusedId === c
              const d = peninsulaPath(f as never) || ''
              return (
 <path key={`pen-${c}`} d={d} fill={fill}
                  fillOpacity={isFocused ? 1 : 0.92}
                  stroke="#fff" strokeWidth={isFocused ? 1.6 : 0.7}
                  style={{ cursor: 'pointer', transition: 'fill-opacity 120ms, stroke-width 120ms' }}
                  onMouseEnter={() => setHoverId(c)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={e => { e.stopPropagation(); setPinId(prev => prev === c ? null : c) }}
                />
              )
            })}
            {/* Canarias */}
            {canariasPath && canariasFCs.map(f => {
              const c = f.properties.cod_prov || ''
              const prov = byCod[c]
              const fill = prov ? colorForPrice(prov.precio_m2, breaks) : '#E8E8ED'
              const isFocused = focusedId === c
              const d = canariasPath(f as never) || ''
              return (
 <path key={`can-${c}`} d={d} fill={fill}
                  fillOpacity={isFocused ? 1 : 0.92}
                  stroke="#fff" strokeWidth={isFocused ? 1.6 : 0.7}
                  style={{ cursor: 'pointer', transition: 'fill-opacity 120ms, stroke-width 120ms' }}
                  onMouseEnter={() => setHoverId(c)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={e => { e.stopPropagation(); setPinId(prev => prev === c ? null : c) }}
                />
              )
            })}

            {/* Etiquetas de precio en provincias grandes */}
            {peninsulaPath && peninsulaFCs.map(f => {
              const c = f.properties.cod_prov || ''
              const prov = byCod[c]
              if (!prov) return null
              // Solo etiquetas en las top 12 más pobladas/importantes
              const bigCods = new Set(['28', '08', '46', '41', '29', '07', '03', '14', '18', '47', '50', '20', '48'])
              if (!bigCods.has(c)) return null
              const ctr = peninsulaPath.centroid(f as never)
              if (!ctr || isNaN(ctr[0]) || isNaN(ctr[1])) return null
              const isDark = prov.precio_m2 >= breaks[3]
              return (
 <text key={`lbl-${c}`} x={ctr[0]} y={ctr[1]}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={compact ? 8.5 : 10} fontWeight={700}
                  fill={isDark ? '#fff' : '#1d1d1f'}
                  style={{ pointerEvents: 'none', textShadow: isDark ? '0 1px 2px rgba(0,0,0,0.4)' : 'none' }}
                >
                  {prov.precio_m2 >= 1000 ? (prov.precio_m2 / 1000).toFixed(1) + 'k' : prov.precio_m2.toFixed(0)}
 </text>
              )
            })}
            {canariasPath && canariasFCs.map(f => {
              const c = f.properties.cod_prov || ''
              const prov = byCod[c]
              if (!prov) return null
              const ctr = canariasPath.centroid(f as never)
              if (!ctr || isNaN(ctr[0]) || isNaN(ctr[1])) return null
              const isDark = prov.precio_m2 >= breaks[3]
              return (
 <text key={`canlbl-${c}`} x={ctr[0]} y={ctr[1]}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={compact ? 7 : 8} fontWeight={700}
                  fill={isDark ? '#fff' : '#1d1d1f'}
                  style={{ pointerEvents: 'none', textShadow: isDark ? '0 1px 2px rgba(0,0,0,0.4)' : 'none' }}
                >
                  {(prov.precio_m2 / 1000).toFixed(1)}k
 </text>
              )
            })}
 </svg>
        )}
 </div>
 </div>
  )
}
