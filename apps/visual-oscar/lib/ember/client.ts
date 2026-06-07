/**
 * Cliente Ember · api.ember-energy.org/v1 · Sprint Energía S2
 *
 * Ember Energy es un think-tank energético independiente que publica datos
 * abiertos de electricidad mundial (~200 países, desde 2000): generación por
 * fuente, intensidad de carbono, capacidad instalada, demanda y emisiones.
 *
 * ── API REAL (confirmada vía WebFetch del OpenAPI · 2026-06-02) ──────────
 *   Base    : https://api.ember-energy.org/v1
 *   Auth    : query param `api_key=<EMBER_API_KEY>`  (NO header).
 *             Sin key la API responde HTTP 403 {"detail":"No API key set"}.
 *   Envelope: { "stats": {...}, "data": [ {...registro} ] }
 *   Endpoints usados:
 *     GET /electricity-generation/{yearly|monthly}
 *     GET /carbon-intensity/{yearly|monthly}
 *     GET /electricity-demand/{yearly|monthly}
 *   Params comunes: entity, entity_code, start_date, end_date, series,
 *                   is_aggregate_entity, is_aggregate_series  (+ api_key).
 *   `date` viene como "YYYY" (yearly) o "YYYY-MM" (monthly).
 *
 *   Campos por registro:
 *     generation : entity, entity_code, date, series, generation_twh,
 *                  share_of_generation_pct
 *     carbon     : entity, entity_code, date, emissions_intensity_gco2_per_kwh
 *     demand     : entity, entity_code, date, demand_twh, demand_mwh_per_capita
 *
 * ── Diseño defensivo ─────────────────────────────────────────────────────
 *   - Degradación: si falta EMBER_API_KEY o la API falla → `{ ok:false,
 *     error, fetched_at }`. NUNCA lanza ni inventa datos (patrón ESIOS).
 *   - Caché en memoria con TTL 24h: los datos anuales/mensuales cambian poco
 *     y el free tier de Ember es 1000 req/día. Map<key, {expires, value}>.
 *   - Tolerante a nulos: `generation_twh` / `share_*` pueden ser null en la
 *     fuente; el parser los trata sin romper agregados.
 *
 * IMPORTANTE: EMBER_API_KEY es server-side (Vercel env). NUNCA exponer al
 * cliente; estas funciones se llaman desde route handlers (app/api/ember/*).
 *
 * NOTA · convivencia: existe `app/api/ember/[...path]/route.ts` (legacy, S0)
 * que llama a Ember directamente con su propio fetch. Este cliente tipado es
 * la fuente de verdad de S2 en adelante; los endpoints nuevos lo consumen.
 *
 * Docs: https://api.ember-energy.org/docs · registro key: ember-energy.org/data/api/
 */
import type {
  EmberResolution,
  EmberGenerationRow,
  EmberGeneration,
  EmberCarbonIntensity,
  EmberCountryProfile,
  EmberResponse,
} from '@/lib/energia/types'

const BASE = 'https://api.ember-energy.org/v1'
const PUBLIC_URL = 'https://ember-energy.org/data/'
const DEFAULT_TIMEOUT_MS = 15_000
const CACHE_TTL_MS = 24 * 3600_000 // 24h

// ── Taxonomía de fuentes Ember (lowercase para clasificar agregados) ────────
// La API usa series con capitalización ("Wind", "Solar", "Coal"…). Para
// clasificar renovable/limpio/fósil normalizamos a minúsculas.
const RENEWABLE_SERIES = new Set([
  'wind', 'solar', 'hydro', 'bioenergy', 'other renewables', 'other_renewables',
])
const FOSSIL_SERIES = new Set([
  'coal', 'gas', 'oil', 'other fossil', 'other_fossil',
])
const NUCLEAR_SERIES = new Set(['nuclear'])
// Series agregadas que la API puede incluir y que NO deben sumarse al desglose
// por fuente (evita doble conteo). is_aggregate_series=true las marca, pero
// filtramos también por nombre por robustez.
const AGGREGATE_SERIES = new Set([
  'total generation', 'total', 'renewables', 'clean', 'fossil',
  'hydro, bioenergy and other renewables', 'wind and solar',
  'gas and other fossil', 'other',
])

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL 24h
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry { expires: number; value: any }
const _cache = new Map<string, CacheEntry>()

function cacheGet(key: string): any | undefined {
  const hit = _cache.get(key)
  if (!hit) return undefined
  if (Date.now() > hit.expires) {
    _cache.delete(key)
    return undefined
  }
  return hit.value
}

function cacheSet(key: string, value: any): void {
  _cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value })
}

/** Limpia la caché. Solo para tests. */
export function _clearEmberCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch crudo con auth + degradación + caché
// ─────────────────────────────────────────────────────────────────────────
interface RawResult {
  ok: boolean
  error?: string
  rows: any[]
  stats?: any
}

interface RawOpts {
  entity?: string
  entity_code?: string
  start_date?: string
  end_date?: string
  series?: string
  is_aggregate_series?: boolean
  timeoutMs?: number
}

/**
 * Llama a un endpoint Ember `/v1/<path>` y devuelve `data[]` ya desempaquetado.
 * Aplica caché (clave = path + params, sin la key). Nunca lanza.
 */
async function emberFetchRaw(path: string, opts: RawOpts = {}): Promise<RawResult> {
  const apiKey = process.env.EMBER_API_KEY || ''
  if (!apiKey) {
    return { ok: false, error: 'no_key · configurar EMBER_API_KEY en Vercel env vars', rows: [] }
  }

  const params: Record<string, string> = {}
  if (opts.entity) params.entity = opts.entity
  if (opts.entity_code) params.entity_code = opts.entity_code
  if (opts.start_date) params.start_date = opts.start_date
  if (opts.end_date) params.end_date = opts.end_date
  if (opts.series) params.series = opts.series
  if (opts.is_aggregate_series !== undefined) {
    params.is_aggregate_series = String(opts.is_aggregate_series)
  }

  // Clave de caché SIN la api_key (no queremos cachear por secreto).
  const cacheKey = `${path}?${new URLSearchParams(params).toString()}`
  const cached = cacheGet(cacheKey)
  if (cached !== undefined) return cached

  const qs = new URLSearchParams({ ...params, api_key: apiKey })
  const url = `${BASE}${path}?${qs.toString()}`

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      // Caché HTTP de Next además de la caché de proceso (24h).
      next: { revalidate: 86400 },
    } as RequestInit)
    clearTimeout(t)

    if (r.status === 429) {
      // No cacheamos errores transitorios.
      return { ok: false, error: 'rate_limited · Ember free tier 1000/día', rows: [] }
    }
    if (!r.ok) {
      let detail = ''
      try {
        const j: any = await r.json()
        detail = j?.detail ? ` · ${String(j.detail)}` : ''
      } catch { /* cuerpo no JSON */ }
      return { ok: false, error: `http_${r.status}${detail}`, rows: [] }
    }

    const json: any = await r.json()
    const rows: any[] = Array.isArray(json?.data) ? json.data : []
    const result: RawResult = { ok: true, rows, stats: json?.stats }
    // Solo cacheamos respuestas OK (aunque rows esté vacío: es una respuesta válida).
    cacheSet(cacheKey, result)
    return result
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'timeout' : String(e?.message ?? e).slice(0, 160)
    return { ok: false, error: msg, rows: [] }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers de clasificación / agregación
// ─────────────────────────────────────────────────────────────────────────
function norm(series: unknown): string {
  return String(series ?? '').trim().toLowerCase()
}

function isAggregateRow(row: any): boolean {
  if (row?.is_aggregate_series === true) return true
  return AGGREGATE_SERIES.has(norm(row?.series))
}

/** Construye un `EmberGeneration` a partir de las filas de UN periodo. */
function buildGeneration(
  entity: string,
  entityCode: string | null,
  date: string,
  resolution: EmberResolution,
  periodRows: any[],
): EmberGeneration {
  // Solo fuentes elementales (descarta agregados de la API).
  const sourceRows = periodRows.filter((r) => !isAggregateRow(r))

  const by_source: EmberGenerationRow[] = sourceRows
    .map((r) => ({
      series: String(r?.series ?? ''),
      generation_twh: r?.generation_twh == null ? null : Number(r.generation_twh),
      share_of_generation_pct:
        r?.share_of_generation_pct == null ? null : Number(r.share_of_generation_pct),
    }))
    .sort((a, b) => (b.generation_twh ?? 0) - (a.generation_twh ?? 0))

  const total_twh = by_source.reduce((s, r) => s + (r.generation_twh ?? 0), 0)

  let renew = 0
  let nuke = 0
  let fossil = 0
  for (const r of by_source) {
    const v = r.generation_twh ?? 0
    const key = norm(r.series)
    if (RENEWABLE_SERIES.has(key)) renew += v
    else if (NUCLEAR_SERIES.has(key)) nuke += v
    else if (FOSSIL_SERIES.has(key)) fossil += v
  }

  const pct = (n: number) => (total_twh > 0 ? round1((n / total_twh) * 100) : 0)

  return {
    entity,
    entity_code: entityCode,
    date,
    resolution,
    by_source,
    total_twh: round2(total_twh),
    renewable_pct: pct(renew),
    clean_pct: pct(renew + nuke),
    fossil_pct: pct(fossil),
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10 }
function round2(n: number): number { return Math.round(n * 100) / 100 }

/** Devuelve el periodo (`date`) máximo presente en las filas. */
function latestDate(rows: any[]): string | null {
  let best: string | null = null
  for (const r of rows) {
    const d = String(r?.date ?? '')
    if (!d) continue
    if (best === null || d > best) best = d
  }
  return best
}

// ─────────────────────────────────────────────────────────────────────────
// API pública del cliente
// ─────────────────────────────────────────────────────────────────────────

interface GenerationOpts {
  /** Nombre de país tal como Ember lo espera (ej. "Spain"). */
  country?: string
  /** Código ISO-3 (ej. "ESP"). Si se pasa, tiene prioridad sobre `country`. */
  entity_code?: string
  /** Año concreto. Si se omite se usa el último disponible (ventana 6 años). */
  year?: number
  resolution?: EmberResolution
}

/**
 * Generación eléctrica por fuente de un país (TWh + %), del año solicitado o
 * del último disponible. Incluye agregados renovable/limpio/fósil.
 */
export async function fetchEmberGeneration(
  opts: GenerationOpts = {},
): Promise<EmberResponse<EmberGeneration>> {
  const fetched_at = new Date().toISOString()
  const resolution = opts.resolution ?? 'yearly'

  const raw = await emberFetchRaw(`/electricity-generation/${resolution}`, {
    entity: opts.entity_code ? undefined : (opts.country ?? 'Spain'),
    entity_code: opts.entity_code,
    start_date: opts.year ? String(opts.year) : String(new Date().getFullYear() - 6),
    end_date: opts.year ? String(opts.year) : undefined,
  })

  if (!raw.ok) {
    return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }
  }
  if (raw.rows.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }

  const date = opts.year ? String(opts.year) : (latestDate(raw.rows) ?? '')
  const periodRows = raw.rows.filter((r) => String(r?.date) === date)
  if (periodRows.length === 0) {
    return { ok: false, error: 'sin_datos_periodo', fetched_at, source_url: PUBLIC_URL }
  }

  const first = periodRows[0]
  const generation = buildGeneration(
    String(first?.entity ?? opts.country ?? opts.entity_code ?? ''),
    first?.entity_code ?? opts.entity_code ?? null,
    date,
    resolution,
    periodRows,
  )

  return { ok: true, data: generation, fetched_at, source_url: PUBLIC_URL }
}

interface CarbonOpts {
  country?: string
  entity_code?: string
  resolution?: EmberResolution
}

/**
 * Intensidad de carbono de la generación eléctrica (gCO2/kWh) más reciente.
 */
export async function fetchCarbonIntensity(
  opts: CarbonOpts = {},
): Promise<EmberResponse<EmberCarbonIntensity>> {
  const fetched_at = new Date().toISOString()
  const resolution = opts.resolution ?? 'yearly'

  const raw = await emberFetchRaw(`/carbon-intensity/${resolution}`, {
    entity: opts.entity_code ? undefined : (opts.country ?? 'Spain'),
    entity_code: opts.entity_code,
    start_date: String(new Date().getFullYear() - 3),
  })

  if (!raw.ok) {
    return { ok: false, error: raw.error, fetched_at, source_url: PUBLIC_URL }
  }
  if (raw.rows.length === 0) {
    return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
  }

  const date = latestDate(raw.rows) ?? ''
  const row = raw.rows.find((r) => String(r?.date) === date) ?? raw.rows[raw.rows.length - 1]

  return {
    ok: true,
    data: {
      entity: String(row?.entity ?? opts.country ?? opts.entity_code ?? ''),
      entity_code: row?.entity_code ?? opts.entity_code ?? null,
      date: String(row?.date ?? date),
      resolution,
      gco2_per_kwh:
        row?.emissions_intensity_gco2_per_kwh == null
          ? null
          : Number(row.emissions_intensity_gco2_per_kwh),
    },
    fetched_at,
    source_url: PUBLIC_URL,
  }
}

/**
 * Perfil energético completo de un país por ISO-3: mix del último año,
 * intensidad de carbono, demanda y serie histórica de % renovable.
 * Las tres sub-consultas degradan de forma independiente.
 */
export async function fetchCountryProfile(
  iso: string,
): Promise<EmberResponse<EmberCountryProfile>> {
  const fetched_at = new Date().toISOString()
  const code = (iso || '').trim().toUpperCase()
  if (!code) {
    return { ok: false, error: 'iso_requerido', fetched_at, source_url: PUBLIC_URL }
  }

  const [genRaw, carbon, demandRaw] = await Promise.all([
    emberFetchRaw('/electricity-generation/yearly', {
      entity_code: code,
      start_date: String(new Date().getFullYear() - 11),
    }),
    fetchCarbonIntensity({ entity_code: code, resolution: 'yearly' }),
    emberFetchRaw('/electricity-demand/yearly', {
      entity_code: code,
      start_date: String(new Date().getFullYear() - 6),
    }),
  ])

  // Mix del último año + tendencia renovable.
  let generation: EmberGeneration | null = null
  let latest_year: string | null = null
  let entity = code
  const renewable_trend: EmberCountryProfile['renewable_trend'] = []

  if (genRaw.ok && genRaw.rows.length > 0) {
    latest_year = latestDate(genRaw.rows)
    entity = String(genRaw.rows[0]?.entity ?? code)
    if (latest_year) {
      const periodRows = genRaw.rows.filter((r) => String(r?.date) === latest_year)
      generation = buildGeneration(entity, code, latest_year, 'yearly', periodRows)
    }
    // Serie renovable por año.
    const years = Array.from(
      new Set(genRaw.rows.map((r) => String(r?.date ?? '')).filter(Boolean)),
    ).sort()
    for (const y of years) {
      const yearRows = genRaw.rows.filter((r) => String(r?.date) === y)
      const g = buildGeneration(entity, code, y, 'yearly', yearRows)
      renewable_trend.push({ year: y, renewable_pct: g.renewable_pct, total_twh: g.total_twh })
    }
  }

  // Demanda último año.
  let demand_twh: number | null = null
  let demand_mwh_per_capita: number | null = null
  if (demandRaw.ok && demandRaw.rows.length > 0) {
    const d = latestDate(demandRaw.rows)
    const row = demandRaw.rows.find((r) => String(r?.date) === d) ?? demandRaw.rows[demandRaw.rows.length - 1]
    demand_twh = row?.demand_twh == null ? null : Number(row.demand_twh)
    demand_mwh_per_capita =
      row?.demand_mwh_per_capita == null ? null : Number(row.demand_mwh_per_capita)
  }

  // Si TODO falló (incluida la generación), reportamos degradación honesta.
  const anyOk = (genRaw.ok && genRaw.rows.length > 0) || carbon.ok || (demandRaw.ok && demandRaw.rows.length > 0)
  if (!anyOk) {
    return {
      ok: false,
      error: genRaw.error || carbon.error || demandRaw.error || 'sin_datos',
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }

  return {
    ok: true,
    data: {
      entity,
      entity_code: code,
      latest_year,
      generation,
      carbon_intensity: carbon.ok && carbon.data ? carbon.data : null,
      demand_twh,
      demand_mwh_per_capita,
      renewable_trend,
    },
    fetched_at,
    source_url: PUBLIC_URL,
  }
}
