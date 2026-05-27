/**
 * Nasdaq Data Link (ex-Quandl) · cliente TypeScript ligero.
 *
 * Cubre el free tier de Nasdaq Data Link, que incluye decenas de
 * datasets útiles para Politeia:
 *
 *   - OPEC/ORB                · precio cesta OPEP (USD/barril)
 *   - LBMA/GOLD               · fixing oficial Londres oro AM/PM
 *   - LBMA/SILVER             · fixing oficial Londres plata
 *   - FRED/GDP, FRED/UNRATE   · macro USA Federal Reserve
 *   - FRED/CPIAUCSL, FRED/DGS10
 *   - BIS/CRDT_GAP_RAT        · credit-to-GDP gap
 *   - QDL/WB (World Bank)     · indicadores cross-country
 *   - QDL/JODI                · energía global Joint Org Data Initiative
 *   - MULTPL/SP500_PE_RATIO   · Shiller P/E S&P 500 (sin key incluso)
 *
 * Docs: https://docs.data.nasdaq.com/
 * Free tier: 50 calls/día sin key, 300/10s con key.
 *
 * Política de la app: usamos NASDAQ_DATA_LINK_KEY si está definida
 * (entorno Vercel server-side · NUNCA expuesta al cliente). Si no
 * está, devolvemos `null` con `error: 'no_key'` para que el caller
 * muestre estado "needs_config" en lugar de fallar silenciosamente.
 */

const NDL_BASE = 'https://data.nasdaq.com/api/v3'

export interface NasdaqDataset {
  database: string         // ej. 'OPEC', 'FRED', 'LBMA'
  dataset: string          // ej. 'ORB', 'GDP', 'GOLD'
  rows?: number            // por defecto 100
  startDate?: string       // 'YYYY-MM-DD'
  endDate?: string         // 'YYYY-MM-DD'
  collapse?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
  /** order: 'asc' por defecto (oldest first) o 'desc' para latest first */
  order?: 'asc' | 'desc'
}

export interface NasdaqTimeSeriesPoint {
  date: string             // ISO 'YYYY-MM-DD'
  value: number            // 1ª columna numérica
  raw: any[]               // fila completa (date + columnas)
}

export interface NasdaqTimeSeriesResponse {
  ok: boolean
  database: string
  dataset: string
  name: string             // nombre humano del dataset
  description?: string
  frequency: string        // 'daily', 'monthly', etc.
  column_names: string[]
  unit?: string
  latest?: NasdaqTimeSeriesPoint
  points: NasdaqTimeSeriesPoint[]
  error?: string
  source_url: string
  fetched_at: string
}

/**
 * Descarga una serie temporal de Nasdaq Data Link.
 * Devuelve `{ ok: false, error }` si no hay key o el endpoint falla.
 */
export async function fetchNasdaqDataset(opts: NasdaqDataset): Promise<NasdaqTimeSeriesResponse> {
  const startedAt = new Date().toISOString()
  const apiKey = process.env.NASDAQ_DATA_LINK_KEY || ''
  const baseResp: NasdaqTimeSeriesResponse = {
    ok: false,
    database: opts.database,
    dataset: opts.dataset,
    name: `${opts.database}/${opts.dataset}`,
    frequency: 'unknown',
    column_names: [],
    points: [],
    source_url: `https://data.nasdaq.com/data/${opts.database}/${opts.dataset}`,
    fetched_at: startedAt,
  }

  if (!apiKey) {
    return {
      ...baseResp,
      error: 'no_key · configurar NASDAQ_DATA_LINK_KEY en env vars de Vercel server-side',
    }
  }

  const params = new URLSearchParams({ api_key: apiKey })
  if (opts.rows) params.set('limit', String(opts.rows))
  if (opts.startDate) params.set('start_date', opts.startDate)
  if (opts.endDate) params.set('end_date', opts.endDate)
  if (opts.collapse) params.set('collapse', opts.collapse)
  if (opts.order) params.set('order', opts.order)

  const url = `${NDL_BASE}/datasets/${opts.database}/${opts.dataset}/data.json?${params.toString()}`

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12_000)
    const r = await fetch(url, { signal: ctrl.signal })
    clearTimeout(t)
    if (!r.ok) {
      return {
        ...baseResp,
        error: `http_${r.status} · ${r.statusText}`,
      }
    }
    const json: any = await r.json()
    const dataset_data = json?.dataset_data
    if (!dataset_data) {
      return { ...baseResp, error: 'response_sin_dataset_data' }
    }

    const columns: string[] = Array.isArray(dataset_data.column_names) ? dataset_data.column_names : []
    const rows: any[][] = Array.isArray(dataset_data.data) ? dataset_data.data : []
    const points: NasdaqTimeSeriesPoint[] = rows.map((row) => {
      const date = typeof row[0] === 'string' ? row[0] : ''
      // Primera columna numérica tras la fecha
      const value = row.slice(1).find((c: any) => typeof c === 'number') ?? 0
      return { date, value, raw: row }
    }).filter((p) => p.date)

    return {
      ok: true,
      database: opts.database,
      dataset: opts.dataset,
      name: `${opts.database}/${opts.dataset}`,
      frequency: dataset_data.frequency || 'unknown',
      column_names: columns,
      latest: points[0],
      points,
      source_url: `https://data.nasdaq.com/data/${opts.database}/${opts.dataset}`,
      fetched_at: startedAt,
    }
  } catch (e: any) {
    return { ...baseResp, error: String(e?.message ?? e) }
  }
}

/** Catálogo curado de datasets útiles para el dashboard Politeia. */
export const NASDAQ_CURATED = {
  opec_oil: {
    database: 'OPEC',
    dataset: 'ORB',
    label: 'Precio cesta OPEP',
    unit: 'USD/barril',
    frequency: 'daily',
    use_case: 'Energía · sector energía España',
  },
  gold_lbma_am: {
    database: 'LBMA',
    dataset: 'GOLD',
    label: 'Oro fixing LBMA Londres',
    unit: 'USD/oz',
    frequency: 'daily',
    use_case: 'Activos refugio · macro internacional',
  },
  silver_lbma: {
    database: 'LBMA',
    dataset: 'SILVER',
    label: 'Plata fixing LBMA Londres',
    unit: 'USD/oz',
    frequency: 'daily',
    use_case: 'Commodities · industria',
  },
  fred_us_gdp: {
    database: 'FRED',
    dataset: 'GDP',
    label: 'PIB EEUU nominal',
    unit: 'USD billion',
    frequency: 'quarterly',
    use_case: 'Macro USA · spillover global',
  },
  fred_us_unemployment: {
    database: 'FRED',
    dataset: 'UNRATE',
    label: 'Tasa paro EEUU',
    unit: '%',
    frequency: 'monthly',
    use_case: 'Macro USA · ciclo económico',
  },
  fred_us_cpi: {
    database: 'FRED',
    dataset: 'CPIAUCSL',
    label: 'IPC EEUU (CPI All Urban Consumers)',
    unit: 'index',
    frequency: 'monthly',
    use_case: 'Inflación · expectativas Fed',
  },
  fred_us_10y_yield: {
    database: 'FRED',
    dataset: 'DGS10',
    label: 'Bono soberano EEUU 10 años',
    unit: '%',
    frequency: 'daily',
    use_case: 'Tipos largos · benchmark global',
  },
  bis_credit_gap_es: {
    database: 'BIS',
    dataset: 'CRDT_GAP_RAT',
    label: 'BIS credit-to-GDP gap',
    unit: '% (gap respecto tendencia)',
    frequency: 'quarterly',
    use_case: 'Riesgo sistémico bancario',
  },
  multpl_sp500_pe: {
    database: 'MULTPL',
    dataset: 'SP500_PE_RATIO_MONTH',
    label: 'S&P 500 PE Ratio (Shiller CAPE)',
    unit: 'ratio',
    frequency: 'monthly',
    use_case: 'Valoración bolsa USA · referencia mercados',
  },
} as const

export type NasdaqCuratedSlug = keyof typeof NASDAQ_CURATED
