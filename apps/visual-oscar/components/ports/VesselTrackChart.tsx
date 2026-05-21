'use client'
/**
 * VesselTrackChart · pinta el track AIS sobre un mapa mundial.
 * Reutiliza react-simple-maps + d3-geo (ambos ya en deps).
 */
import { useEffect, useState } from 'react'
import type { VesselTrackResponse } from '@/types/ports'

const WORLD_GEOJSON =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

export function VesselTrackChart({ track }: { track?: VesselTrackResponse }) {
  const [Lib, setLib] = useState<any | null>(null)
  const [topology, setTopology] = useState<any | null>(null)

  useEffect(() => {
    let cancel = false
    import('react-simple-maps').then((mod) => !cancel && setLib(mod))
    fetch(WORLD_GEOJSON)
      .then((r) => r.json())
      .then((j) => !cancel && setTopology(j))
      .catch(() => {})
    return () => {
      cancel = true
    }
  }, [])

  if (!track || !track.points.length) {
    return (
      <div
        style={{
          height: 320,
          background: '#f9fafb',
          border: '1px dashed #e5e7eb',
          borderRadius: 8,
          color: '#6b7280',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Sin track AIS disponible para este buque.
      </div>
    )
  }
  if (!Lib || !topology) {
    return (
      <div
        style={{
          height: 320,
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: 13,
        }}
      >
        Cargando mapa…
      </div>
    )
  }

  const { ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup } = Lib
  const center: [number, number] = [
    track.points[Math.floor(track.points.length / 2)].lon,
    track.points[Math.floor(track.points.length / 2)].lat,
  ]
  return (
    <div style={{ width: '100%', height: 360, background: '#f8fafc', borderRadius: 8 }}>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 180 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup center={center} zoom={3}>
          <Geographies geography={topology}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: { fill: '#e5e7eb', stroke: '#cbd5e1', strokeWidth: 0.4, outline: 'none' },
                    hover: { fill: '#d1d5db', outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>
          {/* Segmentos del track */}
          {track.points.slice(0, -1).map((p, i) => {
            const n = track.points[i + 1]
            return (
              <Line
                key={`l-${i}`}
                from={[p.lon, p.lat]}
                to={[n.lon, n.lat]}
                stroke="#2563eb"
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            )
          })}
          {track.points.map((p, i) => {
            const isFirst = i === 0
            const isLast = i === track.points.length - 1
            return (
              <Marker key={`p-${i}`} coordinates={[p.lon, p.lat]}>
                <circle
                  r={isFirst || isLast ? 4 : 1.5}
                  fill={isLast ? '#dc2626' : isFirst ? '#0ea5e9' : '#1d4ed8'}
                  stroke="#fff"
                  strokeWidth={0.6}
                />
              </Marker>
            )
          })}
        </ZoomableGroup>
      </ComposableMap>
      <p style={{ fontSize: 11, color: '#64748b', padding: '4px 10px', margin: 0 }}>
        ◯ inicio · ● fin · {track.n_points} puntos · {track.hours}h · fuente {track.data_source}
      </p>
    </div>
  )
}

export default VesselTrackChart
