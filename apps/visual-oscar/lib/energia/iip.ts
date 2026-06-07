/**
 * Cliente GIE IIP · iip.gie.eu/api · Sprint Energía S8b ("exprimir GIE")
 *
 * IIP (Inside Information Platform) es la plataforma de Gas Infrastructure
 * Europe (GIE) donde los operadores publican UMM (Urgent Market Messages):
 * indisponibilidades planificadas / no planificadas de infraestructura gasista
 * — plantas de tratamiento, almacenamientos subterráneos, terminales de GNL,
 * interconexiones —. Es la fuente REGULADA de "eventos de mercado gasista /
 * señales de suministro" en tiempo casi real, complementaria a los niveles de
 * stock de AGSI (gas) y ALSI (GNL) en la GasView.
 *
 * ── API REAL (capturada en vivo con la key · 2026-06-06) ───────────────────
 *   Base    : https://iip.gie.eu/api
 *   Auth    : header HTTP `x-key: <GIE_API_KEY>` · la MISMA key gratuita pero
 *             obligatoria que AGSI/ALSI (registro https://iip.gie.eu/account).
 *   Query   : `size`, `page`, `country` (ISO-2 · filtra por país, parcial).
 *   Envelope: { current_page, last_page, total, data: [ {...UMM} ] }
 *   UMM (campos anidados, muchos opcionales · ver types.ts):
 *     submitted ("YYYY-MM-DD HH:mm:ss") ·
 *     reportingEntity: { name, code, type } ·
 *     message: { messageId, messageType, reportType, unavailabilityType } ·
 *     messageString · status · from · to · duration ·
 *     marketParticipant · asset · direction · unavailable · available ·
 *     technical · balancingZone · unavailabilityReason · remarks · published.
 *
 * ── Diseño defensivo (idéntico patrón a agsi.ts) ──────────────────────────
 *   - Degradación: si falta GIE_API_KEY o la API falla → `{ ok:false, error,
 *     fetched_at }`. NUNCA lanza ni inventa datos.
 *   - Caché en memoria TTL 1h: los eventos cambian más a menudo que los stocks
 *     diarios de AGSI/ALSI. Clave SIN la key.
 *   - `parseInsideEvents()` es PURA (sin red) y se exporta para testearla con
 *     fixtures de la respuesta real. Mapea cada UMM al shape plano de la UI y
 *     ordena por `submitted` descendente (lo más reciente primero).
 *
 * IMPORTANTE: GIE_API_KEY es server-side (Vercel env). NUNCA exponer al cliente;
 * estas funciones se llaman desde route handlers (app/api/energia/gas-inside-info).
 *
 * Docs: https://iip.gie.eu · registro key gratis: https://iip.gie.eu/account
 */
import type { GieInsideEvent, GieInsideInfoResponse } from './types'

const BASE = 'https://iip.gie.eu/api'
const PUBLIC_URL = 'https://iip.gie.eu'
const REGISTER_URL = 'https://iip.gie.eu/account'
const DEFAULT_TIMEOUT_MS = 15_000
const CACHE_TTL_MS = 1 * 3600_000 // 1h · los eventos cambian más que los stocks
const DEFAULT_SIZE = 20
const MAX_SIZE = 100

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL 1h
// ─────────────────────────────────────────────────────────────────────────
interface CacheEntry { expires: number; value: GieInsideInfoResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearIipCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixtures) — sin red
// ─────────────────────────────────────────────────────────────────────────

/** Normaliza un valor a string no vacío o null (tolera "-"/""/objetos raros). */
function str(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s === '' || s === '-') return null
  return s
}

/** Registro crudo de IIP (subset de campos que mapeamos). */
interface IipRawRow {
  submitted?: unknown
  reportingEntity?: { name?: unknown } | null
  asset?: unknown
  message?: {
    messageType?: unknown
    unavailabilityType?: unknown
  } | null
  unavailabilityType?: unknown
  from?: unknown
  to?: unknown
  unavailable?: unknown
  balancingZone?: unknown
  unavailabilityReason?: unknown
}

/**
 * Mapea las UMM crudas de IIP al shape plano de la UI y las ordena por
 * `submitted` descendente (lo más reciente primero). Pura: testeable con un
 * fixture de `data[]`. Nunca lanza ante filas malformadas (las salta/normaliza).
 */
export function parseInsideEvents(rows: unknown): GieInsideEvent[] {
  if (!Array.isArray(rows)) return []
  const events: GieInsideEvent[] = []
  for (const raw of rows as IipRawRow[]) {
    if (!raw || typeof raw !== 'object') continue
    events.push({
      submitted: str(raw.submitted),
      entity: str(raw.reportingEntity?.name),
      asset: str(raw.asset),
      message_type: str(raw.message?.messageType),
      // unavailabilityType puede venir dentro de message o al nivel raíz.
      unavailability_type: str(raw.message?.unavailabilityType) ?? str(raw.unavailabilityType),
      from: str(raw.from),
      to: str(raw.to),
      unavailable: str(raw.unavailable),
      balancing_zone: str(raw.balancingZone),
      reason: str(raw.unavailabilityReason),
    })
  }
  // Más reciente primero (string "YYYY-MM-DD HH:mm:ss" ordena lexicográficamente).
  events.sort((a, b) => {
    const sa = a.submitted ?? ''
    const sb = b.submitted ?? ''
    return sa > sb ? -1 : sa < sb ? 1 : 0
  })
  return events
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch crudo con auth + degradación + caché
// ─────────────────────────────────────────────────────────────────────────

export interface FetchGieInsideInfoOpts {
  /** Filtro por país (ISO-2, ej. "ES"). Omitir → eventos globales (UE). */
  country?: string
  /** Nº de eventos a devolver (default 20 · clamp 1-100). */
  size?: number
  /** Forzar refetch ignorando la caché. */
  noCache?: boolean
  /** Timeout en ms (default 15s). */
  timeoutMs?: number
}

/**
 * Descarga los últimos eventos de mercado gasista (UMM) de la GIE Inside
 * Information Platform. Caché 1h en memoria. Nunca lanza: ante key ausente o
 * fallo devuelve `{ ok:false, error, fetched_at }`.
 */
export async function fetchGieInsideInfo(
  opts: FetchGieInsideInfoOpts = {},
): Promise<GieInsideInfoResponse> {
  const fetched_at = new Date().toISOString()
  const country = (opts.country || '').trim().toLowerCase()
  const size = Number.isFinite(opts.size as number)
    ? Math.max(1, Math.min(MAX_SIZE, opts.size as number))
    : DEFAULT_SIZE

  const apiKey = process.env.GIE_API_KEY || ''
  if (!apiKey) {
    return {
      ok: false,
      error:
        `no_key · configura GIE_API_KEY en Vercel env vars. La key de GIE IIP es ` +
        `GRATUITA (la MISMA que AGSI/ALSI): regístrate en ${REGISTER_URL} y copia tu ` +
        `API key. Sin ella la API responde "access denied".`,
      fetched_at,
      source_url: PUBLIC_URL,
    }
  }

  // Clave de caché SIN la key.
  const cacheKey = `${country || 'eu'}:${size}`
  if (!opts.noCache) {
    const hit = _cache.get(cacheKey)
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  const params = new URLSearchParams({ size: String(size) })
  if (country) params.set('country', country.toUpperCase())

  const url = `${BASE}?${params.toString()}`

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'x-key': apiKey },
      // Caché HTTP de Next además de la caché de proceso (1h).
      next: { revalidate: 3600 },
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
      return { ok: false, error: 'rate_limited · GIE IIP', fetched_at, source_url: PUBLIC_URL }
    }
    if (!r.ok) {
      return { ok: false, error: `http_${r.status}`, fetched_at, source_url: PUBLIC_URL }
    }

    const json: any = await r.json()

    // La API puede responder 200 con un envelope de error lógico.
    if (json?.error || (typeof json?.message === 'string' && /api key/i.test(json.message))) {
      return {
        ok: false,
        error: `iip_error · ${String(json.message || json.error)}`,
        fetched_at,
        source_url: PUBLIC_URL,
      }
    }

    const rows: unknown = Array.isArray(json?.data) ? json.data : []
    const events = parseInsideEvents(rows)

    const result: GieInsideInfoResponse = {
      ok: true,
      data: { events },
      fetched_at,
      source_url: PUBLIC_URL,
    }
    _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: result })
    return result
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'timeout' : String(e?.message ?? e).slice(0, 160)
    return { ok: false, error: msg, fetched_at, source_url: PUBLIC_URL }
  }
}
