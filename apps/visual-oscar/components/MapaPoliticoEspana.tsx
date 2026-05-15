'use client'
/**
 * MapaPoliticoEspana · mapa político REALISTA con la geografía real de
 * las 50 provincias + Ceuta y Melilla, coloreadas según el partido
 * ganador de cada provincia para el dataset activo.
 *
 * GeoJSON: /geodata/spain-provinces.geojson (52 features con cod_prov INE)
 * Proyección: d3-geo · Mercator centrada en península; Canarias se
 * extraen y se reposicionan en una caja inferior izquierda (estilo IGN).
 *
 * API igual al MapaProvincias original:
 *   - compact?: boolean
 *   - dataset?: string  (controlado por el padre)
 *   - onDatasetChange?: (d: string) => void
 *
 * Reutiliza WINNERS, PARTIES, HISTORIC_OPTIONS de MapaProvincias.tsx
 * para no duplicar la fuente de verdad de los resultados.
 */
import { useEffect, useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import {
  PARTIES, PROVINCES, WINNERS, WINNERS_HIST, HISTORIC_OPTIONS,
  type PartyId,
} from './MapaProvincias'

// ─── Mapeo cod_prov INE → id corto de Province ─────────────
// Las provincias del GeoJSON traen cod_prov en formato '01'..'52'.
// Province.id es el código corto usado en WINNERS (m, b, va, etc.).
const COD_PROV_TO_ID: Record<string, string> = {
  '01':'vi','02':'ab','03':'a','04':'al','05':'av',
  '06':'ba','07':'pm','08':'b','09':'bu','10':'cc',
  '11':'ca','12':'cs','13':'cr','14':'co','15':'c',
  '16':'cu','17':'ge','18':'gr','19':'gu','20':'ss',
  '21':'h','22':'hu','23':'j','24':'le','25':'l',
  '26':'lo','27':'lu','28':'m','29':'ma','30':'mu',
  '31':'na','32':'or','33':'o','34':'p','35':'gc',
  '36':'po','37':'sa','38':'tf','39':'s','40':'sg',
  '41':'se','42':'so','43':'t','44':'te','45':'to',
  '46':'v','47':'va','48':'bi','49':'za','50':'z',
  '51':'ce','52':'ml',
}

// IDs de las provincias canarias (van en una caja aparte).
const CANARIAS_IDS = new Set(['gc', 'tf'])

// Geometría tipo (GeoJSON Feature)
interface ProvFeature {
  type: 'Feature'
  properties: { cod_prov?: string; name?: string; cod_ccaa?: string }
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] }
}
interface ProvFC {
  type: 'FeatureCollection'
  features: ProvFeature[]
}

interface MapaPoliticoEspanaProps {
  compact?: boolean
  dataset?: string
  onDatasetChange?: (d: string) => void
}

export default function MapaPoliticoEspana({
  compact = false,
  dataset: datasetProp,
  onDatasetChange,
}: MapaPoliticoEspanaProps) {
  const [internalDataset, setInternalDataset] = useState<string>('estimacion')
  const dataset = datasetProp ?? internalDataset
  const setDataset = (d: string) => {
    if (onDatasetChange) onDatasetChange(d)
    else setInternalDataset(d)
  }

  const [geo, setGeo] = useState<ProvFC | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [pinId, setPinId] = useState<string | null>(null)
  const focusedId = pinId || hoverId

  // Carga del GeoJSON una sola vez
  useEffect(() => {
    let alive = true
    fetch('/geodata/spain-provinces.geojson')
      .then(r => r.ok ? r.json() as Promise<ProvFC> : null)
      .then(g => { if (alive && g) { setGeo(g); setLoading(false) } })
      .catch(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const winners = (WINNERS[dataset] || WINNERS_HIST[dataset] || {}) as Record<string, PartyId>

  // Separar península/Baleares vs Canarias para reposicionar
  const { peninsulaFCs, canariasFCs } = useMemo(() => {
    if (!geo) return { peninsulaFCs: [] as ProvFeature[], canariasFCs: [] as ProvFeature[] }
    const pen: ProvFeature[] = []
    const can: ProvFeature[] = []
    geo.features.forEach(f => {
      const id = COD_PROV_TO_ID[f.properties.cod_prov || '']
      if (id && CANARIAS_IDS.has(id)) can.push(f); else pen.push(f)
    })
    return { peninsulaFCs: pen, canariasFCs: can }
  }, [geo])

  // Dimensiones del SVG (compacto vs full)
  const W = compact ? 520 : 780
  const H = compact ? 380 : 560

  // Proyección península (centrada en Madrid aprox. -3.7, 40.4)
  const peninsulaProjection = useMemo(() => {
    if (peninsulaFCs.length === 0) return null
    return geoMercator()
      .center([-3.7, 40.0])
      .scale(compact ? 1900 : 2900)
      .translate([W * 0.5, H * 0.5])
  }, [peninsulaFCs, compact, W, H])

  // Proyección canarias separada, encajonada abajo a la izquierda
  const canariasProjection = useMemo(() => {
    if (canariasFCs.length === 0) return null
    const boxW = compact ? 130 : 190
    const boxH = compact ? 70 : 100
    return geoMercator()
      .center([-15.6, 28.2])
      .scale(compact ? 2400 : 3700)
      .translate([boxW * 0.5 + 10, H - boxH * 0.5 - 10])
  }, [canariasFCs, compact, H])

  const peninsulaPath = useMemo(
    () => peninsulaProjection ? geoPath(peninsulaProjection) : null,
    [peninsulaProjection]
  )
  const canariasPath = useMemo(
    () => canariasProjection ? geoPath(canariasProjection) : null,
    [canariasProjection]
  )

  // Centroides para etiquetas grandes (Madrid, Barcelona, Valencia, …)
  const labelProvs = new Set(['m', 'b', 'v', 'se', 'mu', 'ma', 'gc', 'tf', 'pm', 'a', 'co', 'gr', 'va', 'z'])

  // Totales agregados ganador
  const partyWinTotals = useMemo(() => {
    const out: Record<string, number> = {}
    PROVINCES.forEach(p => {
      const w = winners[p.id]
      if (!w) return
      out[w] = (out[w] || 0) + p.seats
    })
    return out
  }, [winners])
  const winnersOrdered = Object.entries(partyWinTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ id: id as PartyId, n, ...PARTIES[id as PartyId] }))

  const focusedProv = focusedId ? PROVINCES.find(p => p.id === focusedId) : null
  const focusedWinner = focusedProv && winners[focusedProv.id]

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 0 }}>
      {/* Selector de dataset */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: '#6e6e73' }}>
          {focusedProv ? (
            <span>
              <strong style={{ color: '#1d1d1f' }}>{focusedProv.name}</strong>
              {' · '}{focusedProv.seats} escaños
              {focusedWinner && (
                <span> · ganador <span style={{
                  fontWeight: 700, color: PARTIES[focusedWinner].color,
                }}>{PARTIES[focusedWinner].name}</span></span>
              )}
            </span>
          ) : (
            <span>52 provincias · click para fijar · hover para ver datos</span>
          )}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 2 }}>
            {([{ k: 'estimacion', label: 'Est. 2026' }, { k: 'g2023', label: '2023' }] as const).map(o => {
              const active = dataset === o.k
              return (
                <button key={o.k} onClick={() => setDataset(o.k)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#1d1d1f' : '#6e6e73',
                  border: 'none', borderRadius: 999, padding: '4px 10px',
                  fontSize: 11, fontWeight: active ? 600 : 500, cursor: 'pointer',
                  fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>{o.label}</button>
              )
            })}
          </div>
          <select
            value={dataset.startsWith('g') && dataset !== 'g2023' ? dataset : ''}
            onChange={e => { if (e.target.value) setDataset(e.target.value) }}
            style={{
              fontFamily: 'inherit', fontSize: 11, padding: '4px 22px 4px 10px',
              borderRadius: 999, border: '1px solid #ECECEF', background: '#fff', color: '#6e6e73',
              cursor: 'pointer', appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center',
            }}>
            <option value="">Históricas…</option>
            {HISTORIC_OPTIONS.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* SVG con el mapa */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868b', fontSize: 12 }}>
            Cargando geografía…
          </div>
        )}
        {!loading && geo && (
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: 'block' }}
               onClick={() => setPinId(null)}
          >
            {/* Caja Canarias (decorativa) */}
            <rect x={5} y={H - (compact ? 80 : 110)} width={compact ? 140 : 200} height={compact ? 75 : 105}
                  fill="none" stroke="#ECECEF" strokeWidth={1} strokeDasharray="3 3" rx={6}/>
            <text x={10} y={H - (compact ? 65 : 92)} fontSize={9} fill="#86868b" fontWeight={600} letterSpacing="0.05em">
              CANARIAS
            </text>

            {/* Península + Baleares */}
            {peninsulaPath && peninsulaFCs.map(f => {
              const codProv = f.properties.cod_prov || ''
              const id = COD_PROV_TO_ID[codProv]
              const winner = id ? winners[id] : undefined
              const fill = winner ? PARTIES[winner].color : '#E8E8ED'
              const isFocused = focusedId === id
              const d = peninsulaPath(f as never) || ''
              return (
                <path
                  key={`pen-${codProv}`} d={d} fill={fill}
                  fillOpacity={isFocused ? 1 : 0.92}
                  stroke="#fff" strokeWidth={isFocused ? 1.6 : 0.7}
                  style={{ cursor: 'pointer', transition: 'fill-opacity 120ms, stroke-width 120ms' }}
                  onMouseEnter={() => setHoverId(id || null)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={e => { e.stopPropagation(); setPinId(prev => prev === id ? null : (id || null)) }}
                />
              )
            })}

            {/* Canarias */}
            {canariasPath && canariasFCs.map(f => {
              const codProv = f.properties.cod_prov || ''
              const id = COD_PROV_TO_ID[codProv]
              const winner = id ? winners[id] : undefined
              const fill = winner ? PARTIES[winner].color : '#E8E8ED'
              const isFocused = focusedId === id
              const d = canariasPath(f as never) || ''
              return (
                <path
                  key={`can-${codProv}`} d={d} fill={fill}
                  fillOpacity={isFocused ? 1 : 0.92}
                  stroke="#fff" strokeWidth={isFocused ? 1.6 : 0.7}
                  style={{ cursor: 'pointer', transition: 'fill-opacity 120ms, stroke-width 120ms' }}
                  onMouseEnter={() => setHoverId(id || null)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={e => { e.stopPropagation(); setPinId(prev => prev === id ? null : (id || null)) }}
                />
              )
            })}

            {/* Etiquetas para provincias grandes (Madrid, Barcelona, …) */}
            {peninsulaPath && peninsulaFCs.map(f => {
              const codProv = f.properties.cod_prov || ''
              const id = COD_PROV_TO_ID[codProv]
              if (!id || !labelProvs.has(id)) return null
              const prov = PROVINCES.find(p => p.id === id)
              if (!prov) return null
              const c = peninsulaPath.centroid(f as never)
              if (!c || isNaN(c[0]) || isNaN(c[1])) return null
              return (
                <text key={`lbl-${codProv}`} x={c[0]} y={c[1]}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={compact ? 8 : 9.5} fontWeight={700} fill="#fff"
                  style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                >
                  {prov.seats}
                </text>
              )
            })}
            {canariasPath && canariasFCs.map(f => {
              const codProv = f.properties.cod_prov || ''
              const id = COD_PROV_TO_ID[codProv]
              if (!id) return null
              const prov = PROVINCES.find(p => p.id === id)
              if (!prov) return null
              const c = canariasPath.centroid(f as never)
              if (!c || isNaN(c[0]) || isNaN(c[1])) return null
              return (
                <text key={`canlbl-${codProv}`} x={c[0]} y={c[1]}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={compact ? 7 : 8.5} fontWeight={700} fill="#fff"
                  style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                >
                  {prov.seats}
                </text>
              )
            })}
          </svg>
        )}
      </div>

      {/* Leyenda compacta · partidos ganadores ordenados por escaños totales */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', paddingTop: 4 }}>
        {winnersOrdered.map(p => (
          <span key={p.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 10.5, padding: '3px 8px', borderRadius: 999,
            background: `${p.color}14`, color: p.color, border: `1px solid ${p.color}33`,
            fontWeight: 600,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }}/>
            {p.name} · {p.n}
          </span>
        ))}
      </div>
    </div>
  )
}
