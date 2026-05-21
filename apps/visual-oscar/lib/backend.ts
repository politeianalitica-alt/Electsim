/**
 * Helper server-side para hablar con el backend FastAPI desde Next.js route
 * handlers.
 *
 * Devuelve { data, error } separados — los callers deciden si caer a mock o
 * propagar el fallo. Antes devolvía `null` y se enmascaraban errores.
 *
 * Configuración en Vercel:
 *   BACKEND_URL = https://tu-fastapi.com   (sin slash final)
 *   BACKEND_TIMEOUT_MS = 8000              (opcional, default 8s)
 *   BACKEND_API_KEY = sk-xxx               (opcional, header X-API-Key)
 */

const getBackend = () =>
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.POLITEIA_API_URL ||
 ''
const getTimeout = () => Number(process.env.BACKEND_TIMEOUT_MS || 8000)
const getApiKey = () => process.env.BACKEND_API_KEY || ''

export const backendConfigured = (): boolean => Boolean(getBackend())
export const backendUrl = (): string => getBackend()

type BackendResult<T> = {
  data: T | null
  error: string | null
  status: number | null
  latency_ms: number
}

/**
 * Llama al backend. Devuelve `{ data, error, status, latency_ms }`.
 *  - `data === null` significa fallo (revisar `error` y `status`)
 *  - `error === null` cuando llegó respuesta válida (incluso 200 con `data` válido)
 */
export async function callBackend<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<BackendResult<T>> {
  const BACKEND = getBackend()
  const TIMEOUT_MS = getTimeout()
  const API_KEY = getApiKey()
  const t0 = Date.now()
  if (!BACKEND) {
    return { data: null, error: 'backend_url_not_configured', status: null, latency_ms: 0 }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const headers: Record<string, string> = {
    Accept: 'application/json',
 'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (API_KEY) headers['X-API-Key'] = API_KEY
  // Honra `init.cache` y `init.next.revalidate` del caller — si no los han
  // pasado, defaultea a no-store. Antes se forzaba `cache: 'no-store'` tras
  // el spread, lo que invalidaba ISR/revalidate en cualquier consumer
  // (BrainPanel, listas de tools del brain, etc.).
  const _initCache = (init as RequestInit).cache
  const _initNext = (init as RequestInit & { next?: { revalidate: number } }).next
  const _shouldDefaultNoStore = _initCache === undefined && _initNext === undefined
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
      ...(_shouldDefaultNoStore ? { cache: 'no-store' as RequestCache } : {}),
    })
    const latency_ms = Date.now() - t0
    if (!res.ok) {
      return {
        data: null,
        error: `backend_status_${res.status}`,
        status: res.status,
        latency_ms,
      }
    }
    if (res.status === 204) {
      return { data: null, error: null, status: 204, latency_ms }
    }
    const json = (await res.json()) as T
    return { data: json, error: null, status: res.status, latency_ms }
  } catch (e: unknown) {
    const latency_ms = Date.now() - t0
    const msg = e instanceof Error ? e.message : String(e)
    const isAbort = msg.includes('abort') || (e instanceof DOMException && e.name === 'AbortError')
    return {
      data: null,
      error: isAbort ? 'backend_timeout' : `backend_unreachable:${msg.slice(0, 80)}`,
      status: null,
      latency_ms,
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Wrapper retrocompatible: devuelve sólo `data` o `null`. Mantenido para no
 * romper las 100+ route handlers existentes que ya lo usan.
 *
 * Nuevas rutas: usar `callBackend()` para tener warnings/status.
 */
export async function fromBackend<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T | null> {
  const result = await callBackend<T>(path, init)
  return result.data
}

// ─────────────────────────────────────────────────────────────────────────────
//  withMeta — añade `_meta` estándar a la respuesta del proxy
// ─────────────────────────────────────────────────────────────────────────────

export type ProxySource = 'backend' | 'live' | 'mock' | 'fallback' | 'error'

export interface ProxyMeta {
  source: ProxySource
  ts: string
  warnings?: string[]
  latency_ms?: number
}

export function withMeta<T extends object>(
  data: T,
  source: ProxySource,
  extra: Partial<Omit<ProxyMeta, 'source' | 'ts'>> = {},
): T & { _meta: ProxyMeta } {
  return {
    ...data,
    _meta: {
      source,
      ts: new Date().toISOString(),
      ...extra,
    },
  }
}

/**
 * Atajo para construir respuesta consistente desde un BackendResult.
 * Si data llegó, devuelve source=backend. Si no, usa el fallback con warnings.
 */
export function proxyResponse<T extends object>(
  result: BackendResult<T>,
  fallback: T,
  options: { source?: ProxySource } = {},
): T & { _meta: ProxyMeta } {
  if (result.data) {
    return withMeta(result.data, 'backend', { latency_ms: result.latency_ms })
  }
  const warnings: string[] = []
  if (result.error) warnings.push(result.error)
  return withMeta(fallback, options.source ?? 'mock', { warnings, latency_ms: result.latency_ms })
}
