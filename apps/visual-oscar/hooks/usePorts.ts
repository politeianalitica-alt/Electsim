'use client'

import { useApi } from '@/lib/useApi'
import type {
  PortCatalogResponse,
  VesselsCatalogResponse,
  SnapshotAllResponse,
  PortSnapshot,
  PortVesselsResponse,
  PortCallsResponse,
  PortCongestionResponse,
  VesselPosition,
  VesselTrackResponse,
  BilateralTradeResponse,
  SpainFlowsResponse,
  TopPartnersResponse,
  FreightSnapshotResponse,
  FreightPriceResponse,
  ChokepointsListResponse,
  ChokepointRisk,
  SanctionsScreenResult,
  DataSourcesStatusResponse,
} from '@/types/ports'

const HOUR = 60 * 60 * 1000
const HALF_HOUR = 30 * 60 * 1000
// Live data tier: snapshot, vessels y screening tienen TTL más cortos para
// reflejar mejor el estado real (AIS, congestión, sanciones)
const FIVE_MIN = 5 * 60 * 1000
const MINUTE = 60 * 1000

export function usePortCatalog(country?: string, type_?: string, region?: string) {
  const qs = new URLSearchParams()
  if (country) qs.set('country', country)
  if (type_) qs.set('type_', type_)
  if (region) qs.set('region', region)
  const path = qs.toString() ? `/api/ports/catalog?${qs}` : '/api/ports/catalog'
  const { data, loading, error, refresh, isLive } = useApi<PortCatalogResponse>(path, {
    refreshInterval: HOUR,
  })
  return {
    items: data?.items ?? [],
    total: data?.n_items ?? 0,
    loading,
    error,
    refresh,
    isLive,
  }
}

export function useVesselCatalog() {
  const { data, loading, error, refresh } = useApi<VesselsCatalogResponse>(
    '/api/ports/catalog/vessels',
    { refreshInterval: HOUR },
  )
  return { items: data?.items ?? [], total: data?.n_items ?? 0, loading, error, refresh }
}

export function usePortSnapshotAll(limit = 40) {
  const path = `/api/ports/snapshot-all?limit=${limit}`
  // Tiempo real: congestión y arrivals cambian rápido en puertos · refresco 5m
  const { data, loading, error, refresh, isLive } = useApi<SnapshotAllResponse>(path, {
    refreshInterval: FIVE_MIN,
    refreshOnFocus: true,
  })
  return {
    items: data?.items ?? [],
    total: data?.n_items ?? 0,
    dataSource: data?.data_source,
    loading,
    error,
    refresh,
    isLive,
  }
}

export function usePort(slug: string | null) {
  const path = slug ? `/api/ports/${slug}` : '/api/ports/__none__'
  const { data, loading, error, refresh } = useApi<PortSnapshot>(path, {
    refreshInterval: HALF_HOUR,
  })
  return { data: slug ? data : undefined, loading, error, refresh }
}

export function usePortVessels(slug: string | null, limit = 50) {
  const path = slug ? `/api/ports/${slug}/vessels?limit=${limit}` : '/api/ports/__none__/vessels'
  // Vessels en zona portuaria · AIS · 1 min si está en LIVE, sino 5 min
  const { data, loading, error, refresh } = useApi<PortVesselsResponse>(path, {
    refreshInterval: MINUTE,
    refreshOnFocus: true,
  })
  return {
    vessels: (slug ? data?.items : undefined) ?? ([] as VesselPosition[]),
    dataSource: data?.data_source,
    loading,
    error,
    refresh,
  }
}

export function usePortCalls(slug: string | null, daysBack = 7, limit = 100) {
  const path = slug
    ? `/api/ports/${slug}/calls?days_back=${daysBack}&limit=${limit}`
    : '/api/ports/__none__/calls'
  const { data, loading, error, refresh } = useApi<PortCallsResponse>(path, {
    refreshInterval: HOUR,
  })
  return { calls: data?.items ?? [], loading, error, refresh }
}

export function usePortCongestion(slug: string | null, days = 30) {
  const path = slug
    ? `/api/ports/${slug}/congestion?days=${days}`
    : '/api/ports/__none__/congestion'
  const { data, loading, error, refresh } = useApi<PortCongestionResponse>(path, {
    refreshInterval: HOUR,
  })
  return { data: slug ? data : undefined, loading, error, refresh }
}

export function useVessel(imo: string | null) {
  const path = imo ? `/api/ports/vessels/${imo}` : '/api/ports/vessels/__none__'
  const { data, loading, error, refresh } = useApi<VesselPosition & Record<string, unknown>>(path, {
    refreshInterval: 10 * 60 * 1000,
  })
  return { data: imo ? data : undefined, loading, error, refresh }
}

export function useVesselTrack(imo: string | null, hours = 48, maxPoints = 100) {
  const path = imo
    ? `/api/ports/vessels/${imo}/track?hours=${hours}&max_points=${maxPoints}`
    : '/api/ports/vessels/__none__/track'
  const { data, loading, error, refresh } = useApi<VesselTrackResponse>(path, {
    refreshInterval: 10 * 60 * 1000,
  })
  return { data: imo ? data : undefined, loading, error, refresh }
}

export function useVesselSisters(imo: string | null) {
  const path = imo ? `/api/ports/vessels/${imo}/sisters` : '/api/ports/vessels/__none__/sisters'
  const { data, loading, error, refresh } = useApi<any>(path, {
    refreshInterval: 24 * HOUR,
  })
  return {
    items: imo ? (data?.items ?? []) : [],
    total: data?.n_items ?? 0,
    dataQuality: data?.data_quality,
    loading, error, refresh,
  }
}

export function useVesselAnomalies(imo: string | null) {
  const path = imo
    ? `/api/ports/vessels/${imo}/anomalies`
    : '/api/ports/vessels/__none__/anomalies'
  const { data, loading, error, refresh } = useApi<any>(path, {
    refreshInterval: HOUR,
  })
  return {
    items: imo ? (data?.items ?? []) : [],
    dataQuality: data?.data_quality,
    loading, error, refresh,
  }
}

export function useVesselFlagHistory(imo: string | null) {
  const path = imo
    ? `/api/ports/vessels/${imo}/flag-history`
    : '/api/ports/vessels/__none__/flag-history'
  const { data, loading, error, refresh } = useApi<any>(path, {
    refreshInterval: 24 * HOUR,
  })
  return {
    history: imo ? (data?.history ?? []) : [],
    currentFlag: data?.current_flag,
    loading, error, refresh,
  }
}

export function useVesselScreen(imo: string | null) {
  const path = imo ? `/api/ports/vessels/${imo}/screen` : '/api/ports/vessels/__none__/screen'
  const { data, loading, error, refresh } = useApi<SanctionsScreenResult>(path, {
    refreshInterval: HOUR,
  })
  return { data: imo ? data : undefined, loading, error, refresh }
}

export function useBilateralTrade(
  reporter: string | null,
  partner: string | null,
  hsCode?: string,
  period?: string,
  flow?: 'export' | 'import',
) {
  if (!reporter || !partner) {
    const fake = useApi<BilateralTradeResponse>('/api/ports/trade/bilateral?reporter=__none__', {
      refreshInterval: HOUR,
    })
    return { data: undefined, loading: false, error: null, refresh: fake.refresh }
  }
  const qs = new URLSearchParams({ reporter, partner })
  if (hsCode) qs.set('hs_code', hsCode)
  if (period) qs.set('period', period)
  if (flow) qs.set('flow', flow)
  const { data, loading, error, refresh } = useApi<BilateralTradeResponse>(
    `/api/ports/trade/bilateral?${qs}`,
    { refreshInterval: HOUR },
  )
  return { data, loading, error, refresh }
}

export function useSpainFlows(period?: string, flow?: 'export' | 'import', hsCode?: string) {
  const qs = new URLSearchParams()
  if (period) qs.set('period', period)
  if (flow) qs.set('flow', flow)
  if (hsCode) qs.set('hs_code', hsCode)
  const path = qs.toString()
    ? `/api/ports/trade/spain-flows?${qs}`
    : '/api/ports/trade/spain-flows'
  const { data, loading, error, refresh } = useApi<SpainFlowsResponse>(path, {
    refreshInterval: HOUR,
  })
  return { data, loading, error, refresh }
}

export function useTopPartners(reporter: string, flow: 'export' | 'import', limit = 10) {
  const path = `/api/ports/trade/top-partners?reporter=${reporter}&flow=${flow}&limit=${limit}`
  const { data, loading, error, refresh } = useApi<TopPartnersResponse>(path, {
    refreshInterval: HOUR,
  })
  return { items: data?.items ?? [], loading, error, refresh }
}

export function useFreightSnapshot() {
  const { data, loading, error, refresh } = useApi<FreightSnapshotResponse>(
    '/api/ports/freight/snapshot',
    { refreshInterval: HALF_HOUR },
  )
  return { items: data?.items ?? [], dataSource: data?.data_source, loading, error, refresh }
}

export function useFreightPrice(slug: string | null, range = '6mo') {
  const path = slug
    ? `/api/ports/freight/${slug}/price?range=${range}`
    : '/api/ports/freight/__none__/price'
  const { data, loading, error, refresh } = useApi<FreightPriceResponse>(path, {
    refreshInterval: HOUR,
  })
  return { data: slug ? data : undefined, loading, error, refresh }
}

export function useChokepoints(days = 30) {
  const { data, loading, error, refresh } = useApi<ChokepointsListResponse>(
    `/api/ports/chokepoints?days=${days}`,
    { refreshInterval: HOUR },
  )
  return { items: data?.items ?? [], loading, error, refresh }
}

export function useChokepoint(slug: string | null, days = 30) {
  const path = slug
    ? `/api/ports/chokepoints/${slug}?days=${days}`
    : '/api/ports/chokepoints/__none__'
  const { data, loading, error, refresh } = useApi<ChokepointRisk>(path, {
    refreshInterval: HOUR,
  })
  return { data: slug ? data : undefined, loading, error, refresh }
}


/**
 * Sprint 2 Fase C · terminales/tráfico/conectividad del puerto
 */
import type {
  PortTerminalsResponse,
  PortTrafficResponse,
  PortConnectivityResponse,
} from '@/types/ports'

export function usePortTerminals(slug: string | null) {
  const path = slug ? `/api/ports/${slug}/terminals` : '/api/ports/__none__/terminals'
  const { data, loading, error, refresh } = useApi<PortTerminalsResponse>(path, {
    refreshInterval: 24 * HOUR,
  })
  return {
    items: slug ? (data?.items ?? []) : [],
    total: data?.n_items ?? 0,
    dataQuality: data?.data_quality,
    loading,
    error,
    refresh,
  }
}

export function usePortTraffic(slug: string | null, months = 24) {
  const path = slug
    ? `/api/ports/${slug}/traffic?months=${months}`
    : '/api/ports/__none__/traffic'
  const { data, loading, error, refresh } = useApi<PortTrafficResponse>(path, {
    refreshInterval: HOUR,
  })
  return {
    items: slug ? (data?.items ?? []) : [],
    fromPeriod: data?.from_period,
    toPeriod: data?.to_period,
    dataQuality: data?.data_quality,
    loading,
    error,
    refresh,
  }
}

/**
 * Sprint 2 Fase D · navieras + rutas
 */
import type {
  ShippingLinesResponse,
  CarrierServicesResponse,
  RoutesResponse,
} from '@/types/ports'

export function useShippingLines(filters: { alliance?: string; trade?: string } = {}) {
  const qs = new URLSearchParams()
  if (filters.alliance) qs.set('alliance', filters.alliance)
  if (filters.trade) qs.set('trade', filters.trade)
  const path = qs.toString()
    ? `/api/ports/shipping-lines?${qs}`
    : '/api/ports/shipping-lines'
  const { data, loading, error, refresh } = useApi<ShippingLinesResponse>(path, {
    refreshInterval: 24 * HOUR,
  })
  return {
    items: data?.items ?? [],
    total: data?.n_items ?? 0,
    dataQuality: data?.data_quality,
    loading, error, refresh,
  }
}

export function useShippingLine(slug: string | null) {
  const path = slug
    ? `/api/ports/shipping-lines/${slug}`
    : '/api/ports/shipping-lines/__none__'
  const { data, loading, error, refresh } = useApi<any>(path, {
    refreshInterval: 24 * HOUR,
  })
  return { data: slug ? data : undefined, loading, error, refresh }
}

export function useCarrierServices(
  filters: { trade_lane?: string; line?: string; port?: string } = {},
) {
  const qs = new URLSearchParams()
  if (filters.trade_lane) qs.set('trade_lane', filters.trade_lane)
  if (filters.line) qs.set('line', filters.line)
  if (filters.port) qs.set('port', filters.port)
  const path = qs.toString()
    ? `/api/ports/carrier-services?${qs}`
    : '/api/ports/carrier-services'
  const { data, loading, error, refresh } = useApi<CarrierServicesResponse>(path, {
    refreshInterval: 6 * HOUR,
  })
  return {
    items: data?.items ?? [],
    total: data?.n_items ?? 0,
    dataQuality: data?.data_quality,
    loading, error, refresh,
  }
}

export function useShippingRoutes(
  filters: {
    origin?: string
    destination?: string
    trade_lane?: string
    chokepoint?: string
  } = {},
) {
  const qs = new URLSearchParams()
  if (filters.origin) qs.set('origin', filters.origin)
  if (filters.destination) qs.set('destination', filters.destination)
  if (filters.trade_lane) qs.set('trade_lane', filters.trade_lane)
  if (filters.chokepoint) qs.set('chokepoint', filters.chokepoint)
  const path = qs.toString()
    ? `/api/ports/routes?${qs}`
    : '/api/ports/routes'
  const { data, loading, error, refresh } = useApi<RoutesResponse>(path, {
    refreshInterval: 6 * HOUR,
  })
  return {
    items: data?.items ?? [],
    total: data?.n_items ?? 0,
    dataQuality: data?.data_quality,
    loading, error, refresh,
  }
}

export function usePortConnectivity(slug: string | null) {
  const path = slug ? `/api/ports/${slug}/connectivity` : '/api/ports/__none__/connectivity'
  const { data, loading, error, refresh } = useApi<PortConnectivityResponse>(path, {
    refreshInterval: 6 * HOUR,
  })
  return {
    items: slug ? (data?.items ?? []) : [],
    total: data?.n_items ?? 0,
    dataQuality: data?.data_quality,
    loading,
    error,
    refresh,
  }
}


export function usePortsDataSources() {
  const { data, loading, error, refresh } = useApi<DataSourcesStatusResponse>(
    '/api/ports/data-sources/status',
    { refreshInterval: 5 * 60 * 1000 },
  )
  return {
    status: data,
    items: data?.items ?? [],
    nLive: data?.n_live ?? 0,
    allLive: data?.all_live ?? false,
    anyLive: data?.any_live ?? false,
    loading,
    error,
    refresh,
  }
}
