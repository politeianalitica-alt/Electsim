/**
 * CtxEurostat · helper de cliente para la vista «Contexto e impacto» (TS8).
 *
 * Envuelve el endpoint EXISTENTE `/api/eurostat/dataset?code=...&filters=k=v;k=v`
 * (que ya parsea JSON-stat y devuelve `{ ok, points, data_quality }`). NO crea
 * ningún endpoint nuevo ni toca `lib/` ni `app/api/`: solo consume lo que hay.
 *
 * Degradación honesta (CLAUDE.md): nunca lanza; ante fallo devuelve `null` y la
 * UI muestra '—' con nota de fuente. No inventa cifras.
 *
 * Limitación conocida del endpoint: el parámetro `filters` se parsea como pares
 * `k=v` únicos (un valor por clave), por lo que NO admite multi-geo en una sola
 * llamada. Para comparativas UE se hace una llamada por país (helper `fetchMany`).
 */

/** Punto JSON-stat ya parseado por el endpoint (subconjunto que usamos). */
export interface EsPoint {
  value: number | null
  time?: string
  time_label?: string
  geo?: string
  [k: string]: unknown
}

interface DatasetEnvelope {
  ok: boolean
  dataset_code?: string
  data_quality?: { source_type?: string; source_name?: string; note?: string }
  n_points?: number
  points?: EsPoint[]
}

export interface EsLatest {
  /** Último valor disponible (mayor `time`). */
  value: number
  /** Periodo del último valor (ej. "2023"). */
  period: string
  /** Valor del periodo anterior, si existe (para variación). */
  prev: number | null
  prevPeriod: string | null
  /** Variación absoluta en puntos respecto al anterior (value - prev). */
  deltaAbs: number | null
}

/** Construye la query del endpoint existente a partir de code + filtros. */
function buildUrl(code: string, filters: Record<string, string>): string {
  const f = Object.entries(filters)
    .map(([k, v]) => `${k}=${v}`)
    .join(';')
  return `/api/eurostat/dataset?code=${encodeURIComponent(code)}&filters=${encodeURIComponent(f)}`
}

/**
 * Trae una serie corta y devuelve el último punto + el anterior (para delta).
 * `signal` para abortar al desmontar. Devuelve `null` si no hay dato vivo.
 */
export async function fetchLatest(
  code: string,
  filters: Record<string, string>,
  signal?: AbortSignal,
): Promise<EsLatest | null> {
  try {
    const r = await fetch(buildUrl(code, filters), { cache: 'no-store', signal })
    if (!r.ok) return null
    const j: DatasetEnvelope = await r.json()
    if (!j?.ok || !Array.isArray(j.points) || j.points.length === 0) return null
    const pts = j.points
      .filter((p) => typeof p.value === 'number' && p.time != null)
      .map((p) => ({ value: p.value as number, time: String(p.time) }))
      .sort((a, b) => a.time.localeCompare(b.time))
    if (pts.length === 0) return null
    const last = pts[pts.length - 1]
    const prev = pts.length > 1 ? pts[pts.length - 2] : null
    return {
      value: last.value,
      period: last.time,
      prev: prev ? prev.value : null,
      prevPeriod: prev ? prev.time : null,
      deltaAbs: prev ? +(last.value - prev.value).toFixed(2) : null,
    }
  } catch {
    return null
  }
}

/** Resultado de una comparativa UE (un valor por geo + media + posición ES). */
export interface EsComparison {
  items: Array<{ geo: string; value: number }>
  esValue: number | null
  euValue: number | null
  /** Posición de España (1 = mayor), entre los geos NACIONALES (excluye agregados UE). */
  esRank: number | null
  nCountries: number
}

/**
 * Comparativa UE: una llamada por geo (el endpoint no admite multi-geo). Cada
 * geo usa el mismo `code` + `filters`, añadiendo `geo`. `euGeo` (ej. EU27_2020)
 * se trata como media de referencia, no como país en el ranking.
 */
export async function fetchComparison(
  code: string,
  baseFilters: Record<string, string>,
  geos: string[],
  euGeo: string,
  signal?: AbortSignal,
): Promise<EsComparison | null> {
  try {
    const all = [...geos, euGeo]
    const results = await Promise.all(
      all.map(async (geo) => {
        const latest = await fetchLatest(code, { ...baseFilters, geo }, signal)
        return latest ? { geo, value: latest.value } : null
      }),
    )
    const ok = results.filter((x): x is { geo: string; value: number } => x !== null)
    if (ok.length === 0) return null
    const euValue = ok.find((x) => x.geo === euGeo)?.value ?? null
    const countries = ok.filter((x) => x.geo !== euGeo).sort((a, b) => b.value - a.value)
    const esValue = countries.find((x) => x.geo === 'ES')?.value ?? null
    const esRank = esValue != null ? countries.findIndex((x) => x.geo === 'ES') + 1 : null
    return {
      items: countries,
      esValue,
      euValue,
      esRank,
      nCountries: countries.length,
    }
  } catch {
    return null
  }
}

/** Nombres de países (subset comparativa social) para etiquetar barras. */
export const GEO_NAMES: Record<string, string> = {
  ES: 'España',
  FR: 'Francia',
  DE: 'Alemania',
  IT: 'Italia',
  PT: 'Portugal',
  NL: 'Países Bajos',
  SE: 'Suecia',
  EU27_2020: 'Media UE-27',
}
