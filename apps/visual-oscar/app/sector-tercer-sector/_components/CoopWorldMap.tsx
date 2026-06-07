'use client'
/**
 * <CoopWorldMap /> · Tercer Sector v3 · Sprint TS5
 *
 * Mapa-coroplético MUNDIAL de la ayuda española declarada a IATI por país
 * RECEPTOR. Colorea cada país por su valor (importe EUR desembolsado, o nº de
 * actividades según `metricLabel`) con una escala verde secuencial, tooltip al
 * pasar el cursor y `onSelect` para drill (filtra el resto de la vista por país).
 *
 * Técnica: SVG + d3-geo (`geoNaturalEarth1`/`geoPath`) sobre
 * `public/geodata/world-countries.geojson` — el MISMO asset y el MISMO patrón
 * que `components/maps/WorldGeoMap.tsx` (mapa de riesgo geopolítico). No se
 * reutiliza ese componente porque su prop-shape y su escala de color son
 * específicas de "riesgo" (rojo = alto); aquí la semántica es inversa
 * (más ayuda = verde más intenso) y el dato se indexa por ISO-2. Encapsular el
 * coroplético aquí respeta la regla del sprint (no tocar componentes
 * compartidos) reutilizando el asset y la dependencia ya presentes.
 *
 * Join: el geojson trae solo `properties.name` (EN). Mapeamos name→ISO-2 con
 * `NAME_TO_ISO2`; los países sin entrada quedan en gris (sin dato), nunca
 * inventan valor. El ranking de barras hermano (CoopPaisesRanking) NO depende
 * del geojson y cubre el 100% de los receptores aunque el mapa no los pinte.
 *
 * Cero emojis · es-ES.
 */
import { useEffect, useMemo, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { GREEN_RAMP, NEUTRAL, fmtInt } from './CoopShared'

// name (EN, tal cual en el asset) → ISO-2 (DAC recipient_country_code).
// Cobertura verificada contra el asset real (177 features, 2026-06-07),
// priorizando los países receptores habituales de la cooperación española.
const NAME_TO_ISO2: Record<string, string> = {
  Ethiopia: 'ET', Mozambique: 'MZ', Senegal: 'SN', Mali: 'ML', Niger: 'NE',
  Colombia: 'CO', Peru: 'PE', Bolivia: 'BO', Guatemala: 'GT', Honduras: 'HN',
  Nicaragua: 'NI', Haiti: 'HT', Morocco: 'MA', 'Western Sahara': 'EH',
  'West Bank': 'PS', Ukraine: 'UA', Syria: 'SY', 'Syrian Arab Republic': 'SY',
  Yemen: 'YE', Afghanistan: 'AF', 'Democratic Republic of the Congo': 'CD',
  'Republic of the Congo': 'CG', 'South Sudan': 'SS', Sudan: 'SD',
  Mauritania: 'MR', 'Burkina Faso': 'BF', 'Dominican Republic': 'DO',
  'El Salvador': 'SV', Paraguay: 'PY', Lebanon: 'LB', Jordan: 'JO',
  Tunisia: 'TN', Algeria: 'DZ', Cuba: 'CU', Ecuador: 'EC', India: 'IN',
  Kenya: 'KE', Uganda: 'UG', 'United Republic of Tanzania': 'TZ',
  Cameroon: 'CM', Ghana: 'GH', Rwanda: 'RW', Bangladesh: 'BD',
  Philippines: 'PH', Vietnam: 'VN', Nepal: 'NP', Iraq: 'IQ', Chad: 'TD',
  Somalia: 'SO', Venezuela: 'VE', Myanmar: 'MM', 'Burma': 'MM',
  // Otros frecuentes / contexto regional.
  Brazil: 'BR', Argentina: 'AR', Chile: 'CL', Mexico: 'MX',
  Nigeria: 'NG', 'South Africa': 'ZA', Egypt: 'EG', Turkey: 'TR',
  Indonesia: 'ID', Pakistan: 'PK', Angola: 'AO', Madagascar: 'MG',
  Zimbabwe: 'ZW', Zambia: 'ZM', Malawi: 'MW', 'Sri Lanka': 'LK',
  Cambodia: 'KH', Bolivia2: 'BO', Guinea: 'GN', Liberia: 'LR',
  'Sierra Leone': 'SL', Benin: 'BJ', Togo: 'TG', Gambia: 'GM',
  'Ivory Coast': 'CI', "Côte d'Ivoire": 'CI', Spain: 'ES',
}

interface GeoFeature {
  type: 'Feature'
  properties: { name?: string } | null
  geometry: unknown
}
interface GeoFC {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

const SVG_W = 900
const SVG_H = 460

/** Punto de dato por país receptor (indexado por ISO-2). */
export interface CoopMapDatum {
  iso2: string
  name: string
  value: number
  /** Etiqueta secundaria (p.ej. nº de actividades cuando la métrica es importe). */
  secondary?: number
}

interface CoopWorldMapProps {
  data: CoopMapDatum[]
  /** Etiqueta de la métrica que colorea (p.ej. "actividades" o "desembolsado"). */
  metricLabel: string
  /** Si la métrica es importe EUR → formatea con €; si no, entero. */
  isCurrency?: boolean
  /** País seleccionado (ISO-2) para resaltar. */
  selectedIso?: string | null
  onSelect?: (iso2: string, name: string) => void
}

/** Devuelve el color del ramp para un valor normalizado 0..1. */
function rampColor(t: number): string {
  if (!Number.isFinite(t) || t <= 0) return GREEN_RAMP[0]
  const idx = Math.min(GREEN_RAMP.length - 1, Math.floor(t * GREEN_RAMP.length))
  return GREEN_RAMP[idx]
}

export function CoopWorldMap({
  data,
  metricLabel,
  isCurrency = false,
  selectedIso = null,
  onSelect,
}: CoopWorldMapProps) {
  const [geojson, setGeojson] = useState<GeoFC | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState<{ x: number; y: number; name: string; iso: string; datum: CoopMapDatum | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/geodata/world-countries.geojson', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setGeojson(j) })
      .catch((e) => { if (!cancelled) setError(String(e)) })
    return () => { cancelled = true }
  }, [])

  // Índice ISO-2 → datum y máximo (para normalizar el color, escala log suave).
  const { byIso, max } = useMemo(() => {
    const m: Record<string, CoopMapDatum> = {}
    let mx = 0
    for (const d of data) {
      if (!d.iso2) continue
      m[d.iso2.toUpperCase()] = d
      if (d.value > mx) mx = d.value
    }
    return { byIso: m, max: mx }
  }, [data])

  const { pathFn } = useMemo(() => {
    const proj = geoNaturalEarth1().scale(160).translate([SVG_W / 2, SVG_H / 2])
    return { pathFn: geoPath(proj) }
  }, [])

  // Normalización logarítmica: la ayuda concentra mucho en pocos países; log
  // hace legible la cola sin que un outlier aplane el resto.
  const norm = (v: number): number => {
    if (max <= 0 || v <= 0) return 0
    return Math.log1p(v) / Math.log1p(max)
  }

  const fmtVal = (v: number) =>
    isCurrency
      ? `${Math.round(v).toLocaleString('es-ES')} €`
      : `${fmtInt(v)} ${metricLabel}`

  if (error) {
    return <div style={{ padding: 36, color: '#94A3B8', fontSize: 12.5, textAlign: 'center' }}>No se pudo cargar el mapa mundial. Usa el ranking de la derecha.</div>
  }
  if (!geojson) {
    return <div style={{ padding: 36, color: '#94A3B8', fontSize: 12.5, textAlign: 'center' }}>Cargando mapa mundial…</div>
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: '100%', display: 'block', background: 'linear-gradient(180deg,#F0FDF4 0%,#ECFDF5 100%)', borderRadius: 10 }}
        onMouseLeave={() => setHover(null)}
      >
        {geojson.features.map((feat, idx) => {
          const name = String(feat.properties?.name ?? '')
          const iso = NAME_TO_ISO2[name]
          const d = pathFn(feat as never)
          if (!d) return null
          const datum = iso ? byIso[iso] : null
          const isSel = iso != null && selectedIso != null && iso === selectedIso.toUpperCase()
          const fill = datum ? rampColor(norm(datum.value)) : NEUTRAL
          const interactive = Boolean(datum)
          return (
            <path
              key={`c-${idx}`}
              d={d}
              fill={fill}
              stroke={isSel ? ACCENT_STROKE : '#FFFFFF'}
              strokeWidth={isSel ? 1.8 : 0.4}
              style={{ cursor: interactive ? 'pointer' : 'default', transition: 'fill 160ms, stroke 160ms' }}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, name, iso: iso || '—', datum })
              }}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                setHover((h) => (h ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top } : h))
              }}
              onClick={() => { if (iso && datum && onSelect) onSelect(iso, datum.name || name) }}
            />
          )
        })}
      </svg>

      {/* Leyenda del ramp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 9.5, color: '#94A3B8' }}>menos</span>
        {GREEN_RAMP.map((c) => (
          <span key={c} style={{ width: 18, height: 8, background: c, borderRadius: 2, display: 'inline-block' }} />
        ))}
        <span style={{ fontSize: 9.5, color: '#94A3B8' }}>más {metricLabel}</span>
      </div>

      {hover && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(hover.x + 14, SVG_W - 180),
            top: hover.y - 8,
            zIndex: 50,
            pointerEvents: 'none',
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 10,
            padding: '9px 12px',
            boxShadow: '0 4px 18px rgba(0,0,0,0.12)',
            minWidth: 150,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
            {hover.datum?.name || hover.name}
            <span style={{ marginLeft: 6, fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>{hover.iso}</span>
          </div>
          {hover.datum ? (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#15803D' }}>{fmtVal(hover.datum.value)}</span>
              {hover.datum.secondary != null && (
                <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{fmtInt(hover.datum.secondary)} actividades</div>
              )}
              <div style={{ fontSize: 9.5, color: '#94A3B8', marginTop: 3 }}>Clic para filtrar la vista por este país</div>
            </div>
          ) : (
            <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 3 }}>Sin ayuda española declarada</div>
          )}
        </div>
      )}
    </div>
  )
}

const ACCENT_STROKE = '#0F766E'

export default CoopWorldMap
