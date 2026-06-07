'use client'
/**
 * <NuclearMap /> · Energía v3 · Sprint E5 (Nuclear profundo)
 *
 * Mapa esquemático de la España peninsular con las 5 centrales nucleares
 * (Almaraz, Ascó, Cofrentes, Vandellós, Trillo) posicionadas por sus
 * coordenadas geográficas reales. El radio del punto es proporcional a la
 * potencia agregada de la central; el color por tecnología dominante. Cada
 * central agrega sus reactores (Almaraz I/II y Ascó I/II) sumando potencia.
 *
 * Las coordenadas (lat/lon) de las centrales son constantes GEOGRÁFICAS — no
 * datos volátiles — por lo que viven AQUÍ dentro del componente (no en
 * catalog.ts). El contorno peninsular es un path SVG simplificado propio
 * (no requiere geojson): suficiente para situar las centrales sobre el
 * territorio. Proyección equirectangular acotada a Iberia.
 *
 * Componente cliente puro (lee `REACTORES_ES`, sin fetch). Cero emojis ·
 * Unicode geométrico (◉ ⬡).
 */
import { useMemo, useState } from 'react'
import { REACTORES_ES } from '@/lib/energia/catalog'
import type { Reactor } from '@/lib/energia/types'

const NUCLEAR = '#7c3aed'
const NUCLEAR_BWR = '#2563EB'
const LAND = '#F4F2FB'
const LAND_STROKE = '#D9D3EE'

// ── Coordenadas geográficas de las centrales (constantes, no volátiles) ──────
// Lat/lon aproximadas del emplazamiento de cada central nuclear española.
// Fuente: ubicaciones públicas (CSN / Foro Nuclear). Constantes geográficas.
const CENTRAL_COORDS: Record<string, { lat: number; lon: number; provincia: string }> = {
  Almaraz: { lat: 39.808, lon: -5.697, provincia: 'Cáceres' },
  Ascó: { lat: 41.2, lon: 0.569, provincia: 'Tarragona' },
  Cofrentes: { lat: 39.216, lon: -1.05, provincia: 'Valencia' },
  Vandellós: { lat: 40.951, lon: 0.867, provincia: 'Tarragona' },
  Trillo: { lat: 40.701, lon: -2.621, provincia: 'Guadalajara' },
}

// Caja de proyección · península ibérica (con margen).
const BBOX = { latMin: 35.8, latMax: 43.9, lonMin: -9.6, lonMax: 3.4 }
const W = 520
const H = 420

function project(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon - BBOX.lonMin) / (BBOX.lonMax - BBOX.lonMin)) * W
  const y = ((BBOX.latMax - lat) / (BBOX.latMax - BBOX.latMin)) * H
  return { x, y }
}

// Contorno peninsular simplificado (path en coords lat/lon → proyectadas).
// Polilínea cerrada en sentido horario alrededor de la España peninsular +
// Portugal (se dibuja como una sola masa de tierra ibérica). Puntos en
// [lon, lat]. Es un esquema, no cartografía precisa.
const IBERIA_LL: Array<[number, number]> = [
  [-1.78, 43.36], // costa cantábrica este (Hondarribia)
  [-3.0, 43.55],
  [-5.6, 43.55], // Asturias/Cantabria
  [-7.9, 43.74], // A Coruña norte
  [-9.3, 43.05], // Finisterre / NW
  [-8.9, 42.0], // Rías Baixas
  [-8.8, 41.15], // norte Portugal
  [-9.0, 40.2],
  [-9.5, 38.7], // Lisboa / Cabo da Roca
  [-8.9, 37.0], // Algarve
  [-7.4, 37.2], // Huelva
  [-6.3, 36.6], // Cádiz
  [-5.6, 36.0], // Tarifa (sur)
  [-4.4, 36.7], // Málaga
  [-2.9, 36.7], // Almería oeste
  [-1.9, 36.8], // Almería / Cabo de Gata
  [-0.7, 37.6], // Cartagena / Murcia
  [-0.1, 38.5], // Alicante
  [0.2, 39.5], // Valencia / Castellón
  [0.9, 41.0], // delta Ebro / Tarragona
  [2.2, 41.4], // Barcelona
  [3.3, 42.4], // Cap de Creus (NE)
  [1.7, 42.5], // Pirineo central
  [-0.7, 42.9], // Pirineo aragonés
  [-1.78, 43.36], // cierre
]

const IBERIA_PATH = (() => {
  const pts = IBERIA_LL.map(([lon, lat]) => project(lat, lon))
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
})()

interface CentralAgg {
  central: string
  provincia: string
  mw: number
  reactores: Reactor[]
  bwr: boolean
  lat: number
  lon: number
  x: number
  y: number
}

export default function NuclearMap() {
  const [hover, setHover] = useState<string | null>(null)

  const centrales = useMemo<CentralAgg[]>(() => {
    const byCentral = new Map<string, Reactor[]>()
    for (const r of REACTORES_ES) {
      const arr = byCentral.get(r.central) ?? []
      arr.push(r)
      byCentral.set(r.central, arr)
    }
    const out: CentralAgg[] = []
    for (const [central, rs] of Array.from(byCentral.entries())) {
      const coord = CENTRAL_COORDS[central]
      if (!coord) continue
      const mw = rs.reduce((s: number, r: Reactor) => s + r.potencia_mw, 0)
      const p = project(coord.lat, coord.lon)
      out.push({
        central,
        provincia: coord.provincia,
        mw,
        reactores: rs.slice().sort((a: Reactor, b: Reactor) => a.nombre.localeCompare(b.nombre)),
        bwr: rs.some((r: Reactor) => /bwr/i.test(r.tecnologia)),
        lat: coord.lat,
        lon: coord.lon,
        ...p,
      })
    }
    return out.sort((a, b) => b.mw - a.mw)
  }, [])

  const maxMw = Math.max(1, ...centrales.map((c) => c.mw))
  // Radio del punto ∝ potencia (raíz para que el área sea ~proporcional).
  const radius = (mw: number) => 9 + Math.sqrt(mw / maxMw) * 17

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 18, alignItems: 'center' }}>
      {/* Mapa SVG */}
      <div style={{ position: 'relative' }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} role="img" aria-label="Mapa de centrales nucleares de España">
          {/* Masa peninsular */}
          <path d={IBERIA_PATH} fill={LAND} stroke={LAND_STROKE} strokeWidth={1.4} strokeLinejoin="round" />

          {/* Puntos de central */}
          {centrales.map((c) => {
            const r = radius(c.mw)
            const active = hover === c.central
            const fill = c.bwr ? NUCLEAR_BWR : NUCLEAR
            return (
              <g
                key={c.central}
                onMouseEnter={() => setHover(c.central)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={c.x} cy={c.y} r={r + 5} fill={fill} opacity={active ? 0.18 : 0.1} />
                <circle cx={c.x} cy={c.y} r={r} fill={fill} opacity={0.9} stroke="#fff" strokeWidth={2}>
                  <title>{`${c.central} (${c.provincia}) · ${c.mw.toLocaleString('es-ES')} MW · ${c.reactores.length} reactor${c.reactores.length > 1 ? 'es' : ''}`}</title>
                </circle>
                {/* Etiqueta */}
                <text
                  x={c.x}
                  y={c.y - r - 6}
                  textAnchor="middle"
                  style={{ fontSize: 11, fontWeight: 700, fill: '#1d1d1f', fontFamily: 'var(--font-display)', pointerEvents: 'none' }}
                >
                  {c.central}
                </text>
                <text
                  x={c.x}
                  y={c.y + 3.5}
                  textAnchor="middle"
                  style={{ fontSize: 9, fontWeight: 700, fill: '#fff', pointerEvents: 'none' }}
                >
                  {c.reactores.length}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Listado lateral sincronizado */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {centrales.map((c) => {
          const active = hover === c.central
          return (
            <div
              key={c.central}
              onMouseEnter={() => setHover(c.central)}
              onMouseLeave={() => setHover(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: '10px 1fr auto',
                alignItems: 'center',
                gap: 10,
                background: active ? '#F5F3FF' : '#FAFAFA',
                border: `1px solid ${active ? '#DDD6FE' : '#ECECEF'}`,
                borderRadius: 10,
                padding: '8px 11px',
                transition: 'background 150ms ease, border-color 150ms ease',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.bwr ? NUCLEAR_BWR : NUCLEAR }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>
                  {c.central}
                </div>
                <div style={{ fontSize: 10, color: '#86868b' }}>
                  {c.provincia} · {c.reactores.length} reactor{c.reactores.length > 1 ? 'es' : ''} · {c.bwr ? 'BWR' : 'PWR'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: NUCLEAR }}>
                  {(c.mw / 1000).toFixed(2)} <span style={{ fontSize: 9, color: '#86868b', fontWeight: 600 }}>GW</span>
                </div>
                <div style={{ fontSize: 9.5, color: '#86868b' }}>{c.mw.toLocaleString('es-ES')} MW</div>
              </div>
            </div>
          )
        })}
        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
          Tamaño del punto ∝ potencia neta de la central. Coordenadas geográficas de los emplazamientos
          (CSN / Foro Nuclear). Contorno peninsular esquemático. Cofrentes en azul (BWR), resto PWR.
        </p>
      </div>
    </div>
  )
}
