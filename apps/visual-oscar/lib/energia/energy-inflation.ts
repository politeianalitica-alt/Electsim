/**
 * Inflación energética · Sprint Energía v3 · E2-cross
 *
 * Cruza el módulo MACRO con Energía: la inflación energética (HICP componente
 * energía vs general), la producción industrial (IPI) y el tipo de cambio
 * EUR/USD, que es el canal por el que el Brent (cotizado en USD) se transmite
 * al precio doméstico en euros.
 *
 * ── FUENTES (reutiliza fetchers/datasets de la plataforma, server-side) ─────
 *   - IPC energía + general · Eurostat HICP `prc_hicp_manr` (público, sin key),
 *     COICOP=NRG (energía: electricidad+gas+combustibles) y COICOP=CP00
 *     (general), unit=RCH_A (variación interanual mensual). Mismos códigos que
 *     el catálogo macro (`lib/macro/regimen-monetario-catalog.ts`). Lo fetchamos
 *     DIRECTAMENTE contra Eurostat y parseamos con `parseJsonStat` de
 *     `lib/macro-utils.ts` (el mismo parser que usa `/api/eurostat/dataset`).
 *   - IPI · Eurostat `sts_inpr_m` (NACE B-D = minería+manufactura+ENERGÍA,
 *     PRD, base 2021=100, desestacionalizado). Mismo dataset que el indicador
 *     `pulso-ipi-manufactura` del catálogo Pulso.
 *   - EUR/USD · prioridad ECB SDW (`ecbFx('USD')` de `lib/ports-handlers.ts`,
 *     SIN key, ya integrado en /macro y /puertos). Si existe `ALPHA_VANTAGE_KEY`
 *     intentamos `FX_DAILY` (serie diaria más fresca) y caemos a ECB si falla.
 *
 *   NOTA sobre acoplamiento: el fetcher genérico `fetchPulsoIndicator`
 *   (`lib/macro/pulso-fetcher.ts`) llama a una URL interna ABSOLUTA (depende de
 *   VERCEL_URL/baseUrl). Para no acoplarnos a eso server-side, fetchamos las
 *   series directamente de las fuentes públicas (Eurostat/ECB) y reutilizamos
 *   solo el parser puro `parseJsonStat`. El `source` de cada serie lo refleja.
 *
 * Funciones PURAS exportadas (testables sin red):
 *   - `lastPoint(series)`           · último punto con valor (por periodo máx).
 *   - `passthroughNote(eurusd)`     · nota EUR/USD→Brent según nivel/variación.
 *   - `buildEnergyInflation(parts)` · ensambla el shape final desde series.
 *
 * Degradación POR-SERIE (CLAUDE.md): si una serie falla, su bloque queda
 * `{ ok:false }` y el resto se sirve igual. La route responde 200 siempre.
 *
 * NOTA · `parseJsonStat` (macro-utils) se importa estático con extensión `.ts`
 * (su cadena no tiene imports de valor sin extensión). En cambio `ecbFx` vive
 * en `ports-handlers`, cuyo `import './ports-seed'` SIN extensión rompería el
 * harness de tests Node (`--experimental-strip-types`); por eso `ecbFx` se
 * importa de forma DINÁMICA dentro de `fetchEurUsd()`. El test solo ejerce las
 * funciones puras, así que nunca carga ports-handlers.
 */
import { parseJsonStat } from '../macro-utils.ts'

// ─────────────────────────────────────────────────────────────────────────
// Tipos propios (NO se editan types.ts ni catalog.ts)
// ─────────────────────────────────────────────────────────────────────────

/** Punto de serie temporal normalizado. */
export interface InflationPoint {
  period: string
  value: number | null
}

/** Una serie macro con su último valor + procedencia. */
export interface InflationSeries {
  ok: boolean
  label: string
  unit: string
  series: InflationPoint[]
  last: InflationPoint | null
  source: string
  source_url: string
  error?: string
}

export interface EnergyInflation {
  ipc_energia: InflationSeries
  ipc_general: InflationSeries
  ipi: InflationSeries
  eur_usd: InflationSeries
  /** Diferencial energía − general (pp) del último dato común, si calculable. */
  spread_energia_general_pp: number | null
  nota: string
}

export interface EnergyInflationResponse {
  ok: boolean
  data: EnergyInflation | null
  error?: string
  fetched_at: string
  source: string
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Último punto con valor de una serie, eligiendo el periodo máximo por
 * comparación textual (robusto a orden ascendente/descendente y a formatos
 * "YYYY", "YYYY-MM"). Pura.
 */
export function lastPoint(series: ReadonlyArray<InflationPoint>): InflationPoint | null {
  const obs = series.filter((p) => p && p.value != null && Number.isFinite(p.value as number))
  if (obs.length === 0) return null
  return obs.reduce((max, p) => (p.period > max.period ? p : max), obs[0])
}

/**
 * Nota sobre el passthrough EUR/USD → Brent. El crudo cotiza en USD: un euro
 * MÁS débil (EUR/USD bajo) encarece el Brent y los productos refinados en
 * euros aunque el precio en dólares no cambie; un euro fuerte amortigua la
 * factura energética doméstica. Pura.
 */
export function passthroughNote(eurusd: number | null | undefined): string {
  const base =
    'El Brent y los productos petrolíferos cotizan en USD: el tipo EUR/USD modula ' +
    'cuánto de una subida del crudo llega al precio doméstico en euros. Un euro débil ' +
    '(EUR/USD bajo) amplifica el coste energético importado; un euro fuerte lo amortigua.'
  if (eurusd == null || !Number.isFinite(eurusd)) return base
  if (eurusd < 1.0) {
    return base + ` Con EUR/USD ≈ ${eurusd.toFixed(3)} (euro débil, <1,00) el passthrough del crudo a la factura en euros es elevado.`
  }
  if (eurusd >= 1.12) {
    return base + ` Con EUR/USD ≈ ${eurusd.toFixed(3)} (euro fuerte) el euro amortigua parte de las subidas del Brent en USD.`
  }
  return base + ` Con EUR/USD ≈ ${eurusd.toFixed(3)} el efecto amortiguador/amplificador es moderado.`
}

const round1 = (n: number): number => Math.round(n * 10) / 10

// ─────────────────────────────────────────────────────────────────────────
// Ensamblado PURO (testeable con fixtures de series)
// ─────────────────────────────────────────────────────────────────────────

export interface EnergyInflationParts {
  ipc_energia: InflationSeries
  ipc_general: InflationSeries
  ipi: InflationSeries
  eur_usd: InflationSeries
}

/**
 * Ensambla el shape final desde las 4 series ya resueltas (cada una ok o
 * degradada). Calcula el spread energía−general y la nota global. Pura.
 */
export function buildEnergyInflation(parts: EnergyInflationParts): EnergyInflation {
  const ie = parts.ipc_energia.last?.value
  const ig = parts.ipc_general.last?.value
  const spread =
    ie != null && ig != null && Number.isFinite(ie) && Number.isFinite(ig)
      ? round1(ie - ig)
      : null

  return {
    ipc_energia: parts.ipc_energia,
    ipc_general: parts.ipc_general,
    ipi: parts.ipi,
    eur_usd: parts.eur_usd,
    spread_energia_general_pp: spread,
    nota: passthroughNote(parts.eur_usd.last?.value ?? null),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetchers por serie (con red · degradación por-serie)
// ─────────────────────────────────────────────────────────────────────────

const EUROSTAT_BASE =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'
const EUROSTAT_DOC = 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr'
const ECB_URL = 'https://data.ecb.europa.eu/'
const ALPHA_URL = 'https://www.alphavantage.co/documentation/#fx'
const DEFAULT_TIMEOUT_MS = 12_000

/** Fetch de un dataset Eurostat → InflationPoint[] (ascendente). Devuelve [] si falla. */
async function fetchEurostat(
  code: string,
  filters: Record<string, string>,
  timeoutMs: number,
): Promise<{ points: InflationPoint[]; error?: string }> {
  const qs = new URLSearchParams(filters)
  const url = `${EUROSTAT_BASE}/${code}?${qs.toString()}`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 21600 },
    } as RequestInit)
    if (!r.ok) return { points: [], error: `http_${r.status}` }
    const json: any = await r.json()
    const pts = parseJsonStat(json)
      .filter((p) => p.value != null)
      .map((p) => ({ period: String(p.time ?? ''), value: p.value as number }))
      .filter((p) => p.period)
      .sort((a, b) => a.period.localeCompare(b.period))
    if (pts.length === 0) return { points: [], error: 'sin_datos' }
    return { points: pts }
  } catch (e: any) {
    return { points: [], error: e?.name === 'AbortError' ? 'timeout' : String(e?.message ?? e).slice(0, 120) }
  } finally {
    clearTimeout(t)
  }
}

/** HICP variación interanual (RCH_A) de un COICOP para ES. */
async function fetchHicp(
  coicop: string,
  label: string,
  timeoutMs: number,
): Promise<InflationSeries> {
  const { points, error } = await fetchEurostat(
    'prc_hicp_manr',
    { geo: 'ES', coicop, unit: 'RCH_A' },
    timeoutMs,
  )
  return {
    ok: points.length > 0,
    label,
    unit: '% YoY',
    series: points,
    last: lastPoint(points),
    source: `Eurostat · prc_hicp_manr · coicop=${coicop} · unit=RCH_A`,
    source_url: EUROSTAT_DOC,
    error,
  }
}

/** IPI · Eurostat sts_inpr_m NACE B-D (incluye energía), índice 2021=100. */
async function fetchIpi(timeoutMs: number): Promise<InflationSeries> {
  const { points, error } = await fetchEurostat(
    'sts_inpr_m',
    { geo: 'ES', nace_r2: 'B-D', indic_bt: 'PRD', unit: 'I21', s_adj: 'SCA' },
    timeoutMs,
  )
  return {
    ok: points.length > 0,
    label: 'Producción industrial (IPI · NACE B-D, incl. energía)',
    unit: 'índice 2021=100',
    series: points,
    last: lastPoint(points),
    source: 'Eurostat · sts_inpr_m · nace=B-D · PRD · I21 · SCA',
    source_url: 'https://ec.europa.eu/eurostat/databrowser/view/sts_inpr_m',
    error,
  }
}

interface AlphaFxResponse {
  'Time Series FX (Daily)'?: Record<string, { '4. close'?: string }>
  Information?: string
  Note?: string
}

/** EUR/USD diario vía Alpha Vantage FX_DAILY (solo si hay key). [] si falla. */
async function fetchAlphaEurUsd(
  days: number,
  timeoutMs: number,
): Promise<InflationPoint[]> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY
  if (!apiKey) return []
  const url =
    `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=EUR&to_symbol=USD&outputsize=compact&apikey=${apiKey}`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { signal: ctrl.signal, next: { revalidate: 3600 } } as RequestInit)
    if (!r.ok) return []
    const j = (await r.json()) as AlphaFxResponse
    const ts = j['Time Series FX (Daily)']
    if (j.Information || j.Note || !ts) return [] // rate-limit / sin datos
    const cutoffMs = Date.now() - (days + 5) * 86_400_000
    const pts: InflationPoint[] = []
    for (const [date, row] of Object.entries(ts)) {
      const v = Number(row?.['4. close'])
      if (!date || !Number.isFinite(v)) continue
      const ms = Date.parse(date)
      if (Number.isFinite(ms) && ms < cutoffMs) continue
      pts.push({ period: date, value: v })
    }
    return pts.sort((a, b) => a.period.localeCompare(b.period))
  } catch {
    return []
  } finally {
    clearTimeout(t)
  }
}

/**
 * EUR/USD: Alpha Vantage si hay key (serie diaria fresca); si no o si falla,
 * ECB SDW (`ecbFx('USD')`, sin key, devuelve EUR-base mensual).
 */
async function fetchEurUsd(days: number, timeoutMs: number): Promise<InflationSeries> {
  // 1) Alpha Vantage (opt-in vía key).
  const alpha = await fetchAlphaEurUsd(days, timeoutMs)
  if (alpha.length >= 2) {
    return {
      ok: true,
      label: 'EUR/USD',
      unit: 'USD por EUR',
      series: alpha,
      last: lastPoint(alpha),
      source: 'Alpha Vantage · FX_DAILY EUR→USD (requiere ALPHA_VANTAGE_KEY)',
      source_url: ALPHA_URL,
    }
  }
  // 2) ECB SDW (sin key). ecbFx devuelve { ok, currency, series:[{ts,value}] }.
  // Import dinámico (ver nota en la cabecera): ports-handlers tiene imports de
  // valor sin extensión que romperían el harness de tests si fuese estático.
  try {
    const { ecbFx } = await import('../ports-handlers.ts')
    const params = new URLSearchParams({ last_n: '24' })
    const ecb: any = await ecbFx('USD', params)
    const pts: InflationPoint[] = Array.isArray(ecb?.series)
      ? ecb.series
          .map((p: any) => ({ period: String(p.ts ?? ''), value: typeof p.value === 'number' ? p.value : null }))
          .filter((p: InflationPoint) => p.period && p.value != null)
          .sort((a: InflationPoint, b: InflationPoint) => a.period.localeCompare(b.period))
      : []
    return {
      ok: pts.length > 0,
      label: 'EUR/USD',
      unit: 'USD por EUR',
      series: pts,
      last: lastPoint(pts),
      source: 'ECB SDW · EXR M.USD.EUR.SP00.A (sin key · fallback)',
      source_url: ECB_URL,
      error: pts.length === 0 ? (ecb?.error ?? 'sin_datos') : undefined,
    }
  } catch (e: any) {
    return {
      ok: false,
      label: 'EUR/USD',
      unit: 'USD por EUR',
      series: [],
      last: null,
      source: 'ECB SDW (fallback)',
      source_url: ECB_URL,
      error: String(e?.message ?? e).slice(0, 120),
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// API pública (degradación por-serie · nunca lanza)
// ─────────────────────────────────────────────────────────────────────────

export interface FetchEnergyInflationOpts {
  /** Ventana de la serie EUR/USD en días (default 90). */
  days?: number
  /** Timeout por fetch en ms (default 12s). */
  timeoutMs?: number
}

/**
 * Descarga IPC energía/general (Eurostat HICP), IPI (Eurostat) y EUR/USD
 * (ECB/Alpha) en paralelo, degradando por-serie. Nunca lanza.
 */
export async function fetchEnergyInflation(
  opts: FetchEnergyInflationOpts = {},
): Promise<EnergyInflationResponse> {
  const fetched_at = new Date().toISOString()
  const days = Number.isFinite(opts.days as number)
    ? Math.max(30, Math.min(365, opts.days as number))
    : 90
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  try {
    const [ipc_energia, ipc_general, ipi, eur_usd] = await Promise.all([
      fetchHicp('NRG', 'IPC energía (HICP · electricidad+gas+combustibles)', timeoutMs),
      fetchHicp('CP00', 'IPC general (HICP armonizado)', timeoutMs),
      fetchIpi(timeoutMs),
      fetchEurUsd(days, timeoutMs),
    ])
    const data = buildEnergyInflation({ ipc_energia, ipc_general, ipi, eur_usd })
    // ok global = al menos una serie con datos (degradación honesta).
    const anyOk = ipc_energia.ok || ipc_general.ok || ipi.ok || eur_usd.ok
    return {
      ok: anyOk,
      data,
      fetched_at,
      source:
        'macro · Eurostat HICP prc_hicp_manr (NRG/CP00) + Eurostat IPI sts_inpr_m + EUR/USD (Alpha FX_DAILY si hay key, si no ECB SDW)',
    }
  } catch (e: any) {
    return {
      ok: false,
      data: null,
      error: String(e?.message ?? e).slice(0, 160),
      fetched_at,
      source: 'macro · Eurostat + ECB/Alpha',
    }
  }
}
