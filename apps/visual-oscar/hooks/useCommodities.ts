'use client'

import { useApi } from '@/lib/useApi'
import type {
  Commodity,
  CommoditySnapshot,
  SnapshotAllResponse,
  PriceResponse,
  TechnicalResponse,
  ForecastResponse,
  RecipeMeta,
} from '@/types/commodities'

const HOUR = 60 * 60 * 1000

interface CatalogResp {
  n_items: number
  items: Commodity[]
}

export function useCommodityCatalog(category?: string) {
  const path = category
    ? `/api/commodities/catalog?category=${encodeURIComponent(category)}`
    : '/api/commodities/catalog'
  const { data, loading, error, refresh, updatedAt } = useApi<CatalogResp>(path, {
    refreshInterval: HOUR,
  })
  return {
    items: data?.items ?? [],
    total: data?.n_items ?? 0,
    loading,
    error,
    refresh,
    updatedAt,
  }
}

export function useCommoditySnapshot(category?: string, limit = 40) {
  const qs = new URLSearchParams()
  if (category) qs.set('category', category)
  qs.set('limit', String(limit))
  const path = `/api/commodities/snapshot-all?${qs.toString()}`
  const { data, loading, error, refresh, updatedAt, isLive } =
    useApi<SnapshotAllResponse>(path, { refreshInterval: 30 * 60 * 1000 })
  return {
    items: data?.items ?? [],
    total: data?.n_items ?? 0,
    fetchedAt: data?.fetched_at ?? null,
    loading,
    error,
    refresh,
    updatedAt,
    isLive,
  }
}

export function useCommodity(slug: string | null) {
  const path = slug ? `/api/commodities/${slug}` : ''
  const { data, loading, error, refresh } = useApi<CommoditySnapshot & { snapshot?: unknown }>(
    path || '/api/commodities/__none__',
    { refreshInterval: 30 * 60 * 1000 },
  )
  return { data: slug ? data : undefined, loading, error, refresh }
}

export function useCommodityPrice(slug: string | null, range = '1mo', interval = '1d') {
  const path = slug ? `/api/commodities/${slug}/price?range=${range}&interval=${interval}` : ''
  const { data, loading, error, refresh } = useApi<PriceResponse>(
    path || '/api/commodities/__none__/price',
    { refreshInterval: 30 * 60 * 1000 },
  )
  return { data: slug ? data : undefined, loading, error, refresh }
}

export function useCommodityTechnical(slug: string | null, range = '1y') {
  const path = slug ? `/api/commodities/${slug}/technical?range=${range}` : ''
  const { data, loading, error, refresh } = useApi<TechnicalResponse>(
    path || '/api/commodities/__none__/technical',
    { refreshInterval: HOUR },
  )
  return { data: slug ? data : undefined, loading, error, refresh }
}

export function useCommodityForecast(slug: string | null, horizon = 30) {
  const path = slug ? `/api/commodities/${slug}/forecast?horizon=${horizon}` : ''
  const { data, loading, error, refresh } = useApi<ForecastResponse>(
    path || '/api/commodities/__none__/forecast',
    { refreshInterval: HOUR },
  )
  return { data: slug ? data : undefined, loading, error, refresh }
}

interface RecipesResp {
  n_items: number
  items: RecipeMeta[]
}

export function useRecipes(sector?: string) {
  const path = sector
    ? `/api/commodities/recipes?sector=${encodeURIComponent(sector)}`
    : '/api/commodities/recipes'
  const { data, loading, error, refresh } = useApi<RecipesResp>(path, {
    refreshInterval: HOUR,
  })
  return { items: data?.items ?? [], loading, error, refresh }
}

export function useRecipe(slug: string | null) {
  const path = slug ? `/api/commodities/recipes/${slug}` : ''
  const { data, loading, error, refresh } = useApi<RecipeMeta>(
    path || '/api/commodities/recipes/__none__',
    { refreshInterval: HOUR },
  )
  return { data: slug ? data : undefined, loading, error, refresh }
}
