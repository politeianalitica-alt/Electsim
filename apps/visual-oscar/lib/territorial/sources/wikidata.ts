/**
 * Cliente Wikidata SPARQL para datos de gobierno municipal/CCAA.
 *
 * Wikidata expone P771 = código INE municipio, P6 = alcalde/jefe gobierno,
 * P31 = es instancia de, P102 = miembro de partido.
 *
 * Cache 24h por consulta.
 */

const SPARQL = 'https://query.wikidata.org/sparql'
const UA = 'PoliteiaAnalitica/1.0 (+https://politeia-visual-oscar.vercel.app)'

interface Cache<T> { ts: number; data: T }
const cache: Map<string, Cache<unknown>> = new Map()
const TTL = 24 * 60 * 60 * 1000

async function sparqlJson<T>(query: string): Promise<T | null> {
  const key = `sparql:${query.slice(0, 100)}`
  const c = cache.get(key) as Cache<T> | undefined
  if (c && Date.now() - c.ts < TTL) return c.data

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${SPARQL}?query=${encodeURIComponent(query)}&format=json`, {
      headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' },
      signal: controller.signal,
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json() as T
    cache.set(key, { ts: Date.now(), data })
    return data
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export interface WikidataGobernante {
  qid: string
  nombre: string
  partidoQid?: string
  partidoNombre?: string
  inicioCargo?: string
  cargoTipo: 'alcalde' | 'presidente'
}

interface SPARQLResults<B = Record<string, { value: string }>> {
  results?: { bindings?: B[] }
}

/**
 * Busca el alcalde actual de un municipio por su código INE.
 * Estrategia: 1) buscar municipio por P771 = INE, 2) buscar P6 actual (sin P582 fin).
 */
export async function fetchAlcaldePorIne(codigoIne: string): Promise<WikidataGobernante | null> {
  // Intentar primero con código INE limpio (sin ceros iniciales adicionales)
  const codigos = [codigoIne, codigoIne.replace(/^0+/, '')]
  for (const cod of codigos) {
    const q = `
      SELECT DISTINCT ?alcalde ?alcaldeLabel ?partido ?partidoLabel ?inicio WHERE {
        ?municipio wdt:P772 "${cod}" .
        ?municipio p:P6 ?st .
        ?st ps:P6 ?alcalde .
        OPTIONAL { ?st pq:P580 ?inicio }
        OPTIONAL { ?alcalde wdt:P102 ?partido }
        FILTER NOT EXISTS { ?st pq:P582 ?fin }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" }
      } LIMIT 5`
    const data = await sparqlJson<SPARQLResults>(q)
    const b = data?.results?.bindings?.[0]
    if (b) {
      return {
        qid: b.alcalde.value.split('/').pop() || '',
        nombre: b.alcaldeLabel?.value || 'Alcalde',
        partidoQid: b.partido?.value.split('/').pop(),
        partidoNombre: b.partidoLabel?.value,
        inicioCargo: b.inicio?.value?.slice(0, 10),
        cargoTipo: 'alcalde',
      }
    }
  }
  return null
}

/**
 * Busca el presidente actual de una CCAA por su nombre.
 */
export async function fetchPresidenteCcaa(nombreCcaa: string): Promise<WikidataGobernante | null> {
  const q = `
    SELECT DISTINCT ?ccaa ?presidente ?presidenteLabel ?partido ?partidoLabel ?inicio WHERE {
      ?ccaa rdfs:label "${nombreCcaa}"@es .
      ?ccaa wdt:P31/wdt:P279* wd:Q5852411 .
      ?ccaa p:P6 ?st .
      ?st ps:P6 ?presidente .
      OPTIONAL { ?st pq:P580 ?inicio }
      OPTIONAL { ?presidente wdt:P102 ?partido }
      FILTER NOT EXISTS { ?st pq:P582 ?fin }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" }
    } LIMIT 3`
  const data = await sparqlJson<SPARQLResults>(q)
  const b = data?.results?.bindings?.[0]
  if (!b) return null
  return {
    qid: b.presidente.value.split('/').pop() || '',
    nombre: b.presidenteLabel?.value || 'Presidente',
    partidoQid: b.partido?.value.split('/').pop(),
    partidoNombre: b.partidoLabel?.value,
    inicioCargo: b.inicio?.value?.slice(0, 10),
    cargoTipo: 'presidente',
  }
}

/**
 * Devuelve coordenadas (lat, lon) de un municipio por código INE.
 * Usa P625 (coordinate location) en Wikidata.
 */
export async function fetchCoordenadasMunicipio(codigoIne: string): Promise<{ lat: number; lon: number } | null> {
  const codigos = [codigoIne, codigoIne.replace(/^0+/, '')]
  for (const cod of codigos) {
    const q = `
      SELECT ?coord WHERE {
        ?municipio wdt:P772 "${cod}" .
        ?municipio wdt:P625 ?coord .
      } LIMIT 1`
    const data = await sparqlJson<SPARQLResults>(q)
    const v = data?.results?.bindings?.[0]?.coord?.value
    if (v) {
      // Format: "Point(lon lat)"
      const m = v.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/)
      if (m) return { lat: parseFloat(m[2]), lon: parseFloat(m[1]) }
    }
  }
  return null
}

/**
 * Devuelve foto de la persona por su QID de Wikidata.
 */
export async function fetchFotoPersona(qid: string): Promise<string | null> {
  if (!qid || !qid.startsWith('Q')) return null
  const q = `
    SELECT ?image WHERE {
      wd:${qid} wdt:P18 ?image .
    } LIMIT 1`
  const data = await sparqlJson<SPARQLResults>(q)
  return data?.results?.bindings?.[0]?.image?.value || null
}
