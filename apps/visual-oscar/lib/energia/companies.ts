/**
 * Empresas energéticas · enriquecimiento catálogo + Finnhub + OpenCorporates.
 * Sprint Energía S9.
 *
 * El catálogo curado `EMPRESAS_ENERGIA` (lib/energia/catalog.ts) es el ground
 * truth estático (slug, ticker, país, segmentos, en qué energías opera). Este
 * módulo lo ENRIQUECE para las dos vistas del módulo de empresas:
 *
 *   - `listEnergyCompanies()` → grid: cada empresa + su cotización Finnhub.
 *   - `getEnergyCompany(slug)` → ficha drill-down: catálogo + cotización +
 *     estructura societaria OpenCorporates (jurisdicción, nº registro, estado,
 *     directivos, empresas relacionadas del grupo).
 *
 * ── Fuentes de enriquecimiento ─────────────────────────────────────────────
 *   - Finnhub `/quote/{symbol}` (server-side · FINNHUB_API_KEY). Mismo shape
 *     que el proxy /api/finnhub/quote. Caché HTTP 5 min (revalidate).
 *   - OpenCorporates (lib/opencorporates/client.ts · OPENCORPORATES_API_KEY):
 *     `getCompany()` si conocemos el nº de registro, si no `searchCompanies()`
 *     por nombre + país. + `searchOfficers()` para directivos.
 *
 * ── Degradación honesta (CLAUDE.md) ────────────────────────────────────────
 *   NUNCA lanza. Si Finnhub falla / la empresa es privada (sin ticker) →
 *   `quote = null`. Si OpenCorporates falla / no hay key → `structure.available
 *   = false` con `note` explicando el motivo, y la UI muestra empty-state. El
 *   catálogo SIEMPRE se devuelve.
 *
 * IMPORTANTE: las keys (FINNHUB_API_KEY, OPENCORPORATES_API_KEY) son server-side
 * (Vercel env). Estas funciones se llaman desde route handlers
 * (app/api/energia/empresas[/slug]) — NUNCA exponer las keys al cliente.
 *
 * Testeable: tanto Finnhub (fetch directo) como OpenCorporates (su cliente usa
 * `globalThis.fetch`) se pueden mockear vía `globalThis.fetch` en los tests
 * (--experimental-strip-types · ver tests/unit/energia/companies.test.ts).
 */
import { EMPRESAS_ENERGIA } from './catalog.ts'
import { getCompany, searchCompanies, searchOfficers } from '../opencorporates/client.ts'
import type {
  EnergyCompany,
  EnergyCompanyQuote,
  EnergyCompanyListItem,
  EnergyCompanyStructure,
  EnergyCompanyFichaData,
} from './types.ts'

const FINNHUB_BASE = 'https://finnhub.io/api/v1'
const FINNHUB_TIMEOUT_MS = 10_000
const FINNHUB_REVALIDATE_S = 300 // 5 min

// ─────────────────────────────────────────────────────────────────────────
// Lookup por slug
// ─────────────────────────────────────────────────────────────────────────

/** Devuelve la entrada de catálogo por slug (o null). */
export function findCompanyBySlug(slug: string): EnergyCompany | null {
  if (!slug) return null
  const s = slug.toLowerCase().trim()
  return EMPRESAS_ENERGIA.find((c) => c.slug === s) ?? null
}

/** Lista de slugs del catálogo (útil para SSG / sanity). */
export function listCompanySlugs(): string[] {
  return EMPRESAS_ENERGIA.map((c) => c.slug)
}

// ─────────────────────────────────────────────────────────────────────────
// Cotización Finnhub (server-side)
// ─────────────────────────────────────────────────────────────────────────

/** Cotización "no disponible" (privada o sin dato) — patrón degradación. */
function emptyQuote(): EnergyCompanyQuote {
  return {
    price: null,
    change: null,
    change_percent: null,
    high: null,
    low: null,
    open: null,
    previous_close: null,
    available: false,
  }
}

/**
 * Cotización de un ticker vía Finnhub. Devuelve null si la empresa es privada
 * (sin ticker), si falta la key, o si Finnhub degrada (rate-limit / ticker no
 * soportado en free tier). NUNCA lanza.
 */
export async function fetchQuote(ticker: string | null | undefined): Promise<EnergyCompanyQuote | null> {
  if (!ticker) return null // privada / sin ticker
  const key = process.env.FINNHUB_API_KEY
  if (!key) return null // sin key → degrada

  const qs = new URLSearchParams({ symbol: ticker.toUpperCase(), token: key })
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FINNHUB_TIMEOUT_MS)
  try {
    const r = await fetch(`${FINNHUB_BASE}/quote?${qs.toString()}`, {
      signal: ctrl.signal,
      next: { revalidate: FINNHUB_REVALIDATE_S },
    })
    clearTimeout(t)
    if (!r.ok) return emptyQuote()
    const j: any = await r.json()
    // Finnhub: c=current, d=change, dp=change%, h/l/o/pc. c==0 → sin dato real.
    if (!j || j.error || j.c == null || j.c === 0) return emptyQuote()
    return {
      price: numOrNull(j.c),
      change: numOrNull(j.d),
      change_percent: numOrNull(j.dp),
      high: numOrNull(j.h),
      low: numOrNull(j.l),
      open: numOrNull(j.o),
      previous_close: numOrNull(j.pc),
      available: true,
    }
  } catch {
    clearTimeout(t)
    return emptyQuote()
  }
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

// ─────────────────────────────────────────────────────────────────────────
// Estructura societaria OpenCorporates
// ─────────────────────────────────────────────────────────────────────────

/** Estructura "no disponible" con motivo. */
function emptyStructure(note: string): EnergyCompanyStructure {
  return {
    available: false,
    legal_name: null,
    jurisdiction: null,
    company_number: null,
    status: null,
    incorporation_date: null,
    company_type: null,
    registered_address: null,
    opencorporates_url: null,
    officers: [],
    related: [],
    note,
  }
}

/**
 * Estructura societaria vía OpenCorporates. Estrategia:
 *   1. Si la empresa tiene `opencorporates_company_number` + jurisdicción →
 *      `getCompany()` directo.
 *   2. Si no, `searchCompanies(nombre, country)` y se toma el mejor match.
 *   3. `searchOfficers(nombre)` para directivos (best-effort).
 *   4. `searchCompanies()` con más resultados de la misma jurisdicción para
 *      listar empresas relacionadas del grupo (best-effort).
 *
 * Sin jurisdicción configurada (majors sin `opencorporates_jurisdiction`) →
 * degrada con note 'no_jurisdiction' sin tocar la red. NUNCA lanza.
 */
export async function fetchStructure(company: EnergyCompany): Promise<EnergyCompanyStructure> {
  const jurisdiction = company.opencorporates_jurisdiction
  if (!jurisdiction) {
    return emptyStructure('no_jurisdiction')
  }

  // 1/2 · resolver la empresa principal
  let main = null as Awaited<ReturnType<typeof getCompany>>['data'] | null
  let degradeNote: string | null = null

  if (company.opencorporates_company_number) {
    const r = await getCompany(jurisdiction, company.opencorporates_company_number)
    if (r.ok && r.data) main = r.data
    else degradeNote = r.no_key ? 'no_key' : r.error ?? 'no_response'
  }

  // Relacionadas (también sirve de fallback para resolver la principal por nombre).
  let related: EnergyCompanyStructure['related'] = []
  const searchRes = await searchCompanies(company.nombre, {
    country_code: jurisdiction,
    limit: 8,
  })
  if (searchRes.ok && searchRes.data.length > 0) {
    if (!main) {
      // Mejor match por nombre (primer resultado de score) como principal.
      main = searchRes.data[0]
    }
    related = searchRes.data
      .filter((c) => c.company_number !== main?.company_number)
      .slice(0, 6)
      .map((c) => ({
        name: c.name,
        company_number: c.company_number,
        opencorporates_url: c.opencorporates_url,
      }))
  } else if (!main) {
    degradeNote = searchRes.no_key ? 'no_key' : searchRes.error ?? 'no_response'
  }

  if (!main) {
    return emptyStructure(degradeNote ?? 'no_match')
  }

  // 3 · directivos (best-effort, no bloquea si falla)
  let officers: EnergyCompanyStructure['officers'] = []
  try {
    const off = await searchOfficers(company.nombre, { limit: 6 })
    if (off.ok && off.data.length > 0) {
      officers = off.data
        .filter((o) => o.company.jurisdiction_code === jurisdiction)
        .slice(0, 6)
        .map((o) => ({ name: o.name, position: o.position }))
      // Si el filtro por jurisdicción deja vacío, usar los primeros igualmente.
      if (officers.length === 0) {
        officers = off.data.slice(0, 6).map((o) => ({ name: o.name, position: o.position }))
      }
    }
  } catch {
    /* directivos opcionales */
  }

  return {
    available: true,
    legal_name: main.name ?? null,
    jurisdiction: main.jurisdiction_code || jurisdiction,
    company_number: main.company_number || null,
    status: main.current_status ?? null,
    incorporation_date: main.incorporation_date ?? null,
    company_type: main.company_type ?? null,
    registered_address: main.registered_address ?? null,
    opencorporates_url: main.opencorporates_url || null,
    officers,
    related,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// API pública del módulo
// ─────────────────────────────────────────────────────────────────────────

/**
 * Lista de empresas del catálogo enriquecidas con su cotización Finnhub.
 * Para el grid `/sector-energia/empresas`. Las cotizaciones se piden en
 * paralelo; las que fallen degradan a `quote.available = false` (ticker) o
 * `quote = null` (privadas). NUNCA lanza.
 *
 * @param opts.energia  filtra por tipo de energía (ej. 'hidrogeno').
 * @param opts.pais     filtra por país exacto (ej. 'España').
 * @param opts.withQuotes  si false, no llama a Finnhub (solo catálogo). Default true.
 */
export async function listEnergyCompanies(
  opts: { energia?: string; pais?: string; withQuotes?: boolean } = {},
): Promise<EnergyCompanyListItem[]> {
  const withQuotes = opts.withQuotes !== false
  let companies = EMPRESAS_ENERGIA.slice()
  if (opts.energia) {
    companies = companies.filter((c) => c.energias.includes(opts.energia as EnergyCompany['energias'][number]))
  }
  if (opts.pais) {
    companies = companies.filter((c) => c.pais === opts.pais)
  }

  if (!withQuotes) {
    return companies.map((c) => ({ ...c, quote: null }))
  }

  const items = await Promise.all(
    companies.map(async (c): Promise<EnergyCompanyListItem> => {
      const quote = await fetchQuote(c.ticker)
      return { ...c, quote }
    }),
  )
  return items
}

/**
 * Ficha drill-down completa de una empresa por slug: catálogo + cotización
 * Finnhub + estructura societaria OpenCorporates. Devuelve null si el slug no
 * existe en el catálogo. NUNCA lanza por fallos de enriquecimiento (degradan).
 */
export async function getEnergyCompany(slug: string): Promise<EnergyCompanyFichaData | null> {
  const company = findCompanyBySlug(slug)
  if (!company) return null

  const [quote, structure] = await Promise.all([
    fetchQuote(company.ticker),
    fetchStructure(company),
  ])

  return { ...company, quote, structure }
}
