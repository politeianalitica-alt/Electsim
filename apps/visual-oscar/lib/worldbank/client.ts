/**
 * Cliente World Bank Open Data API
 *
 * API REST pública sin key:
 *   https://api.worldbank.org/v2/
 *
 * Indicators clave para Tab 3 Riesgo País (Sub-tab 3 Economía):
 *   - NY.GDP.MKTP.KD.ZG   · PIB crecimiento real anual %
 *   - FP.CPI.TOTL.ZG      · Inflación IPC anual %
 *   - SL.UEM.TOTL.ZS      · Desempleo total %
 *   - BN.CAB.XOKA.GD.ZS   · Cuenta corriente % PIB
 *   - GC.DOD.TOTL.GD.ZS   · Deuda pública % PIB
 *   - FI.RES.TOTL.MO      · Reservas en meses de importaciones
 *
 * Cache: 7 días (datos anuales, cambian poco).
 */

const WB_BASE = 'https://api.worldbank.org/v2/country'
const DEFAULT_TIMEOUT_MS = 8000

export interface WBIndicatorPoint {
  year: number
  value: number | null
}

export interface WBCountryIndicators {
  iso3: string
  indicators: {
    gdp_growth_pct?: WBIndicatorPoint[]        // últimos 10 años
    inflation_pct?: WBIndicatorPoint[]
    unemployment_pct?: WBIndicatorPoint[]
    current_account_pct_gdp?: WBIndicatorPoint[]
    debt_pct_gdp?: WBIndicatorPoint[]
    reserves_months_imports?: WBIndicatorPoint[]
  }
  fetched_at: string
}

const INDICATOR_CODES = {
  gdp_growth_pct: 'NY.GDP.MKTP.KD.ZG',
  inflation_pct: 'FP.CPI.TOTL.ZG',
  unemployment_pct: 'SL.UEM.TOTL.ZS',
  current_account_pct_gdp: 'BN.CAB.XOKA.GD.ZS',
  debt_pct_gdp: 'GC.DOD.TOTL.GD.ZS',
  reserves_months_imports: 'FI.RES.TOTL.MO',
} as const

async function fetchWBIndicator(iso3: string, indicatorCode: string): Promise<WBIndicatorPoint[]> {
  const url = `${WB_BASE}/${iso3}/indicator/${indicatorCode}?format=json&date=2015:2025&per_page=20`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS)
  try {
    const r = await fetch(url, { signal: ctrl.signal, next: { revalidate: 7 * 86400 } })
    clearTimeout(t)
    if (!r.ok) return []
    const json: any = await r.json()
    if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) return []
    return json[1]
      .map((p: any): WBIndicatorPoint => ({
        year: Number(p.date),
        value: p.value !== null ? Number(p.value) : null,
      }))
      .filter((p: WBIndicatorPoint) => !isNaN(p.year))
      .sort((a: WBIndicatorPoint, b: WBIndicatorPoint) => a.year - b.year)
  } catch {
    clearTimeout(t)
    return []
  }
}

/**
 * Obtiene los 6 indicadores macro principales para un país en paralelo.
 */
export async function fetchCountryMacro(iso3: string): Promise<WBCountryIndicators> {
  const startedAt = new Date().toISOString()
  const results = await Promise.all(
    Object.entries(INDICATOR_CODES).map(async ([key, code]) => {
      const series = await fetchWBIndicator(iso3, code)
      return { key, series }
    })
  )
  const indicators: WBCountryIndicators['indicators'] = {}
  for (const { key, series } of results) {
    if (series.length > 0) (indicators as any)[key] = series
  }
  return { iso3, indicators, fetched_at: startedAt }
}

/**
 * Helper · último valor no-null de una serie.
 */
export function latestWBValue(series?: WBIndicatorPoint[]): number | null {
  if (!series || series.length === 0) return null
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].value !== null) return series[i].value
  }
  return null
}
