/**
 * Mappings de snake_case interno → labels humanos en español.
 *
 * Sprint Quality-Q-C.3 · G3 · cierra el hallazgo de la auditoría
 * (docs/audits/2026-05-31_content_audit_top5_modulos.md sección 1.3):
 *
 *   "Etiquetas técnicas crudas expuestas: source_mode, temporal_scope,
 *    last_30d, annual, realtime, curated, derived_from_news, analytical_model,
 *    llm_cluster directamente en UI · viola la propia capa de "labels"
 *    definida en geo-methodology.ts."
 *
 * Cualquier componente de geopolítica que renderice un valor de estos enums
 * DEBE pasarlo por `humanize*()` antes de mostrar.
 */

// ────────────────────────────────────────────────────────────────────────────
// Ventana temporal del dato (cuánta historia abarca)
// ────────────────────────────────────────────────────────────────────────────

const TEMPORAL: Record<string, string> = {
  realtime: 'tiempo real',
  last_24h: 'últimas 24 h',
  last_7d: 'últimos 7 días',
  last_30d: 'últimos 30 días',
  last_90d: 'últimos 90 días',
  last_year: 'último año',
  annual: 'serie anual estructural',
  multiyear: 'serie histórica',
  point_in_time: 'foto en un momento',
}

export function humanizeTemporalScope(slug?: string | null): string {
  if (!slug) return '—'
  return TEMPORAL[slug] ?? slug.replace(/_/g, ' ')
}

// ────────────────────────────────────────────────────────────────────────────
// Origen del dato (cómo se obtuvo · curated / inferred / model / llm)
// ────────────────────────────────────────────────────────────────────────────

const SOURCE_MODE: Record<string, string> = {
  // dataset oficial
  curated: 'catálogo curado',
  official: 'fuente oficial',
  // derivados
  derived_from_news: 'inferido a partir de prensa',
  derived_from_official: 'derivado de fuente oficial',
  derived: 'derivado',
  // modelos
  analytical_model: 'modelo analítico Politeia',
  llm_cluster: 'agrupado por IA',
  llm_summary: 'resumido por IA',
  // estados degradados
  fallback: 'sustituto (degradado)',
  unknown: 'sin clasificar',
}

export function humanizeSourceMode(slug?: string | null): string {
  if (!slug) return '—'
  return SOURCE_MODE[slug] ?? slug.replace(/_/g, ' ')
}

// ────────────────────────────────────────────────────────────────────────────
// Frecuencia de actualización
// ────────────────────────────────────────────────────────────────────────────

const REFRESH: Record<string, string> = {
  realtime: 'tiempo real',
  hourly: 'horaria',
  daily: 'diaria',
  weekly: 'semanal',
  monthly: 'mensual',
  quarterly: 'trimestral',
  annual: 'anual',
  on_demand: 'bajo demanda',
}

export function humanizeRefreshCadence(slug?: string | null): string {
  if (!slug) return '—'
  return REFRESH[slug] ?? slug.replace(/_/g, ' ')
}

// ────────────────────────────────────────────────────────────────────────────
// Banda de libertad de prensa (RSF / Freedom House)
// ────────────────────────────────────────────────────────────────────────────

const PRESS_FREEDOM_BAND: Record<string, string> = {
  high: 'alta libertad de prensa',
  medium: 'libertad de prensa intermedia',
  low: 'baja libertad de prensa',
  very_low: 'libertad de prensa muy baja',
}

export function humanizePressFreedomBand(slug?: string | null): string {
  if (!slug) return '—'
  return PRESS_FREEDOM_BAND[slug] ?? slug.replace(/_/g, ' ')
}
