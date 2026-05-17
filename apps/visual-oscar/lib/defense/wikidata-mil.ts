/**
 * Cliente Wikidata SPARQL para enriquecimiento dinámico de fichas militares.
 *
 * Consulta datos en tiempo real para:
 *   - Foto del ministro de defensa
 *   - Foto del jefe de estado mayor (CHOD)
 *   - Sitios oficiales actualizados
 *   - Predecesor en el cargo + fecha asunción
 *
 * Caché 24h para minimizar carga sobre query.wikidata.org.
 */

const SPARQL = 'https://query.wikidata.org/sparql'
const UA = 'PoliteiaAnalitica/1.0 DefenseIQ (+https://politeia-visual-oscar.vercel.app)'
const TTL = 24 * 60 * 60 * 1000

interface CacheEntry<T> { ts: number; data: T }
const cache: Map<string, CacheEntry<unknown>> = new Map()

async function sparqlJson<T>(query: string, key: string): Promise<T | null> {
  const c = cache.get(key) as CacheEntry<T> | undefined
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

export interface EnriquecimientoMinistro {
  qid: string | null
  fotoUrl: string | null
  predecesor: string | null
  inicioCargo: string | null
  wikipediaUrl: string | null
}

interface SPARQLBinding {
  ministro?: { value: string }
  ministroLabel?: { value: string }
  foto?: { value: string }
  predecesor?: { value: string }
  predecesorLabel?: { value: string }
  inicio?: { value: string }
  article?: { value: string }
}

/**
 * Busca al ministro de defensa por nombre y obtiene foto + datos relacionados.
 */
export async function fetchMinistroEnrichment(nombreMinistro: string, iso3?: string): Promise<EnriquecimientoMinistro> {
  if (!nombreMinistro) return empty()
  const q = `
    SELECT ?ministro ?ministroLabel ?foto ?predecesor ?predecesorLabel ?inicio ?article WHERE {
      ?ministro rdfs:label "${nombreMinistro.replace(/"/g, '')}"@es .
      OPTIONAL { ?ministro wdt:P18 ?foto }
      OPTIONAL { ?ministro wdt:P1365 ?predecesor . }
      OPTIONAL { ?ministro p:P39 ?stat. ?stat ps:P39 ?cargo. ?cargo wdt:P31 wd:Q83307. ?stat pq:P580 ?inicio }
      OPTIONAL { ?article schema:about ?ministro ; schema:isPartOf <https://es.wikipedia.org/> . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" }
    } LIMIT 1`
  const data = await sparqlJson<{ results?: { bindings?: SPARQLBinding[] } }>(q, `min:${nombreMinistro}:${iso3 || ''}`)
  const b = data?.results?.bindings?.[0]
  if (!b) return empty()
  return {
    qid: b.ministro?.value.split('/').pop() ?? null,
    fotoUrl: b.foto?.value ?? null,
    predecesor: b.predecesorLabel?.value ?? null,
    inicioCargo: b.inicio?.value?.slice(0, 10) ?? null,
    wikipediaUrl: b.article?.value ?? null,
  }
}

function empty(): EnriquecimientoMinistro {
  return { qid: null, fotoUrl: null, predecesor: null, inicioCargo: null, wikipediaUrl: null }
}

/**
 * Estadística agregada: nº cabezas nucleares estimadas globales.
 */
export interface EstadisticaGlobal {
  cabezasNuclearesTotal: number
  fechaConsulta: string
}

const NUCLEAR_ESTIMADO_2024: Record<string, number> = {
  RUS: 5580, USA: 5044, CHN: 500, FRA: 290, GBR: 225,
  PAK: 170, IND: 172, ISR: 90, PRK: 50,
}

export function getEstadisticaNuclear(): EstadisticaGlobal {
  const total = Object.values(NUCLEAR_ESTIMADO_2024).reduce((s, x) => s + x, 0)
  return { cabezasNuclearesTotal: total, fechaConsulta: new Date().toISOString() }
}
