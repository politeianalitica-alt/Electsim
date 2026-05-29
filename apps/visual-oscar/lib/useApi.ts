'use client'

/**
 * Hook ligero estilo SWR (sin dependencias externas) para consumir rutas
 * `/api/*` del proxy Next.js. Auto-refresh, revalidación al foco, expone
 * `source` y `warnings` desde `_meta`.
 *
 * NOTA: Para componentes nuevos, prefiere `useApiQuery` (React Query) en
 * `@/lib/api/use-api-query` — más robusto, con caché compartida y deduping.
 * Este hook se mantiene por retrocompatibilidad con las páginas existentes.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DataSource } from './api/types'

interface State<T> {
  data: T | undefined
  error: Error | null
  loading: boolean
  /** ISO timestamp del último fetch correcto. */
  updatedAt: string | null
  /** Origen real de los datos: 'backend' | 'mock' | 'fallback' | 'error'. */
  source: DataSource | null
  /** Avisos no fatales del proxy (backend_timeout, auth_failed, etc.). */
  warnings: string[] | null
  /** Latencia del backend, si la propagó el proxy. */
  latencyMs: number | null
  /** True si la respuesta llegó del backend real. */
  isLive: boolean
  /** Forzar nuevo fetch. */
  refresh: () => void
}

interface Options<T> {
  initialData?: T
  /** Intervalo de auto-refresh en ms · 0 desactiva. Default 30s. */
  refreshInterval?: number
  /** Refrescar al volver el foco. Default true. */
  refreshOnFocus?: boolean
  /** Cabeceras extra. */
  headers?: Record<string, string>
}

export function useApi<T = unknown>(path: string, opts: Options<T> = {}): State<T> {
  const { initialData, refreshInterval = 30_000, refreshOnFocus = true, headers } = opts
  const [data, setData] = useState<T | undefined>(initialData)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [source, setSource] = useState<DataSource | null>(null)
  const [warnings, setWarnings] = useState<string[] | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const aliveRef = useRef(true)

  // silent=true en los refrescos automáticos (intervalo/foco): NO tocan `loading`,
  // así la UI mantiene los datos visibles y no parpadea cada pocos segundos.
  const fetcher = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch(path, {
        cache: 'no-store',
        headers: { Accept: 'application/json', ...(headers ?? {}) },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!aliveRef.current) return
      const meta =
        json && typeof json === 'object' && '_meta' in json
          ? (json as { _meta: { source: DataSource; ts: string; warnings?: string[]; latency_ms?: number } })._meta
          : null
      setData(json as T)
      setUpdatedAt(meta?.ts || new Date().toISOString())
      setSource(meta?.source ?? 'backend')
      setWarnings(meta?.warnings ?? null)
      setLatencyMs(meta?.latency_ms ?? null)
      setError(null)
    } catch (e: unknown) {
      if (!aliveRef.current) return
      setError(e instanceof Error ? e : new Error(String(e)))
      setSource('error')
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [path, headers])

  useEffect(() => {
    aliveRef.current = true
    fetcher()
    let interval: ReturnType<typeof setInterval> | undefined
    if (refreshInterval > 0) interval = setInterval(() => fetcher(true), refreshInterval)
    function onFocus() { fetcher(true) }
    if (refreshOnFocus && typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus)
    }
    return () => {
      aliveRef.current = false
      if (interval) clearInterval(interval)
      if (refreshOnFocus && typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus)
      }
    }
  }, [fetcher, refreshInterval, refreshOnFocus])

  return {
    data,
    error,
    loading,
    updatedAt,
    source,
    warnings,
    latencyMs,
    isLive: source === 'backend' || source === 'live',
    refresh: () => { fetcher() },
  }
}
