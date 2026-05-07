'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

type State<T> = {
  data: T | undefined
  error: Error | null
  loading: boolean
  /** ISO timestamp del último fetch correcto */
  updatedAt: string | null
  /** 'backend' si la respuesta vino de la FastAPI real, 'mock' si fue fallback, null al inicio */
  source: 'backend' | 'mock' | null
  /** Forzar nuevo fetch */
  refresh: () => void
}

interface Options<T> {
  /** Datos iniciales mostrados antes del primer fetch (evita pantallas vacías) */
  initialData?: T
  /** Intervalo de auto-refresh en ms · 0 desactiva. Default: 30000 (30s) */
  refreshInterval?: number
  /** Refrescar al volver el foco a la pestaña. Default: true */
  refreshOnFocus?: boolean
}

/**
 * Hook ligero estilo SWR sin dependencias externas.
 * Hace fetch a `path` (relativo o absoluto), con auto-refresh y revalidación al foco.
 *
 * Las rutas `/api/*` son las que sirve el propio Next.js (proxy a FastAPI o mock).
 *
 *   const { data, source, updatedAt } = useApi('/api/intelligence/signals')
 */
export function useApi<T = unknown>(path: string, opts: Options<T> = {}): State<T> {
  const { initialData, refreshInterval = 30_000, refreshOnFocus = true } = opts
  const [data, setData] = useState<T | undefined>(initialData)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [source, setSource] = useState<'backend' | 'mock' | null>(null)
  const aliveRef = useRef(true)

  const fetcher = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(path, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!aliveRef.current) return
      // Si la respuesta lleva _meta lo extraemos.
      const meta = (json && typeof json === 'object' && '_meta' in json)
        ? (json as { _meta: { source: string; ts: string } })._meta
        : null
      setData(json as T)
      setUpdatedAt(meta?.ts || new Date().toISOString())
      setSource((meta?.source as 'backend' | 'mock') || null)
      setError(null)
    } catch (e: unknown) {
      if (!aliveRef.current) return
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [path])

  useEffect(() => {
    aliveRef.current = true
    fetcher()
    let interval: ReturnType<typeof setInterval> | undefined
    if (refreshInterval > 0) {
      interval = setInterval(fetcher, refreshInterval)
    }
    function onFocus() { fetcher() }
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

  return { data, error, loading, updatedAt, source, refresh: fetcher }
}
