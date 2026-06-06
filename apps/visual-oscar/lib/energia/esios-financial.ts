/**
 * Cliente · Indicadores financieros / de ajuste ESIOS (no usados aún) · Energía v3 · E2-data
 *
 * Expone la familia de indicadores ESIOS de MERCADO DE AJUSTE y mercado que las
 * vistas de energía todavía NO consumen (diseño v3 §"Fuentes": "ESIOS · No
 * usados: servicios de ajuste, restricciones técnicas, índice de desviación,
 * intercambios bilaterales"):
 *   - Servicios de ajuste: banda secundaria (subir/bajar), terciaria (subir/bajar).
 *   - Restricciones técnicas (coste de redespacho por congestión de red).
 *   - Índice / gestión de desvíos (coste de balancear el sistema).
 *   - Intercambios bilaterales: saldos por frontera (FR/PT/MA/AD) — el "saldo
 *     bilateral" de cada interconexión.
 *
 * Los IDs viven en el catálogo `lib/esios/catalog.ts` (ya verificados contra
 * api.esios.ree.es). Cada indicador se descarga de forma INDEPENDIENTE: si uno
 * da 404/no_key, ese indicador queda con `ok:false` y los demás siguen
 * (degradación POR-INDICADOR · el conjunto no se rompe).
 *
 * ── Diseño defensivo (patrón Politeia · lib/esios/client.ts) ────────────────
 *   - Respuesta global: { ok, data|null, error?, fetched_at, source_url }. `ok`
 *     global = true si AL MENOS un indicador respondió. Cada indicador trae su
 *     propio `ok`/`error`.
 *   - Caché en memoria 30 min (datos horarios de ajuste).
 *   - `summariseIndicator()` y `pickFinancialSlugs()` son PURAS y se exportan.
 *
 * Requiere ESIOS_API_KEY (server-side · Vercel). Sin ella todos los indicadores
 * degradan con `no_key` pero el endpoint responde 200. Cero secretos. Cero emojis.
 */
import {
  fetchEsiosIndicator,
  latestValue,
  changePct,
  type EsiosIndicator,
} from '../esios/client.ts'
import { ESIOS_CATALOG, type EsiosSlug, type EsiosCatalogItem } from '../esios/catalog.ts'

const PUBLIC_URL = 'https://www.esios.ree.es/es/analisis'
const CACHE_TTL_MS = 30 * 60_000 // 30 min · indicadores horarios de ajuste

// ─────────────────────────────────────────────────────────────────────────
// Slugs financieros / de ajuste (NO usados por las vistas) — del catálogo ESIOS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Servicios de ajuste + restricciones + desvíos. Todos existen en ESIOS_CATALOG
 * con IDs verificados. Son los "no usados aún" del diseño v3.
 */
export const ESIOS_FINANCIAL_AJUSTE_SLUGS: EsiosSlug[] = [
  'banda_secundaria_subir',
  'banda_secundaria_bajar',
  'terciaria_subir',
  'terciaria_bajar',
  'desvios',
  'restricciones_tecnicas',
]

/** Intercambios bilaterales por frontera (saldos). */
export const ESIOS_FINANCIAL_BILATERAL_SLUGS: EsiosSlug[] = [
  'intercambio_francia',
  'intercambio_portugal',
  'intercambio_marruecos',
  'intercambio_andorra',
]

/** Conjunto completo financiero/ajuste de este cliente. */
export const ESIOS_FINANCIAL_SLUGS: EsiosSlug[] = [
  ...ESIOS_FINANCIAL_AJUSTE_SLUGS,
  ...ESIOS_FINANCIAL_BILATERAL_SLUGS,
]

// ─────────────────────────────────────────────────────────────────────────
// Tipos (definidos AQUÍ · no se edita types.ts)
// ─────────────────────────────────────────────────────────────────────────

/** Un punto de una serie ESIOS simplificado. */
export interface EsiosFinPoint {
  /** ISO timestamp del punto. */
  ts: string
  /** Valor en la unidad del indicador. */
  value: number
}

/** Resumen de un indicador financiero/ajuste ESIOS (último valor + serie). */
export interface EsiosFinancialIndicator {
  /** Slug estable del catálogo (ej. "restricciones_tecnicas"). */
  slug: string
  /** ID numérico ESIOS. */
  id: number
  /** Etiqueta humana (del catálogo). */
  label: string
  /** Etiqueta corta. */
  short: string
  /** Unidad (€/MWh, €/MW, MW). */
  unit: string
  /** Categoría del catálogo ('mercado' | 'intercambios'). */
  category: string
  /** Qué cuenta el indicador (del catálogo). */
  use_case: string
  /** ¿Pudo descargarse? (degradación por-indicador). */
  ok: boolean
  /** Motivo si `ok:false` (ej. "http_404", "no_key"). */
  error?: string
  /** Último valor disponible (null si sin datos / degradado). */
  last_value: number | null
  /** Timestamp ISO del último valor, null si sin datos. */
  last_ts: string | null
  /** Variación % vs 24 posiciones atrás (24h si horario), null si insuficiente. */
  change_24h_pct: number | null
  /** Serie reciente (timestamp + valor) ascendente. */
  series: EsiosFinPoint[]
  /** URL pública del análisis ESIOS de este indicador. */
  source_url: string
}

/** Conjunto de indicadores financieros/ajuste ESIOS. */
export interface EsiosFinancialData {
  /** Indicadores de servicios de ajuste / restricciones / desvíos. */
  ajuste: EsiosFinancialIndicator[]
  /** Indicadores de intercambios bilaterales por frontera. */
  bilateral: EsiosFinancialIndicator[]
  /** Cuántos indicadores respondieron OK. */
  ok_count: number
  /** Total de indicadores solicitados. */
  total_count: number
}

/** Envoltura de degradación global (patrón Politeia). */
export interface EsiosFinancialResponse {
  ok: boolean
  error?: string
  data?: EsiosFinancialData
  fetched_at: string
  source_url?: string
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria · TTL 30 min
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry { expires: number; value: EsiosFinancialResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearEsiosFinancialCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS (testeables)
// ─────────────────────────────────────────────────────────────────────────

/** Devuelve los items de catálogo para una lista de slugs (filtra inexistentes). */
export function pickFinancialSlugs(slugs: EsiosSlug[]): EsiosCatalogItem[] {
  return slugs.map((s) => ESIOS_CATALOG[s]).filter((x): x is EsiosCatalogItem => Boolean(x))
}

/**
 * Resume un indicador ESIOS descargado (o un fallo) a `EsiosFinancialIndicator`.
 * Pura: testeable con un `EsiosIndicator` fixture o con `ind=null` + error.
 *
 * @param item   metadata del catálogo (slug, label, unit, …)
 * @param ind    indicador ESIOS con values[], o null si falló
 * @param error  motivo del fallo si `ind` es null
 */
export function summariseIndicator(
  item: EsiosCatalogItem,
  ind: EsiosIndicator | null,
  error?: string,
): EsiosFinancialIndicator {
  const base = {
    slug: item.slug,
    id: item.id,
    label: item.label,
    short: item.short,
    unit: item.unit,
    category: item.category,
    use_case: item.use_case,
    source_url: `${PUBLIC_URL}/${item.id}`,
  }

  if (!ind) {
    return {
      ...base,
      ok: false,
      error: error ?? 'sin_datos',
      last_value: null,
      last_ts: null,
      change_24h_pct: null,
      series: [],
    }
  }

  const last = latestValue(ind)
  const vals = Array.isArray(ind.values) ? ind.values : []
  // Serie compacta: limitamos a los últimos 96 puntos (4 días horarios) para no
  // inflar la respuesta.
  const series: EsiosFinPoint[] = vals
    .slice(-96)
    .map((v) => ({ ts: v.datetime_utc || v.datetime, value: v.value }))
    .filter((p) => typeof p.value === 'number' && Number.isFinite(p.value))

  return {
    ...base,
    ok: true,
    last_value: last?.value ?? null,
    last_ts: last ? last.datetime_utc || last.datetime : null,
    change_24h_pct: changePct(ind, 24),
    series,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch (multi-indicador, degradación por-indicador)
// ─────────────────────────────────────────────────────────────────────────

export interface FetchEsiosFinancialOpts {
  /** Forzar refetch ignorando la caché. */
  noCache?: boolean
  /** Ventana en horas hacia atrás (default 48). */
  hoursBack?: number
  /** Timeout por indicador en ms. */
  timeoutMs?: number
}

/** Descarga un slug del catálogo y lo resume; nunca lanza. */
async function fetchOne(
  item: EsiosCatalogItem,
  startDate: string,
  endDate: string,
  timeoutMs?: number,
): Promise<EsiosFinancialIndicator> {
  try {
    const res = await fetchEsiosIndicator(item.id, {
      startDate,
      endDate,
      geoIds: [item.geo_default],
      timeoutMs,
    })
    if (!res.ok || !res.indicator) {
      return summariseIndicator(item, null, res.error ?? 'sin_indicador')
    }
    return summariseIndicator(item, res.indicator)
  } catch (e: any) {
    return summariseIndicator(item, null, String(e?.message ?? e).slice(0, 120))
  }
}

/**
 * Descarga la familia financiera/ajuste de ESIOS. Cada indicador degrada por
 * separado (un 404 no rompe el resto). `ok` global = true si al menos uno
 * respondió. Caché 30 min.
 */
export async function fetchEsiosFinancial(
  opts: FetchEsiosFinancialOpts = {},
): Promise<EsiosFinancialResponse> {
  const fetched_at = new Date().toISOString()
  const hours = Number.isFinite(opts.hoursBack as number)
    ? Math.max(6, Math.min(168, opts.hoursBack as number))
    : 48

  const cacheKey = `fin:${hours}`
  if (!opts.noCache) {
    const hit = _cache.get(cacheKey)
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  const now = new Date()
  const startDate = new Date(now.getTime() - hours * 3600_000).toISOString().slice(0, 16)
  const endDate = now.toISOString().slice(0, 16)

  const ajusteItems = pickFinancialSlugs(ESIOS_FINANCIAL_AJUSTE_SLUGS)
  const bilateralItems = pickFinancialSlugs(ESIOS_FINANCIAL_BILATERAL_SLUGS)
  const allItems = [...ajusteItems, ...bilateralItems]

  const results = await Promise.all(
    allItems.map((it) => fetchOne(it, startDate, endDate, opts.timeoutMs)),
  )

  // Re-partir en ajuste/bilateral preservando el orden.
  const ajuste = results.slice(0, ajusteItems.length)
  const bilateral = results.slice(ajusteItems.length)

  const ok_count = results.filter((r) => r.ok).length
  const data: EsiosFinancialData = {
    ajuste,
    bilateral,
    ok_count,
    total_count: results.length,
  }

  const result: EsiosFinancialResponse = {
    ok: ok_count > 0,
    error: ok_count === 0 ? (results[0]?.error ?? 'todos_los_indicadores_fallaron') : undefined,
    data,
    fetched_at,
    source_url: PUBLIC_URL,
  }

  // Solo cacheamos si hubo al menos un OK (no cachear el caso no_key global).
  if (ok_count > 0) {
    _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: result })
  }
  return result
}
