/**
 * Cliente HTTP tipado para visual-oscar.
 *
 * Arquitectura:
 *   - Componentes cliente (`'use client'`) llaman a `apiClient.get('/api/...')`
 *     que hace fetch al proxy Next.js local (`app/api/[path]/route.ts`).
 *   - El proxy server-side (`lib/backend.ts:fromBackend`) llama al FastAPI real.
 *   - Toda respuesta incluye `_meta: { source, ts, warnings? }` para que la UI
 *     pueda distinguir backend real vs. fallback vs. error.
 *
 * Para llamadas server-side desde route handlers, usar `lib/backend.ts`
 * directamente (no este cliente).
 */

import type { ResponseMeta, WithMeta } from './types'

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
    this.name = 'ApiError'
  }
}

interface RequestOptions extends RequestInit {
  /** Timeout en ms. Default 15000 (15s). */
  timeoutMs?: number
  /** Si true, no propaga errores: devuelve { data: null, meta: { source: 'error' } }. */
  swallow?: boolean
}

/** Resultado tipado de cada request — separa data y meta para UI honesta. */
export interface ApiResult<T> {
  data: T
  meta: ResponseMeta
  /** True si llegó de backend real. */
  isLive: boolean
  /** Mensaje de error si lo hubo (para banners). */
  error?: string
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Extrae meta y data limpia de una respuesta con `_meta`. */
function splitMeta<T>(json: unknown): { data: T; meta: ResponseMeta } {
  if (json && typeof json === 'object' && '_meta' in json) {
    const { _meta, ...rest } = json as Record<string, unknown> & { _meta: ResponseMeta }
    return { data: rest as T, meta: _meta }
  }
  // Respuesta sin meta: asumimos backend real, pero sin garantías.
  return {
    data: json as T,
    meta: { source: 'backend', ts: new Date().toISOString() },
  }
}

async function request<T>(path: string, init: RequestOptions = {}): Promise<ApiResult<T>> {
  const { timeoutMs = 15_000, swallow = false, ...rest } = init
  // Rutas relativas: van al proxy Next.js (same-origin /api/*).
  const url = path.startsWith('http') ? path : path
  try {
    const res = await fetchWithTimeout(
      url,
      {
        ...rest,
        headers: {
          Accept: 'application/json',
 'Content-Type': 'application/json',
          ...(rest.headers as Record<string, string> | undefined),
        },
        cache: 'no-store',
      },
      timeoutMs,
    )

    if (res.status === 204) {
      return { data: undefined as T, meta: { source: 'backend', ts: new Date().toISOString() }, isLive: true }
    }

    let json: unknown = null
    try { json = await res.json() } catch { /* response body might not be JSON */ }

    if (!res.ok) {
      const err = new ApiError(`API ${res.status}: ${path}`, res.status, json)
      if (swallow) {
        return {
          data: null as unknown as T,
          meta: { source: 'error', ts: new Date().toISOString(), warnings: [err.message] },
          isLive: false,
          error: err.message,
        }
      }
      throw err
    }

    const { data, meta } = splitMeta<T>(json)
    return { data, meta, isLive: meta.source === 'backend' }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (swallow) {
      return {
        data: null as unknown as T,
        meta: { source: 'error', ts: new Date().toISOString(), warnings: [msg] },
        isLive: false,
        error: msg,
      }
    }
    throw e
  }
}

export const apiClient = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
}

/**
 * Wrap defensive — wraps a Promise so that on error returns a fallback value
 * with mode 'error'. Use only when a component MUST render something.
 */
export async function safeFetch<T>(
  promise: Promise<ApiResult<T>>,
  fallback: T,
  label: string,
): Promise<ApiResult<T>> {
  try {
    return await promise
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    // eslint-disable-next-line no-console
    if (typeof console !== 'undefined') console.warn(`[safeFetch:${label}]`, msg)
    return {
      data: fallback,
      meta: { source: 'fallback', ts: new Date().toISOString(), warnings: [msg] },
      isLive: false,
      error: msg,
    }
  }
}

// Re-export para conveniencia
export type { ResponseMeta, WithMeta } from './types'
