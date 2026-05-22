'use client'
/**
 * `<CCAAHexmap />` · mapa hexagonal de las 19 CCAA + ciudades autónomas.
 *
 * Diseño tipo El Confidencial / El País / Reuters: hexágonos planos colocados
 * en posiciones aproximadas a la geografía real, con color por intensidad
 * del indicador.
 *
 * - Sin dependencias externas (puro SVG inline + React)
 * - Aria-labels accesibles por hexágono
 * - Tooltip nativo via `<title>`
 * - Click handler opcional → /macro/{subtab}/region/{ccaaId}
 *
 * No es un mapa topojson preciso · es una **representación esquemática** que
 * preserva la posición relativa (norte–sur, este–oeste) y permite comparar
 * 19 territorios de un vistazo sin solapamientos.
 */
import { useMemo } from 'react'

export interface CCAADatum {
  /** Id estable, debe coincidir con el id de `CCAA_CATALOG` */
  id: string
  /** Valor a usar para el color (típicamente normalizado 0-100, pero acepta cualquier escala) */
  value: number | null
  /** Etiqueta opcional para tooltip (si null se usa el shortLabel del id) */
  tooltipLabel?: string
}

interface Props {
  data: CCAADatum[]
  /** Color base — se usa para gradiente claro→oscuro */
  accent?: string
  /** Color de hexágonos sin dato */
  emptyColor?: string
  /** href opcional para enlace por hexágono · `(id) => string` */
  hrefFor?: (ccaaId: string) => string
  /** Callback click si no se usa href */
  onClick?: (ccaaId: string) => void
  width?: number
  height?: number
  /** Unidad para el tooltip, ej. "%", "€" */
  unit?: string
  /** Formato custom de valor; default: 2 decimales */
  formatValue?: (v: number) => string
}

// Posiciones manualmente colocadas para parecerse a la geografía de España
// (norte arriba, sur abajo). Keys = `id` del CCAA catalog (slugs lowercase).
// r=24, así que minimum spacing ≈ 42 entre hex.
const POSITIONS: Record<string, { x: number; y: number; short: string; label: string }> = {
  galicia:               { x: 70,  y: 60,  short: 'GAL', label: 'Galicia' },
  asturias:              { x: 140, y: 60,  short: 'AST', label: 'Asturias' },
  cantabria:             { x: 200, y: 60,  short: 'CTB', label: 'Cantabria' },
  'pais-vasco':          { x: 260, y: 60,  short: 'PV',  label: 'País Vasco' },
  navarra:               { x: 320, y: 60,  short: 'NAV', label: 'Navarra' },
  aragon:                { x: 380, y: 100, short: 'ARA', label: 'Aragón' },
  cataluna:              { x: 440, y: 100, short: 'CAT', label: 'Cataluña' },
  'la-rioja':            { x: 290, y: 100, short: 'RIO', label: 'La Rioja' },
  'castilla-leon':       { x: 200, y: 130, short: 'CYL', label: 'Castilla y León' },
  madrid:                { x: 230, y: 175, short: 'MAD', label: 'Madrid' },
  extremadura:           { x: 140, y: 200, short: 'EXT', label: 'Extremadura' },
  'castilla-la-mancha':  { x: 290, y: 200, short: 'CLM', label: 'Castilla-La Mancha' },
  valencia:              { x: 380, y: 195, short: 'CVA', label: 'Comunitat Valenciana' },
  baleares:              { x: 470, y: 190, short: 'BAL', label: 'Illes Balears' },
  murcia:                { x: 350, y: 250, short: 'MUR', label: 'Murcia' },
  andalucia:             { x: 220, y: 260, short: 'AND', label: 'Andalucía' },
  canarias:              { x: 70,  y: 300, short: 'CAN', label: 'Canarias' },
  ceuta:                 { x: 180, y: 320, short: 'CEU', label: 'Ceuta' },
  melilla:               { x: 240, y: 320, short: 'MEL', label: 'Melilla' },
}

// Convierte hex color → rgb tuple
function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '')
  const h =
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return [r, g, b]
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Devuelve color HEX entre blanco-claro y `accent` según `t` (0..1) */
function colorScale(accent: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(accent)
  // light tone: #f8fafc (slate-50) for empty contrast → #...
  const [lr, lg, lb] = [248, 250, 252]
  const r = Math.round(lerp(lr, ar, t))
  const g = Math.round(lerp(lg, ag, t))
  const b = Math.round(lerp(lb, ab, t))
  return `rgb(${r}, ${g}, ${b})`
}

function hexPath(cx: number, cy: number, r: number): string {
  // flat-top hexagon
  const angles = [0, 60, 120, 180, 240, 300]
  const pts = angles.map((a) => {
    const rad = ((a - 90) * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  })
  return `M ${pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L ')} Z`
}

export function CCAAHexmap({
  data,
  accent = '#0F766E',
  emptyColor = '#e2e8f0',
  hrefFor,
  onClick,
  width = 540,
  height = 360,
  unit = '',
  formatValue,
}: Props) {
  const { byId, vmin, vmax } = useMemo(() => {
    const map: Record<string, CCAADatum> = {}
    const vals: number[] = []
    for (const d of data) {
      map[d.id] = d
      if (d.value != null && Number.isFinite(d.value)) vals.push(d.value)
    }
    return {
      byId: map,
      vmin: vals.length ? Math.min(...vals) : 0,
      vmax: vals.length ? Math.max(...vals) : 1,
    }
  }, [data])

  const fmt = formatValue || ((v: number) => v.toFixed(2))
  const r = 24

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      style={{ display: 'block', background: '#ffffff', borderRadius: 8 }}
      role="img"
      aria-label="Mapa hexagonal de las 19 comunidades autónomas de España"
    >
      {Object.entries(POSITIONS).map(([id, pos]) => {
        const datum = byId[id]
        const v = datum?.value
        const has = v != null && Number.isFinite(v)
        const t = has ? (vmax === vmin ? 0.5 : (v - vmin) / (vmax - vmin)) : 0
        const fill = has ? colorScale(accent, 0.15 + 0.85 * t) : emptyColor
        const stroke = has ? accent : '#cbd5e1'

        const tooltipText = datum?.tooltipLabel
          ? `${datum.tooltipLabel}: ${has ? `${fmt(v!)}${unit}` : '—'}`
          : `${pos.label}: ${has ? `${fmt(v!)}${unit}` : 'sin dato'}`

        const path = hexPath(pos.x, pos.y, r)

        const interactive = !!(hrefFor || onClick)
        const commonProps = {
          style: { cursor: interactive ? 'pointer' : 'default' },
          role: 'button' as const,
          'aria-label': tooltipText,
        }

        const shape = (
          <>
            <path d={path} fill={fill} stroke={stroke} strokeWidth={1.5} />
            <text
              x={pos.x}
              y={pos.y + 3}
              textAnchor="middle"
              style={{
                fontSize: 9,
                fontWeight: 700,
                fill: t > 0.6 ? '#fff' : '#0f172a',
                pointerEvents: 'none',
              }}
            >
              {pos.short}
            </text>
            {has && (
              <text
                x={pos.x}
                y={pos.y + 14}
                textAnchor="middle"
                style={{
                  fontSize: 8,
                  fontWeight: 500,
                  fill: t > 0.6 ? '#f1f5f9' : '#475569',
                  pointerEvents: 'none',
                  fontVariantNumeric: 'tabular-nums' as any,
                }}
              >
                {fmt(v!)}
              </text>
            )}
            <title>{tooltipText}</title>
          </>
        )

        if (hrefFor) {
          return (
            <a key={id} href={hrefFor(id)} {...commonProps}>
              {shape}
            </a>
          )
        }
        if (onClick) {
          return (
            <g key={id} onClick={() => onClick(id)} {...commonProps}>
              {shape}
            </g>
          )
        }
        return (
          <g key={id} {...commonProps}>
            {shape}
          </g>
        )
      })}

      {/* Leyenda escala color */}
      <g transform={`translate(${width - 130}, ${height - 30})`}>
        <text x={0} y={-2} style={{ fontSize: 8, fill: '#64748b', fontWeight: 600 }}>
          Escala
        </text>
        {Array.from({ length: 6 }).map((_, i) => (
          <rect
            key={i}
            x={i * 18}
            y={4}
            width={18}
            height={10}
            fill={colorScale(accent, 0.15 + (0.85 * i) / 5)}
            stroke="#cbd5e1"
            strokeWidth={0.5}
          />
        ))}
        <text x={0} y={26} style={{ fontSize: 7, fill: '#94a3b8' }}>
          mín {Number.isFinite(vmin) ? vmin.toFixed(1) : '—'}
        </text>
        <text x={108} y={26} textAnchor="end" style={{ fontSize: 7, fill: '#94a3b8' }}>
          máx {Number.isFinite(vmax) ? vmax.toFixed(1) : '—'}
        </text>
      </g>
    </svg>
  )
}

export default CCAAHexmap
