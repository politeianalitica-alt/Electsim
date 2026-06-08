'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// Mapa dedicado de España — solo datos de España (infraestructura curada +
// clima dinámico por ciudad vía Open-Meteo). Componente autocontenido.

type LayerCfg = {
  key: string
  label: string
  color: string
  src: 'data' | 'clima'
  field?: string
  dyn?: 'aqi' | 'tmax'
  sizeBy?: 'pob' | 'pax'
}

const LAYERS: LayerCfg[] = [
  { key: 'ciudades', label: 'Ciudades', color: '#9E9E9E', src: 'data', field: 'ciudades', sizeBy: 'pob' },
  { key: 'nucleares', label: 'Centrales nucleares', color: '#76FF03', src: 'data', field: 'nucleares' },
  { key: 'refinerias', label: 'Refinerías', color: '#A1887F', src: 'data', field: 'refinerias' },
  { key: 'gnl', label: 'Terminales GNL', color: '#42A5F5', src: 'data', field: 'gnl' },
  { key: 'presas', label: 'Presas hidroeléctricas', color: '#4FC3F7', src: 'data', field: 'presas' },
  { key: 'aeropuertos', label: 'Aeropuertos (AENA)', color: '#00E5FF', src: 'data', field: 'aeropuertos', sizeBy: 'pax' },
  { key: 'puertos', label: 'Puertos', color: '#26A69A', src: 'data', field: 'puertos' },
  { key: 'aire', label: 'Calidad del aire (AQI)', color: '#66BB6A', src: 'clima', dyn: 'aqi' },
  { key: 'temp', label: 'Temperatura máx. hoy', color: '#FF6B00', src: 'clima', dyn: 'tmax' },
]

const AQI_COLOR: any = ['interpolate', ['linear'], ['coalesce', ['get', 'aqi'], 0],
  0, '#66BB6A', 20, '#9CCC65', 40, '#FBC02D', 60, '#FF9800', 80, '#EF5350', 100, '#B71C1C']
const TEMP_COLOR: any = ['interpolate', ['linear'], ['coalesce', ['get', 'tmax'], 0],
  0, '#2979FF', 15, '#4FC3F7', 25, '#66BB6A', 32, '#FBC02D', 38, '#FF6B00', 44, '#D32F2F']

const EMPTY = { type: 'FeatureCollection', features: [] } as any

export default function MapaEspana() {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {}
    LAYERS.forEach((l) => (o[l.key] = ['ciudades', 'nucleares', 'gnl', 'refinerias'].includes(l.key)))
    return o
  })
  const dataRef = useRef<any>(null)
  const climaRef = useRef<any>(null)

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-3.5, 40.0],
      zoom: 5.3,
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    mapRef.current = map

    map.on('load', () => {
      for (const l of LAYERS) {
        map.addSource(l.key, { type: 'geojson', data: EMPTY })
        const color: any = l.dyn === 'aqi' ? AQI_COLOR : l.dyn === 'tmax' ? TEMP_COLOR : l.color
        const radius: any = l.sizeBy
          ? ['interpolate', ['linear'], ['coalesce', ['get', 'size'], 0], 0, 4, 1, 12]
          : ['interpolate', ['linear'], ['zoom'], 5, 5, 9, 9]
        map.addLayer({
          id: l.key + '-dots', type: 'circle', source: l.key,
          paint: {
            'circle-radius': radius,
            'circle-color': color,
            'circle-opacity': 0.85,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#0b0e16',
          },
          layout: { visibility: 'none' },
        })
        map.addLayer({
          id: l.key + '-label', type: 'symbol', source: l.key, minzoom: 6,
          layout: { 'text-field': ['get', 'name'], 'text-size': 10, 'text-offset': [0, 1.1], 'text-allow-overlap': false, visibility: 'none' },
          paint: { 'text-color': '#E8E6E0', 'text-halo-color': '#000', 'text-halo-width': 1.2 },
        })
        // popup
        map.on('click', l.key + '-dots', (e: any) => {
          const p = e.features?.[0]?.properties; if (!p) return
          const c = (e.features[0].geometry as any).coordinates
          new maplibregl.Popup({ closeButton: true })
            .setLngLat(c)
            .setHTML(`<div style="font-family:-apple-system,sans-serif;padding:2px 4px;min-width:150px;">
              <div style="font-size:13px;font-weight:700;color:#111;">${p.name || ''}</div>
              ${p.info ? `<div style="font-size:11px;color:#444;margin-top:3px;">${p.info}</div>` : ''}
            </div>`)
            .addTo(map)
        })
        map.on('mouseenter', l.key + '-dots', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', l.key + '-dots', () => { map.getCanvas().style.cursor = '' })
      }
      setReady(true)
    })

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Fetch data
  useEffect(() => {
    if (!ready) return
    fetch('/api/espana/data').then((r) => r.json()).then((d) => { dataRef.current = d; applyAll() }).catch(() => {})
    fetch('/api/espana/clima').then((r) => r.json()).then((d) => { climaRef.current = d.clima || []; applyAll() }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Apply visibility + data when active changes
  useEffect(() => { applyAll() /* eslint-disable-next-line */ }, [active, ready])

  function applyAll() {
    const map = mapRef.current; if (!map || !map.isStyleLoaded()) return
    for (const l of LAYERS) {
      const on = !!active[l.key]
      map.setLayoutProperty(l.key + '-dots', 'visibility', on ? 'visible' : 'none')
      map.setLayoutProperty(l.key + '-label', 'visibility', on ? 'visible' : 'none')
      let feats: any[] = []
      if (on) {
        if (l.src === 'data' && dataRef.current && l.field) {
          const arr = dataRef.current[l.field] || []
          feats = arr.map((o: any) => ({
            type: 'Feature', geometry: { type: 'Point', coordinates: [o.lng, o.lat] },
            properties: {
              name: o.n,
              size: l.sizeBy === 'pob' ? Math.min(1, (o.pob || 0) / 3300000) : l.sizeBy === 'pax' ? Math.min(1, (o.pax || 0) / 60000000) : undefined,
              info: o.mw ? `${o.mw} MW` : o.iata ? `${o.iata}${o.pax ? ` · ${(o.pax / 1e6).toFixed(1)}M pax` : ''}` : o.teu ? `${(o.teu / 1e6).toFixed(1)}M TEU` : o.pob ? `${(o.pob / 1000).toFixed(0)}k hab.` : '',
            },
          }))
        } else if (l.src === 'clima' && climaRef.current) {
          feats = climaRef.current
            .filter((c: any) => (l.dyn === 'aqi' ? c.aqi != null : c.tmax != null))
            .map((c: any) => ({
              type: 'Feature', geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
              properties: {
                name: c.n, aqi: c.aqi, tmax: c.tmax,
                info: l.dyn === 'aqi' ? `AQI ${c.aqi} · PM2.5 ${c.pm25 ?? '—'}` : `${c.tmax}°C máx.`,
              },
            }))
        }
      }
      const src = map.getSource(l.key) as any
      if (src) src.setData({ type: 'FeatureCollection', features: feats })
    }
  }

  const toggle = (k: string) => setActive((p) => ({ ...p, [k]: !p[k] }))

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {/* Panel de capas */}
      <div style={{
        position: 'absolute', top: 12, left: 12, width: 246, maxHeight: 'calc(100% - 24px)', overflowY: 'auto',
        background: 'rgba(255,255,255,0.94)', backdropFilter: 'saturate(180%) blur(20px)',
        border: '1px solid #d2d2d7', borderRadius: 14, padding: 12,
        fontFamily: '-apple-system, system-ui, sans-serif', boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: '#1d1d1f', marginBottom: 4 }}>MAPA DE ESPAÑA</div>
        <div style={{ fontSize: 10.5, color: '#6e6e73', marginBottom: 10 }}>Solo datos de España · infraestructura + clima</div>
        {LAYERS.map((l) => {
          const on = !!active[l.key]
          return (
            <button key={l.key} onClick={() => toggle(l.key)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', marginBottom: 2,
              borderRadius: 9, cursor: 'pointer', textAlign: 'left',
              background: on ? 'rgba(31,78,140,0.08)' : 'transparent',
              border: on ? '1px solid rgba(31,78,140,0.22)' : '1px solid transparent',
            }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: l.color, flexShrink: 0, opacity: on ? 1 : 0.4 }} />
              <span style={{ flex: 1, fontSize: 12, fontWeight: on ? 600 : 500, color: on ? '#1d1d1f' : '#6e6e73' }}>{l.label}</span>
              <span style={{ width: 28, height: 16, borderRadius: 999, background: on ? '#1F4E8C' : '#d2d2d7', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
                <span style={{ position: 'absolute', top: 2, left: on ? 13 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
