/**
 * China-Media coverage baseline · Sprint G14 extra
 *
 * Lookup contra dataset histórico People's Daily Coverage (CFC v.1 · paper
 * JCC 2025 · gits amigos/China-Media-main) normalizado a JSON 16.8 KB.
 *
 * Por cada país (62 cubiertos): mean+std de artículos PD/año en window
 * 2013-2022. Habilita detector de anomalías: cuántos σ de desviación lleva
 * la cobertura actual vs baseline.
 *
 * Caso de uso: si Xinhua/People's Daily cubre España >2σ por encima del
 * baseline 10-año, es señal de shift diplomático chino. Útil para
 * detectar atención coordinada anómala antes de evento material.
 *
 * Limitación crítica: dataset corta en 2022. NO mide tono, sólo CANTIDAD.
 * Para detección live actual hay que cruzar con state-media feed.
 */
import baselineData from '@/data/china-pd-coverage-baseline.json'

export interface ChinaCoverageBaseline {
  country: string
  iso3: string
  baseline_window: string  // "2013-2022"
  n_years_in_baseline: number
  mean_articles_year: number
  median_articles_year: number
  std_articles_year: number
  min_articles_year: number
  max_articles_year: number
  last_year: number
  last_year_count: number
}

interface RawData {
  _meta: {
    source: string
    methodology: string
    limitations: string
    baseline_window: string
    n_countries: number
  }
  by_iso3: Record<string, ChinaCoverageBaseline>
}

const DATA = baselineData as RawData

/**
 * Lookup baseline por iso3 (alpha-3). Devuelve null si país no en dataset.
 */
export function lookupChinaBaseline(iso3: string | null | undefined): ChinaCoverageBaseline | null {
  if (!iso3) return null
  return DATA.by_iso3[iso3.toUpperCase()] || null
}

/**
 * Calcula anomalía de un nivel actual vs baseline (en sigmas).
 *
 * @param iso3 país objetivo (alpha-3)
 * @param current_count cuántos items state-media han mencionado al país recientemente
 * @returns { z_score, band, interpretation } o null si no hay baseline
 */
export interface AnomalyResult {
  baseline: ChinaCoverageBaseline
  current_count: number
  z_score: number
  band: 'normal' | 'elevated' | 'anomalous' | 'extreme'
  interpretation: string
}

export function detectChinaCoverageAnomaly(
  iso3: string,
  current_count: number,
  /** Período del current_count en días (default 7 · convierte a anual para comparar) */
  period_days: number = 7,
): AnomalyResult | null {
  const baseline = lookupChinaBaseline(iso3)
  if (!baseline) return null
  // Extrapolar current_count a tasa anual para comparar con mean anual del baseline
  const annual_rate = (current_count / period_days) * 365
  const z = baseline.std_articles_year > 0
    ? (annual_rate - baseline.mean_articles_year) / baseline.std_articles_year
    : 0
  const absZ = Math.abs(z)
  let band: AnomalyResult['band'] = 'normal'
  if (absZ >= 3) band = 'extreme'
  else if (absZ >= 2) band = 'anomalous'
  else if (absZ >= 1) band = 'elevated'

  const direction = z > 0 ? 'POR ENCIMA' : 'POR DEBAJO'
  let interpretation = ''
  if (band === 'normal') {
    interpretation = `Cobertura china sobre ${baseline.country} está dentro de su baseline histórico 2013-2022 (±1σ).`
  } else if (band === 'elevated') {
    interpretation = `Cobertura china sobre ${baseline.country} está ${direction} de su baseline (>${absZ.toFixed(1)}σ). Vigilar.`
  } else if (band === 'anomalous') {
    interpretation = `⚠ ANOMALÍA: cobertura china sobre ${baseline.country} está ${direction} del baseline 10-año (${absZ.toFixed(1)}σ). Posible shift diplomático u operación coordinada.`
  } else {
    interpretation = `⚠⚠ ANOMALÍA EXTREMA: cobertura china sobre ${baseline.country} está ${direction} del baseline 10-año (${absZ.toFixed(1)}σ). Señal débil fuerte · investigar inmediatamente.`
  }

  return {
    baseline,
    current_count,
    z_score: +z.toFixed(2),
    band,
    interpretation,
  }
}

/**
 * Stats agregadas para diagnóstico/datahealth.
 */
export function getChinaBaselineStats() {
  const all = Object.values(DATA.by_iso3)
  return {
    n_countries: all.length,
    source: DATA._meta.source,
    baseline_window: DATA._meta.baseline_window,
    methodology: DATA._meta.methodology,
    limitations: DATA._meta.limitations,
    top_5_coverage: all
      .sort((a, b) => b.mean_articles_year - a.mean_articles_year)
      .slice(0, 5)
      .map((c) => ({ iso3: c.iso3, country: c.country, mean: c.mean_articles_year })),
  }
}

export const CHINA_BASELINE_VERSION = 'china-pd-coverage-v1-2013-2022'
