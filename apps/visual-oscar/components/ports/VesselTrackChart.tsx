'use client'
/**
 * VesselTrackChart · pinta el track AIS sobre el mapa Politeia.
 *
 * Migrado a MapLibre GL JS (mismo patrón que components/maps/SectorRasterMap.tsx
 * y components/osiris/OsirisMap.tsx): el track es un source GeoJSON LineString
 * con una capa 'line', y los puntos inicio/fin van en una capa 'circle'.
 *
 * Client-only (MapLibre necesita `window`): todo el montaje vive en useEffect.
 * Degradación honesta: sin track o si MapLibre falla, se pinta un panel de aviso.
 */
import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { VesselTrackResponse } from '@/types/ports'

const BASE_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] }
const MAP_HEIGHT = 320

function buildTrackFc(track: VesselTrackResponse): GeoJSON.FeatureCollection {
  const coords = track.points
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map((p) => [p.lon, p.lat] as [number, number])
  const features: GeoJSON.Feature[] = []
  if (coords.length >= 2) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { kind: 'track' },
    })
  }
  return { type: 'FeatureCollection', features }
}

function buildPointsFc(track: VesselTrackResponse): GeoJSON.FeatureCollection {
  const coords = track.points
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map((p) => [p.lon, p.lat] as [number, number])
  const features: GeoJSON.Feature[] = []
  if (coords.length) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coords[0] },
      properties: { kind: 'start' },
    })
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coords[coords.length - 1] },
      properties: { kind: 'end' },
    })
  }
  return { type: 'FeatureCollection', features }
}

export function VesselTrackChart({ track }: { track?: VesselTrackResponse }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const readyRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  const hasTrack = !!track && track.points.length > 0

  useEffect(() => {
    if (!hasTrack || !containerRef.current || mapRef.current || !track) return

    const valid = track.points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    const mid = valid.length ? valid[Math.floor(valid.length / 2)] : { lat: 20, lon: 0 }

    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: BASE_STYLE,
        center: [mid.lon, mid.lat],
        zoom: 3,
        minZoom: 1,
        maxZoom: 16,
        attributionControl: false,
      })
    } catch (e) {
      setError(`MapLibre: ${String(e)}`)
      return
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.on('error', () => {
      /* tiles/glyphs puntuales no deben tumbar la página */
    })

    map.on('load', () => {
      map.addSource('vessel-track', { type: 'geojson', data: EMPTY_FC })
      map.addSource('vessel-track-pts', { type: 'geojson', data: EMPTY_FC })

      map.addLayer({
        id: 'vessel-track-line',
        type: 'line',
        source: 'vessel-track',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#2563eb',
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 1.4, 5, 2.4, 9, 3.4],
        },
      })
      map.addLayer({
        id: 'vessel-track-pts',
        type: 'circle',
        source: 'vessel-track-pts',
        paint: {
          'circle-radius': 5,
          'circle-color': ['case', ['==', ['get', 'kind'], 'end'], '#dc2626', '#0ea5e9'],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      })

      readyRef.current = true
      ;(map.getSource('vessel-track') as maplibregl.GeoJSONSource | undefined)?.setData(
        buildTrackFc(track) as any,
      )
      ;(map.getSource('vessel-track-pts') as maplibregl.GeoJSONSource | undefined)?.setData(
        buildPointsFc(track) as any,
      )

      // Encuadrar el track completo.
      const coords = valid.map((p) => [p.lon, p.lat] as [number, number])
      if (coords.length >= 2) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0]),
        )
        map.fitBounds(bounds, { padding: 40, maxZoom: 8, duration: 0 })
      }
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      readyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTrack])

  // Actualizar datos si cambia el track sin remontar.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current || !track) return
    ;(map.getSource('vessel-track') as maplibregl.GeoJSONSource | undefined)?.setData(
      buildTrackFc(track) as any,
    )
    ;(map.getSource('vessel-track-pts') as maplibregl.GeoJSONSource | undefined)?.setData(
      buildPointsFc(track) as any,
    )
  }, [track])

  if (!hasTrack) {
    return (
      <div
        style={{
          height: MAP_HEIGHT,
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

  if (error) {
    return (
      <div
        style={{
          height: MAP_HEIGHT,
          background: '#f3f4f6',
          border: '1px dashed #d1d5db',
          borderRadius: 8,
          color: '#6b7280',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Mapa no disponible · {error}
      </div>
    )
  }

  return (
    <div style={{ width: '100%', background: '#f8fafc', borderRadius: 8 }}>
      <div ref={containerRef} style={{ width: '100%', height: MAP_HEIGHT, borderRadius: 8, overflow: 'hidden' }} />
      <p style={{ fontSize: 11, color: '#64748b', padding: '4px 10px', margin: 0 }}>
        ◯ inicio · ◉ fin · {track?.n_points} puntos · {track?.hours}h · fuente {track?.data_source}
      </p>
    </div>
  )
}

export default VesselTrackChart
