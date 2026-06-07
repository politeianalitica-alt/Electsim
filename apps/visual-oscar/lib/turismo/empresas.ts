/**
 * Empresas turísticas cotizadas · Turismo v3 · Sprint T2-cross
 *
 * Cotización en vivo de hoteleras, aerolíneas, GDS (sistemas de distribución),
 * aeropuertos, OTAs y turoperadores con exposición a España, vía Finnhub. Cruza
 * Turismo con MERCADOS.
 *
 * ── SHAPE EXACTO (contrato del endpoint, fijado por el sprint) ─────────────
 *   { empresas: [ { slug, nombre, ticker, segmento,
 *                   quote: { price: number|null,
 *                            change_percent: number|null,
 *                            available: boolean } } ] }
 *   segmento ∈ 'hotelera' | 'aerolinea' | 'gds' | 'aeropuertos' | 'ota' | 'turoperador'
 *
 * Cotización vía Finnhub (`/quote?symbol=...&token=...`), el MISMO mecanismo que
 * el proxy `app/api/finnhub/[...path]`. Tickers en formato que acepta Finnhub:
 * el free tier soporta Madrid (.MC) y algunos ADRs/OTC. Degradación HONESTA por
 * empresa: sin FINNHUB_API_KEY, rate-limit, o ticker no soportado →
 * `quote.available=false` con price/change_percent null. NUNCA lanza.
 *
 * FINNHUB_API_KEY es server-side; este lib se llama desde el route handler
 * `app/api/turismo/empresas`.
 *
 * Docs: https://finnhub.io/docs/api/quote
 */

// ─────────────────────────────────────────────────────────────────────────
// Tipos (propios de este lib) · alineados con el shape exacto del endpoint
// ─────────────────────────────────────────────────────────────────────────

export type TurismoSegmento =
  | 'hotelera'
  | 'aerolinea'
  | 'gds'
  | 'aeropuertos'
  | 'ota'
  | 'turoperador'

export interface TurismoCompanyQuote {
  price: number | null
  change_percent: number | null
  available: boolean
}

export interface TurismoCompany {
  slug: string
  nombre: string
  /** Ticker en formato Finnhub (o null si la empresa no cotiza/privada). */
  ticker: string | null
  segmento: TurismoSegmento
}

export interface TurismoCompanyWithQuote extends TurismoCompany {
  quote: TurismoCompanyQuote
}

export interface EmpresasResponse {
  /** Shape EXACTO requerido por el sprint. */
  empresas: TurismoCompanyWithQuote[]
  /** Metadatos no contractuales (el FE puede ignorarlos). */
  ok: boolean
  fetched_at: string
  source_url: string
}

const FINNHUB_BASE = 'https://finnhub.io/api/v1'
const PUBLIC_URL = 'https://finnhub.io'
const DEFAULT_TIMEOUT_MS = 12_000
const CACHE_TTL_MS = 5 * 60_000 // 5min · cotización (igual que el proxy)

// ─────────────────────────────────────────────────────────────────────────
// Catálogo curado de empresas turísticas (tickers en formato Finnhub).
// Madrid Exchange (.MC) es soportado por el free tier de Finnhub. Empresas sin
// ticker líquido en Finnhub se marcan con ticker=null → available:false.
// ─────────────────────────────────────────────────────────────────────────

export const EMPRESAS_TURISMO: TurismoCompany[] = [
  // Hoteleras
  { slug: 'melia', nombre: 'Meliá Hotels International', ticker: 'MEL.MC', segmento: 'hotelera' },
  { slug: 'nh-minor', nombre: 'NH Hotel Group (Minor)', ticker: null, segmento: 'hotelera' },
  { slug: 'accor', nombre: 'Accor', ticker: 'AC.PA', segmento: 'hotelera' },
  { slug: 'marriott', nombre: 'Marriott International', ticker: 'MAR', segmento: 'hotelera' },
  { slug: 'hilton', nombre: 'Hilton Worldwide', ticker: 'HLT', segmento: 'hotelera' },
  { slug: 'ihg', nombre: 'InterContinental Hotels Group', ticker: 'IHG', segmento: 'hotelera' },
  // Aerolíneas
  { slug: 'iag', nombre: 'IAG (Iberia · British Airways · Vueling)', ticker: 'IAG.MC', segmento: 'aerolinea' },
  { slug: 'ryanair', nombre: 'Ryanair Holdings', ticker: 'RYAAY', segmento: 'aerolinea' },
  { slug: 'lufthansa', nombre: 'Lufthansa Group', ticker: 'LHA.DE', segmento: 'aerolinea' },
  { slug: 'easyjet', nombre: 'easyJet', ticker: 'EZJ.L', segmento: 'aerolinea' },
  // GDS / distribución
  { slug: 'amadeus', nombre: 'Amadeus IT Group', ticker: 'AMS.MC', segmento: 'gds' },
  { slug: 'sabre', nombre: 'Sabre Corporation', ticker: 'SABR', segmento: 'gds' },
  // Aeropuertos
  { slug: 'aena', nombre: 'Aena', ticker: 'AENA.MC', segmento: 'aeropuertos' },
  { slug: 'fraport', nombre: 'Fraport', ticker: 'FRA.DE', segmento: 'aeropuertos' },
  // OTA
  { slug: 'edreams', nombre: 'eDreams ODIGEO', ticker: 'EDR.MC', segmento: 'ota' },
  { slug: 'booking', nombre: 'Booking Holdings', ticker: 'BKNG', segmento: 'ota' },
  { slug: 'expedia', nombre: 'Expedia Group', ticker: 'EXPE', segmento: 'ota' },
  // Turoperador
  { slug: 'tui', nombre: 'TUI Group', ticker: 'TUI1.DE', segmento: 'turoperador' },
]

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS (sin red) · testeables
// ─────────────────────────────────────────────────────────────────────────

/** Cotización "no disponible". Patrón degradación (igual que CompanyQuotePanel). */
export function unavailableQuote(): TurismoCompanyQuote {
  return { price: null, change_percent: null, available: false }
}

/**
 * Mapea la respuesta cruda de Finnhub `/quote` ({ c, dp, ... }) al shape
 * `TurismoCompanyQuote`. `c` (current price) === 0 o ausente → no disponible.
 * Pura: testeable con fixtures.
 */
export function mapFinnhubQuote(raw: unknown): TurismoCompanyQuote {
  const j = (raw ?? {}) as { c?: unknown; dp?: unknown; error?: unknown }
  if (j.error) return unavailableQuote()
  const price = typeof j.c === 'number' && Number.isFinite(j.c) && j.c !== 0 ? j.c : null
  if (price == null) return unavailableQuote()
  const cp = typeof j.dp === 'number' && Number.isFinite(j.dp) ? j.dp : null
  return { price, change_percent: cp, available: true }
}

/** Filtra el catálogo por segmento(s). Si `segmentos` vacío → todo. Pura. */
export function filterCompanies(
  companies: TurismoCompany[],
  segmentos?: TurismoSegmento[],
): TurismoCompany[] {
  if (!segmentos || segmentos.length === 0) return companies.slice()
  const set = new Set(segmentos)
  return companies.filter((c) => set.has(c.segmento))
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria · TTL 5min (cotización)
// ─────────────────────────────────────────────────────────────────────────

interface CacheEntry { expires: number; value: EmpresasResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearEmpresasCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch Finnhub quote · degradación por empresa
// ─────────────────────────────────────────────────────────────────────────

/** Pide una quote a Finnhub. Devuelve la quote mapeada (o no disponible). */
async function fetchOneQuote(ticker: string, apiKey: string, timeoutMs: number): Promise<TurismoCompanyQuote> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const qs = new URLSearchParams({ symbol: ticker, token: apiKey })
    const r = await fetch(`${FINNHUB_BASE}/quote?${qs}`, {
      signal: ctrl.signal,
      next: { revalidate: 300 },
    } as RequestInit)
    clearTimeout(t)
    if (!r.ok) return unavailableQuote()
    const raw = await r.json()
    return mapFinnhubQuote(raw)
  } catch {
    return unavailableQuote()
  }
}

// ─────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────

export interface FetchEmpresasOpts {
  /** Filtra por segmento(s). */
  segmentos?: TurismoSegmento[]
  noCache?: boolean
  timeoutMs?: number
}

/**
 * Devuelve las empresas turísticas con su cotización en vivo (Finnhub). NUNCA
 * lanza: sin FINNHUB_API_KEY o ante fallo por empresa, esa empresa sale con
 * `quote.available=false`. El shape de `empresas` es el contrato exacto.
 */
export async function fetchEmpresas(opts: FetchEmpresasOpts = {}): Promise<EmpresasResponse> {
  const fetched_at = new Date().toISOString()
  const companies = filterCompanies(EMPRESAS_TURISMO, opts.segmentos)

  const cacheKey = `empresas:${(opts.segmentos ?? []).slice().sort().join(',')}`
  if (!opts.noCache) {
    const hit = _cache.get(cacheKey)
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  const apiKey = process.env.FINNHUB_API_KEY || ''
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

  let empresas: TurismoCompanyWithQuote[]
  if (!apiKey) {
    // Sin key: shape válido con todas no disponibles (degradación honesta).
    empresas = companies.map((c) => ({ ...c, quote: unavailableQuote() }))
  } else {
    empresas = await Promise.all(
      companies.map(async (c): Promise<TurismoCompanyWithQuote> => {
        if (!c.ticker) return { ...c, quote: unavailableQuote() }
        const quote = await fetchOneQuote(c.ticker, apiKey, timeoutMs)
        return { ...c, quote }
      }),
    )
  }

  const result: EmpresasResponse = {
    empresas,
    ok: true,
    fetched_at,
    source_url: PUBLIC_URL,
  }
  // Solo cacheamos si hay key (sin key el resultado es trivial y puede cambiar
  // en cuanto se configure la env var).
  if (apiKey) _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: result })
  return result
}
