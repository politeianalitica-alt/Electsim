'use client'
/**
 * <SectorRasterMap /> · mapa raster + marcadores · Politeia
 *
 * Mapa MapLibre reutilizable que superpone una capa RÁSTER (p.ej. radar de
 * precipitación RainViewer, satélite, etc.) sobre un mapa base claro, y dibuja
 * marcadores con popup en puntos de interés (capitales/zonas productoras).
 *
 * Pensado para importarse con `next/dynamic({ ssr:false })` porque MapLibre
 * necesita `window`. Degradación honesta: si no hay tiles ráster, muestra solo
 * el mapa base + marcadores; si no hay marcadores, solo el mapa.
 */
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export interface RasterMarker {
  id: string
  nombre: string
  lat: number
  lon: number
  value: number | null
  valueLabel: string
  sub?: string
  /** 0..1 → tamaño/intensidad del marcador. */
  intensity?: number
}

interface Props {
  markers: RasterMarker[]
  center?: [number, number]
  zoom?: number
  rasterTiles?: string[] | null
  rasterOpacity?: number
  rasterAttribution?: string
  height?: number
  markerColor?: string
}

const BASE_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

export default function SectorRasterMap({
  markers,
  center = [-3.7, 40.0],
  zoom = 5,
  rasterTiles = null,
  rasterOpacity = 0.6,
  rasterAttribution = '',
  height = 460,
  markerColor = '#16A34A',
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerObjs = useRef<maplibregl.Marker[]>([])
  const readyRef = useRef(false)

  // Init map una vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center,
      zoom,
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.on('load', () => {
      readyRef.current = true
      applyRaster(map, rasterTiles, rasterOpacity, rasterAttribution)
      applyMarkers(map)
    })
    mapRef.current = map
    return () => {
      markerObjs.current.forEach((m) => m.remove())
      markerObjs.current = []
      map.remove()
      mapRef.current = null
      readyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Actualizar capa ráster.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    applyRaster(map, rasterTiles, rasterOpacity, rasterAttribution)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rasterTiles, rasterOpacity])

  // Actualizar marcadores.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    applyMarkers(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, markerColor])

  function applyRaster(map: maplibregl.Map, tiles: string[] | null, opacity: number, attribution: string) {
    if (map.getLayer('raster-overlay')) map.removeLayer('raster-overlay')
    if (map.getSource('raster-overlay')) map.removeSource('raster-overlay')
    if (!tiles || tiles.length === 0) return
    map.addSource('raster-overlay', { type: 'raster', tiles, tileSize: 256, attribution })
    map.addLayer({ id: 'raster-overlay', type: 'raster', source: 'raster-overlay', paint: { 'raster-opacity': opacity } })
  }

  function applyMarkers(map: maplibregl.Map) {
    markerObjs.current.forEach((m) => m.remove())
    markerObjs.current = []
    for (const mk of markers) {
      const inten = mk.intensity ?? 0.5
      const size = 14 + Math.round(inten * 16)
      const el = document.createElement('div')
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${markerColor};opacity:0.82;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;`
      const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
        `<div style="font-family:system-ui;min-width:150px">
          <div style="font-size:12px;font-weight:700;color:#0f172a">${escapeHtml(mk.nombre)}</div>
          <div style="font-size:15px;font-weight:800;color:${markerColor};margin-top:2px">${escapeHtml(mk.valueLabel)}</div>
          ${mk.sub ? `<div style="font-size:10px;color:#64748b;margin-top:2px">${escapeHtml(mk.sub)}</div>` : ''}
        </div>`
      )
      const marker = new maplibregl.Marker({ element: el }).setLngLat([mk.lon, mk.lat]).setPopup(popup).addTo(map)
      markerObjs.current.push(marker)
    }
  }

  return <div ref={containerRef} style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden' }} />
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
