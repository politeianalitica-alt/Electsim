/**
 * Cliente UNHCR Refugee Statistics API
 *
 * API pública sin key:
 *   https://api.unhcr.org/population/v1/
 *
 * Endpoint clave:
 *   /population?yearFrom=2015&yearTo=2024&coo_iso=XXX  · país de origen
 *   /population?yearFrom=2015&yearTo=2024&coa_iso=XXX  · país de asilo
 *
 * Categorías relevantes:
 *   - refugees (REF) · refugiados reconocidos
 *   - asylum_seekers (ASY)
 *   - idps (IDP) · desplazados internos
 *   - others_of_concern (OOC)
 *   - stateless (STA)
 *
 * Cache: 1 día (datos anuales pero el endpoint puede ser lento).
 */

const UNHCR_BASE = 'https://api.unhcr.org/population/v1'
const DEFAULT_TIMEOUT_MS = 10000

export interface UnhcrPoint {
  year: number
  refugees: number
  asylum_seekers: number
  idps: number
  stateless: number
  others: number
  total_displaced: number
}

export interface UnhcrCountryResponse {
  ok: boolean
  iso3: string
  /** Origen (personas que ESCAPARON de este país) */
  outflow_series: UnhcrPoint[]
  /** Destino (personas que LLEGARON a este país) */
  inflow_series: UnhcrPoint[]
  fetched_at: string
  error?: string
}

async function fetchUnhcr(url: string): Promise<any | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS)
  try {
    const r = await fetch(url, { signal: ctrl.signal, next: { revalidate: 86400 } })
    clearTimeout(t)
    if (!r.ok) return null
    return await r.json()
  } catch {
    clearTimeout(t)
    return null
  }
}

function aggregateByYear(items: any[]): UnhcrPoint[] {
  const byYear = new Map<number, UnhcrPoint>()
  for (const it of items || []) {
    const year = Number(it.year)
    if (!year) continue
    const cur = byYear.get(year) || {
      year, refugees: 0, asylum_seekers: 0, idps: 0, stateless: 0, others: 0, total_displaced: 0,
    }
    cur.refugees += Number(it.refugees || 0)
    cur.asylum_seekers += Number(it.asylum_seekers || 0)
    cur.idps += Number(it.idps || 0)
    cur.stateless += Number(it.stateless || 0)
    cur.others += Number(it.ooc || 0)
    cur.total_displaced = cur.refugees + cur.asylum_seekers + cur.idps + cur.stateless + cur.others
    byYear.set(year, cur)
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year)
}

/**
 * Pide desplazamiento outflow (país origen) e inflow (país destino) para un ISO3.
 * Devuelve series anuales 2015-actual.
 */
export async function fetchDisplacement(iso3: string): Promise<UnhcrCountryResponse> {
  const startedAt = new Date().toISOString()
  const currentYear = new Date().getFullYear()
  const fromYear = currentYear - 10
  const outflowUrl = `${UNHCR_BASE}/population/?yearFrom=${fromYear}&yearTo=${currentYear}&coo_iso=${iso3.toUpperCase()}&download=false`
  const inflowUrl = `${UNHCR_BASE}/population/?yearFrom=${fromYear}&yearTo=${currentYear}&coa_iso=${iso3.toUpperCase()}&download=false`

  const [outflow, inflow] = await Promise.all([
    fetchUnhcr(outflowUrl),
    fetchUnhcr(inflowUrl),
  ])

  return {
    ok: !!(outflow?.items || inflow?.items),
    iso3,
    outflow_series: aggregateByYear(outflow?.items || []),
    inflow_series: aggregateByYear(inflow?.items || []),
    fetched_at: startedAt,
  }
}

/**
 * Helper · last total displaced (origin) o null.
 */
export function getLatestDisplacement(series: UnhcrPoint[]): number | null {
  if (series.length === 0) return null
  return series[series.length - 1].total_displaced
}
