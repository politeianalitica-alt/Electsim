/**
 * Cliente Open-Meteo (gratis, sin API key) para datos meteorológicos por coords.
 * https://open-meteo.com/en/docs
 *
 * Útil para mostrar condiciones actuales y alerta de calor/frío extremo en la ficha.
 */

const BASE = 'https://api.open-meteo.com/v1/forecast'

interface CacheEntry<T> { ts: number; data: T }
const cache: Map<string, CacheEntry<unknown>> = new Map()
const TTL = 30 * 60 * 1000 // 30 min

export interface CondicionMeteo {
  temperatura: number          // °C
  sensacionTermica: number     // °C aparente
  weatherCode: number          // WMO code
  weatherLabel: string
  precip: number               // mm
  viento: number               // km/h
  hora: string                 // ISO 8601 local
  alertaCalor: boolean
  alertaFrio: boolean
}

interface OMResponse {
  current?: {
    temperature_2m?: number
    apparent_temperature?: number
    weather_code?: number
    precipitation?: number
    wind_speed_10m?: number
    time?: string
  }
}

const WMO: Record<number, string> = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla', 48: 'Niebla con escarcha',
  51: 'Llovizna ligera', 53: 'Llovizna moderada', 55: 'Llovizna densa',
  61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia intensa',
  71: 'Nieve ligera', 73: 'Nieve moderada', 75: 'Nieve intensa',
  80: 'Chubascos ligeros', 81: 'Chubascos moderados', 82: 'Chubascos violentos',
  95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta con granizo intenso',
}

export async function fetchTiempo(lat: number, lon: number): Promise<CondicionMeteo | null> {
  const key = `weather:${lat.toFixed(2)}:${lon.toFixed(2)}`
  const c = cache.get(key) as CacheEntry<CondicionMeteo> | undefined
  if (c && Date.now() - c.ts < TTL) return c.data

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 6000)
  try {
    const url = `${BASE}?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m&timezone=Europe/Madrid`
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 1800 } })
    if (!res.ok) return null
    const data = await res.json() as OMResponse
    const cur = data.current
    if (!cur) return null
    const out: CondicionMeteo = {
      temperatura: cur.temperature_2m ?? 0,
      sensacionTermica: cur.apparent_temperature ?? cur.temperature_2m ?? 0,
      weatherCode: cur.weather_code ?? 0,
      weatherLabel: WMO[cur.weather_code ?? 0] || 'Condiciones desconocidas',
      precip: cur.precipitation ?? 0,
      viento: cur.wind_speed_10m ?? 0,
      hora: cur.time ?? '',
      alertaCalor: (cur.apparent_temperature ?? cur.temperature_2m ?? 0) >= 36,
      alertaFrio: (cur.apparent_temperature ?? cur.temperature_2m ?? 0) <= -3,
    }
    cache.set(key, { ts: Date.now(), data: out })
    return out
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}
