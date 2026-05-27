/**
 * Cliente ESIOS · api.esios.ree.es
 *
 * Sistema de Información del Operador del Sistema (Red Eléctrica España).
 * MUCHO más granular que apidatos.ree.es:
 *
 *  - Precios horarios PVPC + spot + intradiarios MI1-MI7 (apidatos solo D-1)
 *  - Servicios de ajuste (banda secundaria/terciaria, gestión desvíos)
 *  - Tarifas reguladas detalladas (peajes, cargos por tramo)
 *  - Restricciones técnicas
 *  - Hidráulica embalses por cuenca
 *  - Generación instantánea 10-min
 *  - Forecasts demanda + renovable
 *  - Precio CO2 EUA referencia
 *
 * Auth: header `x-api-key: <KEY>` (también acepta `Authorization: Token token="..."`)
 * Base: https://api.esios.ree.es
 *
 * IMPORTANTE: ESIOS_API_KEY debe configurarse en Vercel server-side env vars.
 * NUNCA exponer al cliente. Si no está, los endpoints devuelven empty state
 * honesto.
 *
 * Geo IDs principales:
 *   8741 Península · 8742 Canarias · 8743 Baleares · 8744 Ceuta · 8745 Melilla
 *
 * Docs: https://api.esios.ree.es/doc
 */

const BASE = 'https://api.esios.ree.es'
const DEFAULT_TIMEOUT_MS = 12_000

export type EsiosGeoId = 8741 | 8742 | 8743 | 8744 | 8745 | null

export interface EsiosValue {
  value: number
  datetime: string         // ISO con timezone (típicamente +01:00 o +02:00)
  datetime_utc: string     // ISO UTC
  tz_time: string          // 'CET' | 'CEST'
  geo_id: number
  geo_name: string
}

export interface EsiosIndicator {
  id: number
  name: string
  short_name: string
  description?: string | null
  values_updated_at?: string
  magnitud?: Array<{ name: string; id: number }>
  tiempo?: Array<{ name: string; id: number }>
  geos?: Array<{ geo_id: number; geo_name: string }>
  values: EsiosValue[]
}

export interface EsiosResponse {
  ok: boolean
  error?: string
  indicator?: EsiosIndicator
  fetched_at: string
  source_url?: string
}

interface FetchOptions {
  startDate?: string         // ISO ej. '2026-05-27T00:00'
  endDate?: string           // ISO ej. '2026-05-28T00:00'
  geoIds?: number[]          // default [8741] Península
  timeTrunc?: 'hour' | 'day' | 'month' | 'year'
  locale?: 'es' | 'en'
  timeoutMs?: number
}

/**
 * Descarga un indicador ESIOS por ID con auth y manejo de errores.
 * Devuelve `{ok: false, error: 'no_key'}` si ESIOS_API_KEY no está configurada.
 */
export async function fetchEsiosIndicator(
  indicatorId: number,
  options: FetchOptions = {},
): Promise<EsiosResponse> {
  const startedAt = new Date().toISOString()
  const apiKey = process.env.ESIOS_API_KEY || ''

  const baseResp: EsiosResponse = {
    ok: false,
    fetched_at: startedAt,
    source_url: `https://www.esios.ree.es/es/analisis/${indicatorId}`,
  }

  if (!apiKey) {
    return { ...baseResp, error: 'no_key · configurar ESIOS_API_KEY en Vercel env vars' }
  }

  const {
    startDate,
    endDate,
    geoIds = [8741],
    timeTrunc,
    locale = 'es',
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options

  // Si no se pasan fechas, usamos últimas 24h hasta D+1 (PVPC publica el día siguiente)
  const now = new Date()
  const defaultStart = new Date(now.getTime() - 24 * 3600_000).toISOString().slice(0, 16)
  const defaultEnd = new Date(now.getTime() + 24 * 3600_000).toISOString().slice(0, 16)

  const params = new URLSearchParams()
  params.set('start_date', startDate || defaultStart)
  params.set('end_date', endDate || defaultEnd)
  for (const g of geoIds) params.append('geo_ids[]', String(g))
  if (timeTrunc) params.set('time_trunc', timeTrunc)
  params.set('locale', locale)

  const url = `${BASE}/indicators/${indicatorId}?${params.toString()}`

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'Accept': 'application/json; application/vnd.esios-api-v2+json',
        'Content-Type': 'application/json',
        // ESIOS acepta dos formatos de auth · el header x-api-key es el más sencillo
        'x-api-key': apiKey,
        // También enviamos el legacy por compatibilidad
        'Authorization': `Token token="${apiKey}"`,
      },
      next: { revalidate: 600 }, // 10 min (datos horarios)
    })
    clearTimeout(t)

    if (!r.ok) {
      return { ...baseResp, error: `http_${r.status} · ${r.statusText}` }
    }
    const json: any = await r.json()
    const indicator = json?.indicator
    if (!indicator) {
      return { ...baseResp, error: 'response_sin_indicator' }
    }
    return {
      ok: true,
      indicator: indicator as EsiosIndicator,
      fetched_at: startedAt,
      source_url: `https://www.esios.ree.es/es/analisis/${indicatorId}`,
    }
  } catch (e: any) {
    return { ...baseResp, error: String(e?.message ?? e) }
  }
}

/**
 * Devuelve el valor más reciente (último en values[]) o null si no hay valores.
 */
export function latestValue(ind: EsiosIndicator | undefined): EsiosValue | null {
  if (!ind?.values || ind.values.length === 0) return null
  // values vienen ordenados ascendente por datetime · last = más reciente
  return ind.values[ind.values.length - 1]
}

/**
 * Calcula el cambio porcentual entre el último valor y un punto N posiciones atrás.
 * Devuelve null si no hay datos suficientes o si el divisor es 0.
 */
export function changePct(
  ind: EsiosIndicator | undefined,
  positionsBack = 24,        // 24h por defecto si la serie es horaria
): number | null {
  if (!ind?.values || ind.values.length < positionsBack + 1) return null
  const last = ind.values[ind.values.length - 1]
  const prev = ind.values[ind.values.length - 1 - positionsBack]
  if (!last || !prev || prev.value === 0) return null
  return ((last.value - prev.value) / Math.abs(prev.value)) * 100
}

/**
 * Promedio de los últimos N valores de la serie.
 */
export function avgLastN(ind: EsiosIndicator | undefined, n = 24): number | null {
  if (!ind?.values || ind.values.length === 0) return null
  const slice = ind.values.slice(-n)
  const sum = slice.reduce((s, v) => s + v.value, 0)
  return slice.length > 0 ? sum / slice.length : null
}
