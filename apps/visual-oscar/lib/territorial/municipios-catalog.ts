/**
 * Catálogo COMPLETO de los 8.132 municipios de España (INE 2024 + Censo 2025).
 *
 * Fuente:
 *   - Lista oficial INE 2024: https://www.ine.es/daco/daco42/codmun/diccionario24.xlsx
 *   - Población oficial 2025: tablas csv_bdsc por provincia (INE)
 *
 * Procesado y guardado en data/municipios-espana.json (~1.2 MB)
 *
 * Datos por municipio:
 *   - código INE 5 dígitos
 *   - slug
 *   - nombre oficial
 *   - CCAA (slug)
 *   - provincia (nombre)
 *   - cpro (código provincia 2 dígitos)
 *   - población (2025 INE)
 *   - poblacionAño
 *
 * Para datos adicionales (alcalde, partido, superficie, etc.) se enriquecen
 * dinámicamente vía Wikipedia REST API y RSS news en el profile builder.
 */

import municipiosData from '@/data/municipios-espana.json'

export interface Municipio {
  ine: string
  slug: string
  nombre: string
  ccaa: string
  provincia: string
  cpro: string
  poblacion: number
  poblacionAño?: string
  /** Opcional: enriquecido dinámicamente o ampliado */
  alcalde?: string | null
  partidoAlcalde?: string | null
  alcaldeDesde?: number | null
  superficie?: number
  webAyuntamiento?: string | null
  wikipedia?: string
  tokens?: string[]
}

const RAW = municipiosData as Array<Omit<Municipio, 'wikipedia' | 'tokens'>>

/** Genera URL Wikipedia + tokens detección al vuelo (no se guardan en disco) */
function enrichOnDemand(m: typeof RAW[0]): Municipio {
  const nombreLimpio = m.nombre.replace(/\//g, ' / ').replace(/-/g, ' ')
  const wikiTitle = m.nombre.replace(/\s+/g, '_').replace(/\//g, '_')
  return {
    ...m,
    wikipedia: `https://es.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
    tokens: [m.nombre.toLowerCase(), nombreLimpio.toLowerCase()].filter((v, i, a) => a.indexOf(v) === i),
  }
}

// Cache enriquecido (lazy, evita procesar 8132 al inicio)
let _enriched: Municipio[] | null = null
function getAll(): Municipio[] {
  if (_enriched) return _enriched
  _enriched = RAW.map(enrichOnDemand)
  return _enriched
}

export const MUNICIPIOS = getAll()

export function getMunicipioBySlug(slug: string): Municipio | undefined {
  return MUNICIPIOS.find(m => m.slug === slug)
}

export function getMunicipiosByCCAA(ccaa: string): Municipio[] {
  return MUNICIPIOS.filter(m => m.ccaa === ccaa)
}

export function getMunicipiosByProvincia(cpro: string): Municipio[] {
  return MUNICIPIOS.filter(m => m.cpro === cpro)
}

export function searchMunicipios(query: string, limit = 100): Municipio[] {
  if (!query) {
    // Sin query devolver top por población
    return MUNICIPIOS.slice().sort((a, b) => (b.poblacion || 0) - (a.poblacion || 0)).slice(0, limit)
  }
  const q = query.toLowerCase().trim()
  return MUNICIPIOS
    .filter(m => m.nombre.toLowerCase().includes(q) || m.provincia.toLowerCase().includes(q))
    .sort((a, b) => (b.poblacion || 0) - (a.poblacion || 0))
    .slice(0, limit)
}

/** Lista de provincias únicas con conteo de municipios */
export function getProvinciasList(): Array<{ cpro: string; nombre: string; nMunicipios: number; poblacionTotal: number }> {
  const map = new Map<string, { cpro: string; nombre: string; nMunicipios: number; poblacionTotal: number }>()
  for (const m of MUNICIPIOS) {
    const ex = map.get(m.cpro) ?? { cpro: m.cpro, nombre: m.provincia, nMunicipios: 0, poblacionTotal: 0 }
    ex.nMunicipios++
    ex.poblacionTotal += m.poblacion || 0
    map.set(m.cpro, ex)
  }
  return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
