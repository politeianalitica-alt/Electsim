'use client'

/**
 * useRagSearch — búsqueda semántica en el vector store (BOE, Congreso, EUR-Lex, medios).
 *
 * Devuelve `citations: RagCitation[]` con snippet + url + source que la UI
 * puede mostrar como tarjetas de "fuentes consultadas" debajo de la respuesta
 * del Brain.
 *
 * Uso:
 *   const { search, citations, isLive, isLoading } = useRagSearch()
 *   await search('reforma del IRPF rentas del capital')
 */

import { useCallback, useState } from 'react'
import type { DataSource } from '@/lib/api/types'
import type { RagCitation } from '@/app/api/rag/search/route'

interface State {
  citations: RagCitation[]
  query: string
  total: number
  source: DataSource | null
  warnings: string[] | null
  isLoading: boolean
  error: string | null
  latencyMs: number | null
}

interface SearchOptions {
  domains?: string[]
  k?: number
}

export function useRagSearch() {
  const [state, setState] = useState<State>({
    citations: [],
    query: '',
    total: 0,
    source: null,
    warnings: null,
    isLoading: false,
    error: null,
    latencyMs: null,
  })

  const search = useCallback(async (query: string, opts: SearchOptions = {}) => {
    if (!query || query.length < 2) {
      setState(s => ({ ...s, error: 'query_too_short' }))
      return
    }
    setState(s => ({ ...s, isLoading: true, error: null, query }))
    try {
      const res = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, domains: opts.domains, k: opts.k ?? 6 }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as {
        citations: RagCitation[]
        total: number
        query: string
        _meta?: { source: DataSource; warnings?: string[]; latency_ms?: number }
      }
      setState({
        citations: json.citations ?? [],
        query: json.query ?? query,
        total: json.total ?? 0,
        source: json._meta?.source ?? null,
        warnings: json._meta?.warnings ?? null,
        isLoading: false,
        error: null,
        latencyMs: json._meta?.latency_ms ?? null,
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setState(s => ({ ...s, isLoading: false, error: msg }))
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      citations: [],
      query: '',
      total: 0,
      source: null,
      warnings: null,
      isLoading: false,
      error: null,
      latencyMs: null,
    })
  }, [])

  return {
    ...state,
    isLive: state.source === 'backend',
    search,
    reset,
  }
}

export type { RagCitation }
