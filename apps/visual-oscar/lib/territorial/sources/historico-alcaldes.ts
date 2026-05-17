/**
 * Histórico de alcaldes/jefes de gobierno municipal vía Wikidata SPARQL.
 *
 * Estrategia:
 *   - Buscar municipio por P772 (código INE)
 *   - Recuperar todas las relaciones P6 (head of government) con sus fechas
 *     P580 (start time) y P582 (end time)
 *   - Enriquecer con partido P102 y foto P18
 *
 * Caché 7 días: el histórico cambia muy poco.
 */

const SPARQL = 'https://query.wikidata.org/sparql'
const UA = 'PoliteiaAnalitica/1.0 (+https://politeia-visual-oscar.vercel.app)'
const TTL = 7 * 24 * 60 * 60 * 1000

interface CacheEntry<T> { ts: number; data: T }
const cache: Map<string, CacheEntry<unknown>> = new Map()

async function sparqlJson<T>(query: string, key: string): Promise<T | null> {
  const c = cache.get(key) as CacheEntry<T> | undefined
  if (c && Date.now() - c.ts < TTL) return c.data
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(`${SPARQL}?query=${encodeURIComponent(query)}&format=json`, {
      headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' },
      signal: controller.signal,
      next: { revalidate: 604800 },
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

export interface AlcaldeHistorico {
  qid: string
  nombre: string
  partido: string | null
  partidoQid: string | null
  inicio: string | null         // ISO date YYYY-MM-DD
  fin: string | null            // null = en activo
  fotoUrl: string | null
  wikipediaUrl: string | null
}

interface SPARQLBinding {
  alcalde?: { value: string }
  alcaldeLabel?: { value: string }
  partido?: { value: string }
  partidoLabel?: { value: string }
  inicio?: { value: string }
  fin?: { value: string }
  foto?: { value: string }
  article?: { value: string }
}

/**
 * Devuelve TODOS los alcaldes históricos de un municipio por código INE.
 * Ordenados por fecha de inicio descendente (actual primero).
 */
export async function fetchHistoricoAlcaldes(codigoIne: string): Promise<AlcaldeHistorico[]> {
  const codigos = [codigoIne, codigoIne.replace(/^0+/, '')]
  for (const cod of codigos) {
    const q = `
      SELECT DISTINCT ?alcalde ?alcaldeLabel ?partido ?partidoLabel ?inicio ?fin ?foto ?article WHERE {
        ?municipio wdt:P772 "${cod}" .
        ?municipio p:P6 ?st .
        ?st ps:P6 ?alcalde .
        OPTIONAL { ?st pq:P580 ?inicio }
        OPTIONAL { ?st pq:P582 ?fin }
        OPTIONAL { ?alcalde wdt:P102 ?partido }
        OPTIONAL { ?alcalde wdt:P18 ?foto }
        OPTIONAL { ?article schema:about ?alcalde ; schema:isPartOf <https://es.wikipedia.org/> . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" }
      }
      ORDER BY DESC(?inicio)
      LIMIT 30`
    const data = await sparqlJson<{ results?: { bindings?: SPARQLBinding[] } }>(q, `hist:${cod}`)
    const bindings = data?.results?.bindings || []
    if (bindings.length === 0) continue

    // Deduplicar por QID (la misma persona puede aparecer en varias filas si tiene varios partidos)
    const seen = new Map<string, AlcaldeHistorico>()
    for (const b of bindings) {
      const qid = b.alcalde?.value.split('/').pop() ?? ''
      if (!qid || seen.has(qid)) {
        // Si ya existe, completar con partido si falta
        const existing = seen.get(qid)
        if (existing && !existing.partido && b.partidoLabel) {
          existing.partido = b.partidoLabel.value
          existing.partidoQid = b.partido?.value.split('/').pop() ?? null
        }
        continue
      }
      const nombre = b.alcaldeLabel?.value ?? ''
      if (!nombre || /^Q\d+$/.test(nombre)) continue
      seen.set(qid, {
        qid, nombre,
        partido: b.partidoLabel?.value ?? null,
        partidoQid: b.partido?.value.split('/').pop() ?? null,
        inicio: b.inicio?.value?.slice(0, 10) ?? null,
        fin: b.fin?.value?.slice(0, 10) ?? null,
        fotoUrl: b.foto?.value ?? null,
        wikipediaUrl: b.article?.value ?? null,
      })
    }
    return Array.from(seen.values()).sort((a, b) => {
      // El alcalde actual (sin fin) primero, luego por fecha de inicio desc
      if (!a.fin && b.fin) return -1
      if (a.fin && !b.fin) return 1
      const aI = a.inicio ?? '0000'
      const bI = b.inicio ?? '0000'
      return bI.localeCompare(aI)
    }).slice(0, 15)
  }
  return []
}
