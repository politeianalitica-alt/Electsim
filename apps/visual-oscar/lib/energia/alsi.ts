/**
 * Cliente GIE ALSI · alsi.gie.eu/api · Sprint Energía S8b ("exprimir GIE")
 *
 * ALSI (Aggregated LNG Storage Inventory) es la plataforma hermana de AGSI+
 * dentro de Gas Infrastructure Europe (GIE), pero para terminales de
 * regasificación de GNL en vez de almacenamientos subterráneos: existencias de
 * GNL en tanque (kt y GWh de energía), capacidad máxima declarada (DTMI) y
 * emisión a la red (send-out, GWh/d). España es el país con MAYOR capacidad de
 * regasificación de la UE → el dato vivo agregado complementa el catálogo
 * estructural `GNL_ESPANA` (plantas) de la GasView.
 *
 * ── API REAL (capturada en vivo con la key · 2026-06-06) ───────────────────
 *   Base    : https://alsi.gie.eu/api
 *   Auth    : header HTTP `x-key: <GIE_API_KEY>` · la MISMA key gratuita pero
 *             obligatoria que AGSI (registro https://alsi.gie.eu/account).
 *   Query   : `country` (ISO-2, ej. "ES"), `type=eu` (agregado UE),
 *             `from`/`to` (YYYY-MM-DD), `size`, `page`.
 *   Envelope: { last_page, total, data: [ {...registro diario} ] }
 *   Registro (valores como STRING, huecos "-"):
 *     name · code · gasDayStart (YYYY-MM-DD) ·
 *     inventory: { lng (kt de GNL), gwh (energía almacenada) } ·
 *     sendOut (GWh/d emitidos a la red) ·
 *     dtmi: { lng (kt máx), gwh (capacidad máxima declarada) } ·
 *     dtrs · contractedCapacity · availableCapacity · coveredCapacity · status.
 *   fullness % de GNL = inventory.gwh / dtmi.gwh × 100 (ES ≈ 75%, EU ≈ 55%).
 *
 * ── Diseño defensivo (idéntico patrón a agsi.ts) ──────────────────────────
 *   - Degradación: si falta GIE_API_KEY o la API falla → `{ ok:false, error,
 *     fetched_at }`. NUNCA lanza ni inventa datos.
 *   - Caché en memoria TTL 6h (el dato es diario · gas-day). Clave SIN la key.
 *   - `parseAlsiRows()` y `buildLngStorage()` son PURAS (sin red) y se exportan
 *     para testearlas con fixtures de la respuesta real.
 *   - Reutiliza `parseNum` de agsi.ts (mismo tratamiento de string/"-"/null).
 *
 * IMPORTANTE: GIE_API_KEY es server-side (Vercel env). NUNCA exponer al cliente;
 * estas funciones se llaman desde route handlers (app/api/energia/lng-storage).
 *
 * Docs: https://alsi.gie.eu · registro key gratis: https://alsi.gie.eu/account
 */
import { parseNum } from './agsi.ts'
import type {
  LngStorage,
  LngStoragePoint,
  LngStorageResponse,
} from './types'

const BASE = 'https://alsi.gie.eu/api'
const PUBLIC_URL = 'https://alsi.gie.eu'
const REGISTER_URL = 'https://alsi.gie.eu/account'
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
  return (zone || 'eu').trim().toLowerCase()
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL 6h
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry { expires: number; value: LngStorageResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearAlsiCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixtures) — sin red
// ─────────────────────────────────────────────────────────────────────────

/** Registro crudo de ALSI (subset de campos que usamos). */
interface AlsiRawRow {
  gasDayStart?: string
  inventory?: { lng?: unknown; gwh?: unknown } | null
  sendOut?: unknown
  dtmi?: { lng?: unknown; gwh?: unknown } | null
}

/** Calcula el % de llenado de GNL (inventory.gwh / dtmi.gwh × 100), null-safe. */
function fullnessPct(invGwh: number | null, dtmiGwh: number | null): number | null {
  if (invGwh == null || dtmiGwh == null || dtmiGwh <= 0) return null
  return (invGwh / dtmiGwh) * 100
}

/**
 * Convierte las filas crudas de la respuesta ALSI en puntos diarios tipados,
 * ordenados cronológicamente ascendente (la API los devuelve descendente).
 * Pura: testeable con un fixture de `data[]`.
 */
export function parseAlsiRows(rows: unknown): LngStoragePoint[] {
  if (!Array.isArray(rows)) return []
  const pts: LngStoragePoint[] = []
  for (const raw of rows as AlsiRawRow[]) {
    const date = typeof raw?.gasDayStart === 'string' ? raw.gasDayStart : ''
    if (!date) continue
    const invGwh = parseNum(raw.inventory?.gwh)
    const dtmiGwh = parseNum(raw.dtmi?.gwh)
    pts.push({
      date,
      fullness_pct: fullnessPct(invGwh, dtmiGwh),
      inventory_gwh: invGwh,
      send_out_gwh: parseNum(raw.sendOut),
    })
  }
  // ALSI entrega más reciente primero → ascendente para series/gráficos.
  pts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return pts
}

/**
 * Ensambla un `LngStorage` a partir de las filas crudas de ALSI + la metadata
 * de la zona. El "último dato" se toma de la fila más reciente (con su `dtmi`
 * propio). Pura: testeable con fixtures.
 */
export function buildLngStorage(zone: string, rawRows: unknown): LngStorage {
  const z = normZone(zone)
  const series = parseAlsiRows(rawRows)
  const last = series.length ? series[series.length - 1] : null

  // dtmi.gwh (capacidad máxima declarada) no va en LngStoragePoint: lo
  // extraemos de la fila cruda del último día.
  let dtmiGwh: number | null = null
  if (Array.isArray(rawRows) && last) {
    const lastRaw = (rawRows as AlsiRawRow[]).find((r) => r?.gasDayStart === last.date)
    if (lastRaw) dtmiGwh = parseNum(lastRaw.dtmi?.gwh)
  }

  return {
    zona: z,
    zona_label: ZONE_LABELS[z] ?? z.toUpperCase(),
    fullness_pct: last?.fullness_pct ?? null,
    inventory_gwh: last?.inventory_gwh ?? null,
    dtmi_gwh: dtmiGwh,
    send_out_gwh: last?.send_out_gwh ?? null,
    updated_at: last?.date ?? null,
    series,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch crudo con auth + degradación + caché
// ─────────────────────────────────────────────────────────────────────────

export interface FetchLngStorageOpts {
  /** Ámbito: 'eu' (agregado UE · default) o ISO-2 de país (ej. "ES"). */
  country?: string
  /** Ventana de la serie en días (default 120 · clamp 14-370). */
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
 * Descarga el almacenamiento de GNL de una zona (UE agregado o un país) con su
 * serie histórica reciente. Caché 6h en memoria. Nunca lanza: ante key ausente
 * o fallo devuelve `{ ok:false, error, fetched_at }`.
 */
export async function fetchLngStorage(
  opts: FetchLngStorageOpts = {},
): Promise<LngStorageResponse> {
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
        `no_key · configura GIE_API_KEY en Vercel env vars. La key de GIE ALSI es ` +
        `GRATUITA (la MISMA que AGSI): regístrate en ${REGISTER_URL} y copia tu API ` +
        `key. Sin ella la API responde "access denied".`,
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
      return {
        ok: false,
        error: `unauthorized · HTTP ${r.status} · GIE_API_KEY inválida o sin permisos. Regístrate gratis en ${REGISTER_URL}.`,
        fetched_at,
        source_url: PUBLIC_URL,
      }
    }
    if (r.status === 429) {
      return { ok: false, error: 'rate_limited · GIE ALSI', fetched_at, source_url: PUBLIC_URL }
    }
    if (!r.ok) {
      return { ok: false, error: `http_${r.status}`, fetched_at, source_url: PUBLIC_URL }
    }

    const json: any = await r.json()

    // La API puede responder 200 con un envelope de error lógico.
    if (json?.error || (typeof json?.message === 'string' && /api key/i.test(json.message))) {
      return {
        ok: false,
        error: `alsi_error · ${String(json.message || json.error)}`,
        fetched_at,
        source_url: PUBLIC_URL,
      }
    }

    const rows: unknown = Array.isArray(json?.data) ? json.data : []
    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, error: 'sin_datos', fetched_at, source_url: PUBLIC_URL }
    }

    const data = buildLngStorage(zone, rows)
    if (data.updated_at == null) {
      return { ok: false, error: 'sin_datos_validos', fetched_at, source_url: PUBLIC_URL }
    }

    const result: LngStorageResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
    _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: result })
    return result
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'timeout' : String(e?.message ?? e).slice(0, 160)
    return { ok: false, error: msg, fetched_at, source_url: PUBLIC_URL }
  }
}
