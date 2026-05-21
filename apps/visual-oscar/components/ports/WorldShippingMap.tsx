'use client'
/**
 * WorldShippingMap · mapa mundial con puertos críticos + buques activos.
 *
 * Usa react-simple-maps (ya instalado · SVG, sin tiles raster, sin token).
 * Carga GeoJSON mundial bajo demanda con fallback graceful.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Port, VesselPosition } from '@/types/ports'

const WORLD_GEOJSON =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

interface MapVessel extends VesselPosition {
  /** true cuando el buque viene de fallback sintético · UI lo pinta en ámbar */
  is_synthetic?: boolean
}

interface Props {
  ports: Array<Pick<Port, 'slug' | 'name' | 'lat' | 'lon' | 'type' | 'country_iso'> & {
    congestion_pct?: number
    vessels_anchored?: number
  }>
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

export function WorldShippingMap({ ports, vessels = [], height = 480, onSelectPort }: Props) {
  const [Lib, setLib] = useState<any | null>(null)
  const [topology, setTopology] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    import('react-simple-maps')
      .then((mod) => !cancel && setLib(mod))
      .catch((e) => !cancel && setError(`react-simple-maps: ${String(e)}`))
    fetch(WORLD_GEOJSON)
      .then((r) => r.json())
      .then((j) => !cancel && setTopology(j))
      .catch(() => !cancel && setError('GeoJSON mundial no disponible'))
    return () => {
      cancel = true
    }
  }, [])

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
  if (!Lib || !topology) {
    return (
      <div
        style={{
          height,
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
        Cargando mapa mundial…
      </div>
    )
  }

  const { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } = Lib

  return (
    <div style={{ width: '100%', height, background: '#f8fafc', borderRadius: 8 }}>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 155 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup center={[10, 25]} zoom={1}>
          <Geographies geography={topology}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: { fill: '#e5e7eb', stroke: '#cbd5e1', strokeWidth: 0.4, outline: 'none' },
                    hover: { fill: '#d1d5db', outline: 'none' },
                    pressed: { fill: '#9ca3af', outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Buques activos · verde = LIVE (AISStream), ámbar punteado = synthetic.
              Cuando el worker AIS persistente esté corriendo, todas las marcas
              dejarán de tener is_synthetic. */}
          {vessels.slice(0, 200).map((v) => {
            const isSynth = !!v.is_synthetic
            return (
              <Marker key={`v-${v.imo}-${v.ts}`} coordinates={[v.lon, v.lat]}>
                <circle
                  r={1.6}
                  fill={isSynth ? '#d97706' : '#10b981'}
                  opacity={isSynth ? 0.45 : 0.65}
                  stroke={isSynth ? '#92400e' : 'none'}
                  strokeWidth={isSynth ? 0.4 : 0}
                  strokeDasharray={isSynth ? '0.6 0.4' : undefined}
                />
                <title>
                  {v.name ?? v.imo}
                  {isSynth ? ' · posición sintética (no AIS real)' : ' · AIS live'}
                </title>
              </Marker>
            )
          })}

          {/* Puertos críticos */}
          {ports.map((p) => {
            const fill = TYPE_COLOR[p.type] ?? '#475569'
            const radius = p.congestion_pct
              ? 3 + Math.min(4, p.congestion_pct / 15)
              : 3.5
            const content = (
              <g>
                <circle
                  r={radius}
                  fill={fill}
                  stroke="#fff"
                  strokeWidth={0.8}
                  style={{ cursor: onSelectPort ? 'pointer' : 'default' }}
                />
                <title>
                  {p.name} ({p.country_iso}) · {p.type}
                  {p.congestion_pct != null
                    ? ` · congestión ${p.congestion_pct}%`
                    : ''}
                </title>
              </g>
            )
            return (
              <Marker
                key={p.slug}
                coordinates={[p.lon, p.lat]}
                onClick={onSelectPort ? () => onSelectPort(p.slug) : undefined}
              >
                {content}
              </Marker>
            )
          })}
        </ZoomableGroup>
      </ComposableMap>

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
          ⊙ {vessels.length} buques · ◯ {ports.length} puertos
        </span>
      </div>
    </div>
  )
}

export default WorldShippingMap
