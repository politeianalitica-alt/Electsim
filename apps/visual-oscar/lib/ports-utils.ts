/**
 * Helpers compartidos del módulo Puertos & Comercio Global.
 *
 * Centraliza el formateo defensivo · evita crashes "Cannot read properties of
 * undefined (reading 'toFixed')" en datos parciales.
 */

/** Formatea un número con `decimals` decimales. Si es null/undefined/NaN
 *  devuelve `fallback`. Útil en KPIs de puertos/buques donde los campos AIS
 *  pueden faltar.
 *
 *  fmtNum(36.1408, 3) -> "36.141"
 *  fmtNum(null, 2)     -> "—"
 *  fmtNum(undefined)   -> "—"
 *  fmtNum(NaN)         -> "—"
 *  fmtNum(12.5, 1, '%')-> "12.5%"
 */
export function fmtNum(
  v: number | null | undefined,
  decimals = 2,
  suffix = '',
  fallback = '—',
): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return fallback
  return `${v.toFixed(decimals)}${suffix}`
}

/** Formatea con separadores de miles + decimales locales. */
export function fmtInt(
  v: number | null | undefined,
  fallback = '—',
  locale = 'es-ES',
): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return fallback
  return v.toLocaleString(locale, { maximumFractionDigits: 0 })
}

/** Formatea valor monetario USD (en miles). */
export function fmtUsd(
  v: number | null | undefined,
  fallback = '—',
  locale = 'es-ES',
): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return fallback
  return `${v.toLocaleString(locale, { maximumFractionDigits: 0 })} USD`
}

/** Devuelve color CSS para badge de calidad de dato. */
export type DataQualityKind = 'live' | 'cache' | 'seed' | 'synthetic' | 'missing'
export function qualityColor(kind: DataQualityKind | string | undefined): {
  bg: string
  fg: string
  label: string
} {
  switch (kind) {
    case 'live':
      return { bg: '#dcfce7', fg: '#166534', label: 'LIVE' }
    case 'cache':
      return { bg: '#dbeafe', fg: '#1e40af', label: 'CACHE' }
    case 'seed':
      return { bg: '#e5e7eb', fg: '#374151', label: 'SEED' }
    case 'synthetic':
      return { bg: '#fef3c7', fg: '#92400e', label: 'SYNTH' }
    case 'missing':
      return { bg: '#fee2e2', fg: '#991b1b', label: 'MISSING' }
    default:
      return { bg: '#f3f4f6', fg: '#4b5563', label: (kind ?? 'UNKNOWN').toString().toUpperCase() }
  }
}

/** Clasifica congestión 0-100 en niveles UI. */
export function congestionLevel(pct: number | null | undefined): {
  level: 'crítico' | 'alto' | 'medio' | 'bajo' | 'desconocido'
  color: string
} {
  if (pct == null || Number.isNaN(pct)) return { level: 'desconocido', color: '#94a3b8' }
  if (pct >= 80) return { level: 'crítico', color: '#dc2626' }
  if (pct >= 60) return { level: 'alto', color: '#ea580c' }
  if (pct >= 40) return { level: 'medio', color: '#ca8a04' }
  return { level: 'bajo', color: '#16a34a' }
}

/** Region alias normalizer · acepta valores legacy (espana/europa/eu/es) y
 *  los normaliza al canónico inglés. */
export function normalizeRegion(r: string | null | undefined): string | undefined {
  if (!r) return undefined
  const k = r.trim().toLowerCase()
  const ALIASES: Record<string, string> = {
    espana: 'spain',
    es: 'spain',
    spain: 'spain',
    europa: 'europe',
    eu: 'europe',
    europe: 'europe',
    asia_pacifico: 'asia_pacific',
    asia_pacific: 'asia_pacific',
    norteamerica: 'north_america',
    north_america: 'north_america',
    oriente_medio: 'middle_east',
    middle_east: 'middle_east',
    latinoamerica: 'latin_america',
    latin_america: 'latin_america',
    africa: 'africa',
    chokepoint: 'chokepoint',
  }
  return ALIASES[k] ?? k
}
