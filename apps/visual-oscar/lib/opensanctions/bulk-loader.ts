/**
 * OpenSanctions bulk loader · alternativa al API rate-limited.
 *
 * Usa los bulk downloads de https://data.opensanctions.org (públicos, sin
 * auth, sin rate limit) que es lo que el repo opensanctions/opensanctions
 * (https://github.com/opensanctions/opensanctions) publica diariamente.
 *
 * Fichero: `https://data.opensanctions.org/datasets/latest/sanctions/targets.simple.csv`
 *   ~65MB, ~100k entidades sancionadas globalmente.
 *
 * Estrategia para Vercel Functions:
 *   1. Primera request post cold-start: descarga + parsea CSV (~10s)
 *   2. Resultado cacheado con `unstable_cache` (TTL 24h)
 *   3. Siguientes requests en la misma instancia: instantáneo (memoria)
 *   4. Cada 24h se refresca el snapshot
 *
 * Sprint OS-BULK (2026-05-30): elimina dependencia del API rate-limited.
 */

import { unstable_cache } from 'next/cache'
import Papa from 'papaparse'

const BULK_URL = 'https://data.opensanctions.org/datasets/latest/sanctions/targets.simple.csv'
const USER_AGENT = 'Politeia-Analitica/2.0 (+https://politeia-visual-oscar.vercel.app)'
const FETCH_TIMEOUT_MS = 60_000  // 60s para 65MB

export interface BulkEntity {
  id: string
  caption: string
  schema: string                  // Person | Organization | Vessel | Aircraft | ...
  countries: string[]             // ISO 3166 alpha-2 lowercase
  topics: string[]                // sanction, sanction.linked, role.pep
  datasets: string[]              // ofac_sdn, eu_fsf, etc.
  aliases: string[]
  programs: string[]              // GLOMAG, RU-EO-13662, etc.
  identifiers: string[]
  addresses: string[]
  first_seen?: string
  last_seen?: string
}

interface CSVRow {
  id?: string
  schema?: string
  name?: string
  aliases?: string
  birth_date?: string
  countries?: string
  addresses?: string
  identifiers?: string
  sanctions?: string
  phones?: string
  emails?: string
  program_ids?: string
  dataset?: string
  first_seen?: string
  last_seen?: string
  last_change?: string
}

interface BulkIndex {
  entities: BulkEntity[]
  /** Mapa ISO2 lowercase → entidades con ese país en sus countries. */
  byCountry: Record<string, BulkEntity[]>
  /** Mapa nombre lowercase → entidades con caption O alias coincidente exacto. */
  byNameLower: Record<string, BulkEntity[]>
  total: number
  fetched_at: string
}

function splitSemis(value: string | undefined): string[] {
  if (!value) return []
  return value.split(';').map((s) => s.trim()).filter(Boolean)
}

function rowToEntity(row: CSVRow): BulkEntity | null {
  if (!row.id || !row.name) return null
  return {
    id: row.id,
    caption: row.name,
    schema: row.schema || 'Person',
    countries: splitSemis(row.countries).map((c) => c.toLowerCase()),
    topics: row.sanctions ? ['sanction'] : [],
    datasets: splitSemis(row.dataset),
    aliases: splitSemis(row.aliases).slice(0, 5),  // top 5 para reducir memoria
    programs: splitSemis(row.program_ids),
    identifiers: splitSemis(row.identifiers).slice(0, 3),
    addresses: splitSemis(row.addresses).slice(0, 2),
    first_seen: row.first_seen,
    last_seen: row.last_seen,
  }
}

async function fetchAndParseBulk(): Promise<BulkIndex> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  let csvText = ''
  try {
    const r = await fetch(BULK_URL, {
      signal: ctrl.signal,
      headers: { Accept: 'text/csv', 'User-Agent': USER_AGENT },
    })
    clearTimeout(t)
    if (!r.ok) {
      throw new Error(`bulk_fetch_failed_http_${r.status}`)
    }
    csvText = await r.text()
  } catch (e) {
    clearTimeout(t)
    throw e instanceof Error ? e : new Error(String(e))
  }

  // Parse CSV con papaparse (header: true, dynamicTyping: false)
  const parsed = Papa.parse<CSVRow>(csvText, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  })

  const entities: BulkEntity[] = []
  for (const row of parsed.data) {
    const e = rowToEntity(row)
    if (e) entities.push(e)
  }

  const byCountry: Record<string, BulkEntity[]> = {}
  const byNameLower: Record<string, BulkEntity[]> = {}
  for (const e of entities) {
    for (const cc of e.countries) {
      if (!byCountry[cc]) byCountry[cc] = []
      byCountry[cc].push(e)
    }
    const captionKey = e.caption.toLowerCase()
    if (!byNameLower[captionKey]) byNameLower[captionKey] = []
    byNameLower[captionKey].push(e)
    for (const alias of e.aliases) {
      const aliasKey = alias.toLowerCase()
      if (!byNameLower[aliasKey]) byNameLower[aliasKey] = []
      byNameLower[aliasKey].push(e)
    }
  }

  return {
    entities,
    byCountry,
    byNameLower,
    total: entities.length,
    fetched_at: new Date().toISOString(),
  }
}

/**
 * Snapshot cacheado del bulk sanctions de OpenSanctions.
 * Cache TTL: 24h. Se descarga + parsea sólo una vez por día por instancia.
 */
export const getBulkSanctionsIndex = unstable_cache(
  async () => {
    try {
      return await fetchAndParseBulk()
    } catch (e) {
      // Falla cerrado · devolvemos índice vacío con error
      return {
        entities: [],
        byCountry: {},
        byNameLower: {},
        total: 0,
        fetched_at: new Date().toISOString(),
        error: e instanceof Error ? e.message : 'bulk_fetch_failed',
      } as BulkIndex & { error: string }
    }
  },
  ['opensanctions-bulk-v1'],
  { revalidate: 86_400, tags: ['opensanctions-bulk'] },
)

/**
 * Búsqueda fuzzy de entidades por nombre en el snapshot bulk.
 * Match: contiene la query (case-insensitive) en caption o en alguno de los aliases.
 * Devuelve top N ordenado por relevancia (match en caption > match en alias).
 */
export async function searchBulkByName(query: string, limit = 10): Promise<BulkEntity[]> {
  if (!query || query.length < 2) return []
  const index = await getBulkSanctionsIndex()
  const q = query.toLowerCase().trim()

  // 1. Match exacto en byNameLower
  const exact = index.byNameLower[q] || []
  if (exact.length >= limit) return exact.slice(0, limit)

  // 2. Match parcial (contains) escaneando entities
  const partial: { e: BulkEntity; score: number }[] = []
  const seen = new Set(exact.map((e) => e.id))
  for (const e of index.entities) {
    if (seen.has(e.id)) continue
    const cap = e.caption.toLowerCase()
    if (cap.includes(q)) {
      partial.push({ e, score: cap.startsWith(q) ? 100 : 50 })
      if (partial.length + exact.length >= limit * 3) break
      continue
    }
    for (const alias of e.aliases) {
      if (alias.toLowerCase().includes(q)) {
        partial.push({ e, score: 25 })
        break
      }
    }
  }
  partial.sort((a, b) => b.score - a.score)
  return [...exact, ...partial.slice(0, limit - exact.length).map((p) => p.e)]
}

/**
 * Entidades sancionadas asociadas a un país.
 * iso2 en lowercase (ru, ir, kp, sy, ...).
 */
export async function getBulkByCountry(iso2: string, limit = 20): Promise<BulkEntity[]> {
  if (!iso2) return []
  const index = await getBulkSanctionsIndex()
  const entities = index.byCountry[iso2.toLowerCase()] || []
  return entities.slice(0, limit)
}

/**
 * Conteo total de entidades sancionadas por país (para ranking en mapa).
 */
export async function getBulkCountByCountry(iso2: string): Promise<number> {
  if (!iso2) return 0
  const index = await getBulkSanctionsIndex()
  return (index.byCountry[iso2.toLowerCase()] || []).length
}

/**
 * Stats globales del snapshot.
 */
export async function getBulkStats(): Promise<{
  total: number
  datasets_count: number
  fetched_at: string
  has_error: boolean
}> {
  const index = await getBulkSanctionsIndex()
  const datasets = new Set<string>()
  for (const e of index.entities) {
    for (const d of e.datasets) datasets.add(d)
  }
  return {
    total: index.total,
    datasets_count: datasets.size,
    fetched_at: index.fetched_at,
    has_error: 'error' in index && Boolean((index as any).error),
  }
}
