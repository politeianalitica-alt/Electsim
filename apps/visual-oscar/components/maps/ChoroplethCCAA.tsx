'use client'
/**
 * <ChoroplethCCAA /> · coropleta de Comunidades Autónomas · Politeia
 *
 * Mapa coroplético genérico de España por CCAA usando d3-geo (SVG puro, sin
 * tiles ni MapLibre — mismo enfoque que WorldGeoMap). Une los valores con
 * public/geodata/spain-ccaa.geojson por la propiedad `cod_ccaa` (INE 2 díg).
 *
 * Reutilizable por cualquier sector: producción agraria por CCAA, demanda
 * regional, intensidad de cualquier indicador territorial. Degrada solo:
 * CCAA sin valor → gris claro; geojson no carga → mensaje honesto.
 */
import { useEffect, useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'

export interface ChoroplethValue {
  /** cod_ccaa INE de 2 dígitos (zero-padded) que casa con el geojson. */
  code: string
  label: string
  value: number | null
  /** Texto secundario opcional en el tooltip. */
  sub?: string
}

interface Props {
  values: ChoroplethValue[]
  unidad?: string
  /** Color para el valor más bajo (degradado hacia colorHigh). */
  colorLow?: string
  /** Color para el valor más alto. */
  colorHigh?: string
  height?: number
  formatValue?: (v: number) => string
  onSelect?: (code: string, label: string) => void
  selectedCode?: string | null
  /** Si true, escala invertida (valor bajo = color intenso · ej. sequía). */
  invertScale?: boolean
}

interface GeoFeature {
  type: 'Feature'
  properties: { cod_ccaa?: string; name?: string; noml_ccaa?: string; [k: string]: unknown } | null
  geometry: unknown
}
interface GeoFC {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

const SVG_W = 640
const SVG_H = 480

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `rgb(${r}, ${g}, ${bl})`
}

export default function ChoroplethCCAA({
  values,
  unidad = '',
  colorLow = '#EAF7EE',
  colorHigh = '#166534',
  height = 420,
  formatValue,
  onSelect,
  selectedCode = null,
  invertScale = false,
}: Props) {
  const [geojson, setGeojson] = useState<GeoFC | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState<{ x: number; y: number; v: ChoroplethValue } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/geodata/spain-ccaa.geojson')
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setGeojson(j) })
      .catch((e) => { if (!cancelled) setError(String(e)) })
    return () => { cancelled = true }
  }, [])

  const byCode = useMemo(() => {
    const m: Record<string, ChoroplethValue> = {}
    values.forEach((v) => { if (v.code) m[v.code] = v })
    return m
  }, [values])

  const { min, max } = useMemo(() => {
    const nums = values.map((v) => v.value).filter((v): v is number => v != null)
    return { min: nums.length ? Math.min(...nums) : 0, max: nums.length ? Math.max(...nums) : 1 }
  }, [values])

  const pathFn = useMemo(() => {
    if (!geojson) return null
    const proj = geoMercator().fitSize([SVG_W, SVG_H], geojson as never)
    return geoPath(proj)
  }, [geojson])

  const fmt = (v: number) => (formatValue ? formatValue(v) : v.toLocaleString('es-ES', { maximumFractionDigits: 0 }))

  function colorFor(v: number | null): string {
    if (v == null) return '#EFEFF2'
    const span = max - min || 1
    let t = (v - min) / span
    if (invertScale) t = 1 - t
    return lerpColor(colorLow, colorHigh, Math.max(0, Math.min(1, t)))
  }

  if (error) return <div style={{ padding: 32, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>Error cargando mapa: {error}</div>
  if (!geojson || !pathFn) return <div style={{ padding: 32, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>Cargando mapa de CCAA…</div>

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', display: 'block' }} onMouseLeave={() => setHover(null)}>
        {geojson.features.map((feat, idx) => {
          const code = String(feat.properties?.cod_ccaa ?? '')
          const v = byCode[code] ?? null
          const d = pathFn(feat as never)
          if (!d) return null
          const selected = selectedCode != null && code === selectedCode
          return (
            <path
              key={`ccaa-${idx}`}
              d={d}
              fill={colorFor(v?.value ?? null)}
              stroke={selected ? '#1d1d1f' : '#ffffff'}
              strokeWidth={selected ? 1.8 : 0.6}
              style={{ cursor: v ? 'pointer' : 'default', transition: 'fill 160ms' }}
              onMouseEnter={(e) => {
                if (!v) return
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, v })
              }}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                setHover((h) => (h ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top } : h))
              }}
              onClick={() => { if (v && onSelect) onSelect(code, v.label) }}
            />
          )
        })}
      </svg>

      {/* Leyenda gradiente */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px 0', fontSize: 10, color: '#86868b' }}>
        <span>{fmt(invertScale ? max : min)} {unidad}</span>
        <span
          style={{
            flex: 1,
            height: 8,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${colorLow}, ${colorHigh})`,
          }}
        />
        <span>{fmt(invertScale ? min : max)} {unidad}</span>
      </div>

      {hover && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(hover.x + 14, SVG_W - 160),
            top: hover.y - 10,
            zIndex: 50,
            pointerEvents: 'none',
            background: 'white',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 10,
            padding: '8px 12px',
            boxShadow: '0 4px 18px rgba(0,0,0,0.12)',
            minWidth: 150,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>{hover.v.label}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: colorHigh }}>
            {hover.v.value != null ? `${fmt(hover.v.value)} ${unidad}` : 'sin dato'}
          </div>
          {hover.v.sub && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{hover.v.sub}</div>}
        </div>
      )}
    </div>
  )
}
