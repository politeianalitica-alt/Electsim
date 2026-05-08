'use client'
import { useState, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 900
const H = 460

const MUNDO_BOUNDS = { latMin: -60, latMax: 82, lonMin: -175, lonMax: 180 } as const
const EUROPA_BOUNDS = { latMin: 34, latMax: 72, lonMin: -14, lonMax: 42 } as const

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

const NARRATIVA_COLORS: Record<string, string> = {
  politica: '#4a90e2',
  economia: '#27ae60',
  justicia: '#e74c3c',
  vivienda: '#e67e22',
  sanidad: '#9b59b6',
  inmigracion: '#c0392b',
  energia: '#f39c12',
  educacion: '#2ecc71',
  generalista: '#6c7480',
}

const NARRATIVA_LABELS: Record<string, string> = {
  politica: 'Política',
  economia: 'Economía',
  justicia: 'Justicia',
  vivienda: 'Vivienda',
  sanidad: 'Sanidad',
  inmigracion: 'Inmigración',
  energia: 'Energía',
  educacion: 'Educación',
  generalista: 'Generalista',
}

const CCAA_ABBR: Record<string, string> = {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface Bounds {
  latMin: number
  latMax: number
  lonMin: number
  lonMax: number
}

function project(
  lat: number,
  lon: number,
  bounds: Bounds,
  w: number,
  h: number,
): { x: number; y: number } {
  const x = ((lon - bounds.lonMin) / (bounds.lonMax - bounds.lonMin)) * w
  const y = ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * h
  return { x, y }
}

function sentimentColor(s: number): string {
  if (s > 0.2) return '#00c47c'
  if (s > 0.05) return '#4dba87'
  if (s > -0.05) return '#6c7480'
  if (s > -0.2) return '#e07840'
  return '#c42c2c'
}

function narrativaColor(n: string): string {
  return NARRATIVA_COLORS[n] ?? '#6c7480'
}

function bubbleRadius(n: number, max: number): number {
  const r = (n / (max || 1)) * 28 + 6
  return Math.min(Math.max(r, 6), 34)
}

// ─── Graticule ────────────────────────────────────────────────────────────────

function buildGraticule(bounds: Bounds, step: number, w: number, h: number): string[] {
  const lines: string[] = []

  // Horizontal (parallels)
  const latStart = Math.ceil(bounds.latMin / step) * step
  for (let lat = latStart; lat <= bounds.latMax; lat += step) {
    const y = ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * h
    lines.push(`M0,${y.toFixed(1)}H${w}`)
  }

  // Vertical (meridians)
  const lonStart = Math.ceil(bounds.lonMin / step) * step
  for (let lon = lonStart; lon <= bounds.lonMax; lon += step) {
    const x = ((lon - bounds.lonMin) / (bounds.lonMax - bounds.lonMin)) * w
    lines.push(`M${x.toFixed(1)},0V${h}`)
  }

  return lines
}

// ─── Tooltip state type ───────────────────────────────────────────────────────

interface TooltipState {
  x: number
  y: number
  lines: string[]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Tooltip({ tip }: { tip: TooltipState }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: tip.x + 10,
        top: tip.y - 10,
        background: '#0d1f3a',
        color: '#fff',
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 11.5,
        lineHeight: 1.6,
        zIndex: 200,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 18px rgba(0,0,0,0.45)',
        border: '1px solid rgba(64,96,160,0.4)',
      }}
    >
      {tip.lines.map((l, i) => (
        <div key={i} style={i === 0 ? { fontWeight: 700, marginBottom: 2 } : { opacity: 0.82 }}>
          {l}
        </div>
      ))}
    </div>
  )
}

// ─── World / Europa SVG map ───────────────────────────────────────────────────

interface GeoMapProps {
  paises: PaisItem[]
  bounds: Bounds
  graticuleStep: number
}

function GeoMap({ paises, bounds, graticuleStep }: GeoMapProps) {
  const [tip, setTip] = useState<TooltipState | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const maxArt = paises.reduce((m, p) => Math.max(m, p.n_articulos), 0)
  const gratPaths = buildGraticule(bounds, graticuleStep, W, H)

  function handleMouseMove(p: PaisItem, e: React.MouseEvent<SVGCircleElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    const svgX = (e.clientX - rect.left) * scaleX
    const svgY = (e.clientY - rect.top) * scaleY
    setTip({
      x: (svgX / W) * rect.width,
      y: (svgY / H) * rect.height,
      lines: [
        p.country_name,
        `${p.n_articulos.toLocaleString('es-ES')} artículos`,
        `Sentimiento: ${p.sentiment_avg.toFixed(2)}`,
      ],
    })
  }

  const empty = paises.length === 0

  return (
    <div style={{ position: 'relative', lineHeight: 0 }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', background: '#0b1422', borderRadius: 12 }}
        aria-label="Mapa narrativo"
      >
        {/* Graticule */}
        <g stroke="#4060a0" strokeWidth={0.7} opacity={0.12} fill="none">
          {gratPaths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {empty && (
          <text
            x={W / 2}
            y={H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.35)"
            fontSize={14}
            fontFamily="-apple-system, system-ui, sans-serif"
          >
            Sin datos · Conectando con backend…
          </text>
        )}

        {/* Bubbles */}
        {paises.map((p) => {
          const { x, y } = project(p.lat, p.lon, bounds, W, H)
          if (x < -40 || x > W + 40 || y < -40 || y > H + 40) return null
          const r = bubbleRadius(p.n_articulos, maxArt)
          const fill = sentimentColor(p.sentiment_avg)
          return (
            <g key={p.country_code}>
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={fill}
                opacity={0.82}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={0.5}
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => handleMouseMove(p, e)}
                onMouseLeave={() => setTip(null)}
              />
              {r >= 14 && (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize={9}
                  fontFamily="-apple-system, system-ui, sans-serif"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {p.country_code.toUpperCase()}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {tip && <Tooltip tip={tip} />}
    </div>
  )
}

// ─── Spain CCAA bubble map ────────────────────────────────────────────────────

function SpainMap({ ccaas }: { ccaas: CcaaItem[] }) {
  const [tip, setTip] = useState<TooltipState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const maxArt = ccaas.reduce((m, c) => Math.max(m, c.n_articulos), 0)
  const empty = ccaas.length === 0

  // Gather unique narrativas for legend
  const usedNarrativas = Array.from(
    new Set(ccaas.map((c) => c.narrativa_dominante).filter((n) => n in NARRATIVA_COLORS)),
  )

  function handleMouseMove(c: CcaaItem, e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      lines: [
        c.nombre_ccaa,
        NARRATIVA_LABELS[c.narrativa_dominante] ?? c.narrativa_dominante,
        `${c.n_articulos.toLocaleString('es-ES')} artículos`,
      ],
    })
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        height: 500,
        background: '#0b1422',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Spain region background */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        aria-hidden
      >
        <ellipse cx="50" cy="50" rx="42" ry="40" fill="#1a2540" />
      </svg>

      {empty && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 14,
            fontFamily: '-apple-system, system-ui, sans-serif',
            zIndex: 5,
          }}
        >
          Sin datos · Conectando con backend…
        </div>
      )}

      {/* CCAA bubbles */}
      {ccaas.map((c) => {
        const pos = CCAA_POSITIONS[c.nombre_ccaa]
        if (!pos) return null
        const r = Math.round(bubbleRadius(c.n_articulos, maxArt) * 1.1)
        const color = narrativaColor(c.narrativa_dominante)
        const abbr = CCAA_ABBR[c.nombre_ccaa] ?? c.nombre_ccaa.slice(0, 3).toUpperCase()
        return (
          <div
            key={c.ccaa_id}
            onMouseMove={(e) => handleMouseMove(c, e)}
            onMouseLeave={() => setTip(null)}
            style={{
              position: 'absolute',
              left: `calc(${pos.x}% - ${r}px)`,
              top: `calc(${pos.y}% - ${r}px)`,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              background: color,
              opacity: 0.87,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'default',
              boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
              zIndex: 2,
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            <span
              style={{
                fontSize: Math.max(8, Math.round(r / 2.6)),
                fontWeight: 700,
                color: '#fff',
                pointerEvents: 'none',
                userSelect: 'none',
                fontFamily: '-apple-system, system-ui, sans-serif',
              }}
            >
              {abbr}
            </span>
          </div>
        )
      })}

      {/* Legend */}
      {usedNarrativas.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px 10px',
            justifyContent: 'center',
            background: 'rgba(11,20,34,0.82)',
            borderRadius: 10,
            padding: '6px 14px',
            maxWidth: '90%',
            zIndex: 10,
            border: '1px solid rgba(64,96,160,0.3)',
          }}
        >
          {usedNarrativas.map((n) => (
            <span
              key={n}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                color: '#cdd5e0',
                fontSize: 10.5,
                fontWeight: 500,
                fontFamily: '-apple-system, system-ui, sans-serif',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: NARRATIVA_COLORS[n],
                  flexShrink: 0,
                }}
              />
              {NARRATIVA_LABELS[n] ?? n}
            </span>
          ))}
        </div>
      )}

      {tip && <Tooltip tip={tip} />}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NarrativeMap({ paises, ccaas }: NarrativeMapProps) {
  const [view, setView] = useState<ViewMode>('mundo')

  const views: { id: ViewMode; label: string }[] = [
    { id: 'mundo', label: 'Mundo' },
    { id: 'europa', label: 'Europa' },
    { id: 'espana', label: 'España CCAA' },
  ]

  return (
    <div style={{ fontFamily: '-apple-system, system-ui, sans-serif' }}>
      {/* Toggle buttons */}
      <div
        style={{
          display: 'inline-flex',
          gap: 4,
          background: 'rgba(255,255,255,0.07)',
          borderRadius: 24,
          padding: 4,
          marginBottom: 14,
          border: '1px solid rgba(64,96,160,0.25)',
        }}
      >
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              background: view === v.id ? '#2a4a9c' : 'transparent',
              color: view === v.id ? '#e8f0ff' : '#8899bb',
              border: 'none',
              borderRadius: 20,
              padding: '6px 16px',
              fontSize: 12.5,
              fontWeight: view === v.id ? 700 : 500,
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
      {view === 'mundo' && (
        <GeoMap paises={paises} bounds={MUNDO_BOUNDS} graticuleStep={20} />
      )}
      {view === 'europa' && (
        <GeoMap paises={paises} bounds={EUROPA_BOUNDS} graticuleStep={10} />
      )}
      {view === 'espana' && <SpainMap ccaas={ccaas} />}
    </div>
  )
}
