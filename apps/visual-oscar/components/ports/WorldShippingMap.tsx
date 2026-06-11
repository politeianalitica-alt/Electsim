'use client'
/**
 * WorldShippingMap · mapa mundial con puertos críticos + buques activos.
 *
 * Migrado a MapLibre GL JS (mismo patrón que el mapa Politeia · ver
 * components/osiris/OsirisMap.tsx y components/maps/SectorRasterMap.tsx):
 * estilo base vectorial de basemaps.cartocdn.com, puertos y buques como
 * capas GeoJSON (circle layers), popup al pasar/click sobre un puerto.
 *
 * Client-only (MapLibre necesita `window`): todo el montaje vive dentro de
 * useEffect. Degradación honesta: si MapLibre falla, se pinta un panel de
 * aviso y la página no se rompe.
 */
import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Port, VesselPosition } from '@/types/ports'

const BASE_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

interface MapVessel extends VesselPosition {
  /** true cuando el buque viene de fallback sintético · UI lo pinta en ámbar */
  is_synthetic?: boolean
}

type MapPort = Pick<Port, 'slug' | 'name' | 'lat' | 'lon' | 'type' | 'country_iso'> & {
  congestion_pct?: number
  vessels_anchored?: number
}

interface Props {
  ports: MapPort[]
  vessels?: MapVessel[]
  height?: number
  onSelectPort?: (slug: string) => void
}

/** Colores por PortType canónico (10 valores) · alineado con catalog.py:PORT_TYPES */
const TYPE_COLOR: Record<string, string> = {
  container: '#2563eb',
  bulk: '#a16207',
  tanker: '#dc2626',
  lng: '#0891b2',
  roro: '#7c3aed',
  cruise: '#9333ea',
  multipurpose: '#475569',
  chokepoint: '#ea580c',
  energy: '#b45309',
  fishing: '#0d9488',
}

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] }

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  )
}

function portsToFc(ports: MapPort[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: ports
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: {
          slug: p.slug,
          name: p.name,
          country_iso: p.country_iso,
          type: p.type,
          color: TYPE_COLOR[p.type] ?? '#475569',
          congestion_pct: p.congestion_pct ?? null,
          radius: p.congestion_pct != null ? 6 + Math.min(8, p.congestion_pct / 8) : 7,
        },
      })),
  }
}

function vesselsToFc(vessels: MapVessel[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: vessels
      .slice(0, 200)
      .filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lon))
      .map((v) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
        properties: {
          name: v.name ?? v.imo,
          synthetic: v.is_synthetic ? 1 : 0,
        },
      })),
  }
}

export function WorldShippingMap({ ports, vessels = [], height = 480, onSelectPort }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const onSelectRef = useRef<typeof onSelectPort>(onSelectPort)
  const readyRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  // Mantener la callback fresca sin re-montar el mapa.
  useEffect(() => {
    onSelectRef.current = onSelectPort
  }, [onSelectPort])

  // Init map una sola vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: BASE_STYLE,
        center: [10, 25],
        zoom: 1.4,
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
      map.addSource('ports', { type: 'geojson', data: EMPTY_FC })
      map.addSource('vessels', { type: 'geojson', data: EMPTY_FC })

      // Buques · verde = AIS live, ámbar = sintético.
      map.addLayer({
        id: 'vessels-dots',
        type: 'circle',
        source: 'vessels',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 1.6, 5, 3, 9, 4.5],
          'circle-color': ['case', ['==', ['get', 'synthetic'], 1], '#d97706', '#10b981'],
          'circle-opacity': ['case', ['==', ['get', 'synthetic'], 1], 0.5, 0.7],
          'circle-stroke-width': ['case', ['==', ['get', 'synthetic'], 1], 0.6, 0],
          'circle-stroke-color': '#92400e',
        },
      })

      // Puertos críticos · color por tipo, radio por congestión.
      map.addLayer({
        id: 'ports-dots',
        type: 'circle',
        source: 'ports',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.9,
          'circle-stroke-width': 1.4,
          'circle-stroke-color': '#ffffff',
        },
      })

      readyRef.current = true
      ;(map.getSource('ports') as maplibregl.GeoJSONSource | undefined)?.setData(
        portsToFc(ports) as any,
      )
      ;(map.getSource('vessels') as maplibregl.GeoJSONSource | undefined)?.setData(
        vesselsToFc(vessels) as any,
      )

      // Popup hover sobre puerto.
      map.on('mouseenter', 'ports-dots', (ev) => {
        map.getCanvas().style.cursor = 'pointer'
        const f = ev.features?.[0]
        if (!f) return
        const props = f.properties as Record<string, any>
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number]
        const congestion =
          props.congestion_pct != null ? ` · congestión ${props.congestion_pct}%` : ''
        if (!popupRef.current) {
          popupRef.current = new maplibregl.Popup({
            offset: 12,
            closeButton: false,
            closeOnClick: false,
          })
        }
        popupRef.current
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:system-ui;font-size:12px;line-height:1.4">
              <strong>${escapeHtml(String(props.name))}</strong> (${escapeHtml(String(props.country_iso))})<br/>
              <span style="color:#64748b">${escapeHtml(String(props.type))}${congestion}</span>
            </div>`,
          )
          .addTo(map)
      })
      map.on('mouseleave', 'ports-dots', () => {
        map.getCanvas().style.cursor = ''
        popupRef.current?.remove()
      })
      // Click → navegación / selección.
      map.on('click', 'ports-dots', (ev) => {
        const slug = ev.features?.[0]?.properties?.slug
        if (slug && onSelectRef.current) onSelectRef.current(String(slug))
      })
    })

    mapRef.current = map
    return () => {
      popupRef.current?.remove()
      popupRef.current = null
      map.remove()
      mapRef.current = null
      readyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Actualizar datos GeoJSON cuando cambian props.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    ;(map.getSource('ports') as maplibregl.GeoJSONSource | undefined)?.setData(
      portsToFc(ports) as any,
    )
  }, [ports])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    ;(map.getSource('vessels') as maplibregl.GeoJSONSource | undefined)?.setData(
      vesselsToFc(vessels) as any,
    )
  }, [vessels])

  if (error) {
    return (
      <div
        style={{
          height,
          background: '#f3f4f6',
          border: '1px dashed #d1d5db',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: 13,
        }}
      >
        Mapa no disponible · {error}
      </div>
    )
  }

  return (
    <div style={{ width: '100%', background: '#f8fafc', borderRadius: 8 }}>
      <div ref={containerRef} style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden' }} />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '6px 10px', fontSize: 11, color: '#475569' }}>
        {Object.entries(TYPE_COLOR).map(([k, v]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: v, display: 'inline-block' }} />
            {k}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          buque (AIS live)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', display: 'inline-block', border: '1px dashed #92400e' }} />
          sintético
        </span>
        <span style={{ marginLeft: 'auto', color: '#64748b' }}>
          ◐ {vessels.length} buques · ◯ {ports.length} puertos
        </span>
      </div>
    </div>
  )
}

export default WorldShippingMap
