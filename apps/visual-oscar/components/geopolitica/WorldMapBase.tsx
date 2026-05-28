'use client'
/**
 * <WorldMapBase /> · Sprint G16 · Mapa mundial reutilizable con contorno de países
 *
 * Componente base que carga /geodata/world-countries.geojson (~250KB, 252 países)
 * y renderiza SVG paths por país. Los hijos se renderizan SOBRE el mapa para
 * overlays (puntos IRC, círculos conflicto, etc.).
 *
 * Antes de G16, los mapas de Radar/Conflictos/Diplomacia/Presencia mostraban
 * solo puntos flotando en fondo oscuro sin contorno (problema reportado por
 * el usuario en items 2, 4, 10, 13, 17).
 *
 * Uso:
 *   <WorldMapBase width={720} height={360} bgColor="#0f172a" countryFill="#1e293b">
 *     {(project) => (
 *       <>
 *         {points.map(p => {
 *           const { x, y } = project(p.lat, p.lon)
 *           return <circle key={p.id} cx={x} cy={y} r={5} fill="#dc2626" />
 *         })}
 *       </>
 *     )}
 *   </WorldMapBase>
 *
 * Optimizaciones:
 *   - GeoJSON se cachea con fetch cache: 'force-cache' (estático servido por Next).
 *   - Polygons simplificados a 1 decimal para reducir tamaño de path en SVG.
 *   - Multi-polygon flattened a múltiples paths.
 */
import { useEffect, useState, type ReactNode } from 'react'

type LonLat = [number, number]
type Ring = LonLat[]
type Polygon = Ring[]              // [outer, hole1, hole2, ...]

interface FeatureGeometry {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: Polygon[] | Polygon  // MultiPolygon vs Polygon
}
interface Feature {
  type: 'Feature'
  properties: { name?: string; iso_a3?: string }
  geometry: FeatureGeometry
}
interface FeatureCollection {
  type: 'FeatureCollection'
  features: Feature[]
}

/** Proyección equirectangular: lon/lat → x/y en SVG viewport. */
export function projectEquirect(
  lat: number,
  lon: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  }
}

/** Construye una string SVG `d` a partir de un anillo de coordenadas. */
function ringToPath(ring: Ring, width: number, height: number): string {
  if (ring.length === 0) return ''
  const parts: string[] = []
  for (let i = 0; i < ring.length; i++) {
    const [lon, lat] = ring[i]
    const x = ((lon + 180) / 360) * width
    const y = ((90 - lat) / 180) * height
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
  }
  parts.push('Z')
  return parts.join(' ')
}

/** Convierte un Feature en una lista de paths SVG (uno por anillo exterior). */
function featureToPaths(feature: Feature, width: number, height: number): string[] {
  const geom = feature.geometry
  if (!geom) return []
  if (geom.type === 'Polygon') {
    // Cada anillo es un path separado (outer + holes)
    return (geom.coordinates as Polygon).map((ring) => ringToPath(ring as Ring, width, height))
  }
  if (geom.type === 'MultiPolygon') {
    const result: string[] = []
    for (const polygon of geom.coordinates as Polygon[]) {
      for (const ring of polygon as Ring[]) {
        result.push(ringToPath(ring, width, height))
      }
    }
    return result
  }
  return []
}

interface WorldMapBaseProps {
  width: number
  height: number
  /** Color de fondo del SVG (oceano). */
  bgColor?: string
  /** Color de relleno de los países (tierra). */
  countryFill?: string
  /** Color del borde de los países. */
  countryStroke?: string
  /** Ancho del borde de los países. */
  countryStrokeWidth?: number
  /** Override por país: map iso_a3/name → color custom (para choropleth). */
  countryColorByIso3?: Record<string, string>
  /** Opcional: callback al click en un país (basado en feature.properties.name). */
  onCountryClick?: (countryName: string, iso3?: string) => void
  /** Children es función con projector para overlays (lat/lon → x/y). */
  children?: (
    project: (lat: number, lon: number) => { x: number; y: number },
  ) => ReactNode
  /** Mostrar grid de meridianos/paralelos suaves. */
  showGrid?: boolean
}

export function WorldMapBase({
  width,
  height,
  bgColor = '#f0f9ff',
  countryFill = '#cbd5e1',
  countryStroke = '#94a3b8',
  countryStrokeWidth = 0.4,
  countryColorByIso3,
  onCountryClick,
  children,
  showGrid = false,
}: WorldMapBaseProps) {
  const [features, setFeatures] = useState<Feature[] | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/geodata/world-countries.geojson', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: FeatureCollection) => {
        if (alive) setFeatures(j.features || [])
      })
      .catch(() => {
        if (alive) setFeatures([])
      })
    return () => {
      alive = false
    }
  }, [])

  const project = (lat: number, lon: number) => projectEquirect(lat, lon, width, height)

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', background: bgColor, borderRadius: 8 }}
    >
      {/* Grid suave opcional */}
      {showGrid && (
        <g style={{ pointerEvents: 'none' }}>
          {[0, 90, 180, 270, 360].map((x) => (
            <line
              key={`mer-${x}`}
              x1={(x / 360) * width}
              y1={0}
              x2={(x / 360) * width}
              y2={height}
              stroke="#334155"
              strokeWidth={0.3}
              strokeDasharray="2 4"
              opacity={0.3}
            />
          ))}
          {[0, 60, 120, 180].map((y) => (
            <line
              key={`par-${y}`}
              x1={0}
              y1={(y / 180) * height}
              x2={width}
              y2={(y / 180) * height}
              stroke="#334155"
              strokeWidth={0.3}
              strokeDasharray="2 4"
              opacity={0.3}
            />
          ))}
        </g>
      )}

      {/* Países */}
      {features &&
        features.map((f, i) => {
          const paths = featureToPaths(f, width, height)
          const name = f.properties.name || ''
          const iso3 = f.properties.iso_a3
          const fill =
            (iso3 && countryColorByIso3?.[iso3]) ||
            (name && countryColorByIso3?.[name]) ||
            countryFill
          return (
            <g
              key={`f-${i}`}
              style={{ cursor: onCountryClick ? 'pointer' : 'default' }}
              onClick={() => onCountryClick?.(name, iso3)}
            >
              {paths.map((d, j) => (
                <path
                  key={`p-${i}-${j}`}
                  d={d}
                  fill={fill}
                  stroke={countryStroke}
                  strokeWidth={countryStrokeWidth}
                  strokeLinejoin="round"
                />
              ))}
            </g>
          )
        })}

      {/* Overlay opcional para puntos/círculos sobre el mapa */}
      {children && children(project)}
    </svg>
  )
}

export default WorldMapBase
