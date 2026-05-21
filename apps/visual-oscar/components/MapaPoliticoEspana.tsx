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
  getBreakdown,
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

/** Estructura provincial en vivo desde /api/electoral/provincial */
interface ProvinciaLive {
  id: string
  cod_ine: string
  nombre: string
  ccaa: string
  escanos: number
  winner: string | null
  breakdown: Record<string, number> // siglas → escaños
}

interface MapaPoliticoEspanaProps {
  compact?: boolean
  dataset?: string
  onDatasetChange?: (d: string) => void
  /** Si true (y dataset === 'estimacion') consume /api/electoral/provincial
   *  con D'Hondt provincial real en lugar de los datos hardcoded. */
  liveData?: boolean
}

export default function MapaPoliticoEspana({
  compact = false,
  dataset: datasetProp,
  onDatasetChange,
  liveData = false,
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

  // Datos en vivo (D'Hondt provincial) · solo cuando liveData=true y
  // dataset='estimacion' (las históricas siguen siendo hardcoded)
  const [liveProvincias, setLiveProvincias] = useState<ProvinciaLive[] | null>(null)

  // Carga del GeoJSON una sola vez
  useEffect(() => {
    let alive = true
    fetch('/geodata/spain-provinces.geojson')
      .then(r => r.ok ? r.json() as Promise<ProvFC> : null)
      .then(g => { if (alive && g) { setGeo(g); setLoading(false) } })
      .catch(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  // Carga de datos provinciales en vivo (D'Hondt real)
  useEffect(() => {
    if (!liveData || dataset !== 'estimacion') return
    let alive = true
    fetch('/api/electoral/provincial')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive && d?.provincias) setLiveProvincias(d.provincias) })
      .catch(() => {})
    return () => { alive = false }
  }, [liveData, dataset])

  // Indexar provincias live por id corto · fallback a WINNERS hardcoded
  const liveById: Record<string, ProvinciaLive> = useMemo(() => {
    const m: Record<string, ProvinciaLive> = {}
    if (liveProvincias) for (const p of liveProvincias) m[p.id] = p
    return m
  }, [liveProvincias])

  // Winners: si tenemos datos en vivo y estamos en estimación, los usamos.
  // En cualquier otro caso (históricas o sin live) se usan los hardcoded.
  const winners: Record<string, PartyId> = useMemo(() => {
    if (liveData && dataset === 'estimacion' && liveProvincias) {
      const w: Record<string, PartyId> = {}
      for (const p of liveProvincias) {
        if (p.winner) w[p.id] = p.winner.toLowerCase() as PartyId
      }
      return w
    }
    return (WINNERS[dataset] || WINNERS_HIST[dataset] || {}) as Record<string, PartyId>
  }, [liveData, dataset, liveProvincias])

  /** Breakdown por partido para una provincia: usa datos live si están,
   *  fallback a getBreakdown() hardcoded en otro caso. */
  function breakdownFor(provId: string): Partial<Record<PartyId, number>> {
    if (liveData && dataset === 'estimacion' && liveById[provId]) {
      const out: Partial<Record<PartyId, number>> = {}
      for (const [k, v] of Object.entries(liveById[provId].breakdown)) {
        out[k.toLowerCase() as PartyId] = v
      }
      return out
    }
    const prov = PROVINCES.find(p => p.id === provId)
    if (!prov) return {}
    return getBreakdown(dataset, prov, winners[provId])
  }

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
  // (más pequeña para que no domine visualmente la península).
  const canariasProjection = useMemo(() => {
    if (canariasFCs.length === 0) return null
    const boxW = compact ? 90 : 130
    const boxH = compact ? 50 : 72
    return geoMercator()
      .center([-15.6, 28.2])
      .scale(compact ? 1500 : 2300)
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

  // Centroides para etiquetas: provincias grandes (texto blanco completo)
  // y resto con punto + escaños del ganador en gris claro.
  const bigProvs = new Set(['m', 'b', 'v', 'se', 'mu', 'ma', 'gc', 'tf', 'pm', 'a', 'co', 'gr', 'va', 'z'])

  // ESCAÑOS TOTALES por partido (suma de TODOS los escaños provinciales,
  // no solo de las provincias donde es ganador). Si tenemos datos en
  // vivo, los usamos directamente. Si no, fallback al BREAKDOWN de
  // MapaProvincias (estimación 2026 hardcoded).
  const partyTotalSeats = useMemo(() => {
    const out: Record<string, number> = {}
    if (liveData && dataset === 'estimacion' && liveProvincias) {
      for (const p of liveProvincias) {
        for (const [partido, esc] of Object.entries(p.breakdown)) {
          const id = partido.toLowerCase()
          out[id] = (out[id] || 0) + (esc || 0)
        }
      }
    } else {
      // Fallback: usar getBreakdown sobre cada provincia (datos hardcoded)
      PROVINCES.forEach(prov => {
        const w = winners[prov.id]
        const breakdown = getBreakdown(dataset, prov, w)
        for (const [partido, esc] of Object.entries(breakdown)) {
          out[partido] = (out[partido] || 0) + (esc || 0)
        }
      })
    }
    return out
  }, [winners, liveData, dataset, liveProvincias])

  // Provincias donde cada partido es ganador
  const partyWinCount = useMemo(() => {
    const out: Record<string, number> = {}
    for (const p of PROVINCES) {
      const w = winners[p.id]
      if (!w) continue
      out[w] = (out[w] || 0) + 1
    }
    return out
  }, [winners])

  const partidosOrdenados = Object.entries(partyTotalSeats)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ id: id as PartyId, seats: n, prov_ganadas: partyWinCount[id] || 0, ...PARTIES[id as PartyId] }))

  // Total verificado
  const totalSeatsVerif = partidosOrdenados.reduce((s, p) => s + p.seats, 0)

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
            {/* Caja Canarias (decorativa) · más compacta */}
 <rect x={5} y={H - (compact ? 60 : 82)} width={compact ? 100 : 140} height={compact ? 55 : 77}
                  fill="none" stroke="#ECECEF" strokeWidth={1} strokeDasharray="3 3" rx={6}/>
 <text x={10} y={H - (compact ? 48 : 68)} fontSize={8} fill="#86868b" fontWeight={600} letterSpacing="0.05em">
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

            {/* Etiquetas en cada provincia: nº escaños del PARTIDO GANADOR
                + sigla en provincias grandes. Para no saturar, en
                provincias pequeñas solo se muestra el número de escaños
                del ganador. */}
            {peninsulaPath && peninsulaFCs.map(f => {
              const codProv = f.properties.cod_prov || ''
              const id = COD_PROV_TO_ID[codProv]
              if (!id) return null
              const prov = PROVINCES.find(p => p.id === id)
              if (!prov) return null
              const c = peninsulaPath.centroid(f as never)
              if (!c || isNaN(c[0]) || isNaN(c[1])) return null
              const winner = winners[id]
              const breakdown = breakdownFor(id)
              const winnerSeats = winner ? (breakdown[winner] || 0) : 0
              const isBig = bigProvs.has(id)
              const fz = isBig ? (compact ? 9 : 11) : (compact ? 7 : 8.5)
              return (
 <g key={`lbl-${codProv}`} style={{ pointerEvents: 'none' }}>
                  {isBig && winner ? (
 <>
 <text x={c[0]} y={c[1] - fz * 0.5} textAnchor="middle" dominantBaseline="middle"
                        fontSize={fz * 0.75} fontWeight={700} fill="#fff" letterSpacing="0.04em"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.55)' }}
                      >
                        {PARTIES[winner].name.toUpperCase()}
 </text>
 <text x={c[0]} y={c[1] + fz * 0.55} textAnchor="middle" dominantBaseline="middle"
                        fontSize={fz} fontWeight={800} fill="#fff"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.55)' }}
                      >
                        {winnerSeats}
 </text>
 </>
                  ) : (
 <text x={c[0]} y={c[1]} textAnchor="middle" dominantBaseline="middle"
                      fontSize={fz} fontWeight={700} fill="#fff"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {winnerSeats > 0 ? winnerSeats : prov.seats}
 </text>
                  )}
 </g>
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
              const winner = winners[id]
              const breakdown = breakdownFor(id)
              const winnerSeats = winner ? (breakdown[winner] || 0) : prov.seats
              return (
 <text key={`canlbl-${codProv}`} x={c[0]} y={c[1]}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={compact ? 6.5 : 8} fontWeight={700} fill="#fff"
                  style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {winnerSeats}
 </text>
              )
            })}
 </svg>
        )}
 </div>

      {/* Breakdown de la provincia activa · barra apilada + lista por partido.
          Si no hay provincia focada, mostramos el AGREGADO NACIONAL con
          escaños totales por partido (no solo donde gana). */}
      {focusedProv ? (
 <FocusedBreakdown
          prov={focusedProv}
          winner={focusedWinner || undefined}
          breakdown={breakdownFor(focusedProv.id)}
        />
      ) : (
 <AgregadoNacional partidos={partidosOrdenados} total={totalSeatsVerif}/>
      )}
 </div>
  )
}

// ─── Subcomponente: agregado nacional con escaños totales ───────────────
function AgregadoNacional({ partidos, total }: {
  partidos: Array<{ id: PartyId; name: string; color: string; seats: number; prov_ganadas: number }>
  total: number
}) {
  if (partidos.length === 0) return null
  const max = Math.max(...partidos.map(p => p.seats))
  return (
 <div style={{
      background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10,
      padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Header con título + total */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
 <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
          Estimación de escaños · Generales 2026
 </span>
 <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 600 }}>
          Total <strong style={{ color: '#1d1d1f' }}>{total}</strong> / 350 escaños
 </span>
 </div>

      {/* Barra apilada nacional */}
 <div style={{ display: 'flex', height: 12, borderRadius: 4, overflow: 'hidden', border: '1px solid #ECECEF' }}>
        {partidos.map(p => (
 <div key={p.id} title={`${p.name} · ${p.seats} escaños`} style={{
            flex: p.seats, background: p.color,
          }}/>
        ))}
 </div>

      {/* Lista compacta de partidos · escaños + provincias ganadas + barra */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
        {partidos.map(p => (
 <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 8,
            background: '#fff', border: '1px solid #ECECEF',
            borderLeft: `3px solid ${p.color}`,
          }}>
 <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color, flexShrink: 0 }}/>
 <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
 </span>
 <span style={{
              fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800,
              color: p.color, lineHeight: 1, flexShrink: 0,
            }}>{p.seats}</span>
 <span style={{ fontSize: 9, color: '#86868b', flexShrink: 0, minWidth: 36, textAlign: 'right' }}>
              {p.prov_ganadas > 0 ? `${p.prov_ganadas} prov` : ''}
 </span>
 </div>
        ))}
 </div>

      {/* Barras de coalición · mayoría 176 */}
      {(() => {
        const seats = (id: string) => partidos.find(p => p.id === id)?.seats || 0
        const ppvox = seats('pp') + seats('vox')
        const izq   = seats('psoe') + seats('sumar') + seats('erc') + seats('pnv') + seats('bildu') + seats('bng')
        const MAY = 176
        return (
 <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap', fontSize: 10.5 }}>
 <CoalitionBar label="PP+VOX" seats={ppvox} colors={['#1F4E8C', '#5BA02E']}/>
 <CoalitionBar label="PSOE+Sumar+ERC+PNV+Bildu+BNG" seats={izq} colors={['#E1322D', '#D43F8D']}/>
 <span style={{ fontSize: 10, color: '#6e6e73', alignSelf: 'center' }}>
              Mayoría absoluta: <strong style={{ color: '#1d1d1f' }}>{MAY}</strong>
 </span>
 </div>
        )
      })()}
 </div>
  )
}

function CoalitionBar({ label, seats, colors }: { label: string; seats: number; colors: string[] }) {
  const MAY = 176
  const viable = seats >= MAY
  const pct = Math.min(100, (seats / MAY) * 100)
  const bgColor = viable ? '#16A34A' : '#DC2626'
  return (
 <div style={{ flex: 1, minWidth: 200 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
 <span style={{ color: '#3a3a3d', fontWeight: 600 }}>{label}</span>
 <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: bgColor }}>
          {seats} {viable ? ' MAYORÍA' : `· faltan ${MAY - seats}`}
 </span>
 </div>
 <div style={{ height: 5, background: '#ECECEF', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
 <div style={{ width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${colors[0]}, ${colors[colors.length - 1]})`,
        }}/>
        {/* Línea mayoría */}
 <div style={{ position: 'absolute', top: 0, left: '100%', height: '100%', width: 1, background: '#1d1d1f', transform: 'translateX(-1px)' }}/>
 </div>
 </div>
  )
}

// ─── Subcomponente: breakdown por partido en provincia focada ───────────
function FocusedBreakdown({
  prov, winner, breakdown,
}: {
  prov: { id: string; name: string; seats: number }
  winner?: PartyId
  breakdown: Partial<Record<PartyId, number>>
}) {
  const items = (Object.entries(breakdown) as Array<[PartyId, number]>)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
  const total = items.reduce((s, [, n]) => s + n, 0) || prov.seats

  return (
 <div style={{
      background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10,
      padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Header de la provincia */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
 <div>
 <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{prov.name}</span>
          {winner && (
 <span style={{
              marginLeft: 8, fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
              background: `${PARTIES[winner].color}18`, color: PARTIES[winner].color, letterSpacing: '0.04em',
              border: `1px solid ${PARTIES[winner].color}33`,
            }}>
              GANADOR · {PARTIES[winner].name}
 </span>
          )}
 </div>
 <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 600 }}>
          {prov.seats} escaños
 </span>
 </div>

      {/* Barra apilada · proporciones por partido */}
 <div style={{ display: 'flex', height: 10, borderRadius: 4, overflow: 'hidden', border: '1px solid #ECECEF' }}>
        {items.map(([pid, n]) => (
 <div key={pid} title={`${PARTIES[pid].name} · ${n} escaños`} style={{
            flex: n,
            background: PARTIES[pid].color,
          }}/>
        ))}
 </div>

      {/* Lista detallada · partido + escaños + % */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 4 }}>
        {items.map(([pid, n]) => {
          const pct = total ? (n / total) * 100 : 0
          return (
 <div key={pid} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 6px', borderRadius: 6,
              background: '#fff', border: '1px solid #ECECEF',
            }}>
 <span style={{ width: 8, height: 8, borderRadius: 2, background: PARTIES[pid].color, flexShrink: 0 }}/>
 <span style={{ fontSize: 10.5, fontWeight: 600, color: '#1d1d1f', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {PARTIES[pid].name}
 </span>
 <span style={{ fontSize: 10.5, fontWeight: 700, color: PARTIES[pid].color }}>{n}</span>
 <span style={{ fontSize: 9, color: '#86868b' }}>{pct.toFixed(0)}%</span>
 </div>
          )
        })}
 </div>
 </div>
  )
}
