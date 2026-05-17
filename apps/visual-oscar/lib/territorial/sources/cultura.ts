/**
 * Cultura y patrimonio · Wikidata SPARQL.
 *
 * Recupera:
 *   - Bienes de Interés Cultural (BIC) y patrimonio del municipio (P1435)
 *   - Sitios UNESCO (P757) en el municipio
 *   - Tipo y foto cuando disponible
 *
 * Para CCAA: agrega los BIC del nivel CCAA y los más destacados.
 */

const SPARQL = 'https://query.wikidata.org/sparql'
const UA = 'PoliteiaAnalitica/1.0 (+https://politeia-visual-oscar.vercel.app)'

interface CacheEntry<T> { ts: number; data: T }
const cache: Map<string, CacheEntry<unknown>> = new Map()
const TTL = 7 * 24 * 60 * 60 * 1000 // 7 días: el patrimonio cambia poco

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

export interface BienCultural {
  qid: string
  nombre: string
  tipo: string
  imagen: string | null
  esUnesco: boolean
  wikipediaUrl: string | null
}

export interface PatrimonioCultural {
  total: number
  bienes: BienCultural[]
  unesco: BienCultural[]
  estadisticas: {
    porTipo: Record<string, number>
    conImagen: number
  }
  fuente: string
}

interface SPARQLBinding {
  bien?: { value: string }
  bienLabel?: { value: string }
  tipoLabel?: { value: string }
  imagen?: { value: string }
  unesco?: { value: string }
  article?: { value: string }
}
interface SPARQLResult { results?: { bindings?: SPARQLBinding[] } }

/**
 * Patrimonio cultural de un municipio por código INE.
 */
export async function fetchPatrimonioMunicipio(codigoIne: string): Promise<PatrimonioCultural | null> {
  const codigos = [codigoIne, codigoIne.replace(/^0+/, '')]
  for (const cod of codigos) {
    const q = `
      SELECT DISTINCT ?bien ?bienLabel ?tipoLabel ?imagen ?unesco ?article WHERE {
        ?municipio wdt:P772 "${cod}" .
        ?bien wdt:P131* ?municipio .
        ?bien wdt:P1435 ?heritage .
        OPTIONAL { ?bien wdt:P31 ?tipo . }
        OPTIONAL { ?bien wdt:P18 ?imagen . }
        OPTIONAL { ?bien wdt:P757 ?unesco . }
        OPTIONAL { ?article schema:about ?bien ; schema:isPartOf <https://es.wikipedia.org/> . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" }
      } LIMIT 40`
    const data = await sparqlJson<SPARQLResult>(q, `cultura:${cod}`)
    const bindings = data?.results?.bindings || []
    if (bindings.length === 0) continue
    return procesarBindings(bindings)
  }
  return null
}

/**
 * Patrimonio cultural de una CCAA por su QID (Q5837 = Galicia, etc.) o nombre.
 */
export async function fetchPatrimonioCCAA(nombreCcaa: string): Promise<PatrimonioCultural | null> {
  const q = `
    SELECT DISTINCT ?bien ?bienLabel ?tipoLabel ?imagen ?unesco ?article WHERE {
      ?ccaa rdfs:label "${nombreCcaa}"@es .
      ?ccaa wdt:P31/wdt:P279* wd:Q5852411 .
      ?bien wdt:P131* ?ccaa .
      ?bien wdt:P1435 ?heritage .
      OPTIONAL { ?bien wdt:P31 ?tipo . }
      OPTIONAL { ?bien wdt:P18 ?imagen . }
      OPTIONAL { ?bien wdt:P757 ?unesco . }
      OPTIONAL { ?article schema:about ?bien ; schema:isPartOf <https://es.wikipedia.org/> . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" }
    } LIMIT 60`
  const data = await sparqlJson<SPARQLResult>(q, `cultura-ccaa:${nombreCcaa}`)
  const bindings = data?.results?.bindings || []
  if (bindings.length === 0) return null
  return procesarBindings(bindings)
}

function procesarBindings(bindings: SPARQLBinding[]): PatrimonioCultural {
  const seen = new Set<string>()
  const bienes: BienCultural[] = []
  for (const b of bindings) {
    const qid = b.bien?.value.split('/').pop() || ''
    if (!qid || seen.has(qid)) continue
    seen.add(qid)
    const nombre = b.bienLabel?.value || qid
    // Filtrar etiquetas que sean simplemente el QID
    if (nombre.match(/^Q\d+$/)) continue
    bienes.push({
      qid,
      nombre,
      tipo: b.tipoLabel?.value || 'monumento',
      imagen: b.imagen?.value || null,
      esUnesco: !!b.unesco,
      wikipediaUrl: b.article?.value || null,
    })
  }

  // Estadísticas
  const porTipo: Record<string, number> = {}
  let conImagen = 0
  for (const x of bienes) {
    const t = normalizarTipo(x.tipo)
    porTipo[t] = (porTipo[t] || 0) + 1
    if (x.imagen) conImagen++
  }

  const unesco = bienes.filter(x => x.esUnesco)
  return {
    total: bienes.length,
    bienes: bienes.slice(0, 30),
    unesco,
    estadisticas: { porTipo, conImagen },
    fuente: 'Wikidata · Inventario Bienes de Interés Cultural + UNESCO',
  }
}

function normalizarTipo(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('iglesia') || lower.includes('templo') || lower.includes('catedral')) return 'Religioso'
  if (lower.includes('castill') || lower.includes('fortaleza') || lower.includes('muralla')) return 'Defensivo'
  if (lower.includes('palacio') || lower.includes('residenc')) return 'Palacios'
  if (lower.includes('museo') || lower.includes('archivo')) return 'Museos / Archivos'
  if (lower.includes('teatro') || lower.includes('plaza de toros')) return 'Espectáculos'
  if (lower.includes('puente') || lower.includes('acueducto')) return 'Ingeniería'
  if (lower.includes('jardín') || lower.includes('parque')) return 'Naturales'
  if (lower.includes('monumento') || lower.includes('escultura')) return 'Monumentos'
  if (lower.includes('necrópolis') || lower.includes('yacimiento') || lower.includes('talayótico') || lower.includes('arqueológic')) return 'Arqueológico'
  if (lower.includes('convento') || lower.includes('monasterio')) return 'Conventos'
  return 'Otros'
}
