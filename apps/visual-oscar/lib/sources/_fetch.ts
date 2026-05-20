/**
 * Helper común para fetches con timeout, abort controller y cabeceras estándar.
 * Unifica el patrón duplicado entre risk-feeds.ts y maldita.ts.
 */

const DEFAULT_TIMEOUT_MS = 8000

export interface TimedFetchOptions {
  timeoutMs?: number
  revalidate?: number                          // Next.js cache · segundos
  headers?: Record<string, string>
  method?: string
  body?: BodyInit
  cache?: RequestCache
}

export interface TimedFetchResult<T> {
  ok: boolean
  data?: T
  error?: string
  status?: number
  latency_ms: number
}

/** Fetch nativo con AbortController · garantiza limpieza del timer en finally. */
export async function timedFetch(url: string, opts: TimedFetchOptions = {}): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const init: RequestInit = {
      signal: ctrl.signal,
      method: opts.method,
      body: opts.body,
      cache: opts.cache,
      headers: {
 'User-Agent': 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)',
        ...opts.headers,
      },
    }
    if (opts.revalidate != null) (init as RequestInit & { next?: { revalidate: number } }).next = { revalidate: opts.revalidate }
    return await fetch(url, init)
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch + parse + envolver en TimedFetchResult · nunca lanza · siempre devuelve {ok,data,error,latency_ms}. */
export async function safeJSON<T>(url: string, opts: TimedFetchOptions = {}): Promise<TimedFetchResult<T>> {
  const t0 = Date.now()
  try {
    const res = await timedFetch(url, { ...opts, headers: { Accept: 'application/json', ...opts.headers } })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, status: res.status, latency_ms: Date.now() - t0 }
    const data = (await res.json()) as T
    return { ok: true, data, latency_ms: Date.now() - t0 }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown', latency_ms: Date.now() - t0 }
  }
}

/** Fetch + text() para feeds RSS/XML · igual semántica que safeJSON pero string. */
export async function safeText(url: string, opts: TimedFetchOptions = {}): Promise<TimedFetchResult<string>> {
  const t0 = Date.now()
  try {
    const res = await timedFetch(url, {
      ...opts,
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml',
        ...opts.headers,
      },
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, status: res.status, latency_ms: Date.now() - t0 }
    const data = await res.text()
    return { ok: true, data, latency_ms: Date.now() - t0 }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown', latency_ms: Date.now() - t0 }
  }
}

/**
 * Cache en memoria simple con TTL + single-flight para evitar duplicar fetches
 * concurrentes. Las funciones serverless de Vercel reutilizan instancias
 * durante varios minutos · este cache aprovecha esa ventana.
 */
export function memoCache<T>(ttlMs: number) {
  let cached: { value: T; expires: number } | null = null
  let inflight: Promise<T> | null = null

  return async function memoized(producer: () => Promise<T>): Promise<T> {
    if (cached && Date.now() < cached.expires) return cached.value
    if (inflight) return inflight
    inflight = (async () => {
      try {
        const value = await producer()
        cached = { value, expires: Date.now() + ttlMs }
        return value
      } finally {
        inflight = null
      }
    })()
    return inflight
  }
}

/** Helper · convierte cualquier string de fecha a ISO seguro · null en error. */
export function safeISO(s: string | undefined | null): string {
  if (!s) return new Date().toISOString()
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString()
}

/** Clamp numérico con guard contra NaN/Infinity. */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
