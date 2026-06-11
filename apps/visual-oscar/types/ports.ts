/**
 * Tipos del módulo Puertos & Comercio Global.
 *
 * Espejo de los payloads que devuelve `/api/v1/ports/*` en FastAPI.
 */

/**
 * Trazabilidad de calidad de dato · embebido en TODAS las respuestas.
 * El frontend pinta un badge LIVE/CACHE/SEED/SYNTH/MISSING basado en
 * `source_type`. Permite al usuario distinguir KPIs reales de seeds o
 * estimaciones sintéticas sin perder el contexto visual.
 */
export type DataQualitySource = 'live' | 'cache' | 'seed' | 'synthetic' | 'missing'

export interface DataQuality {
  source_type: DataQualitySource
  source_name: string         // ej. 'AISStream', 'UN Comtrade', 'World Bank', 'seed catálogo'
  retrieved_at?: string       // ISO timestamp (live/cache) cuando aplique
  confidence_score?: number   // 0..1 · estimación interna
  note?: string               // contexto adicional para el tooltip
}

export interface WithQuality {
  data_quality?: DataQuality
}

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

/**
 * Top operadores que recalan en un puerto · shape canónico unificado
 * frontend ↔ backend (apps/visual-oscar/components/ports/[port]/page.tsx
 * + etl/sources/ports/port_intel.py:compute_top_operators).
 */
export interface PortTopOperator {
  name: string
  n_vessels: number
  calls?: number // opcional · derivado de port_call_events cuando AIS está activo
}

export interface PortSnapshot extends WithQuality {
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
  top_operators?: PortTopOperator[]
  cargo_mix?: Array<{ cargo: string; pct: number }>
  data_source: string
}

export interface SnapshotAllResponse extends WithQuality {
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
    vessels_anchored: number | null
    arrivals_24h: number | null
    congestion_pct: number | null
    data_quality?: DataQuality
    available?: boolean
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

export interface FreightIndex extends WithQuality {
  slug: string
  name: string
  unit: string
  category: 'dry_bulk' | 'tanker' | 'container'
  last_price: number | null
  change_pct: number | null
  signal: FreightSignal
  yahoo_ticker?: string | null
}

export interface FreightSnapshotResponse extends WithQuality {
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

export interface ChokepointRisk extends WithQuality {
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
  documentation_url?: string | null // URL de la doc oficial de la API/fuente
  last_sync_at?: string | null       // ISO timestamp del último fetch/refresh
  coverage_label?: string | null     // ej. 'Global · 48 puertos'
  update_frequency?: string | null   // ej. 'Tiempo real', 'Diario', 'Mensual'
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

// ─────────────────────────────────────────────────────────────────
// Sprint 2 · capas estructurales (espejo de migración 0080)
// ─────────────────────────────────────────────────────────────────

/**
 * Terminal específico dentro de un puerto · operador, calado, concesión.
 *
 * Algeciras puede tener: APMT, TTI Algeciras, CSP Iberian Valencia Terminal…
 * Cada uno con su operador (Maersk APMT, Hutchison, COSCO), capacidad TEU
 * propia, año de fin de concesión, y conexión ferroviaria.
 */
export interface PortTerminal extends WithQuality {
  id: number
  port_slug: string
  terminal_name: string
  operator_name?: string | null
  operator_lei?: string | null
  type: PortType
  lat?: number | null
  lon?: number | null
  capacity_teu?: number | null
  capacity_tonnes?: number | null
  berths_count?: number | null
  max_draft_m?: number | null
  quay_length_m?: number | null
  reefer_plugs?: number | null
  rail_access?: boolean | null
  concession_end_year?: number | null
  source?: string | null
}

/**
 * Serie mensual de tráfico portuario · TEU, toneladas, ro-ro, pasajeros…
 *
 * Una fila por (port_slug, period_ym=YYYY-MM, source). Permite series
 * temporales de hasta N años para comparar tendencias inter-puerto.
 */
export interface PortMonthlyTraffic extends WithQuality {
  id: number
  port_slug: string
  period_ym: string // 'YYYY-MM'
  teu_total?: number | null
  teu_full?: number | null
  teu_empty?: number | null
  teu_transshipment?: number | null
  tonnes_total?: number | null
  tonnes_liquid_bulk?: number | null
  tonnes_solid_bulk?: number | null
  tonnes_general_cargo?: number | null
  tonnes_roro?: number | null
  vehicles_units?: number | null
  passengers?: number | null
  cruise_passengers?: number | null
  fishing_tonnes?: number | null
  source: string
}

/**
 * Naviera global · Maersk, MSC, CMA CGM, COSCO, Hapag-Lloyd…
 *
 * `alliance` agrupa las alianzas (2M, OCEAN, THE). `sanctions_risk` indica
 * exposure a sanciones internacionales (Russian beneficial owners etc.).
 */
export interface ShippingLine extends WithQuality {
  id: number
  slug: string
  name: string
  parent_company?: string | null
  country_iso?: string | null
  lei?: string | null
  website?: string | null
  alliance?: '2M' | 'OCEAN' | 'THE' | 'standalone' | string | null
  main_trades?: string[] | null
  fleet_size?: number | null
  fleet_teu?: number | null
  sanctions_risk?: 'none' | 'monitor' | 'sanctioned' | null
  notes?: string | null
  source?: string | null
  updated_at?: string | null
}

/**
 * Servicio concreto de una naviera · FAL-1 (Asia-Europa), TP-9 (transpacífico)…
 *
 * `port_rotation` es la lista ordenada de escalas que el servicio realiza
 * semanalmente. `main_chokepoints` lista los corredores críticos que cruza.
 */
export interface CarrierServicePortStop {
  port_slug: string
  order: number
  dwell_days?: number
}

export interface CarrierService extends WithQuality {
  id: number
  service_code: string
  service_name: string
  shipping_line_slug?: string | null
  alliance?: string | null
  trade_lane: 'asia_eu' | 'transpac' | 'transatlantic' | 'intra_eu' | 'me_eu' | 'intra_asia' | string
  frequency_days?: number | null
  port_rotation?: CarrierServicePortStop[] | null
  estimated_transit_days?: number | null
  vessel_class?: 'ULCV' | 'VLCS' | 'NPX' | 'FMX' | 'sub_pmx' | string | null
  avg_capacity_teu?: number | null
  main_chokepoints?: string[] | null
  active: boolean
  source?: string | null
  updated_at?: string | null
}

/**
 * Ruta marítima agregada · una dirección concreta de un servicio.
 * Algeciras → Shanghai vía Suez, weekly, transit 28 días.
 */
export interface ShippingRoute extends WithQuality {
  id: number
  route_name: string
  carrier_service_id?: number | null
  origin_port_slug: string
  destination_port_slug: string
  via_chokepoints?: string[] | null
  distance_nm?: number | null
  transit_days?: number | null
  weekly_frequency?: number | null
  risk_score?: number | null // 0..100 derivado de chokepoint + ACLED
  source?: string | null
}

/**
 * Leg específico de una ruta · subdivide una ruta multi-call en pares
 * origen→destino para análisis fino (qué legs pasan por Bab el-Mandeb).
 */
export interface RouteLeg {
  route_id: number
  leg_order: number
  origin_port_slug: string
  destination_port_slug: string
  distance_nm?: number | null
  transit_days?: number | null
  chokepoint_exposure?: string[] | null
}

/**
 * Conectividad bilateral entre puertos · matriz derivada de carrier_services.
 *
 * Para responder: "¿Qué navieras conectan Algeciras con Shanghai?"
 * y "¿Cuántas escalas semanales hay Valencia → New York?"
 */
export interface PortConnectivity {
  id: number
  port_slug: string
  connected_port_slug: string
  shipping_line_slug?: string | null
  service_code?: string | null
  weekly_calls?: number | null
  avg_transit_days?: number | null
  direction?: 'origin' | 'destination' | 'transit' | null
  cargo_type?: string | null
  source?: string | null
  last_seen?: string | null
}

/**
 * Ficha maestra de buque · promoción de `vessels_seed.py` a tabla persistente.
 *
 * Incluye banderas históricas (`flag_history`) para detectar flag-of-convenience
 * shopping, y `sanctions_status` para screening OFAC/EU/UN.
 */
export interface VesselFlagHistoryEntry {
  flag: string
  since: string
  until?: string | null
}

export interface VesselMaster extends WithQuality {
  imo: string
  mmsi?: string | null
  name_current: string
  names_previous?: string[] | null
  type?: string | null
  subtype?: string | null
  dwt?: number | null
  gt?: number | null
  nt?: number | null
  teu_capacity?: number | null
  loa_m?: number | null
  beam_m?: number | null
  draft_max_m?: number | null
  year_built?: number | null
  builder?: string | null
  flag_current?: string | null
  flag_history?: VesselFlagHistoryEntry[] | null
  owner_name?: string | null
  owner_lei?: string | null
  beneficial_owner?: string | null
  manager?: string | null
  charterer?: string | null
  class_society?: string | null
  pni_club?: string | null
  sanctions_status?: 'clear' | 'monitor' | 'listed' | null
  sanctions_evidence?: Record<string, unknown> | null
  emissions_cii?: 'A' | 'B' | 'C' | 'D' | 'E' | null
  emissions_eexi?: number | null
  last_seen_at?: string | null
  source?: string | null
}

/**
 * Observación trazable · una afirmación sobre una entidad con su procedencia.
 *
 * `entity_id='algeciras'`, `field_name='annual_teu_actual'`, `value=5400000`,
 * `source_name='Puertos del Estado'`, `source_url='https://puertos.es/…'`,
 * `confidence_score=0.95`. Permite explicar al usuario CÓMO sabemos cada KPI.
 */
export interface SourceObservation {
  id: number
  entity_type: 'port' | 'vessel' | 'route' | 'trade_flow' | 'company' | 'terminal' | string
  entity_id: string
  field_name: string
  value: unknown
  source_name: string
  source_url?: string | null
  source_date?: string | null // ISO date
  retrieved_at: string // ISO datetime
  confidence_score?: number | null
  is_synthetic: boolean
  is_estimated: boolean
  notes?: string | null
}

/** Responses estandarizados para los nuevos endpoints */
export interface PortTerminalsResponse extends WithQuality {
  port_slug: string
  n_items: number
  items: PortTerminal[]
}

export interface PortTrafficResponse extends WithQuality {
  port_slug: string
  from_period?: string | null
  to_period?: string | null
  n_items: number
  items: PortMonthlyTraffic[]
}

export interface ShippingLinesResponse extends WithQuality {
  n_items: number
  items: ShippingLine[]
}

export interface CarrierServicesResponse extends WithQuality {
  n_items: number
  items: CarrierService[]
}

export interface RoutesResponse extends WithQuality {
  n_items: number
  items: ShippingRoute[]
}

export interface PortConnectivityResponse extends WithQuality {
  port_slug: string
  n_items: number
  items: PortConnectivity[]
}
