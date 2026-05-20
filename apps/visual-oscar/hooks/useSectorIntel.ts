'use client'

import { useApi } from '@/lib/useApi'
import type { SectorIntelKey, SectorIntelOverview } from '@/types/sector-intel'

const REFRESH_MS = 10 * 60_000

export function useSectorIntel(sector: SectorIntelKey | string) {
  const path = `/api/sector-intel/${encodeURIComponent(sector)}/overview`
  const { data, loading, error, refresh, updatedAt, isLive, source } =
    useApi<SectorIntelOverview>(path, { refreshInterval: REFRESH_MS })

  return {
    data,
    loading,
    error,
    refresh,
    updatedAt,
    isLive,
    source,
    isEmpty: !data || (data.headline_kpis.length === 0 && data.table.rows.length === 0),
  }
}
