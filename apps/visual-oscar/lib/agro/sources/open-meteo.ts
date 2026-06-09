/**
 * Cliente Open-Meteo · precipitación y pronóstico · Politeia Agro v4
 *
 * Open-Meteo es una API meteorológica gratuita y SIN API KEY:
 *   - Forecast:  https://api.open-meteo.com/v1/forecast
 *   - Archive:   https://archive-api.open-meteo.com/v1/archive  (histórico ERA5)
 *
 * La usamos para la capa de SEQUÍA del mapa agro: pronóstico de precipitación
 * por punto (capitales de CCAA agrícolas) + acumulado de los últimos 30 días
 * como indicador de déficit hídrico (proxy ligero de sequía).
 *
 * Shape verificado empíricamente (2026-06): daily.{time[], precipitation_sum[],
 * precipitation_probability_max[]}.
 *
 * Cero datos inventados. Si Open-Meteo falla, el caller marca el punto como
 * sin dato y degrada honestamente.
 */

const FORECAST = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

/** Punto de referencia agrícola (capital o zona productora de una CCAA). */
export interface PuntoAgro {
  id: string
  nombre: string
  ccaa: string
  lat: number
  lon: number
  /** Cultivo/uso dominante de la zona, para contexto. */
  contexto: string
}

/**
 * Capitales / zonas productoras clave por CCAA agrícola. Coordenadas
 * aproximadas de la capital provincial o de la comarca productora.
 */
export const PUNTOS_AGRO: PuntoAgro[] = [
  { id: 'sevilla', nombre: 'Sevilla', ccaa: 'Andalucía', lat: 37.39, lon: -5.99, contexto: 'Olivar, algodón, cítricos, arroz marismas' },
  { id: 'jaen', nombre: 'Jaén', ccaa: 'Andalucía', lat: 37.77, lon: -3.79, contexto: 'Capital mundial del olivar' },
  { id: 'almeria', nombre: 'Almería', ccaa: 'Andalucía', lat: 36.84, lon: -2.46, contexto: 'Horticultura intensiva bajo plástico' },
  { id: 'murcia', nombre: 'Murcia', ccaa: 'Región de Murcia', lat: 37.99, lon: -1.13, contexto: 'Huerta de Europa · cítricos, hortícolas' },
  { id: 'valencia', nombre: 'Valencia', ccaa: 'Comunidad Valenciana', lat: 39.47, lon: -0.38, contexto: 'Cítricos, arroz Albufera, hortícolas' },
  { id: 'lleida', nombre: 'Lleida', ccaa: 'Cataluña', lat: 41.61, lon: 0.62, contexto: 'Fruta de hueso y pepita, cereal, porcino' },
  { id: 'zaragoza', nombre: 'Zaragoza', ccaa: 'Aragón', lat: 41.65, lon: -0.89, contexto: 'Cereal regadío Ebro, porcino, alfalfa' },
  { id: 'valladolid', nombre: 'Valladolid', ccaa: 'Castilla y León', lat: 41.65, lon: -4.72, contexto: 'Cereal secano, remolacha, vino Ribera' },
  { id: 'albacete', nombre: 'Albacete', ccaa: 'Castilla-La Mancha', lat: 38.99, lon: -1.86, contexto: 'Cereal, viñedo, ajo, lonja de referencia' },
  { id: 'ciudad_real', nombre: 'Ciudad Real', ccaa: 'Castilla-La Mancha', lat: 38.99, lon: -3.93, contexto: 'Viñedo más extenso del mundo, cereal' },
  { id: 'badajoz', nombre: 'Badajoz', ccaa: 'Extremadura', lat: 38.88, lon: -6.97, contexto: 'Regadío Guadiana, tomate, arroz, dehesa' },
  { id: 'cordoba', nombre: 'Córdoba', ccaa: 'Andalucía', lat: 37.89, lon: -4.78, contexto: 'Olivar, cereal, dehesa ibérico' },
  { id: 'huelva', nombre: 'Huelva', ccaa: 'Andalucía', lat: 37.26, lon: -6.95, contexto: 'Fresa y frutos rojos, cítricos' },
  { id: 'toledo', nombre: 'Toledo', ccaa: 'Castilla-La Mancha', lat: 39.86, lon: -4.03, contexto: 'Cereal, viñedo, melón' },
]

export interface PrecipForecastPoint {
  fecha: string
  precip_mm: number | null
  prob_max: number | null
}

export interface PrecipPunto {
  id: string
  nombre: string
  ccaa: string
  lat: number
  lon: number
  contexto: string
  /** Pronóstico diario de precipitación (7 días). */
  forecast: PrecipForecastPoint[]
  /** Suma de precipitación prevista 7 días (mm). */
  precip_7d_mm: number | null
  /** Acumulado de los últimos 30 días (mm) · indicador de déficit. */
  precip_30d_mm: number | null
}

interface OMForecastResponse {
  daily?: {
    time?: string[]
    precipitation_sum?: Array<number | null>
    precipitation_probability_max?: Array<number | null>
  }
}
interface OMArchiveResponse {
  daily?: { time?: string[]; precipitation_sum?: Array<number | null> }
}

async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 3600 }, // 1h
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const txt = await res.text()
    if (!txt || txt.length < 10) return null
    return JSON.parse(txt) as T
  } catch {
    clearTimeout(timer)
    return null
  }
}

/** Pronóstico de precipitación 7 días para un punto. */
async function forecastPunto(p: PuntoAgro): Promise<PrecipForecastPoint[]> {
  const url =
    `${FORECAST}?latitude=${p.lat}&longitude=${p.lon}` +
    `&daily=precipitation_sum,precipitation_probability_max&forecast_days=7&timezone=Europe%2FMadrid`
  const r = await fetchJson<OMForecastResponse>(url)
  const t = r?.daily?.time ?? []
  const sum = r?.daily?.precipitation_sum ?? []
  const prob = r?.daily?.precipitation_probability_max ?? []
  return t.map((fecha, i) => ({
    fecha,
    precip_mm: typeof sum[i] === 'number' ? sum[i] : null,
    prob_max: typeof prob[i] === 'number' ? prob[i] : null,
  }))
}

/** Acumulado de precipitación de los últimos `days` días (archive ERA5). */
async function archivo30d(p: PuntoAgro, startDate: string, endDate: string): Promise<number | null> {
  const url =
    `${ARCHIVE}?latitude=${p.lat}&longitude=${p.lon}` +
    `&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum&timezone=Europe%2FMadrid`
  const r = await fetchJson<OMArchiveResponse>(url)
  const sum = r?.daily?.precipitation_sum
  if (!sum || sum.length === 0) return null
  const total = sum.reduce((acc: number, v) => acc + (typeof v === 'number' ? v : 0), 0)
  return Number(total.toFixed(1))
}

/**
 * Snapshot de precipitación para todos los puntos agro: pronóstico 7 días +
 * acumulado 30 días. `archiveRange` lo provee el caller (fechas calculadas en
 * el endpoint, no en este módulo, para no usar Date.now en libs reutilizadas
 * por scripts).
 */
export async function fetchPrecipSnapshots(
  archiveRange: { start: string; end: string } | null
): Promise<PrecipPunto[]> {
  const results = await Promise.all(
    PUNTOS_AGRO.map(async (p) => {
      const [forecast, precip30] = await Promise.all([
        forecastPunto(p),
        archiveRange ? archivo30d(p, archiveRange.start, archiveRange.end) : Promise.resolve(null),
      ])
      const precip7 = forecast.reduce((acc, f) => acc + (f.precip_mm ?? 0), 0)
      return {
        id: p.id,
        nombre: p.nombre,
        ccaa: p.ccaa,
        lat: p.lat,
        lon: p.lon,
        contexto: p.contexto,
        forecast,
        precip_7d_mm: forecast.some((f) => f.precip_mm != null) ? Number(precip7.toFixed(1)) : null,
        precip_30d_mm: precip30,
      }
    })
  )
  return results
}
