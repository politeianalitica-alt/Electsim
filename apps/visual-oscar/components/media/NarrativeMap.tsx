'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface PaisItem {
  country_code: string
  country_name: string
  n_articulos: number
  sentiment_avg: number
  lat: number
  lon: number
}

interface CcaaItem {
  ccaa_id: number
  nombre_ccaa: string
  narrativa_dominante: string
  n_articulos: number
  ideologia_media: number
}

interface NarrativeMapProps {
  paises: PaisItem[]
  ccaas: CcaaItem[]
}

type ViewMode = 'mundo' | 'europa' | 'espana'

// Approximate screen positions for each CCAA (x%, y% from top-left of 600px container)
const CCAA_POSITIONS: Record<string, { x: number; y: number }> = {
  'Andalucía': { x: 37, y: 82 },
  'Aragón': { x: 62, y: 38 },
  'Asturias': { x: 35, y: 12 },
  'Baleares': { x: 76, y: 72 },
  'Canarias': { x: 12, y: 92 },
  'Cantabria': { x: 40, y: 10 },
  'Castilla-La Mancha': { x: 52, y: 62 },
  'Castilla y León': { x: 40, y: 38 },
  'Cataluña': { x: 78, y: 32 },
  'Extremadura': { x: 28, y: 68 },
  'Galicia': { x: 18, y: 22 },
  'La Rioja': { x: 56, y: 24 },
  'Madrid': { x: 48, y: 52 },
  'Murcia': { x: 63, y: 80 },
  'Navarra': { x: 62, y: 18 },
  'País Vasco': { x: 50, y: 8 },
  'Comunitat Valenciana': { x: 68, y: 64 },
}

function ideologiaToColor(val: number): string {
  if (val < -0.5) return '#e74c3c'
  if (val < 0) return '#e67e22'
  if (val < 0.5) return '#95a5a6'
  if (val <= 1) return '#3498db'
  return '#2c3e50'
}

function getCcaaAbbr(nombre: string): string {
  const map: Record<string, string> = {
    'Andalucía': 'AND',
    'Aragón': 'ARA',
    'Asturias': 'AST',
    'Baleares': 'BAL',
    'Canarias': 'CAN',
    'Cantabria': 'CNT',
    'Castilla-La Mancha': 'CLM',
    'Castilla y León': 'CyL',
    'Cataluña': 'CAT',
    'Extremadura': 'EXT',
    'Galicia': 'GAL',
    'La Rioja': 'RIO',
    'Madrid': 'MAD',
    'Murcia': 'MUR',
    'Navarra': 'NAV',
    'País Vasco': 'PVA',
    'Comunitat Valenciana': 'VAL',
  }
  return map[nombre] ?? nombre.slice(0, 3).toUpperCase()
}

function scaleBubbleSize(val: number, max: number, minR: number, maxR: number): number {
  if (max === 0) return minR
  return minR + (val / max) * (maxR - minR)
}

interface CcaaTooltip {
  ccaa: CcaaItem
  x: number
  y: number
}

export default function NarrativeMap({ paises, ccaas }: NarrativeMapProps) {
  const [view, setView] = useState<ViewMode>('mundo')
  const [ccaaTooltip, setCcaaTooltip] = useState<CcaaTooltip | null>(null)

  const maxArticulosPaises = paises.reduce((m, p) => Math.max(m, p.n_articulos), 0)
  const maxArticulosCcaas = ccaas.reduce((m, c) => Math.max(m, c.n_articulos), 0)

  // Plotly marker sizes (1-40)
  const markerSizes = paises.map((p) =>
    scaleBubbleSize(p.n_articulos, maxArticulosPaises, 10, 40)
  )

  // Sentiment colors per country
  const markerColors = paises.map((p) => p.sentiment_avg)

  const scatterGeoData = [
    {
      type: 'scattergeo' as const,
      mode: 'markers' as const,
      lat: paises.map((p) => p.lat),
      lon: paises.map((p) => p.lon),
      text: paises.map((p) => `${p.country_name}: ${p.n_articulos} arts`),
      hoverinfo: 'text' as const,
      marker: {
        size: markerSizes,
        color: markerColors,
        colorscale: [
          [0, '#e74c3c'],
          [0.5, '#95a5a6'],
          [1, '#2ecc71'],
        ] as [number, string][],
        cmin: -1,
        cmax: 1,
        showscale: false,
        line: {
          color: 'rgba(255,255,255,0.4)',
          width: 1,
        },
        opacity: 0.85,
      },
    },
  ]

  const geoBase = {
    showland: true,
    landcolor: '#f0f0f0',
    showocean: true,
    oceancolor: '#e8f4f8',
    showcountries: true,
    countrycolor: '#cccccc',
  }

  const layoutMundo = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    height: 380,
    margin: { l: 0, r: 0, t: 0, b: 0 },
    geo: {
      ...geoBase,
      projection: { type: 'natural earth' as const },
    },
    showlegend: false,
  }

  const layoutEuropa = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    height: 380,
    margin: { l: 0, r: 0, t: 0, b: 0 },
    geo: {
      ...geoBase,
      center: { lat: 54, lon: 15 },
      projection: { type: 'mercator' as const },
      lataxis: { range: [35, 72] },
      lonaxis: { range: [-12, 40] },
    },
    showlegend: false,
  }

  const plotConfig = { displayModeBar: false, responsive: true }

  const views: { id: ViewMode; label: string }[] = [
    { id: 'mundo', label: '🌍 Mundo' },
    { id: 'europa', label: '🇪🇺 Europa' },
    { id: 'espana', label: '🗺️ España CCAA' },
  ]

  return (
    <div
      style={{
        fontFamily: '-apple-system, system-ui, sans-serif',
      }}
    >
      {/* Toggle buttons */}
      <div
        style={{
          display: 'inline-flex',
          gap: 4,
          background: '#f5f5f7',
          borderRadius: 24,
          padding: 4,
          marginBottom: 16,
        }}
      >
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              background: view === v.id ? '#0071e3' : 'transparent',
              color: view === v.id ? '#ffffff' : '#1d1d1f',
              border: 'none',
              borderRadius: 20,
              padding: '6px 16px',
              fontSize: 12.5,
              fontWeight: view === v.id ? 600 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 150ms',
              whiteSpace: 'nowrap',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Map area */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid #e8e8ed',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        {view === 'mundo' && (
          <Plot
            data={scatterGeoData}
            layout={layoutMundo}
            config={plotConfig}
            style={{ width: '100%' }}
            useResizeHandler
          />
        )}

        {view === 'europa' && (
          <Plot
            data={scatterGeoData}
            layout={layoutEuropa}
            config={plotConfig}
            style={{ width: '100%' }}
            useResizeHandler
          />
        )}

        {view === 'espana' && (
          <div
            style={{
              position: 'relative',
              height: 380,
              background: '#f8f9fa',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {ccaas.map((ccaa) => {
              const pos = CCAA_POSITIONS[ccaa.nombre_ccaa]
              if (!pos) return null
              const radius = scaleBubbleSize(
                ccaa.n_articulos,
                maxArticulosCcaas,
                20,
                45
              )
              const color = ideologiaToColor(ccaa.ideologia_media)
              const abbr = getCcaaAbbr(ccaa.nombre_ccaa)

              return (
                <div
                  key={ccaa.ccaa_id}
                  onMouseEnter={(e) => {
                    const rect = (
                      e.currentTarget.parentElement as HTMLDivElement
                    ).getBoundingClientRect()
                    setCcaaTooltip({
                      ccaa,
                      x:
                        e.currentTarget.getBoundingClientRect().left -
                        rect.left +
                        radius,
                      y:
                        e.currentTarget.getBoundingClientRect().top -
                        rect.top -
                        10,
                    })
                  }}
                  onMouseLeave={() => setCcaaTooltip(null)}
                  style={{
                    position: 'absolute',
                    left: `calc(${pos.x}% - ${radius}px)`,
                    top: `calc(${pos.y}% - ${radius}px)`,
                    width: radius * 2,
                    height: radius * 2,
                    borderRadius: '50%',
                    background: color,
                    opacity: 0.82,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'default',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
                    zIndex: 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: Math.max(8, radius / 3.5),
                      fontWeight: 700,
                      color: '#fff',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {abbr}
                  </span>
                </div>
              )
            })}

            {/* CCAA Tooltip */}
            {ccaaTooltip && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(ccaaTooltip.x, 260),
                  top: Math.max(ccaaTooltip.y - 60, 4),
                  background: '#1d1d1f',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 11.5,
                  lineHeight: 1.55,
                  zIndex: 100,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  {ccaaTooltip.ccaa.nombre_ccaa}
                </div>
                <div style={{ opacity: 0.8 }}>
                  {ccaaTooltip.ccaa.narrativa_dominante}
                </div>
                <div>
                  {ccaaTooltip.ccaa.n_articulos.toLocaleString('es-ES')} artículos
                </div>
              </div>
            )}

            {/* Legend */}
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 10,
                background: 'rgba(255,255,255,0.9)',
                borderRadius: 10,
                padding: '5px 12px',
                fontSize: 10,
                fontWeight: 600,
                boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {(
                [
                  { color: '#e74c3c', label: 'Izquierda' },
                  { color: '#e67e22', label: 'Centroizq.' },
                  { color: '#95a5a6', label: 'Centro' },
                  { color: '#3498db', label: 'Centrodcha.' },
                  { color: '#2c3e50', label: 'Derecha' },
                ] as { color: string; label: string }[]
              ).map((item) => (
                <span
                  key={item.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: '#1d1d1f',
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: item.color,
                      flexShrink: 0,
                    }}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
