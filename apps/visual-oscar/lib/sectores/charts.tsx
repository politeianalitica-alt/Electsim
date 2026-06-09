'use client'
/**
 * Charts y primitivas compartidas entre vistas sectoriales · Politeia v3
 *
 * Extraídas de Vivienda v3 (ViviendaPreciosView, ViviendaAlquilerView,
 * ViviendaPoliticaView) para no duplicar código entre sectores. Las usan
 * Vivienda v3, Farma v3, y cualquier sector futuro que necesite paneles
 * con fuente + KPIs + gráficos SVG ligeros sin dependencias externas.
 *
 * Cero emojis (CLAUDE.md §0.5). Todas las primitivas son agnósticas del sector
 * (reciben color como prop). Cero datos hardcoded.
 */
import type { CSSProperties, ReactNode } from 'react'

// ─── Panel con header de fuente ────────────────────────────

export interface PanelProps {
  /** Título del panel (h3, font-display). */
  titulo: string
  /** Etiqueta de la fuente (ej "INE · IPV"). Va a la derecha en gris. */
  fuente: string
  /** URL de la fuente · enlace clickable. */
  url: string
  children: ReactNode
  /** Margin-bottom opcional (default 0, lo gestiona el contenedor padre). */
  marginBottom?: boolean
}

export function Panel({ titulo, fuente, url, children, marginBottom = false }: PanelProps) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '20px 22px',
        marginBottom: marginBottom ? 14 : 0,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: '-0.015em',
            margin: 0,
          }}
        >
          {titulo}
        </h3>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 10.5, color: '#86868b', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {fuente} ›
        </a>
      </header>
      {children}
    </section>
  )
}

// ─── KPI mini-card con color de acento y sub-texto opcional ─

export interface MiniProps {
  label: string
  value: number | null
  unit: string
  color: string
  decimals?: number
  sub?: string
}

export function Mini({ label, value, unit, color, decimals = 1, sub }: MiniProps) {
  return (
    <div
      style={{
        background: '#FAFAFA',
        border: '1px solid #ECECEF',
        borderTop: `3px solid ${color}`,
        borderRadius: 10,
        padding: '10px 12px',
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#86868b',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: value == null ? '#9CA3AF' : color,
          marginTop: 2,
        }}
      >
        {value == null ? '—' : value.toLocaleString('es-ES', { maximumFractionDigits: decimals })}
        <span style={{ fontSize: 11, marginLeft: 4, color: '#86868b' }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 10, color: '#86868b', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─── Estados UI ────────────────────────────────────────────

export function Skeleton({ h = 200 }: { h?: number }) {
  return <div style={{ height: h, background: 'rgba(0,0,0,0.04)', borderRadius: 8 }} />
}

export function Vacio({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: 10,
        fontSize: 12,
        color: '#991B1B',
      }}
    >
      {msg}
    </div>
  )
}

// ─── Línea simple (1 serie) ────────────────────────────────

export interface LineChartProps {
  points: Array<{ t: string; value: number | null }>
  color: string
  /** Width/Height del viewBox (default 700×220). */
  width?: number
  height?: number
}

export function LineChart({ points, color, width = 700, height = 220 }: LineChartProps) {
  const valid = points.filter((p) => p.value != null)
  if (!valid.length) return <Vacio msg="Sin datos" />
  const W = width
  const H = height
  const P = 30
  const values = valid.map((p) => p.value as number)
  const minY = Math.min(...values) * 0.98
  const maxY = Math.max(...values) * 1.02
  const path = valid
    .map((p, i) => {
      const x = P + (i / (valid.length - 1)) * (W - 2 * P)
      const y = P + (1 - ((p.value as number) - minY) / (maxY - minY)) * (H - 2 * P)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" />
      ))}
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} />
      {valid
        .filter((_, i) => i % Math.ceil(valid.length / 6) === 0)
        .map((p) => {
          const i = valid.findIndex((v) => v.t === p.t)
          const x = P + (i / (valid.length - 1)) * (W - 2 * P)
          return (
            <text key={p.t} x={x} y={H + 14} textAnchor="middle" style={{ fontSize: 9, fill: '#86868b' }}>
              {p.t}
            </text>
          )
        })}
      <text x={4} y={P + 4} style={{ fontSize: 9, fill: '#86868b' }}>
        {maxY.toFixed(0)}
      </text>
      <text x={4} y={H - P + 4} style={{ fontSize: 9, fill: '#86868b' }}>
        {minY.toFixed(0)}
      </text>
    </svg>
  )
}

// ─── Multi-línea (varias series con leyenda) ────────────────

export interface MultiLineSeries {
  /** Identificador interno (ES, EU27_2020, NOM, REAL, …). */
  geo: string
  /** Etiqueta legible para la leyenda. */
  label: string
  color: string
  points: Array<{ time: string; value: number | null }>
}

export interface MultiLineChartProps {
  series: MultiLineSeries[]
  width?: number
  height?: number
}

export function MultiLineChart({ series, width = 700, height = 220 }: MultiLineChartProps) {
  const all = series.flatMap((s) => s.points.filter((p) => p.value != null).map((p) => p.value as number))
  if (all.length === 0) return <Vacio msg="Sin datos comunes" />
  const W = width
  const H = height
  const P = 30
  const minY = Math.min(...all) * 0.97
  const maxY = Math.max(...all) * 1.03

  // Eje X: union de tiempos ordenados
  const times = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.time)))).sort()
  const xFor = (t: string) => {
    const i = times.indexOf(t)
    if (i < 0) return P
    return P + (i / Math.max(1, times.length - 1)) * (W - 2 * P)
  }
  // Las series principales (con id corto especial) salen más gruesas
  const PRINCIPAL_IDS = new Set(['ES', 'NOM', 'REAL'])
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" />
      ))}
      {series.map((s) => {
        const pts = s.points.filter((p) => p.value != null)
        if (pts.length === 0) return null
        const path = pts
          .map((p, i) => {
            const x = xFor(p.time)
            const y = P + (1 - ((p.value as number) - minY) / (maxY - minY)) * (H - 2 * P)
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
          })
          .join(' ')
        const isMain = PRINCIPAL_IDS.has(s.geo)
        return (
          <path
            key={s.geo}
            d={path}
            fill="none"
            stroke={s.color}
            strokeWidth={isMain ? 2.5 : 1.6}
            opacity={isMain ? 1 : 0.7}
          />
        )
      })}
      {times
        .filter((_, i) => i % Math.ceil(times.length / 6) === 0)
        .map((t) => (
          <text key={t} x={xFor(t)} y={H + 14} textAnchor="middle" style={{ fontSize: 9, fill: '#86868b' }}>
            {t}
          </text>
        ))}
      <text x={4} y={P + 4} style={{ fontSize: 9, fill: '#86868b' }}>
        {maxY.toFixed(0)}
      </text>
      <text x={4} y={H - P + 4} style={{ fontSize: 9, fill: '#86868b' }}>
        {minY.toFixed(0)}
      </text>
    </svg>
  )
}

// ─── Bar ranking horizontal (España resaltada) ─────────────

export interface RankRow {
  geo: string
  label: string
  value: number | null
  time?: string
}

export interface RankChartProps {
  rows: RankRow[]
  /** Identificador a resaltar (por defecto "ES"). */
  highlight?: string
  /** Color de la barra resaltada y la fila resaltada. */
  highlightColor?: string
  /** Color por defecto del resto de barras. */
  baseColor?: string
  /** Unidad para la columna numérica (%/pp/M€...). */
  unit?: string
  decimals?: number
  /** Formato exacto del valor (recibe el valor crudo y devuelve la string). */
  format?: (v: number) => string
}

export function RankChart({
  rows,
  highlight = 'ES',
  highlightColor = '#DB2777',
  baseColor = '#1F4E8C',
  unit = '%',
  decimals = 1,
  format,
}: RankChartProps) {
  const ranked = rows
    .filter((r) => r.value != null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  if (ranked.length === 0) return <Vacio msg="Sin datos comparables" />
  const maxVal = (ranked[0].value as number) || 1
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {ranked.map((r) => {
        const isH = r.geo === highlight
        const widthPct = ((r.value as number) / maxVal) * 100
        const valFormatted = format
          ? format(r.value as number)
          : (r.value as number).toLocaleString('es-ES', { maximumFractionDigits: decimals })
        return (
          <li
            key={r.geo}
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr 100px',
              gap: 10,
              alignItems: 'center',
              padding: '6px 10px',
              background: isH ? '#FCE7F3' : 'transparent',
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: isH ? 700 : 500, color: '#1d1d1f' }}>{r.label}</span>
            <div style={{ height: 14, background: '#F5F5F7', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${widthPct}%`,
                  background: isH ? highlightColor : baseColor,
                }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: isH ? highlightColor : baseColor,
                textAlign: 'right',
              }}
            >
              {valFormatted}
              {unit}
              {r.time ? ` (${r.time})` : ''}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// ─── Hero section gradient ──────────────────────────────────

export interface SectorHeroProps {
  /** Tagline (uppercase pequeño). */
  tag: string
  /** Titular grande. */
  titulo: string
  /** Subtítulo informativo. */
  descripcion: string
  /** Color principal del gradiente. */
  colorFrom: string
  /** Color final del gradiente. */
  colorTo: string
}

export function SectorHero({ tag, titulo, descripcion, colorFrom, colorTo }: SectorHeroProps) {
  return (
    <section
      style={{
        background: `linear-gradient(135deg, ${colorFrom} 0%, ${colorTo} 100%)`,
        borderRadius: 18,
        padding: '24px 32px',
        color: '#fff',
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.16em',
          opacity: 0.8,
          textTransform: 'uppercase',
          margin: '0 0 8px',
        }}
      >
        {tag}
      </p>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          margin: '0 0 8px',
        }}
      >
        {titulo}
      </h2>
      <p style={{ fontSize: 13, opacity: 0.85, margin: 0, lineHeight: 1.55, maxWidth: 880 }}>{descripcion}</p>
    </section>
  )
}

// ─── Helpers estilo tabla ──────────────────────────────────

export const Th: CSSProperties = {
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#6e6e73',
  padding: '8px 10px',
}
export const Td: CSSProperties = {
  fontSize: 11.5,
  color: '#1d1d1f',
  padding: '10px 10px',
  verticalAlign: 'top',
}
