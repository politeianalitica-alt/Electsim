/**
 * Cliente Wikidata SPARQL · Sprint GEO-NEXT FIX-A7
 *
 * Wikidata expone un endpoint SPARQL público sin auth:
 *   https://query.wikidata.org/sparql
 *
 * Lo usamos para enriquecer el perfil de país del drawer con datos
 * estructurales que NO están en REST Countries o World Bank:
 *
 *   - Jefe de Estado actual (P35)
 *   - Jefe de Gobierno actual (P6)
 *   - Tipo de gobierno (P122)
 *   - Capital (P36)
 *   - Moneda (P38)
 *   - Lema nacional (P1546)
 *   - Año independencia (P575)
 *   - Idioma oficial (P37)
 *   - Religión oficial si aplica (P140)
 *   - Sistema legal (P1387)
 *
 * Cache: 7 días (datos estructurales cambian poco).
 *
 * Importante: Wikidata exige User-Agent identificativo y respeta robots.txt.
 * Limitamos a 1 query por país, timeout 8s, fallback a null si falla.
 */

const WD_SPARQL = 'https://query.wikidata.org/sparql'
const DEFAULT_TIMEOUT_MS = 8000
const USER_AGENT =
  'PoliteiaAnalitica/1.0 (https://politeia-visual-oscar.vercel.app; contact@politeia.es) Sprint GEO-NEXT FIX-A7'

export interface WikidataCountryFacts {
  iso3: string
  head_of_state?: { name: string; since?: string }
  head_of_government?: { name: string; since?: string }
  government_type?: string
  capital?: string
  currency?: string
  national_motto?: string
  independence_date?: string
  official_language?: string
  state_religion?: string
  legal_system?: string
  fetched_at: string
}

/**
 * SPARQL query que extrae los principales datos estructurales de un país
 * por código ISO 3166-1 alpha-3.
 *
 * Estrategia: buscamos primero el item Q* del país por su iso3 (P298),
 * luego extraemos las propiedades estructurales con OPTIONAL para que
 * la query no falle si falta algún campo.
 */
function buildSparqlQuery(iso3: string): string {
  return `
SELECT ?country ?countryLabel
       ?headOfStateLabel ?headOfStateStart
       ?headOfGovLabel ?headOfGovStart
       ?govTypeLabel
       ?capitalLabel
       ?currencyLabel
       ?motto
       ?independence
       ?languageLabel
       ?religionLabel
       ?legalSystemLabel
WHERE {
  ?country wdt:P298 "${iso3}" .
  OPTIONAL {
    ?country p:P35 ?hosStmt .
    ?hosStmt ps:P35 ?headOfState .
    FILTER NOT EXISTS { ?hosStmt pq:P582 ?endDate }
    OPTIONAL { ?hosStmt pq:P580 ?headOfStateStart }
  }
  OPTIONAL {
    ?country p:P6 ?hogStmt .
    ?hogStmt ps:P6 ?headOfGov .
    FILTER NOT EXISTS { ?hogStmt pq:P582 ?endDate2 }
    OPTIONAL { ?hogStmt pq:P580 ?headOfGovStart }
  }
  OPTIONAL { ?country wdt:P122 ?govType . }
  OPTIONAL { ?country wdt:P36 ?capital . }
  OPTIONAL { ?country wdt:P38 ?currency . }
  OPTIONAL { ?country wdt:P1546 ?motto FILTER(LANG(?motto)="es" || LANG(?motto)="en") . }
  OPTIONAL { ?country wdt:P575 ?independence . }
  OPTIONAL { ?country wdt:P37 ?language . }
  OPTIONAL { ?country wdt:P140 ?religion . }
  OPTIONAL { ?country wdt:P1387 ?legalSystem . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
LIMIT 1
  `.trim()
}

interface SparqlBinding {
  type: string
  value: string
  'xml:lang'?: string
}

interface SparqlRow {
  countryLabel?: SparqlBinding
  headOfStateLabel?: SparqlBinding
  headOfStateStart?: SparqlBinding
  headOfGovLabel?: SparqlBinding
  headOfGovStart?: SparqlBinding
  govTypeLabel?: SparqlBinding
  capitalLabel?: SparqlBinding
  currencyLabel?: SparqlBinding
  motto?: SparqlBinding
  independence?: SparqlBinding
  languageLabel?: SparqlBinding
  religionLabel?: SparqlBinding
  legalSystemLabel?: SparqlBinding
}

interface SparqlResponse {
  results?: { bindings?: SparqlRow[] }
}

/** Extrae año YYYY de un timestamp ISO 8601 si es válido. */
function extractYear(iso?: SparqlBinding): string | undefined {
  if (!iso?.value) return undefined
  const m = iso.value.match(/^[+-]?(\d{4})/)
  return m ? m[1] : undefined
}

/**
 * Obtiene los datos estructurales de un país desde Wikidata.
 * Devuelve null si la query falla, el país no tiene entry, o timeout.
 */
export async function fetchCountryFactsFromWikidata(
  iso3: string,
): Promise<WikidataCountryFacts | null> {
  const query = buildSparqlQuery(iso3.toUpperCase())
  const url = `${WD_SPARQL}?query=${encodeURIComponent(query)}&format=json`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': USER_AGENT,
      },
      // Cache CDN: 7 días (Wikidata cambia con baja frecuencia para datos estructurales)
      next: { revalidate: 7 * 86400 },
    })
    clearTimeout(t)
    if (!r.ok) return null
    const json: SparqlResponse = await r.json()
    const rows = json.results?.bindings ?? []
    if (rows.length === 0) return null
    const row = rows[0]
    const facts: WikidataCountryFacts = {
      iso3: iso3.toUpperCase(),
      fetched_at: new Date().toISOString(),
    }
    if (row.headOfStateLabel?.value) {
      facts.head_of_state = {
        name: row.headOfStateLabel.value,
        since: extractYear(row.headOfStateStart),
      }
    }
    if (row.headOfGovLabel?.value) {
      facts.head_of_government = {
        name: row.headOfGovLabel.value,
        since: extractYear(row.headOfGovStart),
      }
    }
    if (row.govTypeLabel?.value) facts.government_type = row.govTypeLabel.value
    if (row.capitalLabel?.value) facts.capital = row.capitalLabel.value
    if (row.currencyLabel?.value) facts.currency = row.currencyLabel.value
    if (row.motto?.value) facts.national_motto = row.motto.value
    if (row.independence?.value) facts.independence_date = extractYear(row.independence)
    if (row.languageLabel?.value) facts.official_language = row.languageLabel.value
    if (row.religionLabel?.value) facts.state_religion = row.religionLabel.value
    if (row.legalSystemLabel?.value) facts.legal_system = row.legalSystemLabel.value
    return facts
  } catch {
    clearTimeout(t)
    return null
  }
}
