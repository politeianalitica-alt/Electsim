'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'politeia.commodities.watchlist'
const DEFAULT_WATCHLIST = [
  'wheat_cbot',
  'corn_cbot',
  'soybeans_cbot',
  'palm_oil_klu',
  'olive_oil_es',
  'sugar_ny',
  'cocoa_ny',
  'brent_crude',
  'natgas_ttf',
  'gold_comex',
]

function safeRead(): string[] {
  if (typeof window === 'undefined') return DEFAULT_WATCHLIST
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_WATCHLIST
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')
      ? parsed
      : DEFAULT_WATCHLIST
  } catch {
    return DEFAULT_WATCHLIST
  }
}

function safeWrite(slugs: string[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  } catch {
    /* quota exceeded · ignorar */
  }
}

export function useCommodityWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(() => safeRead())

  useEffect(() => safeWrite(watchlist), [watchlist])

  const add = useCallback((slug: string) => {
    setWatchlist((prev) => (prev.includes(slug) ? prev : [...prev, slug]))
  }, [])

  const remove = useCallback((slug: string) => {
    setWatchlist((prev) => prev.filter((s) => s !== slug))
  }, [])

  const toggle = useCallback((slug: string) => {
    setWatchlist((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]))
  }, [])

  const reorder = useCallback((from: number, to: number) => {
    setWatchlist((prev) => {
      if (from < 0 || from >= prev.length || to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])

  const reset = useCallback(() => setWatchlist(DEFAULT_WATCHLIST), [])

  return { watchlist, add, remove, toggle, reorder, reset, includes: (s: string) => watchlist.includes(s) }
}
