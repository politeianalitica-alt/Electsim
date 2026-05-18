/**
 * Empresas cotizadas de defensa europeas + globales.
 * Loader del JSON + enriquecimiento dinámico con cotización Yahoo Finance.
 */
import data from '@/data/defense/empresas-cotizadas.json'

export interface Persona {
  nombre: string
  desde?: string
  trayectoria?: string
  perfil?: string
  url_wikipedia?: string
}

export interface AreaClave {
  area: string
  responsable: string
  descripcion: string
}

export interface JointVenture {
  nombre: string
  participacion: string
  socios: string[]
  actividad: string
}

export interface EmpresaCotizada {
  ticker: string
  exchange: string
  moneda: string
  nombre: string
  nombre_corto: string
  pais: string
  pais_nombre: string
  sede: string
  fundacion: number
  empleados: number
  revenue_total_USD_b: number
  revenue_defensa_USD_b: number
  pct_defensa: number
  ranking_sipri: number
  segmentos: string[]
  capacidades_clave: string[]
  programas_activos: string[]
  estructura: {
    ceo: Persona
    areas_clave?: AreaClave[]
  }
  grupos_trabajo: string[]
  exportaciones_principales: string[]
  joint_ventures: JointVenture[]
  filiales_principales: string[]
  exposicion_sanciones: string
  compliance_certificaciones: string[]
  cultura_defensa: string
  limitaciones: string[]
  novedades_2026: string[]
  logo_url: string
  web: string
}

interface JsonData { empresas: EmpresaCotizada[]; _meta?: Record<string, unknown> }
export const EMPRESAS_COTIZADAS: EmpresaCotizada[] = (data as unknown as JsonData).empresas

export function getEmpresaByTicker(ticker: string): EmpresaCotizada | null {
  return EMPRESAS_COTIZADAS.find(e => e.ticker.toUpperCase() === ticker.toUpperCase()) ?? null
}

export function getEmpresasPorPais(pais: string): EmpresaCotizada[] {
  return EMPRESAS_COTIZADAS.filter(e => e.pais === pais.toUpperCase())
}

// ─── Yahoo Finance enrichment ─────────────────────────────────────────

interface CacheEntry<T> { ts: number; data: T }
const cacheQuote: Map<string, CacheEntry<Quote>> = new Map()
const TTL = 15 * 60 * 1000

export interface Quote {
  ticker: string
  precio: number | null
  variacion_pct: number | null
  variacion_abs: number | null
  moneda: string
  ultima_actualizacion: string
  mercadoAbierto: boolean | null
}

/**
 * Yahoo Finance quote · endpoint público no oficial pero estable.
 */
export async function fetchQuote(ticker: string): Promise<Quote | null> {
  if (!ticker || ticker.includes('-NR')) return null
  const cached = cacheQuote.get(ticker)
  if (cached && Date.now() - cached.ts < TTL) return cached.data
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 5000)
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 900 } })
    if (!res.ok) return null
    const json = await res.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; previousClose?: number; chartPreviousClose?: number; marketState?: string; currency?: string; symbol?: string } }> } }
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta || !meta.regularMarketPrice) return null
    const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice
    const variacion_abs = meta.regularMarketPrice - previousClose
    const variacion_pct = previousClose > 0 ? (variacion_abs / previousClose) * 100 : 0
    const q: Quote = {
      ticker,
      precio: meta.regularMarketPrice,
      variacion_pct: +variacion_pct.toFixed(2),
      variacion_abs: +variacion_abs.toFixed(2),
      moneda: meta.currency ?? 'USD',
      ultima_actualizacion: new Date().toISOString(),
      mercadoAbierto: meta.marketState === 'REGULAR',
    }
    cacheQuote.set(ticker, { ts: Date.now(), data: q })
    return q
  } catch { return null } finally { clearTimeout(t) }
}

export async function fetchAllQuotes(tickers: string[]): Promise<Record<string, Quote>> {
  const results = await Promise.allSettled(tickers.map(t => fetchQuote(t)))
  const out: Record<string, Quote> = {}
  results.forEach((r, i) => { if (r.status === 'fulfilled' && r.value) out[tickers[i]] = r.value })
  return out
}
