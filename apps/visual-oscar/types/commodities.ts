/**
 * Tipos del módulo Commodities (Vesper-style) · sincronizados con
 * api/routers/commodities.py.
 *
 * Diseño: 1:1 con el backend (FastAPI). Cualquier cambio aquí debe
 * reflejarse en api/routers/commodities.py y viceversa.
 */

export type CommodityCategory =
  | 'grains'
  | 'oils'
  | 'dairy'
  | 'softs'
  | 'meat'
  | 'energy'
  | 'metals'
  | 'freight'

export type TrendDirection = 'up' | 'down' | 'flat'

export type CommoditySignal =
  | 'compra_fuerte'
  | 'compra'
  | 'neutro'
  | 'venta'
  | 'venta_fuerte'

export interface Commodity {
  slug: string
  name: string
  category: CommodityCategory
  yahoo_ticker: string | null
  imf_code?: string
  unit: string
  exchange: string
  description?: string
}

export interface CommoditySnapshot extends Commodity {
  last_price: number | null
  change_pct: number | null
  currency?: string | null
  as_of?: string | null
  available?: boolean
}

export interface SnapshotAllResponse {
  n_items: number
  items: CommoditySnapshot[]
  fetched_at: string
}

export interface OHLCPoint {
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
}

export interface PriceResponse {
  slug: string
  name: string
  unit?: string
  exchange?: string
  ticker?: string
  currency?: string | null
  last_price?: number | null
  prev_close?: number | null
  change_pct?: number | null
  n_obs?: number
  ohlc: OHLCPoint[]
  error?: string | null
  available?: boolean
}

export interface TechnicalIndicators {
  n_obs: number
  sma20: number | null
  sma50: number | null
  sma200: number | null
  rsi14: number | null
  macd: number | null
  macd_signal: number | null
  macd_histogram: number | null
}

export interface TechnicalResponse {
  slug: string
  name: string
  last_price: number | null
  indicators: TechnicalIndicators
  signal: CommoditySignal
  error: string | null
}

export interface ForecastPoint {
  date: string
  value: number
  lower_80: number
  upper_80: number
  lower_95: number
  upper_95: number
}

export interface ForecastResponse {
  slug: string
  name?: string
  last_price?: number
  last_date?: string
  horizon: number
  model?: string
  accuracy_disclaimer?: string
  forecast: ForecastPoint[]
  available?: boolean
  error?: string
}

export interface RecipeIngredient {
  slug: string
  name?: string
  quantity: number
  unit?: string
}

export interface RecipeCostBreakdownLine {
  slug: string
  name: string
  quantity: number
  unit: string | null
  unit_price: number | null
  line_cost: number | null
  pct_of_total: number | null
}

export interface RecipeCostResponse {
  total_cost: number
  n_ingredients?: number
  breakdown: RecipeCostBreakdownLine[]
  missing_prices: string[]
  error: string | null
}

export interface RecipeSensitivityShock {
  slug: string
  base_unit_price: number
  impact_up_pct: number
  impact_down_pct: number
  range_pct: number
}

export interface RecipeSensitivityResponse {
  base_cost: number
  shock_pct: number
  shocks: RecipeSensitivityShock[]
  error: string | null
}

export interface RecipeMeta {
  slug: string
  name: string
  sector?: string | null
  currency?: string
  notes?: string | null
  ingredients?: RecipeIngredient[]
}

export interface CommodityAlertCondition {
  kind: 'price_above' | 'price_below' | 'change_pct'
  threshold: number
  period_days?: number
}

export interface CommodityAlert {
  id: string
  commodity_slug: string
  condition: CommodityAlertCondition
  channels: ('inapp' | 'email' | 'push')[]
  active: boolean
  last_triggered?: string | null
  created_at: string
}
