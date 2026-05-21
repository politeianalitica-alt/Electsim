/**
 * Tipos del módulo Puertos & Comercio Global.
 *
 * Espejo de los payloads que devuelve `/api/v1/ports/*` en FastAPI.
 */

/**
 * Tipo canónico de puerto · alineado con `etl/sources/ports/catalog.py:PORT_TYPES`.
 * 10 valores cubren todos los perfiles operativos.
 *
 * - container · terminales de TEU
 * - bulk · graneles sólidos (cereal, mineral, carbón)
 * - tanker · graneles líquidos (crudo, productos, químicos)
 * - lng · gas natural licuado
 * - roro · roll-on/roll-off (vehículos, trailers)
 * - cruise · pasaje de cruceros
 * - multipurpose · multi-tráfico sin especialización dominante
 * - chokepoint · anclaje vinculado a un corredor (Suez, Ormuz, etc.)
 * - energy · terminales energéticas no-LNG (refinería, eólica offshore base)
 * - fishing · puerto pesquero
 */
export type PortType =
  | 'container'
  | 'bulk'
  | 'tanker'
  | 'lng'
  | 'roro'
  | 'cruise'
  | 'multipurpose'
  | 'chokepoint'
  | 'energy'
  | 'fishing'

/**
 * Región canónica · inglés, alineado con `etl/sources/ports/catalog.py:CATEGORIES_PORTS`.
 * Aliases legacy (`espana`, `europa`, `asia_pacifico`, `norteamerica`,
 * `oriente_medio`, `es`, `eu`) se normalizan vía `lib/ports-utils.ts:normalizeRegion`.
 */
export type PortRegion =
  | 'spain'
  | 'europe'
  | 'asia_pacific'
  | 'north_america'
  | 'middle_east'
  | 'latin_america'
  | 'africa'
  | 'chokepoint'

export interface Port {
  slug: string
  unlocode: string
  name: string
  country_iso: string
  lat: number
  lon: number
  type: PortType
  region: PortRegion
  timezone?: string
  description?: string
}

export interface PortCatalogResponse {
  n_items: number
  items: Port[]
}

export interface Vessel {
  imo: string
  mmsi?: string | null
  name: string
  flag_iso: string
  type: string
  dwt?: number | null
  built_year?: number | null
  operator?: string | null
}

export interface VesselsCatalogResponse {
  n_items: number
  items: Vessel[]
}

export interface VesselPosition {
  imo: string
  name?: string
  mmsi?: string | null
  ts: string
  lat: number
  lon: number
  sog?: number | null
  cog?: number | null
  nav_status?: string | null
  draught?: number | null
  near_port_slug?: string | null
  flag_iso?: string
  type?: string
  operator?: string | null
}

export interface PortVesselsResponse {
  port_slug: string
  n_vessels: number
  data_source: 'aisstream' | 'synthetic' | 'cache'
  items: VesselPosition[]
}

export interface PortCall {
  imo: string
  vessel_name?: string
  arrival_ts: string
  departure_ts?: string | null
  duration_min?: number | null
  cargo_inferred?: string | null
  source_kind?: string
}

export interface PortCallsResponse {
  port_slug: string
  days_back: number
  n_items: number
  items: PortCall[]
}

export interface CongestionPoint {
  ts: string
  vessels_anchored: number
  arrivals_24h: number
}

export interface PortCongestionResponse {
  port_slug: string
  days: number
  current: {
    vessels_anchored: number
    arrivals_24h: number
    avg_wait_h?: number | null
    congestion_pct: number
  }
  series: CongestionPoint[]
  data_source: 'synthetic' | 'live'
}

export interface PortSnapshot {
  slug: string
  unlocode: string
  name: string
  country_iso: string
  lat: number
  lon: number
  type: PortType
  region: PortRegion
  kpis_24h: {
    vessels_anchored: number
    arrivals_24h: number
    congestion_pct: number
    avg_wait_h?: number | null
    teu_estimated?: number | null
  }
  top_operators?: Array<{ name: string; n_vessels: number }>
  cargo_mix?: Array<{ cargo: string; pct: number }>
  data_source: string
}

export interface SnapshotAllResponse {
  n_items: number
  data_source: string
  items: Array<{
    slug: string
    name: string
    country_iso: string
    region: PortRegion
    type: PortType
    lat: number
    lon: number
    vessels_anchored: number
    arrivals_24h: number
    congestion_pct: number
  }>
}

export interface VesselTrackResponse {
  imo: string
  vessel_name?: string
  hours: number
  n_points: number
  points: Array<{ ts: string; lat: number; lon: number; sog?: number | null }>
  data_source: 'aisstream' | 'synthetic'
}

export interface TradeFlow {
  reporter_iso: string
  partner_iso: string
  hs_code: string
  period_ym: string
  flow_kind: 'export' | 'import'
  value_usd: number
  qty?: number | null
  unit?: string | null
  source: 'comtrade' | 'comext'
}

export interface BilateralTradeResponse {
  ok: boolean
  reporter_iso: string
  partner_iso: string
  hs_code?: string | null
  period_ym?: string | null
  flow_kind?: string | null
  use_source: 'comtrade' | 'comext'
  n_items: number
  items: TradeFlow[]
}

export interface SpainFlowsResponse {
  ok: boolean
  reporter_iso: string
  period_ym?: string | null
  hs_code?: string | null
  flow_kind?: string | null
  n_items: number
  items: TradeFlow[]
}

export interface TopPartnersResponse {
  ok: boolean
  reporter_iso: string
  flow_kind: string
  period_ym?: string | null
  n_items: number
  items: Array<{
    partner_iso: string
    partner_name?: string
    value_usd: number
    share_pct: number
  }>
}

export type FreightSignal =
  | 'fuerte_subida'
  | 'subida'
  | 'estable'
  | 'bajada'
  | 'fuerte_bajada'

export interface FreightIndex {
  slug: string
  name: string
  unit: string
  category: 'dry_bulk' | 'tanker' | 'container'
  last_price: number
  change_pct: number
  signal: FreightSignal
  yahoo_ticker?: string | null
}

export interface FreightSnapshotResponse {
  n_items: number
  data_source: 'synthetic' | 'yahoo'
  items: FreightIndex[]
}

export interface FreightOHLC {
  ts: string
  open: number
  high: number
  low: number
  close: number
}

export interface FreightPriceResponse {
  slug: string
  name: string
  range: string
  n_points: number
  ohlc: FreightOHLC[]
  data_source: 'synthetic' | 'yahoo'
}

export interface ChokepointRisk {
  slug: string
  name: string
  region: string
  lat: number
  lon: number
  score_base: number
  risk_score: number
  risk_level: 'critico' | 'alto' | 'medio' | 'bajo' | 'minimo'
  n_events_30d?: number
  recent_events?: Array<{ ts: string; event_type: string; fatalities?: number; notes?: string }>
  data_source: 'acled' | 'synthetic' | 'mixed'
}

export interface ChokepointsListResponse {
  n_items: number
  items: ChokepointRisk[]
}

export interface SanctionsCheck {
  query: string
  type: 'vessel_name' | 'operator' | 'imo_direct'
  risk_score: number
  risk_level: 'CLEAR' | 'LOW' | 'MEDIUM' | 'HIGH'
  n_hits: number
}

export interface SanctionsScreenResult {
  ok: boolean
  imo: string
  vessel_name?: string
  operator?: string | null
  flag_iso?: string
  type?: string
  hit: boolean
  risk_score: number
  risk_level: 'CLEAR' | 'LOW' | 'MEDIUM' | 'HIGH'
  sources: Array<Record<string, unknown>>
  checks: SanctionsCheck[]
  error?: string
}

export interface DataSourceStatusItem {
  key: string
  label: string
  category: string
  live: boolean
  reason: string
  env_hint: string | null
}

export interface DataSourcesStatusResponse {
  n_sources: number
  n_live: number
  all_live: boolean
  any_live: boolean
  items: DataSourceStatusItem[]
}

export interface SanctionsBatchResponse {
  ok: boolean
  vessels: SanctionsScreenResult[]
  operators: Array<{
    ok: boolean
    operator: string
    risk_score: number
    risk_level: string
    hit: boolean
    sources: Array<Record<string, unknown>>
  }>
  summary: {
    n_vessels_checked: number
    n_vessels_hit: number
    n_operators_checked: number
    n_operators_hit: number
    any_hit: boolean
  }
}
