/**
 * Cliente GIE AGSI+ · agsi.gie.eu/api · Sprint Energía S8
 *
 * AGSI+ (Aggregated Gas Storage Inventory) es la plataforma de transparencia de
 * Gas Infrastructure Europe (GIE) con el nivel de llenado de los almacenamientos
 * subterráneos de gas de Europa, país a país y agregado UE, en granularidad
 * diaria (gas-day): % lleno, gas en almacenamiento (TWh), inyección/extracción
 * (GWh/d) y capacidad técnica (working gas volume, TWh).
 *
 * ── API REAL (confirmada vía WebFetch del endpoint + User Manual GIE v007 ·
 *    2026-06-02) ───────────────────────────────────────────────────────────
 *   Base    : https://agsi.gie.eu/api
 *   Auth    : header HTTP `x-key: <GIE_API_KEY>`. La key es GRATUITA pero
 *             OBLIGATORIA desde 2022 (registro en https://agsi.gie.eu/account).
 *             Sin key la API responde HTTP 401 con envelope JSON:
 *               { last_page:0, total:0, dataset:"storage ERROR",
 *                 error:"access denied", message:"Invalid or missing API key",
 *                 data:[] }
 *   Query   : `country` (ISO-2, ej. "ES"), `type=eu` (agregado UE), `date`,
 *             `from`/`to` (YYYY-MM-DD), `size`, `page`.
 *   Envelope: { last_page, total, data: [ {...registro diario} ] }
 *   Campos por registro (User Manual GIE):
 *     gasDayStart (fecha) · gasInStorage (TWh) · full (% llenado) ·
 *     trend (variación diaria de `full`) · injection (GWh/d) ·
 *     withdrawal (GWh/d) · workingGasVolume (TWh, capacidad técnica) ·
 *     injectionCapacity / withdrawalCapacity (GWh/d) · consumption ·
 *     consumptionFull · status · name · code · url.
 *   Los valores numéricos llegan como STRING ("87.62") y pueden ser "-"/""/null
 *   en huecos → el parser los normaliza con `parseNum()` (null-safe).
 *
 * ── Diseño defensivo (patrón ESIOS/Ember/ENTSO-E) ─────────────────────────
 *   - Degradación: si falta GIE_API_KEY o la API falla → `{ ok:false, error,
 *     fetched_at }`. NUNCA lanza ni inventa datos. El error de key ausente es
 *     explícito y pide registrar la key gratis en GIE.
 *   - Caché en memoria TTL 6h: el dato es diario (gas-day), no necesita ser
 *     inmediato. Clave SIN la key.
 *   - `parseAgsiRows()` y `buildGasStorage()` son PURAS (sin red) y se exportan
 *     para poder testearlas con fixtures de la respuesta real.
 *
 * IMPORTANTE: GIE_API_KEY es server-side (Vercel env). NUNCA exponer al cliente;
 * estas funciones se llaman desde route handlers (app/api/energia/gas-storage).
 *
 * NOTA · convivencia: existe `gasStorageEu()` en `lib/ports-handlers.ts` (módulo
 * Puertos) que llama a AGSI con su propio fetch SIN enviar `x-key` → desde que
 * GIE hizo obligatoria la key, ese endpoint degrada a "access denied". Este
 * cliente tipado es la fuente de verdad de S8 en adelante y SÍ envía la key.
 *
 * Docs: https://agsi.gie.eu · registro key gratis: https://agsi.gie.eu/account
 */
import type {
  GasStorage,
  GasStoragePoint,
  GasStorageResponse,
} from './types'

const BASE = 'https://agsi.gie.eu/api'
const PUBLIC_URL = 'https://agsi.gie.eu'
const REGISTER_URL = 'https://agsi.gie.eu/account'
const DEFAULT_TIMEOUT_MS = 15_000
const CACHE_TTL_MS = 6 * 3600_000 // 6h · el dato es diario (gas-day)

// ─────────────────────────────────────────────────────────────────────────
// Zonas soportadas · 'eu' (agregado UE) o ISO-2 de país.
// ─────────────────────────────────────────────────────────────────────────
const ZONE_LABELS: Record<string, string> = {
  eu: 'Unión Europea',
  es: 'España',
}

/** Normaliza la zona pedida a la clave canónica ('eu' | iso-2 minúscula). */
function normZone(zone: string | undefined): string {
  const z = (zone || 'eu').trim().toLowerCase()
  return z
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL 6h
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry { expires: number; value: GasStorageResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearAgsiCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixtures) — sin red
// ─────────────────────────────────────────────────────────────────────────

/**
 * Parsea un valor numérico de AGSI tolerando string/number/null y los
 * marcadores de hueco que usa la fuente ("-", "", "n/a"). Devuelve null si no
 * es un número finito.
 */
export function parseNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (s === '' || s === '-' || s.toLowerCase() === 'n/a') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Registro crudo de AGSI (subset de campos que usamos). */
interface AgsiRawRow {
  gasDayStart?: string
  full?: unknown
  gasInStorage?: unknown
  workingGasVolume?: unknown
  injection?: unknown
  withdrawal?: unknown
  trend?: unknown
}

/**
 * Convierte las filas crudas de la respuesta AGSI en puntos diarios tipados,
 * ordenados cronológicamente ascendente (la API los devuelve descendente).
 * Pura: testeable con un fixture de `data[]`.
 */
export function parseAgsiRows(rows: unknown): GasStoragePoint[] {
  if (!Array.isArray(rows)) return []
  const pts: GasStoragePoint[] = []
  for (const raw of rows as AgsiRawRow[]) {
    const date = typeof raw?.gasDayStart === 'string' ? raw.gasDayStart : ''
    if (!date) continue
    pts.push({
      date,
      full_pct: parseNum(raw.full),
      gas_in_storage_twh: parseNum(raw.gasInStorage),
      injection_gwh: parseNum(raw.injection),
      withdrawal_gwh: parseNum(raw.withdrawal),
    })
  }
  // AGSI entrega más reciente primero → ascendente para series/gráficos.
  pts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return pts
}

/** Deriva la fase neta del último día a partir de inyección/extracción. */
function deriveFase(
  injection: number | null,
  withdrawal: number | null,
): GasStorage['fase'] {
  const inj = injection ?? 0
  const wd = withdrawal ?? 0
  if (injection == null && withdrawal == null) return null
  const net = inj - wd
  if (Math.abs(net) < 1) return 'equilibrio'
  return net > 0 ? 'inyeccion' : 'extraccion'
}

/**
 * Ensambla un `GasStorage` a partir de las filas crudas de AGSI + la metadata
 * de la zona. El "último dato" se toma de la fila más reciente (con
 * `workingGasVolume`/`trend` propios de esa fila). Pura: testeable con fixtures.
 */
export function buildGasStorage(zone: string, rawRows: unknown): GasStorage {
  const z = normZone(zone)
  const series = parseAgsiRows(rawRows)
  const last = series.length ? series[series.length - 1] : null

  // `workingGasVolume` y `trend` no van en GasStoragePoint (constantes/diarios
  // de la fila más reciente): los extraemos de la fila cruda correspondiente.
  let working: number | null = null
  let trend: number | null = null
  if (Array.isArray(rawRows) && last) {
    const lastRaw = (rawRows as AgsiRawRow[]).find((r) => r?.gasDayStart === last.date)
    if (lastRaw) {
      working = parseNum(lastRaw.workingGasVolume)
      trend = parseNum(lastRaw.trend)
    }
  }

  return {
    zone: z,
    zone_label: ZONE_LABELS[z] ?? z.toUpperCase(),
    latest_date: last?.date ?? null,
    full_pct: last?.full_pct ?? null,
    gas_in_storage_twh: last?.gas_in_storage_twh ?? null,
    working_gas_volume_twh: working,
    injection_gwh: last?.injection_gwh ?? null,
    withdrawal_gwh: last?.withdrawal_gwh ?? null,
    trend,
    fase: deriveFase(last?.injection_gwh ?? null, last?.withdrawal_gwh ?? null),
    series,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch crudo con auth + degradación + caché
// ─────────────────────────────────────────────────────────────────────────

export interface FetchGasStorageOpts {
  /** Ámbito: 'eu' (agregado UE · default) o ISO-2 de país (ej. "ES"). */
  country?: string
  /** Ventana de la serie en días (default 120 · una temporada de almacenamiento). */
  days?: number
  /** Forzar refetch ignorando la caché. */
  noCache?: boolean
  /** Timeout en ms (default 15s). */
  timeoutMs?: number
}

/** Formatea una fecha a 'YYYY-MM-DD' (UTC). */
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Descarga el almacenamiento de gas de una zona (UE agregado o un país) con su
 * serie histórica reciente. Caché 6h en memoria. Nunca lanza: ante key ausente
 * o fallo devuelve `{ ok:false, error, fetched_at }`.
 */
export async function fetchGasStorage(
  opts: FetchGasStorageOpts = {},
): Promise<GasStorageResponse> {
  const fetched_at = new Date().toISOString()
  const zone = normZone(opts.country)
  const days = Number.isFinite(opts.days as number)
    ? Math.max(14, Math.min(370, opts.days as number))
    : 120

  const apiKey = process.env.GIE_API_KEY || ''
  if (!apiKey) {
    return {
      ok: false,
      error:
        `no_key · configura GIE_API_KEY en Vercel env vars. La key de GIE AGSI+ es ` +
        `GRATUITA: regístrate en ${REGISTER_URL} y copia tu API key. Sin ella la API ` +
        `responde "access denied".`,
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }

  // Clave de caché SIN la key.
  const cacheKey = `${zone}:${days}`
  if (!opts.noCache) {
    const hit = _cache.get(cacheKey)
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  // Rango temporal: [hoy - days, hoy].
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 3600_000)

  const params = new URLSearchParams({
    from: ymd(from),
    to: ymd(to),
    size: '400',
  })
  // 'eu' → type=eu (agregado UE); país → country=ISO-2 (mayúsculas en la API).
  if (zone === 'eu') {
    params.set('type', 'eu')
  } else {
    params.set('country', zone.toUpperCase())
  }

  const url = `${BASE}?${params.toString()}`

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'x-key': apiKey },
      // Caché HTTP de Next además de la caché de proceso (6h).
      next: { revalidate: 21600 },
    } as RequestInit)
    clearTimeout(t)

    if (r.status === 401 || r.status === 403) {
      // No cacheamos errores de auth (el usuario puede arreglar la key).
      return {
        ok: false,
        error: `unauthorized · HTTP ${r.status} · GIE_API_KEY inválida o sin permisos. Regístrate gratis en ${REGISTER_URL}.`,
        fetched_at,
        source_url: PUBLIC_URL,
      }
    }
    if (r.status === 429) {
      return { ok: false, error: 'rate_limited · GIE AGSI+', fetched_at, source_url: PUBLIC_URL }
    }
    if (!r.ok) {
      return { ok: false, error: `http_${r.status}`, fetched_at, source_url: PUBLIC_URL }
    }

    const json: any = await r.json()

    // La API puede responder 200 con un envelope de error lógico.
    if (json?.error || (typeof json?.message === 'string' && /api key/i.test(json.message))) {
      return {
        ok: false,
        error: `agsi_error · ${String(json.message || json.error)}`,
        fetched_at,
        source_url: PUBLIC_URL,
      }
    }

    const rows: unknown = Array.isArray(json?.data) ? json.data : []
    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
    }

    const data = buildGasStorage(zone, rows)
    if (data.latest_date == null) {
      return { ok: false, error: 'sin_datos_validos', fetched_at, source_url: PUBLIC_URL }
    }

    const result: GasStorageResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
    _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: result })
    return result
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'timeout' : String(e?.message ?? e).slice(0, 160)
    return { ok: false, error: msg, fetched_at, source_url: PUBLIC_URL }
  }
}
