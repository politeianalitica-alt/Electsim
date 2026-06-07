'use client'
/**
 * <LicMapaMundi /> · Tercer Sector v3 · Sprint TS7 (Licitaciones · mapa mundi)
 *
 * Mapa mundial esquemático de las licitaciones INTERNACIONALES del barrido (todo
 * lo que no es España: UE, otros países, regional extranjero y organizaciones
 * internacionales). Burbujas por país dimensionadas por nº de licitaciones; click
 * en un país → filtra la búsqueda por ese país. Es el ángulo distintivo de esta
 * vista frente a /licitaciones (que es España-céntrico).
 *
 * Reutiliza:
 *   - react-simple-maps (mismo stack que <MapaNarrativasGlobal>) con el world-atlas
 *     vía unpkg, ya empleado en /prensa.
 *   - COUNTRY_COORDS de lib/geopolitica/country-coords.ts (centroides + nombres
 *     ES/EN) para ubicar cada país por su NOMBRE (las licitaciones traen `pais`
 *     legible, no coordenadas). Sin tocar lib/.
 *
 * Degradación honesta: si una licitación trae un país que no está en el catálogo
 * de centroides, no se ubica en el mapa pero SÍ se cuenta en la leyenda "sin
 * ubicar". Cero emojis · Unicode geométrico.
 */
import { useMemo } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import type { LicitacionNormalizada } from '@/lib/tercer-sector/licitaciones/types'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'
import { ACCENT, nivelMeta } from './LicShared'

const WORLD_GEO_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json'

interface Props {
  items: LicitacionNormalizada[]
  onPais: (pais: string) => void
}

interface CountryAgg {
  pais: string
  lat: number
  lon: number
  count: number
  /** Nivel dominante (para el color de la burbuja). */
  nivel: string
}

// Índice nombre→coord construido una vez desde COUNTRY_COORDS (ES + EN, lowercase).
const NAME_INDEX: Record<string, { lat: number; lon: number }> = (() => {
  const idx: Record<string, { lat: number; lon: number }> = {}
  for (const c of Object.values(COUNTRY_COORDS)) {
    idx[c.name_es.toLowerCase()] = { lat: c.lat, lon: c.lon }
    idx[c.name_en.toLowerCase()] = { lat: c.lat, lon: c.lon }
  }
  // Alias frecuentes que difieren del catálogo.
  const alias: Record<string, string> = {
    'reino unido': 'reino unido',
    'estados unidos': 'estados unidos',
    'república dominicana': 'r. dominicana',
    'r. dominicana': 'república dominicana',
    'rd congo': 'rd congo',
  }
  for (const [k, v] of Object.entries(alias)) {
    if (!idx[k] && idx[v]) idx[k] = idx[v]
  }
  return idx
})()

function lookup(pais: string): { lat: number; lon: number } | null {
  if (!pais) return null
  return NAME_INDEX[pais.trim().toLowerCase()] ?? null
}

export function LicMapaMundi({ items, onPais }: Props) {
  const { aggs, sinUbicar, totalInt } = useMemo(() => {
    // Solo internacionales (todo lo que no es España / nacional_es / ccaa).
    const internacionales = items.filter(
      (l) => l.nivel !== 'ccaa' && l.nivel !== 'nacional_es' && (l.pais || '').toLowerCase() !== 'españa',
    )
    const byPais = new Map<string, CountryAgg & { niveles: Record<string, number> }>()
    let sin = 0
    for (const l of internacionales) {
      const coord = lookup(l.pais)
      if (!coord) {
        sin += 1
        continue
      }
      const key = l.pais
      const cur = byPais.get(key) ?? { pais: key, lat: coord.lat, lon: coord.lon, count: 0, nivel: l.nivel, niveles: {} }
      cur.count += 1
      cur.niveles[l.nivel] = (cur.niveles[l.nivel] || 0) + 1
      byPais.set(key, cur)
    }
    // Nivel dominante por país.
    const out: CountryAgg[] = Array.from(byPais.values()).map((a) => {
      const nivelEntries = Object.entries(a.niveles) as Array<[string, number]>
      nivelEntries.sort((x, y) => y[1] - x[1])
      const dom = nivelEntries[0]?.[0] ?? a.nivel
      return { pais: a.pais, lat: a.lat, lon: a.lon, count: a.count, nivel: dom }
    })
    return { aggs: out.sort((x, y) => y.count - x.count), sinUbicar: sin, totalInt: internacionales.length }
  }, [items])

  if (totalInt === 0) {
    return null // sin internacionales en este barrido → no mostramos el mapa
  }

  const maxCount = Math.max(1, ...aggs.map((a) => a.count))
  const radius = (c: number) => 4 + Math.sqrt(c / maxCount) * 16

  return (
    <section style={{ background: '#0f172a', borderRadius: 14, padding: 14, marginBottom: 14, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
          ⬡ Licitaciones internacionales en el mapa
        </p>
        <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>
          {totalInt.toLocaleString('es-ES')} fuera de España · {aggs.length} {aggs.length === 1 ? 'país ubicado' : 'países ubicados'}
          {sinUbicar > 0 ? ` · ${sinUbicar} sin ubicar` : ''}
        </p>
      </div>

      <ComposableMap projectionConfig={{ scale: 135 }} projection="geoEqualEarth" style={{ width: '100%', height: 320 }}>
        <Geographies geography={WORLD_GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{
                  default: { fill: '#1e293b', stroke: '#0f172a', strokeWidth: 0.5, outline: 'none' },
                  hover: { fill: '#334155', outline: 'none' },
                  pressed: { fill: '#334155', outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>
        {aggs.map((a) => {
          const color = nivelMeta(a.nivel).color
          return (
            <Marker key={a.pais} coordinates={[a.lon, a.lat]} onClick={() => onPais(a.pais)} style={{ default: { cursor: 'pointer' } }}>
              <circle r={radius(a.count)} fill={color} fillOpacity={0.7} stroke="#fff" strokeWidth={0.8}>
                <title>{`${a.pais} · ${a.count} licitación(es) · ${nivelMeta(a.nivel).short}`}</title>
              </circle>
            </Marker>
          )
        })}
      </ComposableMap>

      {/* Leyenda de niveles (solo internacionales) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
        {['ue', 'pais_extranjero', 'regional_extranjero', 'org_internacional'].map((id) => {
          const m = nivelMeta(id)
          const has = aggs.some((a) => a.nivel === id)
          if (!has) return null
          return (
            <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9.5, color: '#cbd5e1' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, display: 'inline-block' }} />
              {m.short}
            </span>
          )
        })}
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#64748b' }}>
          Tamaño ∝ nº de licitaciones · click en un país para filtrar · centroides Natural Earth
        </span>
      </div>
    </section>
  )
}

export default LicMapaMundi
