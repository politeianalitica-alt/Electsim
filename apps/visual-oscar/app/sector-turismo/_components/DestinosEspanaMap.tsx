'use client'
/**
 * <DestinosEspanaMap /> · Turismo v3 · Sprint T6 (Destinos y territorio)
 *
 * Mapa de los ≥33 destinos turísticos POSICIONADOS por sus coordenadas
 * (lat/lon) sobre una silueta SVG procedural de la península + Baleares, con
 * inset de Canarias (convención cartográfica española). Mismo patrón que
 * `sector-energia/_components/H2ProjectsMap` / `NuclearMap` (silueta propia, sin
 * geojson): suficiente para situar cada destino sobre el territorio.
 *
 * El color de cada chincheta codifica la INTENSIDAD turística de la CCAA del
 * destino (pernoctaciones por comunidad, en vivo de `/api/turismo/ccaa`) →
 * escala secuencial claro→oscuro. Así un punto en Baleares/Canarias/Cataluña
 * "arde" y un punto en interior queda tenue. El radio distingue destinos `live`
 * (con dato de CCAA) de los de catálogo (anillo hueco).
 *
 * Interacción: hover → tooltip (nombre · CCAA · pernoctaciones CCAA); click →
 * selecciona el destino (drill, gestionado por el padre). El destino activo se
 * resalta. Cero emojis · Unicode geométrico (◔ ◉).
 *
 * NO toca lib/api/CCAAHexmap: solo CONSUME los destinos que le pasa el padre.
 */
import { useMemo, useState } from 'react'
import type { Destino } from './DestinosTerritorioView'

const ACCENT = '#0EA5E9'

// ── Proyección lon/lat → x/y (caja península + Baleares; Canarias en inset) ──
const MAP_W = 720
const MAP_H = 520
const LON_MIN = -9.8
const LON_MAX = 4.6
const LAT_MIN = 35.6
const LAT_MAX = 43.9

function projectMain(lon: number, lat: number): { x: number; y: number } {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * MAP_W
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H
  return { x, y }
}

const CAN_LON_MIN = -18.3
const CAN_LON_MAX = -13.3
const CAN_LAT_MIN = 27.5
const CAN_LAT_MAX = 29.5
const CAN_BOX = { x: 18, y: 392, w: 150, h: 96 }

function isCanarias(lon: number, lat: number): boolean {
  return lon <= -13 && lat <= 30
}

function projectCanarias(lon: number, lat: number): { x: number; y: number } {
  const x = CAN_BOX.x + ((lon - CAN_LON_MIN) / (CAN_LON_MAX - CAN_LON_MIN)) * CAN_BOX.w
  const y = CAN_BOX.y + ((CAN_LAT_MAX - lat) / (CAN_LAT_MAX - CAN_LAT_MIN)) * CAN_BOX.h
  return { x, y }
}

function projectPoint(lon: number, lat: number): { x: number; y: number } {
  return isCanarias(lon, lat) ? projectCanarias(lon, lat) : projectMain(lon, lat)
}

// Silueta peninsular esquemática (idéntico esquema que H2ProjectsMap).
const PENINSULA_PATH =
  'M 95 96 ' +
  'L 175 70 L 250 72 L 318 60 L 372 70 L 420 64 L 470 96 ' +
  'L 520 120 L 560 150 L 588 150 L 612 178 L 600 210 ' +
  'L 628 236 L 612 270 L 560 300 L 520 318 L 470 360 ' +
  'L 420 392 L 372 410 L 320 420 L 268 414 L 232 430 ' +
  'L 196 420 L 150 392 L 120 350 L 96 300 L 78 250 ' +
  'L 66 200 L 72 150 L 95 96 Z'
const BALEARES_PATH = 'M 632 300 l 30 -6 l 14 14 l -10 18 l -26 6 l -14 -16 Z'

// ── Escala de color secuencial (blanco-azul → ACCENT) por intensidad CCAA ────
function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  return [r, g, b]
}
const ACCENT_RGB = hexToRgb(ACCENT)
function colorForT(t: number): string {
  // light tone #DBEAFE → ACCENT
  const [lr, lg, lb] = [219, 234, 254]
  const r = Math.round(lr + (ACCENT_RGB[0] - lr) * t)
  const g = Math.round(lg + (ACCENT_RGB[1] - lg) * t)
  const b = Math.round(lb + (ACCENT_RGB[2] - lb) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function fmtMillones(v: number | null | undefined): string {
  if (v == null) return 'sin dato'
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M`
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} k`
  return v.toLocaleString('es-ES')
}

interface Props {
  destinos: Destino[]
  selectedSlug: string | null
  onSelect: (slug: string) => void
  nLive: number
  nTotal: number
  loading?: boolean
}

export function DestinosEspanaMap({ destinos, selectedSlug, onSelect, nLive, nTotal, loading = false }: Props) {
  const [hover, setHover] = useState<string | null>(null)

  // Rango de pernoctaciones de CCAA presentes (para normalizar el color).
  const { vmin, vmax } = useMemo(() => {
    const vals = destinos
      .map((d) => d.pernoctaciones_ccaa)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    return {
      vmin: vals.length ? Math.min(...vals) : 0,
      vmax: vals.length ? Math.max(...vals) : 1,
    }
  }, [destinos])

  const located = useMemo(
    () => destinos.filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lon)),
    [destinos],
  )

  if (loading) {
    return <div style={{ height: 420, background: '#F0F9FF', border: '1px solid #E0F2FE', borderRadius: 12 }} />
  }

  if (located.length === 0) {
    return (
      <div style={{ padding: '28px 20px', textAlign: 'center', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 12 }}>
        <div style={{ fontSize: 22, color: ACCENT, marginBottom: 6 }} aria-hidden="true">◔</div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>Sin destinos posicionables</p>
        <p style={{ margin: '6px auto 0', fontSize: 11, color: '#6e6e73', maxWidth: 420, lineHeight: 1.5 }}>
          El catálogo no devolvió destinos con coordenadas para el filtro actual.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ position: 'relative', background: '#F8FAFC', border: '1px solid #ECECEF', borderRadius: 12, overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Mapa de destinos turísticos de España">
          <defs>
            <linearGradient id="destinos-land" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EFF6FF" />
              <stop offset="100%" stopColor="#DBEAFE" />
            </linearGradient>
          </defs>
          <path d={PENINSULA_PATH} fill="url(#destinos-land)" stroke="#BFDBFE" strokeWidth={1.5} />
          <path d={BALEARES_PATH} fill="url(#destinos-land)" stroke="#BFDBFE" strokeWidth={1.5} />
          {/* Inset Canarias */}
          <rect x={CAN_BOX.x - 6} y={CAN_BOX.y - 6} width={CAN_BOX.w + 12} height={CAN_BOX.h + 12} rx={8} fill="#EFF6FF" stroke="#DBEAFE" strokeDasharray="3 3" />
          <text x={CAN_BOX.x - 2} y={CAN_BOX.y - 11} fontSize={9} fill="#94A3B8" fontWeight={700}>
            CANARIAS
          </text>

          {located.map((d) => {
            const { x, y } = projectPoint(d.lon, d.lat)
            const has = typeof d.pernoctaciones_ccaa === 'number' && Number.isFinite(d.pernoctaciones_ccaa)
            const t = has ? (vmax === vmin ? 0.5 : ((d.pernoctaciones_ccaa as number) - vmin) / (vmax - vmin)) : 0
            const fill = has ? colorForT(0.15 + 0.85 * t) : '#fff'
            const selected = selectedSlug === d.slug
            const active = hover === d.slug || selected
            const r = selected ? 8 : 6
            return (
              <g
                key={d.slug}
                onMouseEnter={() => setHover(d.slug)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(d.slug)}
                style={{ cursor: 'pointer' }}
                role="button"
                aria-label={`${d.nombre} · ${d.ccaa} · ${fmtMillones(d.pernoctaciones_ccaa)} pernoctaciones`}
              >
                <circle cx={x} cy={y} r={r + 5} fill={ACCENT} opacity={active ? 0.22 : 0} />
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={d.live ? fill : '#fff'}
                  stroke={selected ? '#0C4A6E' : d.live ? '#0369A1' : '#94A3B8'}
                  strokeWidth={selected ? 2.5 : d.live ? 1.5 : 1.4}
                  opacity={0.96}
                >
                  <title>{`${d.nombre} · ${d.ccaa}\n${fmtMillones(d.pernoctaciones_ccaa)} pernoctaciones CCAA${d.live ? '' : ' (catálogo · sin dato live)'}`}</title>
                </circle>
                {active && (
                  <g pointerEvents="none">
                    <rect
                      x={x + 10}
                      y={y - 30}
                      width={Math.max(130, d.nombre.length * 6.4)}
                      height={40}
                      rx={6}
                      fill="#0C4A6E"
                      opacity={0.96}
                    />
                    <text x={x + 18} y={y - 15} fontSize={10.5} fontWeight={700} fill="#fff">
                      {d.nombre.length > 28 ? d.nombre.slice(0, 27) + '…' : d.nombre}
                    </text>
                    <text x={x + 18} y={y - 2} fontSize={9} fill="#BAE6FD">
                      {d.ccaa} · {fmtMillones(d.pernoctaciones_ccaa)}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
        <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 9, color: '#94A3B8' }}>
          Silueta esquemática · posición por lat/lon
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>Menos</span>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} style={{ width: 16, height: 10, background: colorForT(0.15 + (0.85 * i) / 5), border: '0.5px solid #CBD5E1' }} />
          ))}
          <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>Más pernoctaciones CCAA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: '#475569' }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: ACCENT, border: '1.5px solid #0369A1' }} />
          live ({nLive})
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#fff', border: '1.4px solid #94A3B8', marginLeft: 8 }} />
          catálogo ({Math.max(0, nTotal - nLive)})
        </div>
      </div>
      <p style={{ margin: '6px 2px 0', fontSize: 10, color: '#94A3B8', lineHeight: 1.5 }}>
        Color por intensidad turística de la comunidad del destino (pernoctaciones por CCAA, Eurostat NUTS2).
        Pulsa un destino para ver su detalle. Coordenadas: constantes geográficas del catálogo.
      </p>
    </div>
  )
}

export default DestinosEspanaMap
