'use client'
/**
 * <WorldEnergyMap /> · Sprint Energía S2
 *
 * Mapa-coroplético mundial de electricidad (Ember). Lo usará la Visión Global
 * (S4) pero es autocontenido y reutilizable. Colorea los países por:
 *   - Intensidad de carbono de la generación eléctrica (gCO2/kWh), o
 *   - Cuota renovable de la generación (%)
 * con un toggle entre ambas métricas. Incluye leyenda, tooltip al pasar el
 * cursor y una tabla-ranking interactiva sincronizada con el mapa.
 *
 * Datos:
 *   GET /api/ember/carbon-intensity?ranking=1   → intensidad por país
 *   GET /api/ember/generation?entity_code=XXX   → mix (para % renovable)
 *
 * Mapa: SVG coroplético propio (proyección equirectangular) sobre
 * `public/geodata/world-countries.geojson` (177 países, join por nombre EN).
 * Se evita MapLibre a propósito: SSR-safe, sin runtime pesado, suficiente
 * para S2 (S4 puede enriquecer). El join Ember↔geojson es por `entity` (Ember
 * devuelve el nombre EN del país, p.ej. "Spain") con alias para los pocos
 * desajustes ("United Kingdom"→"United Kingdom" no existe en el geojson, etc.).
 *
 * Degradación honesta: si la API no devuelve datos (sin EMBER_API_KEY o fallo)
 * se muestra empty-state citando la fuente. Cero emojis (CLAUDE.md §0.5).
 */
import { useEffect, useMemo, useState } from 'react'

const ACCENT = '#16A34A'
const SOURCE_URL = 'https://ember-energy.org/data/'

type Metric = 'carbon' | 'renewable'

interface RankRow {
  entity_code: string | null
  entity: string
  /** Valor de la métrica activa para ese país. */
  value: number
}

// Alias Ember(entity EN) → nombre en `public/geodata/world-countries.geojson`.
// Solo se incluyen alias VERIFICADOS contra el asset real (2026-06-02). Los
// países sin entrada se intentan casar por nombre directo.
//
// LIMITACIÓN CONOCIDA del asset: este geojson (177 features, Natural Earth
// reducido) NO contiene a Estados Unidos ni a Reino Unido como features, por
// lo que esos países aparecen sin colorear en el mapa aunque SÍ figuran en la
// tabla-ranking (que no depende del geojson). S4 puede sustituir el asset por
// uno completo si se quiere cobertura total del coroplético.
const GEOJSON_NAME_ALIAS: Record<string, string> = {
  'Czechia': 'Czech Republic',
  'Republic of Korea': 'South Korea',
  'North Macedonia': 'Macedonia',
  'Russian Federation': 'Russia',
  'Slovak Republic': 'Slovakia',
}

interface GeoFeature {
  type: 'Feature'
  properties: { name: string }
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: any
  }
}
interface GeoJson {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

// ── Proyección equirectangular lon/lat → viewBox 0..W / 0..H ────────────────
const MAP_W = 1000
const MAP_H = 500 // 2:1 equirectangular
function project(lon: number, lat: number): [number, number] {
  const x = ((lon + 180) / 360) * MAP_W
  const y = ((90 - lat) / 180) * MAP_H
  return [x, y]
}

/** Convierte un anillo [[lon,lat],...] en "x,y x,y ..." proyectado. */
function ringToPath(ring: number[][]): string {
  let d = ''
  for (let i = 0; i < ring.length; i++) {
    const [lon, lat] = ring[i]
    const [x, y] = project(lon, lat)
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
  }
  return d + 'Z'
}

/** Path SVG completo de una feature (Polygon o MultiPolygon). */
function featurePath(f: GeoFeature): string {
  const g = f.geometry
  if (g.type === 'Polygon') {
    return (g.coordinates as number[][][]).map(ringToPath).join(' ')
  }
  // MultiPolygon
  return (g.coordinates as number[][][][])
    .map((poly) => poly.map(ringToPath).join(' '))
    .join(' ')
}

// ── Escalas de color ────────────────────────────────────────────────────────
// Carbono: verde (limpio, ~0) → ámbar → rojo (sucio, ~700 gCO2/kWh).
function carbonColor(v: number): string {
  const t = Math.max(0, Math.min(1, v / 600))
  // interp verde→ámbar→rojo
  if (t < 0.5) return lerpColor('#16A34A', '#F59E0B', t / 0.5)
  return lerpColor('#F59E0B', '#DC2626', (t - 0.5) / 0.5)
}
// Renovable: gris (0%) → verde (100%).
function renewableColor(v: number): string {
  const t = Math.max(0, Math.min(1, v / 100))
  return lerpColor('#E5E7EB', '#15803D', t)
}
function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t)
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t)
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t)
  return `rgb(${r},${g},${bl})`
}
function hexToRgb(h: string): [number, number, number] {
  const n = h.replace('#', '')
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}

interface ApiEnvelope<T> {
  ok: boolean
  data: T | null
  error?: string
  _meta?: any
}

export default function WorldEnergyMap() {
  const [metric, setMetric] = useState<Metric>('carbon')
  const [geo, setGeo] = useState<GeoJson | null>(null)
  const [carbonRows, setCarbonRows] = useState<RankRow[] | null>(null)
  const [renewableRows, setRenewableRows] = useState<RankRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState<{ name: string; value: number | null; x: number; y: number } | null>(null)

  // Carga geojson (cacheado por el navegador) una vez.
  useEffect(() => {
    let alive = true
    fetch('/geodata/world-countries.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) setGeo(j) })
      .catch(() => { if (alive) setGeo(null) })
    return () => { alive = false }
  }, [])

  // Carga datos Ember: ranking carbono + generación (para % renovable).
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)

    async function load() {
      try {
        const cr = await fetch('/api/ember/carbon-intensity?ranking=1', { cache: 'no-store' })
        const cj: ApiEnvelope<{ ranking: Array<{ entity_code: string | null; entity: string; gco2_per_kwh: number; date: string }> }> = await cr.json()

        if (!alive) return

        if (!cj.ok || !cj.data?.ranking?.length) {
          setCarbonRows([])
          setError(cj.error || 'sin_datos')
        } else {
          setCarbonRows(
            cj.data.ranking.map((r) => ({
              entity_code: r.entity_code,
              entity: r.entity,
              value: r.gco2_per_kwh,
            })),
          )
        }

        // Para % renovable, pedimos la generación de cada país del ranking.
        const codes = (cj.data?.ranking ?? [])
          .map((r) => r.entity_code)
          .filter((c): c is string => !!c)

        const gens = await Promise.all(
          codes.map(async (code): Promise<RankRow | null> => {
            try {
              const gr = await fetch(`/api/ember/generation?entity_code=${encodeURIComponent(code)}`, { cache: 'no-store' })
              const gj: ApiEnvelope<{ entity: string; entity_code: string | null; renewable_pct: number }> = await gr.json()
              if (gj.ok && gj.data) {
                return { entity_code: gj.data.entity_code ?? code, entity: gj.data.entity, value: gj.data.renewable_pct }
              }
            } catch { /* degradación silenciosa por país */ }
            return null
          }),
        )
        if (!alive) return
        setRenewableRows(gens.filter((g): g is RankRow => g !== null))
      } catch (e: any) {
        if (alive) { setError(String(e?.message ?? e)); setCarbonRows([]) }
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const rows = metric === 'carbon' ? carbonRows : renewableRows
  const unit = metric === 'carbon' ? 'gCO₂/kWh' : '% renovable'

  // Mapa nombre-país → valor para el coroplético, con alias.
  const valueByGeoName = useMemo(() => {
    const m = new Map<string, { value: number; entity: string }>()
    for (const r of rows ?? []) {
      const geoName = GEOJSON_NAME_ALIAS[r.entity] ?? r.entity
      m.set(geoName, { value: r.value, entity: r.entity })
    }
    return m
  }, [rows])

  // Ranking ordenado para la tabla (carbono asc = mejor; renovable desc = mejor).
  const ranking = useMemo(() => {
    const rr = [...(rows ?? [])]
    rr.sort((a, b) => (metric === 'carbon' ? a.value - b.value : b.value - a.value))
    return rr
  }, [rows, metric])

  const colorFor = metric === 'carbon' ? carbonColor : renewableColor

  const hasData = (rows?.length ?? 0) > 0

  return (
 <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 18,
    }}>
      {/* Cabecera + toggle */}
 <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
 <div>
 <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: '#1d1d1f' }}>
            Mapa mundial de electricidad
 </h3>
 <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#86868b' }}>
            Países coloreados por {metric === 'carbon' ? 'intensidad de carbono de su generación eléctrica' : 'cuota renovable de su generación eléctrica'}
            {' · '}
 <a href={SOURCE_URL} target="_blank" rel="noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>Ember</a>
 </p>
 </div>
 <div role="tablist" aria-label="Métrica del mapa" style={{ display: 'inline-flex', background: '#F4F4F6', borderRadius: 10, padding: 3 }}>
          {(['carbon', 'renewable'] as Metric[]).map((m) => {
            const active = metric === m
            return (
 <button
                key={m}
                role="tab"
                aria-selected={active}
                onClick={() => setMetric(m)}
                style={{
                  border: 'none', cursor: 'pointer', borderRadius: 8, padding: '6px 12px',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#1d1d1f' : '#6e6e73',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {m === 'carbon' ? 'Intensidad CO₂' : '% Renovable'}
 </button>
            )
          })}
 </div>
 </div>

      {loading && (
 <div style={{ padding: '48px 0', textAlign: 'center', color: '#86868b', fontSize: 13 }}>
          Cargando datos de Ember…
 </div>
      )}

      {!loading && !hasData && (
 <EmptyState error={error} />
      )}

      {!loading && hasData && (
 <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.9fr) minmax(220px, 1fr)', gap: 16, alignItems: 'start' }}>
          {/* ── Mapa SVG ── */}
 <div style={{ position: 'relative' }}>
 <svg
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              style={{ width: '100%', height: 'auto', display: 'block', background: '#F8FAFC', borderRadius: 10, border: '1px solid #EEF0F2' }}
              role="img"
              aria-label="Mapa coroplético mundial de electricidad"
            >
              {geo?.features.map((f) => {
                const name = f.properties?.name
                const hit = valueByGeoName.get(name)
                const fill = hit ? colorFor(hit.value) : '#E9ECEF'
                return (
 <path
                    key={name}
                    d={featurePath(f)}
                    fill={fill}
                    stroke="#FFFFFF"
                    strokeWidth={0.4}
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                      setHover({
                        name: hit?.entity ?? name,
                        value: hit ? hit.value : null,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      })
                    }}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: hit ? 'pointer' : 'default', transition: 'fill 120ms ease' }}
                  />
                )
              })}
              {!geo && (
 <text x={MAP_W / 2} y={MAP_H / 2} textAnchor="middle" fill="#9CA3AF" fontSize={20}>
                  cargando mapa base…
 </text>
              )}
 </svg>

            {/* Tooltip */}
            {hover && (
 <div
                style={{
                  position: 'absolute', left: Math.min(hover.x + 12, 680), top: hover.y + 12,
                  background: '#111827', color: '#fff', padding: '6px 9px', borderRadius: 8,
                  fontSize: 11.5, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                }}
              >
 <strong style={{ fontWeight: 700 }}>{hover.name}</strong>
                {hover.value !== null
                  ? ` · ${fmt(hover.value)} ${unit}`
                  : ' · sin dato'}
 </div>
            )}

            {/* Leyenda */}
 <Legend metric={metric} />
 </div>

          {/* ── Tabla ranking ── */}
 <div>
 <div style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              Ranking · {metric === 'carbon' ? 'menor intensidad primero' : 'mayor renovable primero'}
 </div>
 <div style={{ maxHeight: 430, overflowY: 'auto', border: '1px solid #EEF0F2', borderRadius: 10 }}>
 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
 <tbody>
                  {ranking.map((r, i) => {
                    const isHover = hover?.name === r.entity
                    return (
 <tr
                        key={(r.entity_code ?? r.entity) + i}
                        onMouseEnter={() => setHover({ name: r.entity, value: r.value, x: 0, y: 0 })}
                        onMouseLeave={() => setHover(null)}
                        style={{ background: isHover ? '#F0FDF4' : i % 2 ? '#FAFAFB' : '#fff', cursor: 'default' }}
                      >
 <td style={{ padding: '5px 8px', color: '#9CA3AF', width: 22, textAlign: 'right' }}>{i + 1}</td>
 <td style={{ padding: '5px 4px' }}>
 <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: colorFor(r.value), marginRight: 6, verticalAlign: 'middle' }} />
 <span style={{ color: '#1d1d1f', fontWeight: r.entity === 'Spain' ? 700 : 500 }}>{r.entity}</span>
 </td>
 <td style={{ padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#374151', fontWeight: 600 }}>
                          {fmt(r.value)}
 </td>
 </tr>
                    )
                  })}
 </tbody>
 </table>
 </div>
 <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>
              Unidad: {unit} · último año disponible · fuente Ember Energy.
 </div>
 </div>
 </div>
      )}
 </section>
  )
}

function fmt(v: number): string {
  if (!Number.isFinite(v)) return '—'
  return Math.abs(v) >= 100 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1)
}

function Legend({ metric }: { metric: Metric }) {
  const stops = metric === 'carbon'
    ? [{ t: 0, label: '0' }, { t: 0.25, label: '150' }, { t: 0.5, label: '300' }, { t: 0.75, label: '450' }, { t: 1, label: '600+' }]
    : [{ t: 0, label: '0%' }, { t: 0.25, label: '25%' }, { t: 0.5, label: '50%' }, { t: 0.75, label: '75%' }, { t: 1, label: '100%' }]
  const colorFor = metric === 'carbon' ? carbonColor : renewableColor
  const maxVal = metric === 'carbon' ? 600 : 100
  return (
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
 <span style={{ fontSize: 10.5, color: '#6e6e73' }}>
        {metric === 'carbon' ? 'gCO₂/kWh' : '% renov.'}
 </span>
 <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
 <div style={{
        height: 8, borderRadius: 4,
        background: `linear-gradient(to right, ${stops.map((s) => `${colorFor(s.t * maxVal)} ${s.t * 100}%`).join(', ')})`,
      }} />
 <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        {stops.map((s) => (
 <span key={s.label} style={{ fontSize: 9.5, color: '#9CA3AF' }}>{s.label}</span>
        ))}
 </div>
 </div>
 </div>
  )
}

function EmptyState({ error }: { error: string | null }) {
  const noKey = (error || '').includes('no_key')
  return (
 <div style={{
      border: '1px dashed #D7DBE0', borderRadius: 12, padding: '40px 24px', textAlign: 'center',
    }}>
 <div aria-hidden="true" style={{ fontSize: 30, color: ACCENT, opacity: 0.8, lineHeight: 1 }}>◉</div>
 <h4 style={{ margin: '12px 0 4px', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>
        Mapa mundial de electricidad
 </h4>
 <p style={{ margin: '0 auto', maxWidth: 460, fontSize: 12.5, color: '#86868b', lineHeight: 1.55 }}>
        {noKey
          ? 'Los datos globales de Ember requieren configurar EMBER_API_KEY en el servidor. El componente está listo y se rellenará automáticamente cuando la clave esté disponible.'
          : 'No se han podido cargar los datos de Ember en este momento. Se reintenta automáticamente.'}
 </p>
 <p style={{ margin: '10px 0 0', fontSize: 11 }}>
        Fuente: <a href={SOURCE_URL} target="_blank" rel="noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>Ember Energy · electricidad global</a>
 </p>
 </div>
  )
}
