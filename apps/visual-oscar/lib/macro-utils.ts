/**
 * Helpers compartidos para los conectores macro (OECD, IMF, BIS,
 * Eurostat, OpenFIGI).
 *
 * - `quality()` · genera el campo data_quality canónico
 * - `parseJsonStat()` · parser Eurostat JSON-stat
 * - `parseSdmxJson()` · parser OECD/BIS SDMX-JSON v1+v2
 * - `fmtPct, fmtUsd, fmtEur, fmtBn, fmtTn` · format helpers
 */

export type SourceType = 'live' | 'cache' | 'seed' | 'synthetic' | 'missing' | 'rate_limited'

export interface DataQuality {
  source_type: SourceType
  source_name: string
  retrieved_at?: string
  confidence_score?: number
  note?: string
}

export function quality(t: SourceType, name: string, note?: string): DataQuality {
  return {
    source_type: t,
    source_name: name,
    retrieved_at: new Date().toISOString(),
    ...(note ? { note } : {}),
  }
}

// ─── Eurostat JSON-stat parser ─────────────────────────────────────
// Estructura JSON-stat v2 oficial:
//   { value: {0: 100, 1: 200}, dimension: {...}, id: [...], size: [...] }
// Cada índice numérico mapea a una combinación cartesiana de dimensiones.

export interface JsonStatPoint {
  value: number | null
  status?: string
  [dimName: string]: any
}

export function parseJsonStat(json: any): JsonStatPoint[] {
  if (!json?.value || !json?.dimension || !json?.id) return []
  const dimIds: string[] = json.id
  const sizes: number[] = json.size
  const dimensions = dimIds.map((id) => {
    const dim = json.dimension[id]
    const cat = dim?.category
    const labels = cat?.label || {}
    // index: { CODE: 0, ... } o array
    const index = cat?.index || {}
    const entries = Array.isArray(index)
      ? index.map((code: string, i: number) => ({ code, label: labels[code] ?? code, pos: i }))
      : Object.entries(index)
          .map(([code, pos]) => ({ code, label: (labels as any)[code] ?? code, pos: pos as number }))
          .sort((a, b) => a.pos - b.pos)
    return { id, entries }
  })

  const points: JsonStatPoint[] = []
  const valueMap = json.value as Record<string, number | null>
  const statusMap = (json.status || {}) as Record<string, string>
  const totalSize = sizes.reduce((a, b) => a * b, 1)

  for (let i = 0; i < totalSize; i++) {
    const v = valueMap[String(i)]
    if (v === undefined || v === null) continue
    // Decompose flat index `i` into per-dimension indices
    const point: JsonStatPoint = { value: typeof v === 'number' ? v : null }
    if (statusMap[String(i)]) point.status = statusMap[String(i)]
    let rem = i
    for (let d = dimensions.length - 1; d >= 0; d--) {
      const size = sizes[d]
      const idx = rem % size
      rem = Math.floor(rem / size)
      const dim = dimensions[d]
      const cat = dim.entries[idx]
      if (cat) {
        point[dim.id] = cat.code
        point[`${dim.id}_label`] = cat.label
      }
    }
    points.push(point)
  }
  return points
}

// ─── SDMX-JSON parser (OECD v1/v2, BIS) ────────────────────────────
// Estructura SDMX-JSON 1.0 (legacy stats.oecd.org):
//   { dataSets: [{observations: {"0:0:0": [value, ...]}}],
//     structure: { dimensions: { observation: [{values: [...]}] } } }
//
// Estructura SDMX-JSON 2.0 (sdmx.oecd.org):
//   { data: { dataSets: [...], structures: [...] } }

export interface SdmxPoint {
  value: number | null
  [dimName: string]: any
}

export function parseSdmxJson(json: any): SdmxPoint[] {
  // Resolver root data según versión
  const root = json?.data ?? json
  const dataSets = root?.dataSets
  const structures = root?.structures
  if (!dataSets?.[0]?.observations || !structures?.[0]) return []
  const obs = dataSets[0].observations as Record<string, any[]>
  // SDMX v2: structures[0].dimensions.observation; v1: structure.dimensions.observation
  const structDim = structures[0].dimensions?.observation
    || root?.structure?.dimensions?.observation
    || []
  const dimensionsMeta = (structDim as any[]).map((d) => ({
    id: d.id,
    name: d.name,
    values: d.values || [],
  }))

  const points: SdmxPoint[] = []
  for (const [key, valArr] of Object.entries(obs)) {
    const value = Array.isArray(valArr) ? valArr[0] : valArr
    if (value === null || value === undefined) continue
    const indices = key.split(':').map((s) => parseInt(s, 10))
    const point: SdmxPoint = { value: typeof value === 'number' ? value : null }
    indices.forEach((idx, i) => {
      const dim = dimensionsMeta[i]
      if (!dim) return
      const v = dim.values[idx]
      if (v) {
        point[dim.id] = v.id
        point[`${dim.id}_label`] = v.name
      }
    })
    points.push(point)
  }
  return points
}

// ─── Format helpers ────────────────────────────────────────────────

export function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v == null || isNaN(v)) return '—'
  return `${v.toFixed(decimals)}%`
}

export function fmtUsd(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

export function fmtEur(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return '—'
  if (v >= 1e12) return `€${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `€${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `€${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `€${(v / 1e3).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}

export function fmtNum(v: number | null | undefined, decimals = 1, suffix = ''): string {
  if (v == null || isNaN(v)) return '—'
  return `${v.toFixed(decimals)}${suffix}`
}

// ─── Empty state didáctico para fuentes con key pendiente ────────

export interface ActivationEmptyState {
  ok: false
  data_quality: DataQuality
  action: string
  activation_steps: string[]
  email_template?: string
  registration_url?: string
}

export function emptyStateNoKey(opts: {
  source_name: string
  env_var: string
  registration_url: string
  contact_email?: string
  action: string
  custom_steps?: string[]
  email_template?: string
}): ActivationEmptyState {
  const steps = opts.custom_steps || [
    `1. Registro en ${opts.registration_url} (gratis)`,
    `2. Activar/copiar el API token desde panel de usuario`,
    `3. Añadir ${opts.env_var} a Vercel env: \`vercel env add ${opts.env_var} production\``,
    `4. Este endpoint pasa de empty state a LIVE automáticamente`,
  ]
  return {
    ok: false,
    data_quality: quality('missing', opts.source_name, `${opts.env_var} no configurada`),
    action: opts.action,
    activation_steps: steps,
    ...(opts.email_template ? { email_template: opts.email_template } : {}),
    registration_url: opts.registration_url,
  }
}

// ─── Países UE-27 y G20 para comparativas ─────────────────────────

export const EU27_ISO3 = [
  'AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA',
  'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD',
  'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE',
] as const

export const EU27_ISO2 = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'EL', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
] as const // Eurostat usa 'EL' para Grecia (no 'GR')

export const G20_ISO3 = [
  'ARG', 'AUS', 'BRA', 'CAN', 'CHN', 'FRA', 'DEU', 'IND', 'IDN', 'ITA',
  'JPN', 'MEX', 'KOR', 'RUS', 'SAU', 'ZAF', 'TUR', 'GBR', 'USA', 'ESP',
] as const

// ─── España: códigos NUTS2 (17 CCAA) ─────────────────────────────

export const SPAIN_NUTS2: Record<string, string> = {
  ES11: 'Galicia',
  ES12: 'Principado de Asturias',
  ES13: 'Cantabria',
  ES21: 'País Vasco',
  ES22: 'Comunidad Foral de Navarra',
  ES23: 'La Rioja',
  ES24: 'Aragón',
  ES30: 'Comunidad de Madrid',
  ES41: 'Castilla y León',
  ES42: 'Castilla-La Mancha',
  ES43: 'Extremadura',
  ES51: 'Cataluña',
  ES52: 'Comunitat Valenciana',
  ES53: 'Illes Balears',
  ES61: 'Andalucía',
  ES62: 'Región de Murcia',
  ES63: 'Ciudad Autónoma de Ceuta',
  ES64: 'Ciudad Autónoma de Melilla',
  ES70: 'Canarias',
}
