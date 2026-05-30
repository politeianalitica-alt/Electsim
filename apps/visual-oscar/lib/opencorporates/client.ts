/**
 * Cliente OpenCorporates · base de datos global de empresas.
 *
 * https://api.opencorporates.com/
 * 120M+ empresas en 130 jurisdicciones, oficiales, accionariado.
 *
 * Endpoints clave (v0.4):
 *   GET /companies/search?q=NAME&country_code=es&api_token=KEY
 *   GET /companies/{jurisdiction}/{company_number}?api_token=KEY
 *   GET /officers/search?q=NAME&api_token=KEY
 *   GET /officers/{id}?api_token=KEY
 *
 * Requiere API key (free tier 500 req/mes, paid tier sin límite).
 *
 * Sprint OC (2026-05-30): cliente nuevo del sprint interrumpido para
 * implementar OpenCorporates en el dashboard.
 */

const OC_BASE = 'https://api.opencorporates.com/v0.4'
const DEFAULT_TIMEOUT_MS = 12_000

const OC_API_KEY = process.env.OPENCORPORATES_API_KEY || ''

export interface OCCompany {
  /** Nombre legal de la empresa */
  name: string
  /** Número de registro */
  company_number: string
  /** Jurisdicción (es, gb, us_de, etc.) */
  jurisdiction_code: string
  /** Estado (Active, Dissolved, ...) */
  current_status: string | null
  /** Fecha de constitución (YYYY-MM-DD) */
  incorporation_date: string | null
  /** Fecha de disolución si aplica */
  dissolution_date: string | null
  /** Tipo legal (Sociedad Anónima, GmbH, LLC, ...) */
  company_type: string | null
  /** URL OpenCorporates pública */
  opencorporates_url: string
  /** Dirección registrada */
  registered_address?: string | null
  /** Industria CIIU/NAICS si disponible */
  industry_codes?: string[]
}

export interface OCOfficer {
  /** Nombre completo */
  name: string
  /** Cargo (director, secretary, ...) */
  position: string | null
  /** Empresa en la que figura */
  company: { name: string; jurisdiction_code: string; company_number: string }
  /** Fecha de inicio cargo (YYYY-MM-DD) */
  start_date: string | null
  /** Fecha de fin cargo si terminado */
  end_date: string | null
  /** URL OpenCorporates pública del officer */
  opencorporates_url: string
}

export interface OCResponse<T> {
  ok: boolean
  data: T
  error?: string
  fetched_at: string
  /** Aviso si la API no tiene key (devuelve sólo datos limitados públicos) */
  no_key?: boolean
  total_count?: number
}

interface OCRawCompany {
  company: {
    name?: string
    company_number?: string
    jurisdiction_code?: string
    current_status?: string | null
    incorporation_date?: string | null
    dissolution_date?: string | null
    company_type?: string | null
    opencorporates_url?: string
    registered_address_in_full?: string | null
    industry_codes?: { industry_code?: { code?: string; description?: string } }[]
  }
}

interface OCRawOfficer {
  officer: {
    name?: string
    position?: string | null
    company?: { name?: string; jurisdiction_code?: string; company_number?: string }
    start_date?: string | null
    end_date?: string | null
    opencorporates_url?: string
  }
}

function buildUrl(path: string, params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams()
  if (OC_API_KEY) qs.set('api_token', OC_API_KEY)
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    qs.set(k, String(v))
  }
  return `${OC_BASE}${path}?${qs.toString()}`
}

async function fetchOC(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<any | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 }, // 24h cache
    })
    clearTimeout(t)
    if (r.status === 401 || r.status === 403) {
      // API key inválida o expirada
      return { __error: 'auth_failed', status: r.status }
    }
    if (r.status === 429) {
      return { __error: 'rate_limited', status: 429 }
    }
    if (!r.ok) return { __error: `http_${r.status}`, status: r.status }
    return await r.json()
  } catch (e: any) {
    clearTimeout(t)
    return { __error: String(e?.message ?? e).slice(0, 120) }
  }
}

function mapCompany(raw: OCRawCompany): OCCompany {
  const c = raw.company || ({} as OCRawCompany['company'])
  const industries = (c.industry_codes || [])
    .map((it) => it?.industry_code?.code || it?.industry_code?.description || '')
    .filter(Boolean)
  return {
    name: c.name || 'sin nombre',
    company_number: c.company_number || '',
    jurisdiction_code: c.jurisdiction_code || '',
    current_status: c.current_status ?? null,
    incorporation_date: c.incorporation_date ?? null,
    dissolution_date: c.dissolution_date ?? null,
    company_type: c.company_type ?? null,
    opencorporates_url: c.opencorporates_url || '',
    registered_address: c.registered_address_in_full ?? null,
    industry_codes: industries,
  }
}

function mapOfficer(raw: OCRawOfficer): OCOfficer {
  const o = raw.officer || ({} as OCRawOfficer['officer'])
  return {
    name: o.name || 'sin nombre',
    position: o.position ?? null,
    company: {
      name: o.company?.name || '',
      jurisdiction_code: o.company?.jurisdiction_code || '',
      company_number: o.company?.company_number || '',
    },
    start_date: o.start_date ?? null,
    end_date: o.end_date ?? null,
    opencorporates_url: o.opencorporates_url || '',
  }
}

/**
 * Búsqueda de empresas por nombre (opcionalmente filtrado por país).
 */
export async function searchCompanies(
  query: string,
  opts: { country_code?: string; limit?: number; page?: number } = {},
): Promise<OCResponse<OCCompany[]>> {
  const fetched_at = new Date().toISOString()
  if (!query || query.length < 2) {
    return { ok: false, data: [], error: 'query_too_short', fetched_at }
  }
  const url = buildUrl('/companies/search', {
    q: query,
    country_code: opts.country_code,
    per_page: opts.limit ?? 30,
    page: opts.page ?? 1,
    format: 'json',
  })
  const json = await fetchOC(url)
  if (!json || json.__error) {
    return {
      ok: false,
      data: [],
      error: json?.__error || 'no_response',
      fetched_at,
      no_key: !OC_API_KEY,
    }
  }
  const results = json?.results?.companies || []
  const companies: OCCompany[] = results.map((r: OCRawCompany) => mapCompany(r))
  return {
    ok: true,
    data: companies,
    fetched_at,
    no_key: !OC_API_KEY,
    total_count: json?.results?.total_count,
  }
}

/**
 * Búsqueda de oficiales/directivos por nombre.
 */
export async function searchOfficers(
  query: string,
  opts: { limit?: number; page?: number } = {},
): Promise<OCResponse<OCOfficer[]>> {
  const fetched_at = new Date().toISOString()
  if (!query || query.length < 2) {
    return { ok: false, data: [], error: 'query_too_short', fetched_at }
  }
  const url = buildUrl('/officers/search', {
    q: query,
    per_page: opts.limit ?? 30,
    page: opts.page ?? 1,
    format: 'json',
  })
  const json = await fetchOC(url)
  if (!json || json.__error) {
    return {
      ok: false,
      data: [],
      error: json?.__error || 'no_response',
      fetched_at,
      no_key: !OC_API_KEY,
    }
  }
  const results = json?.results?.officers || []
  const officers: OCOfficer[] = results.map((r: OCRawOfficer) => mapOfficer(r))
  return {
    ok: true,
    data: officers,
    fetched_at,
    no_key: !OC_API_KEY,
    total_count: json?.results?.total_count,
  }
}

/**
 * Detalle de una empresa por jurisdicción + número de registro.
 */
export async function getCompany(
  jurisdiction: string,
  company_number: string,
): Promise<OCResponse<OCCompany | null>> {
  const fetched_at = new Date().toISOString()
  if (!jurisdiction || !company_number) {
    return { ok: false, data: null, error: 'missing_params', fetched_at }
  }
  const url = buildUrl(`/companies/${jurisdiction}/${company_number}`, { format: 'json' })
  const json = await fetchOC(url)
  if (!json || json.__error) {
    return {
      ok: false,
      data: null,
      error: json?.__error || 'no_response',
      fetched_at,
      no_key: !OC_API_KEY,
    }
  }
  const company = json?.results?.company ? mapCompany({ company: json.results.company }) : null
  return { ok: true, data: company, fetched_at, no_key: !OC_API_KEY }
}

/**
 * Top empresas por país. Útil para enriquecer fichas de país (geopolítica).
 * Usa `/companies/search?country_code=XX` ordenado por relevancia descendente.
 */
export async function topCompaniesByCountry(
  country_code: string,
  limit = 20,
): Promise<OCResponse<OCCompany[]>> {
  const fetched_at = new Date().toISOString()
  if (!country_code) {
    return { ok: false, data: [], error: 'missing_country', fetched_at }
  }
  // OpenCorporates exige al menos un término de búsqueda · usamos "company" como
  // wildcard amplio y filtramos por country_code. Devuelve empresas más relevantes
  // de esa jurisdicción.
  const url = buildUrl('/companies/search', {
    q: 'company',
    country_code: country_code.toLowerCase(),
    per_page: limit,
    format: 'json',
    order: 'score',
  })
  const json = await fetchOC(url)
  if (!json || json.__error) {
    return {
      ok: false,
      data: [],
      error: json?.__error || 'no_response',
      fetched_at,
      no_key: !OC_API_KEY,
    }
  }
  const results = json?.results?.companies || []
  const companies: OCCompany[] = results.map((r: OCRawCompany) => mapCompany(r))
  return {
    ok: true,
    data: companies,
    fetched_at,
    no_key: !OC_API_KEY,
    total_count: json?.results?.total_count,
  }
}

export function hasApiKey(): boolean {
  return Boolean(OC_API_KEY)
}
