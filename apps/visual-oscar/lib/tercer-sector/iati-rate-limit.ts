/**
 * IATI Rate Limiter + In-Flight Dedupe + Usage Counters · Sprint IATI-MAX.
 *
 * El propietario nos ha dado una IATI_API_KEY Full Access. Los Terms of Use IATI
 * dejan claro que "abuse or excessively frequent requests... will result in
 * suspension". Este módulo es el cinturón de seguridad: TODA llamada al
 * Datastore Solr (no Registry/Codelists, que son keyless) DEBE pasar por aquí
 * antes de pegarle a la API.
 *
 * ── Diseño ─────────────────────────────────────────────────────────────────
 *   1. Token bucket conservador (default 3 req/seg + cap 100 req/min). Cada
 *      petición espera (await) un token; si no hay → bloquea hasta refresco.
 *      Sin rechazos, sin colas eternas: solo se serializa de forma honesta.
 *      Configurable por env `IATI_RATE_PER_SEC` y `IATI_RATE_PER_MIN`.
 *
 *   2. In-flight dedupe por queryKey: si dos requests piden la misma query Solr
 *      a la vez, solo lanzamos UNA llamada real y el resto se cuelga del mismo
 *      Promise. Reduce la presión sobre la API ~2-10x en navegación con clicks
 *      rápidos.
 *
 *   3. Counters de uso (no expuestos al cliente público): nº de llamadas en la
 *      última hora / minuto, tiempo desde último 429, hits de caché, dedupe
 *      hits, throttle waits. Útil para `/api/health/iati-usage`.
 *
 *   4. NUNCA expone la key. El módulo recibe la key en el call site (caller
 *      lee `process.env.IATI_API_KEY`). El bucket y los counters viven en
 *      memoria del proceso server-side.
 *
 * Patrón heredado de `lib/agro/groq-rate-limit.ts` (rate-limiter centralizado
 * Groq) y `lib/energia/agsi.ts` (degradación honesta + caché en memoria).
 *
 * Cero dependencias externas: solo stdlib.
 */

// ─────────────────────────────────────────────────────────────────────────
// Configuración (env override) — defaults conservadores para Full Access
// ─────────────────────────────────────────────────────────────────────────
const DEFAULT_PER_SEC = 3
const DEFAULT_PER_MIN = 100
const MAX_WAIT_MS = 30_000 // hard cap por petición individual

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

interface RateLimitConfig {
  perSec: number
  perMin: number
}

function getConfig(): RateLimitConfig {
  return {
    perSec: envInt('IATI_RATE_PER_SEC', DEFAULT_PER_SEC),
    perMin: envInt('IATI_RATE_PER_MIN', DEFAULT_PER_MIN),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Estado interno del proceso
// ─────────────────────────────────────────────────────────────────────────

/** Timestamps de llamadas reales (no dedupe-hits). Se purgan a los 60s. */
const _callTimestamps: number[] = []

/** Counters acumulados (lifetime del proceso). */
const _counters = {
  total_requests: 0,
  total_call_real: 0,
  total_cache_hits: 0,
  total_dedupe_hits: 0,
  total_throttle_waits: 0,
  total_rate_limited_429: 0,
  total_errors: 0,
  total_wait_ms: 0,
  last_429_at: null as number | null,
  last_call_at: null as number | null,
}

/** Promesas en vuelo por queryKey (in-flight dedupe). */
const _inflight = new Map<string, Promise<unknown>>()

/** Resetea todo (solo para tests). */
export function _resetRateLimiterForTest(): void {
  _callTimestamps.length = 0
  _counters.total_requests = 0
  _counters.total_call_real = 0
  _counters.total_cache_hits = 0
  _counters.total_dedupe_hits = 0
  _counters.total_throttle_waits = 0
  _counters.total_rate_limited_429 = 0
  _counters.total_errors = 0
  _counters.total_wait_ms = 0
  _counters.last_429_at = null
  _counters.last_call_at = null
  _inflight.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Token bucket: cuenta llamadas reales en ventanas deslizantes 1s / 60s
// ─────────────────────────────────────────────────────────────────────────

/** Purga timestamps mayores a 60s para no acumular memoria. */
function purgeOldTimestamps(now: number): void {
  const cutoff = now - 60_000
  // Como el array está ordenado por inserción, podemos cortar por el inicio.
  while (_callTimestamps.length > 0 && _callTimestamps[0] < cutoff) {
    _callTimestamps.shift()
  }
}

/**
 * Calcula cuánto hay que esperar (ms) antes de poder hacer otra llamada real,
 * respetando perSec y perMin. Devuelve 0 si se puede ya. Pura sobre `now` y
 * `_callTimestamps`. Exportada para test.
 */
export function computeWaitMs(now: number, cfg: RateLimitConfig): number {
  // Sub-ventana 1s
  const oneSecAgo = now - 1_000
  let recentSec = 0
  for (let i = _callTimestamps.length - 1; i >= 0; i--) {
    if (_callTimestamps[i] >= oneSecAgo) recentSec++
    else break
  }
  // Sub-ventana 60s
  const oneMinAgo = now - 60_000
  let recentMin = 0
  for (let i = _callTimestamps.length - 1; i >= 0; i--) {
    if (_callTimestamps[i] >= oneMinAgo) recentMin++
    else break
  }

  // Si tenemos cabeza para una llamada más en ambas ventanas, 0.
  if (recentSec < cfg.perSec && recentMin < cfg.perMin) return 0

  // Esperar hasta que el más antiguo de la ventana 1s expire (si esa es la
  // restricción) o el más antiguo de la ventana 60s (si es la otra).
  let waitSec = 0
  if (recentSec >= cfg.perSec && _callTimestamps.length >= cfg.perSec) {
    const oldest = _callTimestamps[_callTimestamps.length - cfg.perSec]
    waitSec = Math.max(0, oldest + 1_000 - now)
  }
  let waitMin = 0
  if (recentMin >= cfg.perMin && _callTimestamps.length >= cfg.perMin) {
    const oldest = _callTimestamps[_callTimestamps.length - cfg.perMin]
    waitMin = Math.max(0, oldest + 60_000 - now)
  }
  return Math.max(waitSec, waitMin)
}

/** sleep tipado y testeable. */
function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, Math.max(0, ms)))
}

/**
 * Adquiere un slot del bucket: espera (await) hasta que haya capacidad y
 * registra el timestamp de la llamada. Capa MAX_WAIT_MS por defensa.
 * Devuelve cuántos ms se esperó (0 si no hubo throttling).
 */
export async function acquireSlot(): Promise<number> {
  const cfg = getConfig()
  const start = Date.now()
  let waited = 0
  for (;;) {
    const now = Date.now()
    purgeOldTimestamps(now)
    const w = computeWaitMs(now, cfg)
    if (w === 0) {
      _callTimestamps.push(now)
      _counters.total_call_real += 1
      _counters.last_call_at = now
      _counters.total_wait_ms += waited
      if (waited > 0) _counters.total_throttle_waits += 1
      return waited
    }
    if (start + MAX_WAIT_MS - now < w) {
      // Saturado mucho más allá del cap: aún así esperamos lo que reste hasta MAX_WAIT_MS.
      const remaining = Math.max(50, start + MAX_WAIT_MS - now)
      await sleep(remaining)
      // Forzamos slot (es preferible una llamada extra que romper la página).
      const after = Date.now()
      _callTimestamps.push(after)
      _counters.total_call_real += 1
      _counters.last_call_at = after
      _counters.total_throttle_waits += 1
      _counters.total_wait_ms += waited + remaining
      return waited + remaining
    }
    await sleep(Math.min(w, 1_000))
    waited += Math.min(w, 1_000)
  }
}

// ─────────────────────────────────────────────────────────────────────────
// In-flight dedupe + counters runtime
// ─────────────────────────────────────────────────────────────────────────

/**
 * Si ya hay una request idéntica en vuelo (mismo queryKey), retorna su Promise
 * y NO lanza una nueva. Si no, crea una nueva, la registra y la libera al
 * resolverse (sea ok o fallo). Pensado para envolver `solrFetch` dentro de
 * `iati-datastore.ts`.
 */
export async function dedupeInFlight<T>(
  queryKey: string,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = _inflight.get(queryKey)
  if (existing) {
    _counters.total_dedupe_hits += 1
    return existing as Promise<T>
  }
  const p = fn().finally(() => {
    _inflight.delete(queryKey)
  })
  _inflight.set(queryKey, p as Promise<unknown>)
  return p
}

/** Hooks para counters desde el caller (cache hit, 429, error, request global). */
export function noteRequest(): void {
  _counters.total_requests += 1
}
export function noteCacheHit(): void {
  _counters.total_cache_hits += 1
}
export function noteRateLimited429(): void {
  _counters.total_rate_limited_429 += 1
  _counters.last_429_at = Date.now()
}
export function noteError(): void {
  _counters.total_errors += 1
}

// ─────────────────────────────────────────────────────────────────────────
// Retry con backoff exponencial (jitter) — para 429/5xx
// ─────────────────────────────────────────────────────────────────────────

/** Resultado interpretable de una llamada que puede ser reintentable. */
export interface RetriableResult {
  ok: boolean
  /** Si la llamada falló de forma RECUPERABLE (429/5xx). */
  retryable?: boolean
}

export interface RetryOpts {
  /** Nº máximo de reintentos (default 3). El intento 0 cuenta como el 1º. */
  maxRetries?: number
  /** Backoff base ms (default 1000). */
  baseMs?: number
  /** Multiplicador (default 2). */
  factor?: number
  /** Jitter ±% sobre el delay (default 0.3 → ±30%). */
  jitter?: number
}

/**
 * Calcula el delay del intento `attempt` (0..N) con backoff exp + jitter.
 * Puro: testeable con `rng` inyectado.
 */
export function backoffDelayMs(
  attempt: number,
  opts: RetryOpts = {},
  rng: () => number = Math.random,
): number {
  const base = opts.baseMs ?? 1_000
  const factor = opts.factor ?? 2
  const jitter = opts.jitter ?? 0.3
  const raw = base * Math.pow(factor, attempt)
  const j = 1 + (rng() * 2 - 1) * jitter // [1-jitter, 1+jitter]
  return Math.max(50, Math.round(raw * j))
}

/**
 * Ejecuta `fn` con reintentos en caso de `result.retryable === true`. Pensado
 * para envolver `solrFetch`: el caller marca el resultado como retryable si fue
 * 429 o 5xx. Si tras todos los reintentos sigue fallando, devuelve el último
 * resultado (no lanza). El sleep es awaitable y no excede 30s en total.
 */
export async function withRetry<T extends RetriableResult>(
  fn: () => Promise<T>,
  opts: RetryOpts = {},
): Promise<T> {
  const maxRetries = Math.max(1, opts.maxRetries ?? 3)
  let last: T | null = null
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    last = await fn()
    if (last.ok || !last.retryable) return last
    if (attempt < maxRetries - 1) {
      const delay = backoffDelayMs(attempt, opts)
      await sleep(delay)
    }
  }
  return last as T
}

// ─────────────────────────────────────────────────────────────────────────
// Telemetría exportable (consumida por /api/health/iati-usage)
// ─────────────────────────────────────────────────────────────────────────

/** Snapshot del estado del rate-limiter (solo server-side; no exponer cliente). */
export interface IatiUsageStats {
  config: RateLimitConfig
  counters: typeof _counters
  /** Llamadas reales en la ventana 1s / 60s. */
  window: {
    calls_last_1s: number
    calls_last_60s: number
  }
  /** Tamaño actual del set de in-flight. */
  inflight_count: number
}

/** Devuelve un snapshot del uso interno IATI. NO incluye la API key. */
export function getIatiUsageStats(): IatiUsageStats {
  const now = Date.now()
  purgeOldTimestamps(now)
  const oneSecAgo = now - 1_000
  let s = 0
  for (let i = _callTimestamps.length - 1; i >= 0; i--) {
    if (_callTimestamps[i] >= oneSecAgo) s++
    else break
  }
  return {
    config: getConfig(),
    counters: { ..._counters },
    window: {
      calls_last_1s: s,
      calls_last_60s: _callTimestamps.length,
    },
    inflight_count: _inflight.size,
  }
}
